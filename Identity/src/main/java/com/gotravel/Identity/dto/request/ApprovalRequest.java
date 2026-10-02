package com.gotravel.Identity.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ApprovalRequest {
    @NotBlank
    String status; // APPROVED, REJECTED
    @Size(max = 1000)
    String reason;
}
