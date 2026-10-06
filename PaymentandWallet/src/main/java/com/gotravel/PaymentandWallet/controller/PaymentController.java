package com.gotravel.PaymentandWallet.controller;

import com.gotravel.PaymentandWallet.dto.request.CreatePaymentRequest;
import com.gotravel.PaymentandWallet.dto.response.ApiResponse;
import com.gotravel.PaymentandWallet.dto.response.PaymentResponse;
import com.gotravel.PaymentandWallet.service.PaymentService;
import com.gotravel.PaymentandWallet.service.VnpayService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Controller xử lý thanh toán - Yêu cầu Token xác thực.
 */
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class PaymentController {

    private final PaymentService paymentService;
    private final VnpayService vnpayService;

    @PostMapping("/create")
    public ResponseEntity<ApiResponse<PaymentResponse>> createPayment(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody @Valid CreatePaymentRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.success("Tạo yêu cầu thanh toán thành công", vnpayService.createPayment(userId, request, clientIp(httpRequest))));
    }

    private String clientIp(HttpServletRequest request) {
        // Only the trusted Gateway inserts this header; backend is bound to loopback.
        String forwarded = request.getHeader("X-User-Ip");
        if (forwarded != null && forwarded.matches("[0-9a-fA-F:.]{3,45}")) return forwarded;
        return request.getRemoteAddr();
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPayment(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID paymentId) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getPaymentById(userId, paymentId)));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentByOrder(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID orderId) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getPaymentByOrderId(userId, orderId)));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<Page<PaymentResponse>>> getPaymentHistory(
            @RequestHeader("X-User-Id") UUID userId,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getPaymentHistory(userId, pageable)));
    }

    @PostMapping("/{paymentId}/mock-pay")
    public ResponseEntity<ApiResponse<Void>> mockPaymentSuccess(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID paymentId) {
        paymentService.mockPaymentSuccess(userId, paymentId);
        return ResponseEntity.ok(ApiResponse.success("Thanh toán mô phỏng thành công"));
    }
}
