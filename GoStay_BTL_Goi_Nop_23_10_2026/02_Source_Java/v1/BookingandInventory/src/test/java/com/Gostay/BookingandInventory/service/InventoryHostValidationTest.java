package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.dto.request.BlockCalendarRequest;
import com.Gostay.BookingandInventory.entity.InventoryCalendar;
import com.Gostay.BookingandInventory.enums.InventoryCalendarStatus;
import com.Gostay.BookingandInventory.exeption.AppException;
import com.Gostay.BookingandInventory.mapper.InventoryMapper;
import com.Gostay.BookingandInventory.repository.*;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Additional endpoints shipped in the package, outside the report's narrow scope. */
class InventoryHostValidationTest {
    @Test void negativeAvailableQuantityMustBeRejected() {
        UUID id=UUID.randomUUID(); LocalDate date=LocalDate.now().plusDays(1);
        var calendar=InventoryCalendar.builder().availableQuantity(10).status(InventoryCalendarStatus.AVAILABLE).build();
        var repo=mock(InventoryCalendarRepository.class);
        when(repo.findByListingIdAndDateBetweenAndTimeSlot(id,date,date,"ALL_DAY")).thenReturn(List.of(calendar));
        var service=new InventoryHostService(repo,mock(InventoryLockRepository.class),mock(InventoryMapper.class));
        var request=new BlockCalendarRequest(date,date,"ALL_DAY","UPDATE_QUANTITY",-5);
        assertThrows(AppException.class,()->service.blockCalendar(id,request),"Host API accepts negative inventory");
    }
    @Test void unknownActionMustNotUnblockCalendar() {
        UUID id=UUID.randomUUID(); LocalDate date=LocalDate.now().plusDays(1);
        var calendar=InventoryCalendar.builder().availableQuantity(10).status(InventoryCalendarStatus.BLOCKED).build();
        var repo=mock(InventoryCalendarRepository.class);
        when(repo.findByListingIdAndDateBetweenAndTimeSlot(id,date,date,"ALL_DAY")).thenReturn(List.of(calendar));
        var service=new InventoryHostService(repo,mock(InventoryLockRepository.class),mock(InventoryMapper.class));
        var request=new BlockCalendarRequest(date,date,"ALL_DAY","BLOKC",null);
        assertThrows(AppException.class, () -> service.blockCalendar(id,request));
        assertEquals(InventoryCalendarStatus.BLOCKED,calendar.getStatus(),"Unknown action silently opens a blocked room");
    }
}
