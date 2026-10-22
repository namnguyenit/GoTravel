package com.Gostay.BookingandInventory.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchCheckAvailabilityRequest {
    @NotEmpty
    private List<UUID> listingIds;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    private int requiredQuantity = 1;
}
