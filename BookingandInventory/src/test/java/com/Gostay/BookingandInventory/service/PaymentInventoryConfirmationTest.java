package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.entity.InventoryLock;
import com.Gostay.BookingandInventory.enums.InventoryLockStatus;
import com.Gostay.BookingandInventory.repository.*;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class PaymentInventoryConfirmationTest {
    private final InventoryLockRepository locks = mock(InventoryLockRepository.class);
    private final InventoryInternalService service = new InventoryInternalService(mock(InventoryConfigRepository.class),
            mock(InventoryCalendarRepository.class), locks);

    @Test
    void releasedOrExpiredInventoryCannotBeConfirmed() {
        UUID id = UUID.randomUUID();
        var lock = InventoryLock.builder().lockStatus(InventoryLockStatus.RELEASED).expiresAt(LocalDateTime.now().plusMinutes(5)).build();
        when(locks.findByOrderIdForUpdate(id)).thenReturn(List.of(lock));
        assertThatThrownBy(() -> service.confirmLock(id)).isInstanceOf(RuntimeException.class);
        lock.setLockStatus(InventoryLockStatus.LOCKED); lock.setExpiresAt(LocalDateTime.now().minusSeconds(1));
        assertThatThrownBy(() -> service.confirmLock(id)).isInstanceOf(RuntimeException.class);
        verify(locks, never()).save(any());
    }

    @Test
    void repeatedConfirmationKeepsConfirmedReservation() {
        UUID id = UUID.randomUUID();
        var lock = InventoryLock.builder().lockStatus(InventoryLockStatus.CONFIRMED).expiresAt(LocalDateTime.now().minusMinutes(2)).build();
        when(locks.findByOrderIdForUpdate(id)).thenReturn(List.of(lock));
        service.confirmLock(id);
        assertThat(lock.getLockStatus()).isEqualTo(InventoryLockStatus.CONFIRMED);
    }
}
