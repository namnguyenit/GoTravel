package com.Gostay.BookingandInventory.entity;

import com.Gostay.BookingandInventory.enums.InventoryLockStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "inventory_locks",
       indexes = {
               @Index(name = "idx_inventory_lock_expires_at", columnList = "expires_at")
       })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class InventoryLock {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_calendar_id", nullable = false)
    InventoryCalendar inventoryCalendar;

    /**
     * Logical FK -> order_db.orders.id
     */
    @Column(name = "order_id")
    UUID orderId;

    @Column(name = "locked_quantity")
    Integer lockedQuantity;

    /**
     * VÒNG ĐỜI GIAO DỊCH:
     * - LOCKED: Order Service yêu cầu khóa tạm thời 15 phút.
     * - CONFIRMED: Khách đã thanh toán VNPay xong, chốt giữ chỗ.
     * - RELEASED: Quá 15 phút không thanh toán, Job tự động quét và hoàn trả số lượng về inventory_calendars.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "lock_status", length = 20)
    InventoryLockStatus lockStatus;

    @Column(name = "expires_at")
    LocalDateTime expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}
