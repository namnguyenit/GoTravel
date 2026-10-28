package com.GoTravel.CartandOrder.transport.refund;
import com.GoTravel.CartandOrder.transport.adjustment.application.ItemOperationService;
import com.GoTravel.CartandOrder.transport.adjustment.domain.ItemOperationStore;
import com.GoTravel.CartandOrder.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.math.BigDecimal;
@Service @RequiredArgsConstructor
public class AutomaticRefundService {
 private final GoPayRefundClient pay;
 private final ItemOperationService operations;
 private final ItemOperationStore store;
 private final OrderRepository orders;
 private final JdbcTemplate jdbc;
 private final TransactionTemplate tx;
 private ResponseStatusException conflict(String s){return new ResponseStatusException(HttpStatus.CONFLICT,s);}
 private Map<String,Object> request(UUID id){return jdbc.queryForList("select * from transport_automatic_refund_requests where operation_id=?",id).stream().findFirst().orElse(null);}
 public GoPayRefundClient.Result status(UUID id){
  var response=pay.status(id);if(response==null||!response.isSuccess()||response.getData()==null||!id.equals(response.getData().operationId()))throw conflict("Chưa đọc được trạng thái hoàn từ GoPay.");
  var row=request(id);var data=response.getData();
  if(row!=null&&"COMPLETED".equals(row.get("state")))return new GoPayRefundClient.Result(id,"COMPLETED",false,data.amount(),data.provider(),data.message(),data.reference(),data.evidenceUrl(),data.environment(),data.simulated(),false);
  if(data.simulationEligible())return new GoPayRefundClient.Result(id,data.state(),data.eligible(),data.amount(),data.provider(),"Nguồn thu đã xác thực là VNPAY sandbox. Xác nhận bên dưới để hoàn mô phỏng đúng số tiền trong ứng dụng.",data.reference(),data.evidenceUrl(),data.environment(),false,true);
  return data;
 }
 public GoPayRefundClient.Result approve(UUID actor,UUID id,BigDecimal expected){
  var current=status(id);
  if(current.simulationEligible()||current.simulated()&&"VNPAY".equals(current.provider()))return simulate(actor,id,expected);
  register(actor,id,expected,"PROVIDER");process(id);return status(id);
 }
 public GoPayRefundClient.Result simulate(UUID actor,UUID id,BigDecimal expected){
  var current=status(id);
  if(!"VNPAY".equals(current.provider())||!current.simulated()&&!current.simulationEligible())throw conflict("Hồ sơ chưa được phép hoàn mô phỏng trên sandbox.");
  register(actor,id,expected,"SIMULATION");process(id);return status(id);
 }
 private void register(UUID actor,UUID id,BigDecimal expected,String mode){
  var op=operations.trusted(id);BigDecimal due=op.state().startsWith("ABORT")?op.plan().topup():op.plan().refundDue();
  if(expected==null||expected.signum()<=0||expected.stripTrailingZeros().scale()>0||expected.compareTo(due)!=0)throw conflict("Số tiền xác nhận phải bằng đúng số phải hoàn của hồ sơ.");
  tx.executeWithoutResult(s->{
   orders.findByIdForUpdate(op.plan().orderId()).orElseThrow();var current=request(id);
   if(current!=null){
    if(expected.compareTo((BigDecimal)current.get("amount"))!=0)throw conflict("Số tiền khác yêu cầu đã duyệt.");
    if("SIMULATION".equals(mode)&&!"COMPLETED".equals(current.get("state")))jdbc.update("update transport_automatic_refund_requests set execution_mode='SIMULATION',actor_id=?,state='REQUESTED',updated_at=now() where operation_id=?",actor,id);
    return;
   }
   var fresh=operations.trusted(id);
   if(!List.of("REFUND_PENDING","ABORT_REFUND_PENDING").contains(fresh.state())||!store.refundProof(id).isEmpty())throw conflict("Hồ sơ không còn chờ hoàn hoặc đã có chứng từ hoàn.");
   jdbc.update("insert into transport_automatic_refund_requests(operation_id,actor_id,amount,execution_mode) values(?,?,?,?)",id,actor,expected,mode);
  });
 }
 private void process(UUID id){
  var row=request(id);if(row==null||List.of("COMPLETED","FAILED","MANUAL_REQUIRED","REVIEW").contains(row.get("state")))return;
  try{
   var approval=new GoPayRefundClient.Approval((UUID)row.get("actor_id"),(BigDecimal)row.get("amount"));
   var response="SIMULATION".equals(row.get("execution_mode"))?pay.simulate(id,approval):pay.execute(id,approval);
   var result=response==null||!response.isSuccess()?null:response.getData();
   if(result==null||!id.equals(result.operationId())||result.amount()==null||result.amount().compareTo((BigDecimal)row.get("amount"))!=0)throw conflict("Kết quả hoàn không khớp hồ sơ.");
   if("SUCCEEDED".equals(result.state())){
    operations.refundAutomatic((UUID)row.get("actor_id"),id,result.amount(),result.reference(),result.evidenceUrl(),result.simulated());
    jdbc.update("update transport_automatic_refund_requests set state='COMPLETED',provider=?,message=?,updated_at=now() where operation_id=?",result.provider(),result.message(),id);
   }else jdbc.update("update transport_automatic_refund_requests set state=?,provider=?,message=?,updated_at=now() where operation_id=?",List.of("FAILED","REVIEW","MANUAL_REQUIRED").contains(result.state())?result.state():"PENDING",result.provider(),result.message(),id);
  }catch(feign.FeignException e){
   jdbc.update("update transport_automatic_refund_requests set state=?,message=?,updated_at=now() where operation_id=?",e.status()==409?"MANUAL_REQUIRED":"PENDING",e.status()==409?"GoPay chưa cho phép hoàn tự động hồ sơ này. Xem kiểm tra điều kiện và đối soát nguồn thu.":"Chưa nhận kết quả chắc chắn từ GoPay; đang tiếp tục đối soát, không tạo lệnh mới.",id);
  }catch(Exception e){jdbc.update("update transport_automatic_refund_requests set state='PENDING',message='Đang đối soát kết quả hoàn và cập nhật vé; không gửi yêu cầu chi tiền khác.',updated_at=now() where operation_id=?",id);}
 }
 @Scheduled(fixedDelay=15000) public void recover(){for(UUID id:jdbc.query("select operation_id from transport_automatic_refund_requests where state in ('REQUESTED','PENDING') order by updated_at limit 10",(rs,r)->rs.getObject(1,UUID.class)))process(id);}
}
