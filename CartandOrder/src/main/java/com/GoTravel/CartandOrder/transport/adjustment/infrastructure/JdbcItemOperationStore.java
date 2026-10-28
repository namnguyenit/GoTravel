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
    public org.springframework.data.domain.Page<UUID> attentionIds(String search, String state, org.springframework.data.domain.Pageable pageable) {
        String keyword = search == null ? "" : search.trim().toLowerCase(java.util.Locale.ROOT);
        if (keyword.length() > 120) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Từ khóa quá dài");
        String pattern = "%" + keyword.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        String selected = state == null ? "" : state.trim();
        String from = " from transport_item_operations op join orders o on o.id=op.order_id where o.order_kind='GOCAR_TICKET' and op.state not in ('COMPLETED','ABORTED') and (op.error is not null or op.state in ('REFUND_PENDING','ABORT_REFUND_PENDING')) and (?='' or op.state=?) and (?='' or lower(op.id::text) like ? escape '!' or lower(op.order_id::text) like ? escape '!' or lower(op.item_id::text) like ? escape '!' or lower(o.order_number) like ? escape '!' or lower(o.customer_info->>'fullName') like ? escape '!' or lower(o.customer_info->>'email') like ? escape '!' or lower(op.error) like ? escape '!')";
        Object[] args = {selected, selected, keyword, pattern, pattern, pattern, pattern, pattern, pattern, pattern};
        Long count = jdbc.queryForObject("select count(*)" + from, Long.class, args);
        var params = new java.util.ArrayList<Object>(java.util.Arrays.asList(args));
        params.add(pageable.getPageSize()); params.add(pageable.getOffset());
        var ids = jdbc.query("select op.id" + from + " order by op.created_at desc,op.id desc limit ? offset ?", (rs,row) -> rs.getObject(1, UUID.class), params.toArray());
        return new org.springframework.data.domain.PageImpl<>(ids, pageable, count == null ? 0 : count);
    }
    public List<UUID> refundAckIds() {return jdbc.query("select o.id from transport_item_operations o join transport_operation_refund_proofs p on p.operation_id=o.id where o.state in ('REFUND_PENDING','ABORT_REFUND_PENDING') limit 50",(rs,row)->rs.getObject(1,UUID.class));}
    public boolean automaticRefundBlocksManual(UUID id) {
        Integer count=jdbc.queryForObject("select count(*) from transport_automatic_refund_requests where operation_id=? and state not in ('FAILED','MANUAL_REQUIRED')",Integer.class,id);
        return count!=null && count>0;
    }
    public void recordReason(UUID id,UUID actor,String code,String text) {
        jdbc.update("insert into transport_item_operation_reasons(operation_id,actor_id,reason_code,reason_text) values(?,?,?,?)",id,actor,code,text);
    }
    public void notify(Order order,String kind,String eventKey) {TransportNotificationService.enqueue(jdbc,order,kind,eventKey);}
}
