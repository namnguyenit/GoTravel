package com.Gostay.BookingandInventory.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import jakarta.validation.constraints.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockCalendarRequest {
    @NotNull private LocalDate startDate;
    @NotNull private LocalDate endDate;
    private String timeSlot;
    @NotBlank @Pattern(regexp = "(?i)BLOCK|UNBLOCK|UPDATE_QUANTITY")
    private String action;
    @PositiveOrZero private Integer availableQuantity;

    @AssertTrue(message = "Ngày và số lượng phải phù hợp với thao tác")
    public boolean isActionValid() {
        return (startDate == null || endDate == null || !endDate.isBefore(startDate))
                && (!"UPDATE_QUANTITY".equalsIgnoreCase(action) || availableQuantity != null);
    }
}
