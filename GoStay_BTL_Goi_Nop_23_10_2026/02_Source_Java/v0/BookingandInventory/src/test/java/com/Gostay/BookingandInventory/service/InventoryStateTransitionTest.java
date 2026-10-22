package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.dto.request.BatchLockRequest;
import com.Gostay.BookingandInventory.entity.InventoryCalendar;
import com.Gostay.BookingandInventory.entity.InventoryLock;
import com.Gostay.BookingandInventory.enums.InventoryCalendarStatus;
import com.Gostay.BookingandInventory.enums.InventoryLockStatus;
import com.Gostay.BookingandInventory.repository.InventoryCalendarRepository;
import com.Gostay.BookingandInventory.repository.InventoryConfigRepository;
import com.Gostay.BookingandInventory.repository.InventoryLockRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Kiểm thử các cạnh thực sự đi qua InventoryInternalService của v0.
 * Self-loop thuần mô hình và cạnh môi trường không được gọi là JUnit trên source.
 */
@ExtendWith(MockitoExtension.class)
class InventoryStateTransitionTest {

    @Mock InventoryConfigRepository configRepository;
    @Mock InventoryCalendarRepository calendarRepository;
    @Mock InventoryLockRepository lockRepository;
    @InjectMocks InventoryInternalService service;

    UUID orderId;
    UUID listingId;
    LocalDate stayDate;
    InventoryCalendar calendar;
    InventoryLock lock;

    @BeforeEach
    void setUp() {
        orderId = UUID.randomUUID();
        listingId = UUID.randomUUID();
        stayDate = LocalDate.now().plusDays(1);

        calendar = new InventoryCalendar();
        calendar.setId(UUID.randomUUID());
        calendar.setListingId(listingId);
        calendar.setDate(stayDate);
        calendar.setTimeSlot("ALL_DAY");
        calendar.setAvailableQuantity(9);
        calendar.setStatus(InventoryCalendarStatus.AVAILABLE);

        lock = new InventoryLock();
        lock.setId(UUID.randomUUID());
        lock.setOrderId(orderId);
        lock.setLockedQuantity(1);
        lock.setLockStatus(InventoryLockStatus.LOCKED);
        lock.setExpiresAt(LocalDateTime.now().plusMinutes(15));
        lock.setInventoryCalendar(calendar);
    }

    @Test
    @DisplayName("v0 edge S0 -> S1: batchLock hợp lệ gọi service thật")
    void batchLockCreatesLockedEdge() {
        calendar.setAvailableQuantity(10);
        when(calendarRepository.findByListingIdAndDateAndTimeSlot(listingId, stayDate, "ALL_DAY"))
                .thenReturn(Optional.of(calendar));

        service.batchLock(validRequest());

        assertEquals(9, calendar.getAvailableQuantity());
        ArgumentCaptor<InventoryLock> saved = ArgumentCaptor.forClass(InventoryLock.class);
        verify(lockRepository).save(saved.capture());
        assertEquals(InventoryLockStatus.LOCKED, saved.getValue().getLockStatus());
        assertEquals(orderId, saved.getValue().getOrderId());
    }

    @Test
    @DisplayName("v0 edge S1 -> S2: confirm LOCKED")
    void confirmLockedLock() {
        when(lockRepository.findByOrderId(orderId)).thenReturn(List.of(lock));
        service.confirmLock(orderId);
        assertEquals(InventoryLockStatus.CONFIRMED, lock.getLockStatus());
        verify(lockRepository).save(lock);
    }

    @Test
    @DisplayName("v0 edge S1 -> S3: cancel LOCKED hoàn kho")
    void cancelLockedLock() {
        when(lockRepository.findByOrderId(orderId)).thenReturn(List.of(lock));
        service.cancelLock(orderId);
        assertEquals(InventoryLockStatus.RELEASED, lock.getLockStatus());
        assertEquals(10, calendar.getAvailableQuantity());
        verify(lockRepository).save(lock);
        verify(calendarRepository).save(calendar);
    }

    @Test
    @DisplayName("v0 forbidden edge S3 -> S2: confirm RELEASED vẫn được nhận")
    void confirmsReleasedLockBug() {
        lock.setLockStatus(InventoryLockStatus.RELEASED);
        when(lockRepository.findByOrderId(orderId)).thenReturn(List.of(lock));
        service.confirmLock(orderId);
        assertEquals(InventoryLockStatus.CONFIRMED, lock.getLockStatus());
        verify(lockRepository).save(lock);
    }

    @Test
    @DisplayName("v0 forbidden edge S5 -> S2: confirm lock hết hạn vẫn được nhận")
    void confirmsExpiredLockBug() {
        lock.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        when(lockRepository.findByOrderId(orderId)).thenReturn(List.of(lock));
        service.confirmLock(orderId);
        assertEquals(InventoryLockStatus.CONFIRMED, lock.getLockStatus());
        verify(lockRepository).save(lock);
    }

    @Test
    @DisplayName("v0 forbidden edge S2 -> S4: cancel CONFIRMED gây cộng tồn kho lần hai")
    void cancelConfirmedLockCreatesOverbookingBug() {
        lock.setLockStatus(InventoryLockStatus.CONFIRMED);
        int bookedQuantity = 1;
        int capacity = 10;
        when(lockRepository.findByOrderId(orderId)).thenReturn(List.of(lock));

        service.cancelLock(orderId);

        assertEquals(InventoryLockStatus.RELEASED, lock.getLockStatus());
        assertEquals(10, calendar.getAvailableQuantity());
        assertTrue(calendar.getAvailableQuantity() + bookedQuantity > capacity);
        verify(calendarRepository).save(calendar);
    }

    @Test
    @DisplayName("v0 edge S3 -> S3: cancel RELEASED là no-op")
    void cancelReleasedLockIsNoOp() {
        lock.setLockStatus(InventoryLockStatus.RELEASED);
        when(lockRepository.findByOrderId(orderId)).thenReturn(List.of(lock));
        service.cancelLock(orderId);
        assertEquals(InventoryLockStatus.RELEASED, lock.getLockStatus());
        assertEquals(9, calendar.getAvailableQuantity());
        verify(lockRepository, never()).save(any());
        verify(calendarRepository, never()).save(any());
    }

    private BatchLockRequest validRequest() {
        return BatchLockRequest.builder()
                .orderId(orderId)
                .items(List.of(BatchLockRequest.LockItemRequest.builder()
                        .listingId(listingId)
                        .startDate(stayDate)
                        .endDate(stayDate)
                        .quantity(1)
                        .build()))
                .build();
    }
}
