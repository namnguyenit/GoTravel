package com.GoTravel.CartandOrder.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResolveOrderDisputeRequest {
    @NotBlank(message = "Action không được để trống")
    private String action;

    @jakarta.validation.constraints.Size(max = 2000)
    private String adminNote;
}
