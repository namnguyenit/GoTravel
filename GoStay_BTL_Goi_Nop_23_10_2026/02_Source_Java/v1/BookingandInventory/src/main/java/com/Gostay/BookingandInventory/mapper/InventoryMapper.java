package com.Gostay.BookingandInventory.mapper;

import com.Gostay.BookingandInventory.dto.response.CalendarResponse;
import com.Gostay.BookingandInventory.dto.response.LockResponse;
import com.Gostay.BookingandInventory.entity.InventoryCalendar;
import com.Gostay.BookingandInventory.entity.InventoryLock;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface InventoryMapper {

    @Mapping(target = "status", source = "status", qualifiedByName = "enumToString")
    CalendarResponse toCalendarResponse(InventoryCalendar calendar);

    default CalendarResponse toHostCalendarResponse(InventoryCalendar c) {
        if (c == null) {
            return null;
        }

        int locked = 0;
        int confirmed = 0;
        if (c.getInventoryLocks() != null) {
            for (InventoryLock lock : c.getInventoryLocks()) {
                if (lock.getLockStatus().name().equals("LOCKED")) {
                    locked += lock.getLockedQuantity();
                } else if (lock.getLockStatus().name().equals("CONFIRMED")) {
                    confirmed += lock.getLockedQuantity();
                }
            }
        }
        int total = (c.getAvailableQuantity() != null ? c.getAvailableQuantity() : 0) + locked + confirmed;

        return CalendarResponse.builder()
                .date(c.getDate())
                .timeSlot(c.getTimeSlot())
                .totalQuantity(total)
                .availableQuantity(c.getAvailableQuantity() != null ? c.getAvailableQuantity() : 0)
                .lockedQuantity(locked)
                .confirmedQuantity(confirmed)
                .status(c.getStatus() != null ? c.getStatus().name() : null)
                .build();
    }

    @Mapping(target = "lockId", source = "id")
    @Mapping(target = "lockStatus", source = "lockStatus", qualifiedByName = "enumToString")
    LockResponse toLockResponse(InventoryLock lock);

    @Named("enumToString")
    default String enumToString(Enum<?> e) {
        return e != null ? e.name() : null;
    }
}
