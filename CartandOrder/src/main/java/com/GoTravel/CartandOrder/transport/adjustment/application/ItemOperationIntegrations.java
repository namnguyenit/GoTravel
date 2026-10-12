package com.GoTravel.CartandOrder.transport.adjustment.application;
import com.GoTravel.CartandOrder.transport.adjustment.domain.ItemOperationPlan;
import java.util.UUID;
public interface ItemOperationIntegrations {
 record Receipt(UUID operationId,String state,java.time.Instant expiresAt) {}
 record Ticket(UUID operationId,String state,UUID ticketId,Integer revision,String checkInToken) {}
 record Money(UUID operationId,String state,java.math.BigDecimal topup,java.math.BigDecimal refundDue) {}
 Receipt inventory(ItemOperationPlan plan,String action);
 Receipt inventoryState(UUID id);
 Ticket ticket(UUID operationId,String action);
 Money money(UUID operationId,String action);
}
