package com.Gostay.BookingandInventory.transport.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransportInventoryRepository {
    void lockKey(UUID key);
    Optional<TransportInventory.Trip> findTripForUpdate(UUID tripId);
    List<TransportInventory.Seat> findSeatsForUpdate(UUID tripId, List<UUID> seatIds);
    List<TransportInventory.Seat> findAllSeats(UUID tripId);
    Optional<TransportInventory.Hold> findHoldForUpdate(UUID orderId);
    void createTrip(TransportInventory.Trip trip, List<TransportInventory.Seat> seats);
    void setSaleEnabled(UUID tripId, boolean enabled);
    void insertHold(TransportInventory.Hold hold);
    void updateHold(TransportInventory.Hold hold);
    void updateSeats(List<TransportInventory.Seat> seats);
    List<UUID> expiredOrderIds(Instant now, int limit);
}
