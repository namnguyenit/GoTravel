package com.gotravel.PaymentandWallet.transport.infrastructure;
import com.gotravel.PaymentandWallet.transport.domain.ItemOperationPlan;
import com.gotravel.PaymentandWallet.transport.domain.ItemMoneyLedger;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;import java.math.*;
@Repository @RequiredArgsConstructor
public class TransportMoneyRepository implements ItemMoneyLedger {
 private final JdbcTemplate jdbc;
 private ResponseStatusException conflict(String s){return new ResponseStatusException(HttpStatus.CONFLICT,s);}
 public Commission originalCommission(UUID orderId){return jdbc.query("select commission_rate from host_payouts where order_id=? and provider_type='TRANSPORT'",(rs,row)->new Commission(rs.getBigDecimal(1),"ORIGINAL_PAYOUT"),orderId).stream().findFirst().orElseThrow(()->conflict("Không có payout snapshot gốc"));}
 private void lock(ItemOperationPlan p){jdbc.query("select pg_advisory_xact_lock(hashtextextended(?,0))",rs->null,p.orderId().toString());}
 private Map<String,Object> row(UUID id){var values=jdbc.queryForList("select * from transport_item_money_operations where operation_id=? for update",id);return values.isEmpty()?null:values.get(0);}
 private Result result(ItemOperationPlan p,Map<String,Object> row){if(row==null)return new Result(p.operationId(),"ABORTED",p.topup(),BigDecimal.ZERO);if(!p.requestHash().equals(row.get("request_hash")))throw conflict("Operation money payload khác");return new Result(p.operationId(),(String)row.get("state"),(BigDecimal)row.get("topup"),(BigDecimal)row.get("refund_due"));}
 @Transactional public Result reserve(ItemOperationPlan p,BigDecimal rate,String version){
  lock(p);var prior=row(p.operationId());if(prior!=null)return result(p,prior);
  if("ONLINE".equals(p.paymentMethod())){
   Integer transferred=jdbc.queryForObject("select count(*) from host_payouts where order_id=? and provider_type='TRANSPORT' and status='PAID'",Integer.class,p.orderId());
   if(transferred!=null&&transferred>0)throw conflict("SOURCE_PAYOUT_ALREADY_PAID: cần đối soát khoản đã trả nhà xe trước");
  }
  var account=jdbc.queryForList("select * from transport_item_accounts where item_id=? for update",p.itemId());
  if(account.isEmpty()){
   BigDecimal assigned=jdbc.queryForObject("select coalesce(sum(original_amount),0) from transport_item_accounts where order_id=?",BigDecimal.class,p.orderId());
   if(assigned.add(p.originalAmount()).compareTo(p.originalOrderAmount())>0)throw conflict("Allocation vượt tiền gốc");
   jdbc.update("insert into transport_item_accounts(item_id,order_id,operator_user_id,method,original_amount,balance,commission_rate,commission_version,cash_shift_id) values(?,?,?,?,?,?,?,?,?)",p.itemId(),p.orderId(),p.ownerUserId(),p.paymentMethod(),p.originalAmount(),p.originalAmount(),rate,version,p.originalCashShiftId());
   account=jdbc.queryForList("select * from transport_item_accounts where item_id=? for update",p.itemId());
  }
  jdbc.update("update transport_item_accounts set commission_rate=coalesce(commission_rate,?),commission_version=coalesce(commission_version,?),cash_shift_id=coalesce(cash_shift_id,?) where item_id=?",rate,version,p.originalCashShiftId(),p.itemId());
  Integer lots=jdbc.queryForObject("select count(*) from transport_item_fund_lots where item_id=?",Integer.class,p.itemId());
  if(lots!=null&&lots==0)jdbc.update("insert into transport_item_fund_lots(id,item_id,cash_shift_id,commission_rate,commission_version,remaining_amount) values(?,?,?,?,?,?)",UUID.randomUUID(),p.itemId(),p.originalCashShiftId(),rate,version,p.oldAmount());
  var current=account.get(0);
  if(!p.orderId().equals(current.get("order_id"))||!p.ownerUserId().equals(current.get("operator_user_id"))||!p.paymentMethod().equals(current.get("method"))||((BigDecimal)current.get("balance")).compareTo(p.oldAmount())!=0||current.get("reserved_by")!=null)throw conflict("Credit item đã dùng hoặc không khớp");
  jdbc.update("update transport_item_accounts set reserved_by=? where item_id=?",p.operationId(),p.itemId());
  jdbc.update("insert into transport_item_money_operations(operation_id,item_id,request_hash,old_amount,new_amount,fee,topup,refund_due) values(?,?,?,?,?,?,?,?)",p.operationId(),p.itemId(),p.requestHash(),p.oldAmount(),p.newAmount(),p.fee(),p.topup(),p.refundDue());
  return result(p,row(p.operationId()));
 }
 private void event(ItemOperationPlan p,String kind,BigDecimal amount,String reference,String evidence,UUID actor){event(p,kind,amount,reference,evidence,actor,null);}
 private void event(ItemOperationPlan p,String kind,BigDecimal amount,String reference,String evidence,UUID actor,UUID cashShift){
  var prior=jdbc.queryForList("select * from transport_item_money_events where operation_id=? and kind=?",p.operationId(),kind);
  if(!prior.isEmpty()){var row=prior.get(0);if(((BigDecimal)row.get("amount")).compareTo(amount)!=0||!Objects.equals(reference,row.get("reference"))||!Objects.equals(evidence,row.get("evidence_url"))||!Objects.equals(actor,row.get("actor_id"))||!Objects.equals(cashShift,row.get("cash_shift_id")))throw conflict("Chứng cứ ledger khác");return;}
  jdbc.update("insert into transport_item_money_events(id,operation_id,kind,amount,reference,evidence_url,actor_id,cash_shift_id) values(?,?,?,?,?,?,?,?)",UUID.randomUUID(),p.operationId(),kind,amount,reference,evidence,actor,cashShift);
 }
 @Transactional public Result fund(ItemOperationPlan p,boolean paid,String onlineReference,Proof cashProof){lock(p);var prior=row(p.operationId());if(prior==null)throw conflict("Chưa reserve credit");String state=(String)prior.get("state");if(!"RESERVED".equals(state))return result(p,prior);if(!paid)return result(p,prior);
  if(p.topup().signum()>0)event(p,"TOPUP",p.topup(),"CASH".equals(p.paymentMethod())?"CASH:"+cashProof.reference():onlineReference,null,cashProof==null?null:cashProof.actor_id(),cashProof==null?null:cashProof.shift_id());
  if(p.topup().signum()>0){
    var account=jdbc.queryForMap("select * from transport_item_accounts where item_id=?",p.itemId());
    BigDecimal rate=cashProof==null?(BigDecimal)account.get("commission_rate"):cashProof.commission_rate();
    String version=cashProof==null?(String)account.get("commission_version"):cashProof.commission_version();
    if(rate==null||version==null)throw conflict("Thiếu fee snapshot của khoản thu chênh lệch");
    event(p,"TOPUP_COMMISSION",p.topup().multiply(rate),null,null,p.actorId());
    jdbc.update("insert into transport_item_fund_lots(id,item_id,source_operation_id,cash_shift_id,commission_rate,commission_version,remaining_amount) values(?,?,?,?,?,?,?) on conflict(item_id,source_operation_id) do nothing",UUID.randomUUID(),p.itemId(),p.operationId(),cashProof==null?null:cashProof.shift_id(),rate,version,p.topup());
  }
  jdbc.update("update transport_item_money_operations set state='FUNDED'  where operation_id=?",p.operationId());return result(p,row(p.operationId()));
 }
 @Transactional public Result commit(ItemOperationPlan p){lock(p);var prior=row(p.operationId());if(prior==null)throw conflict("Chưa có credit");if(List.of("COMMITTED","REFUND_PENDING","COMPLETED").contains(prior.get("state")))return result(p,prior);if(!"FUNDED".equals(prior.get("state")))throw conflict("Chưa có tiền thật");
  event(p,"CREDIT_TRANSFER",p.oldAmount().subtract(p.fee()),null,null,p.actorId());event(p,"REPLACEMENT_DEBIT",p.newAmount(),null,null,p.actorId());event(p,"FEE",p.fee(),null,null,p.actorId());
  // Fees consume original funding first. Refunds consume the most recent funding first;
  // commission reversal follows the source lot's rate, including cash collected in another shift.
  consume(p,p.fee(),false);
  consume(p,p.refundDue(),true);
  jdbc.update("update transport_item_accounts set balance=?,revision=revision+1,reserved_by=null where item_id=? and reserved_by=?",p.newAmount(),p.itemId(),p.operationId());
  jdbc.update("update transport_item_money_operations set state=?,committed_at=now() where operation_id=?",p.refundDue().signum()>0?"REFUND_PENDING":"COMPLETED",p.operationId());return result(p,row(p.operationId()));
 }
 private void consume(ItemOperationPlan p,BigDecimal amount,boolean refund){
  BigDecimal remaining=amount;
  var lots=jdbc.queryForList("select * from transport_item_fund_lots where item_id=? order by created_at "+(refund?"desc":"asc")+",id for update",p.itemId());
  BigDecimal totalReversal=BigDecimal.ZERO;
  for(var lot:lots){if(remaining.signum()==0)break;BigDecimal used=remaining.min((BigDecimal)lot.get("remaining_amount"));if(used.signum()==0)continue;
   jdbc.update("update transport_item_fund_lots set remaining_amount=remaining_amount-? where id=?",used,lot.get("id"));remaining=remaining.subtract(used);
   if(refund){
    BigDecimal reversal=used.multiply((BigDecimal)lot.get("commission_rate"));totalReversal=totalReversal.add(reversal);
    if(lot.get("cash_shift_id")!=null)jdbc.update("insert into transport_item_cash_refund_allocations(operation_id,shift_id,amount,commission_reversal) values(?,?,?,?) on conflict(operation_id,shift_id) do update set amount=transport_item_cash_refund_allocations.amount+excluded.amount,commission_reversal=transport_item_cash_refund_allocations.commission_reversal+excluded.commission_reversal",p.operationId(),lot.get("cash_shift_id"),used,reversal);
   }
  }
  if(remaining.signum()>0)throw conflict("Funding lots không đủ tiền");
  if(refund)event(p,"COMMISSION_REVERSAL_DUE",totalReversal,null,null,p.actorId());
 }
 @Transactional public Result abort(ItemOperationPlan p,boolean paid,String onlineReference,Proof cashProof){lock(p);var prior=row(p.operationId());
  if(prior==null){
   // Prepare may fail before reserve; create a liability record if a provider still received the top-up.
   // Persist an abort tombstone even without top-up: a delayed reserve call must not relock credit.
   jdbc.update("insert into transport_item_accounts(item_id,order_id,operator_user_id,method,original_amount,balance) values(?,?,?,?,?,?) on conflict(item_id) do nothing",p.itemId(),p.orderId(),p.ownerUserId(),p.paymentMethod(),p.originalAmount(),p.oldAmount());
   jdbc.update("insert into transport_item_money_operations(operation_id,item_id,request_hash,old_amount,new_amount,fee,topup,refund_due,state) values(?,?,?,?,?,?,?,?, 'RESERVED')",p.operationId(),p.itemId(),p.requestHash(),p.oldAmount(),p.oldAmount(),BigDecimal.ZERO,p.topup(),BigDecimal.ZERO);prior=row(p.operationId());
  }
  Integer alreadyRefunded=jdbc.queryForObject("select count(*) from transport_item_money_events where operation_id=? and kind='REFUND'",Integer.class,p.operationId());
  if(alreadyRefunded!=null&&alreadyRefunded>0)return result(p,prior);
  if(List.of("COMPLETED","REFUND_PENDING").contains(prior.get("state")))throw conflict("Money đã commit; không abort");
  boolean received=paid&&p.topup().signum()>0;
  if(received && cashProof!=null){
    BigDecimal reversal=p.topup().multiply(cashProof.commission_rate());
    jdbc.update("insert into transport_item_cash_refund_allocations(operation_id,shift_id,amount,commission_reversal) values(?,?,?,?) on conflict(operation_id,shift_id) do nothing",p.operationId(),cashProof.shift_id(),p.topup(),reversal);
  }
  if(received){
   BigDecimal rate=cashProof==null?originalCommission(p.orderId()).rate():cashProof.commission_rate();
   BigDecimal reversal=p.topup().multiply(rate);
   event(p,"TOPUP_COMMISSION",reversal,null,null,p.actorId());
   event(p,"COMMISSION_REVERSAL_DUE",reversal,null,null,p.actorId());
  }
  if(received)event(p,"TOPUP",p.topup(),"CASH".equals(p.paymentMethod())?"CASH:"+cashProof.reference():onlineReference,null,cashProof==null?null:cashProof.actor_id(),cashProof==null?null:cashProof.shift_id());
  jdbc.update("update transport_item_fund_lots set remaining_amount=0 where source_operation_id=?",p.operationId());
  jdbc.update("update transport_item_accounts set reserved_by=null where item_id=? and reserved_by=?",p.itemId(),p.operationId());
  jdbc.update("update transport_item_money_operations set state=?,refund_due=? where operation_id=?",received?"ABORT_REFUND_PENDING":"ABORTED",received?p.topup():BigDecimal.ZERO,p.operationId());return result(p,row(p.operationId()));
 }
 @Transactional public Result refund(ItemOperationPlan p,Proof proof){lock(p);var prior=row(p.operationId());if(prior==null)throw conflict("Không có nghĩa vụ hoàn");String state=(String)prior.get("state");BigDecimal due=(BigDecimal)prior.get("refund_due");
  if(!List.of("REFUND_PENDING","ABORT_REFUND_PENDING","COMPLETED","ABORTED").contains(state)||!p.operationId().equals(proof.operation_id())||proof.actor_id()==null||proof.amount()==null||proof.amount().compareTo(due)!=0||due.signum()<=0||proof.reference()==null||proof.reference().isBlank()||proof.evidence_url()==null||!proof.evidence_url().startsWith("https://"))throw conflict("Chứng cứ hoàn không khớp liability");
  event(p,"REFUND",due,proof.reference(),proof.evidence_url(),proof.actor_id(),proof.shift_id());
  jdbc.update("update transport_item_money_operations set state=? where operation_id=?",state.startsWith("ABORT")?"ABORTED":"COMPLETED",p.operationId());return result(p,row(p.operationId()));
 }
}
