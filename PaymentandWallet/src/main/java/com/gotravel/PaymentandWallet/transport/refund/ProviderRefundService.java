package com.gotravel.PaymentandWallet.transport.refund;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gotravel.PaymentandWallet.client.OrderClient;
import com.gotravel.PaymentandWallet.transport.domain.ItemOperationPlan;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;

@Service @RequiredArgsConstructor
public class ProviderRefundService {
    private final JdbcTemplate jdbc;
    private final OrderClient cart;
    private final ProviderRefundGateway gateway;
    private final TransactionTemplate tx;
    private final ObjectMapper json;
    @Value("${transport.refunds.public-base-url:https://gocar.nonnet123.io.vn}") private String publicBase;
    @Value("${transport.refunds.vnpay-poll-seconds:300}") private int vnpayPollSeconds=300;
    public record Result(UUID operationId,String state,boolean eligible,
        @com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal amount,
        String provider,String message,String reference,String evidenceUrl,String environment,boolean simulated,boolean simulationEligible) {
        public Result(UUID id,String state,boolean eligible,BigDecimal amount,String provider,String message,String reference,String evidence,String environment){this(id,state,eligible,amount,provider,message,reference,evidence,environment,false,false);}
    }
    private record Source(Map<String,Object> payment,BigDecimal amount) {}
    private record Attempt(Map<String,Object> leg,Map<String,Object> payment,boolean first) {}
    private ResponseStatusException conflict(String text){return new ResponseStatusException(HttpStatus.CONFLICT,text);}
    private Map<String,Object> job(UUID id){return jdbc.queryForList("select * from transport_provider_refund_jobs where operation_id=?",id).stream().findFirst().orElse(null);}
    private List<Map<String,Object>> legs(UUID id){return jdbc.queryForList("select * from transport_provider_refund_legs where operation_id=? order by id",id);}
    private Map<String,Object> simulation(UUID id){return id==null?null:jdbc.queryForList("select * from transport_provider_refund_simulations where operation_id=?",id).stream().findFirst().orElse(null);}
    private boolean simulationAllowed(List<Map<String,Object>> legs){
        return !legs.isEmpty()&&legs.stream().noneMatch(l->"SUCCEEDED".equals(l.get("state")))
            &&legs.stream().allMatch(l->"VNPAY".equals(l.get("provider"))&&gateway.sandboxSimulationAllowed(jdbc.queryForMap("select * from payment_requests where id=?",l.get("payment_id"))));
    }
    private void lock(UUID id){jdbc.query("select pg_advisory_xact_lock(hashtextextended(?,0))",rs->null,id.toString());}
    private ItemOperationPlan plan(UUID id) {
        var response=cart.itemOperation(id);
        if(response==null||!response.isSuccess()||response.getData()==null||!id.equals(response.getData().plan().operationId()))throw conflict("Chưa lấy được hồ sơ hoàn tin cậy từ Cart.");
        return response.getData().plan();
    }
    private BigDecimal liability(ItemOperationPlan p) {
        var rows=jdbc.queryForList("select * from transport_item_money_operations where operation_id=?",p.operationId());
        if(rows.size()!=1)throw conflict("GoPay chưa có nghĩa vụ hoàn tương ứng.");
        var row=rows.get(0);String state=String.valueOf(row.get("state"));
        if(!List.of("REFUND_PENDING","ABORT_REFUND_PENDING").contains(state))throw conflict("Nghĩa vụ này đã hoàn hoặc chưa đủ điều kiện hoàn.");
        BigDecimal due=(BigDecimal)row.get("refund_due"),expected=state.startsWith("ABORT")?p.topup():p.refundDue();
        if(due==null||due.signum()<=0||due.stripTrailingZeros().scale()>0||due.compareTo(expected)!=0)throw conflict("Số phải hoàn không khớp giữa Cart và GoPay.");
        return due;
    }
    private List<Source> sources(ItemOperationPlan p,BigDecimal due) {return sources(p,due,false);}
    private List<Source> sources(ItemOperationPlan p,BigDecimal due,boolean forSimulation) {
        if(!"ONLINE".equals(p.paymentMethod()))throw conflict("Vé tiền mặt phải hoàn tại quầy hoặc xác nhận chuyển khoản theo chứng từ; không hoàn qua cổng online.");
        var money=jdbc.queryForMap("select state from transport_item_money_operations where operation_id=?",p.operationId());
        var allocation=new LinkedHashMap<UUID,BigDecimal>();
        if(String.valueOf(money.get("state")).startsWith("ABORT"))allocation.put(p.operationId(),due);
        else {
            var rows=jdbc.queryForList("select payment_order_id,method,sum(amount) amount from transport_operation_refund_sources where operation_id=? group by payment_order_id,method",p.operationId());
            if(rows.isEmpty()) {
                Integer mixed=jdbc.queryForObject("select count(*) from transport_item_fund_lots where item_id=? and (source_operation_id is not null or cash_shift_id is not null)",Integer.class,p.itemId());
                if(mixed!=null&&mixed>0)throw conflict("Hồ sơ cũ có nhiều nguồn tiền nhưng thiếu phân bổ hoàn; cần đối soát để tránh hoàn nhầm giao dịch.");
                allocation.put(p.orderId(),due);
            } else for(var row:rows) {
                if(!"ONLINE".equals(row.get("method"))||row.get("payment_order_id")==null)throw conflict("Khoản hoàn gồm tiền mặt; cần xử lý theo từng nguồn thu.");
                allocation.merge((UUID)row.get("payment_order_id"),(BigDecimal)row.get("amount"),BigDecimal::add);
            }
        }
        if(allocation.values().stream().reduce(BigDecimal.ZERO,BigDecimal::add).compareTo(due)!=0)throw conflict("Phân bổ nguồn hoàn không bằng tổng số phải hoàn.");
        var result=new ArrayList<Source>();
        for(var entry:allocation.entrySet()) {
            var payments=jdbc.queryForList("select * from payment_requests where order_id=?",entry.getKey());
            if(payments.size()!=1)throw conflict("Không xác định được giao dịch đã thu gốc.");
            var payment=payments.get(0);
            if(!"COMPLETED".equals(payment.get("status"))||payment.get("paid_at")==null||!p.userId().equals(payment.get("user_id"))||!p.ownerUserId().equals(payment.get("host_id"))||!List.of("GOCAR_TICKET","GOCAR_EXCHANGE").contains(payment.get("order_kind")))throw conflict("Nguồn thu chưa xác nhận hoặc không thuộc đúng khách/nhà xe.");
            String unavailable=gateway.unavailable(payment);if(unavailable!=null&&!(forSimulation&&gateway.sandboxSimulationAllowed(payment)))throw conflict(unavailable);
            // Completed source allocations and still-reserved provider legs both consume the source budget.
            BigDecimal used=jdbc.queryForObject("select coalesce(sum(s.amount),0) from transport_operation_refund_sources s where s.payment_order_id=? and exists(select 1 from transport_item_money_events e where e.operation_id=s.operation_id and e.kind='REFUND')",BigDecimal.class,entry.getKey());
            if(entry.getKey().equals(p.orderId()))used=used.add(jdbc.queryForObject("select coalesce(sum(e.amount),0) from transport_item_money_events e join transport_item_money_operations m on m.operation_id=e.operation_id join transport_item_accounts a on a.item_id=m.item_id where e.kind='REFUND' and a.order_id=? and not exists(select 1 from transport_operation_refund_sources s where s.operation_id=e.operation_id)",BigDecimal.class,p.orderId()));
            used=used.add(jdbc.queryForObject("select coalesce(sum(l.amount),0) from transport_provider_refund_legs l where l.payment_id=? and l.operation_id<>? and l.state<>'FAILED' and not exists(select 1 from transport_item_money_events e where e.operation_id=l.operation_id and e.kind='REFUND')",BigDecimal.class,payment.get("id"),p.operationId()));
            if(used.add(entry.getValue()).compareTo((BigDecimal)payment.get("amount"))>0)throw conflict("Số hoàn vượt phần còn lại của giao dịch thanh toán gốc.");
            result.add(new Source(payment,entry.getValue()));
        }
        return result;
    }
    public Result status(UUID id) {
        var current=job(id);if(current!=null)return result(current);
        var p=plan(id);BigDecimal due=p.refundDue();
        try{due=liability(p);var source=sources(p,due,true);boolean simulation=source.stream().allMatch(s->gateway.sandboxSimulationAllowed(s.payment()));return new Result(id,"AVAILABLE",source.stream().allMatch(s->gateway.unavailable(s.payment())==null),due,provider(source),simulation?"Có thể hoàn mô phỏng đúng số phải hoàn; không gửi lệnh hoàn đến VNPAY.":"Hoàn theo nghĩa vụ được xác nhận.",null,null,gateway.environment(provider(source)),false,simulation);}
        catch(ResponseStatusException e){return new Result(id,"MANUAL_REQUIRED",false,due,null,e.getReason(),null,null,null);}
    }
    private String provider(List<Source> sources){return sources.stream().map(s->s.payment().get("provider")==null?"SEPAY":String.valueOf(s.payment().get("provider"))).distinct().sorted().collect(java.util.stream.Collectors.joining(" + "));}
    private Attempt claim(Object legId,Object paymentId) {
        return tx.execute(s->{
            // Lock the original payment before its legs: two ticket operations may share
            // one VNPAY transaction. A leg lease alone cannot serialize those operations.
            var payment=jdbc.queryForMap("select * from payment_requests where id=? for update",paymentId);
            var leg=jdbc.queryForMap("select * from transport_provider_refund_legs where id=? for update",legId);
            if(simulation((UUID)leg.get("operation_id"))!=null)return null;
            if(!List.of("PREPARED","PENDING","SENDING").contains(String.valueOf(leg.get("state"))))return null;
            boolean first=leg.get("submitted_at")==null;
            if("VNPAY".equals(leg.get("provider"))) {
                Integer occupied=jdbc.queryForObject("select count(*) from transport_provider_refund_legs where payment_id=? and id<>? and (lease_until>now() or (? and submitted_at is not null and state in ('SENDING','PENDING')))",Integer.class,paymentId,legId,first);
                if(occupied!=null&&occupied>0) {
                    if(first)jdbc.update("update transport_provider_refund_legs set message='Đang chờ khoản hoàn trước trên cùng giao dịch thanh toán có kết quả; chưa gửi thêm lệnh hoàn.',next_attempt_at=greatest(next_attempt_at,now()+interval '30 seconds') where id=?",legId);
                    return null;
                }
                // VNPAY limits queries on the original transaction, not on our ticket ID.
                var blocked=jdbc.queryForList("select max(next_attempt_at) retry_at from transport_provider_refund_legs where payment_id=? and id<>? and submitted_at is not null and next_attempt_at>now()",paymentId,legId);
                if(blocked.get(0).get("retry_at")!=null) {
                    jdbc.update("update transport_provider_refund_legs set next_attempt_at=greatest(next_attempt_at,?) where id=?",blocked.get(0).get("retry_at"),legId);
                    return null;
                }
            }
            int updated=jdbc.update("update transport_provider_refund_legs set lease_until=now()+interval '45 seconds' where id=? and state in ('PREPARED','PENDING','SENDING') and next_attempt_at<=now() and (lease_until is null or lease_until<now())",legId);
            if(updated!=1)return null;
            if(first) {
                String payload;
                try{payload=json.writeValueAsString(gateway.request(leg,payment));}catch(Exception e){throw conflict("Không tạo được lệnh hoàn.");}
                // Persist the submission intent in the SAME transaction as the claim.
                // The next worker must query this attempt, never submit a stale copy.
                jdbc.update("update transport_provider_refund_legs set request_json=?,submitted_at=now(),state='SENDING',updated_at=now() where id=?",payload,legId);
                leg=new LinkedHashMap<>(leg);leg.put("request_json",payload);
            }
            return new Attempt(leg,payment,first);
        });
    }
    private void prepare(ItemOperationPlan p,UUID actor,BigDecimal expected) {prepare(p,actor,expected,false);}
    private void prepare(ItemOperationPlan p,UUID actor,BigDecimal expected,boolean forSimulation) {
        UUID id=p.operationId();
        if(actor==null||expected==null||expected.signum()<=0||expected.stripTrailingZeros().scale()>0)throw conflict("Thiếu người duyệt hoặc số tiền xác nhận hợp lệ.");
        tx.executeWithoutResult(s->{
            lock(p.orderId());
            var current=job(id);
            if(current!=null){if(expected.compareTo((BigDecimal)current.get("amount"))!=0)throw conflict("Số tiền khác yêu cầu đã duyệt.");return;}
            var due=liability(p);if(due.compareTo(expected)!=0)throw conflict("Số tiền xác nhận không bằng số phải hoàn của vé.");
            var source=sources(p,due,forSimulation);
            jdbc.update("insert into transport_provider_refund_jobs(operation_id,order_id,actor_id,amount) values(?,?,?,?)",id,p.orderId(),actor,due);
            for(var item:source){
                UUID legId=UUID.nameUUIDFromBytes((id+":"+item.payment().get("id")).getBytes(java.nio.charset.StandardCharsets.UTF_8));
                jdbc.update("insert into transport_provider_refund_legs(id,operation_id,payment_id,amount,provider,request_id) values(?,?,?,?,?,?)",legId,id,item.payment().get("id"),item.amount(),item.payment().get("provider")==null?"SEPAY":item.payment().get("provider"),legId.toString().replace("-",""));
            }
        });
    }
    public Result simulate(UUID id,UUID actor,BigDecimal expected) {
        var p=plan(id);
        if(actor==null||expected==null||expected.signum()<=0||expected.stripTrailingZeros().scale()>0)throw conflict("Thiếu người duyệt hoặc số tiền xác nhận hợp lệ.");
        tx.executeWithoutResult(s->{
            lock(p.orderId());
            var existing=simulation(id);
            if(existing!=null){if(expected.compareTo((BigDecimal)existing.get("amount"))!=0)throw conflict("Số tiền khác lần hoàn mô phỏng đã duyệt.");return;}
            BigDecimal due=liability(p);if(due.compareTo(expected)!=0)throw conflict("Số tiền mô phỏng phải bằng đúng nghĩa vụ hoàn.");
            var source=sources(p,due,true);
            if(source.isEmpty()||source.stream().anyMatch(item->!gateway.sandboxSimulationAllowed(item.payment())))throw conflict("Chỉ được mô phỏng khi máy chủ đã bật tính năng và mọi giao dịch gốc đều là VNPAY sandbox đã thanh toán thành công.");
            // Claim uses the same payment-before-leg lock order. Reject an in-flight
            // call rather than race its result with a simulation approval.
            source.stream().map(item->(UUID)item.payment().get("id")).sorted().forEach(paymentId->jdbc.queryForMap("select id from payment_requests where id=? for update",paymentId));
            prepare(p,actor,expected,true);
            var currentLegs=jdbc.queryForList("select * from transport_provider_refund_legs where operation_id=? order by id for update",id);
            if(!simulationAllowed(currentLegs))throw conflict("Khoản hoàn này không còn đủ điều kiện mô phỏng hoặc đã có phần hoàn thành qua cổng.");
            Boolean busy=jdbc.queryForObject("select exists(select 1 from transport_provider_refund_legs where operation_id=? and lease_until>now())",Boolean.class,id);
            if(Boolean.TRUE.equals(busy))throw conflict("Đang tra cứu VNPAY. Đợi vài giây rồi xác nhận mô phỏng lại.");
            var snapshot=new ArrayList<Map<String,Object>>();
            for(var leg:currentLegs){var entry=new LinkedHashMap<String,Object>();for(String key:List.of("id","provider","state","provider_ref","response_json"))entry.put(key,leg.get(key));snapshot.add(entry);}
            String audit;try{audit=json.writeValueAsString(snapshot);}catch(Exception e){throw conflict("Không lưu được bằng chứng mô phỏng.");}
            jdbc.update("insert into transport_provider_refund_simulations(operation_id,actor_id,amount,provider_snapshot) values(?,?,?,?)",id,actor,due,audit);
            jdbc.update("update transport_provider_refund_jobs set state='SIMULATED',message='Đã xác nhận hoàn mô phỏng trên sandbox; không phải kết quả duyệt của VNPAY.',updated_at=now() where operation_id=?",id);
        });
        return result(job(id));
    }
    public Result execute(UUID id,UUID actor,BigDecimal expected) {
        var p=plan(id);prepare(p,actor,expected);
        if(simulation(id)!=null)return result(job(id));
        // One network call per request keeps approval bounded; Cart's durable worker continues other legs.
        for(var leg:legs(id)) {
            if(!List.of("PREPARED","PENDING","SENDING").contains(String.valueOf(leg.get("state"))))continue;
            Object legId=leg.get("id");
            var attempt=claim(legId,leg.get("payment_id"));if(attempt==null)continue;
            leg=attempt.leg();var payment=attempt.payment();boolean first=attempt.first();
            var reply=gateway.execute(leg,payment,first);
            // Keep every observation, including an unsigned rate-limit response, separately
            // from the latest summary so a later poll cannot erase the acceptance evidence.
            Boolean verified=null;
            if(reply.response()!=null)try{
                var body=json.readTree(reply.response());
                if(body.has("_signatureVerified"))verified=body.get("_signatureVerified").asBoolean();
            }catch(Exception ignored){ /* Network errors have no parseable provider body. */ }
            jdbc.update("insert into transport_provider_refund_observations(id,leg_id,kind,state,message,response_json,signature_verified) values(?,?,?,?,?,?,?)",UUID.randomUUID(),legId,first?"SUBMIT":"POLL",reply.state(),reply.message(),reply.response(),verified);
            int delay="VNPAY".equals(leg.get("provider"))?Math.min(3600,Math.max(300,vnpayPollSeconds)):30;
            jdbc.update("update transport_provider_refund_legs set state=?,provider_ref=coalesce(?,provider_ref),response_json=coalesce(?,response_json),message=?,lease_until=null,next_attempt_at=now()+(? * interval '1 second'),updated_at=now() where id=?",reply.state(),reply.reference(),reply.response(),reply.message(),delay,legId);
            break;
        }
        var result=result(job(id));
        jdbc.update("update transport_provider_refund_jobs set state=?,message=?,updated_at=now() where operation_id=?",result.state(),result.message(),id);
        return result;
    }
    private Result result(Map<String,Object> current) {
        UUID id=(UUID)current.get("operation_id");var legs=legs(id);
        if(simulation(id)!=null){String reference="AUTO-SANDBOX-SIM-REFUND-"+id;
            return new Result(id,"SUCCEEDED",false,(BigDecimal)current.get("amount"),"VNPAY","Đã hoàn mô phỏng để kiểm thử. Không chuyển tiền và không thay đổi trạng thái trên VNPAY.",reference,publicBase.replaceAll("/+$","")+"/api/v1/orders/transport/admin/item-operations/"+id+"/automatic-refund","SANDBOX",true,false);}
        boolean all= !legs.isEmpty()&&legs.stream().allMatch(l->"SUCCEEDED".equals(l.get("state"))),some=legs.stream().anyMatch(l->"SUCCEEDED".equals(l.get("state"))),failed=legs.stream().anyMatch(l->"FAILED".equals(l.get("state")));
        boolean pending=legs.stream().anyMatch(l->!List.of("SUCCEEDED","FAILED").contains(String.valueOf(l.get("state"))));
        String state=all?"SUCCEEDED":pending?"PENDING":some?"REVIEW":"FAILED";
        String provider=legs.stream().map(l->String.valueOf(l.get("provider"))).distinct().sorted().collect(java.util.stream.Collectors.joining(" + "));
        String message=all?("MOCK".equals(provider)?"Đã hoàn mô phỏng qua GoPay; không chuyển tiền ngân hàng.":"Cổng thanh toán xác nhận đã hoàn đủ số tiền."):failed?(some?"Một phần đã hoàn, phần khác lỗi. Cần đối soát từng nguồn; không hoàn lại toàn bộ.":"Cổng thanh toán chưa hoàn thành khoản hoàn. Xem lỗi giao dịch và đối soát trước khi xử lý thủ công."):legs.stream().map(l->(String)l.get("message")).filter(Objects::nonNull).findFirst().orElse("Yêu cầu đang xử lý, không bấm hoàn thủ công đồng thời.");
        if("FAILED".equals(state))message=legs.stream().filter(l->"FAILED".equals(l.get("state"))).map(l->String.valueOf(l.get("message"))).findFirst().orElse(message);
        String reference=("MOCK".equals(provider)?"AUTO-MOCK-REFUND-":"AUTO-REFUND-")+id;
        return new Result(id,state,false,(BigDecimal)current.get("amount"),provider,message,all?reference:null,all?publicBase.replaceAll("/+$","")+"/api/v1/orders/transport/admin/item-operations/"+id+"/automatic-refund":null,gateway.environment(provider),"MOCK".equals(provider)&&all,!all&&simulationAllowed(legs));
    }
    public void assertProofAllowed(UUID id,String reference) {
        var job=job(id);if(job==null)return;var result=result(job);
        if("FAILED".equals(result.state()))return;
        if(!"SUCCEEDED".equals(result.state())||!Objects.equals(reference,result.reference()))throw conflict("Đang có lệnh hoàn qua cổng hoặc một phần đã chi. Không được xác nhận hoàn thủ công toàn bộ.");
    }
}
