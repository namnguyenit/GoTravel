package com.Gostay.BookingandInventory.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockCalendarRequest {
    private LocalDate startDate;
    private LocalDate endDate;
    private String timeSlot;
    private String action; // e.g. "BLOCK", "UNBLOCK", "UPDATE_QUANTITY"
    private Integer availableQuantity;
}
