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

    Shift open(UUID actorId, UUID operatorId, String commissionVersion, BigDecimal commissionRate);
    Shift active(UUID actorId);
    Receipt record(UUID orderId, UUID shiftId, UUID actorId, UUID operatorId, BigDecimal amount);
    Receipt findReceipt(UUID orderId);
    ClosedShift close(UUID actorId, BigDecimal countedAmount);
    List<Settlement> pendingSettlements(int limit);
    void markSettlementSent(UUID shiftId);
    List<RefundAdjustment> pendingRefundAdjustments(int limit);
    void markRefundAdjustmentSent(UUID orderId);
}
