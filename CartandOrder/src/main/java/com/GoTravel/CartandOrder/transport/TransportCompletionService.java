package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.enums.OrderKind;
import com.GoTravel.CartandOrder.enums.OrderStatus;
import com.GoTravel.CartandOrder.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class TransportCompletionService {
    private final GoCarClient car;
    private final OrderRepository orders;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;

    public void complete(UUID tripId) {
        var response = car.tripState(tripId);
        var trip = response == null ? null : response.getData();
        if (trip == null || !tripId.equals(trip.tripId()) || !"COMPLETED".equals(trip.status()) ||
                trip.arrivalAt() == null || trip.arrivalAt().isAfter(Instant.now()) || trip.tickets() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "GoCar chưa xác nhận hoàn thành chuyến");
        }
        var tickets = new HashMap<UUID, GoCarClient.ManifestTicket>();
        for (var ticket : trip.tickets()) {
            if (tickets.put(ticket.orderItemId(), ticket) != null)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Trùng vé trong manifest");
        }
        List<UUID> ids = jdbc.query("select id from orders where order_kind='GOCAR_TICKET' and exists(select 1 from order_items i where i.order_id=orders.id and i.transport_trip_id=?) order by id",
                (rs, row) -> rs.getObject(1, UUID.class), tripId);
        for (UUID id : ids) transactions.executeWithoutResult(status -> {
            var order = orders.findByIdForUpdate(id).orElseThrow();
            if (order.getOrderKind() != OrderKind.GOCAR_TICKET) return;
            if (List.of(OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.REFUND_PENDING,
                    OrderStatus.COMPLETED, OrderStatus.PAID_REVIEW).contains(order.getStatus())) return;
            if (order.getStatus() != OrderStatus.CONFIRMED)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn của chuyến chưa kết thúc xử lý");
            Integer pendingExchanges = jdbc.queryForObject(
                    "select count(*) from transport_exchange_cases where (old_order_id = ? or new_order_id = ?) and status not in ('COMPLETED', 'EXCEPTION_RESOLVED', 'REPLACEMENT_CANCELLED')",
                    Integer.class, id, id);
            if (pendingExchanges != null && pendingExchanges > 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn đang có yêu cầu đổi vé chưa kết thúc");
            }
            Integer itemOperations = jdbc.queryForObject("select count(*) from transport_item_operations where order_id=? and state not in ('COMPLETED','ABORTED')",Integer.class,id);
            if(itemOperations!=null&&itemOperations>0)throw new ResponseStatusException(HttpStatus.CONFLICT,"Đơn còn operation/hoàn chênh lệch chưa kết thúc");
            Integer amendments = jdbc.queryForObject("select count(*) from transport_order_amendments where order_id=? and status in ('PENDING','ATTENTION')", Integer.class, id);
            if (amendments != null && amendments > 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn còn amendment cần xử lý");
            for (var item : order.getItems()) {
                if(!tripId.equals(item.getTransportTripId()) || List.of("VOID","REFUND_PENDING","REFUNDED","COMPLETED").contains(item.getTransportItemState()))continue;
                if("OPERATION_PENDING".equals(item.getTransportItemState()))throw new ResponseStatusException(HttpStatus.CONFLICT,"Item operation chưa kết thúc");
                var ticket = tickets.get(item.getId());
                if (ticket == null || !id.equals(ticket.orderId()) ||
                        !Objects.equals(item.getTransportTicketId(), ticket.ticketId()) ||
                        !Objects.equals(item.getTransportSeatId(), ticket.seatId()) || !Objects.equals(item.getTransportTicketRevision(),ticket.revision()) ||
                        !List.of("CHECKED_IN", "NO_SHOW").contains(ticket.status())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Vé chưa kết thúc boarding");
                }
                item.setTransportBoardingStatus(ticket.status());
                item.setTransportItemState("COMPLETED");
            }
            if(order.getItems().stream().noneMatch(i->List.of("ACTIVE","OPERATION_PENDING","REFUND_PENDING").contains(i.getTransportItemState()))) order.setStatus(OrderStatus.COMPLETED);
            orders.save(order);
        });
    }
}
