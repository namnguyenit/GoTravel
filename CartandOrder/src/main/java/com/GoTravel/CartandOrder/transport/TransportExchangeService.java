package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.enums.OrderKind;
import com.GoTravel.CartandOrder.enums.OrderStatus;
import com.GoTravel.CartandOrder.enums.PaymentMethod;
import com.GoTravel.CartandOrder.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;

/** Assisted exchange: keep the funded replacement before voiding the old order; money stays in auditable sale/refund records. */
@Service
@RequiredArgsConstructor
@Slf4j
public class TransportExchangeService {
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final JdbcTemplate jdbc;
    private final OrderRepository orders;
    private final TransportOrderService transportOrders;
    private final TransactionTemplate transactions;

    public record ExchangeCase(UUID oldOrderId, UUID newOrderId, String status, String lastError, java.math.BigDecimal oldAmount,
                               java.math.BigDecimal newAmount, java.math.BigDecimal difference, String paymentMethod) {}

    public ExchangeCase request(UUID adminId, UUID oldOrderId, UUID newOrderId, String reason) {
        if (adminId == null || oldOrderId == null || newOrderId == null ||
                oldOrderId.equals(newOrderId) || reason == null || reason.isBlank() || reason.length() > 500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Yêu cầu đổi vé không hợp lệ");
        String normalized = reason.trim();
        var prior = jdbc.query("select new_order_id,requested_by,reason from transport_exchange_cases where old_order_id=?",
                (rs, row) -> new Object[]{rs.getObject(1, UUID.class), rs.getObject(2, UUID.class),
                        rs.getString(3)}, oldOrderId).stream().findFirst().orElse(null);
        if (prior != null) {
            if (!newOrderId.equals(prior[0]) || !adminId.equals(prior[1]) || !normalized.equals(prior[2]))
                throw conflict("Đơn cũ đã có yêu cầu đổi vé khác");
            return get(oldOrderId);
        }
        transactions.executeWithoutResult(status -> {
            jdbc.execute("select pg_advisory_xact_lock(74100101)");
            // Lock in stable order so two exchange requests cannot reverse-lock the same orders.
            UUID first = oldOrderId.compareTo(newOrderId) < 0 ? oldOrderId : newOrderId;
            UUID second = first.equals(oldOrderId) ? newOrderId : oldOrderId;
            orders.findByIdForUpdate(first).orElseThrow(() -> conflict("Không có đơn cần đổi"));
            orders.findByIdForUpdate(second).orElseThrow(() -> conflict("Không có đơn cần đổi"));
            Integer itemOperations = jdbc.queryForObject("select count(*) from transport_item_operations where order_id in (?,?)",Integer.class,oldOrderId,newOrderId);
            if(itemOperations!=null && itemOperations>0)throw conflict("Đơn đã dùng đổi/hủy từng vé; không dùng luồng đổi toàn đơn cũ");
            var oldOrder = orders.findById(oldOrderId).orElseThrow();
            var newOrder = orders.findById(newOrderId).orElseThrow();
            if (oldOrder.getOrderKind() != OrderKind.GOCAR_TICKET ||
                    newOrder.getOrderKind() != OrderKind.GOCAR_TICKET ||
                    oldOrder.getPaymentMethod() != newOrder.getPaymentMethod() ||
                    !sameBuyer(oldOrder, newOrder) ||
                    !oldOrder.getHostId().equals(newOrder.getHostId()) ||
                    oldOrder.getItems().size() != newOrder.getItems().size() ||
                    oldOrder.getStatus() != OrderStatus.CONFIRMED ||
                    newOrder.getStatus() != OrderStatus.CONFIRMED ||
                    oldOrder.getTransportDepartureAt() == null ||
                    !oldOrder.getTransportDepartureAt().isAfter(
                            LocalDateTime.now(VN_ZONE).plusHours(oldOrder.getTransportPartialRefundHours() != null ? oldOrder.getTransportPartialRefundHours() : 6)) ||
                    newOrder.getTransportDepartureAt() == null ||
                    !newOrder.getTransportDepartureAt().isAfter(LocalDateTime.now(VN_ZONE))) {
                throw conflict("Chỉ đổi hai đơn đã xác nhận cùng khách, cùng nhà xe, cùng phương thức và số hành khách");
            }
            Integer cancelling = jdbc.queryForObject("select count(*) from transport_trip_cancellations where trip_id in (?,?)", Integer.class,
                    oldOrder.getTransportTripId(), newOrder.getTransportTripId());
            if (cancelling != null && cancelling > 0) throw conflict("Chuyến đang hủy, không thể đổi vé");
            if (oldOrder.getPaymentMethod() == PaymentMethod.CASH) {
                Integer receipts = jdbc.queryForObject("select count(*) from transport_cash_receipts where order_id in (?,?)",
                        Integer.class, oldOrderId, newOrderId);
                if (receipts == null || receipts != 2) throw conflict("Hai đơn tiền mặt phải có biên nhận thực thu");
            }
            jdbc.update("insert into transport_exchange_cases(old_order_id,new_order_id,requested_by,reason,old_amount,new_amount,difference,payment_method) " +
                            "values (?,?,?,?,?,?,?,?) on conflict (old_order_id) do nothing",
                    oldOrderId, newOrderId, adminId, normalized, oldOrder.getTotalAmount(), newOrder.getTotalAmount(),
                    newOrder.getTotalAmount().subtract(oldOrder.getTotalAmount()), oldOrder.getPaymentMethod().name());
            TransportNotificationService.enqueue(jdbc, newOrder, "EXCHANGE");
        });
        var saved = jdbc.query("select new_order_id,requested_by,reason from transport_exchange_cases " +
                        "where old_order_id=?",
                (rs, row) -> new Object[]{rs.getObject(1, UUID.class), rs.getObject(2, UUID.class),
                        rs.getString(3)}, oldOrderId).stream().findFirst().orElse(null);
        if (saved == null || !newOrderId.equals(saved[0]) || !adminId.equals(saved[1]) ||
                !normalized.equals(saved[2])) throw conflict("Đơn cũ đã có yêu cầu đổi vé khác");
        try {
            process(oldOrderId);
        } catch (Exception error) {
            log.warn("Exchange {} queued for retry", oldOrderId, error);
        }
        return get(oldOrderId);
    }

    public ExchangeCase get(UUID oldOrderId) {
        return jdbc.query("select new_order_id,status,last_error,old_amount,new_amount,difference,payment_method from transport_exchange_cases " +
                        "where old_order_id=?",
                (rs, row) -> new ExchangeCase(oldOrderId, rs.getObject(1, UUID.class),
                        rs.getString(2), rs.getString(3), rs.getBigDecimal(4), rs.getBigDecimal(5),
                        rs.getBigDecimal(6), rs.getString(7)), oldOrderId).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @Scheduled(fixedDelay = 30000)
    public void reconcile() {
        for (UUID id : jdbc.query("select old_order_id from transport_exchange_cases " +
                        "where status in ('PROCESSING','REFUND_PENDING') order by updated_at limit 50",
                (rs, row) -> rs.getObject(1, UUID.class))) {
            try {
                process(id);
            } catch (Exception error) {
                log.warn("Exchange {} pending", id, error);
                jdbc.update("update transport_exchange_cases set last_error=?,updated_at=now() " +
                        "where old_order_id=? and status in ('PROCESSING','REFUND_PENDING')", error.getClass().getSimpleName(), id);
            }
        }
    }

    public void process(UUID oldOrderId) {
        var exchange = get(oldOrderId);
        if (java.util.List.of("REPLACEMENT_CANCELLED", "EXCEPTION_RESOLVED", "COMPLETED").contains(exchange.status())) return;
        var replacement = orders.findById(exchange.newOrderId()).orElseThrow();
        Integer cancelling = jdbc.queryForObject("select count(*) from transport_trip_cancellations where trip_id=?", Integer.class, replacement.getTransportTripId());
        if (cancelling != null && cancelling > 0) {
            jdbc.update("update transport_exchange_cases set status='REPLACEMENT_CANCELLED',last_error='REPLACEMENT_TRIP_CANCELLED',updated_at=now() where old_order_id=? and status in ('PROCESSING','REFUND_PENDING')", oldOrderId);
            return;
        }
        var old = orders.findById(oldOrderId).orElseThrow();
        if (old.getStatus() == OrderStatus.REFUNDED) {
            jdbc.update("update transport_exchange_cases set status='COMPLETED',last_error=null," +
                    "updated_at=now() where old_order_id=? and status in ('PROCESSING','REFUND_PENDING')", oldOrderId);
            return;
        }
        if (old.getStatus() == OrderStatus.REFUND_PENDING) {
            jdbc.update("update transport_exchange_cases set status='REFUND_PENDING',last_error=null," +
                    "updated_at=now() where old_order_id=? and status = 'PROCESSING'", oldOrderId);
            return;
        }
        if (replacement.getStatus() != OrderStatus.CONFIRMED)
            throw conflict("Đơn thay thế không còn hiệu lực; giữ vé cũ để xử lý");
        var reason = jdbc.queryForObject("select reason from transport_exchange_cases where old_order_id=?",
                String.class, oldOrderId);
        String cancellationReason = "Đổi vé: " + reason;
        transportOrders.cancelForExchange(oldOrderId, exchange.newOrderId(),
                cancellationReason.substring(0, Math.min(500, cancellationReason.length())));
        jdbc.update("update transport_exchange_cases set status='REFUND_PENDING',last_error=null," +
                "updated_at=now() where old_order_id=? and status = 'PROCESSING'", oldOrderId);
    }

    public java.util.List<java.util.Map<String,Object>> exceptions() {
        return jdbc.queryForList("select old_order_id,new_order_id,status,last_error,old_amount,new_amount,difference,updated_at " +
                "from transport_exchange_cases where status='REPLACEMENT_CANCELLED' order by updated_at limit 100");
    }

    public void resolveException(UUID actor, UUID oldOrderId, String note) {
        if (note == null || note.isBlank() || note.length()>1000) throw conflict("Cần ghi chú xử lý");
        transactions.executeWithoutResult(status -> {
            jdbc.execute("select pg_advisory_xact_lock(74100101)");
            var exchange = get(oldOrderId);
            UUID first = oldOrderId.compareTo(exchange.newOrderId()) < 0 ? oldOrderId : exchange.newOrderId();
            UUID second = first.equals(oldOrderId) ? exchange.newOrderId() : oldOrderId;
            orders.findByIdForUpdate(first).orElseThrow(); orders.findByIdForUpdate(second).orElseThrow();
            var old = orders.findById(oldOrderId).orElseThrow(); var replacement = orders.findById(exchange.newOrderId()).orElseThrow();
            if ("EXCEPTION_RESOLVED".equals(exchange.status())) return;
            if (!"REPLACEMENT_CANCELLED".equals(exchange.status()) || replacement.getStatus()!=OrderStatus.REFUNDED ||
                    !java.util.List.of(OrderStatus.CONFIRMED,OrderStatus.COMPLETED,OrderStatus.REFUNDED).contains(old.getStatus()))
                throw conflict("Đơn thay thế phải hoàn tiền xong; đơn cũ phải còn hiệu lực hoặc đã hoàn tiền xong");
            jdbc.update("update transport_exchange_cases set status='EXCEPTION_RESOLVED',resolved_by=?,resolution_note=?,resolved_at=now(),updated_at=now() where old_order_id=? and status='REPLACEMENT_CANCELLED'", actor,note.trim(),oldOrderId);
        });
    }

    private boolean sameBuyer(com.GoTravel.CartandOrder.entity.Order oldOrder,
                              com.GoTravel.CartandOrder.entity.Order newOrder) {
        if (oldOrder.getUserId() != null) return oldOrder.getUserId().equals(newOrder.getUserId());
        if (newOrder.getUserId() != null || oldOrder.getPaymentMethod() != PaymentMethod.CASH ||
                oldOrder.getCustomerInfo() == null || newOrder.getCustomerInfo() == null) return false;
        var oldInfo = oldOrder.getCustomerInfo(); var newInfo = newOrder.getCustomerInfo();
        return oldInfo.getPhone() != null && oldInfo.getPhone().replaceAll("\\s+", "")
                .equals(newInfo.getPhone() == null ? "" : newInfo.getPhone().replaceAll("\\s+", "")) &&
                oldInfo.getFullName() != null && oldInfo.getFullName().trim().equalsIgnoreCase(newInfo.getFullName());
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
