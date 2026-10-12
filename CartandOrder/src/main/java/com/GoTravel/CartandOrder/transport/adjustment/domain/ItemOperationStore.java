package com.GoTravel.CartandOrder.transport.adjustment.domain;

import com.GoTravel.CartandOrder.entity.Order;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Persistence and transactional outbox boundary used by the item coordinator. */
public interface ItemOperationStore {
    int unresolved(UUID itemId,UUID orderId);
    BigDecimal commissionRate(UUID shiftId);
    Map<String,Object> cashProof(UUID operationId);
    Map<String,Object> refundProof(UUID operationId);
    boolean lockOpenShift(UUID shiftId,UUID actorId);
    void recordCash(UUID operationId,UUID shiftId,UUID actorId,BigDecimal amount,String reference);
    void recordRefund(UUID operationId,UUID actorId,BigDecimal amount,String reference,String evidence,String method,UUID shiftId);
    List<UUID> attentionIds();
    List<UUID> refundAckIds();
    void notify(Order order,String kind,String eventKey);
}
