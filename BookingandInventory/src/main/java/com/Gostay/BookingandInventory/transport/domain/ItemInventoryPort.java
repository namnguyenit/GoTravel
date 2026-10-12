package com.Gostay.BookingandInventory.transport.domain;
import java.time.Instant;
import java.util.UUID;
public interface ItemInventoryPort {
 record Command(UUID operationId, UUID orderId, UUID itemId, String kind, String requestHash,
                UUID oldTripId, UUID oldSeatId, UUID newTripId, UUID newSeatId, Instant expiresAt) {}
 record Result(UUID operationId, String state, Instant expiresAt) {}
 Result apply(Command command, String action);
 Result get(UUID operationId);
 java.util.List<UUID> expired(int limit);
 void expire(UUID operationId);
}
