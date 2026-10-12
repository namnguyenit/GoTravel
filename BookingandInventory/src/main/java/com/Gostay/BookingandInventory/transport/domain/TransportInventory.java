package com.Gostay.BookingandInventory.transport.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class TransportInventory {
    private TransportInventory() {}

    public enum SeatStatus { AVAILABLE, HELD, SOLD, BLOCKED }
    public enum HoldStatus { HELD, SOLD, RELEASED, EXPIRED, CANCELLED }

    public record Trip(UUID id, UUID operatorId, Instant departureAt, boolean saleEnabled, int syncVersion) {
        public Trip(UUID id, UUID operatorId, Instant departureAt, boolean saleEnabled) {
            this(id, operatorId, departureAt, saleEnabled, 0);
        }
    }

    public record Seat(
            UUID tripId, UUID seatId, String code, SeatStatus status,
            UUID orderId, UUID holdId, Instant expiresAt
    ) {
        public Seat change(SeatStatus nextStatus, UUID nextOrderId, UUID nextHoldId, Instant nextExpiry) {
            return new Seat(tripId, seatId, code, nextStatus, nextOrderId, nextHoldId, nextExpiry);
        }
    }

    public record Hold(
            UUID id, UUID orderId, UUID tripId, List<UUID> seatIds,
            HoldStatus status, Instant expiresAt
    ) {
        public Hold withStatus(HoldStatus nextStatus) {
            return new Hold(id, orderId, tripId, seatIds, nextStatus, expiresAt);
        }
    }
}
