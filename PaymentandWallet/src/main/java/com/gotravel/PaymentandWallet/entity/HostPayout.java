package com.gotravel.PaymentandWallet.entity;

import com.gotravel.PaymentandWallet.enums.PayoutStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Bảng ghi nhận số tiền cần trả cho Host (chủ dịch vụ) sau khi khách thanh toán.
 * Logic: Khách trả 1.000.000đ → GoStay giữ 5% (50.000đ) → Host nhận 95% (950.000đ).
 */
@Entity
@Table(name = "host_payouts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HostPayout {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "payment_request_id", nullable = false)
    private UUID paymentRequestId;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "host_id", nullable = false)
    private UUID hostId;

    @Column(name = "provider_type", nullable = false, length = 16)
    @Builder.Default
    private String providerType = "HOST";

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;

    @Column(name = "commission_rate", nullable = false)
    private BigDecimal commissionRate;

    @Column(name = "commission_amount", nullable = false)
    private BigDecimal commissionAmount;

    @Column(name = "host_amount", nullable = false)
    private BigDecimal hostAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PayoutStatus status;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "settlement_simulated", nullable = false)
    @Builder.Default
    private boolean settlementSimulated = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
