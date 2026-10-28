package com.GoTravel.CartandOrder.transport.refund;
import com.GoTravel.CartandOrder.configuration.InternalFeignConfig;
import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
import java.math.BigDecimal;
@FeignClient(name="gopay-provider-refunds",url="${services.payment.url:http://127.0.0.1:8085}",configuration=InternalFeignConfig.class)
public interface GoPayRefundClient {
 record Approval(UUID actorId,BigDecimal amount) {}
 record Result(UUID operationId,String state,boolean eligible,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal amount,String provider,String message,String reference,String evidenceUrl,String environment,boolean simulated,boolean simulationEligible) {}
 @GetMapping("/api/v1/internal/payments/transport/orders/{id}/refund-simulation") ApiResponse<Result> orderStatus(@PathVariable("id") UUID id);
 @PostMapping("/api/v1/internal/payments/transport/orders/{id}/refund-simulation") ApiResponse<Result> simulateOrder(@PathVariable("id") UUID id,@RequestBody Approval approval);
 @GetMapping("/api/v1/internal/payments/transport/item-operations/{id}/provider-refund") ApiResponse<Result> status(@PathVariable("id") UUID id);
 @PostMapping("/api/v1/internal/payments/transport/item-operations/{id}/provider-refund") ApiResponse<Result> execute(@PathVariable("id") UUID id,@RequestBody Approval approval);
 @PostMapping("/api/v1/internal/payments/transport/item-operations/{id}/provider-refund/simulate") ApiResponse<Result> simulate(@PathVariable("id") UUID id,@RequestBody Approval approval);
}
