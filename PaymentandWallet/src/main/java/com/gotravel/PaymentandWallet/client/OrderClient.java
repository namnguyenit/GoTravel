package com.gotravel.PaymentandWallet.client;

import com.gotravel.PaymentandWallet.configuration.InternalFeignConfig;
import com.gotravel.PaymentandWallet.dto.response.ApiResponse;
import com.gotravel.PaymentandWallet.dto.response.OrderPaymentSummaryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;

import java.util.UUID;

@FeignClient(name = "cart-order", url = "${services.cart-order.url:http://localhost:8084}", configuration = InternalFeignConfig.class)
public interface OrderClient {

    @GetMapping("/api/v1/internal/orders/{orderId}/payment-summary")
    ApiResponse<OrderPaymentSummaryResponse> getPaymentSummary(@PathVariable("orderId") UUID orderId);

    @PutMapping("/api/v1/internal/orders/{orderId}/payment-success")
    ApiResponse<Void> notifyPaymentSuccess(@PathVariable("orderId") UUID orderId);

    @PutMapping("/api/v1/internal/orders/{orderId}/payment-failed")
    ApiResponse<Void> notifyPaymentFailed(@PathVariable("orderId") UUID orderId);

    @PutMapping("/api/v1/internal/orders/{orderId}/payment-review")
    ApiResponse<Void> notifyPaymentReview(@PathVariable("orderId") UUID orderId);
}
