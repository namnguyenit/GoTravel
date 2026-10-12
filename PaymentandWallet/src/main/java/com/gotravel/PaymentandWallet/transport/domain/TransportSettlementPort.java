package com.gotravel.PaymentandWallet.transport.domain;

import java.math.BigDecimal;
import java.util.UUID;

public interface TransportSettlementPort {
    record Net(BigDecimal gross, BigDecimal commission, BigDecimal payable) {}
    Net net(UUID payoutId, UUID orderId, BigDecimal originalAmount, BigDecimal originalCommission);
    void recordProof(UUID payoutId, UUID orderId, UUID actorId, BigDecimal amount, String reference, String evidence);
}
