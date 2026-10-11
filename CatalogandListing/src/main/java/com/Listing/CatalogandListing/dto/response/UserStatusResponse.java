package com.Listing.CatalogandListing.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserStatusResponse {
    Boolean isActive;
    Boolean isDeleted;
    Boolean isAllowed;
    String hostApprovalStatus;
    String enterpriseApprovalStatus;
    String ticketVendorApprovalStatus;
}
