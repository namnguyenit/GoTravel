package com.Gostay.BookingandInventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarResponse {
    private LocalDate date;
    private String timeSlot;
    private int totalQuantity;
    private int availableQuantity;
    private int lockedQuantity;
    private int confirmedQuantity;
    private String status;
}
