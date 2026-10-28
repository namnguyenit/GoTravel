package com.GoTravel.CartandOrder.transport.refund;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

/** One row per liability; parent orders with item refunds are not duplicated. */
@Service @RequiredArgsConstructor
public class RefundQueueService {
 private final JdbcTemplate jdbc;
 public record Case(UUID id,String source,UUID orderId,String orderNumber,String customerName,String customerEmail,
   String paymentMethod,String category,String operationKind,String operationState,String routeTitle,String seatCode,
   @com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal amount,
   String reasonCode,String reasonText,String detail,String reference,String evidenceUrl,boolean simulated,Instant createdAt) {}
 private static final String SQL="""
 with cases as (
 select op.id,'ITEM'::text source,o.id order_id,o.order_number,o.customer_info->>'fullName' customer_name,o.customer_info->>'email' customer_email,
 o.payment_method::text payment_method,
 case when op.state in ('COMPLETED','ABORTED') and p.operation_id is not null then 'COMPLETED'
      when op.state in ('REFUND_PENDING','ABORT_REFUND_PENDING') and p.operation_id is null
       and (case when op.state='ABORT_REFUND_PENDING' then (op.plan_json::jsonb->>'topup')::numeric else (op.plan_json::jsonb->>'refundDue')::numeric end)>0 then 'PENDING'
      else 'REVIEW' end category,
 op.kind operation_kind,op.state operation_state,i.listing_title route_title,i.transport_seat_code seat_code,
 coalesce(p.amount,case when op.state='ABORT_REFUND_PENDING' then (op.plan_json::jsonb->>'topup')::numeric else (op.plan_json::jsonb->>'refundDue')::numeric end,0) amount,
 r.reason_code,r.reason_text,op.error detail,p.reference,p.evidence_url,coalesce(p.refund_method='SIMULATED',false) simulated,
 coalesce(p.recorded_at,op.created_at)::timestamptz created_at
 from transport_item_operations op join orders o on o.id=op.order_id
 left join order_items i on i.id=op.item_id
 left join transport_item_operation_reasons r on r.operation_id=op.id
 left join transport_operation_refund_proofs p on p.operation_id=op.id
 where o.order_kind='GOCAR_TICKET' and (p.operation_id is not null or op.state in ('REFUND_PENDING','ABORT_REFUND_PENDING')
    or (op.state not in ('COMPLETED','ABORTED') and op.error is not null))
 union all
 select o.id,'ORDER',o.id,o.order_number,o.customer_info->>'fullName',o.customer_info->>'email',o.payment_method::text,
 case when p.order_id is not null and o.status='REFUNDED' then 'COMPLETED'
      when o.status='REFUND_PENDING' and o.transport_refund_due>0
        and not exists(select 1 from transport_item_operations op where op.order_id=o.id and op.state not in ('COMPLETED','ABORTED')) then 'PENDING'
      else 'REVIEW' end,
 'ORDER',o.status::text,(select i.listing_title from order_items i where i.order_id=o.id order by i.id limit 1),null,
 coalesce(p.amount,o.transport_refund_due,0),null,o.transport_cancellation_reason,
 case when o.status='PAID_REVIEW' then 'Đã thu tiền nhưng phát vé chưa hoàn tất. Cần kiểm tra vé trước khi mở hoàn.'
      when coalesce(o.transport_refund_due,0)<=0 then 'Chưa xác định được số phải hoàn. Không dùng tổng giá trị đơn để xác nhận hoàn.'
      else null end,
 p.reference,p.evidence_url,coalesce(p.simulated,false),coalesce(p.recorded_at,o.created_at)::timestamptz
 from orders o left join transport_refund_confirmations p on p.order_id=o.id
 where o.order_kind='GOCAR_TICKET' and (p.order_id is not null or o.status in ('REFUND_PENDING','PAID_REVIEW'))
 and not exists(select 1 from transport_item_operations op where op.order_id=o.id and op.state in ('REFUND_PENDING','ABORT_REFUND_PENDING'))
 and (p.order_id is not null or coalesce(o.transport_refund_due,0)>0
      or not exists(select 1 from transport_item_operations op join transport_operation_refund_proofs proof on proof.operation_id=op.id where op.order_id=o.id))
 )
 """;
 public Page<Case> list(String category,String search,Pageable requested){
  if(!List.of("PENDING","COMPLETED","REVIEW").contains(category))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Bộ lọc hồ sơ không hợp lệ.");
  String keyword=search==null?"":search.trim().toLowerCase(Locale.ROOT);
  if(keyword.length()>120)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Từ khóa tối đa 120 ký tự.");
  String pattern="%"+keyword.replace("!","!!").replace("%","!%").replace("_","!_")+"%";
  var page=PageRequest.of(Math.max(0,requested.getPageNumber()),Math.min(100,Math.max(1,requested.getPageSize())));
  String filter=" from cases where category=? and (?='' or lower(concat_ws(' ',id::text,order_id::text,order_number,customer_name,customer_email,route_title,seat_code,reference)) like ? escape '!')";
  Long count=jdbc.queryForObject(SQL+"select count(*)"+filter,Long.class,category,keyword,pattern);
  var rows=jdbc.query(SQL+"select *"+filter+" order by created_at desc,id desc limit ? offset ?",(rs,n)->new Case(rs.getObject("id",UUID.class),rs.getString("source"),rs.getObject("order_id",UUID.class),rs.getString("order_number"),rs.getString("customer_name"),rs.getString("customer_email"),rs.getString("payment_method"),rs.getString("category"),rs.getString("operation_kind"),rs.getString("operation_state"),rs.getString("route_title"),rs.getString("seat_code"),rs.getBigDecimal("amount"),rs.getString("reason_code"),rs.getString("reason_text"),rs.getString("detail"),rs.getString("reference"),rs.getString("evidence_url"),rs.getBoolean("simulated"),rs.getTimestamp("created_at").toInstant()),category,keyword,pattern,page.getPageSize(),page.getOffset());
  return new PageImpl<>(rows,page,count==null?0:count);
 }
}
