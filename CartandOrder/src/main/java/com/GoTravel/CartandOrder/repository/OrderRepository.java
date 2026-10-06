package com.GoTravel.CartandOrder.repository;

import com.GoTravel.CartandOrder.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.GoTravel.CartandOrder.enums.OrderStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") UUID id);

    Optional<Order> findByOrderNumber(String orderNumber);
    Optional<Order> findByIdAndUserId(UUID id, UUID userId);
    Page<Order> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    @Query(value = """
            select o from Order o
            where o.userId = :userId and o.status in :statuses
              and (lower(coalesce(o.orderNumber, '')) like :search escape '!'
                or lower(cast(o.id as string)) like :search escape '!'
                or exists (select item.id from OrderItem item where item.order = o
                    and lower(item.listingTitle) like :search escape '!'))
            order by o.createdAt desc, o.id desc
            """, countQuery = """
            select count(o) from Order o
            where o.userId = :userId and o.status in :statuses
              and (lower(coalesce(o.orderNumber, '')) like :search escape '!'
                or lower(cast(o.id as string)) like :search escape '!'
                or exists (select item.id from OrderItem item where item.order = o
                    and lower(item.listingTitle) like :search escape '!'))
            """)
    Page<Order> findUserHistory(@Param("userId") UUID userId,
                               @Param("statuses") List<OrderStatus> statuses,
                               @Param("search") String search,
                               Pageable pageable);
    @Query(
            value = "select distinct o from Order o join o.items item where item.hostId = :hostId order by o.createdAt desc",
            countQuery = "select count(distinct o) from Order o join o.items item where item.hostId = :hostId"
    )
    Page<Order> findByAnyItemHostIdOrderByCreatedAtDesc(@Param("hostId") UUID hostId, Pageable pageable);
    long countByStatus(OrderStatus status);

    @Query("select coalesce(sum(o.totalAmount), 0) from Order o")
    BigDecimal sumTotalAmount();

    @Query("select coalesce(sum(o.totalAmount), 0) from Order o where o.status = :status")
    BigDecimal sumTotalAmountByStatus(@Param("status") OrderStatus status);

    @Query(value = """
            select cast(created_at as date) as report_date,
                   coalesce(sum(total_amount), 0) as total_amount,
                   count(*) as order_count
            from orders
            where created_at >= :startDate and created_at < :endDate
            group by cast(created_at as date)
            order by report_date
            """, nativeQuery = true)
    List<Object[]> getDailyOrderReport(@Param("startDate") LocalDateTime startDate,
                                       @Param("endDate") LocalDateTime endDate);

    @Query("SELECT CASE WHEN COUNT(o) > 0 THEN true ELSE false END FROM Order o JOIN o.items i WHERE o.userId = :userId AND i.listingId = :listingId AND o.status IN :statuses")
    boolean hasPurchasedListing(@Param("userId") UUID userId, @Param("listingId") UUID listingId, @Param("statuses") List<OrderStatus> statuses);
}
