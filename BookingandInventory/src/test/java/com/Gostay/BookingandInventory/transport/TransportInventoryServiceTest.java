package com.Gostay.BookingandInventory.transport;

import com.Gostay.BookingandInventory.transport.application.TransportInventoryService;
import com.Gostay.BookingandInventory.transport.domain.TransportInventory;
import com.Gostay.BookingandInventory.transport.domain.TransportInventoryRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TransportInventoryServiceTest {
    private final TransportInventoryRepository repository = mock(TransportInventoryRepository.class);
    private final TransportInventoryService service = new TransportInventoryService(repository);
    private final UUID order = UUID.randomUUID();
    private final UUID trip = UUID.randomUUID();
    private final UUID seat = UUID.randomUUID();

    @Test
    void reserveRejectsAlreadyHeldSeatWithoutCreatingAnotherHold() {
        when(repository.findHoldForUpdate(order)).thenReturn(Optional.empty());
        when(repository.findTripForUpdate(trip)).thenReturn(Optional.of(
                new TransportInventory.Trip(trip, UUID.randomUUID(), Instant.now().plusSeconds(3600), true)));
        when(repository.findSeatsForUpdate(trip, List.of(seat))).thenReturn(List.of(
                new TransportInventory.Seat(trip, seat, "A1", TransportInventory.SeatStatus.HELD,
                        UUID.randomUUID(), UUID.randomUUID(), Instant.now().plusSeconds(300))));

        assertThatThrownBy(() -> service.reserve(order, trip, List.of(seat)))
                .hasMessageContaining("Ghế đã được giữ");
        verify(repository, never()).insertHold(any());
    }

    @Test
    void confirmedSeatCannotBeReleasedByUnpaidCancellation() {
        when(repository.findHoldForUpdate(order)).thenReturn(Optional.of(new TransportInventory.Hold(
                UUID.randomUUID(), order, trip, List.of(seat), TransportInventory.HoldStatus.SOLD,
                Instant.now().minusSeconds(1))));

        assertThatThrownBy(() -> service.releaseUnpaid(order, false))
                .hasMessageContaining("Không thể nhả ghế đã bán");
        verify(repository, never()).updateSeats(any());
    }

    @Test
    void reserveDoesNotPromiseFifteenMinutesAfterDeparture() {
        when(repository.findHoldForUpdate(order)).thenReturn(Optional.empty());
        when(repository.findTripForUpdate(trip)).thenReturn(Optional.of(
                new TransportInventory.Trip(trip, UUID.randomUUID(), Instant.now().plusSeconds(60), true)));

        assertThatThrownBy(() -> service.reserve(order, trip, List.of(seat)))
                .hasMessageContaining("Chuyến không mở bán");
        verify(repository, never()).insertHold(any());
    }

    @Test
    void confirmationRequiresUnexpiredMatchingHoldAndSeat() {
        UUID holdId = UUID.randomUUID();
        when(repository.findHoldForUpdate(order)).thenReturn(Optional.of(new TransportInventory.Hold(
                holdId, order, trip, List.of(seat), TransportInventory.HoldStatus.HELD,
                Instant.now().plusSeconds(300))));
        when(repository.findSeatsForUpdate(trip, List.of(seat))).thenReturn(List.of(
                new TransportInventory.Seat(trip, seat, "A1", TransportInventory.SeatStatus.HELD,
                        UUID.randomUUID(), holdId, Instant.now().plusSeconds(300))));

        assertThatThrownBy(() -> service.confirmSale(order)).hasMessageContaining("không khớp");
        verify(repository, never()).updateHold(any());
        verify(repository, never()).updateSeats(any());
    }

    @Test
    void soldSeatIsReleasedOnlyForItsMatchingOrder() {
        UUID holdId = UUID.randomUUID();
        when(repository.findHoldForUpdate(order)).thenReturn(Optional.of(new TransportInventory.Hold(
                holdId, order, trip, List.of(seat), TransportInventory.HoldStatus.SOLD,
                Instant.now().minusSeconds(60))));
        when(repository.findSeatsForUpdate(trip, List.of(seat))).thenReturn(List.of(
                new TransportInventory.Seat(trip, seat, "A1", TransportInventory.SeatStatus.SOLD,
                        UUID.randomUUID(), holdId, null)));
        assertThatThrownBy(() -> service.cancelSold(order)).hasMessageContaining("không khớp");
        verify(repository, never()).updateSeats(any());
    }
}
