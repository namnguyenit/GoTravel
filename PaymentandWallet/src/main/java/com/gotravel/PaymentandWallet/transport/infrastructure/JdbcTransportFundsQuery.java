package com.gotravel.PaymentandWallet.transport.infrastructure;
import com.gotravel.PaymentandWallet.transport.domain.TransportFundsQuery;
import lombok.RequiredArgsConstructor;import org.springframework.stereotype.Repository;
import org.springframework.jdbc.core.namedparam.*;import java.time.*;import java.util.*;
@Repository @RequiredArgsConstructor
public class JdbcTransportFundsQuery implements TransportFundsQuery {
 private final NamedParameterJdbcTemplate jdbc;
 public Map<String,Object> report(UUID ownerUserId,LocalDate from,LocalDate to){
  var args=new MapSqlParameterSource("owner",ownerUserId).addValue("from",from.atStartOfDay()).addValue("until",to.plusDays(1).atStartOfDay()).addValue("instantFrom",from.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime()).addValue("instantUntil",to.plusDays(1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime());
  var result=new LinkedHashMap<String,Object>();result.put("asOf",Instant.now());result.put("timezone","Asia/Ho_Chi_Minh");
  result.put("onlineReceived",jdbc.queryForMap("select count(*) as payment_count,coalesce(sum(amount),0) as amount from payment_requests where order_kind in ('GOCAR_TICKET','GOCAR_EXCHANGE') and paid_at>=:from and paid_at<:until and (cast(:owner as uuid) is null or host_id=:owner)",args));
  result.put("manualFullRefunds",jdbc.queryForMap("select count(*) as refund_count,coalesce(sum(r.amount),0) as amount from transport_manual_refunds r join payment_requests p on p.order_id=r.order_id where r.recorded_at>=:instantFrom and r.recorded_at<:instantUntil and (cast(:owner as uuid) is null or p.host_id=:owner)",args));
  result.put("itemMoneyEvents",jdbc.queryForList("select e.kind,a.method,count(*) as event_count,coalesce(sum(e.amount),0) as amount from transport_item_money_events e join transport_item_money_operations o on o.operation_id=e.operation_id join transport_item_accounts a on a.item_id=o.item_id where e.created_at>=:instantFrom and e.created_at<:instantUntil and (cast(:owner as uuid) is null or a.operator_user_id=:owner) group by e.kind,a.method",args));
  result.put("pendingRefundLiabilities",jdbc.queryForMap("select count(*) as operation_count,coalesce(sum(o.refund_due),0) as amount from transport_item_money_operations o join transport_item_accounts a on a.item_id=o.item_id where o.state in ('REFUND_PENDING','ABORT_REFUND_PENDING') and (cast(:owner as uuid) is null or a.operator_user_id=:owner)",args));
  return result;
 }
}
