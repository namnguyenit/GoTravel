package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TripCancellationService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final TransportOrderService orders;
    private final TransportInventoryClient inventory;

    public record Progress(UUID tripId, String status, boolean safeToCancel,
                           boolean completed, int pendingOrders, int pendingRefunds,
                           String lastError) {}

    public Progress request(UUID tripId, String reason) {
        if (tripId == null || reason == null || reason.isBlank() || reason.length() > 500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lý do hủy chuyến không hợp lệ");
        String normalized = reason.trim();
        transactions.executeWithoutResult(status -> {
            jdbc.execute("select pg_advisory_xact_lock(74100101)");
            jdbc.update("update transport_exchange_cases e set status='REPLACEMENT_CANCELLED',last_error='REPLACEMENT_TRIP_CANCELLED',updated_at=now() " +
                    "from orders n where e.new_order_id=n.id and n.transport_trip_id=? and e.status not in ('COMPLETED','EXCEPTION_RESOLVED')", tripId);
            jdbc.update("update transport_item_operations set state='ABORTING',next_attempt_at=now(),updated_at=now() where kind='EXCHANGE' and (cast(plan_json as jsonb)->>'newTripId')=? and state in ('PREPARED','HELD','WAITING_FUNDS')",tripId.toString());
            jdbc.update("insert into transport_trip_cancellations(trip_id,reason) values (?,?) " +
                    "on conflict (trip_id) do nothing", tripId, normalized);
        });
        var saved = jdbc.queryForObject("select reason from transport_trip_cancellations where trip_id=?",
                String.class, tripId);
        if (!normalized.equals(saved))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chuyến đã có yêu cầu hủy khác");
        return progress(tripId);
    }

    public Progress progress(UUID tripId) {
        return jdbc.query("select status,pending_orders,pending_refunds,last_error " +
                        "from transport_trip_cancellations where trip_id=?",
                (rs, row) -> {
                    String status = rs.getString(1);
                    return new Progress(tripId, status, !"PROCESSING".equals(status),
                            "COMPLETED".equals(status), rs.getInt(2), rs.getInt(3), rs.getString(4));
                }, tripId).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @Scheduled(fixedDelay = 30000)
    public void reconcile() {
        List<UUID> trips = jdbc.query("select trip_id from transport_trip_cancellations " +
                        "where status <> 'COMPLETED' order by updated_at limit 50",
                (rs, row) -> rs.getObject(1, UUID.class));
        for (UUID tripId : trips) {
            try {
                process(tripId);
            } catch (Exception error) {
                log.warn("Trip cancellation {} pending", tripId, error);
                jdbc.update("update transport_trip_cancellations set last_error=?,updated_at=now() where trip_id=?",
                        error.getClass().getSimpleName(), tripId);
            }
        }
    }

    public Progress process(UUID tripId) {
        var reason = jdbc.queryForObject("select reason from transport_trip_cancellations where trip_id=?",
                String.class, tripId);
        // A trip has at most 100 saleable seats, while prior expired orders are already terminal.
        var activeIds = jdbc.query("select id from orders where order_kind='GOCAR_TICKET' " +
                        "and exists(select 1 from order_items i where i.order_id=orders.id and i.transport_trip_id=?) and status not in ('CANCELLED','REFUNDED','REFUND_PENDING') " +
                        "order by created_at,id",
                (rs, row) -> rs.getObject(1, UUID.class), tripId);
        String lastError = null;
        for (UUID orderId : activeIds) {
            try {
                orders.cancelForTrip(orderId, tripId, reason);
            } catch (Exception error) {
                lastError = "Order " + orderId + ": " + error.getClass().getSimpleName();
                log.warn("Trip {} order {} cancellation pending", tripId, orderId, error);
            }
        }
        Integer pending = jdbc.queryForObject("select count(*) from orders where order_kind='GOCAR_TICKET' " +
                "and exists(select 1 from order_items i where i.order_id=orders.id and i.transport_trip_id=?) and status not in ('CANCELLED','REFUNDED','REFUND_PENDING')",
                Integer.class, tripId);
        Integer pendingRefunds = jdbc.queryForObject("select count(*) from orders where order_kind='GOCAR_TICKET' " +
                "and exists(select 1 from order_items i where i.order_id=orders.id and i.transport_trip_id=?) and status='REFUND_PENDING'", Integer.class, tripId);
        ApiResponse<List<TransportInventoryClient.SeatView>> response = inventory.seats(tripId);
        var seats = response == null ? null : response.getData();
        if (seats == null || seats.isEmpty())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chưa đối chiếu được tồn ghế chuyến");
        boolean busy = seats.stream().anyMatch(seat -> seat.status() == null ||
                !List.of("AVAILABLE", "BLOCKED").contains(seat.status()));
        pending = jdbc.queryForObject("select count(*) from order_items i join orders o on o.id=i.order_id where o.order_kind='GOCAR_TICKET' and i.transport_trip_id=? and o.status not in ('CANCELLED','REFUNDED','REFUND_PENDING') and i.transport_item_state in ('ACTIVE','OPERATION_PENDING')",Integer.class,tripId);
        pendingRefunds = jdbc.queryForObject("select (select count(*) from transport_item_operations where state in ('REFUND_PENDING','ABORT_REFUND_PENDING') and ((cast(plan_json as jsonb)->>'oldTripId')=? or (cast(plan_json as jsonb)->>'newTripId')=?))+(select count(*) from orders o where o.order_kind='GOCAR_TICKET' and o.transport_trip_id=? and o.status='REFUND_PENDING' and not exists(select 1 from transport_item_operations x where x.order_id=o.id))",Integer.class,tripId.toString(),tripId.toString(),tripId);
        Integer legacy=jdbc.queryForObject("select count(*) from orders where order_kind='GOCAR_TICKET' and transport_trip_id=? and status not in ('CANCELLED','REFUNDED','REFUND_PENDING','CONFIRMED','COMPLETED')",Integer.class,tripId);
        pending += legacy;
        boolean safe = pending == 0 && !busy;
        boolean complete = safe && pendingRefunds == 0;
        String status = complete ? "COMPLETED" : safe ? "REFUND_PENDING" : "PROCESSING";
        jdbc.update("update transport_trip_cancellations set status=?,pending_orders=?," +
                        "pending_refunds=?,last_error=?,updated_at=now() where trip_id=?",
                status, pending, pendingRefunds, lastError, tripId);
        return new Progress(tripId, status, safe, complete, pending, pendingRefunds, lastError);
    }
}
