package com.Gostay.BookingandInventory.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "inventory_configs", indexes = {
        @Index(name = "idx_inventory_config_listing", columnList = "listing_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class InventoryConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    UUID id;

    @Column(name = "listing_id", nullable = false, unique = true)
    UUID listingId;

    /**
     * STAY, SVC_SPA, SVC_PHOTOGRAPHY, ...
     */
    @Column(name = "category", length = 50, nullable = false)
    String category;

    /**
     * Cấu hình linh hoạt bằng JSONB để đáp ứng MỌI LOẠI DỊCH VỤ
     * - Nếu là Khách sạn (STAY): Chỉ cần lưu {"defaultQuantity": 10}
     * - Nếu là Spa/Makeup (SVC): {"timeSlots": [{"slot": "08:00-10:00", "quantity": 2}, {"slot": "10:00-12:00", "quantity": 2}]}
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "schedule_config", columnDefinition = "jsonb")
    ScheduleConfig scheduleConfig;

    @Column(name = "is_active")
    @Builder.Default
    Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScheduleConfig {
        private Integer defaultQuantity;
        private List<TimeSlotConfig> timeSlots;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimeSlotConfig {
        private String slot; // e.g., "08:00 - 10:00"
        private Integer quantity; // Số lượng phục vụ trong khung giờ này
    }
}
