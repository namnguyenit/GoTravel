package com.gotravel.Identity.entity;


import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import java.time.Instant;
import java.util.Set;
import com.gotravel.Identity.enums.Provider;

@Entity
@Table(name = "users")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class User{
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;
    
    @Column(unique = true)
    String username;
    
    @Column(unique = true)
    String email;
    
    String password;

    @Enumerated(EnumType.STRING)
    Provider provider;
    
    String providerId;
    
    @Builder.Default
    Boolean isActive = true;

    @Builder.Default
    Boolean isDeleted = false;

    @Column(updatable = false)
    Instant createdAt;

    Instant lastLoginAt;

    @ManyToMany
    Set<Role> roles;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    UserProfile userProfile;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    HostProfile hostProfile;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    EnterpriseProfile enterpriseProfile;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    TicketVendorProfile ticketVendorProfile;

    @PrePersist
    void initializeCreatedAt() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
