package com.Gostay.BookingandInventory.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.AssertTrue;
import java.time.temporal.ChronoUnit;
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
    private List<@NotNull UUID> listingIds;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    @Min(1)
    @Builder.Default
    private int requiredQuantity = 1;

    @AssertTrue(message = "Khoảng ngày phải hợp lệ và không vượt 90 ngày")
    public boolean isDateRangeValid() {
        return startDate == null || endDate == null
                || (!endDate.isBefore(startDate) && ChronoUnit.DAYS.between(startDate, endDate) <= 89);
    }
}
