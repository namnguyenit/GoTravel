package com.GoTravel.CartandOrder.transport.adjustment.infrastructure;

import com.GoTravel.CartandOrder.transport.adjustment.domain.ItemOperationStore;
import com.GoTravel.CartandOrder.transport.TransportNotificationService;
import com.GoTravel.CartandOrder.entity.Order;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class JdbcItemOperationStore implements ItemOperationStore {
    private final JdbcTemplate jdbc;
    public int unresolved(UUID itemId,UUID orderId) {
        Integer count=jdbc.queryForObject("select (select count(*) from transport_order_amendments where order_item_id=? and status in ('PENDING','ATTENTION'))+(select count(*) from transport_item_operations where item_id=? and state not in ('COMPLETED','ABORTED'))+(select count(*) from transport_exchange_cases where (old_order_id=? or new_order_id=?) and status in ('PROCESSING','REFUND_PENDING'))",Integer.class,itemId,itemId,orderId,orderId);
        return count==null?0:count;
    }
    public BigDecimal commissionRate(UUID shiftId) {return jdbc.queryForObject("select commission_rate from transport_cash_shifts where id=?",BigDecimal.class,shiftId);}
    public Map<String,Object> cashProof(UUID id) {
        var rows=jdbc.queryForList("select p.*,s.commission_rate,s.commission_version from transport_operation_cash_proofs p join transport_cash_shifts s on s.id=p.shift_id where operation_id=?",id);
        return rows.isEmpty()?Map.of():rows.get(0);
    }
    public Map<String,Object> refundProof(UUID id) {
        var rows=jdbc.queryForList("select * from transport_operation_refund_proofs where operation_id=?",id);
        return rows.isEmpty()?Map.of():rows.get(0);
    }
    public boolean lockOpenShift(UUID id,UUID actor) {return !jdbc.queryForList("select id from transport_cash_shifts where id=? and actor_id=? and closed_at is null for update",id,actor).isEmpty();}
    public void recordCash(UUID id,UUID shift,UUID actor,BigDecimal amount,String reference) {jdbc.update("insert into transport_operation_cash_proofs(operation_id,shift_id,actor_id,amount,reference) values(?,?,?,?,?)",id,shift,actor,amount,reference);}
    public void recordRefund(UUID id,UUID actor,BigDecimal amount,String reference,String evidence,String method,UUID shift) {jdbc.update("insert into transport_operation_refund_proofs(operation_id,actor_id,amount,reference,evidence_url,refund_method,shift_id) values(?,?,?,?,?,?,?) on conflict(operation_id) do nothing",id,actor,amount,reference,evidence,method,shift);
        var proof=refundProof(id);
        if(amount.compareTo((BigDecimal)proof.get("amount"))!=0 || !java.util.Objects.equals(actor,proof.get("actor_id")) || !java.util.Objects.equals(reference,proof.get("reference")) || !java.util.Objects.equals(evidence,proof.get("evidence_url")) || !java.util.Objects.equals(method,proof.get("refund_method")) || !java.util.Objects.equals(shift,proof.get("shift_id")))throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"Đã ghi chứng cứ hoàn khác");
    }
    public List<UUID> attentionIds() {return jdbc.query("select id from transport_item_operations where state not in ('COMPLETED','ABORTED') and (error is not null or state in ('REFUND_PENDING','ABORT_REFUND_PENDING')) order by updated_at limit 200",(rs,row)->rs.getObject(1,UUID.class));}
    public List<UUID> refundAckIds() {return jdbc.query("select o.id from transport_item_operations o join transport_operation_refund_proofs p on p.operation_id=o.id where o.state in ('REFUND_PENDING','ABORT_REFUND_PENDING') limit 50",(rs,row)->rs.getObject(1,UUID.class));}
    public void notify(Order order,String kind,String eventKey) {TransportNotificationService.enqueue(jdbc,order,kind,eventKey);}
}
