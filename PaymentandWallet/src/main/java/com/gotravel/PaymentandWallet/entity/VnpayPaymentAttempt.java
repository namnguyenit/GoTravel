package com.gotravel.PaymentandWallet.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "vnpay_payment_attempts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VnpayPaymentAttempt {
    @Id
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_request_id", nullable = false)
    private PaymentRequest paymentRequest;
    @Column(nullable = false, unique = true, length = 32)
    private String txnRef;
    @Column(nullable = false, length = 8)
    private String tmnCode;
    @Column(nullable = false)
    private BigDecimal amount;
    @Column(nullable = false, columnDefinition = "text")
    private String paymentUrl;
    @Column(nullable = false)
    private LocalDateTime createdAt;
    @Column(nullable = false)
    private LocalDateTime expiresAt;
    @Column(nullable = false, length = 16)
    private String status; // CREATED, SUCCEEDED, FAILED, REVIEW
    private String responseCode;
    private String transactionStatus;
    @Column(unique = true)
    private String transactionNo;
    private String bankCode;
    private LocalDateTime paidAt;
    private LocalDateTime processedAt;
}
