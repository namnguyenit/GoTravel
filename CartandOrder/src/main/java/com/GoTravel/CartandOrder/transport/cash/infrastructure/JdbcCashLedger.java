package com.GoTravel.CartandOrder.transport.cash.infrastructure;

import com.GoTravel.CartandOrder.transport.cash.domain.CashLedger;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class JdbcCashLedger implements CashLedger {
    private final JdbcTemplate jdbc;

    @Override
    public Shift open(UUID actorId, UUID operatorId, String commissionVersion, BigDecimal commissionRate) {
        var existing = active(actorId);
        if (existing != null) {
            if (!existing.operatorId().equals(operatorId)) throw conflict("Nhân viên có ca đang mở ở nhà xe khác");
            return existing;
        }
        try {
            jdbc.update("insert into transport_cash_shifts(id, actor_id, operator_id, commission_version, commission_rate) " +
                            "values (?,?,?,?,?)", UUID.randomUUID(), actorId, operatorId,
                    commissionVersion, commissionRate);
        } catch (DuplicateKeyException race) {
            var current = active(actorId);
            if (current == null || !current.operatorId().equals(operatorId)) throw conflict("Ca thu tiền đã đổi");
            return current;
        }
        return active(actorId);
    }

    @Override
    public Shift active(UUID actorId) {
        return jdbc.query("select * from transport_cash_shifts where actor_id=? and closed_at is null",
                (rs, row) -> new Shift(rs.getObject("id", UUID.class),
                        rs.getObject("actor_id", UUID.class), rs.getObject("operator_id", UUID.class),
                        rs.getTimestamp("opened_at").toInstant(), rs.getString("commission_version"),
                        rs.getBigDecimal("commission_rate")), actorId).stream().findFirst().orElse(null);
    }

    @Override
    public Shift prepareAutomatic(UUID actorId, UUID operatorId, String version, BigDecimal rate) {
        // Serializes batch creation for this cashier, including concurrent tabs.
        jdbc.queryForList("select pg_advisory_xact_lock(hashtextextended(?::text, 0))", actorId.toString());
        var activeRows = jdbc.query("select * from transport_cash_shifts where actor_id=? and closed_at is null for update",
                (rs, row) -> new Shift(rs.getObject("id", UUID.class), rs.getObject("actor_id", UUID.class),
                        rs.getObject("operator_id", UUID.class), rs.getTimestamp("opened_at").toInstant(),
                        rs.getString("commission_version"), rs.getBigDecimal("commission_rate")), actorId);
        if (!activeRows.isEmpty()) {
            var current = activeRows.get(0);
            boolean oldDay = current.openedAt().atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate()
                    .isBefore(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")));
            jdbc.update("update transport_cash_shifts set auto_managed=true where id=?", current.id());
            if (!current.operatorId().equals(operatorId) || oldDay) {
                boolean closed = closeAutomatic(current.id());
                if (!closed && !current.operatorId().equals(operatorId))
                    throw conflict("Còn đơn chưa nhận tiền ở nhà xe khác. Hoàn tất hoặc hủy giữ chỗ trước khi đổi nhà xe.");
                if (!closed) return current;
            } else return current;
        }
        var id = UUID.randomUUID();
        jdbc.update("insert into transport_cash_shifts(id,actor_id,operator_id,commission_version,commission_rate,auto_managed) values(?,?,?,?,?,true)",
                id, actorId, operatorId, version, rate);
        return active(actorId);
    }

    @Override
    public List<UUID> automaticBatchesToClose(int limit) {
        return jdbc.queryForList("select id from transport_cash_shifts where auto_managed=true and closed_at is null " +
                "and opened_at < date_trunc('day',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh' " +
                "order by opened_at limit ?", UUID.class, limit);
    }

    @Override
    public boolean closeAutomatic(UUID shiftId) {
        var rows = jdbc.queryForList("select commission_rate from transport_cash_shifts where id=? and auto_managed=true and closed_at is null for update", shiftId);
        if (rows.isEmpty()) return false;
        // Check AFTER taking the row lock shared with order/proof creation.
        var pending = jdbc.queryForObject("select count(*) from orders where transport_cash_shift_id=? and status in ('PENDING','CASH_PENDING')", Long.class, shiftId);
        if (pending != null && pending > 0) return false;
        var totals = cashTotals(shiftId);
        var rate = (BigDecimal) rows.get(0).get("commission_rate");
        jdbc.update("update transport_cash_shifts set closed_at=now(),gross_amount=?,cash_refund_amount=?,expected_amount=?," +
                        "counted_amount=null,variance=null,commission_due=? where id=?",
                totals.gross(), totals.refunds(), totals.gross().subtract(totals.refunds()),
                totals.gross().multiply(rate).setScale(0,RoundingMode.HALF_UP), shiftId);
        return true;
    }

    @Override
    public Receipt record(UUID orderId, UUID shiftId, UUID actorId, UUID operatorId, BigDecimal amount) {
        var prior = findReceipt(orderId);
        if (prior != null) {
            if (!prior.shiftId().equals(shiftId) || prior.amount().compareTo(amount) != 0)
                throw conflict("Biên nhận đã tồn tại với dữ liệu khác");
            return prior;
        }
        var active = jdbc.queryForList(
                "select id from transport_cash_shifts where id=? and actor_id=? and operator_id=? and closed_at is null for update",
                UUID.class, shiftId, actorId, operatorId);
        if (active.isEmpty()) throw conflict("Ca thu tiền đã đóng hoặc không thuộc nhân viên");
        var receiptId = UUID.randomUUID();
        var number = "CAR-CASH-" + receiptId.toString().replace("-", "").toUpperCase();
        jdbc.update("insert into transport_cash_receipts(id,receipt_no,order_id,shift_id,actor_id,operator_id,amount) " +
                        "values (?,?,?,?,?,?,?)", receiptId, number, orderId, shiftId, actorId, operatorId, amount);
        return findReceipt(orderId);
    }

    @Override
    public Receipt findReceipt(UUID orderId) {
        return jdbc.query("select * from transport_cash_receipts where order_id=?",
                (rs, row) -> new Receipt(rs.getObject("id", UUID.class), rs.getString("receipt_no"),
                        rs.getObject("order_id", UUID.class), rs.getObject("shift_id", UUID.class),
                        rs.getBigDecimal("amount"), rs.getTimestamp("received_at").toInstant()),
                orderId).stream().findFirst().orElse(null);
    }

    @Override
    public ClosedShift close(UUID actorId, BigDecimal countedAmount) {
        var shifts = jdbc.query("select id,commission_rate,commission_version from transport_cash_shifts " +
                        "where actor_id=? and closed_at is null for update",
                (rs, row) -> new Object[]{rs.getObject(1, UUID.class), rs.getBigDecimal(2), rs.getString(3)},
                actorId);
        if (shifts.isEmpty()) throw conflict("Không có ca thu tiền đang mở");
        UUID shiftId = (UUID) shifts.get(0)[0];
        BigDecimal commissionRate = (BigDecimal) shifts.get(0)[1];
        String commissionVersion = (String) shifts.get(0)[2];
        var totals = cashTotals(shiftId);
        BigDecimal gross = totals.gross();
        BigDecimal refunds = totals.refunds();
        BigDecimal expected = gross.subtract(refunds);
        BigDecimal variance = countedAmount.subtract(expected);
        BigDecimal commissionDue = gross.multiply(commissionRate).setScale(0, RoundingMode.HALF_UP);
        jdbc.update("update transport_cash_shifts set closed_at=now(),gross_amount=?,cash_refund_amount=?," +
                "expected_amount=?,counted_amount=?,variance=?,commission_due=? where id=?",
                gross, refunds, expected, countedAmount, variance, commissionDue, shiftId);
        return new ClosedShift(shiftId, gross, refunds, expected, countedAmount,
                variance, commissionDue, commissionVersion);
    }

    @Override
    public List<Settlement> pendingSettlements(int limit) {
        return jdbc.query("select id,operator_id,gross_amount,commission_due,commission_version,commission_rate " +
                        "from transport_cash_shifts where closed_at is not null and settlement_sent_at is null " +
                        "order by closed_at limit ?",
                (rs, row) -> new Settlement(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class),
                        rs.getBigDecimal(3), rs.getBigDecimal(4), rs.getString(5), rs.getBigDecimal(6)),
                limit);
    }

    @Override
    public void markSettlementSent(UUID shiftId) {
        jdbc.update("update transport_cash_shifts set settlement_sent_at=now() " +
                "where id=? and closed_at is not null and settlement_sent_at is null", shiftId);
    }

    @Override
    public List<RefundAdjustment> pendingRefundAdjustments(int limit) {
        return jdbc.query("select c.order_id,s.id,s.operator_id,c.amount,s.commission_version,s.commission_rate " +
                        "from transport_refund_confirmations c " +
                        "join transport_cash_refund_outbox o on o.order_id=c.order_id " +
                        "join transport_cash_receipts r on r.order_id=c.order_id " +
                        "join transport_cash_shifts s on s.id=r.shift_id " +
                        "where c.payment_method='CASH' and o.delivered_at is null " +
                        "order by c.recorded_at limit ?",
                (rs, row) -> {
                    BigDecimal amount = rs.getBigDecimal(4);
                    BigDecimal rate = rs.getBigDecimal(6);
                    return new RefundAdjustment(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class),
                            rs.getObject(3, UUID.class), amount,
                            amount.multiply(rate).setScale(0, RoundingMode.HALF_UP), rs.getString(5), rate);
                }, limit);
    }

    @Override
    public void markRefundAdjustmentSent(UUID orderId) {
        jdbc.update("update transport_cash_refund_outbox set delivered_at=now() " +
                "where order_id=? and delivered_at is null", orderId);
    }

    @Override
    public List<Shift> listShiftsByOperator(UUID operatorId, int limit, int offset) {
        return jdbc.query("select * from transport_cash_shifts where operator_id=? order by opened_at desc limit ? offset ?",
                (rs, row) -> new Shift(rs.getObject("id", UUID.class),
                        rs.getObject("actor_id", UUID.class), rs.getObject("operator_id", UUID.class),
                        rs.getTimestamp("opened_at").toInstant(), rs.getString("commission_version"),
                        rs.getBigDecimal("commission_rate")), operatorId, limit, offset);
    }

    @Override
    public List<Shift> listShiftsByActor(UUID actorId, int limit) {
        return jdbc.query("select * from transport_cash_shifts where actor_id=? order by opened_at desc limit ?",
                (rs, row) -> new Shift(rs.getObject("id", UUID.class),
                        rs.getObject("actor_id", UUID.class), rs.getObject("operator_id", UUID.class),
                        rs.getTimestamp("opened_at").toInstant(), rs.getString("commission_version"),
                        rs.getBigDecimal("commission_rate")), actorId, limit);
    }

    @Override
    public ShiftDetail findShiftDetail(UUID shiftId) {
        var shift = jdbc.query("select * from transport_cash_shifts where id=?",
                (rs, row) -> new ShiftDetail(rs.getObject("id", UUID.class),
                        rs.getObject("actor_id", UUID.class), rs.getObject("operator_id", UUID.class),
                        rs.getTimestamp("opened_at").toInstant(),
                        rs.getTimestamp("closed_at") == null ? null : rs.getTimestamp("closed_at").toInstant(),
                        rs.getBigDecimal("gross_amount"), rs.getBigDecimal("expected_amount"),
                        rs.getBigDecimal("counted_amount"), rs.getBigDecimal("variance"),
                        rs.getBigDecimal("commission_due"), rs.getString("commission_version"),
                        null,null), shiftId).stream().findFirst().orElse(null);
        if (shift == null) return null;
        var receipts = jdbc.query("select * from transport_cash_receipts where shift_id=? order by received_at asc",
                (rs, row) -> new Receipt(rs.getObject("id", UUID.class),
                        rs.getString("receipt_no"), rs.getObject("order_id", UUID.class),
                        rs.getObject("shift_id", UUID.class), rs.getBigDecimal("amount"),
                        rs.getTimestamp("received_at").toInstant()), shiftId);
        var totals = shift.closedAt() == null ? cashTotals(shiftId) : null;
        BigDecimal rate = totals == null ? null : jdbc.queryForObject(
                "select commission_rate from transport_cash_shifts where id=?", BigDecimal.class, shiftId);
        return new ShiftDetail(shift.id(), shift.actorId(), shift.operatorId(), shift.openedAt(),
                shift.closedAt(), totals == null ? shift.grossAmount() : totals.gross(),
                totals == null ? shift.expectedAmount() : totals.gross().subtract(totals.refunds()), shift.countedAmount(),
                shift.variance(), totals == null ? shift.commissionDue() : totals.gross().multiply(rate).setScale(0, RoundingMode.HALF_UP), shift.commissionVersion(), receipts,
                jdbc.queryForList("select 'TOPUP' as kind,p.operation_id,p.amount,p.reference,p.received_at as recorded_at from transport_operation_cash_proofs p where p.shift_id=? union all select 'REFUND' as kind,p.operation_id,p.amount,p.reference,p.recorded_at from transport_operation_refund_proofs p where p.refund_method='CASH' and p.shift_id=?",shiftId,shiftId));
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private record CashTotals(BigDecimal gross, BigDecimal refunds) {}

    /** Share the same receipt ledger between the open view and the closing snapshot. */
    private CashTotals cashTotals(UUID shiftId) {
        return jdbc.queryForObject("select " +
                "(select coalesce(sum(amount),0) from transport_cash_receipts where shift_id=?) + " +
                "(select coalesce(sum(amount),0) from transport_operation_cash_proofs where shift_id=?) as gross, " +
                "(select coalesce(sum(c.amount),0) from transport_refund_confirmations c join transport_cash_receipts r on r.order_id=c.order_id where r.shift_id=? and c.payment_method='CASH') + " +
                "(select coalesce(sum(amount),0) from transport_operation_refund_proofs where refund_method='CASH' and shift_id=?) as refunds",
                (rs,row) -> new CashTotals(rs.getBigDecimal("gross"), rs.getBigDecimal("refunds")),
                shiftId, shiftId, shiftId, shiftId);
    }
}
