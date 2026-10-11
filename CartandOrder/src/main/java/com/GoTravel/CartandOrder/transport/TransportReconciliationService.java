package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.client.PaymentClient;
import com.GoTravel.CartandOrder.enums.OrderKind;
import com.GoTravel.CartandOrder.enums.OrderStatus;
import com.GoTravel.CartandOrder.enums.PaymentMethod;
import com.GoTravel.CartandOrder.repository.OrderRepository;
import com.GoTravel.CartandOrder.transport.cash.domain.CashLedger;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Read-only cross-service checks; findings are observations, not commands to move money or seats. */
@Service
@RequiredArgsConstructor
@Slf4j
public class TransportReconciliationService {
    private final JdbcTemplate jdbc;
    private final OrderRepository orders;
    private final TransportInventoryClient inventory;
    private final GoCarClient car;
    private final PaymentClient payments;
    private final CashLedger cash;
    private final TransactionTemplate transactions;

    private record Item(UUID id, UUID seatId) {}
    private record Snapshot(UUID orderId, UUID tripId, OrderStatus status, PaymentMethod method,
                            LocalDateTime expiresAt, LocalDateTime updatedAt, List<Item> items) {}
    public record Finding(UUID orderId, String issueCode, String status, String detail,
                          java.time.OffsetDateTime firstSeenAt, java.time.OffsetDateTime lastSeenAt) {}

    @Scheduled(fixedDelay = 120000)
    public void scanRecent() {
        // The admin endpoint can refresh any order outside this automatic window.
        List<UUID> ids = jdbc.query("select id from orders where order_kind='GOCAR_TICKET' " +
                        "and (updated_at > now() - interval '30 days' or status in " +
                        "('PAID_REVIEW','CASH_RECEIVED_PENDING_RECONCILIATION','REFUND_PENDING'," +
                        "'FULFILLMENT_PENDING','CANCELLATION_PENDING')) " +
                        "order by updated_at desc limit 500",
                (rs, row) -> rs.getObject(1, UUID.class));
        for (UUID id : ids) {
            try { scan(id); }
            catch (Exception error) { log.warn("Transport reconciliation for {} failed", id, error); }
        }
    }

    public List<Finding> scan(UUID orderId) {
        Snapshot snapshot = transactions.execute(status -> {
            var order = orders.findById(orderId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            if (order.getOrderKind() != OrderKind.GOCAR_TICKET)
                throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            return new Snapshot(orderId, order.getTransportTripId(), order.getStatus(),
                    order.getPaymentMethod(), order.getExpiresAt(), order.getUpdatedAt(),
                    order.getItems().stream().map(item -> new Item(item.getId(), item.getTransportSeatId())).toList());
        });
        Map<String, String> issues = new HashMap<>();
        boolean complete = true;
        var now = LocalDateTime.now();
        if (snapshot.status() == OrderStatus.PAID_REVIEW) issues.put("PAID_REVIEW", "Đã nhận tiền nhưng ghế/vé cần đối soát");
        if (snapshot.status() == OrderStatus.CASH_RECEIVED_PENDING_RECONCILIATION)
            issues.put("CASH_FULFILLMENT_PENDING", "Đã ghi biên nhận tiền mặt nhưng chưa cấp đủ vé");
        if (snapshot.status() == OrderStatus.FULFILLMENT_PENDING && stale(snapshot.updatedAt(), now, 5))
            issues.put("FULFILLMENT_STUCK", "Đơn đã thu tiền chờ phát vé quá 5 phút");
        if (snapshot.status() == OrderStatus.CANCELLATION_PENDING && stale(snapshot.updatedAt(), now, 5))
            issues.put("CANCELLATION_STUCK", "Hủy vé chưa hoàn tất quá 5 phút");
        if (snapshot.status() == OrderStatus.REFUND_PENDING && stale(snapshot.updatedAt(), now, 1440))
            issues.put("REFUND_STUCK", "Hồ sơ hoàn tiền chờ hơn 24 giờ");
        if ((snapshot.status() == OrderStatus.PAYMENT_PENDING || snapshot.status() == OrderStatus.CASH_PENDING)
                && snapshot.expiresAt() != null && snapshot.expiresAt().isBefore(now.minusMinutes(1)))
            issues.put("EXPIRED_ORDER_ACTIVE", "Giữ ghế hết hạn nhưng đơn vẫn chờ thanh toán");

        try {
            var response = inventory.orderStatus(orderId);
            var hold = response == null ? null : response.getData();
            if (hold == null || snapshot.tripId() == null || !snapshot.tripId().equals(hold.tripId())) {
                issues.put("INVENTORY_MISMATCH", "Không có hold/ghế đúng chuyến");
            } else if (snapshot.status() == OrderStatus.CONFIRMED && !"SOLD".equals(hold.status())) {
                issues.put("INVENTORY_MISMATCH", "Đơn đã xác nhận nhưng ghế không ở trạng thái SOLD");
            } else if ((snapshot.status() == OrderStatus.REFUND_PENDING ||
                    snapshot.status() == OrderStatus.REFUNDED || snapshot.status() == OrderStatus.CANCELLED) &&
                    ("HELD".equals(hold.status()) || "SOLD".equals(hold.status()))) {
                issues.put("INVENTORY_MISMATCH", "Đơn đã hủy/hoàn nhưng ghế còn bị giữ hoặc bán");
            }
        } catch (FeignException.NotFound missing) {
            if (snapshot.status() != OrderStatus.CANCELLED && snapshot.status() != OrderStatus.PENDING)
                issues.put("INVENTORY_MISMATCH", "Không tìm thấy hold của đơn");
        } catch (Exception unavailable) {
            complete = false;
            issues.put("INVENTORY_UNAVAILABLE", "Chưa truy vấn được Inventory");
        }
        try {
            var response = car.orderTickets(orderId);
            var tickets = response == null ? null : response.getData();
            if (tickets == null) throw new IllegalStateException("No ticket response");
            if (snapshot.status() == OrderStatus.CONFIRMED) {
                Set<UUID> items = new HashSet<>(snapshot.items().stream().map(Item::id).toList());
                Set<UUID> ticketItems = new HashSet<>(tickets.stream().map(GoCarClient.TicketStatus::orderItemId).toList());
                if (tickets.size() != items.size() || !ticketItems.equals(items) ||
                        tickets.stream().anyMatch(ticket -> snapshot.tripId() == null ||
                                !snapshot.tripId().equals(ticket.tripId()) || ticket.status() == null ||
                                !List.of("ACTIVE", "CHECKED_IN").contains(ticket.status()))) {
                    issues.put("TICKETS_MISMATCH", "Vé GoCar không khớp ghế/đơn đã xác nhận");
                }
            } else if ((snapshot.status() == OrderStatus.REFUND_PENDING ||
                    snapshot.status() == OrderStatus.REFUNDED || snapshot.status() == OrderStatus.CANCELLED) &&
                    tickets.stream().anyMatch(ticket -> !"VOID".equals(ticket.status()))) {
                issues.put("TICKETS_ACTIVE_AFTER_CANCEL", "Vé còn hiệu lực sau khi hủy/hoàn");
            }
        } catch (Exception unavailable) {
            complete = false;
            issues.put("GOCAR_UNAVAILABLE", "Chưa truy vấn được vé GoCar");
        }
        if (snapshot.method() == PaymentMethod.ONLINE) {
            try {
                var response = payments.getPaymentStatus(orderId);
                var payment = response == null ? null : response.getData();
                if (snapshot.status() == OrderStatus.CONFIRMED &&
                        (payment == null || !"COMPLETED".equals(payment.status()))) {
                    issues.put("PAYMENT_MISMATCH", "Đơn có vé nhưng GoPay chưa ghi hoàn tất thanh toán");
                }
                if (snapshot.status() == OrderStatus.REFUNDED &&
                        (payment == null || !"REFUNDED".equals(payment.status()))) {
                    issues.put("PAYMENT_MISMATCH", "Cart ghi đã hoàn nhưng GoPay chưa xác nhận hoàn");
                }
            } catch (FeignException.NotFound missing) {
                if (snapshot.status() == OrderStatus.CONFIRMED ||
                        snapshot.status() == OrderStatus.REFUNDED ||
                        snapshot.status() == OrderStatus.REFUND_PENDING)
                    issues.put("PAYMENT_MISMATCH", "Không tìm thấy giao dịch GoPay của đơn");
            } catch (Exception unavailable) {
                complete = false;
                issues.put("GOPAY_UNAVAILABLE", "Chưa truy vấn được GoPay");
            }
        } else if (snapshot.status() == OrderStatus.CONFIRMED ||
                snapshot.status() == OrderStatus.CASH_RECEIVED_PENDING_RECONCILIATION) {
            try {
                if (cash.findReceipt(orderId) == null)
                    issues.put("CASH_RECEIPT_MISSING", "Đơn tiền mặt không có biên nhận");
            } catch (Exception unavailable) {
                complete = false;
                issues.put("CASH_LEDGER_UNAVAILABLE", "Chưa đọc được sổ tiền mặt");
            }
        }
        final boolean scanComplete = complete;
        transactions.executeWithoutResult(status -> {
            for (var issue : issues.entrySet()) {
                jdbc.update("insert into transport_reconciliation_findings(order_id,issue_code,detail) " +
                                "values (?,?,?) on conflict (order_id,issue_code) do update set " +
                                "status='OPEN',detail=excluded.detail,last_seen_at=now(),resolved_at=null",
                        orderId, issue.getKey(), issue.getValue());
            }
            if (scanComplete) {
                var existing = jdbc.query("select issue_code from transport_reconciliation_findings " +
                                "where order_id=? and status='OPEN'",
                        (rs, row) -> rs.getString(1), orderId);
                for (String code : existing) {
                    if (!issues.containsKey(code)) {
                        jdbc.update("update transport_reconciliation_findings set status='RESOLVED'," +
                                "resolved_at=now(),last_seen_at=now() where order_id=? and issue_code=?",
                                orderId, code);
                    }
                }
            }
        });
        return findings(orderId);
    }

    public List<Finding> findings(UUID orderId) {
        return jdbc.query("select order_id,issue_code,status,detail,first_seen_at,last_seen_at " +
                        "from transport_reconciliation_findings where order_id=? order by status,issue_code",
                (rs, row) -> new Finding(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3),
                        rs.getString(4), rs.getObject(5, java.time.OffsetDateTime.class),
                        rs.getObject(6, java.time.OffsetDateTime.class)), orderId);
    }

    public List<Finding> openFindings(int limit) {
        return jdbc.query("select order_id,issue_code,status,detail,first_seen_at,last_seen_at " +
                        "from transport_reconciliation_findings where status='OPEN' " +
                        "order by last_seen_at desc limit ?",
                (rs, row) -> new Finding(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3),
                        rs.getString(4), rs.getObject(5, java.time.OffsetDateTime.class),
                        rs.getObject(6, java.time.OffsetDateTime.class)), Math.max(1, Math.min(limit, 200)));
    }

    public void addNote(UUID orderId, String code, UUID actorId, String note) {
        if (orderId == null || code == null || code.isBlank() || actorId == null ||
                note == null || note.isBlank() || note.length() > 1000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ghi chú đối soát không hợp lệ");
        jdbc.update("insert into transport_reconciliation_notes(id,order_id,issue_code,actor_id,note) " +
                        "values (?,?,?,?,?)", UUID.randomUUID(), orderId, code, actorId, note.trim());
    }

    private boolean stale(LocalDateTime updated, LocalDateTime now, long minutes) {
        return updated != null && Duration.between(updated, now).toMinutes() > minutes;
    }
}
