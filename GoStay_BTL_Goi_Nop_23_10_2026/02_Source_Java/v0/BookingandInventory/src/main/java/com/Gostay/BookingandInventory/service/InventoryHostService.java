package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.dto.request.BlockCalendarRequest;
import com.Gostay.BookingandInventory.dto.response.CalendarResponse;
import com.Gostay.BookingandInventory.dto.response.LockResponse;
import com.Gostay.BookingandInventory.dto.response.OccupancyRateResponse;
import com.Gostay.BookingandInventory.entity.InventoryCalendar;
import com.Gostay.BookingandInventory.entity.InventoryLock;
import com.Gostay.BookingandInventory.enums.InventoryCalendarStatus;
import com.Gostay.BookingandInventory.exeption.AppException;
import com.Gostay.BookingandInventory.exeption.InventoryErrorCode;
import com.Gostay.BookingandInventory.mapper.InventoryMapper;
import com.Gostay.BookingandInventory.repository.InventoryCalendarRepository;
import com.Gostay.BookingandInventory.repository.InventoryLockRepository;
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
 * LỚP NGHIỆP VỤ HOST (Partner Management Logic)
 * -----------------------------------------------------------------------------
 * Nhiệm vụ:
 * - Tổng hợp và thống kê dữ liệu cho đối tác.
 * - Ví dụ: Tính toán Tỷ lệ lấp đầy (Occupancy Rate) để Host biết doanh thu/hiệu suất.
 * - Cung cấp cái nhìn toàn diện: Số lượng trống (Available), 
 *   Số lượng đang chờ thanh toán (Locked), Số lượng đã chốt (Confirmed).
 * - Cho phép can thiệp thủ công: Cắt lịch để sửa chữa/bảo trì.
 * -----------------------------------------------------------------------------
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryHostService {

    private final InventoryCalendarRepository calendarRepository;
    private final InventoryLockRepository lockRepository;
    private final InventoryMapper inventoryMapper;

    @Transactional(readOnly = true)
    public List<CalendarResponse> getCalendars(UUID listingId, int month, int year) {
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());
        
        List<InventoryCalendar> calendars = calendarRepository.findByListingIdAndDateBetween(listingId, startDate, endDate);
        
        return calendars.stream()
                .map(inventoryMapper::toHostCalendarResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void blockCalendar(UUID listingId, BlockCalendarRequest request) {
        String timeSlot = request.getTimeSlot() == null || request.getTimeSlot().isEmpty() ? "ALL_DAY" : request.getTimeSlot();
        List<InventoryCalendar> calendars = calendarRepository.findByListingIdAndDateBetweenAndTimeSlot(listingId, request.getStartDate(), request.getEndDate(), timeSlot);
        
        for (InventoryCalendar calendar : calendars) {
            if ("UPDATE_QUANTITY".equalsIgnoreCase(request.getAction())) {
                if (request.getAvailableQuantity() != null) {
                    calendar.setAvailableQuantity(request.getAvailableQuantity());
                }
            } else {
                calendar.setStatus("BLOCK".equalsIgnoreCase(request.getAction()) ? InventoryCalendarStatus.BLOCKED : InventoryCalendarStatus.AVAILABLE);
            }
            calendarRepository.save(calendar);
        }
    }

    @Transactional(readOnly = true)
    public OccupancyRateResponse getOccupancyRate(UUID listingId, int month, int year) {
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());
        
        List<InventoryCalendar> calendars = calendarRepository.findByListingIdAndDateBetween(listingId, startDate, endDate);
        
        int totalCapacity = 0;
        int soldCapacity = 0;
        
        for (InventoryCalendar c : calendars) {
            int confirmed = 0;
            int locked = 0;
            if (c.getInventoryLocks() != null) {
                for (InventoryLock lock : c.getInventoryLocks()) {
                    if (lock.getLockStatus().name().equals("CONFIRMED")) confirmed += lock.getLockedQuantity();
                    if (lock.getLockStatus().name().equals("LOCKED")) locked += lock.getLockedQuantity();
                }
            }
            totalCapacity += (c.getAvailableQuantity() != null ? c.getAvailableQuantity() : 0) + locked + confirmed;
            soldCapacity += confirmed;
        }
        
        double rate = totalCapacity == 0 ? 0 : (double) soldCapacity / totalCapacity * 100;
        
        return OccupancyRateResponse.builder()
                .totalCapacityInMonth(totalCapacity)
                .soldCapacity(soldCapacity)
                .occupancyRate(Math.round(rate * 100.0) / 100.0)
                .build();
    }

    @Transactional(readOnly = true)
    public List<LockResponse> getLocks(UUID listingId, LocalDate date) {
        List<InventoryLock> locks = lockRepository.findByInventoryCalendarListingIdAndInventoryCalendarDate(listingId, date);
        return locks.stream()
                .map(inventoryMapper::toLockResponse)
                .collect(Collectors.toList());
    }
}
