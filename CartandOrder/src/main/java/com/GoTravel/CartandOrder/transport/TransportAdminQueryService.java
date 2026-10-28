package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.entity.Order;
import com.GoTravel.CartandOrder.enums.OrderKind;
import com.GoTravel.CartandOrder.enums.OrderStatus;
import com.GoTravel.CartandOrder.mapper.OrderMapper;
import com.GoTravel.CartandOrder.dto.response.OrderResponse;
import com.GoTravel.CartandOrder.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.*;

/** Transport-only read model. Filters and totals are applied before pagination. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransportAdminQueryService {
    private final OrderRepository orders;
    private final OrderMapper mapper;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;
    public static final List<OrderStatus> PROCESSING = List.of(OrderStatus.FULFILLMENT_PENDING,
            OrderStatus.CANCELLATION_PENDING, OrderStatus.CASH_RECEIVED_PENDING_RECONCILIATION);
    private Specification<Order> scope() { return (r,q,b) -> b.equal(r.get("orderKind"), OrderKind.GOCAR_TICKET); }
    private jakarta.persistence.criteria.Predicate pendingItemRefund(jakarta.persistence.criteria.CriteriaBuilder b,jakarta.persistence.criteria.Root<Order> r) {
        return b.isTrue(((org.hibernate.query.criteria.HibernateCriteriaBuilder)b).sql("exists (select 1 from transport_item_operations refund_op where refund_op.order_id=? and refund_op.state in ('REFUND_PENDING','ABORT_REFUND_PENDING'))",Boolean.class,r.get("id")));
    }
    private Specification<Order> group(String group) {
        return (r,q,b) -> switch (group) {
            case "ALL" -> b.conjunction();
            case "ATTENTION" -> b.or(pendingItemRefund(b,r),r.get("status").in(OrderStatus.PAID_REVIEW, OrderStatus.REFUND_PENDING),
                    b.and(r.get("status").in(PROCESSING), b.lessThanOrEqualTo(r.get("updatedAt"), LocalDateTime.now().minusMinutes(5))));
            case "REFUNDS" -> b.or(pendingItemRefund(b,r),r.get("status").in(OrderStatus.PAID_REVIEW, OrderStatus.REFUND_PENDING));
            case "UNPAID" -> r.get("status").in(OrderStatus.PENDING, OrderStatus.PAYMENT_PENDING, OrderStatus.CASH_PENDING);
            case "PROCESSING" -> r.get("status").in(PROCESSING);
            case "ISSUED" -> r.get("status").in(OrderStatus.CONFIRMED, OrderStatus.COMPLETED);
            case "CANCELLED" -> b.equal(r.get("status"), OrderStatus.CANCELLED);
            case "REFUNDED" -> b.equal(r.get("status"), OrderStatus.REFUNDED);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nhóm đơn không hợp lệ");
        };
    }
    public Page<OrderResponse> list(String view, String search, Pageable pageable) {
        var spec = scope().and(group(view));
        if (search != null && !search.isBlank()) {
            String keyword = search.trim().toLowerCase(Locale.ROOT);
            if (keyword.length() > 120) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Từ khóa quá dài");
            String pattern = "%" + keyword.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
            spec = spec.and((r,q,b) -> b.or(
                    b.like(b.lower(r.get("orderNumber")), pattern, '!'),
                    b.like(b.lower(((org.hibernate.query.criteria.JpaExpression<UUID>)r.<UUID>get("id")).cast(String.class)), pattern, '!'),
                    b.like(b.lower(b.function("jsonb_extract_path_text", String.class, r.get("customerInfo"), b.literal("fullName"))), pattern, '!'),
                    b.like(b.lower(b.function("jsonb_extract_path_text", String.class, r.get("customerInfo"), b.literal("email"))), pattern, '!')));
        }
        var bounded = PageRequest.of(Math.max(0, pageable.getPageNumber()), Math.min(100, Math.max(1, pageable.getPageSize())),
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        var result = orders.findAll(spec, bounded).map(mapper::toOrderResponse);
        if (!result.isEmpty()) {
            var ids = result.getContent().stream().map(OrderResponse::getOrderId).toList();
            var named = new org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate(jdbc);
            var rows = named.queryForList("select order_id,count(*) n,min(id::text) operation_id,sum(case when state='ABORT_REFUND_PENDING' then (plan_json::jsonb->>'topup')::numeric else (plan_json::jsonb->>'refundDue')::numeric end) amount from transport_item_operations where order_id in (:ids) and state in ('REFUND_PENDING','ABORT_REFUND_PENDING') group by order_id", Map.of("ids",ids));
            var byOrder = new HashMap<UUID,Map<String,Object>>();
            rows.forEach(row -> byOrder.put((UUID)row.get("order_id"),row));
            for (var order : result) {
                var row=byOrder.get(order.getOrderId());
                order.setTransportPendingItemRefundDue(row==null?java.math.BigDecimal.ZERO:(java.math.BigDecimal)row.get("amount"));
                int count=row==null?0:((Number)row.get("n")).intValue();
                order.setTransportPendingItemRefundCount(count);
                if(count==1)order.setTransportPendingItemRefundOperationId(UUID.fromString((String)row.get("operation_id")));
            }
        }
        return result;
    }
    public Map<String, Long> summary() {
        var result = new LinkedHashMap<String,Long>();
        for (String group : List.of("ALL", "ATTENTION", "UNPAID", "PROCESSING", "ISSUED", "CANCELLED", "REFUNDED")) {
            result.put(group, orders.count(scope().and(group(group))));
        }
        return result;
    }
}
