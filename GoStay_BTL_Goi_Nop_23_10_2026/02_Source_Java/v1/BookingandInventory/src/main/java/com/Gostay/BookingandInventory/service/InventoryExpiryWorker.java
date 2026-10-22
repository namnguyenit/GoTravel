package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.enums.InventoryLockStatus;
import com.Gostay.BookingandInventory.repository.InventoryLockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;

@Component
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "inventory.expiry.enabled", havingValue = "true", matchIfMissing = true)
public class InventoryExpiryWorker {
    private final InventoryLockRepository locks;
    private final InventoryInternalService inventory;

    @Scheduled(fixedDelayString = "${inventory.expiry.delay-ms:60000}")
    public void releaseExpiredLocks() {
        for (var candidate : locks.findTop100ByLockStatusAndExpiresAtBeforeOrderByExpiresAtAsc(
                InventoryLockStatus.LOCKED, LocalDateTime.now())) {
            try {
                inventory.expireLock(candidate.getId());
            } catch (OptimisticLockingFailureException conflict) {
                log.info("Expiry conflicted for {}; retry on a later scan", candidate.getId());
            } catch (RuntimeException failure) {
                log.error("Expiry failed for {}; lock was not silently discarded", candidate.getId(), failure);
            }
        }
    }
}
