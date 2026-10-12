package com.Listing.CatalogandListing.repository;

import com.Listing.CatalogandListing.entity.Listing;
import com.Listing.CatalogandListing.enums.ListingCategory;
import com.Listing.CatalogandListing.enums.ListingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;
import java.util.Optional;

@Repository
public interface ListingRepository extends JpaRepository<Listing, UUID> {
    @Query("select l.transportRouteId from Listing l where l.category=com.Listing.CatalogandListing.enums.ListingCategory.TRANSPORT and l.status=com.Listing.CatalogandListing.enums.ListingStatus.ACTIVE and l.transportRouteId is not null")
    List<UUID> findActiveTransportRouteIds();
    Optional<Listing> findByTransportRouteId(UUID transportRouteId);
    List<Listing> findByHostId(UUID hostId);
    Page<Listing> findByHostId(UUID hostId, Pageable pageable);
    List<Listing> findByComplexId(UUID complexId);
    List<Listing> findByCategory(ListingCategory category);
    List<Listing> findByProvince(String province);
    List<Listing> findByStatus(ListingStatus status);
    Page<Listing> findByStatus(ListingStatus status, Pageable pageable);
    long countByStatus(ListingStatus status);

    @Query("""
            select listing
            from Listing listing
            where (:status is null or listing.status = :status)
              and (
                :keyword is null
                or :keyword = ''
                or lower(listing.title) like lower(concat('%', :keyword, '%'))
                or lower(listing.description) like lower(concat('%', :keyword, '%'))
                or lower(listing.province) like lower(concat('%', :keyword, '%'))
              )
            """)
    Page<Listing> searchForAdmin(@Param("status") ListingStatus status,
                                 @Param("keyword") String keyword,
                                 Pageable pageable);
}
