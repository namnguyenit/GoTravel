package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.exeption.AppException;
import com.Gostay.BookingandInventory.mapper.InventoryMapper;
import com.Gostay.BookingandInventory.repository.InventoryCalendarRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class InventoryPublicServiceValidationTest {

    @Test
    void rejectInvertedDateRangeBeforeQueryingDatabase() {
        InventoryCalendarRepository repository = mock(InventoryCalendarRepository.class);
        InventoryMapper mapper = mock(InventoryMapper.class);
        InventoryPublicService service = new InventoryPublicService(repository, mapper);

        LocalDate start = LocalDate.now().plusDays(2);
        LocalDate end = LocalDate.now().plusDays(1);

        assertThrows(AppException.class,
                () -> service.getAvailability(UUID.randomUUID(), start, end));
        verifyNoInteractions(repository, mapper);
    }
}
