package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import com.GoTravel.CartandOrder.dto.response.OrderResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders/transport")
@RequiredArgsConstructor
public class TransportOrderController {
    private final TransportOrderService service;

    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<OrderResponse>> checkout(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestBody @Valid TransportCheckoutRequest request) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        UUID buyerId;
        try {
            buyerId = UUID.fromString(jwt.getSubject());
        } catch (Exception invalid) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User ID không hợp lệ");
        }
        return ResponseEntity.ok(ApiResponse.success(service.checkout(buyerId, idempotencyKey, request)));
    }

    @PostMapping("/{orderId}/cancel-unpaid")
    public ResponseEntity<ApiResponse<Void>> cancelUnpaid(@AuthenticationPrincipal Jwt jwt,
                                                          @PathVariable UUID orderId) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        try {
            service.cancelUnpaid(UUID.fromString(jwt.getSubject()), orderId);
        } catch (IllegalArgumentException invalid) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return ResponseEntity.ok(ApiResponse.success("Đang hủy giữ ghế chưa thanh toán"));
    }

    public record CancelPaidRequest(String reason) {}

    @PostMapping("/{orderId}/cancel-paid")
    public ResponseEntity<ApiResponse<Void>> cancelPaid(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId, @RequestBody(required = false) CancelPaidRequest request) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        try {
            service.cancelPaid(UUID.fromString(jwt.getSubject()), orderId,
                    request == null ? null : request.reason());
        } catch (IllegalArgumentException invalid) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return ResponseEntity.ok(ApiResponse.success("Vé đã hủy; yêu cầu hoàn tiền đang chờ xử lý"));
    }
}
