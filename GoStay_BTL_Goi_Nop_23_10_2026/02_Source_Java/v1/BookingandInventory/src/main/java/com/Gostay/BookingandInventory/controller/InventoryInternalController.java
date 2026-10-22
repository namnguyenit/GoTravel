package com.Gostay.BookingandInventory.controller;

import com.Gostay.BookingandInventory.dto.request.BatchLockRequest;
import com.Gostay.BookingandInventory.dto.request.InitializeInventoryRequest;
import com.Gostay.BookingandInventory.dto.response.ApiResponse;
import com.Gostay.BookingandInventory.dto.response.BatchLockResponse;
import com.Gostay.BookingandInventory.dto.response.BatchCheckAvailabilityResponse;
import com.Gostay.BookingandInventory.service.InventoryInternalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * -----------------------------------------------------------------------------
 * API CẤP INTERNAL (Giao tiếp Nội bộ giữa các Microservices)
 * -----------------------------------------------------------------------------
 * Chức năng: 
 * - Đóng vai trò là "Cửa hậu" để các Service khác (như Catalog, Order, Payment) 
 *   ra lệnh thay đổi trực tiếp vào kho dữ liệu.
 * - Chứa các luồng nghiệp vụ quan trọng nhất: Khởi tạo kho, Tạm giữ chỗ (Lock), 
 *   Chốt đơn (Confirm), và Hủy/Hoàn kho (Cancel).
 *
 * Tính bảo mật:
 * - BẮT BUỘC có xác thực. Trong môi trường thực tế, các API này không mở ra Internet
 *   mà chỉ gọi ngầm qua mạng LAN (hoặc xác thực bằng API Key/Internal Token).
 * -----------------------------------------------------------------------------
 */
@RestController
@RequestMapping("/api/v1/internal/inventory")
@RequiredArgsConstructor
public class InventoryInternalController {

    private final InventoryInternalService inventoryInternalService;

    @PostMapping("/initialize")
    public ResponseEntity<ApiResponse<Void>> initializeInventory(@RequestBody @Valid InitializeInventoryRequest request) {
        inventoryInternalService.initializeInventory(request);
        return ResponseEntity.ok(ApiResponse.created("Khởi tạo kho thành công"));
    }

    @PostMapping("/locks")
    public ResponseEntity<ApiResponse<BatchLockResponse>> batchLock(@RequestBody @Valid BatchLockRequest request) {
        BatchLockResponse response = inventoryInternalService.batchLock(request);
        return ResponseEntity.ok(ApiResponse.success("Khóa giữ chỗ thành công", response));
    }


    @PutMapping("/locks/{orderId}/confirm")
    public ResponseEntity<ApiResponse<Void>> confirmLock(@PathVariable UUID orderId) {
        inventoryInternalService.confirmLock(orderId);
        return ResponseEntity.ok(ApiResponse.success("Chốt phòng thành công"));
    }

    @PutMapping("/locks/{orderId}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelLock(@PathVariable UUID orderId) {
        inventoryInternalService.cancelLock(orderId);
        return ResponseEntity.ok(ApiResponse.success("Đã hủy đơn và hoàn kho thành công"));
    }

    @PostMapping("/batch-check-availability")
    public ResponseEntity<BatchCheckAvailabilityResponse> batchCheckAvailability(@RequestBody @Valid com.Gostay.BookingandInventory.dto.request.BatchCheckAvailabilityRequest request) {
        return ResponseEntity.ok(inventoryInternalService.batchCheckAvailability(request));
    }
}
