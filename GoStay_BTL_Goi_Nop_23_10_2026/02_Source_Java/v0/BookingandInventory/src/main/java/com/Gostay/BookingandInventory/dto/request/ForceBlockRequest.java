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
public class ForceBlockRequest {
    private LocalDate startDate;
    private LocalDate endDate;
    private String status; // e.g. "BLOCKED"
    private String reason;
}
