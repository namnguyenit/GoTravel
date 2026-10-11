package com.Listing.CatalogandListing.entity;

import com.Listing.CatalogandListing.entity.attributes.BaseListingAttributes;
import com.Listing.CatalogandListing.enums.ListingCategory;
import com.Listing.CatalogandListing.enums.ListingStatus;
import com.Listing.CatalogandListing.enums.PriceUnit;
import com.Listing.CatalogandListing.enums.SubCategory;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import jakarta.persistence.*;
import lombok.*;

import org.locationtech.jts.geom.Point;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "listings", indexes = {
    @Index(name = "idx_listing_host_id", columnList = "host_id"),
    @Index(name = "idx_listing_complex_id", columnList = "complex_id"),
    @Index(name = "idx_listing_category", columnList = "category"),
    @Index(name = "idx_listing_sub_category", columnList = "sub_category"),
    @Index(name = "idx_listing_province", columnList = "province")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Listing {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "host_id")
    private UUID hostId;

    @Column(name = "transport_operator_id")
    private UUID transportOperatorId;

    @Column(name = "transport_route_id")
    private UUID transportRouteId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "complex_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Complex complex;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ListingCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "sub_category", length = 50)
    private SubCategory subCategory;

    @Column(length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String province;

    @Column(name = "base_price", precision = 18, scale = 2)
    private BigDecimal basePrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "price_unit", length = 20)
    private PriceUnit priceUnit;

    private Double latitude;
    private Double longitude;

    @Column(columnDefinition = "geometry(Point,4326)")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Point location;

    @Column(name = "thumbnail_url", length = 255)
    private String thumbnailUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private BaseListingAttributes attributes;

    @Column(name = "average_rating", precision = 2, scale = 1, columnDefinition = "DECIMAL(2,1) DEFAULT 0.0")
    private BigDecimal averageRating;

    @Column(name = "total_reviews", columnDefinition = "INT DEFAULT 0")
    private Integer totalReviews;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ListingStatus status;

    @OneToMany(mappedBy = "listing", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<Review> reviews;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (averageRating == null) averageRating = BigDecimal.ZERO;
        if (totalReviews == null) totalReviews = 0;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
