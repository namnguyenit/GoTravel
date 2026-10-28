package com.GoTravel.CartandOrder.transport.refund;
import com.GoTravel.CartandOrder.repository.OrderRepository;
import com.GoTravel.CartandOrder.transport.TransportOrderService;
import com.GoTravel.CartandOrder.enums.OrderKind;
import com.GoTravel.CartandOrder.enums.OrderStatus;
import com.GoTravel.CartandOrder.enums.PaymentMethod;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;

@Service @RequiredArgsConstructor @lombok.extern.slf4j.Slf4j
public class OrderRefundSimulationService {
 private final GoPayRefundClient pay;
 private final JdbcTemplate jdbc;
 private final OrderRepository orders;
 private final TransportOrderService service;
 private final TransactionTemplate tx;
 private ResponseStatusException conflict(String s){return new ResponseStatusException(HttpStatus.CONFLICT,s);}
 private Map<String,Object> request(UUID id){return jdbc.queryForList("select * from transport_order_refund_requests where order_id=?",id).stream().findFirst().orElse(null);}
 public GoPayRefundClient.Result status(UUID id){
  var response=pay.orderStatus(id);if(response==null||!response.isSuccess()||response.getData()==null||!id.equals(response.getData().operationId()))throw conflict("Chưa đọc được trạng thái từ GoPay. Thử tải lại.");
  var r=response.getData();var request=request(id);
  if(request!=null&&"COMPLETED".equals(request.get("state")))return new GoPayRefundClient.Result(id,"COMPLETED",false,r.amount(),r.provider(),r.message(),r.reference(),r.evidenceUrl(),r.environment(),r.simulated(),false);
  if(request!=null&&List.of("REQUESTED","PENDING").contains(request.get("state")))return new GoPayRefundClient.Result(id,"PENDING",false,(BigDecimal)request.get("amount"),r.provider(),String.valueOf(request.get("message")),r.reference(),r.evidenceUrl(),r.environment(),r.simulated(),false);
  return r;
 }
 public GoPayRefundClient.Result simulate(UUID actor,UUID id,BigDecimal amount){
  if(amount==null||amount.signum()<=0||amount.stripTrailingZeros().scale()>0)throw conflict("Số tiền xác nhận không hợp lệ.");
  tx.executeWithoutResult(s->{
   var order=orders.findByIdForUpdate(id).orElseThrow(()->conflict("Không tìm thấy đơn."));
   var saved=request(id);
   if(saved!=null){
    if(amount.compareTo((BigDecimal)saved.get("amount"))!=0)throw conflict("Số tiền khác yêu cầu đã duyệt.");
    if("REVIEW".equals(saved.get("state")))jdbc.update("update transport_order_refund_requests set state='REQUESTED',message='Đang kiểm tra lại điều kiện hoàn mô phỏng.',updated_at=now() where order_id=?",id);
    return;
   }
   if(order.getOrderKind()!=OrderKind.GOCAR_TICKET||order.getPaymentMethod()!=PaymentMethod.ONLINE||order.getStatus()!=OrderStatus.REFUND_PENDING||order.getTransportRefundDue()==null||amount.compareTo(order.getTransportRefundDue())!=0)throw conflict("Đơn chưa đủ điều kiện hoàn hoặc số tiền đã thay đổi.");
   if(jdbc.queryForObject("select count(*) from transport_item_operations where order_id=? and state not in ('COMPLETED','ABORTED')",Integer.class,id)>0)throw conflict("Hãy xử lý khoản hoàn từng vé của đơn.");
   jdbc.update("insert into transport_order_refund_requests(order_id,actor_id,amount,message) values(?,?,?,'Đang ghi nhận hoàn mô phỏng.')",id,actor,amount);
  });
  process(id);return status(id);
 }
 private void process(UUID id){
  var row=request(id);if(row==null||!List.of("REQUESTED","PENDING").contains(row.get("state")))return;
  try {
   var response=pay.simulateOrder(id,new GoPayRefundClient.Approval((UUID)row.get("actor_id"),(BigDecimal)row.get("amount")));
   var r=response==null||!response.isSuccess()?null:response.getData();
   if(r==null||!id.equals(r.operationId())||!r.simulated()||!"SUCCEEDED".equals(r.state())||r.amount().compareTo((BigDecimal)row.get("amount"))!=0)throw conflict("GoPay chưa xác nhận đúng khoản hoàn mô phỏng.");
   service.completeSimulatedRefund((UUID)row.get("actor_id"),id,r.amount(),r.reference(),r.evidenceUrl());
   jdbc.update("update transport_order_refund_requests set state='COMPLETED',message=?,updated_at=now() where order_id=?",r.message(),id);
  }catch(feign.FeignException e){jdbc.update("update transport_order_refund_requests set state=?,message=?,updated_at=now() where order_id=?",e.status()==409?"REVIEW":"PENDING",e.status()==409?"Khoản hoàn chưa đủ điều kiện mô phỏng. Mở lại để xem lý do.":"Đang đồng bộ kết quả hoàn mô phỏng; hệ thống sẽ tự tiếp tục.",id);}
  catch(Exception e){log.warn("Order refund sync {} failed: {}: {}",id,e.getClass().getSimpleName(),e.getMessage());jdbc.update("update transport_order_refund_requests set state='PENDING',message='Đang đồng bộ kết quả hoàn mô phỏng; không tạo lệnh chi tiền.',updated_at=now() where order_id=?",id);}
 }
 @Scheduled(fixedDelay=15000) public void recover(){for(UUID id:jdbc.query("select order_id from transport_order_refund_requests where state in ('REQUESTED','PENDING') order by updated_at limit 10",(rs,n)->rs.getObject(1,UUID.class)))process(id);}
}
