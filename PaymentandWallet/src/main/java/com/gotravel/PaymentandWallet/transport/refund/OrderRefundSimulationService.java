package com.gotravel.PaymentandWallet.transport.refund;

import com.gotravel.PaymentandWallet.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;

/** No provider call: only a verified test charge may produce a simulated refund. */
@Service @RequiredArgsConstructor
public class OrderRefundSimulationService {
 private final JdbcTemplate jdbc;
 private final PaymentService payments;
 private final ProviderRefundGateway gateway;
 private final TransactionTemplate tx;
 @Value("${transport.refunds.public-base-url:https://gocar.nonnet123.io.vn}") private String publicBase;
 private ResponseStatusException conflict(String message){return new ResponseStatusException(HttpStatus.CONFLICT,message);}
 private Map<String,Object> audit(UUID id){return jdbc.queryForList("select * from transport_order_refund_simulations where order_id=?",id).stream().findFirst().orElse(null);}
 private Map<String,Object> eligiblePayment(UUID id){
  var summary=payments.getInternalOrderPaymentSummary(id);
  if(!"GOCAR_TICKET".equals(summary.getOrderKind())||!"REFUND_PENDING".equals(summary.getStatus())
    ||summary.getTransportRefundDue()==null||summary.getTransportRefundDue().signum()<=0)throw conflict("Đơn chưa có nghĩa vụ hoàn toàn đơn đã xác nhận.");
  var rows=jdbc.queryForList("select * from payment_requests where order_id=?",id);
  if(rows.size()!=1)throw conflict("Chưa xác định được duy nhất giao dịch gốc để hoàn.");
  var payment=rows.get(0);
  if(!"COMPLETED".equals(payment.get("status"))||payment.get("paid_at")==null
    ||!Objects.equals(summary.getUserId(),payment.get("user_id"))||!Objects.equals(summary.getHostId(),payment.get("host_id"))
    ||!"GOCAR_TICKET".equals(payment.get("order_kind"))||summary.getTotalAmount().compareTo((BigDecimal)payment.get("amount"))!=0)
    throw conflict("Giao dịch gốc chưa khớp khách hàng, nhà xe hoặc số tiền đã thu.");
  if(summary.getTransportCancellationFee()==null||summary.getTransportRefundDue().add(summary.getTransportCancellationFee()).compareTo((BigDecimal)payment.get("amount"))!=0)
    throw conflict("Số hoàn và phí hủy không khớp giao dịch gốc.");
  if(!"MOCK".equals(payment.get("provider"))&&!gateway.sandboxSimulationAllowed(payment))throw conflict("Chỉ mô phỏng cho giao dịch MOCK hoặc VNPAY sandbox đã xác thực; không áp dụng cho tiền thật.");
  if(jdbc.queryForObject("select count(*) from transport_item_accounts where order_id=?",Integer.class,id)>0)throw conflict("Đơn đã phân bổ tiền theo vé; xử lý khoản hoàn từng vé.");
  if(jdbc.queryForObject("select count(*) from host_payouts where order_id=? and status='PAID'",Integer.class,id)>0)throw conflict("Khoản thu đã quyết toán cho nhà xe; cần rà soát trước khi hoàn.");
  payment.put("refund_due",summary.getTransportRefundDue());return payment;
 }
 private ProviderRefundService.Result completed(UUID id,Map<String,Object> row){return new ProviderRefundService.Result(id,"SUCCEEDED",false,(BigDecimal)row.get("amount"),String.valueOf(row.get("provider")),"Đã hoàn mô phỏng trong ứng dụng. Không chuyển tiền ngân hàng và không đổi trạng thái trên VNPAY.",String.valueOf(row.get("reference")),String.valueOf(row.get("evidence_url")),"MOCK".equals(row.get("provider"))?"MOCK":"SANDBOX",true,false);}
 public ProviderRefundService.Result status(UUID id){
  var saved=audit(id);if(saved!=null)return completed(id,saved);
  try {var p=eligiblePayment(id);return new ProviderRefundService.Result(id,"AVAILABLE",false,(BigDecimal)p.get("refund_due"),String.valueOf(p.get("provider")),"Có thể hoàn mô phỏng đúng nghĩa vụ hoàn đã xác nhận.",null,null,"MOCK".equals(p.get("provider"))?"MOCK":"SANDBOX",false,true);}
  catch(ResponseStatusException e){return new ProviderRefundService.Result(id,"MANUAL_REQUIRED",false,BigDecimal.ZERO,null,e.getReason(),null,null,null,false,false);}
 }
 public ProviderRefundService.Result simulate(UUID id,UUID actor,BigDecimal amount){
  if(actor==null||amount==null||amount.signum()<=0||amount.stripTrailingZeros().scale()>0)throw conflict("Thông tin xác nhận hoàn không hợp lệ.");
  return tx.execute(s->{
   jdbc.query("select pg_advisory_xact_lock(hashtextextended(?,0))",rs->null,id.toString());
   var saved=audit(id);if(saved!=null){if(amount.compareTo((BigDecimal)saved.get("amount"))!=0)throw conflict("Số tiền khác khoản đã hoàn.");return completed(id,saved);}
   // Lock the payment before re-reading all financial eligibility checks.
   jdbc.queryForList("select id from payment_requests where order_id=? for update",id);
   var p=eligiblePayment(id);if(amount.compareTo((BigDecimal)p.get("refund_due"))!=0)throw conflict("Số tiền phải bằng đúng nghĩa vụ hoàn của đơn.");
   String ref="AUTO-ORDER-SIM-REFUND-"+id;
   String evidence=publicBase.replaceAll("/+$","")+"/api/v1/orders/transport/admin/refunds/"+id+"/simulation";
   jdbc.update("insert into transport_order_refund_simulations(order_id,payment_id,actor_id,amount,provider,reference,evidence_url) values(?,?,?,?,?,?,?)",id,p.get("id"),actor,amount,p.get("provider"),ref,evidence);
   // Same transaction: existing payout/fee accounting, explicitly linked to the simulation audit.
   payments.recordManualTransportRefund(id,amount,ref,evidence,actor);
   return completed(id,audit(id));
  });
 }
}
