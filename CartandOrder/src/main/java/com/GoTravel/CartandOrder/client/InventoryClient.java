package com.GoTravel.CartandOrder.client;

import com.GoTravel.CartandOrder.dto.request.BatchLockRequest;
import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import com.GoTravel.CartandOrder.dto.response.BatchLockResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.UUID;

@FeignClient(name = "booking-inventory", url = "${services.inventory.url:http://localhost:8083}")
public interface InventoryClient {

    @PostMapping("/api/v1/internal/inventory/locks")
    ApiResponse<BatchLockResponse> batchLock(@RequestBody BatchLockRequest request);

    @PutMapping("/api/v1/internal/inventory/locks/{orderId}/confirm")
    ApiResponse<Void> confirmLock(@PathVariable("orderId") UUID orderId);

    @PutMapping("/api/v1/internal/inventory/locks/{orderId}/cancel")
    ApiResponse<Void> cancelLock(@PathVariable("orderId") UUID orderId);
}
