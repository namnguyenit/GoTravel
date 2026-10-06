package com.GoTravel.CartandOrder.controller;

import com.GoTravel.CartandOrder.dto.request.BookNowRequest;
import com.GoTravel.CartandOrder.dto.request.CheckoutCartRequest;
import com.GoTravel.CartandOrder.dto.request.CreateOrderDisputeRequest;
import com.GoTravel.CartandOrder.dto.request.ForceCancelOrderRequest;
import com.GoTravel.CartandOrder.dto.request.ResolveOrderDisputeRequest;
import com.GoTravel.CartandOrder.dto.response.AdminOrderSummaryResponse;
import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import com.GoTravel.CartandOrder.dto.response.OrderDisputeResponse;
import com.GoTravel.CartandOrder.dto.response.OrderResponse;
import com.GoTravel.CartandOrder.enums.DisputeStatus;
import com.GoTravel.CartandOrder.enums.OrderStatus;
import com.GoTravel.CartandOrder.service.OrderService;
import com.GoTravel.CartandOrder.service.OrderDisputeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class OrderController {

    private final OrderService orderService;
    private final OrderDisputeService orderDisputeService;

    @PostMapping("/checkout-cart")
    public ResponseEntity<ApiResponse<OrderResponse>> checkoutCart(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody @Valid CheckoutCartRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Checkout thành công, đang chuyển đến thanh toán", orderService.checkoutCart(userId, request)));
    }

    @PostMapping("/book-now")
    public ResponseEntity<ApiResponse<OrderResponse>> bookNow(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody @Valid BookNowRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đặt dịch vụ thành công, đang chuyển đến thanh toán", orderService.bookNow(userId, request)));
    }

    @GetMapping("/admin/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AdminOrderSummaryResponse>> getAdminSummary() {
        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê đơn hàng thành công", orderService.getAdminSummary()));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> getAdminOrders(Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn hàng thành công", orderService.getAdminOrders(pageable)));
    }

    @PutMapping("/admin/{orderId}/force-cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> forceCancelOrder(
            @PathVariable UUID orderId,
            @RequestBody(required = false) ForceCancelOrderRequest request) {
        orderDisputeService.forceCancelOrder(orderId, request);
        return ResponseEntity.ok(ApiResponse.success("Đã hủy bắt buộc và ghi nhận hoàn tiền"));
    }

    @GetMapping("/admin/disputes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<OrderDisputeResponse>>> getAdminDisputes(
            @RequestParam(required = false) DisputeStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách khiếu nại thành công", orderDisputeService.getAdminDisputes(status, pageable)));
    }

    @PutMapping("/admin/disputes/{disputeId}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<OrderDisputeResponse>> resolveDispute(
            @RequestHeader("X-User-Id") UUID adminId,
            @PathVariable UUID disputeId,
            @RequestBody @Valid ResolveOrderDisputeRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã xử lý khiếu nại", orderDisputeService.resolveDispute(adminId, disputeId, request)));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderDetails(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID orderId) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrderDetails(userId, orderId)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> getUserOrders(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestParam(required = false) List<OrderStatus> statuses,
            @RequestParam(defaultValue = "") String search,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getUserOrders(userId, pageable, statuses, search)));
    }

    @PostMapping("/disputes")
    public ResponseEntity<ApiResponse<OrderDisputeResponse>> createDispute(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody @Valid CreateOrderDisputeRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã gửi khiếu nại. Admin sẽ kiểm tra và phản hồi.", orderDisputeService.createDispute(userId, request)));
    }

    @GetMapping("/disputes")
    public ResponseEntity<ApiResponse<Page<OrderDisputeResponse>>> getMyDisputes(
            @RequestHeader("X-User-Id") UUID userId,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách khiếu nại thành công", orderDisputeService.getMyDisputes(userId, pageable)));
    }

    @GetMapping("/host")
    @PreAuthorize("hasRole('HOST') or hasRole('ENTERPRISE') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> getHostOrders(
            @RequestHeader("X-User-Id") UUID hostId,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getHostOrders(hostId, pageable)));
    }

    @PutMapping("/{orderId}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelOrder(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID orderId) {
        orderService.cancelOrder(userId, orderId);
        return ResponseEntity.ok(ApiResponse.success("Đã hủy đơn hàng thành công"));
    }

    @PostMapping("/{orderId}/ticket-email/resend")
    public ResponseEntity<ApiResponse<OrderResponse>> resendTicketEmail(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID orderId) {
        return ResponseEntity.ok(ApiResponse.success("Đã gửi lại vé điện tử", orderService.resendTicketEmail(userId, orderId)));
    }

    @GetMapping("/check-purchased/{listingId}")
    public ResponseEntity<ApiResponse<Boolean>> checkPurchased(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID listingId) {
        return ResponseEntity.ok(ApiResponse.success("Success", orderService.hasPurchasedListing(userId, listingId)));
    }
}
