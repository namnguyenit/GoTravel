package com.GoTravel.CartandOrder.client;

import com.GoTravel.CartandOrder.configuration.InternalFeignConfig;
import com.GoTravel.CartandOrder.dto.request.RefundOrderRequest;
import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.UUID;

@FeignClient(name = "payment-wallet", url = "${services.payment.url:http://localhost:8085}", configuration = InternalFeignConfig.class)
public interface PaymentClient {
    record PaymentStatusResponse(UUID orderId, java.math.BigDecimal amount, String status,
                                 String provider, java.time.LocalDateTime paidAt) {}
    record ManualTransportRefundRequest(java.math.BigDecimal amount, String reference,
                                        String evidenceUrl, UUID recordedBy) {}
    record TransportCommission(String version, java.math.BigDecimal rate) {}
    record CashSettlementSummary(long shifts, java.math.BigDecimal grossAmount, java.math.BigDecimal refundedAmount,
                                java.math.BigDecimal commissionDue, java.math.BigDecimal commissionPaid,
                                java.math.BigDecimal outstandingAmount) {}
    record CashSettlement(UUID shiftId, UUID operatorId, java.math.BigDecimal grossAmount,
                          java.math.BigDecimal commissionDue, String commissionVersion,
                          java.math.BigDecimal commissionRate) {}
    record CashRefundAdjustment(UUID orderId, UUID shiftId, UUID operatorId,
                                java.math.BigDecimal refundAmount, java.math.BigDecimal commissionReversal,
                                String commissionVersion, java.math.BigDecimal commissionRate) {}

    @GetMapping("/api/v1/internal/payments/transport/funds-report")
    ApiResponse<java.util.Map<String,Object>> getTransportFundsReport(@org.springframework.web.bind.annotation.RequestParam(value="ownerUserId",required=false)UUID ownerUserId,@org.springframework.web.bind.annotation.RequestParam("from")java.time.LocalDate from,@org.springframework.web.bind.annotation.RequestParam("to")java.time.LocalDate to);
    @GetMapping("/api/v1/internal/payments/transport/commission")
    ApiResponse<TransportCommission> getTransportCommission();

    @GetMapping("/api/v1/internal/payments/transport/cash-summary")
    ApiResponse<CashSettlementSummary> getCashSettlementSummary(
            @org.springframework.web.bind.annotation.RequestParam(value = "operatorId", required = false) UUID operatorId);

    @PutMapping("/api/v1/internal/payments/transport/cash-settlements/{shiftId}")
    ApiResponse<Void> recordCashSettlement(@PathVariable("shiftId") UUID shiftId,
                                           @RequestBody CashSettlement request);

    @PutMapping("/api/v1/internal/payments/transport/cash-refund-adjustments/{orderId}")
    ApiResponse<Void> recordCashRefundAdjustment(@PathVariable("orderId") UUID orderId,
                                                  @RequestBody CashRefundAdjustment request);

    @GetMapping("/api/v1/internal/payments/order/{orderId}/status")
    ApiResponse<PaymentStatusResponse> getPaymentStatus(@PathVariable("orderId") UUID orderId);
    @PutMapping("/api/v1/internal/payments/order/{orderId}/refund")
    ApiResponse<Void> refundOrder(@PathVariable("orderId") UUID orderId, @RequestBody RefundOrderRequest request);

    @PutMapping("/api/v1/internal/payments/order/{orderId}/transport-manual-refund")
    ApiResponse<Void> recordManualTransportRefund(@PathVariable("orderId") UUID orderId,
                                                  @RequestBody ManualTransportRefundRequest request);
}
