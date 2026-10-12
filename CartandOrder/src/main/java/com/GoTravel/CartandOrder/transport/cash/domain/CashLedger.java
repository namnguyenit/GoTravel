package com.GoTravel.CartandOrder.transport.cash.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import java.util.List;

public interface CashLedger {
    record Shift(UUID id, UUID actorId, UUID operatorId, Instant openedAt,
                 String commissionVersion, BigDecimal commissionRate) {}
    record Receipt(UUID id, String receiptNo, UUID orderId, UUID shiftId, BigDecimal amount,
                   Instant receivedAt) {}
    record ClosedShift(UUID id, BigDecimal grossAmount, BigDecimal cashRefundAmount,
                       BigDecimal expectedAmount, BigDecimal countedAmount,
                       BigDecimal variance, BigDecimal commissionDue,
                       String commissionVersion) {}
    record Settlement(UUID shiftId, UUID operatorId, BigDecimal grossAmount,
                      BigDecimal commissionDue, String commissionVersion,
                      BigDecimal commissionRate) {}
    record RefundAdjustment(UUID orderId, UUID shiftId, UUID operatorId,
                            BigDecimal refundAmount, BigDecimal commissionReversal,
                            String commissionVersion, BigDecimal commissionRate) {}
    record ShiftDetail(UUID id, UUID actorId, UUID operatorId, Instant openedAt, Instant closedAt,
                       BigDecimal grossAmount, BigDecimal expectedAmount, BigDecimal countedAmount,
                       BigDecimal variance, BigDecimal commissionDue, String commissionVersion,
                       List<Receipt> receipts,List<java.util.Map<String,Object>> adjustments) {}

    Shift open(UUID actorId, UUID operatorId, String commissionVersion, BigDecimal commissionRate);
    Shift active(UUID actorId);
    Receipt record(UUID orderId, UUID shiftId, UUID actorId, UUID operatorId, BigDecimal amount);
    Receipt findReceipt(UUID orderId);
    ClosedShift close(UUID actorId, BigDecimal countedAmount);
    List<Shift> listShiftsByOperator(UUID operatorId, int limit, int offset);
    List<Shift> listShiftsByActor(UUID actorId, int limit);
    ShiftDetail findShiftDetail(UUID shiftId);
    List<Settlement> pendingSettlements(int limit);
    void markSettlementSent(UUID shiftId);
    List<RefundAdjustment> pendingRefundAdjustments(int limit);
    void markRefundAdjustmentSent(UUID orderId);
}
