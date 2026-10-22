package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.dto.request.BatchLockRequest;
import com.Gostay.BookingandInventory.exeption.AppException;
import com.Gostay.BookingandInventory.mapper.InventoryMapper;
import com.Gostay.BookingandInventory.repository.InventoryCalendarRepository;
import com.Gostay.BookingandInventory.repository.InventoryConfigRepository;
import com.Gostay.BookingandInventory.repository.InventoryLockRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Random;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

class InventoryBoundaryFuzzTest {

    @Test
    void deterministicFuzzRejectsInvalidInputsInV1() {
        Random random = new Random(703093L);
        int rejectedInvertedDates = 0;
        int rejectedOversizedQuantities = 0;
        int rejectedLongRanges = 0;

        InventoryPublicService publicService = new InventoryPublicService(
                mock(InventoryCalendarRepository.class), mock(InventoryMapper.class));
        InventoryInternalService internalService = new InventoryInternalService(
                mock(InventoryConfigRepository.class),
                mock(InventoryCalendarRepository.class),
                mock(InventoryLockRepository.class));

        for (int i = 0; i < 100; i++) {
            LocalDate end = LocalDate.now().plusDays(random.nextInt(30) + 1L);
            LocalDate start = end.plusDays(random.nextInt(30) + 1L);
            assertThrows(AppException.class,
                    () -> publicService.getAvailability(UUID.randomUUID(), start, end));
            rejectedInvertedDates++;
        }

        for (int i = 0; i < 100; i++) {
            int quantity = 51 + random.nextInt(500);
            assertThrows(AppException.class,
                    () -> internalService.batchLock(request(quantity, 0)));
            rejectedOversizedQuantities++;
        }

        for (int i = 0; i < 100; i++) {
            int inclusiveDays = 91 + random.nextInt(180);
            assertThrows(AppException.class,
                    () -> internalService.batchLock(request(1, inclusiveDays - 1)));
            rejectedLongRanges++;
        }

        System.out.printf("FUZZ_V1 seed=703093 cases=300 rejected_inverted_dates=%d rejected_oversized_quantity=%d rejected_long_ranges=%d%n",
                rejectedInvertedDates, rejectedOversizedQuantities, rejectedLongRanges);
        assertEquals(100, rejectedInvertedDates);
        assertEquals(100, rejectedOversizedQuantities);
        assertEquals(100, rejectedLongRanges);
    }

    private BatchLockRequest request(int quantity, int dateOffset) {
        LocalDate start = LocalDate.now().plusDays(1);
        return BatchLockRequest.builder()
                .orderId(UUID.randomUUID())
                .items(List.of(BatchLockRequest.LockItemRequest.builder()
                        .listingId(UUID.randomUUID())
                        .startDate(start)
                        .endDate(start.plusDays(dateOffset))
                        .quantity(quantity)
                        .build()))
                .build();
    }
}
