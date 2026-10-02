package com.gotravel.Identity.dto.response;

import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TicketVendorProfileResponse {
    String companyName;
    String companyAddress;
    String representativeName;
    String representativeIdNumber;
    String taxCode;
    String contactPhone;
    String documentFrontUrl;
    String documentBackUrl;
    String approvalStatus;
    String rejectionReason;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
