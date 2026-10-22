package com.Gostay.BookingandInventory.controller;

import com.Gostay.BookingandInventory.dto.request.BlockCalendarRequest;
import com.Gostay.BookingandInventory.dto.request.InitializeInventoryRequest;
import com.Gostay.BookingandInventory.dto.response.ApiResponse;
import com.Gostay.BookingandInventory.dto.response.CalendarResponse;
import com.Gostay.BookingandInventory.dto.response.LockResponse;
import com.Gostay.BookingandInventory.dto.response.OccupancyRateResponse;
import com.Gostay.BookingandInventory.service.InventoryHostService;
import com.Gostay.BookingandInventory.service.InventoryInternalService;
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
 * API CẤP HOST (Dành cho Chủ Nhà / Đối Tác)
 * -----------------------------------------------------------------------------
 * Chức năng: 
 * - Cung cấp công cụ quản lý Tồn kho và Lịch cho Host (Chủ Khách sạn, Thợ Spa...).
 * - Cho phép Host xem trạng thái kho, đóng/mở phòng bảo trì, xem thống kê.
 *
 * Tính bảo mật:
 * - Yêu cầu xác thực Token.
 * - Chỉ những User có Role HOST (hoặc ADMIN) mới được phép gọi API.
 * - (Tương lai): Cần kiểm tra thêm Host này có đúng là chủ của ListingId đó hay không.
 * -----------------------------------------------------------------------------
 */
@RestController
@RequestMapping("/api/v1/host/inventory")
@RequiredArgsConstructor
@PreAuthorize("hasRole('HOST') or hasRole('ENTERPRISE') or hasRole('ADMIN')")
public class InventoryHostController {

    private final InventoryHostService inventoryHostService;
    private final InventoryInternalService inventoryInternalService;

    @GetMapping("/listings/{listingId}/calendars")
    public ResponseEntity<ApiResponse<List<CalendarResponse>>> getCalendars(
            @PathVariable UUID listingId,
            @RequestParam int month,
            @RequestParam int year) {
        return ResponseEntity.ok(ApiResponse.success(inventoryHostService.getCalendars(listingId, month, year)));
    }

    @PutMapping("/listings/{listingId}/calendars/block")
    public ResponseEntity<ApiResponse<Void>> blockCalendar(
            @PathVariable UUID listingId,
            @RequestBody BlockCalendarRequest request) {
        inventoryHostService.blockCalendar(listingId, request);
        return ResponseEntity.ok(ApiResponse.success("Đã thay đổi trạng thái lịch thành công"));
    }

    @GetMapping("/listings/{listingId}/occupancy-rate")
    public ResponseEntity<ApiResponse<OccupancyRateResponse>> getOccupancyRate(
            @PathVariable UUID listingId,
            @RequestParam int month,
            @RequestParam int year) {
        return ResponseEntity.ok(ApiResponse.success("Thống kê thành công", inventoryHostService.getOccupancyRate(listingId, month, year)));
    }

    @GetMapping("/listings/{listingId}/locks")
    public ResponseEntity<ApiResponse<List<LockResponse>>> getLocks(
            @PathVariable UUID listingId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(inventoryHostService.getLocks(listingId, date)));
    }

    @PostMapping("/listings/{listingId}/initialize")
    public ResponseEntity<ApiResponse<Void>> initializeInventory(
            @PathVariable UUID listingId,
            @RequestBody InitializeInventoryRequest request) {
        request.setListingId(listingId);
        inventoryInternalService.initializeInventory(request);
        return ResponseEntity.ok(ApiResponse.success("Khởi tạo cấu hình tồn kho thành công"));
    }

    @PutMapping("/listings/{listingId}/inventory-config")
    public ResponseEntity<ApiResponse<Void>> updateInventoryConfig(
            @PathVariable UUID listingId,
            @RequestBody InitializeInventoryRequest request) {
        request.setListingId(listingId);
        inventoryInternalService.updateInventoryConfig(request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật cấu hình tồn kho thành công"));
    }
}
