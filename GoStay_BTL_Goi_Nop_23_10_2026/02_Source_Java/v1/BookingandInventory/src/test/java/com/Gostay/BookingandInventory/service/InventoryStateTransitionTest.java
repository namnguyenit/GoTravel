package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.dto.request.BatchLockRequest;
import com.Gostay.BookingandInventory.entity.InventoryCalendar;
import com.Gostay.BookingandInventory.entity.InventoryLock;
import com.Gostay.BookingandInventory.enums.InventoryCalendarStatus;
import com.Gostay.BookingandInventory.enums.InventoryLockStatus;
import com.Gostay.BookingandInventory.exeption.AppException;
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
    @DisplayName("v1: S0 -> S1 qua batchLock hợp lệ trên service thật")
    void batchLockCreatesLockedEdge() {
        calendar.setAvailableQuantity(10);
        when(calendarRepository.findByListingIdAndDateAndTimeSlot(listingId, stayDate, "ALL_DAY"))
                .thenReturn(Optional.of(calendar));

        service.batchLock(validRequest(1, stayDate, stayDate));

        assertEquals(9, calendar.getAvailableQuantity());
        ArgumentCaptor<InventoryLock> saved = ArgumentCaptor.forClass(InventoryLock.class);
        verify(lockRepository).save(saved.capture());
        assertEquals(InventoryLockStatus.LOCKED, saved.getValue().getLockStatus());
    }

    @Test
    @DisplayName("v1: S0 -> S0 khi không đủ tồn kho và không ghi repository")
    void rejectInsufficientInventoryWithoutMutation() {
        calendar.setAvailableQuantity(0);
        when(calendarRepository.findByListingIdAndDateAndTimeSlot(listingId, stayDate, "ALL_DAY"))
                .thenReturn(Optional.of(calendar));

        assertThrows(AppException.class, () -> service.batchLock(validRequest(1, stayDate, stayDate)));

        assertEquals(0, calendar.getAvailableQuantity());
        verify(calendarRepository, never()).save(any());
        verify(lockRepository, never()).save(any());
    }

    @Test
    @DisplayName("v1: LOCKED -> CONFIRMED là chuyển trạng thái hợp lệ")
    void confirmLockedLock() {
        when(lockRepository.findByOrderId(orderId)).thenReturn(List.of(lock));
        service.confirmLock(orderId);
        assertEquals(InventoryLockStatus.CONFIRMED, lock.getLockStatus());
        verify(lockRepository).save(lock);
    }

    @Test
    @DisplayName("v1: từ chối xác nhận lại lock đã RELEASED")
    void rejectConfirmReleasedLock() {
        lock.setLockStatus(InventoryLockStatus.RELEASED);
        when(lockRepository.findByOrderId(orderId)).thenReturn(List.of(lock));
        assertThrows(AppException.class, () -> service.confirmLock(orderId));
        assertEquals(InventoryLockStatus.RELEASED, lock.getLockStatus());
        verify(lockRepository, never()).save(any());
    }

    @Test
    @DisplayName("v1: từ chối xác nhận lock đã hết hạn")
    void rejectConfirmExpiredLock() {
        lock.setExpiresAt(LocalDateTime.now().minusSeconds(1));
        when(lockRepository.findByOrderId(orderId)).thenReturn(List.of(lock));
        assertThrows(AppException.class, () -> service.confirmLock(orderId));
        assertEquals(InventoryLockStatus.LOCKED, lock.getLockStatus());
        verify(lockRepository, never()).save(any());
    }

    @Test
    @DisplayName("v1: S2 -> S2 khi confirm lại CONFIRMED bị từ chối")
    void rejectConfirmConfirmedLock() {
        lock.setLockStatus(InventoryLockStatus.CONFIRMED);
        when(lockRepository.findByOrderId(orderId)).thenReturn(List.of(lock));
        assertThrows(AppException.class, () -> service.confirmLock(orderId));
        assertEquals(InventoryLockStatus.CONFIRMED, lock.getLockStatus());
        verify(lockRepository, never()).save(any());
    }

    @Test
    @DisplayName("v1: hủy lock đang LOCKED hoàn trả đúng số lượng")
    void cancelLockedLock() {
        when(lockRepository.findByOrderId(orderId)).thenReturn(List.of(lock));
        service.cancelLock(orderId);
        assertEquals(InventoryLockStatus.RELEASED, lock.getLockStatus());
        assertEquals(10, calendar.getAvailableQuantity());
        verify(lockRepository).save(lock);
        verify(calendarRepository).save(calendar);
    }

    @Test
    @DisplayName("v1: State Guard chặn hủy đơn CONFIRMED")
    void rejectCancelConfirmedLock() {
        lock.setLockStatus(InventoryLockStatus.CONFIRMED);
        when(lockRepository.findByOrderId(orderId)).thenReturn(List.of(lock));
        assertThrows(AppException.class, () -> service.cancelLock(orderId));
        assertEquals(InventoryLockStatus.CONFIRMED, lock.getLockStatus());
        assertEquals(9, calendar.getAvailableQuantity());
        verify(lockRepository, never()).save(any());
        verify(calendarRepository, never()).save(any());
    }

    @Test
    @DisplayName("v1: S3 -> S3 khi cancel lại RELEASED bị từ chối")
    void rejectCancelReleasedLock() {
        lock.setLockStatus(InventoryLockStatus.RELEASED);
        when(lockRepository.findByOrderId(orderId)).thenReturn(List.of(lock));
        assertThrows(AppException.class, () -> service.cancelLock(orderId));
        assertEquals(InventoryLockStatus.RELEASED, lock.getLockStatus());
        assertEquals(9, calendar.getAvailableQuantity());
        verify(lockRepository, never()).save(any());
        verify(calendarRepository, never()).save(any());
    }

    @Test
    @DisplayName("v1: S5 -> S3 khi caller hủy lock đã hết hạn nhưng enum vẫn LOCKED")
    void cancelExpiredLockRestoresInventory() {
        lock.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        when(lockRepository.findByOrderId(orderId)).thenReturn(List.of(lock));
        service.cancelLock(orderId);
        assertEquals(InventoryLockStatus.RELEASED, lock.getLockStatus());
        assertEquals(10, calendar.getAvailableQuantity());
        verify(lockRepository).save(lock);
        verify(calendarRepository).save(calendar);
    }

    @Test
    @DisplayName("v1: Math.addExact chặn tràn int32 khi hoàn kho")
    void rejectIntegerOverflowOnCancel() {
        calendar.setAvailableQuantity(Integer.MAX_VALUE);
        when(lockRepository.findByOrderId(orderId)).thenReturn(List.of(lock));
        assertThrows(AppException.class, () -> service.cancelLock(orderId));
        assertEquals(InventoryLockStatus.LOCKED, lock.getLockStatus());
        assertEquals(Integer.MAX_VALUE, calendar.getAvailableQuantity());
        verify(lockRepository, never()).save(any());
    }

    @Test
    @DisplayName("v1: từ chối số lượng lớn hơn 50")
    void rejectQuantityAboveFifty() {
        BatchLockRequest request = validRequest(51, LocalDate.now().plusDays(1), LocalDate.now().plusDays(1));
        assertThrows(AppException.class, () -> service.batchLock(request));
        verifyNoInteractions(calendarRepository, lockRepository);
    }

    @Test
    @DisplayName("v1: từ chối khoảng đặt vượt quá 90 ngày tính cả hai đầu")
    void rejectDateRangeAboveNinetyDays() {
        LocalDate start = LocalDate.now().plusDays(1);
        BatchLockRequest request = validRequest(1, start, start.plusDays(90));
        assertThrows(AppException.class, () -> service.batchLock(request));
        verifyNoInteractions(calendarRepository, lockRepository);
    }

    private BatchLockRequest validRequest(int quantity, LocalDate start, LocalDate end) {
        return BatchLockRequest.builder()
                .orderId(orderId)
                .items(List.of(BatchLockRequest.LockItemRequest.builder()
                        .listingId(listingId)
                        .startDate(start)
                        .endDate(end)
                        .quantity(quantity)
                        .build()))
                .build();
    }
}
