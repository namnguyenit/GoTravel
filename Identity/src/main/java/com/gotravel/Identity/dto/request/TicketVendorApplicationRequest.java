package com.gotravel.Identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TicketVendorApplicationRequest {
    @NotBlank
    @Size(max = 255)
    String companyName;

    @NotBlank
    @Size(max = 255)
    String companyAddress;

    @NotBlank
    @Size(max = 255)
    String representativeName;

    @NotBlank
    @Size(max = 30)
    String representativeIdNumber;

    @Size(max = 50)
    String taxCode;

    @Pattern(regexp = "^(?:[0-9]{10,11})?$")
    String contactPhone;
}
