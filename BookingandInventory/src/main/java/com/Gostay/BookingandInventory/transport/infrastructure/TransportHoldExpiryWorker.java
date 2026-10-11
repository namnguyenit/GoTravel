package com.Gostay.BookingandInventory.transport.infrastructure;

import com.Gostay.BookingandInventory.transport.application.TransportInventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class TransportHoldExpiryWorker {
    private final TransportInventoryService service;

    @Scheduled(fixedDelay = 30000)
    public void expire() {
        for (var orderId : service.expiredOrderIds(200)) {
            try {
                service.releaseUnpaid(orderId, true);
            } catch (Exception error) {
                log.error("Failed to expire transport hold for order {}", orderId, error);
            }
        }
    }
}
