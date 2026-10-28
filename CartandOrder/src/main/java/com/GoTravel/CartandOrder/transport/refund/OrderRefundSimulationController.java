package com.GoTravel.CartandOrder.transport.refund;
import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
@RestController @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
@RequestMapping("/api/v1/orders/transport/admin/refunds")
public class OrderRefundSimulationController {
 private final OrderRefundSimulationService service;
 @GetMapping("/{id}/simulation") public ApiResponse<GoPayRefundClient.Result> status(@PathVariable UUID id){return ApiResponse.success(service.status(id));}
 @PostMapping("/{id}/simulation/simulate") public ApiResponse<GoPayRefundClient.Result> simulate(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@RequestBody AutomaticRefundController.Approval approval){return ApiResponse.success(service.simulate(UUID.fromString(jwt.getSubject()),id,approval.amount()));}
}
