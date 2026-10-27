package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.dto.request.BatchLockRequest;
import com.Gostay.BookingandInventory.dto.request.InitializeInventoryRequest;
import com.Gostay.BookingandInventory.dto.response.BatchLockResponse;
import com.Gostay.BookingandInventory.entity.InventoryCalendar;
import com.Gostay.BookingandInventory.entity.InventoryConfig;
import com.Gostay.BookingandInventory.entity.InventoryLock;
import com.Gostay.BookingandInventory.enums.InventoryCalendarStatus;
import com.Gostay.BookingandInventory.enums.InventoryLockStatus;
import com.Gostay.BookingandInventory.exeption.AppException;
import com.Gostay.BookingandInventory.exeption.InventoryErrorCode;
import com.Gostay.BookingandInventory.repository.InventoryCalendarRepository;
import com.Gostay.BookingandInventory.repository.InventoryConfigRepository;
import com.Gostay.BookingandInventory.repository.InventoryLockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * -----------------------------------------------------------------------------
 * LỚP NGHIỆP VỤ NỘI BỘ (Core Inventory Engine)
 * -----------------------------------------------------------------------------
 * Nhiệm vụ:
 * - Xử lý các nghiệp vụ CỐT LÕI nhất của kiến trúc Booking & Inventory.
 * - Đảm bảo tính Toàn vẹn Dữ liệu (Data Integrity) thông qua cơ chế khóa (Locks).
 * - Xử lý cấp phát tồn kho tự động (Sinh lịch 90 ngày) dựa trên cấu hình linh hoạt JSONB.
 * 
 * Lưu ý kỹ thuật (Enterprise Standard):
 * - Hàm batchLock() sử dụng Optimistic Locking (thông qua @Version của JPA) 
 *   để ngăn chặn tình trạng Overbooking khi có 200 khách cùng book 1 phòng.
 * -----------------------------------------------------------------------------
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryInternalService {

    private final InventoryConfigRepository configRepository;
    private final InventoryCalendarRepository calendarRepository;
    private final InventoryLockRepository lockRepository;

    @Transactional
    public void initializeInventory(InitializeInventoryRequest request) {
        validateInitializeInventoryRequest(request);
        log.info("Initializing inventory for listing {}", request.getListingId());
        
        Optional<InventoryConfig> existingConfig = configRepository.findByListingId(request.getListingId());
        if (existingConfig.isPresent()) {
            throw new AppException(InventoryErrorCode.INVALID_INVENTORY_ACTION);
        }
        
        InventoryConfig.ScheduleConfig scheduleConfig = new InventoryConfig.ScheduleConfig();
        String category = normalizeCategory(request.getCategory());
        int quantity = resolveQuantity(request);
        if ("STAY".equalsIgnoreCase(category)) {
            scheduleConfig.setDefaultQuantity(quantity);
            scheduleConfig.setTimeSlots(new ArrayList<>());
        } else {
            List<InventoryConfig.TimeSlotConfig> slots = new ArrayList<>();
            if (request.getTimeSlots() != null) {
                for (String s : request.getTimeSlots()) {
                    slots.add(new InventoryConfig.TimeSlotConfig(s, quantity));
                }
            }
            scheduleConfig.setDefaultQuantity(quantity);
            scheduleConfig.setTimeSlots(slots);
        }

        InventoryConfig config = InventoryConfig.builder()
                .listingId(request.getListingId())
                .category(category)
                .scheduleConfig(scheduleConfig)
                .isActive(true)
                .build();
        
        configRepository.save(config);
        
        // Sinh lịch 90 ngày
        generateCalendars(config, LocalDate.now(), LocalDate.now().plusDays(90));
    }

    @Transactional
    public void updateInventoryConfig(InitializeInventoryRequest request) {
        validateInitializeInventoryRequest(request);
        log.info("Updating inventory config for listing {}", request.getListingId());
        
        InventoryConfig config = configRepository.findByListingId(request.getListingId())
            .orElseThrow(() -> new AppException(InventoryErrorCode.INVALID_INVENTORY_ACTION)); // Or config not found
            
        InventoryConfig.ScheduleConfig scheduleConfig = new InventoryConfig.ScheduleConfig();
        String category = normalizeCategory(request.getCategory());
        int quantity = resolveQuantity(request);
        if ("STAY".equalsIgnoreCase(category)) {
            scheduleConfig.setDefaultQuantity(quantity);
            scheduleConfig.setTimeSlots(new ArrayList<>());
        } else {
            List<InventoryConfig.TimeSlotConfig> slots = new ArrayList<>();
            if (request.getTimeSlots() != null) {
                for (String s : request.getTimeSlots()) {
                    slots.add(new InventoryConfig.TimeSlotConfig(s, quantity));
                }
            }
            scheduleConfig.setDefaultQuantity(quantity);
            scheduleConfig.setTimeSlots(slots);
        }
        
        config.setCategory(category);
        config.setScheduleConfig(scheduleConfig);
        
        configRepository.save(config);
    }
    
    private void generateCalendars(InventoryConfig config, LocalDate startDate, LocalDate endDate) {
        List<InventoryCalendar> calendars = new ArrayList<>();
        LocalDate current = startDate;
        
        while (!current.isAfter(endDate)) {
            if ("STAY".equalsIgnoreCase(config.getCategory())) {
                calendars.add(InventoryCalendar.builder()
                        .listingId(config.getListingId())
                        .date(current)
                        .timeSlot("ALL_DAY")
                        .availableQuantity(config.getScheduleConfig().getDefaultQuantity())
                        .status(InventoryCalendarStatus.AVAILABLE)
                        .build());
            } else {
                for (InventoryConfig.TimeSlotConfig slot : config.getScheduleConfig().getTimeSlots()) {
                    calendars.add(InventoryCalendar.builder()
                            .listingId(config.getListingId())
                            .date(current)
                            .timeSlot(slot.getSlot())
                            .availableQuantity(slot.getQuantity())
                            .status(InventoryCalendarStatus.AVAILABLE)
                            .build());
                }
            }
            current = current.plusDays(1);
        }
        
        calendarRepository.saveAll(calendars);
    }

    @Transactional
    public BatchLockResponse batchLock(BatchLockRequest request) {
        validateBatchLockRequest(request);
        log.info("Batch locking inventory for order {}", request.getOrderId());
        
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(15);
        
        for (BatchLockRequest.LockItemRequest item : request.getItems()) {
            validateLockItem(item);
            String timeSlot = item.getTimeSlot() == null || item.getTimeSlot().isEmpty() ? "ALL_DAY" : item.getTimeSlot();
            
            // Xử lý list ngày
            LocalDate current = item.getStartDate();
            while (!current.isAfter(item.getEndDate())) {
                InventoryCalendar calendar = calendarRepository.findByListingIdAndDateAndTimeSlot(
                        item.getListingId(), current, timeSlot)
                        .orElseThrow(() -> new AppException(InventoryErrorCode.INVENTORY_CALENDAR_NOT_FOUND));
                
                if (calendar.getStatus() == InventoryCalendarStatus.BLOCKED) {
                    throw new AppException(InventoryErrorCode.INVENTORY_BLOCKED);
                }
                
                if (calendar.getAvailableQuantity() < item.getQuantity()) {
                    throw new AppException(InventoryErrorCode.OVERBOOKING_DETECTED);
                }

                int remainingQuantity = calendar.getAvailableQuantity() - item.getQuantity();
                if (remainingQuantity < 0) {
                    throw new AppException(InventoryErrorCode.OVERBOOKING_DETECTED);
                }
                
                calendar.setAvailableQuantity(remainingQuantity);
                calendarRepository.save(calendar); // Optimistic Locking sẽ bắt lỗi nếu 2 luồng tranh nhau lưu
                
                InventoryLock lock = InventoryLock.builder()
                        .inventoryCalendar(calendar)
                        .orderId(request.getOrderId())
                        .lockedQuantity(item.getQuantity())
                        .lockStatus(InventoryLockStatus.LOCKED)
                        .expiresAt(expiresAt)
                        .build();
                lockRepository.save(lock);
                
                current = current.plusDays(1);
            }
        }
        
        return BatchLockResponse.builder().expiresAt(expiresAt).build();
    }

    @Transactional
    public void confirmLock(UUID orderId) {
        log.info("Confirming lock for order {}", orderId);
        List<InventoryLock> locks = lockRepository.findByOrderId(orderId);
        if (locks.isEmpty()) {
            throw new AppException(InventoryErrorCode.INVENTORY_LOCK_NOT_FOUND);
        }
        
        for (InventoryLock lock : locks) {
            lock.setLockStatus(InventoryLockStatus.CONFIRMED);
            lockRepository.save(lock);
        }
    }

    @Transactional
    public void cancelLock(UUID orderId) {
        log.info("Canceling lock for order {}", orderId);
        List<InventoryLock> locks = lockRepository.findByOrderId(orderId);
        if (locks.isEmpty()) {
            return;
        }
        
        for (InventoryLock lock : locks) {
            if (lock.getLockedQuantity() == null || lock.getLockedQuantity() <= 0) {
                log.error("Invalid inventory lock quantity {} for lock {}", lock.getLockedQuantity(), lock.getId());
                throw new AppException(InventoryErrorCode.INVALID_INVENTORY_ACTION);
            }

            if (lock.getLockStatus() != InventoryLockStatus.RELEASED) {
                lock.setLockStatus(InventoryLockStatus.RELEASED);
                lockRepository.save(lock);
                
                InventoryCalendar calendar = lock.getInventoryCalendar();
                calendar.setAvailableQuantity(calendar.getAvailableQuantity() + lock.getLockedQuantity());
                calendarRepository.save(calendar);
            }
        }
    }

    private void validateInitializeInventoryRequest(InitializeInventoryRequest request) {
        if (request == null || request.getListingId() == null || resolveQuantity(request) <= 0) {
            throw new AppException(InventoryErrorCode.INVALID_INVENTORY_ACTION);
        }
    }

    private void validateBatchLockRequest(BatchLockRequest request) {
        if (request == null || request.getOrderId() == null || request.getItems() == null || request.getItems().isEmpty()) {
            throw new AppException(InventoryErrorCode.INVALID_INVENTORY_ACTION);
        }
    }

    private void validateLockItem(BatchLockRequest.LockItemRequest item) {
        if (item == null
                || item.getListingId() == null
                || item.getStartDate() == null
                || item.getEndDate() == null
                || item.getQuantity() <= 0
                || item.getStartDate().isBefore(LocalDate.now())
                || item.getEndDate().isBefore(LocalDate.now())
                || item.getEndDate().isBefore(item.getStartDate())) {
            throw new AppException(InventoryErrorCode.INVALID_INVENTORY_ACTION);
        }
    }

    private int resolveQuantity(InitializeInventoryRequest request) {
        if (request == null) {
            return 0;
        }

        Integer quantity = request.getQuantity() != null ? request.getQuantity() : request.getTotalQuantity();
        return quantity == null ? 0 : quantity;
    }

    private String normalizeCategory(String category) {
        if (category == null || category.isBlank()) {
            return "STAY";
        }

        return category.trim();
    }

    @Transactional(readOnly = true)
    public com.Gostay.BookingandInventory.dto.response.BatchCheckAvailabilityResponse batchCheckAvailability(com.Gostay.BookingandInventory.dto.request.BatchCheckAvailabilityRequest request) {
        if (request.getListingIds() == null || request.getListingIds().isEmpty() || request.getStartDate() == null || request.getEndDate() == null) {
            return new com.Gostay.BookingandInventory.dto.response.BatchCheckAvailabilityResponse(new ArrayList<>());
        }

        if (request.getStartDate().isEqual(request.getEndDate())) {
            List<UUID> availableIds = calendarRepository.findAvailableListingIdsOnDate(
                    request.getListingIds(),
                    request.getStartDate(),
                    InventoryCalendarStatus.BLOCKED,
                    request.getRequiredQuantity());
            return new com.Gostay.BookingandInventory.dto.response.BatchCheckAvailabilityResponse(availableIds);
        }

        List<UUID> availableIds = new ArrayList<>();
        for (UUID listingId : request.getListingIds()) {
            boolean isAvailable = true;
            LocalDate current = request.getStartDate();
            while (!current.isAfter(request.getEndDate())) {
                List<InventoryCalendar> calendars = calendarRepository.findByListingIdAndDate(listingId, current);
                boolean hasAvailableSlot = calendars.stream()
                        .anyMatch(calendar -> calendar.getStatus() != InventoryCalendarStatus.BLOCKED
                                && calendar.getAvailableQuantity() != null
                                && calendar.getAvailableQuantity() >= request.getRequiredQuantity());

                if (!hasAvailableSlot) {
                    isAvailable = false;
                    break;
                }
                current = current.plusDays(1);
            }
            if (isAvailable) {
                availableIds.add(listingId);
            }
        }

        return new com.Gostay.BookingandInventory.dto.response.BatchCheckAvailabilityResponse(availableIds);
    }
}
