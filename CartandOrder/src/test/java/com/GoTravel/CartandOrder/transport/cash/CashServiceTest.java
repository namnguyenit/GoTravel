package com.GoTravel.CartandOrder.transport.cash;

import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import com.GoTravel.CartandOrder.client.PaymentClient;
import com.GoTravel.CartandOrder.entity.Order;
import com.GoTravel.CartandOrder.enums.OrderKind;
import com.GoTravel.CartandOrder.enums.OrderStatus;
import com.GoTravel.CartandOrder.enums.PaymentMethod;
import com.GoTravel.CartandOrder.repository.OrderRepository;
import com.GoTravel.CartandOrder.transport.GoCarClient;
import com.GoTravel.CartandOrder.transport.TransportInventoryClient;
import com.GoTravel.CartandOrder.transport.TransportOrderService;
import com.GoTravel.CartandOrder.transport.cash.application.CashService;
import com.GoTravel.CartandOrder.transport.cash.domain.CashLedger;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CashServiceTest {
    private final CashLedger ledger = mock(CashLedger.class);
    private final GoCarClient car = mock(GoCarClient.class);
    private final TransportInventoryClient inventory = mock(TransportInventoryClient.class);
    private final TransportOrderService fulfillment = mock(TransportOrderService.class);
    private final OrderRepository orders = mock(OrderRepository.class);
    private final TransactionTemplate transactions = mock(TransactionTemplate.class);
    private final PaymentClient payments = mock(PaymentClient.class);
    private final CashService service = new CashService(ledger, car, inventory, fulfillment, orders, transactions, payments);

    @Test
    void keepsRefundAdjustmentPendingUntilGoPayAcknowledgesIt() {
        UUID orderId = UUID.randomUUID(), shiftId = UUID.randomUUID(), operatorId = UUID.randomUUID();
        var adjustment = new CashLedger.RefundAdjustment(orderId, shiftId, operatorId,
                new BigDecimal("200000"), new BigDecimal("10000"),
                "test-v1", new BigDecimal("0.05"));
        when(ledger.pendingRefundAdjustments(50)).thenReturn(List.of(adjustment));
        when(payments.recordCashRefundAdjustment(eq(orderId), any()))
                .thenThrow(new IllegalStateException("GoPay unavailable"))
                .thenReturn(ApiResponse.success("ok"));

        service.deliverRefundAdjustments();
        verify(ledger, never()).markRefundAdjustmentSent(orderId);

        service.deliverRefundAdjustments();
        verify(ledger).markRefundAdjustmentSent(orderId);
        verify(payments, times(2)).recordCashRefundAdjustment(eq(orderId),
                eq(new PaymentClient.CashRefundAdjustment(orderId, shiftId, operatorId,
                        new BigDecimal("200000"), new BigDecimal("10000"),
                        "test-v1", new BigDecimal("0.05"))));
    }

    @Test
    void keepsCashReceiptAndReconciliationStateWhenTicketIssueFails() {
        UUID actor = UUID.randomUUID(), orderId = UUID.randomUUID(), trip = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID(), operator = UUID.randomUUID(), hold = UUID.randomUUID();
        UUID receiptId = UUID.randomUUID();
        var amount = new BigDecimal("250000");
        var order = Order.builder().id(orderId).orderKind(OrderKind.GOCAR_TICKET)
                .paymentMethod(PaymentMethod.CASH).transportTripId(trip)
                .transportCashierId(actor).transportCashShiftId(shiftId)
                .totalAmount(amount).status(OrderStatus.CASH_PENDING)
                .expiresAt(LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).plusMinutes(10)).build();
        when(orders.findById(orderId)).thenReturn(Optional.of(order));
        when(orders.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));
        when(ledger.active(actor)).thenReturn(new CashLedger.Shift(shiftId, actor, operator, Instant.now(),
                "test-v1", new BigDecimal("0.05")));
        when(car.authorizeStaff(actor, trip, "SELL_CASH")).thenReturn(ApiResponse.success(
                new GoCarClient.StaffAuthorization(actor, trip, operator, "SELL_CASH")));
        when(inventory.orderStatus(orderId)).thenReturn(ApiResponse.success(
                new TransportInventoryClient.HoldStatus(orderId, trip, List.of(UUID.randomUUID()),
                        "HELD", Instant.now().plusSeconds(600))));
        when(ledger.record(orderId, shiftId, actor, operator, amount)).thenReturn(
                new CashLedger.Receipt(receiptId, "CAR-CASH-TEST", orderId, shiftId, amount, Instant.now()));
        when(transactions.execute(any())).thenAnswer(call ->
                ((org.springframework.transaction.support.TransactionCallback<?>) call.getArgument(0))
                        .doInTransaction(mock(TransactionStatus.class)));
        doThrow(new IllegalStateException("ticket service down")).when(fulfillment).fulfill(orderId);

        var result = service.receive(actor, orderId, amount);

        assertThat(result.receiptId()).isEqualTo(receiptId);
        assertThat(result.orderStatus()).isEqualTo("CASH_RECEIVED_PENDING_RECONCILIATION");
        verify(ledger).record(orderId, shiftId, actor, operator, amount);
        verify(orders).save(order);
    }
}
