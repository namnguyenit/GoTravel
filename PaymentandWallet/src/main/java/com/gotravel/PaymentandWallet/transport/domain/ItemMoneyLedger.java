package com.gotravel.PaymentandWallet.transport.domain;
import java.util.UUID;
import java.math.BigDecimal;
public interface ItemMoneyLedger {
 record Result(UUID operationId,String state,BigDecimal topup,BigDecimal refundDue){}
 record Proof(UUID operation_id,UUID shift_id,UUID actor_id,BigDecimal amount,String reference,String evidence_url,BigDecimal commission_rate,String commission_version){}
 record Commission(BigDecimal rate,String version){}
 Commission originalCommission(UUID orderId);
 Result reserve(ItemOperationPlan plan,BigDecimal rate,String version);
 Result fund(ItemOperationPlan plan,boolean paid,String onlineReference,Proof cashProof);
 Result commit(ItemOperationPlan plan);
 Result abort(ItemOperationPlan plan,boolean paid,String onlineReference,Proof cashProof);
 Result refund(ItemOperationPlan plan,Proof proof);
}
