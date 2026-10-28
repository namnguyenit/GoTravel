package com.gotravel.PaymentandWallet.transport.infrastructure;

import com.gotravel.PaymentandWallet.transport.domain.TransportSettlementPort;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.Objects;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class JdbcTransportSettlement implements TransportSettlementPort {
    private final JdbcTemplate jdbc;
    private ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT, message); }
    @Transactional
    public Net net(UUID payoutId, UUID orderId, BigDecimal originalAmount, BigDecimal originalCommission) {
        jdbc.query("select pg_advisory_xact_lock(hashtextextended(?,0))", rs -> null, orderId.toString());
        Integer pending = jdbc.queryForObject("select count(*) from transport_item_money_operations m join transport_item_accounts a on a.item_id=m.item_id where a.order_id=? and m.state not in ('COMPLETED','ABORTED')",Integer.class,orderId);
        if(pending!=null && pending>0) throw conflict("Đơn còn credit/thu tiền/hoàn tiền chưa đối soát");
        jdbc.update("insert into transport_payout_bases(payout_id,order_id,original_amount,original_commission) values(?,?,?,?) on conflict(payout_id) do nothing",payoutId,orderId,originalAmount,originalCommission);
        var initial=jdbc.queryForMap("select * from transport_payout_bases where payout_id=? for update",payoutId);
        var totals=jdbc.queryForMap("""
            select coalesce(sum(case when e.kind='TOPUP' then e.amount when e.kind='REFUND' then -e.amount else 0 end),0) as gross,
                   coalesce(sum(case when e.kind='TOPUP_COMMISSION' then e.amount
                     when e.kind='COMMISSION_REVERSAL_DUE' and exists(select 1 from transport_item_money_events r where r.operation_id=e.operation_id and r.kind='REFUND') then -e.amount else 0 end),0) as commission
            from transport_item_money_events e join transport_item_money_operations m on m.operation_id=e.operation_id
            join transport_item_accounts a on a.item_id=m.item_id where a.order_id=? and a.method='ONLINE'
            """,orderId);
        BigDecimal gross=((BigDecimal)initial.get("original_amount")).add((BigDecimal)totals.get("gross"));
        if(gross.signum()<0)throw conflict("Net payout âm; cần xử lý sai lệch");
        BigDecimal commission=((BigDecimal)initial.get("original_commission")).add((BigDecimal)totals.get("commission")).setScale(0,java.math.RoundingMode.HALF_UP).max(BigDecimal.ZERO).min(gross);
        return new Net(gross,commission,gross.subtract(commission));
    }
    @Transactional
    public void recordProof(UUID payoutId,UUID orderId,UUID actorId,BigDecimal amount,String reference,String evidence) {
        if(reference.startsWith("SIM-TRANSPORT-PAYOUT-")) {
            var audit=jdbc.queryForList("select * from transport_settlement_simulations where kind='PAYOUT' and target_id=?",payoutId);
            if(audit.size()!=1||!actorId.equals(audit.get(0).get("actor_id"))||amount.compareTo((BigDecimal)audit.get(0).get("amount"))!=0||!reference.equals(audit.get(0).get("reference"))||!evidence.equals(audit.get(0).get("evidence_url")))throw conflict("Thiếu hồ sơ chi trả mô phỏng đã xác nhận.");
        }
        var prior=jdbc.queryForList("select * from transport_payout_proofs where payout_id=?",payoutId);
        if(!prior.isEmpty()) {
            var p=prior.get(0);
            if(!Objects.equals(p.get("actor_id"),actorId) || amount.compareTo((BigDecimal)p.get("amount"))!=0 || !Objects.equals(reference,p.get("reference")) || !Objects.equals(evidence,p.get("evidence_url")))throw conflict("Payout đã có chứng cứ khác");
            return;
        }
        jdbc.update("insert into transport_payout_proofs(payout_id,order_id,actor_id,amount,reference,evidence_url) values(?,?,?,?,?,?)",payoutId,orderId,actorId,amount,reference,evidence);
    }
}
