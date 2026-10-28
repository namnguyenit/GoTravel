package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.entity.Order;
import com.GoTravel.CartandOrder.entity.OrderItem;
import com.GoTravel.CartandOrder.enums.OrderKind;
import com.GoTravel.CartandOrder.enums.OrderStatus;
import com.GoTravel.CartandOrder.repository.OrderRepository;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransportAmendmentService {
    private final JdbcTemplate jdbc;
    private final OrderRepository orders;
    private final GoCarClient car;
    private final TransactionTemplate transactions;
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;

    public record AmendRequest(UUID commandId, String passengerName, UUID pickupStopId, UUID dropoffStopId) {}

    public record AmendmentRecord(
            UUID commandId,
            UUID orderId,
            UUID orderItemId,
            UUID actorId,
            int expectedRevision,
            Integer newRevision,
            String passengerName,
            UUID pickupStopId,
            UUID dropoffStopId,
            String payloadHash,
            String status,
            String errorReason,
            Instant createdAt,
            Instant appliedAt,
            int retryCount
    ) {}

    public AmendmentRecord amend(UUID actorId, UUID orderId, UUID orderItemId, AmendRequest request) {
        if (request == null || request.commandId() == null || request.passengerName() == null ||
                request.passengerName().isBlank() || request.passengerName().trim().length() > 120 ||
                request.pickupStopId() == null || request.dropoffStopId() == null) throw badRequest("Thông tin sửa vé không hợp lệ; cần commandId UUID ổn định cho retry");
        var initial = orders.findWithItemsById(orderId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var initialItem=initial.getItems().stream().filter(i->i.getId().equals(orderItemId)).findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        authorizeActor(actorId, initial, initialItem.getTransportTripId());
        AmendmentRecord command = transactions.execute(status -> {
            entityManager.clear();
            var order = orders.findByIdForUpdate(orderId).orElseThrow();
            if (order.getOrderKind() != OrderKind.GOCAR_TICKET) throw badRequest("Không phải đơn vé xe");
            var item = order.getItems().stream().filter(i -> i.getId().equals(orderItemId)).findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            if(!Objects.equals(item.getTransportTripId(),initialItem.getTransportTripId()))throw conflict("Vé vừa đổi chuyến; thử lại trên vé hiện tại");
            if (item.getTransportTicketId() == null) throw conflict("Vé chưa phát hành");
            var hash = computePayloadHash(orderId, orderItemId, item.getTransportTicketId(), request.passengerName().trim(), request.pickupStopId(), request.dropoffStopId());
            var replay = findByCommandId(request.commandId());
            if (replay != null) {
                if (!replay.orderId().equals(orderId) || !replay.orderItemId().equals(orderItemId) || !replay.payloadHash().equals(hash)) throw conflict("commandId đã có payload khác");
                return replay;
            }
            if (order.getStatus() != OrderStatus.CONFIRMED || !"ACTIVE".equals(item.getTransportItemState()) || item.getTransportBoardingStatus() != null) throw conflict("Chỉ sửa vé đang có hiệu lực");
            var pending = findPendingByItem(orderItemId);
            if (pending != null) throw conflict("Vé có yêu cầu chưa kết thúc, cần xử lý/retry command cũ");
            Integer other = jdbc.queryForObject("select count(*) from transport_exchange_cases where (old_order_id=? or new_order_id=?) and status not in ('COMPLETED','EXCEPTION_RESOLVED','REPLACEMENT_CANCELLED')", Integer.class, orderId, orderId);
            if (other != null && other > 0) throw conflict("Đơn đang đổi vé");
            jdbc.update("""
                INSERT INTO transport_order_amendments(command_id,order_id,order_item_id,actor_id,expected_revision,passenger_name,pickup_stop_id,dropoff_stop_id,payload_hash,status)
                VALUES (?,?,?,?,?,?,?,?,?,'PENDING')
                """, request.commandId(), orderId, orderItemId, actorId, item.getTransportTicketRevision(), request.passengerName().trim(), request.pickupStopId(), request.dropoffStopId(), hash);
            return findByCommandId(request.commandId());
        });
        if ("PENDING".equals(command.status())) process(command);
        return findByCommandId(command.commandId());
    }

    private void process(AmendmentRecord amend) {
        try {
            UUID ticketId = jdbc.queryForObject("SELECT transport_ticket_id FROM order_items WHERE id=?", UUID.class, amend.orderItemId());
            var response = car.amendTicket(new GoCarClient.AmendTicketRequest(amend.commandId(), amend.orderId(), amend.orderItemId(), ticketId,
                amend.expectedRevision(), amend.payloadHash(), amend.passengerName(), amend.pickupStopId(), amend.dropoffStopId()));
            if (response == null || !response.isSuccess() || response.getData() == null) throw new IllegalStateException("GoCar chưa ACK");
            var result = response.getData();
            if (!Objects.equals(ticketId, result.ticketId()) || result.revision() != amend.expectedRevision()+1 ||
                !Objects.equals(amend.passengerName(), result.passengerName()) || !Objects.equals(amend.pickupStopId(),result.pickupStopId()) || !Objects.equals(amend.dropoffStopId(),result.dropoffStopId())) throw new IllegalStateException("ACK không khớp command");
            applySuccessfulAmendment(amend.orderId(), amend.orderItemId(), amend.commandId(), result);
        } catch (FeignException.Conflict rejected) { markAmendmentConflict(amend.commandId(), "GoCar từ chối: revision/trạng thái"); }
        catch (FeignException.BadRequest rejected) { markAmendmentConflict(amend.commandId(), "GoCar từ chối payload"); }
        catch (Exception unavailable) { incrementRetry(amend.commandId()); log.warn("Amendment {} retained for recovery", amend.commandId()); }
    }

    private void applySuccessfulAmendment(UUID orderId, UUID orderItemId, UUID commandId, GoCarClient.AmendTicketResult result) {
        transactions.executeWithoutResult(status -> {
            orders.findByIdForUpdate(orderId).orElseThrow();
            // Update order_item projection only if new revision > current revision
            int updated = jdbc.update("""
                    UPDATE order_items
                    SET passenger_name = ?,
                        pickup_stop_id = ?,
                        dropoff_stop_id = ?,
                        transport_ticket_revision = ?
                    WHERE id = ? AND (transport_ticket_revision IS NULL OR transport_ticket_revision < ?)
                    """, result.passengerName(), result.pickupStopId(), result.dropoffStopId(),
                    result.revision(), orderItemId, result.revision());

            jdbc.update("""
                    UPDATE transport_order_amendments
                    SET status = 'COMPLETED',
                        new_revision = ?,
                        applied_at = NOW(),
                        error_reason = NULL
                    WHERE command_id = ? AND status IN ('PENDING','ATTENTION')
                    """, result.revision(), commandId);
            entityManager.clear();

            // Enqueue notification for passenger revision
            var order = orders.findWithItemsById(orderId).orElse(null);
            if (order != null) {
                TransportNotificationService.enqueue(jdbc, order, "AMENDMENT", commandId.toString());
            }
        });
    }

    private void markAmendmentConflict(UUID commandId, String reason) {
        jdbc.update("""
                UPDATE transport_order_amendments
                SET status = 'CONFLICT',
                    error_reason = ?
                WHERE command_id = ? AND status IN ('PENDING','ATTENTION')
                """, reason == null ? "CONFLICT" : reason.substring(0, Math.min(reason.length(), 500)), commandId);
    }

    @Scheduled(fixedDelay = 20000)
    public void retryPendingAmendments() {
        jdbc.query("SELECT * FROM transport_order_amendments WHERE status='PENDING' AND (last_retry_at IS NULL OR last_retry_at<now()-interval '30 seconds') ORDER BY created_at LIMIT 50",
                (rs,row)->mapAmendment(rs)).forEach(this::process);
    }

    public AmendmentRecord retry(UUID actorId, UUID commandId) {
        var command = findByCommandId(commandId);
        if (command == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        var order=orders.findWithItemsById(command.orderId()).orElseThrow();var item=order.getItems().stream().filter(i->i.getId().equals(command.orderItemId())).findFirst().orElseThrow();
        authorizeActor(actorId, order, item.getTransportTripId());
        var ready = transactions.execute(status -> {
            entityManager.clear();
            var currentOrder = orders.findByIdForUpdate(command.orderId()).orElseThrow();
            var currentItem = currentOrder.getItems().stream()
                    .filter(i -> i.getId().equals(command.orderItemId())).findFirst().orElseThrow();
            var current = findByCommandId(commandId);
            if ("COMPLETED".equals(current.status())) return current;
            if (!Objects.equals(currentItem.getTransportTripId(), item.getTransportTripId()))
                throw conflict("Vé vừa đổi chuyến; cần xác thực lại quyền trên vé hiện tại");
            if (!"ACTIVE".equals(currentItem.getTransportItemState()) ||
                    !"ACTIVE".equals(currentItem.getTransportBoardingStatus()) ||
                    currentOrder.getStatus() != OrderStatus.CONFIRMED)
                throw conflict("Vé không còn đủ điều kiện sửa");
            var other = findPendingByItem(current.orderItemId());
            if (other != null && !other.commandId().equals(commandId))
                throw conflict("Vé đang có command khác chưa kết thúc");
            Integer operations = jdbc.queryForObject("select count(*) from transport_item_operations where item_id=? and state not in ('COMPLETED','ABORTED','ABORT_REFUND_PENDING')", Integer.class, current.orderItemId());
            Integer exchanges = jdbc.queryForObject("select count(*) from transport_exchange_cases where (old_order_id=? or new_order_id=?) and status not in ('COMPLETED','EXCEPTION_RESOLVED','REPLACEMENT_CANCELLED')", Integer.class, current.orderId(), current.orderId());
            if ((operations != null && operations > 0) || (exchanges != null && exchanges > 0))
                throw conflict("Vé đang hủy hoặc đổi; không mở lại amendment cũ");
            if ("CONFLICT".equals(current.status()) &&
                    !Objects.equals(currentItem.getTransportTicketRevision(), current.expectedRevision()))
                throw conflict("Revision đã thay đổi; cần tạo command mới thay vì sửa command cũ");
            jdbc.update("UPDATE transport_order_amendments SET status='PENDING',retry_count=0,last_retry_at=NULL,error_reason=NULL WHERE command_id=? AND status IN ('ATTENTION','CONFLICT')", commandId);
            return findByCommandId(commandId);
        });
        if ("PENDING".equals(ready.status())) process(ready);
        return findByCommandId(commandId);
    }

    private void incrementRetry(UUID commandId) {
        jdbc.update("""
                UPDATE transport_order_amendments
                SET status = CASE WHEN retry_count >= 9 THEN 'ATTENTION' ELSE status END,
                    retry_count = retry_count + 1,
                    last_retry_at = NOW()
                WHERE command_id = ? AND status = 'PENDING'
                """, commandId);
    }

    public List<AmendmentRecord> listAmendmentsByItem(UUID actorId, UUID orderId, UUID orderItemId) {
        var order = orders.findWithItemsById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng"));
        var item=order.getItems().stream().filter(i->i.getId().equals(orderItemId)).findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        authorizeActor(actorId, order, item.getTransportTripId());

        return jdbc.query("""
                SELECT command_id, order_id, order_item_id, actor_id, expected_revision,
                       new_revision, passenger_name, pickup_stop_id, dropoff_stop_id,
                       payload_hash, status, error_reason, created_at, applied_at, retry_count
                FROM transport_order_amendments
                WHERE order_item_id = ?
                ORDER BY created_at DESC
                """, (rs, row) -> mapAmendment(rs), orderItemId);
    }

    public List<AmendmentRecord> listAttentionAmendments(UUID actorId, UUID operatorId) {
        var response = car.readScope(actorId, operatorId);
        if (response == null || !response.isSuccess() || response.getData() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền truy cập nhà xe");
        }
        var scope = response.getData();

        if (scope.allTrips()) {
            return jdbc.query("""
                    SELECT a.command_id, a.order_id, a.order_item_id, a.actor_id, a.expected_revision,
                           a.new_revision, a.passenger_name, a.pickup_stop_id, a.dropoff_stop_id,
                           a.payload_hash, a.status, a.error_reason, a.created_at, a.applied_at, a.retry_count
                    FROM transport_order_amendments a
                    JOIN orders o ON o.id = a.order_id
                    WHERE o.host_id = ? AND a.status IN ('PENDING','CONFLICT','ATTENTION')
                    ORDER BY a.created_at DESC
                    LIMIT 100
                    """, (rs, row) -> mapAmendment(rs), scope.ownerUserId());
        } else {
            if (scope.allowedTripIds() == null || scope.allowedTripIds().isEmpty()) {
                return List.of();
            }
            return jdbc.query("""
                    SELECT a.command_id, a.order_id, a.order_item_id, a.actor_id, a.expected_revision,
                           a.new_revision, a.passenger_name, a.pickup_stop_id, a.dropoff_stop_id,
                           a.payload_hash, a.status, a.error_reason, a.created_at, a.applied_at, a.retry_count
                    FROM transport_order_amendments a
                    JOIN orders o ON o.id = a.order_id
                    JOIN order_items i ON i.id=a.order_item_id
                    WHERE o.host_id = ? AND i.transport_trip_id = ANY (?) AND a.status IN ('PENDING','CONFLICT','ATTENTION')
                    ORDER BY a.created_at DESC
                    LIMIT 100
                    """, (rs, row) -> mapAmendment(rs), scope.ownerUserId(), scope.allowedTripIds().toArray(new UUID[0]));
        }
    }

    private void authorizeActor(UUID actorId, Order order, UUID tripId) {
        if (Objects.equals(order.getUserId(), actorId)) {
            return;
        }
        var response = car.readScope(actorId, null);
        if (response == null || !response.isSuccess() || response.getData() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền sửa đơn hàng này");
        }
        var scope = response.getData();
        if (!Objects.equals(order.getHostId(), scope.ownerUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Đơn không thuộc nhà xe quản lý");
        }
        if (!scope.allTrips()) {
            if (tripId == null || scope.allowedTripIds() == null ||
                    !scope.allowedTripIds().contains(tripId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Đơn nằm ngoài danh sách chuyến được phân công");
            }
        }
        if (scope.allowedCapabilities() == null ||
                (!scope.allowedCapabilities().contains("CHECK_IN") &&
                 !scope.allowedCapabilities().contains("MANAGE_TRIP") &&
                 !scope.allowedCapabilities().contains("SELL_CASH"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nhân viên không có quyền thao tác trên vé");
        }
    }

    private AmendmentRecord findPendingByItem(UUID orderItemId) {
        return jdbc.query("""
                SELECT command_id, order_id, order_item_id, actor_id, expected_revision,
                       new_revision, passenger_name, pickup_stop_id, dropoff_stop_id,
                       payload_hash, status, error_reason, created_at, applied_at, retry_count
                FROM transport_order_amendments
                WHERE order_item_id = ? AND status IN ('PENDING','ATTENTION')
                ORDER BY created_at DESC
                LIMIT 1
                """, (rs, row) -> mapAmendment(rs), orderItemId).stream().findFirst().orElse(null);
    }

    private AmendmentRecord findByCommandId(UUID commandId) {
        return jdbc.query("""
                SELECT command_id, order_id, order_item_id, actor_id, expected_revision,
                       new_revision, passenger_name, pickup_stop_id, dropoff_stop_id,
                       payload_hash, status, error_reason, created_at, applied_at, retry_count
                FROM transport_order_amendments
                WHERE command_id = ?
                """, (rs, row) -> mapAmendment(rs), commandId).stream().findFirst().orElse(null);
    }

    private AmendmentRecord mapAmendment(java.sql.ResultSet rs) throws java.sql.SQLException {
        Timestamp applied = rs.getTimestamp("applied_at");
        int newRev = rs.getInt("new_revision");
        Integer nullableRevision = rs.wasNull() ? null : newRev;
        return new AmendmentRecord(
                rs.getObject("command_id", UUID.class),
                rs.getObject("order_id", UUID.class),
                rs.getObject("order_item_id", UUID.class),
                rs.getObject("actor_id", UUID.class),
                rs.getInt("expected_revision"),
                nullableRevision,
                rs.getString("passenger_name"),
                rs.getObject("pickup_stop_id", UUID.class),
                rs.getObject("dropoff_stop_id", UUID.class),
                rs.getString("payload_hash"),
                rs.getString("status"),
                rs.getString("error_reason"),
                rs.getTimestamp("created_at").toInstant(),
                applied == null ? null : applied.toInstant(),
                rs.getInt("retry_count")
        );
    }

    private String computePayloadHash(UUID orderId, UUID orderItemId, UUID ticketId,
                                      String passengerName, UUID pickupStopId, UUID dropoffStopId) {
        String canonical = orderId + ":" + orderItemId + ":" + ticketId + ":" + passengerName + ":" + pickupStopId + ":" + dropoffStopId;
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(canonical.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
