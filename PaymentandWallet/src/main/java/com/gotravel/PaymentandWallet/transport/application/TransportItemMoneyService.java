package com.gotravel.PaymentandWallet.transport.application;
import com.gotravel.PaymentandWallet.transport.domain.ItemOperationPlan;
import com.gotravel.PaymentandWallet.transport.domain.ItemMoneyLedger;
import com.gotravel.PaymentandWallet.transport.domain.ItemMoneyLedger.*;
import com.gotravel.PaymentandWallet.client.OrderClient;
import com.gotravel.PaymentandWallet.repository.PaymentRequestRepository;
import com.gotravel.PaymentandWallet.enums.PaymentStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.math.BigDecimal;
import java.time.*;
@Service @RequiredArgsConstructor
public class TransportItemMoneyService {
 public record PlanView(ItemOperationPlan plan,String state){}
 private final OrderClient cart;private final PaymentRequestRepository payments;private final ItemMoneyLedger ledger;
 private ResponseStatusException conflict(String s){return new ResponseStatusException(HttpStatus.CONFLICT,s);}
 public Result apply(UUID id,String action){
  if(!List.of("reserve","fund","commit","abort","refund").contains(action))throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  var response=cart.itemOperation(id);if(response==null||!response.isSuccess()||response.getData()==null)throw conflict("Cart chưa xác nhận operation");
  var view=response.getData();var p=view.plan();if(!id.equals(p.operationId())||p.oldAmount()==null||p.newAmount()==null||p.fee()==null||p.originalAmount()==null||p.topup()==null||p.refundDue()==null)throw conflict("Plan không hợp lệ");
  for(BigDecimal amount:List.of(p.originalAmount(),p.oldAmount(),p.newAmount(),p.fee(),p.topup(),p.refundDue()))if(amount.signum()<0||amount.stripTrailingZeros().scale()>0)throw conflict("VND phải nguyên và không âm");
  if(p.oldAmount().subtract(p.fee()).add(p.topup()).subtract(p.refundDue()).compareTo(p.newAmount())!=0||p.fee().compareTo(p.oldAmount())>0)throw conflict("Money allocation không cân bằng");
  var original=payments.findByOrderId(p.orderId()).orElse(null);
  boolean backed;
  BigDecimal rate=p.commissionRate();String version=p.commissionVersion();
  if("ONLINE".equals(p.paymentMethod())){
   backed=original!=null&&original.getPaidAt()!=null&&original.getStatus()==PaymentStatus.COMPLETED&&"GOCAR_TICKET".equals(original.getOrderKind())&&Objects.equals(original.getUserId(),p.userId())&&Objects.equals(original.getHostId(),p.ownerUserId())&&original.getAmount().compareTo(p.originalOrderAmount())==0;
   if(backed){var commission=ledger.originalCommission(p.orderId());rate=commission.rate();version=commission.version();}
  }else backed="CASH".equals(p.paymentMethod())&&p.originalCashShiftId()!=null&&p.cashReceived()!=null&&p.cashReceived().compareTo(p.originalOrderAmount())==0;
  if("reserve".equals(action)){
   if(!backed||rate==null||version==null)throw conflict("Không có nguồn tiền/hoa hồng đã xác nhận");
   if(!List.of("HELD","WAITING_FUNDS").contains(view.state()))throw conflict("Cart không ở bước reserve funds");
   return ledger.reserve(p,rate,version);
  }
  var payment=payments.findByOrderId(id).orElse(null);
  Proof topupProof=null;
  if("CASH".equals(p.paymentMethod())){var proof=cart.itemCashProof(id);if(proof!=null&&proof.isSuccess())topupProof=proof.getData();}
  if(topupProof!=null && topupProof.amount()!=null && (!id.equals(topupProof.operation_id()) || topupProof.shift_id()==null || topupProof.actor_id()==null || topupProof.reference()==null || topupProof.commission_rate()==null || topupProof.commission_version()==null))throw conflict("Biên nhận tiền mặt không đủ nguồn gốc");
  boolean paid=p.topup().signum()==0||("ONLINE".equals(p.paymentMethod())&&payment!=null&&Objects.equals(p.userId(),payment.getUserId())&&p.ownerUserId().equals(payment.getHostId())&&"GOCAR_EXCHANGE".equals(payment.getOrderKind())&&payment.getPaidAt()!=null&&List.of(PaymentStatus.COMPLETED,PaymentStatus.PAID_REVIEW).contains(payment.getStatus())&&payment.getAmount().compareTo(p.topup())==0)||("CASH".equals(p.paymentMethod())&&topupProof!=null&&topupProof.amount()!=null&&topupProof.amount().compareTo(p.topup())==0);
  if("fund".equals(action)){
   if(!List.of("WAITING_FUNDS","COMMITTING").contains(view.state()))throw conflict("Cart không chờ tiền");
   boolean timely=p.topup().signum()==0||"CASH".equals(p.paymentMethod())||("ONLINE".equals(p.paymentMethod())&&payment!=null&&Objects.equals(p.userId(),payment.getUserId())&&p.ownerUserId().equals(payment.getHostId())&&"GOCAR_EXCHANGE".equals(payment.getOrderKind())&&payment.getPaidAt()!=null&&!payment.getPaidAt().isAfter(LocalDateTime.ofInstant(p.expiresAt(),ZoneId.of("Asia/Ho_Chi_Minh"))));
   return ledger.fund(p,paid&&timely,payment==null?null:"PAYMENT:"+payment.getId(),topupProof);
  }
  if("commit".equals(action)){
   if(!List.of("SETTLING","REFUND_PENDING","COMPLETED").contains(view.state()))throw conflict("Cart chưa commit vé/inventory");
   return ledger.commit(p);
  }
  if("abort".equals(action)){
   if(!List.of("ABORTING","ABORT_REFUND_PENDING","ABORTED").contains(view.state()))throw conflict("Cart chưa abort operation");
   return ledger.abort(p,paid,payment==null?null:"PAYMENT:"+payment.getId(),topupProof);
  }
  if("refund".equals(action)){
   var proof=cart.itemRefundProof(id);if(proof==null||!proof.isSuccess()||proof.getData()==null)throw conflict("Chưa có chứng cứ hoàn thực tế");
   return ledger.refund(p,proof.getData());
  }
  throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
 }
}
