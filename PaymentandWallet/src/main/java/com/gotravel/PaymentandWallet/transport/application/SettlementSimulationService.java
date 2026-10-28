package com.gotravel.PaymentandWallet.transport.application;

import com.gotravel.PaymentandWallet.entity.HostPayout;
import com.gotravel.PaymentandWallet.enums.PayoutStatus;
import com.gotravel.PaymentandWallet.repository.HostPayoutRepository;
import com.gotravel.PaymentandWallet.service.HostPayoutService;
import com.gotravel.PaymentandWallet.service.PaymentService;
import com.gotravel.PaymentandWallet.transport.refund.ProviderRefundGateway;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;

/** Application-only settlement; never calls a provider or transfers bank money. */
@Service @RequiredArgsConstructor
public class SettlementSimulationService {
    private final JdbcTemplate jdbc;
    private final HostPayoutRepository payouts;
    private final HostPayoutService finance;
    private final PaymentService payments;
    private final ProviderRefundGateway gateway;
    @Value("${transport.settlement-simulation-enabled:false}") private boolean enabled;
    @Value("${transport.refunds.public-base-url:https://gocar.nonnet123.io.vn}") private String publicBase;

    public record Result(UUID id,String state,boolean simulated,
        @com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal amount,
        String reference,String message) {}
    private ResponseStatusException conflict(String text){return new ResponseStatusException(HttpStatus.CONFLICT,text);}
    public boolean enabled(){return enabled&&"SANDBOX".equals(gateway.environment("VNPAY"));}
    private void requireEnabled(){if(!enabled())throw conflict("Mô phỏng quyết toán chưa bật hoặc hệ thống không ở môi trường sandbox.");}
    private void validAmount(UUID actor,BigDecimal amount){if(actor==null||amount==null||amount.signum()<0||amount.stripTrailingZeros().scale()>0)throw conflict("Số tiền xác nhận không hợp lệ.");}
    private Map<String,Object> audit(String kind,UUID id){return jdbc.queryForList("select * from transport_settlement_simulations where kind=? and target_id=?",kind,id).stream().findFirst().orElse(null);}
    private Result done(UUID id,Map<String,Object> saved){return new Result(id,"COMPLETED",true,(BigDecimal)saved.get("amount"),String.valueOf(saved.get("reference")),"Đã ghi nhận quyết toán mô phỏng. Không chuyển tiền ngân hàng.");}
    private void match(BigDecimal expected,BigDecimal actual){if(expected.compareTo(actual)!=0)throw conflict("Số tiền đã thay đổi. Tải lại hồ sơ và xác nhận đúng số tiền mới.");}
    private HostPayout lockPayout(UUID id){
        var candidate=payouts.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy khoản chi."));
        if(!"TRANSPORT".equals(candidate.getProviderType()))throw conflict("Chỉ mô phỏng quyết toán GoTicket.");
        jdbc.query("select pg_advisory_xact_lock(hashtextextended(?,0))",rs->null,candidate.getOrderId().toString());
        return payouts.findByIdForUpdate(id).orElseThrow();
    }
    private void assertTestSources(HostPayout payout){
        var original=jdbc.queryForMap("select * from payment_requests where id=?",payout.getPaymentRequestId());
        if(!payout.getOrderId().equals(original.get("order_id"))||!payout.getHostId().equals(original.get("host_id")))throw conflict("Nguồn thu không khớp đơn hoặc nhà xe.");
        var sources=new ArrayList<Map<String,Object>>();sources.add(original);
        sources.addAll(jdbc.queryForList("""
          select distinct p.* from transport_item_fund_lots l join transport_item_accounts a on a.item_id=l.item_id
          join payment_requests p on p.order_id=l.source_operation_id
          where a.order_id=? and l.remaining_amount>0 and l.source_operation_id is not null
          """,payout.getOrderId()));
        for(var p:sources){
            if(!"COMPLETED".equals(p.get("status"))||p.get("paid_at")==null||!payout.getHostId().equals(p.get("host_id"))
              ||!Objects.equals(original.get("user_id"),p.get("user_id"))||!List.of("GOCAR_TICKET","GOCAR_EXCHANGE").contains(p.get("order_kind"))
              ||(!"MOCK".equals(p.get("provider"))&&!gateway.sandboxSimulationAllowed(p)))
                throw conflict("Chỉ mô phỏng nguồn thu MOCK hoặc VNPAY sandbox đã xác thực; khoản thu thực tế cần chứng từ thật.");
        }
    }
    @Transactional
    public Result previewPayout(UUID id){
        var payout=lockPayout(id);var saved=audit("PAYOUT",id);if(saved!=null)return done(id,saved);
        requireEnabled();assertTestSources(payout);
        var prepared=finance.prepareTransportPayout(id);
        return new Result(id,"READY",false,prepared.getHostAmount(),null,"Số tiền đã đối chiếu sau hoàn/hủy vé và trừ hoa hồng. Xác nhận sẽ ghi nhận chi trả mô phỏng.");
    }
    @Transactional
    public Result simulatePayout(UUID id,UUID actor,BigDecimal expected){
        validAmount(actor,expected);var payout=lockPayout(id);var saved=audit("PAYOUT",id);
        if(saved!=null){match(expected,(BigDecimal)saved.get("amount"));return done(id,saved);}
        requireEnabled();assertTestSources(payout);
        if(payout.getStatus()!=PayoutStatus.REQUESTED)throw conflict("Nhà xe phải gửi yêu cầu rút và khoản chi chưa được thanh toán.");
        var prepared=finance.prepareTransportPayout(id);match(expected,prepared.getHostAmount());
        String reference="SIM-TRANSPORT-PAYOUT-"+id;
        String evidence=publicBase.replaceAll("/+$","")+"/api/v1/payouts/transport/"+id+"/simulation-preview";
        jdbc.update("insert into transport_settlement_simulations(kind,target_id,actor_id,amount,reference,evidence_url) values('PAYOUT',?,?,?,?,?)",id,actor,expected,reference,evidence);
        finance.markTransportPaid(id,actor,expected,reference,evidence);
        payout.setSettlementSimulated(true);payouts.save(payout);
        return done(id,audit("PAYOUT",id));
    }
    private void lockCash(UUID id){if(jdbc.queryForList("select shift_id from transport_cash_settlements where shift_id=? for update",id).isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Chưa có báo cáo tiền mặt đã đóng để quyết toán.");}
    @Transactional
    public Result previewCash(UUID id){
        lockCash(id);var saved=audit("CASH_COMMISSION",id);if(saved!=null)return done(id,saved);
        requireEnabled();BigDecimal amount=payments.cashCommissionOutstanding(id);
        if(amount.signum()<=0)throw conflict("Ca không còn hoa hồng phải nộp. Không tạo thêm khoản nộp.");
        return new Result(id,"READY",false,amount,null,"Chỉ mô phỏng phần hoa hồng còn thiếu sau hoàn vé và các khoản đã nộp.");
    }
    @Transactional
    public Result simulateCash(UUID id,UUID actor,BigDecimal expected){
        validAmount(actor,expected);lockCash(id);var saved=audit("CASH_COMMISSION",id);
        if(saved!=null){match(expected,(BigDecimal)saved.get("amount"));return done(id,saved);}
        requireEnabled();BigDecimal outstanding=payments.cashCommissionOutstanding(id);match(expected,outstanding);
        if(outstanding.signum()<=0)throw conflict("Không còn số tiền phải nộp.");
        jdbc.update("insert into transport_settlement_simulations(kind,target_id,actor_id,amount,reference,evidence_url) values('CASH_COMMISSION',?,?,?,?,?)",id,actor,expected,"SIM-CASH-COMMISSION-"+id,publicBase.replaceAll("/+$","")+"/api/v1/payouts/transport/cash-settlements/"+id+"/simulation-preview");
        return done(id,audit("CASH_COMMISSION",id));
    }
}
