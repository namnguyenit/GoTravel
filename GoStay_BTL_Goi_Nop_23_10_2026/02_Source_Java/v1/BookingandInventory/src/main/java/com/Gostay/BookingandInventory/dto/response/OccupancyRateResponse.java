package com.Gostay.BookingandInventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OccupancyRateResponse {
    private int totalCapacityInMonth;
    private int soldCapacity;
    private double occupancyRate;
}
