package com.Gostay.BookingandInventory.controller;

import com.Gostay.BookingandInventory.dto.request.ForceBlockRequest;
import com.Gostay.BookingandInventory.dto.response.ApiResponse;
import com.Gostay.BookingandInventory.dto.response.CalendarResponse;
import com.Gostay.BookingandInventory.dto.response.SyncResponse;
import com.Gostay.BookingandInventory.service.InventoryAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * -----------------------------------------------------------------------------
 * API CẤP ADMIN (Dành cho Quản Trị Viên Hệ Thống)
 * -----------------------------------------------------------------------------
 * Chức năng: 
 * - Quyền lực tối cao, dùng để can thiệp trực tiếp vào hệ thống khi có sự cố.
 * - Phong tỏa dịch vụ, cưỡng chế đóng kho đối với các Host vi phạm chính sách.
 * - Kích hoạt các Job đồng bộ lại dữ liệu Tồn Kho.
 *
 * Tính bảo mật:
 * - Bảo mật mức độ CAO NHẤT. Chỉ có Role ADMIN mới được phép truy cập.
 * -----------------------------------------------------------------------------
 */
@RestController
@RequestMapping("/api/v1/admin/inventory")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class InventoryAdminController {

    private final InventoryAdminService inventoryAdminService;

    @GetMapping("/listings/{listingId}/availability")
    public ResponseEntity<ApiResponse<List<CalendarResponse>>> getAdminAvailability(
            @PathVariable UUID listingId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        List<CalendarResponse> data = inventoryAdminService.getAdminAvailability(listingId, startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch tồn kho admin thành công", data));
    }

    @PutMapping("/listings/{listingId}/force-update")
    public ResponseEntity<ApiResponse<Void>> forceBlock(
            @PathVariable UUID listingId,
            @RequestBody ForceBlockRequest request) {
        inventoryAdminService.forceBlock(listingId, request);
        return ResponseEntity.ok(ApiResponse.success("Đã phong tỏa dịch vụ thành công"));
    }

    @PostMapping("/listings/{listingId}/sync")
    public ResponseEntity<ApiResponse<SyncResponse>> syncInventory(@PathVariable UUID listingId) {
        SyncResponse response = inventoryAdminService.syncInventory(listingId);
        return ResponseEntity.ok(ApiResponse.success("Đã đồng bộ lại tồn kho chuẩn xác", response));
    }
}
