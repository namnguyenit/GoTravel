package com.gotravel.Identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpgradeApplicationsResponse {
    HostProfileResponse hostApplication;
    EnterpriseProfileResponse enterpriseApplication;
    TicketVendorProfileResponse ticketVendorApplication;
    List<ApplicationHistoryEntry> history;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ApplicationHistoryEntry {
        String type;
        String status;
        String title;
        String description;
        LocalDateTime occurredAt;
    }
}
