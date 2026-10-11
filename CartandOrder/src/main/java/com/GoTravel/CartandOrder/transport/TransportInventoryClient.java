package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.configuration.InternalFeignConfig;
import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@FeignClient(name = "transport-inventory", url = "${services.inventory.url:http://127.0.0.1:8083}", configuration = InternalFeignConfig.class)
public interface TransportInventoryClient {
    record ReserveRequest(UUID orderId, List<UUID> seatIds) {}
    record HoldResult(UUID holdId, Instant expiresAt, List<UUID> seatIds) {}
    record HoldStatus(UUID orderId, UUID tripId, List<UUID> seatIds,
                      String status, Instant expiresAt) {}
    record SeatView(UUID seatId, String code, String status) {}

    @GetMapping("/api/v1/internal/inventory/transport/trips/{tripId}/seats")
    ApiResponse<List<SeatView>> seats(@PathVariable("tripId") UUID tripId);

    @GetMapping("/api/v1/internal/inventory/transport/orders/{orderId}/status")
    ApiResponse<HoldStatus> orderStatus(@PathVariable("orderId") UUID orderId);

    @PostMapping("/api/v1/internal/inventory/transport/trips/{tripId}/holds")
    ApiResponse<HoldResult> reserve(@PathVariable("tripId") UUID tripId, @RequestBody ReserveRequest request);

    @PutMapping("/api/v1/internal/inventory/transport/orders/{orderId}/confirm")
    ApiResponse<Void> confirm(@PathVariable("orderId") UUID orderId);

    @PutMapping("/api/v1/internal/inventory/transport/orders/{orderId}/release-unpaid")
    ApiResponse<Void> releaseUnpaid(@PathVariable("orderId") UUID orderId);

    @PutMapping("/api/v1/internal/inventory/transport/orders/{orderId}/cancel-sold")
    ApiResponse<Void> cancelSold(@PathVariable("orderId") UUID orderId);
}
