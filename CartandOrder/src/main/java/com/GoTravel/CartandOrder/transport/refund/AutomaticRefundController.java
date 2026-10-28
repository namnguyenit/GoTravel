package com.GoTravel.CartandOrder.transport.refund;
import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.UUID;
@RestController @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
@RequestMapping("/api/v1/orders/transport/admin/item-operations")
public class AutomaticRefundController {
 private final AutomaticRefundService service;
 public record Approval(BigDecimal amount) {}
 @GetMapping("/{id}/automatic-refund") public ApiResponse<GoPayRefundClient.Result> status(@PathVariable UUID id){return ApiResponse.success(service.status(id));}
 @PostMapping("/{id}/automatic-refund") public ApiResponse<GoPayRefundClient.Result> approve(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@RequestBody Approval approval){return ApiResponse.success(service.approve(UUID.fromString(jwt.getSubject()),id,approval.amount()));}
 @PostMapping("/{id}/automatic-refund/simulate") public ApiResponse<GoPayRefundClient.Result> simulate(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@RequestBody Approval approval){return ApiResponse.success(service.simulate(UUID.fromString(jwt.getSubject()),id,approval.amount()));}
}
