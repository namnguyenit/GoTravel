package com.GoTravel.CartandOrder.transport;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TransportQuote(
        UUID tripId, UUID listingId, UUID operatorId, UUID operatorUserId,
        String routeTitle, Instant departureAt, Instant expiresAt,
        BigDecimal totalAmount, String currency, List<SeatQuote> seats,
        UUID quoteId, String quoteVersion, String quoteHash
) {
    public record SeatQuote(UUID seatId, String code, BigDecimal price) {}
}
