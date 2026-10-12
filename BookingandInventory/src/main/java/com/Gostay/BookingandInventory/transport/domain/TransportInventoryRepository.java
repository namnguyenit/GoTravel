package com.Gostay.BookingandInventory.transport.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransportInventoryRepository {
    void recordSeatBlock(UUID tripId, UUID actorId, List<UUID> seatIds, boolean blocked, String reason);
    void lockKey(UUID key);
    Optional<TransportInventory.Trip> findTripForUpdate(UUID tripId);
    List<TransportInventory.Seat> findSeatsForUpdate(UUID tripId, List<UUID> seatIds);
    List<TransportInventory.Seat> findAllSeats(UUID tripId);
    Optional<TransportInventory.Hold> findHoldForUpdate(UUID orderId);
    void createTrip(TransportInventory.Trip trip, List<TransportInventory.Seat> seats);
    default void setSaleEnabled(UUID tripId, boolean enabled) { setSaleEnabled(tripId, enabled, 0); }
    void setSaleEnabled(UUID tripId, boolean enabled, int version);
    void insertHold(TransportInventory.Hold hold);
    void updateHold(TransportInventory.Hold hold);
    void updateSeats(List<TransportInventory.Seat> seats);
    List<UUID> expiredOrderIds(Instant now, int limit);
}
