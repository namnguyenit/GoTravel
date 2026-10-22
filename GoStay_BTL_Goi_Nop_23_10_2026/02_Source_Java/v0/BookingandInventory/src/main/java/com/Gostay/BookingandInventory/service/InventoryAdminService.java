package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.dto.request.ForceBlockRequest;
import com.Gostay.BookingandInventory.dto.response.CalendarResponse;
import com.Gostay.BookingandInventory.dto.response.SyncResponse;
import com.Gostay.BookingandInventory.entity.InventoryCalendar;
import com.Gostay.BookingandInventory.entity.InventoryConfig;
import com.Gostay.BookingandInventory.entity.InventoryLock;
import com.Gostay.BookingandInventory.enums.InventoryCalendarStatus;
import com.Gostay.BookingandInventory.repository.InventoryCalendarRepository;
import com.Gostay.BookingandInventory.repository.InventoryConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * -----------------------------------------------------------------------------
 * LỚP NGHIỆP VỤ ADMIN (System Operation & Maintenance)
 * -----------------------------------------------------------------------------
 * Nhiệm vụ:
 * - Thực thi các lệnh Cưỡng chế và Đồng bộ hệ thống cấp bách.
 * - Logic Sync (Đồng bộ) sau này có thể mở rộng để quét toàn bộ Database,
 *   đếm lại các Lock đã hết hạn, đối soát giữa availableQuantity và Lock,
 *   từ đó tự động khắc phục các lỗi sai sót kho (nếu có).
 * -----------------------------------------------------------------------------
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryAdminService {

    private final InventoryCalendarRepository calendarRepository;
    private final InventoryConfigRepository configRepository;

    @Transactional
    public void forceBlock(UUID listingId, ForceBlockRequest request) {
        log.info("Admin force blocking listing {}", listingId);
        
        // Truy vấn Cấu hình tồn kho để lấy sức chứa mặc định và khung giờ
        InventoryConfig config = configRepository.findByListingId(listingId).orElse(null);
        
        LocalDate current = request.getStartDate();
        while (!current.isAfter(request.getEndDate())) {
            if (config != null) {
                if ("STAY".equalsIgnoreCase(config.getCategory())) {
                    upsertCalendar(listingId, current, "ALL_DAY", config.getScheduleConfig().getDefaultQuantity(), request.getStatus());
                } else {
                    if (config.getScheduleConfig().getTimeSlots() != null && !config.getScheduleConfig().getTimeSlots().isEmpty()) {
                        for (InventoryConfig.TimeSlotConfig slot : config.getScheduleConfig().getTimeSlots()) {
                            upsertCalendar(listingId, current, slot.getSlot(), slot.getQuantity(), request.getStatus());
                        }
                    } else {
                        upsertCalendar(listingId, current, "ALL_DAY", config.getScheduleConfig().getDefaultQuantity(), request.getStatus());
                    }
                }
            } else {
                // Fallback nếu Listing chưa được cấu hình tồn kho
                upsertCalendar(listingId, current, "ALL_DAY", 5, request.getStatus());
            }
            current = current.plusDays(1);
        }
    }

    private void upsertCalendar(UUID listingId, LocalDate date, String timeSlot, int defaultQty, String status) {
        Optional<InventoryCalendar> existing = calendarRepository.findByListingIdAndDateAndTimeSlot(listingId, date, timeSlot);
        InventoryCalendarStatus newStatus = "BLOCKED".equalsIgnoreCase(status) ? InventoryCalendarStatus.BLOCKED : InventoryCalendarStatus.AVAILABLE;
        
        if (existing.isPresent()) {
            InventoryCalendar calendar = existing.get();
            calendar.setStatus(newStatus);
            calendarRepository.save(calendar);
        } else {
            InventoryCalendar calendar = InventoryCalendar.builder()
                    .listingId(listingId)
                    .date(date)
                    .timeSlot(timeSlot)
                    .availableQuantity(defaultQty)
                    .status(newStatus)
                    .build();
            calendarRepository.save(calendar);
        }
    }

    @Transactional(readOnly = true)
    public List<CalendarResponse> getAdminAvailability(UUID listingId, LocalDate startDate, LocalDate endDate) {
        log.info("Fetching admin availability for listing {} from {} to {}", listingId, startDate, endDate);
        List<InventoryCalendar> calendars = calendarRepository.findByListingIdAndDateBetween(listingId, startDate, endDate);
        
        return calendars.stream()
                .map(c -> {
                    int locked = 0;
                    int confirmed = 0;
                    if (c.getInventoryLocks() != null) {
                        for (InventoryLock lock : c.getInventoryLocks()) {
                            if (lock.getLockStatus().name().equals("LOCKED")) {
                                locked += lock.getLockedQuantity();
                            } else if (lock.getLockStatus().name().equals("CONFIRMED")) {
                                confirmed += lock.getLockedQuantity();
                            }
                        }
                    }
                    int total = (c.getAvailableQuantity() != null ? c.getAvailableQuantity() : 0) + locked + confirmed;
                    return CalendarResponse.builder()
                            .date(c.getDate())
                            .timeSlot(c.getTimeSlot())
                            .totalQuantity(total)
                            .availableQuantity(c.getAvailableQuantity() != null ? c.getAvailableQuantity() : 0)
                            .lockedQuantity(locked)
                            .confirmedQuantity(confirmed)
                            .status(c.getStatus() != null ? c.getStatus().name() : null)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public SyncResponse syncInventory(UUID listingId) {
        log.info("Admin syncing inventory for listing {}", listingId);
        // Basic sync logic placeholder (In real world, you'd recalculate based on config and active locks)
        return SyncResponse.builder().recordsFixed(0).build();
    }
}
