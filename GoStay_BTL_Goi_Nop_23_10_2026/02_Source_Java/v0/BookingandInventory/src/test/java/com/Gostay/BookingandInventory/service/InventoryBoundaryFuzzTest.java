package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.dto.request.BatchLockRequest;
import com.Gostay.BookingandInventory.entity.InventoryCalendar;
import com.Gostay.BookingandInventory.enums.InventoryCalendarStatus;
import com.Gostay.BookingandInventory.mapper.InventoryMapper;
import com.Gostay.BookingandInventory.repository.InventoryCalendarRepository;
import com.Gostay.BookingandInventory.repository.InventoryConfigRepository;
import com.Gostay.BookingandInventory.repository.InventoryLockRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class InventoryBoundaryFuzzTest {

    @Test
    void deterministicFuzzRecordsInvalidInputsAcceptedByV0() {
        Random random = new Random(703093L);
        int acceptedInvertedDates = 0;
        int acceptedOversizedQuantities = 0;

        InventoryCalendarRepository publicRepository = mock(InventoryCalendarRepository.class);
        when(publicRepository.findByListingIdAndDateBetween(any(), any(), any()))
                .thenReturn(Collections.emptyList());
        InventoryPublicService publicService = new InventoryPublicService(
                publicRepository, mock(InventoryMapper.class));

        for (int i = 0; i < 150; i++) {
            LocalDate end = LocalDate.now().plusDays(random.nextInt(30) + 1L);
            LocalDate start = end.plusDays(random.nextInt(30) + 1L);
            publicService.getAvailability(UUID.randomUUID(), start, end);
            acceptedInvertedDates++;
        }

        InventoryCalendarRepository calendarRepository = mock(InventoryCalendarRepository.class);
        InventoryLockRepository lockRepository = mock(InventoryLockRepository.class);
        InventoryInternalService internalService = new InventoryInternalService(
                mock(InventoryConfigRepository.class), calendarRepository, lockRepository);

        for (int i = 0; i < 150; i++) {
            int quantity = 51 + random.nextInt(50);
            InventoryCalendar calendar = new InventoryCalendar();
            calendar.setAvailableQuantity(1000);
            calendar.setStatus(InventoryCalendarStatus.AVAILABLE);
            when(calendarRepository.findByListingIdAndDateAndTimeSlot(any(), any(), any()))
                    .thenReturn(Optional.of(calendar));
            internalService.batchLock(request(quantity));
            acceptedOversizedQuantities++;
        }

        System.out.printf("FUZZ_V0 seed=703093 cases=300 inverted_dates_accepted=%d oversized_quantity_accepted=%d%n",
                acceptedInvertedDates, acceptedOversizedQuantities);
        assertEquals(150, acceptedInvertedDates);
        assertEquals(150, acceptedOversizedQuantities);
    }

    private BatchLockRequest request(int quantity) {
        LocalDate date = LocalDate.now().plusDays(1);
        return BatchLockRequest.builder()
                .orderId(UUID.randomUUID())
                .items(List.of(BatchLockRequest.LockItemRequest.builder()
                        .listingId(UUID.randomUUID())
                        .startDate(date)
                        .endDate(date)
                        .quantity(quantity)
                        .build()))
                .build();
    }
}
