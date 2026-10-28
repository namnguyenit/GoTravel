package com.GoTravel.CartandOrder.transport.cash.application;

import com.GoTravel.CartandOrder.transport.GoCarClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** Owner-only receipt-based sales attribution. A held/unpaid order is never a sale. */
@Service
@RequiredArgsConstructor
public class CounterSalesReportService {
    private final NamedParameterJdbcTemplate jdbc;
    private final GoCarClient car;
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final String FINANCIALS = """
        ), item_counts as (
          select i.order_id,count(*) as ticket_count,
            count(*) filter(where i.transport_ticket_id is not null) as issued_count,
            count(*) filter(where i.transport_item_state in ('REFUND_PENDING','REFUNDED','VOID')
              or s.status in ('CANCELLED','REFUND_PENDING','REFUNDED')) as cancelled_count
          from order_items i join sales s on s.order_id=i.order_id group by i.order_id
        ), refund_rows as (
          select c.order_id,c.amount from transport_refund_confirmations c join sales s on s.order_id=c.order_id
          union all
          select x.order_id,p.amount from transport_operation_refund_proofs p
            join transport_item_operations x on x.id=p.operation_id join sales s on s.order_id=x.order_id
        ), refunds as (
          select order_id,sum(amount) as amount from refund_rows group by order_id
        ), topups as (
          select x.order_id,sum(p.amount) as amount from transport_operation_cash_proofs p
            join transport_item_operations x on x.id=p.operation_id join sales s on s.order_id=x.order_id group by x.order_id
        ), financials as (
          select s.*,coalesce(i.ticket_count,0) as ticket_count,coalesce(i.issued_count,0) as issued_count,
            coalesce(i.cancelled_count,0) as cancelled_count,coalesce(t.amount,0) as topup_amount,
            coalesce(r.amount,0) as refund_amount,s.amount+coalesce(t.amount,0)-coalesce(r.amount,0) as net_amount
          from sales s left join item_counts i on i.order_id=s.order_id
            left join refunds r on r.order_id=s.order_id left join topups t on t.order_id=s.order_id
        )
        """;

    private record Scope(String sql, MapSqlParameterSource args) {}
    private Scope scope(UUID actor, LocalDate from, LocalDate to, UUID cashier) {
        if(from==null || to==null || to.isBefore(from) || ChronoUnit.DAYS.between(from,to)>365)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Chọn khoảng ngày hợp lệ, tối đa 366 ngày");
        var response=car.readScope(actor,null);
        var allowed=response==null?null:response.getData();
        if(allowed==null || !actor.equals(allowed.ownerUserId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Chỉ chủ nhà xe được xem doanh số nhân viên");
        var args=new MapSqlParameterSource("owner",actor).addValue("operator",allowed.operatorId())
            .addValue("from",from.atStartOfDay(VN).toOffsetDateTime())
            .addValue("until",to.plusDays(1).atStartOfDay(VN).toOffsetDateTime());
        String filter="";
        if(cashier!=null){filter=" and r.actor_id=:cashier ";args.addValue("cashier",cashier);}
        return new Scope("""
            with sales as (
              select r.order_id,r.actor_id as cashier_id,r.receipt_no,r.amount,r.received_at,
                o.order_number,o.status,coalesce(o.customer_info->>'fullName','') as customer_name
              from transport_cash_receipts r join orders o on o.id=r.order_id
              where o.order_kind='GOCAR_TICKET' and o.payment_method='CASH' and o.host_id=:owner
                and r.operator_id=:operator and r.received_at>=:from and r.received_at<:until
            """+filter+FINANCIALS,args);
    }

    @Transactional(readOnly=true)
    public Map<String,Object> summary(UUID actor,LocalDate from,LocalDate to,UUID cashier,int page,int size){
        var scope=scope(actor,from,to,cashier);int limit=Math.min(100,Math.max(1,size));int number=Math.max(0,page);
        if(number>100000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Trang không hợp lệ");
        scope.args().addValue("limit",limit).addValue("offset",number*limit);
        long total=Objects.requireNonNullElse(jdbc.queryForObject(scope.sql()+" select count(distinct cashier_id) from financials",scope.args(),Long.class),0L);
        var rows=jdbc.queryForList(scope.sql()+"""
            select cashier_id,count(*) as order_count,sum(ticket_count) as ticket_count,sum(issued_count) as issued_count,
              sum(cancelled_count) as cancelled_count,sum(amount) as received_amount,sum(topup_amount) as topup_amount,
              sum(refund_amount) as refund_amount,sum(net_amount) as net_amount,max(received_at) as last_sale_at
            from financials group by cashier_id order by max(received_at) desc,cashier_id limit :limit offset :offset
            """,scope.args());
        var totals=jdbc.queryForMap(scope.sql()+"""
            select count(*) as order_count,coalesce(sum(ticket_count),0) as ticket_count,
              coalesce(sum(cancelled_count),0) as cancelled_count,coalesce(sum(amount),0) as received_amount,
              coalesce(sum(topup_amount),0) as topup_amount,coalesce(sum(refund_amount),0) as refund_amount,
              coalesce(sum(net_amount),0) as net_amount from financials
            """,scope.args());
        return Map.of("rows",rows,"summary",totals,"totalElements",total,"totalPages",Math.max(1,(total+limit-1)/limit),"page",number,"size",limit);
    }

    @Transactional(readOnly=true)
    public Map<String,Object> orders(UUID actor,LocalDate from,LocalDate to,UUID cashier,int page,int size){
        var scope=scope(actor,from,to,cashier);int limit=Math.min(100,Math.max(1,size));int number=Math.max(0,page);
        if(number>100000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Trang không hợp lệ");
        scope.args().addValue("limit",limit).addValue("offset",number*limit);
        long total=Objects.requireNonNullElse(jdbc.queryForObject(scope.sql()+" select count(*) from financials",scope.args(),Long.class),0L);
        var rows=jdbc.queryForList(scope.sql()+" select * from financials order by received_at desc,order_id limit :limit offset :offset",scope.args());
        return Map.of("rows",rows,"totalElements",total,"totalPages",Math.max(1,(total+limit-1)/limit),"page",number,"size",limit);
    }
}
