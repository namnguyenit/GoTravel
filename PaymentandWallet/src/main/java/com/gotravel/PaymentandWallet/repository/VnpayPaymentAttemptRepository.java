package com.gotravel.PaymentandWallet.repository;

import com.gotravel.PaymentandWallet.entity.VnpayPaymentAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface VnpayPaymentAttemptRepository extends JpaRepository<VnpayPaymentAttempt, UUID> {
    Optional<VnpayPaymentAttempt> findByTxnRef(String txnRef);
    Optional<VnpayPaymentAttempt> findFirstByPaymentRequestIdOrderByCreatedAtDesc(UUID paymentId);
    boolean existsByTransactionNo(String transactionNo);
}
