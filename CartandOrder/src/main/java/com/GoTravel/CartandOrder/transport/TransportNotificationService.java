package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.client.CommunicationClient;
import com.GoTravel.CartandOrder.entity.Order;
import com.GoTravel.CartandOrder.enums.OrderStatus;
import com.GoTravel.CartandOrder.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/** At-least-once delivery; failures remain visible for an operator to retry. */
@Service
@RequiredArgsConstructor
@Slf4j
public class TransportNotificationService {
    private final JdbcTemplate jdbc;
    private final OrderRepository orders;
    private final CommunicationClient communication;
    private final TransactionTemplate transactions;
    @Value("${transport.frontend-base-url:http://localhost:3334}") private String frontendUrl;
    private record Job(UUID id, UUID orderId, String kind, int attempts, long leaseVersion, String eventKey) {}
    public record Ticket(UUID ticketId, String passengerName, String seatCode, String routeTitle,
                         LocalDateTime departureAt, String checkInToken, @com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal fareAmount) {}
    public record Mail(UUID eventId, String kind, String to, String customerName, UUID orderId,
                       String orderNumber, @com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal totalAmount, @com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal refundAmount,
                       String reason, String orderUrl, List<Ticket> tickets) {}

    public static void enqueue(JdbcTemplate jdbc, Order order, String kind) {
        enqueue(jdbc, order, kind, "legacy");
    }
    public static void enqueue(JdbcTemplate jdbc, Order order, String kind, String eventKey) {
        jdbc.update("insert into transport_notification_outbox(id,order_id,kind,event_key) values (?,?,?,?) " +
                "on conflict (order_id,kind,event_key) do nothing", UUID.randomUUID(), order.getId(), kind, eventKey);
    }

    @org.springframework.transaction.annotation.Transactional
    public void requestResend(UUID buyerId, UUID orderId) {
        var order = orders.findByIdForUpdate(orderId).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND));
        if (!Objects.equals(buyerId, order.getUserId()) || order.getOrderKind() != com.GoTravel.CartandOrder.enums.OrderKind.GOCAR_TICKET)
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND);
        if (!List.of(OrderStatus.CONFIRMED, OrderStatus.COMPLETED).contains(order.getStatus()) ||
                order.getCustomerInfo() == null || order.getCustomerInfo().getEmail() == null || order.getCustomerInfo().getEmail().isBlank())
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Đơn chưa có vé/email hợp lệ");
        enqueue(jdbc, order, "TICKET");
        var current = jdbc.queryForMap("select status,last_requested_at from transport_notification_outbox where order_id=? and kind='TICKET' and event_key='legacy' for update", orderId);
        if (List.of("PENDING", "SENDING").contains(current.get("status"))) return;
        int changed = jdbc.update("update transport_notification_outbox set status='PENDING',attempts=0,next_attempt_at=now(),lease_until=null,last_error=null,last_requested_at=now() " +
                "where order_id=? and kind='TICKET' and event_key='legacy' and (last_requested_at is null or last_requested_at < now()-interval '60 seconds')", orderId);
        if (changed == 0) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS, "Vui lòng chờ 60 giây trước khi gửi lại");
        order.setTicketEmailSent(false); orders.save(order);
    }

    @Scheduled(fixedDelay = 30000)
    public void deliver() {
        jdbc.update("update transport_notification_outbox set status='FAILED',lease_until=null,last_error='LEASE_EXPIRED' " +
                "where status='SENDING' and lease_until<now() and attempts>=10");
        List<Job> jobs = transactions.execute(status -> jdbc.query("""
            update transport_notification_outbox set status='SENDING',attempts=attempts+1,
                   lease_until=now()+interval '2 minutes',lease_version=lease_version+1
            where id in (select id from transport_notification_outbox
                where ((status='PENDING' and next_attempt_at<=now())
                   or (status='SENDING' and lease_until<now()))
                and attempts<10 order by created_at for update skip locked limit 20)
            returning id,order_id,kind,attempts,lease_version,event_key
            """, (rs, row) -> new Job(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class),
                rs.getString(3), rs.getInt(4), rs.getLong(5),rs.getString(6))));
        if (jobs == null) return;
        for (Job job : jobs) {
            try {
                Mail mail = transactions.execute(status -> {
                    var order = orders.findById(job.orderId()).orElseThrow();
                    var info = order.getCustomerInfo();
                    if (info == null || info.getEmail() == null || info.getEmail().isBlank()) return null;
                    if ("TICKET".equals(job.kind()) && !List.of(OrderStatus.CONFIRMED, OrderStatus.COMPLETED).contains(order.getStatus())) return null;
                    BigDecimal refundAmount=order.getTransportRefundDue();
                    UUID affectedItem=null;
                    if(!"legacy".equals(job.eventKey())) {
                        try {
                            UUID event=UUID.fromString(job.eventKey());
                            var op=jdbc.queryForList("select item_id,cast(plan_json as jsonb)->>'refundDue' as refund_due from transport_item_operations where id=?",event);
                            if(!op.isEmpty()){affectedItem=(UUID)op.get(0).get("item_id");refundAmount=new BigDecimal((String)op.get(0).get("refund_due"));}
                            var refund=jdbc.queryForList("select amount from transport_operation_refund_proofs where operation_id=?",event);
                            if(!refund.isEmpty())refundAmount=(BigDecimal)refund.get(0).get("amount");
                        }catch(IllegalArgumentException notOperation){}
                    }
                    UUID eventItem=affectedItem;
                    return new Mail(job.id(), job.kind(), info.getEmail(), info.getFullName(), order.getId(),
                            order.getOrderNumber(), order.getTotalAmount(), refundAmount,
                            order.getTransportCancellationReason(), frontendUrl.replaceAll("/+$", "") +
                            "/orders/" + order.getId(), order.getItems().stream().filter(item -> eventItem==null||eventItem.equals(item.getId())).filter(item -> !"TICKET".equals(job.kind()) || java.util.List.of("ACTIVE","COMPLETED").contains(item.getTransportItemState())).map(item -> new Ticket(
                                item.getTransportTicketId(), item.getPassengerName(), item.getTransportSeatCode(),
                                item.getListingTitle(), item.getTransportDepartureAt()==null?order.getTransportDepartureAt():item.getTransportDepartureAt(),
                                "TICKET".equals(job.kind()) ? item.getTransportCheckInToken() : null,item.getTotalPrice())).toList());
                });
                if (mail == null) {
                    jdbc.update("update transport_notification_outbox set status='SKIPPED',lease_until=null where id=? and status='SENDING' and lease_version=? and lease_until>now()", job.id(), job.leaseVersion());
                    continue;
                }
                var result = communication.sendTransportEmail(mail);
                if (result == null || !result.isSuccess()) throw new IllegalStateException("Communication did not acknowledge");
                transactions.executeWithoutResult(status -> {
                    int acknowledged = jdbc.update("update transport_notification_outbox set status='DELIVERED',delivered_at=now(),lease_until=null,last_error=null where id=? and status='SENDING' and lease_version=? and lease_until>now()", job.id(), job.leaseVersion());
                    if (acknowledged == 1 && "TICKET".equals(job.kind())) {
                        var order = orders.findByIdForUpdate(job.orderId()).orElseThrow();
                        order.setTicketEmailSent(true); order.setTicketEmailRecipient(mail.to());
                        order.setTicketEmailAttempts(job.attempts()); order.setTicketEmailSentAt(LocalDateTime.now());
                        orders.save(order);
                    }
                });
            } catch (Exception error) {
                jdbc.update("update transport_notification_outbox set status=?,lease_until=null,last_error=?," +
                        "next_attempt_at=now()+(? * interval '1 second') where id=? and status='SENDING' and lease_version=? and lease_until>now()",
                        job.attempts() >= 10 ? "FAILED" : "PENDING", error.getClass().getSimpleName(),
                        Math.min(3600, 30L << Math.min(job.attempts(), 6)), job.id(), job.leaseVersion());
                log.warn("Transport mail {} retained for retry", job.id());
            }
        }
    }

    public List<Map<String, Object>> pending() {
        return jdbc.queryForList("select id,order_id,kind,status,attempts,last_error,next_attempt_at from transport_notification_outbox " +
                "where status in ('FAILED','PENDING','SENDING') order by created_at limit 200");
    }
    public void retry(UUID eventId) {
        jdbc.update("update transport_notification_outbox set status='PENDING',attempts=0,next_attempt_at=now(),last_error=null " +
                "where id=? and status='FAILED'", eventId);
    }
}
