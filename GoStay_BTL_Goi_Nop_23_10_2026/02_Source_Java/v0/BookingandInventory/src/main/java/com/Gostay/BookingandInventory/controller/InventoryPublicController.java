package com.Gostay.BookingandInventory.controller;

import com.Gostay.BookingandInventory.dto.response.ApiResponse;
import com.Gostay.BookingandInventory.dto.response.CalendarResponse;
import com.Gostay.BookingandInventory.service.InventoryPublicService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * -----------------------------------------------------------------------------
 * API CẤP PUBLIC (Dành cho Khách Hàng / End-User)
 * -----------------------------------------------------------------------------
 * Chức năng: 
 * - Cung cấp các Endpoint cho Client/Frontend truy vấn dữ liệu Tồn Kho.
 * - Ví dụ: Khi khách hàng bấm vào xem 1 Khách sạn hoặc Dịch vụ, API này sẽ 
 *   trả về chi tiết các ngày và khung giờ còn trống để khách chọn.
 *
 * Tính bảo mật:
 */
@RestController
@RequestMapping("/api/v1/public/inventory")
@RequiredArgsConstructor
public class InventoryPublicController {

    private final InventoryPublicService inventoryPublicService;

    @GetMapping("/listings/{listingId}/availability")
    public ResponseEntity<ApiResponse<List<CalendarResponse>>> getAvailability(
            @PathVariable UUID listingId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        List<CalendarResponse> data = inventoryPublicService.getAvailability(listingId, startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch trống thành công", data));
    }
}
