package com.Gostay.BookingandInventory.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartialCancelRequest {
    private UUID listingId;
    private int quantityToRelease;
    private String timeSlot;
}
