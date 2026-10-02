package com.gotravel.Identity.entity;

import com.gotravel.Identity.enums.Approval_status;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ticket_vendor_profiles")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TicketVendorProfile {
    @Id
    @Column(name = "user_id")
    String userId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    Approval_status approvalStatus;

    @Column(nullable = false)
    String companyName;

    @Column(nullable = false)
    String companyAddress;

    @Column(nullable = false)
    String representativeName;

    @Column(nullable = false, length = 30)
    String representativeIdNumber;

    String taxCode;
    String contactPhone;
    @Column(length = 2048)
    String documentFrontUrl;

    @Column(length = 2048)
    String documentBackUrl;

    @Column(length = 1000)
    String rejectionReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}
