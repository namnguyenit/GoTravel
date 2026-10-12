package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.client.PaymentClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** Operational sales/refund totals; bank balance remains owned by GoPay. */
@Slf4j
@Service
@RequiredArgsConstructor
public class TransportOperationsReportService {
    private final NamedParameterJdbcTemplate jdbc;
    private final GoCarClient goCarClient;
    private final PaymentClient paymentClient;

    @Transactional(readOnly = true)
    public Map<String, Object> report(UUID operatorUserId, LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > 365)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoảng báo cáo tối đa 366 ngày");
        var args = new MapSqlParameterSource("owner", operatorUserId)
                .addValue("from", from.atStartOfDay()).addValue("until", to.plusDays(1).atStartOfDay())
                .addValue("instantFrom", from.atStartOfDay(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime())
                .addValue("instantUntil", to.plusDays(1).atStartOfDay(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime());
        var result = new LinkedHashMap<String, Object>();
        result.put("from", from);
        result.put("to", to);
        result.put("timezone", "Asia/Ho_Chi_Minh");
        result.put("orders", jdbc.queryForList("""
            select payment_method, status, count(*) as order_count,
                   coalesce(sum(total_amount), 0) as booked_amount,
                   coalesce(sum(transport_refund_due), 0) as refund_due
            from orders where order_kind='GOCAR_TICKET' and host_id=:owner
               and created_at>=:from and created_at<:until group by payment_method, status
            order by payment_method, status
            """, args));
        result.put("cashReceived", jdbc.queryForMap("""
            select count(*) as receipt_count, coalesce(sum(r.amount), 0) as amount
            from transport_cash_receipts r join orders o on o.id=r.order_id
            where o.host_id=:owner and r.received_at>=:instantFrom and r.received_at<:instantUntil
            """, args));
        result.put("refundsConfirmed", jdbc.queryForList("""
            select p.payment_method, count(*) as refund_count, coalesce(sum(p.amount), 0) as amount
            from transport_refund_confirmations p join orders o on o.id=p.order_id
            where o.host_id=:owner and p.recorded_at>=:instantFrom and p.recorded_at<:instantUntil
            group by p.payment_method
            """, args));
        result.put("openDiscrepancies", jdbc.queryForList("""
            select f.issue_code, count(*) as issue_count from transport_reconciliation_findings f
            join orders o on o.id=f.order_id where o.host_id=:owner and f.status='OPEN'
            group by f.issue_code order by f.issue_code
            """, args));
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> vendorReport(UUID actorId, UUID operatorId, LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > 365)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoảng báo cáo tối đa 366 ngày");

        var scopeResp = goCarClient.readScope(actorId, operatorId);
        if (scopeResp == null || scopeResp.getData() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không thể xác thực quyền truy cập nhà xe");
        }
        var scope = scopeResp.getData();
        boolean isOwner = scope.ownerUserId() != null && scope.ownerUserId().equals(actorId);
        boolean hasCashView = scope.allowedCapabilities() != null && scope.allowedCapabilities().contains("CASH_VIEW");
        if (!isOwner && !hasCashView) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền xem báo cáo tài chính/vận hành nhà xe");
        }

        UUID ownerUserId = scope.ownerUserId();
        var args = new MapSqlParameterSource("owner", ownerUserId)
                .addValue("from", from.atStartOfDay())
                .addValue("until", to.plusDays(1).atStartOfDay())
                .addValue("instantFrom", from.atStartOfDay(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime())
                .addValue("instantUntil", to.plusDays(1).atStartOfDay(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime());

        String tripFilter = "";
        if (!scope.allTrips()) {
            if (scope.allowedTripIds() == null || scope.allowedTripIds().isEmpty()) {
                tripFilter = " and 1 = 0 ";
            } else {
                tripFilter = " and exists(select 1 from order_items scoped where scoped.order_id=o.id and scoped.transport_trip_id IN (:tripIds)) ";
                args.addValue("tripIds", scope.allowedTripIds());
            }
        }

        var result = new LinkedHashMap<String, Object>();
        result.put("operatorId", scope.operatorId());
        result.put("ownerUserId", ownerUserId);
        result.put("from", from);
        result.put("to", to);
        result.put("timezone", "Asia/Ho_Chi_Minh");
        result.put("allTripsScope", scope.allTrips());

        result.put("orders", jdbc.queryForList("""
            select payment_method, status, count(*) as order_count,
                   coalesce(sum(total_amount), 0) as booked_amount,
                   coalesce(sum(transport_refund_due), 0) as refund_due
            from orders o
            where o.order_kind = 'GOCAR_TICKET' and o.host_id = :owner
              and o.created_at >= :from and o.created_at < :until
            """ + tripFilter + """
            group by payment_method, status
            order by payment_method, status
            """, args));

        result.put("ticketItems", jdbc.queryForList("""
            select i.transport_boarding_status, count(*) as ticket_count,
                   coalesce(sum(i.total_price), 0) as ticket_total
            from order_items i
            join orders o on o.id = i.order_id
            where o.order_kind = 'GOCAR_TICKET' and o.host_id = :owner
              and o.created_at >= :from and o.created_at < :until
            """ + tripFilter + """
            group by i.transport_boarding_status
            order by i.transport_boarding_status
            """, args));

        result.put("cashReceived", jdbc.queryForMap("""
            select count(*) as receipt_count, coalesce(sum(r.amount), 0) as amount
            from transport_cash_receipts r
            join orders o on o.id = r.order_id
            where o.host_id = :owner
              and r.received_at >= :instantFrom and r.received_at < :instantUntil
            """ + tripFilter, args));

        result.put("refundsConfirmed", jdbc.queryForList("""
            select p.payment_method, count(*) as refund_count, coalesce(sum(p.amount), 0) as amount
            from transport_refund_confirmations p
            join orders o on o.id = p.order_id
            where o.host_id = :owner
              and p.recorded_at >= :instantFrom and p.recorded_at < :instantUntil
            """ + tripFilter + """
            group by p.payment_method
            """, args));

        result.put("openDiscrepancies", jdbc.queryForList("""
            select f.issue_code, count(*) as issue_count
            from transport_reconciliation_findings f
            join orders o on o.id = f.order_id
            where o.host_id = :owner and f.status = 'OPEN'
            """ + tripFilter + """
            group by f.issue_code order by f.issue_code
            """, args));

        if(!scope.allTrips()) {
            String selected=scope.allowedTripIds()==null||scope.allowedTripIds().isEmpty()?" and 1=0":" and i.transport_trip_id in (:tripIds)";
            args.addValue("tripIds",scope.allowedTripIds()==null?List.of():scope.allowedTripIds());
            result.put("orders",jdbc.queryForList("select o.payment_method,o.status,count(distinct o.id) as order_count,coalesce(sum(i.total_price),0) as booked_amount from orders o join order_items i on i.order_id=o.id where o.order_kind='GOCAR_TICKET' and o.host_id=:owner and o.created_at>=:from and o.created_at<:until"+selected+" group by o.payment_method,o.status",args));
            result.put("ticketItems",jdbc.queryForList("select i.transport_boarding_status,count(*) as ticket_count,coalesce(sum(i.total_price),0) as ticket_total from order_items i join orders o on o.id=i.order_id where o.order_kind='GOCAR_TICKET' and o.host_id=:owner and o.created_at>=:from and o.created_at<:until"+selected+" group by i.transport_boarding_status",args));
            result.put("cashReceived",jdbc.queryForMap("select count(distinct r.id) as receipt_count,coalesce(sum(i.transport_original_amount),0) as allocated_amount from transport_cash_receipts r join orders o on o.id=r.order_id join order_items i on i.order_id=o.id where o.host_id=:owner and r.received_at>=:instantFrom and r.received_at<:instantUntil"+selected,args));
            result.put("refundsConfirmed",jdbc.queryForList("select o.payment_method,count(*) as refund_count,coalesce(sum(p.amount),0) as amount from transport_operation_refund_proofs p join transport_item_operations x on x.id=p.operation_id join orders o on o.id=x.order_id join order_items i on i.id=x.item_id where o.host_id=:owner and p.recorded_at>=:instantFrom and p.recorded_at<:instantUntil"+selected+" group by o.payment_method",args));
        }
        String operationFilter=scope.allTrips()?"":scope.allowedTripIds()==null||scope.allowedTripIds().isEmpty()?" and 1=0":" and x.item_id in (select id from order_items where transport_trip_id in (:tripIds))";
        result.put("cashTopups",jdbc.queryForMap("select count(*) as receipt_count,coalesce(sum(p.amount),0) as amount from transport_operation_cash_proofs p join transport_item_operations x on x.id=p.operation_id join orders o on o.id=x.order_id where o.host_id=:owner and p.received_at>=:instantFrom and p.received_at<:instantUntil"+operationFilter,args));
        result.put("itemRefundsConfirmed",jdbc.queryForMap("select count(*) as refund_count,coalesce(sum(p.amount),0) as amount from transport_operation_refund_proofs p join transport_item_operations x on x.id=p.operation_id join orders o on o.id=x.order_id where o.host_id=:owner and p.recorded_at>=:instantFrom and p.recorded_at<:instantUntil"+operationFilter,args));
        result.put("itemOperations",jdbc.queryForList("select x.state,x.kind,count(*) as operation_count from transport_item_operations x join orders o on o.id=x.order_id where o.host_id=:owner and x.created_at>=:instantFrom and x.created_at<:instantUntil"+operationFilter+" group by x.state,x.kind",args));
        if (scope.allTrips()) {
            try {
                var funds=paymentClient.getTransportFundsReport(ownerUserId,from,to);
                if(funds==null||!funds.isSuccess()||funds.getData()==null)throw new IllegalStateException("GoPay funds report unavailable");
                result.put("gopayFunds",funds.getData());result.put("gopayAvailable",true);
                var gopayResp = paymentClient.getCashSettlementSummary(scope.operatorId());
                if (gopayResp != null && gopayResp.getData() != null) {
                    result.put("gopaySettlementSummary", gopayResp.getData());
                }
            } catch (Exception ex) {
                log.warn("Could not query GoPay settlement summary for operator {}: {}", scope.operatorId(), ex.getMessage());
                result.put("gopayAvailable",false);
                result.put("gopaySettlementSummary", null);
            }
        }

        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> adminOverviewReport(LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > 365)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoảng báo cáo tối đa 366 ngày");

        var args = new MapSqlParameterSource()
                .addValue("from", from.atStartOfDay())
                .addValue("until", to.plusDays(1).atStartOfDay())
                .addValue("instantFrom", from.atStartOfDay(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime())
                .addValue("instantUntil", to.plusDays(1).atStartOfDay(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime());

        var result = new LinkedHashMap<String, Object>();
        result.put("from", from);
        result.put("to", to);
        result.put("timezone", "Asia/Ho_Chi_Minh");

        result.put("ordersByMethodAndStatus", jdbc.queryForList("""
            select payment_method, status, count(*) as order_count,
                   coalesce(sum(total_amount), 0) as booked_amount,
                   coalesce(sum(transport_refund_due), 0) as refund_due
            from orders
            where order_kind = 'GOCAR_TICKET'
              and created_at >= :from and created_at < :until
            group by payment_method, status
            order by payment_method, status
            """, args));

        result.put("cashReceived", jdbc.queryForMap("""
            select count(*) as receipt_count, coalesce(sum(amount), 0) as amount
            from transport_cash_receipts
            where received_at >= :instantFrom and received_at < :instantUntil
            """, args));

        result.put("refundsConfirmed", jdbc.queryForList("""
            select payment_method, count(*) as refund_count, coalesce(sum(amount), 0) as amount
            from transport_refund_confirmations
            where recorded_at >= :instantFrom and recorded_at < :instantUntil
            group by payment_method
            """, args));

        result.put("openDiscrepancies", jdbc.queryForList("""
            select issue_code, count(*) as issue_count
            from transport_reconciliation_findings
            where status = 'OPEN'
            group by issue_code order by issue_code
            """, args));

        result.put("topVendors", jdbc.queryForList("""
            select o.host_id as vendor_user_id,
                   count(distinct o.id) as order_count,
                   coalesce(sum(items.ticket_count),0) as ticket_count,
                   coalesce(sum(case when o.status in ('CONFIRMED', 'COMPLETED') then o.total_amount else 0 end), 0) as confirmed_revenue
            from orders o
            left join (select order_id, count(*) as ticket_count from order_items group by order_id) items on items.order_id = o.id
            where o.order_kind = 'GOCAR_TICKET'
              and o.created_at >= :from and o.created_at < :until
            group by o.host_id
            order by confirmed_revenue desc
            limit 10
            """, args));

        result.put("dailyTrends", jdbc.queryForList("""
            select cast(o.created_at as date) as report_date,
                   count(distinct o.id) as order_count,
                   coalesce(sum(case when o.status in ('CONFIRMED', 'COMPLETED') then o.total_amount else 0 end), 0) as confirmed_amount,
                   coalesce(sum(o.transport_refund_due), 0) as refund_due
            from orders o
            where o.order_kind = 'GOCAR_TICKET'
              and o.created_at >= :from and o.created_at < :until
            group by cast(o.created_at as date)
            order by report_date asc
            """, args));

        try {
            var funds=paymentClient.getTransportFundsReport(null,from,to);
            if(funds==null||!funds.isSuccess()||funds.getData()==null)throw new IllegalStateException("GoPay funds report unavailable");
            result.put("gopayFunds",funds.getData());result.put("gopayAvailable",true);
            var gopaySummary = paymentClient.getCashSettlementSummary(null);
            if (gopaySummary != null && gopaySummary.getData() != null) {
                result.put("gopaySettlementSummary", gopaySummary.getData());
            }
        } catch (Exception ex) {
            log.warn("Could not query GoPay system settlement summary: {}", ex.getMessage());
            result.put("gopayAvailable",false);
                result.put("gopaySettlementSummary", null);
        }

        return result;
    }
}
