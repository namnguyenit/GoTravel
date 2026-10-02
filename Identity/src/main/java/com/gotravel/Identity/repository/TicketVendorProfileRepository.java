package com.gotravel.Identity.repository;

import com.gotravel.Identity.entity.TicketVendorProfile;
import com.gotravel.Identity.enums.Approval_status;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketVendorProfileRepository extends JpaRepository<TicketVendorProfile, String> {
    Page<TicketVendorProfile> findAllByApprovalStatus(Approval_status status, Pageable pageable);
    long countByApprovalStatus(Approval_status status);
}
