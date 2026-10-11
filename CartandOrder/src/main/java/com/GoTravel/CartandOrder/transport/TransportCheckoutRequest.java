package com.GoTravel.CartandOrder.transport;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record TransportCheckoutRequest(
        @NotNull UUID tripId,
        @NotBlank @Size(max = 255) String fullName,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(max = 30) String phone,
        @NotEmpty List<@Valid Passenger> passengers
) {
    public record Passenger(
            @NotNull UUID seatId,
            @NotBlank @Size(max = 255) String name,
            @NotNull UUID pickupStopId,
            @NotNull UUID dropoffStopId
    ) {}
}
