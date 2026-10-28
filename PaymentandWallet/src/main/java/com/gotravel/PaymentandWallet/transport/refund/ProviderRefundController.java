package com.gotravel.PaymentandWallet.transport.refund;
import com.gotravel.PaymentandWallet.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
import java.math.BigDecimal;
@RestController @RequiredArgsConstructor
@RequestMapping("/api/v1/internal/payments/transport/item-operations")
public class ProviderRefundController {
 private final ProviderRefundService service;
 public record Approval(UUID actorId,BigDecimal amount) {}
 @GetMapping("/{id}/provider-refund") public ApiResponse<ProviderRefundService.Result> status(@PathVariable UUID id){return ApiResponse.success(service.status(id));}
 @PostMapping("/{id}/provider-refund") public ApiResponse<ProviderRefundService.Result> execute(@PathVariable UUID id,@RequestBody Approval approval){return ApiResponse.success(service.execute(id,approval.actorId(),approval.amount()));}
 @PostMapping("/{id}/provider-refund/simulate") public ApiResponse<ProviderRefundService.Result> simulate(@PathVariable UUID id,@RequestBody Approval approval){return ApiResponse.success(service.simulate(id,approval.actorId(),approval.amount()));}
}
