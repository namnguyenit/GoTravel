package com.gotravel.PaymentandWallet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HostPayoutResponse {
    private UUID payoutId;
    private UUID orderId;
    private UUID hostId;
    private String providerType;
    private BigDecimal totalAmount;
    private BigDecimal commissionRate;
    private BigDecimal commissionAmount;
    private BigDecimal hostAmount;
    private String status;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
}
