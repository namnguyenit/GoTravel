package com.Gostay.BookingandInventory.repository;

import com.Gostay.BookingandInventory.entity.InventoryLock;
import com.Gostay.BookingandInventory.enums.InventoryLockStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface InventoryLockRepository extends JpaRepository<InventoryLock, UUID> {
    List<InventoryLock> findByOrderId(UUID orderId);
    
    List<InventoryLock> findByInventoryCalendarListingIdAndInventoryCalendarDate(UUID listingId, LocalDate date);
    
    List<InventoryLock> findByLockStatusAndExpiresAtBefore(InventoryLockStatus lockStatus, LocalDateTime time);
}
