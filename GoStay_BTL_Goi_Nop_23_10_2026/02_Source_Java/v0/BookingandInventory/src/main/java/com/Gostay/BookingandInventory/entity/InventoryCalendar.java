package com.Gostay.BookingandInventory.entity;

import com.Gostay.BookingandInventory.enums.InventoryCalendarStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "inventory_calendars", 
       uniqueConstraints = {
               @UniqueConstraint(columnNames = {"listing_id", "date", "time_slot"})
       },
       indexes = {
               @Index(name = "idx_inventory_calendar_date", columnList = "date")
       })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class InventoryCalendar {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    UUID id;

    /**
     * Chứa ID của Hạng phòng (nếu là Hotel) hoặc ID của Homestay. 
     * Inventory không cần biết Complex ID.
     */
    @Column(name = "listing_id")
    UUID listingId;

    @Column(name = "date")
    LocalDate date;

    /**
     * + STAY (Lưu trú): "ALL_DAY" (Không dùng null để tránh lỗi Unique Constraint của DB)
     * + EXP/SVC (Trải nghiệm/Dịch vụ): VD "08:00 - 10:00"
     */
    @Column(name = "time_slot", length = 50, nullable = false)
    @Builder.Default
    String timeSlot = "ALL_DAY";

    @Column(name = "available_quantity")
    Integer availableQuantity;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    InventoryCalendarStatus status;

    /**
     * Trường BẮT BUỘC để Spring Data JPA thực hiện Khóa lạc quan (Chống Overbooking).
     */
    @Version
    @Column(name = "version")
    Long version;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    @OneToMany(mappedBy = "inventoryCalendar", cascade = CascadeType.ALL, orphanRemoval = true)
    List<InventoryLock> inventoryLocks;
}
