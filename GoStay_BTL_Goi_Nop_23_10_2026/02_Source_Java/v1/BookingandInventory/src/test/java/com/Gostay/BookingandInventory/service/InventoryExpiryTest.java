package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.entity.*;
import com.Gostay.BookingandInventory.enums.*;
import com.Gostay.BookingandInventory.exeption.AppException;
import com.Gostay.BookingandInventory.repository.*;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InventoryExpiryTest {
    private final InventoryLockRepository locks=mock(InventoryLockRepository.class);
    private final InventoryCalendarRepository calendars=mock(InventoryCalendarRepository.class);
    private final InventoryInternalService service=new InventoryInternalService(mock(InventoryConfigRepository.class),calendars,locks);
    private InventoryLock fixture(InventoryLockStatus status, LocalDateTime expires) {
        var calendar=InventoryCalendar.builder().availableQuantity(9).build();
        var lock=InventoryLock.builder().id(UUID.randomUUID()).lockStatus(status).expiresAt(expires)
                .lockedQuantity(1).inventoryCalendar(calendar).build();
        when(locks.findById(lock.getId())).thenReturn(Optional.of(lock));
        return lock;
    }
    @Test void expiredLockRestoresExactlyOnce() {
        var lock=fixture(InventoryLockStatus.LOCKED,LocalDateTime.now().minusMinutes(1));
        assertTrue(service.expireLock(lock.getId()));
        assertEquals(10,lock.getInventoryCalendar().getAvailableQuantity());
        assertEquals(InventoryLockStatus.RELEASED,lock.getLockStatus());
        assertFalse(service.expireLock(lock.getId()));
        assertEquals(10,lock.getInventoryCalendar().getAvailableQuantity());
        verify(locks,times(1)).save(lock);
    }
    @Test void bookedLockCannotBeExpired() {
        var lock=fixture(InventoryLockStatus.CONFIRMED,LocalDateTime.now().minusMinutes(1));
        assertFalse(service.expireLock(lock.getId()));
        verify(calendars,never()).save(any());
    }
    @Test void unexpiredLockIsUnchanged() {
        var lock=fixture(InventoryLockStatus.LOCKED,LocalDateTime.now().plusMinutes(1));
        assertFalse(service.expireLock(lock.getId()));
        assertEquals(9,lock.getInventoryCalendar().getAvailableQuantity());
    }
    @Test void expiryOverflowDoesNotMutateLock() {
        var lock=fixture(InventoryLockStatus.LOCKED,LocalDateTime.now().minusMinutes(1));
        lock.getInventoryCalendar().setAvailableQuantity(Integer.MAX_VALUE);
        assertThrows(AppException.class,()->service.expireLock(lock.getId()));
        assertEquals(InventoryLockStatus.LOCKED,lock.getLockStatus());
        verify(locks,never()).save(any());
    }
    @Test void scheduledWorkerInvokesCleanupAndContinuesAfterAConflict() {
        var first=InventoryLock.builder().id(UUID.randomUUID()).build();
        var second=InventoryLock.builder().id(UUID.randomUUID()).build();
        when(locks.findTop100ByLockStatusAndExpiresAtBeforeOrderByExpiresAtAsc(eq(InventoryLockStatus.LOCKED),any()))
                .thenReturn(List.of(first,second));
        var target=mock(InventoryInternalService.class);
        when(target.expireLock(first.getId())).thenThrow(new org.springframework.dao.OptimisticLockingFailureException("conflict"));
        new InventoryExpiryWorker(locks,target).releaseExpiredLocks();
        verify(target).expireLock(second.getId());
    }
}
