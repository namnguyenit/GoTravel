package com.Gostay.BookingandInventory.repository;

import com.Gostay.BookingandInventory.entity.InventoryConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface InventoryConfigRepository extends JpaRepository<InventoryConfig, UUID> {
    Optional<InventoryConfig> findByListingId(UUID listingId);
}
