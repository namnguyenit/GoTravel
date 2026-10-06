package com.gotravel.PaymentandWallet.repository;

import com.gotravel.PaymentandWallet.entity.PaymentOrderNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PaymentOrderNotificationRepository extends JpaRepository<PaymentOrderNotification, UUID> {
    List<PaymentOrderNotification> findTop50ByDeliveredAtIsNullOrderByCreatedAtAsc();
}
