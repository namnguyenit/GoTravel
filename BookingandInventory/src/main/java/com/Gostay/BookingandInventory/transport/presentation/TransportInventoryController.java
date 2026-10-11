package com.Gostay.BookingandInventory.transport.presentation;

import com.Gostay.BookingandInventory.dto.response.ApiResponse;
import com.Gostay.BookingandInventory.transport.application.TransportInventoryService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/internal/inventory/transport")
@RequiredArgsConstructor
public class TransportInventoryController {
    private final TransportInventoryService service;

    public record InitializeRequest(@NotNull UUID operatorId, @NotNull Instant departureAt,
                                    @NotEmpty List<@Valid SeatDefinition> seats) {}
    public record SeatDefinition(@NotNull UUID seatId, @NotNull String code) {}
    public record ReserveRequest(@NotNull UUID orderId, @NotEmpty List<@NotNull UUID> seatIds) {}

    @PutMapping("/trips/{tripId}")
    public ResponseEntity<ApiResponse<Void>> initialize(@PathVariable UUID tripId,
                                                         @RequestBody @Valid InitializeRequest request) {
        service.initialize(tripId, request.operatorId(), request.departureAt(), request.seats().stream()
                .map(seat -> new TransportInventoryService.SeatDefinition(seat.seatId(), seat.code())).toList());
        return ResponseEntity.ok(ApiResponse.success("Đã khởi tạo tồn ghế"));
    }

    @PutMapping("/trips/{tripId}/sale-enabled")
    public ResponseEntity<ApiResponse<Void>> setSaleEnabled(@PathVariable UUID tripId,
                                                              @RequestParam boolean enabled) {
        service.setSaleEnabled(tripId, enabled);
        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật trạng thái mở bán"));
    }

    @GetMapping("/trips/{tripId}/seats")
    public ResponseEntity<ApiResponse<List<TransportInventoryService.SeatView>>> seats(@PathVariable UUID tripId) {
        return ResponseEntity.ok(ApiResponse.success(service.availability(tripId)));
    }

    @PostMapping("/trips/{tripId}/holds")
    public ResponseEntity<ApiResponse<TransportInventoryService.HoldResult>> reserve(
            @PathVariable UUID tripId, @RequestBody @Valid ReserveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(service.reserve(request.orderId(), tripId, request.seatIds())));
    }

    @PutMapping("/orders/{orderId}/confirm")
    public ResponseEntity<ApiResponse<Void>> confirm(@PathVariable UUID orderId) {
        service.confirmSale(orderId);
        return ResponseEntity.ok(ApiResponse.success("Đã bán ghế"));
    }

    @GetMapping("/orders/{orderId}/status")
    public ResponseEntity<ApiResponse<TransportInventoryService.HoldStatusView>> orderStatus(
            @PathVariable UUID orderId) {
        return ResponseEntity.ok(ApiResponse.success(service.orderStatus(orderId)));
    }

    @PutMapping("/orders/{orderId}/release-unpaid")
    public ResponseEntity<ApiResponse<Void>> releaseUnpaid(@PathVariable UUID orderId) {
        service.releaseUnpaid(orderId, false);
        return ResponseEntity.ok(ApiResponse.success("Đã nhả ghế chưa thanh toán"));
    }

    @PutMapping("/orders/{orderId}/cancel-sold")
    public ResponseEntity<ApiResponse<Void>> cancelSold(@PathVariable UUID orderId) {
        service.cancelSold(orderId);
        return ResponseEntity.ok(ApiResponse.success("Đã hủy ghế đã bán"));
    }
}
