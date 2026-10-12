package com.GoTravel.CartandOrder.transport.adjustment.application;
import com.GoTravel.CartandOrder.transport.adjustment.domain.*;
import com.GoTravel.CartandOrder.transport.*;
import com.GoTravel.CartandOrder.transport.cash.domain.CashLedger;
import com.GoTravel.CartandOrder.client.PaymentClient;
import com.GoTravel.CartandOrder.entity.*;
import com.GoTravel.CartandOrder.enums.*;
import com.GoTravel.CartandOrder.repository.OrderRepository;
import com.GoTravel.CartandOrder.dto.response.OrderPaymentSummaryResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.math.*;
import java.time.*;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Service @RequiredArgsConstructor @Slf4j
public class ItemOperationService {
 private static final ZoneId VN=ZoneId.of("Asia/Ho_Chi_Minh");
 private final ItemOperationRepository operations;private final ItemOperationIntegrations downstream;
 private final OrderRepository orders;private final GoCarClient car;private final CashLedger cash;
 private final jakarta.persistence.EntityManager entityManager;
 private final CancellationPolicy policy;private final TransactionTemplate tx;private final ItemOperationStore store;private final ObjectMapper json;
 public record View(UUID operationId,UUID orderId,UUID itemId,String kind,String state,Instant expiresAt,
   UUID oldTripId,UUID oldSeatId,UUID newTripId,UUID newSeatId,
   @com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal oldAmount,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal newAmount,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal fee,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal topup,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal refundDue,String error){}
 public View view(UUID actor,ItemOperationRepository.Operation op){
   get(actor,op.plan().operationId());var p=op.plan();
   return new View(p.operationId(),p.orderId(),p.itemId(),p.kind(),op.state(),p.expiresAt(),p.oldTripId(),p.oldSeatId(),p.newTripId(),p.newSeatId(),p.oldAmount(),p.newAmount(),p.fee(),p.topup(),op.state().startsWith("ABORT")?p.topup():p.refundDue(),op.error());
 }
 public record Request(UUID operationId,UUID tripId,UUID seatId,UUID pickupStopId,UUID dropoffStopId){}
 private ResponseStatusException conflict(String s){return new ResponseStatusException(HttpStatus.CONFLICT,s);}
 public void paymentSignal(UUID id){
  var op=trusted(id);
  if("ABORTED".equals(op.state())){
    var money=downstream.money(id,"abort");
    if("ABORT_REFUND_PENDING".equals(money.state()))operations.transition(id,"ABORTED","ABORT_REFUND_PENDING",null);
  } else process(id);
 }
 public record Preview(String kind,String currency,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal oldAmount,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal newAmount,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal fee,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal topup,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal refundDue,String policyVersion){}
 public Preview preview(UUID actor,UUID orderId,UUID itemId,String kind,Request request){
  if(kind==null||!List.of("CANCEL","EXCHANGE").contains(kind))throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  var order=orders.findById(orderId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));var item=findItem(order,itemId);authorize(actor,order,item.getTransportTripId());
  if(order.getStatus()!=OrderStatus.CONFIRMED || !"ACTIVE".equals(item.getTransportItemState()))throw conflict("Vé không đủ điều kiện đổi/hủy");
  var policyQuote=policy.quoteAmount(order,item.getTransportDepartureAt(),item.getTotalPrice());BigDecimal next=BigDecimal.ZERO;
  if("EXCHANGE".equals(kind)){
   if(request==null||request.tripId()==null||request.seatId()==null||request.pickupStopId()==null||request.dropoffStopId()==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
   if(!actor.equals(order.getUserId()))authorize(actor,order,request.tripId());
   var response=car.quote(new GoCarClient.QuoteRequest(request.tripId(),List.of(new TransportCheckoutRequest.Passenger(request.seatId(),item.getPassengerName(),request.pickupStopId(),request.dropoffStopId()))));
   var quote=response==null||!response.isSuccess()?null:response.getData();
   if(quote==null||!order.getHostId().equals(quote.operatorUserId())||!"VND".equals(quote.currency())||quote.totalAmount()==null)throw conflict("Không có báo giá cùng nhà xe");next=quote.totalAmount();
  }
  var credit=item.getTotalPrice().subtract(policyQuote.fee());
  return new Preview(kind,"VND",item.getTotalPrice(),next,policyQuote.fee(),next.subtract(credit).max(BigDecimal.ZERO),credit.subtract(next).max(BigDecimal.ZERO),policyQuote.policyVersion());
 }
 public void abort(UUID actor,UUID id){get(actor,id);abortTrusted(actor,id,"CUSTOMER_OR_STAFF_ABORT");}
 public void adminAbort(UUID actor,UUID id){abortTrusted(actor,id,"ADMIN_ABORT");}
 private void abortTrusted(UUID actor,UUID id,String reason){
  var op=trusted(id);
  if(!List.of("PREPARED","HELD","WAITING_FUNDS","ABORTING","ABORTED","ABORT_REFUND_PENDING").contains(op.state()))throw conflict("Đổi/hủy đã commit; cần theo dõi operation hiện tại");
  operations.requestAbort(id,actor,reason);process(id);
 }
 public boolean exists(UUID id){return operations.get(id)!=null;}
 public ItemOperationRepository.Operation trusted(UUID id){var operation=operations.get(id);if(operation==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND);return operation;}
 public ItemOperationRepository.Operation get(UUID actor,UUID id){var operation=trusted(id);var order=orders.findById(operation.plan().orderId()).orElseThrow();authorize(actor,order,operation.plan().oldTripId());if(operation.plan().newTripId()!=null && !actor.equals(order.getUserId()))authorize(actor,order,operation.plan().newTripId());return operation;}
 private void authorize(UUID actor,Order order,UUID trip){
  if(order.getOrderKind()!=OrderKind.GOCAR_TICKET)throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  if(actor.equals(order.getUserId()))return;
  var r=car.authorizeStaff(actor,trip,"SELL_CASH");if(r==null||!r.isSuccess()||r.getData()==null)throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  var scope=car.readScope(actor,null);if(scope==null||!scope.isSuccess()||scope.getData()==null||!scope.getData().ownerUserId().equals(order.getHostId()))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
 }
 public ItemOperationRepository.Operation request(UUID actor,UUID orderId,UUID itemId,String kind,Request request){return request(actor,orderId,itemId,kind,request,false);}
 public ItemOperationRepository.Operation request(UUID actor,UUID orderId,UUID itemId,String kind,Request r,boolean forced){
  if(r==null||r.operationId()==null||!List.of("CANCEL","EXCHANGE").contains(kind))throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  if("CANCEL".equals(kind) && (r.tripId()!=null || r.seatId()!=null || r.pickupStopId()!=null || r.dropoffStopId()!=null))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Hủy vé chỉ nhận operationId");
  var original=orders.findById(orderId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
  var item=original.getItems().stream().filter(i->i.getId().equals(itemId)).findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
  if(!forced)authorize(actor,original,item.getTransportTripId());
  String hash=hash(orderId+":"+itemId+":"+kind+":"+r.tripId()+":"+r.seatId()+":"+r.pickupStopId()+":"+r.dropoffStopId()+":"+forced);
  var replay=operations.get(r.operationId());if(replay!=null){if(!replay.plan().orderId().equals(orderId)||!replay.plan().itemId().equals(itemId)||!replay.plan().requestHash().equals(hash))throw conflict("operationId đã có payload khác");return replay;}
  TransportQuote quote=null;
  if("EXCHANGE".equals(kind)){
   if(r.tripId()==null||r.seatId()==null||r.pickupStopId()==null||r.dropoffStopId()==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
   if(!forced && !actor.equals(original.getUserId()))authorize(actor,original,r.tripId());
   var response=car.quote(new GoCarClient.QuoteRequest(r.tripId(),List.of(new TransportCheckoutRequest.Passenger(r.seatId(),item.getPassengerName(),r.pickupStopId(),r.dropoffStopId()))));
   quote=response==null||!response.isSuccess()?null:response.getData();
   if(quote==null||quote.seats()==null||quote.seats().size()!=1||!quote.seats().get(0).seatId().equals(r.seatId())||!original.getHostId().equals(quote.operatorUserId()))throw conflict("Chỉ đổi trong cùng nhà xe với quote tin cậy");
   if(!r.tripId().equals(quote.tripId()) || !"VND".equals(quote.currency()) || quote.quoteId()==null || quote.quoteHash()==null || quote.expiresAt()==null || !quote.expiresAt().isAfter(Instant.now()) || quote.departureAt()==null || !quote.departureAt().isAfter(Instant.now().plusSeconds(900)) || quote.totalAmount()==null || quote.totalAmount().signum()<=0 || quote.totalAmount().precision()>18 || quote.totalAmount().stripTrailingZeros().scale()>0 || quote.seats().get(0).price()==null || quote.totalAmount().compareTo(quote.seats().get(0).price())!=0)throw conflict("Báo giá đổi vé không hợp lệ hoặc chuyến quá gần giờ chạy");
  }
  var oldTrip=car.tripState(item.getTransportTripId());if(oldTrip==null||!oldTrip.isSuccess()||oldTrip.getData()==null)throw conflict("Không xác minh được chuyến gốc");
  UUID operatorId=oldTrip.getData().operatorId();if(operatorId==null)throw conflict("Không xác minh được operator");
  var receipt=cash.findReceipt(orderId);
  BigDecimal cashAmount=receipt==null?BigDecimal.ZERO:receipt.amount();
  // Capture the original commission snapshot, not the current fee configuration.
  var originalShift=receipt==null?null:cash.findShiftDetail(receipt.shiftId());
  TransportQuote frozenQuote=quote;
  var operation=tx.execute(status->{
   entityManager.clear();
   var order=orders.findByIdForUpdate(orderId).orElseThrow();
   var current=order.getItems().stream().filter(i->i.getId().equals(itemId)).findFirst().orElseThrow();
   var duplicate=operations.get(r.operationId());if(duplicate!=null){if(!duplicate.plan().orderId().equals(orderId)||!duplicate.plan().itemId().equals(itemId)||!duplicate.plan().requestHash().equals(hash))throw conflict("Operation payload khác");return duplicate;}
   if((order.getStatus()!=OrderStatus.CONFIRMED && !(forced&&List.of(OrderStatus.CANCELLATION_PENDING,OrderStatus.FULFILLMENT_PENDING,OrderStatus.CASH_RECEIVED_PENDING_RECONCILIATION).contains(order.getStatus())))||!"ACTIVE".equals(current.getTransportItemState())||current.getTransportTicketId()==null)throw conflict("Item chưa có vé có hiệu lực");
   if(!Objects.equals(current.getTransportTicketId(),item.getTransportTicketId())||!Objects.equals(current.getTransportTicketRevision(),item.getTransportTicketRevision())||!Objects.equals(current.getTransportSeatId(),item.getTransportSeatId()))throw conflict("Item vừa được sửa");
   int pending=store.unresolved(itemId,orderId);
   if(pending>0)throw conflict("Item/đơn đang có quy trình chưa kết thúc");
   BigDecimal old=current.getTotalPrice();BigDecimal fee=forced?BigDecimal.ZERO:policy.quoteAmount(order,current.getTransportDepartureAt(),old).fee();
   BigDecimal next=frozenQuote==null?BigDecimal.ZERO:frozenQuote.totalAmount();BigDecimal credit=old.subtract(fee);
   BigDecimal topup=next.subtract(credit).max(BigDecimal.ZERO),refund=credit.subtract(next).max(BigDecimal.ZERO);
   Instant expires=Instant.now().plusSeconds(900);
   var plan=new ItemOperationPlan(r.operationId(),orderId,itemId,actor,kind,hash,current.getTransportTicketId(),current.getTransportTicketRevision(),current.getTransportTripId(),current.getTransportSeatId(),
    r.tripId(),r.seatId(),current.getPassengerName(),r.pickupStopId(),r.dropoffStopId(),frozenQuote==null?null:frozenQuote.seats().get(0).code(),frozenQuote==null?null:frozenQuote.listingId(),frozenQuote==null?null:frozenQuote.routeTitle(),frozenQuote==null?null:frozenQuote.departureAt(),frozenQuote==null?null:frozenQuote.quoteId(),frozenQuote==null?null:frozenQuote.quoteHash(),
    operatorId,order.getHostId(),order.getUserId(),order.getPaymentMethod().name(),current.getTransportOriginalAmount()==null?old:current.getTransportOriginalAmount(),original.getTotalAmount(),old,next,fee,topup,refund,
    receipt==null?null:receipt.shiftId(),cashAmount,null,originalShift==null?null:originalShift.commissionVersion(),expires,forced);
   // Cash shift rate is read from immutable shift metadata; details return totals only.
   if(originalShift!=null){BigDecimal rate=store.commissionRate(originalShift.id());plan=new ItemOperationPlan(plan.operationId(),plan.orderId(),plan.itemId(),plan.actorId(),plan.kind(),plan.requestHash(),plan.oldTicketId(),plan.expectedRevision(),plan.oldTripId(),plan.oldSeatId(),plan.newTripId(),plan.newSeatId(),plan.passengerName(),plan.pickupStopId(),plan.dropoffStopId(),plan.newSeatCode(),plan.newListingId(),plan.newRouteTitle(),plan.newDepartureAt(),plan.quoteId(),plan.quoteHash(),plan.operatorId(),plan.ownerUserId(),plan.userId(),plan.paymentMethod(),plan.originalAmount(),plan.originalOrderAmount(),plan.oldAmount(),plan.newAmount(),plan.fee(),plan.topup(),plan.refundDue(),plan.originalCashShiftId(),plan.cashReceived(),rate,plan.commissionVersion(),plan.expiresAt(),forced);}
   current.setTransportItemState("OPERATION_PENDING");orders.save(order);return operations.insert(plan);
  });
  process(operation.plan().operationId());return trusted(operation.plan().operationId());
 }
 public void process(UUID id){
  for(int step=0;step<10;step++){
   var op=trusted(id);var p=op.plan();String state=op.state();
   try{
    if(List.of("PREPARED","HELD","WAITING_FUNDS").contains(state)&&!p.expiresAt().isAfter(Instant.now())){operations.transition(id,state,"ABORTING",null);continue;}
    switch(state){
     case "PREPARED" -> {
      if("EXCHANGE".equals(p.kind())){var claim=car.claimQuote(p.quoteId(),new GoCarClient.ClaimQuoteRequest(id,p.quoteHash()));if(claim==null||!claim.isSuccess())throw conflict("GoCar chưa claim báo giá đã lưu");}
      var held=downstream.inventory(p,"prepare");if(!List.of("HELD","COMMITTED").contains(held.state()))throw conflict("Inventory không giữ được ghế");downstream.ticket(id,"prepare");operations.transition(id,state,"HELD",null);}
     case "HELD" -> {var reserved=downstream.money(id,"reserve");if(!List.of("RESERVED","FUNDED").contains(reserved.state()))throw conflict("GoPay không reserve credit");operations.transition(id,state,"WAITING_FUNDS",null);}
     case "WAITING_FUNDS" -> {var money=downstream.money(id,"fund");if(!"FUNDED".equals(money.state()))return;operations.transition(id,state,"COMMITTING",null);}
     case "COMMITTING" -> {var inv=downstream.inventory(p,"commit");if(!List.of("COMMITTED","COMPLETED").contains(inv.state()))throw conflict("Inventory chưa commit");var ticket=downstream.ticket(id,"commit");if(!"COMMITTED".equals(ticket.state())||!p.oldTicketId().equals(ticket.ticketId())||ticket.revision()==null||ticket.revision()!=p.expectedRevision()+1)throw conflict("Ticket ACK không khớp");operations.transition(id,state,"TICKET_COMMITTED",json.writeValueAsString(ticket));}
     case "TICKET_COMMITTED" -> {var completed=downstream.inventory(p,"complete");if(!"COMPLETED".equals(completed.state()))throw conflict("Inventory chưa giải phóng ghế cũ");operations.transition(id,state,"SETTLING",null);}
     case "SETTLING" -> {var money=downstream.money(id,"commit");if(!List.of("COMMITTED","REFUND_PENDING","COMPLETED").contains(money.state()))throw conflict("GoPay chưa commit ledger");applyProjection(op);return;}
     case "ABORTING" -> {
      var ticket=downstream.ticket(id,"abort");if("COMMITTED".equals(ticket.state())){operations.transition(id,state,"TICKET_COMMITTED",json.writeValueAsString(ticket));continue;}
      try{downstream.inventory(p,"abort");}catch(feign.FeignException.NotFound notPrepared){}
      var money=downstream.money(id,"abort");String terminal="ABORT_REFUND_PENDING".equals(money.state())?"ABORT_REFUND_PENDING":"ABORTED";
      tx.executeWithoutResult(s->{entityManager.clear();var order=orders.findByIdForUpdate(p.orderId()).orElseThrow();if(!"ABORTING".equals(trusted(id).state()))return;var item=findItem(order,p.itemId());item.setTransportItemState("ACTIVE");orders.save(order);operations.transition(id,state,terminal,null);});return;
     }
     default -> {return;}
    }
   }catch(Exception error){
    // Permanent reserve/commit rejection can abort while the old ticket is still intact. Unknown HTTP outcome must be replayed.
    if(error instanceof feign.FeignException.Conflict && List.of("PREPARED","HELD","COMMITTING").contains(state)){operations.transition(id,state,"ABORTING",null);operations.retryLater(id,"SERVICE_REJECTED_"+state);}
    else operations.retryLater(id,error.getClass().getSimpleName());
    log.warn("Item operation {} retained in {}",id,trusted(id).state());return;
   }
  }
 }
 private OrderItem findItem(Order o,UUID id){return o.getItems().stream().filter(i->i.getId().equals(id)).findFirst().orElseThrow();}
 private void applyProjection(ItemOperationRepository.Operation operation)throws Exception {
  var p=operation.plan();var ticket=json.readValue(operation.resultJson(),ItemOperationIntegrations.Ticket.class);
  tx.executeWithoutResult(s->{
   entityManager.clear();var order=orders.findByIdForUpdate(p.orderId()).orElseThrow();
   var current=trusted(p.operationId());if(!"SETTLING".equals(current.state()))return;
   var item=findItem(order,p.itemId());
   if(item.getTransportTicketRevision()>ticket.revision())throw conflict("Projection đã vượt revision");
   item.setTransportTicketRevision(ticket.revision());
   if("EXCHANGE".equals(p.kind())){item.setTransportTripId(p.newTripId());item.setTransportSeatId(p.newSeatId());item.setTransportSeatCode(p.newSeatCode());item.setPickupStopId(p.pickupStopId());item.setDropoffStopId(p.dropoffStopId());item.setListingId(p.newListingId());item.setListingTitle(p.newRouteTitle());item.setUnitPrice(p.newAmount());item.setTotalPrice(p.newAmount());item.setTransportCheckInToken(ticket.checkInToken());item.setTransportDepartureAt(LocalDateTime.ofInstant(p.newDepartureAt(),VN));item.setStartDate(p.newDepartureAt().atZone(VN).toLocalDate());item.setEndDate(item.getStartDate());item.setTransportItemState("ACTIVE");}
   else{item.setTransportBoardingStatus("VOID");item.setTransportCheckInToken(null);item.setTransportItemState(p.refundDue().signum()>0?"REFUND_PENDING":"VOID");}
   orders.save(order);aggregate(order);operations.transition(p.operationId(),"SETTLING",p.refundDue().signum()>0?"REFUND_PENDING":"COMPLETED",null);
   store.notify(order,"EXCHANGE".equals(p.kind())?"TICKET":"CANCELLED",p.operationId().toString());
  });
 }
 private void aggregate(Order order){
  boolean active=order.getItems().stream().anyMatch(i->List.of("ACTIVE","OPERATION_PENDING").contains(i.getTransportItemState()));
  boolean refund=order.getItems().stream().anyMatch(i->"REFUND_PENDING".equals(i.getTransportItemState()));
  if(!active)order.setStatus(refund?OrderStatus.REFUND_PENDING:order.getItems().stream().anyMatch(i->"COMPLETED".equals(i.getTransportItemState()))?OrderStatus.COMPLETED:order.getItems().stream().anyMatch(i->i.getTransportRefundTotal().signum()>0)?OrderStatus.REFUNDED:OrderStatus.CANCELLED);else order.setStatus(OrderStatus.CONFIRMED);
  orders.save(order);
 }
 public void cashTopup(UUID actor,UUID id,BigDecimal amount,String reference){
  var op=get(actor,id);var p=op.plan();if(!"CASH".equals(p.paymentMethod())||amount==null||amount.compareTo(p.topup())!=0||amount.signum()<=0||reference==null||reference.isBlank()||reference.length()>160)throw conflict("Khoản thu chênh lệch không khớp");
  var authorization=car.authorizeStaff(actor,p.oldTripId(),"SELL_CASH");var shift=cash.active(actor);if(authorization==null||authorization.getData()==null||shift==null||!shift.operatorId().equals(p.operatorId()))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  tx.executeWithoutResult(s->{orders.findByIdForUpdate(p.orderId()).orElseThrow();var current=trusted(id);var existing=store.cashProof(id);
   if(!existing.isEmpty()){var proof=existing;if(amount.compareTo((BigDecimal)proof.get("amount"))!=0||!reference.trim().equals(proof.get("reference"))||!actor.equals(proof.get("actor_id")))throw conflict("Receipt đã có chứng cứ khác");return;}
   if(!"WAITING_FUNDS".equals(current.state())||!p.expiresAt().isAfter(Instant.now()))throw conflict("Hold hết hạn; không nhận tiền");
   boolean lockedShift=store.lockOpenShift(shift.id(),actor);
   if(!lockedShift)throw conflict("Ca thu tiền đã đóng");
   store.recordCash(id,shift.id(),actor,amount,reference.trim());
  });process(id);
 }
 public Map<String,Object> cashProof(UUID id){return store.cashProof(id);}
 public void refund(UUID admin,UUID id,BigDecimal amount,String reference,String evidence,String method,UUID cashShiftId){
  String refundMethod=method==null?"BANK_TRANSFER":method;
  String normalizedReference=reference==null?null:reference.trim();
  var op=trusted(id);if(!List.of("REFUND_PENDING","ABORT_REFUND_PENDING","COMPLETED","ABORTED").contains(op.state()))throw conflict("Operation chưa có nghĩa vụ hoàn");
  BigDecimal due="ABORT_REFUND_PENDING".equals(op.state())?op.plan().topup():op.plan().refundDue();
  var proof=store.refundProof(id);
  if(!proof.isEmpty()){var row=proof;if(amount==null||amount.compareTo((BigDecimal)row.get("amount"))!=0||!Objects.equals(normalizedReference,row.get("reference")) || !Objects.equals(refundMethod,row.get("refund_method")) || !Objects.equals(cashShiftId,row.get("shift_id"))||!Objects.equals(evidence,row.get("evidence_url"))||!admin.equals(row.get("actor_id")))throw conflict("Đã có chứng cứ hoàn khác");finishRefund(id);return;}
  if(amount==null||amount.compareTo(due)!=0||amount.signum()<=0||reference==null||reference.isBlank()||reference.length()>160||evidence==null||!evidence.startsWith("https://")||evidence.length()>1000)throw conflict("Chứng cứ hoàn tiền không hợp lệ");
  if(!List.of("BANK_TRANSFER","CASH").contains(refundMethod))throw conflict("Phương thức hoàn không hợp lệ");
  if("CASH".equals(refundMethod)){
    var shift=cash.active(admin);if(!"CASH".equals(op.plan().paymentMethod())||shift==null||!shift.id().equals(cashShiftId)||!shift.operatorId().equals(op.plan().operatorId()))throw conflict("Hoàn tại quầy cần ca tiền mặt của nhà xe đang mở");
    var authorized=car.authorizeStaff(admin,op.plan().oldTripId(),"SELL_CASH");if(authorized==null||authorized.getData()==null)throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  }else if(cashShiftId!=null)throw conflict("Hoàn chuyển khoản không ghi giảm quỹ ca tiền mặt");
  tx.executeWithoutResult(s->{
    orders.findByIdForUpdate(op.plan().orderId()).orElseThrow();
    if(cashShiftId!=null && !store.lockOpenShift(cashShiftId,admin))throw conflict("Ca đã đóng");
    store.recordRefund(id,admin,amount,reference.trim(),evidence,refundMethod,cashShiftId);
  });
  finishRefund(id);
 }
 private void finishRefund(UUID id){var op=trusted(id);var p=op.plan();var ack=downstream.money(id,"refund");if(!"COMPLETED".equals(ack.state())&&!"ABORTED".equals(ack.state()))throw conflict("GoPay chưa ghi chứng cứ");
  tx.executeWithoutResult(s->{entityManager.clear();var order=orders.findByIdForUpdate(p.orderId()).orElseThrow();var current=trusted(id);if(!List.of("REFUND_PENDING","ABORT_REFUND_PENDING").contains(current.state()))return;
   var item=findItem(order,p.itemId());item.setTransportRefundTotal(item.getTransportRefundTotal().add(ack.refundDue()));
   if("CANCEL".equals(p.kind())&&"REFUND_PENDING".equals(current.state()))findItem(order,p.itemId()).setTransportItemState("REFUNDED");aggregate(order);operations.transition(id,current.state(),"ABORT_REFUND_PENDING".equals(current.state())?"ABORTED":"COMPLETED",null);store.notify(order,"REFUNDED",id.toString());});
 }
 public Map<String,Object> refundProof(UUID id){return store.refundProof(id);}
 public List<ItemOperationRepository.Operation> attention(){return store.attentionIds().stream().map(this::trusted).toList();}
 public void adminRetry(UUID id){trusted(id);process(id);}
 public OrderPaymentSummaryResponse paymentSummary(UUID id){var op=trusted(id);var p=op.plan();if(!"ONLINE".equals(p.paymentMethod()))throw conflict("Tiền mặt chỉ nhận qua cash-topup; không tạo thanh toán online cho operation này");return OrderPaymentSummaryResponse.builder().orderId(id).userId(p.userId()).hostId(p.ownerUserId()).orderKind("GOCAR_EXCHANGE").providerType("TRANSPORT").totalAmount(p.topup()).currency("VND").status("WAITING_FUNDS".equals(op.state())?"PAYMENT_PENDING":"PAID_REVIEW").expiresAt(LocalDateTime.ofInstant(p.expiresAt(),VN)).providerBreakdowns(List.of(OrderPaymentSummaryResponse.ProviderBreakdown.builder().hostId(p.ownerUserId()).totalAmount(p.topup()).build())).build();}
 @Scheduled(fixedDelay=15000)public void recover(){operations.pending().forEach(this::process);for(UUID id:store.refundAckIds()){try{finishRefund(id);}catch(Exception e){operations.retryLater(id,"REFUND_ACK_PENDING");}}}
 private String hash(String s){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
}
