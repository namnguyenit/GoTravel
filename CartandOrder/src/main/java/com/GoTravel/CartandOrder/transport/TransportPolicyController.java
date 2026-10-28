package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class TransportPolicyController {
    private final CancellationPolicy policy;
    @GetMapping("/api/v1/public/transport/cancellation-policy")
    public ApiResponse<CancellationPolicy.Details> current() { return ApiResponse.success(policy.current()); }
}
