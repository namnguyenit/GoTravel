package com.GoTravel.CartandOrder.entity;

import com.GoTravel.CartandOrder.enums.OrderStatus;
import com.GoTravel.CartandOrder.enums.OrderKind;
import com.GoTravel.CartandOrder.enums.PaymentMethod;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "host_id")
    private UUID hostId;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_kind", nullable = false)
    @Builder.Default
    private OrderKind orderKind = OrderKind.GOTRAVEL_LISTING;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false)
    @Builder.Default
    private PaymentMethod paymentMethod = PaymentMethod.ONLINE;

    @Column(name = "transport_trip_id")
    private UUID transportTripId;

    @Column(name = "transport_hold_id")
    private UUID transportHoldId;

    @Column(name = "transport_idempotency_key", length = 120)
    private String transportIdempotencyKey;

    @Column(name = "transport_request_hash", length = 64)
    private String transportRequestHash;

    @Column(name = "transport_cashier_id")
    private UUID transportCashierId;

    @Column(name = "transport_cash_shift_id")
    private UUID transportCashShiftId;

    @Column(name = "transport_quote_id")
    private UUID transportQuoteId;
    @Column(name = "transport_quote_version", length = 64)
    private String transportQuoteVersion;
    @Column(name = "transport_quote_hash", length = 64)
    private String transportQuoteHash;

    @Column(name = "transport_departure_at")
    private LocalDateTime transportDepartureAt;

    @Column(name = "transport_policy_version", length = 40)
    private String transportPolicyVersion;

    @Column(name = "transport_full_refund_hours")
    private Integer transportFullRefundHours;

    @Column(name = "transport_partial_refund_hours")
    private Integer transportPartialRefundHours;

    @Column(name = "transport_partial_fee_rate", precision = 8, scale = 6)
    private BigDecimal transportPartialFeeRate;

    @Column(name = "transport_cancellation_fee", precision = 18, scale = 0)
    private BigDecimal transportCancellationFee;

    @Column(name = "transport_refund_due", precision = 18, scale = 0)
    private BigDecimal transportRefundDue;

    @Column(name = "transport_cancellation_reason", length = 500)
    private String transportCancellationReason;

    @Column(name = "order_number", nullable = false, unique = true)
    private String orderNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    @Builder.Default
    private String currency = "VND";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "customer_info", columnDefinition = "jsonb")
    private CustomerInfo customerInfo;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "ticket_email_sent")
    @Builder.Default
    private Boolean ticketEmailSent = false;

    @Column(name = "ticket_email_sent_at")
    private LocalDateTime ticketEmailSentAt;

    @Column(name = "ticket_email_recipient")
    private String ticketEmailRecipient;

    @Column(name = "ticket_email_attempts")
    @Builder.Default
    private Integer ticketEmailAttempts = 0;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerInfo {
        @NotBlank(message = "Họ tên khách hàng không được để trống")
        private String fullName;

        @NotBlank(message = "Email khách hàng không được để trống")
        @Email(message = "Email khách hàng không hợp lệ")
        private String email;

        @NotBlank(message = "Số điện thoại khách hàng không được để trống")
        private String phone;
    }
}
