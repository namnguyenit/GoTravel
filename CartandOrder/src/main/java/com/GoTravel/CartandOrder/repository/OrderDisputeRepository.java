package com.GoTravel.CartandOrder.repository;

import com.GoTravel.CartandOrder.entity.OrderDispute;
import com.GoTravel.CartandOrder.enums.DisputeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrderDisputeRepository extends JpaRepository<OrderDispute, UUID>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<OrderDispute> {
    Page<OrderDispute> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    Page<OrderDispute> findByStatusOrderByCreatedAtDesc(DisputeStatus status, Pageable pageable);
    Page<OrderDispute> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Optional<OrderDispute> findFirstByOrderIdAndStatusIn(UUID orderId, Collection<DisputeStatus> statuses);
}
