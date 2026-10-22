package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.dto.response.CalendarResponse;
import com.Gostay.BookingandInventory.entity.InventoryCalendar;
import com.Gostay.BookingandInventory.enums.InventoryCalendarStatus;
import com.Gostay.BookingandInventory.mapper.InventoryMapper;
import com.Gostay.BookingandInventory.repository.InventoryCalendarRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * -----------------------------------------------------------------------------
 * LỚP NGHIỆP VỤ PUBLIC (Public Business Logic)
 * -----------------------------------------------------------------------------
 * Nhiệm vụ:
 * - Xử lý logic truy vấn số lượng tồn kho khả dụng (Available Quantity).
 * - Có khả năng tối ưu hóa truy xuất dữ liệu vì đây là API có Traffic cao nhất 
 *   (Read-Heavy) trong hệ thống Booking.
 * - Lọc bỏ các khung giờ/ngày đã hết chỗ hoặc đang bảo trì trước khi trả về.
 * -----------------------------------------------------------------------------
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryPublicService {

    private final InventoryCalendarRepository inventoryCalendarRepository;
    private final InventoryMapper inventoryMapper;

    @Transactional(readOnly = true)
    public List<CalendarResponse> getAvailability(UUID listingId, LocalDate startDate, LocalDate endDate) {
        log.info("Fetching availability for listing {} from {} to {}", listingId, startDate, endDate);
        
        List<InventoryCalendar> calendars = inventoryCalendarRepository.findByListingIdAndDateBetween(listingId, startDate, endDate);
        
        return calendars.stream()
                .filter(c -> c.getAvailableQuantity() != null && c.getAvailableQuantity() > 0 && c.getStatus() != InventoryCalendarStatus.BLOCKED)
                .map(inventoryMapper::toCalendarResponse)
                .collect(Collectors.toList());
    }
}
