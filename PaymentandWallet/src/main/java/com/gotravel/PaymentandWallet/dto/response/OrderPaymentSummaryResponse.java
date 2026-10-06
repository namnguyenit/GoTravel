package com.gotravel.PaymentandWallet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderPaymentSummaryResponse {
    private UUID orderId;
    private UUID userId;
    private UUID hostId;
    private BigDecimal totalAmount;
    private String currency;
    private String status;
    private LocalDateTime expiresAt;
    private List<ProviderBreakdown> providerBreakdowns;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProviderBreakdown {
        private UUID hostId;
        private BigDecimal totalAmount;
    }
}
