package com.gotravel.PaymentandWallet.repository;

import com.gotravel.PaymentandWallet.entity.PaymentRequest;
import com.gotravel.PaymentandWallet.enums.PaymentStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.math.BigDecimal;

@Repository
public interface PaymentRequestRepository extends JpaRepository<PaymentRequest, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PaymentRequest p where p.id = :id")
    Optional<PaymentRequest> findByIdForUpdate(@Param("id") UUID id);

    Optional<PaymentRequest> findByOrderId(UUID orderId);
    Optional<PaymentRequest> findByOrderIdAndUserId(UUID orderId, UUID userId);
    Optional<PaymentRequest> findByIdAndUserId(UUID id, UUID userId);
    Optional<PaymentRequest> findByPaymentCode(String paymentCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select paymentRequest from PaymentRequest paymentRequest where paymentRequest.paymentCode = :paymentCode")
    Optional<PaymentRequest> findByPaymentCodeForUpdate(@Param("paymentCode") String paymentCode);

    Page<PaymentRequest> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    List<PaymentRequest> findByStatusAndExpiresAtBefore(PaymentStatus status, LocalDateTime dateTime);
    long countByStatus(PaymentStatus status);

    @Query("select coalesce(sum(paymentRequest.amount), 0) from PaymentRequest paymentRequest")
    BigDecimal sumAmount();

    @Query("select coalesce(sum(paymentRequest.amount), 0) from PaymentRequest paymentRequest where paymentRequest.status = :status")
    BigDecimal sumAmountByStatus(@Param("status") PaymentStatus status);
}
