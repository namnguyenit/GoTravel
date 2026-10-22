package com.Gostay.BookingandInventory.repository;

import com.Gostay.BookingandInventory.entity.InventoryCalendar;
import com.Gostay.BookingandInventory.enums.InventoryCalendarStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InventoryCalendarRepository extends JpaRepository<InventoryCalendar, UUID> {
    List<InventoryCalendar> findByListingIdAndDateBetween(UUID listingId, LocalDate startDate, LocalDate endDate);
    
    Optional<InventoryCalendar> findByListingIdAndDateAndTimeSlot(UUID listingId, LocalDate date, String timeSlot);
    
    List<InventoryCalendar> findByListingIdAndDateBetweenAndTimeSlot(UUID listingId, LocalDate startDate, LocalDate endDate, String timeSlot);
    
    List<InventoryCalendar> findByListingIdAndDate(UUID listingId, LocalDate date);

    @Query("""
            select distinct calendar.listingId
            from InventoryCalendar calendar
            where calendar.listingId in :listingIds
              and calendar.date = :date
              and calendar.status <> :blockedStatus
              and calendar.availableQuantity >= :requiredQuantity
            """)
    List<UUID> findAvailableListingIdsOnDate(
            @Param("listingIds") List<UUID> listingIds,
            @Param("date") LocalDate date,
            @Param("blockedStatus") InventoryCalendarStatus blockedStatus,
            @Param("requiredQuantity") int requiredQuantity);
}
