package com.Gostay.BookingandInventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LockResponse {
    private UUID lockId;
    private UUID orderId;
    private String lockStatus;
    private int lockedQuantity;
}
