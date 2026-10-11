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

/** V1 exchange: a separately paid replacement order, followed by a full refund of the old one. */
@Service
@RequiredArgsConstructor
@Slf4j
public class TransportExchangeService {
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final JdbcTemplate jdbc;
    private final OrderRepository orders;
    private final TransportOrderService transportOrders;
    private final TransactionTemplate transactions;

    public record ExchangeCase(UUID oldOrderId, UUID newOrderId, String status, String lastError) {}

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
            // Lock in stable order so two exchange requests cannot reverse-lock the same orders.
            UUID first = oldOrderId.compareTo(newOrderId) < 0 ? oldOrderId : newOrderId;
            UUID second = first.equals(oldOrderId) ? newOrderId : oldOrderId;
            orders.findByIdForUpdate(first).orElseThrow(() -> conflict("Không có đơn cần đổi"));
            orders.findByIdForUpdate(second).orElseThrow(() -> conflict("Không có đơn cần đổi"));
            var oldOrder = orders.findById(oldOrderId).orElseThrow();
            var newOrder = orders.findById(newOrderId).orElseThrow();
            if (oldOrder.getOrderKind() != OrderKind.GOCAR_TICKET ||
                    newOrder.getOrderKind() != OrderKind.GOCAR_TICKET ||
                    oldOrder.getPaymentMethod() != PaymentMethod.ONLINE ||
                    newOrder.getPaymentMethod() != PaymentMethod.ONLINE ||
                    oldOrder.getUserId() == null ||
                    !oldOrder.getUserId().equals(newOrder.getUserId()) ||
                    oldOrder.getStatus() != OrderStatus.CONFIRMED ||
                    newOrder.getStatus() != OrderStatus.CONFIRMED ||
                    oldOrder.getTransportDepartureAt() == null ||
                    !oldOrder.getTransportDepartureAt().isAfter(
                            LocalDateTime.now(VN_ZONE).plusHours(6)) ||
                    newOrder.getTransportDepartureAt() == null ||
                    !newOrder.getTransportDepartureAt().isAfter(LocalDateTime.now(VN_ZONE))) {
                throw conflict("Chỉ đổi hai đơn online đã xác nhận của cùng khách trước giờ khởi hành");
            }
            jdbc.update("insert into transport_exchange_cases(old_order_id,new_order_id,requested_by,reason) " +
                            "values (?,?,?,?) on conflict (old_order_id) do nothing",
                    oldOrderId, newOrderId, adminId, normalized);
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
        return jdbc.query("select new_order_id,status,last_error from transport_exchange_cases " +
                        "where old_order_id=?",
                (rs, row) -> new ExchangeCase(oldOrderId, rs.getObject(1, UUID.class),
                        rs.getString(2), rs.getString(3)), oldOrderId).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @Scheduled(fixedDelay = 30000)
    public void reconcile() {
        for (UUID id : jdbc.query("select old_order_id from transport_exchange_cases " +
                        "where status <> 'COMPLETED' order by updated_at limit 50",
                (rs, row) -> rs.getObject(1, UUID.class))) {
            try {
                process(id);
            } catch (Exception error) {
                log.warn("Exchange {} pending", id, error);
                jdbc.update("update transport_exchange_cases set last_error=?,updated_at=now() " +
                        "where old_order_id=?", error.getClass().getSimpleName(), id);
            }
        }
    }

    public void process(UUID oldOrderId) {
        var exchange = get(oldOrderId);
        var replacement = orders.findById(exchange.newOrderId()).orElseThrow();
        var old = orders.findById(oldOrderId).orElseThrow();
        if (old.getStatus() == OrderStatus.REFUNDED) {
            jdbc.update("update transport_exchange_cases set status='COMPLETED',last_error=null," +
                    "updated_at=now() where old_order_id=?", oldOrderId);
            return;
        }
        if (old.getStatus() == OrderStatus.REFUND_PENDING) {
            jdbc.update("update transport_exchange_cases set status='REFUND_PENDING',last_error=null," +
                    "updated_at=now() where old_order_id=?", oldOrderId);
            return;
        }
        if (replacement.getStatus() != OrderStatus.CONFIRMED)
            throw conflict("Đơn thay thế không còn hiệu lực; giữ vé cũ để xử lý");
        var reason = jdbc.queryForObject("select reason from transport_exchange_cases where old_order_id=?",
                String.class, oldOrderId);
        String cancellationReason = "Đổi vé: " + reason;
        transportOrders.cancelForExchange(oldOrderId,
                cancellationReason.substring(0, Math.min(500, cancellationReason.length())));
        jdbc.update("update transport_exchange_cases set status='REFUND_PENDING',last_error=null," +
                "updated_at=now() where old_order_id=?", oldOrderId);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
