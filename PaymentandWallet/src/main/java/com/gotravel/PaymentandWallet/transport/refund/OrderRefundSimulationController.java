package com.gotravel.PaymentandWallet.transport.refund;
import com.gotravel.PaymentandWallet.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
@RestController @RequiredArgsConstructor
@RequestMapping("/api/v1/internal/payments/transport/orders")
public class OrderRefundSimulationController {
 private final OrderRefundSimulationService service;
 @GetMapping("/{id}/refund-simulation") public ApiResponse<ProviderRefundService.Result> status(@PathVariable UUID id){return ApiResponse.success(service.status(id));}
 @PostMapping("/{id}/refund-simulation") public ApiResponse<ProviderRefundService.Result> simulate(@PathVariable UUID id,@RequestBody ProviderRefundController.Approval approval){return ApiResponse.success(service.simulate(id,approval.actorId(),approval.amount()));}
}
