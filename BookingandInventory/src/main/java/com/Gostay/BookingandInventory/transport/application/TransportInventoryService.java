package com.Gostay.BookingandInventory.transport.application;

import com.Gostay.BookingandInventory.transport.domain.TransportInventory;
import com.Gostay.BookingandInventory.transport.domain.TransportInventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransportInventoryService {
    private static final Duration HOLD_DURATION = Duration.ofMinutes(15);
    private final TransportInventoryRepository repository;
    private final Clock clock = Clock.systemUTC();

    @Transactional
    public void initialize(UUID tripId, UUID operatorId, Instant departureAt, List<SeatDefinition> definitions) {
        if (tripId == null || operatorId == null || departureAt == null ||
                !departureAt.isAfter(clock.instant()) || definitions == null || definitions.isEmpty()) {
            throw badRequest("Thông tin chuyến hoặc ghế không hợp lệ");
        }
        var ids = new HashSet<UUID>();
        var codes = new HashSet<String>();
        var seats = new ArrayList<TransportInventory.Seat>();
        for (var definition : definitions) {
            if (definition == null || definition.seatId() == null || definition.code() == null ||
                    definition.code().isBlank() || !ids.add(definition.seatId()) ||
                    !codes.add(definition.code().trim().toUpperCase())) {
                throw badRequest("Danh sách ghế trùng hoặc không hợp lệ");
            }
            seats.add(new TransportInventory.Seat(tripId, definition.seatId(), definition.code().trim(),
                    TransportInventory.SeatStatus.AVAILABLE, null, null, null));
        }
        repository.lockKey(tripId);
        var existing = repository.findTripForUpdate(tripId);
        if (existing.isPresent()) {
            var currentSeats = repository.findAllSeats(tripId);
            if (existing.get().operatorId().equals(operatorId) &&
                    existing.get().departureAt().equals(departureAt) &&
                    currentSeats.size() == seats.size() &&
                    currentSeats.stream().map(TransportInventory.Seat::seatId).collect(java.util.stream.Collectors.toSet()).equals(ids)) {
                return;
            }
            throw conflict("Chuyến đã có inventory khác; không ghi đè ghế đã bán");
        }
        repository.createTrip(new TransportInventory.Trip(tripId, operatorId, departureAt, false), seats);
    }

    public record SaleStatusResult(UUID tripId, boolean saleEnabled, int syncVersion) {}

    @Transactional
    public SaleStatusResult setSaleEnabled(UUID tripId, boolean enabled, int version) {
        repository.lockKey(tripId);
        var trip = repository.findTripForUpdate(tripId)
                .orElseThrow(() -> badRequest("Chuyến chưa khởi tạo inventory"));

        if (version > trip.syncVersion()) {
            if (enabled && !trip.departureAt().isAfter(clock.instant())) {
                throw conflict("Chuyến đã khởi hành");
            }
            repository.setSaleEnabled(tripId, enabled, version);
            return new SaleStatusResult(tripId, enabled, version);
        } else if (version == trip.syncVersion()) {
            if (enabled == trip.saleEnabled()) {
                return new SaleStatusResult(tripId, trip.saleEnabled(), trip.syncVersion());
            } else {
                throw conflict("Xung đột version trạng thái bán: version " + version + " đã có trạng thái " + trip.saleEnabled());
            }
        } else {
            // Stale version: ignore update, keep existing state
            return new SaleStatusResult(tripId, trip.saleEnabled(), trip.syncVersion());
        }
    }

    @Transactional
    public SaleStatusResult setSaleEnabled(UUID tripId, boolean enabled) {
        var trip = repository.findTripForUpdate(tripId)
                .orElseThrow(() -> badRequest("Chuyến chưa khởi tạo inventory"));
        return setSaleEnabled(tripId, enabled, trip.syncVersion() + 1);
    }

    @Transactional
    public HoldResult reserve(UUID orderId, UUID tripId, List<UUID> requestedSeats) {
        if (orderId == null || tripId == null || requestedSeats == null || requestedSeats.isEmpty() ||
                requestedSeats.stream().anyMatch(Objects::isNull) ||
                new HashSet<>(requestedSeats).size() != requestedSeats.size()) {
            throw badRequest("Danh sách ghế không hợp lệ");
        }
        var seatIds = requestedSeats.stream().sorted().toList();
        repository.lockKey(orderId);
        var existing = repository.findHoldForUpdate(orderId);
        if (existing.isPresent()) {
            var hold = existing.get();
            if (hold.tripId().equals(tripId) && hold.seatIds().stream().sorted().toList().equals(seatIds) &&
                    hold.status() == TransportInventory.HoldStatus.HELD && hold.expiresAt().isAfter(clock.instant())) {
                return new HoldResult(hold.id(), hold.expiresAt(), hold.seatIds());
            }
            throw conflict("Order đã có hold hoặc hold không còn hiệu lực");
        }
        var trip = repository.findTripForUpdate(tripId)
                .orElseThrow(() -> badRequest("Chuyến chưa khởi tạo inventory"));
        if (!trip.saleEnabled() || !trip.departureAt().isAfter(clock.instant().plus(HOLD_DURATION))) {
            throw conflict("Chuyến không mở bán");
        }
        var seats = repository.findSeatsForUpdate(tripId, seatIds);
        if (seats.size() != seatIds.size() ||
                seats.stream().anyMatch(seat -> seat.status() != TransportInventory.SeatStatus.AVAILABLE)) {
            throw conflict("Ghế đã được giữ, bán hoặc chặn");
        }
        var holdId = UUID.randomUUID();
        var expiresAt = clock.instant().plus(HOLD_DURATION);
        var hold = new TransportInventory.Hold(holdId, orderId, tripId, seatIds,
                TransportInventory.HoldStatus.HELD, expiresAt);
        repository.insertHold(hold);
        repository.updateSeats(seats.stream().map(seat -> seat.change(
                TransportInventory.SeatStatus.HELD, orderId, holdId, expiresAt)).toList());
        return new HoldResult(holdId, expiresAt, seatIds);
    }

    @Transactional
    public void confirmSale(UUID orderId) {
        repository.lockKey(orderId);
        var hold = repository.findHoldForUpdate(orderId)
                .orElseThrow(() -> conflict("Không tìm thấy hold của order"));
        if (hold.status() == TransportInventory.HoldStatus.SOLD) return;
        if (hold.status() != TransportInventory.HoldStatus.HELD ||
                !hold.expiresAt().isAfter(clock.instant())) {
            throw conflict("Hold đã hết hạn hoặc được giải phóng");
        }
        var seats = repository.findSeatsForUpdate(hold.tripId(), hold.seatIds());
        if (seats.size() != hold.seatIds().size() || seats.stream().anyMatch(
                seat -> seat.status() != TransportInventory.SeatStatus.HELD ||
                        !orderId.equals(seat.orderId()) || !hold.id().equals(seat.holdId()))) {
            throw conflict("Trạng thái ghế và hold không khớp");
        }
        repository.updateSeats(seats.stream().map(seat -> seat.change(
                TransportInventory.SeatStatus.SOLD, orderId, hold.id(), null)).toList());
        repository.updateHold(hold.withStatus(TransportInventory.HoldStatus.SOLD));
    }

    @Transactional
    public void releaseUnpaid(UUID orderId, boolean expiredOnly) {
        repository.lockKey(orderId);
        var found = repository.findHoldForUpdate(orderId);
        if (found.isEmpty()) return;
        var hold = found.get();
        if (hold.status() == TransportInventory.HoldStatus.RELEASED ||
                hold.status() == TransportInventory.HoldStatus.EXPIRED) return;
        if (hold.status() == TransportInventory.HoldStatus.SOLD) {
            throw conflict("Không thể nhả ghế đã bán qua lệnh hủy hold");
        }
        if (expiredOnly && hold.expiresAt().isAfter(clock.instant())) return;
        var seats = repository.findSeatsForUpdate(hold.tripId(), hold.seatIds());
        if (seats.size() != hold.seatIds().size() || seats.stream().anyMatch(
                seat -> seat.status() != TransportInventory.SeatStatus.HELD ||
                        !orderId.equals(seat.orderId()) || !hold.id().equals(seat.holdId()))) {
            throw conflict("Trạng thái ghế và hold không khớp");
        }
        repository.updateSeats(seats.stream().map(seat -> seat.change(
                TransportInventory.SeatStatus.AVAILABLE, null, null, null)).toList());
        repository.updateHold(hold.withStatus(expiredOnly
                ? TransportInventory.HoldStatus.EXPIRED : TransportInventory.HoldStatus.RELEASED));
    }

    @Transactional
    public void changeSeatBlock(UUID tripId, UUID actorId, List<UUID> requestedSeats, boolean blocked, String reason) {
        if (tripId == null || actorId == null || requestedSeats == null || requestedSeats.isEmpty() ||
                requestedSeats.size() > 100 || requestedSeats.stream().anyMatch(Objects::isNull) ||
                new HashSet<>(requestedSeats).size() != requestedSeats.size() ||
                reason == null || reason.isBlank() || reason.length() > 500) throw badRequest("Lệnh chặn ghế không hợp lệ");
        var trip = repository.findTripForUpdate(tripId).orElseThrow(() -> badRequest("Không có chuyến"));
        if (!trip.departureAt().isAfter(clock.instant())) throw conflict("Chuyến đã khởi hành");
        var seats = repository.findSeatsForUpdate(tripId, requestedSeats.stream().sorted().toList());
        if (seats.size() != requestedSeats.size() || seats.stream().anyMatch(seat ->
                seat.status() != TransportInventory.SeatStatus.AVAILABLE &&
                seat.status() != TransportInventory.SeatStatus.BLOCKED)) throw conflict("Không được chặn/nhả ghế đang giữ hoặc đã bán");
        repository.updateSeats(seats.stream().map(seat -> seat.change(blocked ?
                TransportInventory.SeatStatus.BLOCKED : TransportInventory.SeatStatus.AVAILABLE,
                null, null, null)).toList());
        repository.recordSeatBlock(tripId, actorId, requestedSeats, blocked, reason.trim());
    }

    @Transactional
    public void cancelSold(UUID orderId) {
        repository.lockKey(orderId);
        var hold = repository.findHoldForUpdate(orderId)
                .orElseThrow(() -> conflict("Không tìm thấy ghế đã bán"));
        if (hold.status() == TransportInventory.HoldStatus.CANCELLED) return;
        if (hold.status() != TransportInventory.HoldStatus.SOLD) {
            throw conflict("Chỉ hủy được ghế đã bán");
        }
        var seats = repository.findSeatsForUpdate(hold.tripId(), hold.seatIds());
        if (seats.size() != hold.seatIds().size() || seats.stream().anyMatch(
                seat -> seat.status() != TransportInventory.SeatStatus.SOLD ||
                        !orderId.equals(seat.orderId()) || !hold.id().equals(seat.holdId()))) {
            throw conflict("Ghế đã bán không khớp order");
        }
        repository.updateSeats(seats.stream().map(seat -> seat.change(
                TransportInventory.SeatStatus.AVAILABLE, null, null, null)).toList());
        repository.updateHold(hold.withStatus(TransportInventory.HoldStatus.CANCELLED));
    }

    @Transactional(readOnly = true)
    public List<SeatView> availability(UUID tripId) {
        return repository.findAllSeats(tripId).stream()
                .sorted(Comparator.comparing(TransportInventory.Seat::code))
                .map(seat -> new SeatView(seat.seatId(), seat.code(), seat.status().name()))
                .toList();
    }

    @Transactional
    public HoldStatusView orderStatus(UUID orderId) {
        var hold = repository.findHoldForUpdate(orderId)
                .orElseThrow(() -> badRequest("Không có hold của order"));
        return new HoldStatusView(hold.orderId(), hold.tripId(), hold.seatIds(), hold.status().name(),
                hold.expiresAt());
    }

    public List<UUID> expiredOrderIds(int limit) {
        return repository.expiredOrderIds(clock.instant(), limit);
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    @Transactional public SeatOwnership seatOwnership(UUID orderId,UUID tripId,UUID seatId) {
        var seat=repository.findSeatsForUpdate(tripId,List.of(seatId)).stream().findFirst().orElseThrow(()->badRequest("Không có ghế"));
        if(!orderId.equals(seat.orderId())) throw conflict("Ghế không thuộc đơn");
        return new SeatOwnership(orderId,tripId,seatId,seat.status().name());
    }
    public record SeatOwnership(UUID orderId,UUID tripId,UUID seatId,String status){}
    public record SeatDefinition(UUID seatId, String code) {}
    public record SeatView(UUID seatId, String code, String status) {}
    public record HoldResult(UUID holdId, Instant expiresAt, List<UUID> seatIds) {}
    public record HoldStatusView(UUID orderId, UUID tripId, List<UUID> seatIds,
                                 String status, Instant expiresAt) {}
}
