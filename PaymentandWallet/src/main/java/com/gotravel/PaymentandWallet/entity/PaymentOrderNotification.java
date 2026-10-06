package com.gotravel.PaymentandWallet.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "payment_order_notifications")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentOrderNotification {
    @Id
    private UUID orderId;
    @Column(nullable = false)
    private boolean successful;
    @Column(nullable = false)
    private LocalDateTime createdAt;
    private LocalDateTime deliveredAt;
}
