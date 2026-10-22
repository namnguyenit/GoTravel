package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.dto.request.BatchCheckAvailabilityRequest;
import com.Gostay.BookingandInventory.entity.InventoryCalendar;
import com.Gostay.BookingandInventory.enums.InventoryCalendarStatus;
import com.Gostay.BookingandInventory.exeption.AppException;
import com.Gostay.BookingandInventory.repository.*;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Review-only tests. Failures express behavior the input contract should reject. */
class InventoryAdditionalValidationTest {
    private final InventoryCalendarRepository calendars = mock(InventoryCalendarRepository.class);
    private final InventoryInternalService service = new InventoryInternalService(
            mock(InventoryConfigRepository.class), calendars, mock(InventoryLockRepository.class));

    @Test void invertedBatchAvailabilityMustNotReturnAllListingIds() {
        UUID id = UUID.randomUUID();
        var request = new BatchCheckAvailabilityRequest(List.of(id), LocalDate.now().plusDays(5), LocalDate.now().plusDays(1), 1);
        assertThrows(AppException.class, () -> service.batchCheckAvailability(request));
    }

    @Test void zeroRequiredQuantityMustFailBeanValidation() {
        var request = new BatchCheckAvailabilityRequest(List.of(UUID.randomUUID()), LocalDate.now(), LocalDate.now(), 0);
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var violations = factory.getValidator().validate(request);
            assertFalse(violations.isEmpty(), "requiredQuantity=0 is currently accepted by HTTP bean validation");
        }
    }

    @Test void negativeQuantityMustNotMakeSoldOutListingAvailable() {
        UUID id = UUID.randomUUID();
        LocalDate start = LocalDate.now().plusDays(1);
        var calendar = InventoryCalendar.builder().listingId(id).availableQuantity(0)
                .status(InventoryCalendarStatus.AVAILABLE).build();
        when(calendars.findByListingIdAndDate(eq(id), any())).thenReturn(List.of(calendar));
        var request = new BatchCheckAvailabilityRequest(List.of(id), start, start.plusDays(1), -1);
        assertThrows(AppException.class, () -> service.batchCheckAvailability(request));
    }

    @Test void builderMustKeepDeclaredRequiredQuantityDefault() {
        var request = BatchCheckAvailabilityRequest.builder().listingIds(List.of(UUID.randomUUID()))
                .startDate(LocalDate.now()).endDate(LocalDate.now()).build();
        assertEquals(1, request.getRequiredQuantity());
    }
}
