package com.gotravel.Identity.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminIdentitySummaryResponse {
    private long totalAccounts;
    private long totalUsers;
    private long activeAccounts;
    private long bannedAccounts;
    private long deletedAccounts;
    private long totalHosts;
    private long pendingHosts;
    private long approvedHosts;
    private long rejectedHosts;
    private long totalEnterprises;
    private long pendingEnterprises;
    private long approvedEnterprises;
    private long rejectedEnterprises;
    private long totalTicketVendors;
    private long pendingTicketVendors;
    private long approvedTicketVendors;
    private long rejectedTicketVendors;
}
