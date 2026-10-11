package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.enums.InventoryLockStatus;
import com.Gostay.BookingandInventory.repository.InventoryLockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class LegacyInventoryExpiryWorker {
    private final InventoryLockRepository repository;
    private final InventoryInternalService service;

    @Scheduled(fixedDelay = 30000)
    public void expire() {
        var locks = repository.findTop200ByLockStatusAndExpiresAtBeforeOrderByExpiresAtAsc(
                InventoryLockStatus.LOCKED, LocalDateTime.now());
        for (var lock : locks) {
            try {
                service.expireLock(lock.getId());
            } catch (Exception error) {
                log.error("Failed to expire GoTravel inventory lock {}", lock.getId(), error);
            }
        }
    }
}
