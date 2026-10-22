package com.Gostay.BookingandInventory.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InitializeInventoryRequest {
    @NotNull(message = "Listing ID không được để trống")
    private UUID listingId;

    private String category;

    private Integer quantity;

    private Integer totalQuantity;

    private List<String> timeSlots;

    @AssertTrue(message = "Số lượng tồn kho phải lớn hơn 0")
    public boolean isQuantityValid() {
        Integer resolvedQuantity = quantity != null ? quantity : totalQuantity;
        return resolvedQuantity != null && resolvedQuantity > 0;
    }
}
