package com.GoTravel.CartandOrder.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CatalogListingResponse {
    private UUID id;
    private UUID hostId;
    private String title;
    private BigDecimal basePrice;
    private String thumbnailUrl;
    private String status;
    private String category;
}
