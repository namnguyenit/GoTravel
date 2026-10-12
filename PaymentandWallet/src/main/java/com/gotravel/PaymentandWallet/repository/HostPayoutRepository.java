package com.gotravel.PaymentandWallet.repository;

import com.gotravel.PaymentandWallet.entity.HostPayout;
import com.gotravel.PaymentandWallet.enums.PayoutStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface HostPayoutRepository extends JpaRepository<HostPayout, UUID> {
    Page<HostPayout> findByHostIdOrderByCreatedAtDesc(UUID hostId, Pageable pageable);
    Page<HostPayout> findAllByOrderByCreatedAtDesc(Pageable pageable);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from HostPayout p where p.id=:id")
    java.util.Optional<HostPayout> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") UUID id);

    List<HostPayout> findByStatus(PayoutStatus status);
    List<HostPayout> findByOrderId(UUID orderId);
    boolean existsByOrderIdAndHostId(UUID orderId, UUID hostId);
    long countByStatus(PayoutStatus status);

    @Query("select coalesce(sum(payout.totalAmount), 0) from HostPayout payout")
    BigDecimal sumTotalAmount();

    @Query("select coalesce(sum(payout.hostAmount), 0) from HostPayout payout")
    BigDecimal sumHostAmount();

    @Query("select coalesce(sum(payout.commissionAmount), 0) from HostPayout payout")
    BigDecimal sumCommissionAmount();

    @Query("select coalesce(sum(payout.hostAmount), 0) from HostPayout payout where payout.status = :status")
    BigDecimal sumHostAmountByStatus(@Param("status") PayoutStatus status);

    @Query("select coalesce(sum(payout.commissionAmount), 0) from HostPayout payout where payout.status = :status")
    BigDecimal sumCommissionAmountByStatus(@Param("status") PayoutStatus status);

    @Query(value = """
            select cast(created_at as date) as report_date,
                   coalesce(sum(total_amount), 0) as total_amount,
                   coalesce(sum(host_amount), 0) as host_amount,
                   coalesce(sum(commission_amount), 0) as commission_amount,
                   count(*) as payout_count
            from host_payouts
            where created_at >= :startDate and created_at < :endDate
            group by cast(created_at as date)
            order by report_date
            """, nativeQuery = true)
    List<Object[]> getDailyRevenueReport(@Param("startDate") LocalDateTime startDate,
                                         @Param("endDate") LocalDateTime endDate);
}
