package com.GoTravel.CartandOrder.controller;

import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import com.GoTravel.CartandOrder.dto.response.OrderPaymentSummaryResponse;
import com.GoTravel.CartandOrder.service.OrderService;
import com.GoTravel.CartandOrder.transport.TransportOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/internal/orders")
@RequiredArgsConstructor
public class InternalOrderController {

    private final OrderService orderService;
    private final TransportOrderService transportOrders;

    @GetMapping("/{orderId}/payment-summary")
    public ResponseEntity<ApiResponse<OrderPaymentSummaryResponse>> getPaymentSummary(@PathVariable UUID orderId) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getPaymentSummary(orderId)));
    }

    @GetMapping("/{orderId}/transport-fulfillment")
    public ResponseEntity<ApiResponse<TransportOrderService.FulfillmentSummary>> getTransportFulfillment(
            @PathVariable UUID orderId) {
        return ResponseEntity.ok(ApiResponse.success(transportOrders.fulfillmentSummary(orderId)));
    }

    @PutMapping("/{orderId}/payment-success")
    public ResponseEntity<ApiResponse<Void>> handlePaymentSuccess(@PathVariable UUID orderId) {
        if (orderService.isTransportOrder(orderId)) transportOrders.paymentSuccess(orderId);
        else orderService.confirmPayment(orderId);
        return ResponseEntity.ok(ApiResponse.success("Đã ghi nhận thanh toán thành công"));
    }

    @PutMapping("/{orderId}/payment-failed")
    public ResponseEntity<ApiResponse<Void>> handlePaymentFailed(@PathVariable UUID orderId) {
        if (orderService.isTransportOrder(orderId)) transportOrders.paymentFailed(orderId);
        else orderService.failPayment(orderId);
        return ResponseEntity.ok(ApiResponse.success("Đã ghi nhận thanh toán thất bại"));
    }

    @PutMapping("/{orderId}/payment-review")
    public ResponseEntity<ApiResponse<Void>> handlePaymentReview(@PathVariable UUID orderId) {
        if (!orderService.isTransportOrder(orderId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT, "Chỉ hỗ trợ đối soát vé xe");
        }
        transportOrders.paymentReview(orderId);
        return ResponseEntity.ok(ApiResponse.success("Đã ghi nhận tiền cần đối soát"));
    }

    @GetMapping("/users/{userId}/listings/{listingId}/completed")
    public ResponseEntity<ApiResponse<Boolean>> hasCompletedListingOrder(
            @PathVariable UUID userId,
            @PathVariable UUID listingId
    ) {
        boolean completed = orderService.hasCompletedListingOrder(userId, listingId);
        return ResponseEntity.ok(ApiResponse.success("Completed order verification successful", completed));
    }
}
