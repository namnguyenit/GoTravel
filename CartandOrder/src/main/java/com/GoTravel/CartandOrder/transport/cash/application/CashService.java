package com.GoTravel.CartandOrder.transport.cash.application;

import com.GoTravel.CartandOrder.enums.OrderKind;
import com.GoTravel.CartandOrder.enums.OrderStatus;
import com.GoTravel.CartandOrder.enums.PaymentMethod;
import com.GoTravel.CartandOrder.repository.OrderRepository;
import com.GoTravel.CartandOrder.transport.GoCarClient;
import com.GoTravel.CartandOrder.client.PaymentClient;
import com.GoTravel.CartandOrder.transport.TransportInventoryClient;
import com.GoTravel.CartandOrder.transport.TransportOrderService;
import com.GoTravel.CartandOrder.transport.cash.domain.CashLedger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CashService {
    private final CashLedger ledger;
    private final GoCarClient car;
    private final TransportInventoryClient inventory;
    private final TransportOrderService transportOrders;
    private final OrderRepository orders;
    private final TransactionTemplate transactions;
    private final PaymentClient payments;

    public CashLedger.Shift openShift(UUID actorId, UUID tripId) {
        var allowed = car.authorizeStaff(actorId, tripId, "SELL_CASH");
        if (allowed == null || allowed.getData() == null) throw conflict("Nhân viên chưa được phân quyền");
        var config = payments.getTransportCommission();
        var fee = config == null ? null : config.getData();
        if (fee == null || fee.version() == null || fee.version().isBlank() ||
                fee.rate() == null || fee.rate().signum() < 0 ||
                fee.rate().compareTo(BigDecimal.ONE) >= 0) {
            throw conflict("GoPay chưa có cấu hình phí nhà xe hợp lệ");
        }
        return ledger.open(actorId, allowed.getData().operatorId(), fee.version(), fee.rate());
    }

    public CashLedger.ClosedShift closeShift(UUID actorId, BigDecimal countedAmount) {
        if (countedAmount == null || countedAmount.signum() < 0 || countedAmount.scale() > 0)
            throw conflict("Số tiền kiểm đếm không hợp lệ");
        return transactions.execute(status -> ledger.close(actorId, countedAmount));
    }

    @Scheduled(fixedDelay = 30000)
    public void deliverSettlements() {
        for (var shift : ledger.pendingSettlements(50)) {
            try {
                var response = payments.recordCashSettlement(shift.shiftId(), new PaymentClient.CashSettlement(
                        shift.shiftId(), shift.operatorId(), shift.grossAmount(), shift.commissionDue(),
                        shift.commissionVersion(), shift.commissionRate()));
                if (response == null || !response.isSuccess()) throw new IllegalStateException("GoPay did not acknowledge");
                ledger.markSettlementSent(shift.shiftId());
            } catch (Exception error) {
                log.warn("Cash shift {} settlement pending", shift.shiftId(), error);
            }
        }
    }

    @Scheduled(fixedDelay = 30000)
    public void deliverRefundAdjustments() {
        for (var refund : ledger.pendingRefundAdjustments(50)) {
            try {
                var response = payments.recordCashRefundAdjustment(refund.orderId(),
                        new PaymentClient.CashRefundAdjustment(refund.orderId(), refund.shiftId(),
                                refund.operatorId(), refund.refundAmount(), refund.commissionReversal(),
                                refund.commissionVersion(), refund.commissionRate()));
                if (response == null || !response.isSuccess())
                    throw new IllegalStateException("GoPay did not acknowledge cash refund");
                ledger.markRefundAdjustmentSent(refund.orderId());
            } catch (Exception error) {
                log.warn("Cash refund adjustment for order {} pending", refund.orderId(), error);
            }
        }
    }

    public CashReceiptResult receive(UUID actorId, UUID orderId, BigDecimal amount) {
        if (amount == null || amount.signum() <= 0 || amount.scale() > 0)
            throw conflict("Số tiền thực thu không hợp lệ");
        var order = orders.findById(orderId).orElseThrow(() -> conflict("Không có order"));
        if (order.getOrderKind() != OrderKind.GOCAR_TICKET ||
                order.getPaymentMethod() != PaymentMethod.CASH ||
                !actorId.equals(order.getTransportCashierId()) ||
                amount.compareTo(order.getTotalAmount()) != 0) {
            throw conflict("Đơn hoặc số tiền thu không khớp");
        }
        var receipt = ledger.findReceipt(orderId);
        if (receipt == null) {
            if (order.getStatus() != OrderStatus.CASH_PENDING || order.getExpiresAt() == null ||
                    !order.getExpiresAt().isAfter(java.time.LocalDateTime.now(
                            java.time.ZoneId.of("Asia/Ho_Chi_Minh")))) {
                throw conflict("Giữ ghế đã hết hạn; không thể ghi nhận tiền mặt");
            }
            var allowed = car.authorizeStaff(actorId, order.getTransportTripId(), "SELL_CASH");
            var shift = ledger.active(actorId);
            if (allowed == null || allowed.getData() == null ||
                    shift == null || !allowed.getData().operatorId().equals(shift.operatorId()) ||
                    !shift.id().equals(order.getTransportCashShiftId())) {
                throw conflict("Nhân viên không thuộc nhà xe");
            }
            var holdResponse = inventory.orderStatus(orderId);
            var hold = holdResponse == null ? null : holdResponse.getData();
            if (hold == null || !"HELD".equals(hold.status()) ||
                    !hold.tripId().equals(order.getTransportTripId()) ||
                    !hold.expiresAt().isAfter(Instant.now())) {
                throw conflict("Ghế không còn được giữ");
            }
            receipt = transactions.execute(status -> {
                var current = orders.findByIdForUpdate(orderId).orElseThrow();
                if (current.getStatus() != OrderStatus.CASH_PENDING ||
                        !actorId.equals(current.getTransportCashierId())) {
                    throw conflict("Order đã đổi trạng thái trước khi ghi nhận tiền");
                }
                var created = ledger.record(orderId, current.getTransportCashShiftId(),
                        actorId, allowed.getData().operatorId(), amount);
                current.setStatus(OrderStatus.CASH_RECEIVED_PENDING_RECONCILIATION);
                orders.save(current);
                return created;
            });
        }
        try {
            transportOrders.fulfill(orderId);
        } catch (Exception error) {
            log.warn("Cash received; ticket fulfillment pending for order {}", orderId, error);
        }
        var current = orders.findById(orderId).orElseThrow();
        return new CashReceiptResult(receipt.id(), receipt.receiptNo(), orderId,
                receipt.amount(), current.getStatus().name());
    }

    public record CashReceiptResult(UUID receiptId, String receiptNo, UUID orderId,
                                    BigDecimal amount, String orderStatus) {}

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
