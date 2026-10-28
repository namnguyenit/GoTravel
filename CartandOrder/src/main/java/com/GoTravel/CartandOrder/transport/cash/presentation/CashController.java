package com.GoTravel.CartandOrder.transport.cash.presentation;

import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import com.GoTravel.CartandOrder.dto.response.OrderResponse;
import com.GoTravel.CartandOrder.transport.TransportCheckoutRequest;
import com.GoTravel.CartandOrder.transport.TransportOrderService;
import com.GoTravel.CartandOrder.transport.cash.application.CashService;
import com.GoTravel.CartandOrder.transport.cash.domain.CashLedger;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders/transport/cash")
@RequiredArgsConstructor
public class CashController {
    private final CashService cash;
    private final TransportOrderService orders;

    public record OpenShiftRequest(@NotNull UUID tripId) {}
    public record CloseShiftRequest(@NotNull @DecimalMin("0") @Digits(integer = 18, fraction = 0)
                                    BigDecimal countedAmount) {}
    public record ReceiveRequest(@NotNull @DecimalMin("0.01") @Digits(integer = 18, fraction = 0)
                                 BigDecimal amount) {}

    @PostMapping({"/shifts", "/shifts/open"})
    public ResponseEntity<ApiResponse<CashLedger.Shift>> openShift(@AuthenticationPrincipal Jwt jwt,
            @RequestBody @Valid OpenShiftRequest request) {
        return ResponseEntity.ok(ApiResponse.success(cash.openShift(actor(jwt), request.tripId())));
    }

    @GetMapping("/shifts/me")
    public ResponseEntity<ApiResponse<java.util.List<CashLedger.Shift>>> getMyShifts(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(ApiResponse.success(cash.getMyShifts(actor(jwt))));
    }

    @GetMapping("/shifts/active/detail")
    public ResponseEntity<ApiResponse<CashLedger.ShiftDetail>> getActiveShiftDetail(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(ApiResponse.success(cash.getActiveShiftDetail(actor(jwt))));
    }

    @GetMapping("/shifts")
    public ResponseEntity<ApiResponse<java.util.List<CashLedger.Shift>>> listShifts(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) UUID operatorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(cash.listOperatorShifts(actor(jwt), operatorId, page, size)));
    }

    @GetMapping("/shifts/{shiftId}")
    public ResponseEntity<ApiResponse<CashLedger.ShiftDetail>> getShiftDetail(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID shiftId) {
        return ResponseEntity.ok(ApiResponse.success(cash.getShiftDetail(actor(jwt), shiftId)));
    }

    @PostMapping("/shifts/close")
    public ResponseEntity<ApiResponse<CashLedger.ClosedShift>> closeShift(@AuthenticationPrincipal Jwt jwt,
            @RequestBody @Valid CloseShiftRequest request) {
        return ResponseEntity.ok(ApiResponse.success(cash.closeShift(actor(jwt), request.countedAmount())));
    }

    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<OrderResponse>> checkout(@AuthenticationPrincipal Jwt jwt,
            @RequestHeader("Idempotency-Key") String key,
            @RequestBody @Valid TransportCheckoutRequest request) {
        return ResponseEntity.ok(ApiResponse.success(orders.checkoutCash(actor(jwt), key, request)));
    }

    @PostMapping("/orders/{orderId}/receive")
    public ResponseEntity<ApiResponse<CashService.CashReceiptResult>> receive(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId, @RequestBody @Valid ReceiveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(cash.receive(actor(jwt), orderId, request.amount())));
    }

    @PostMapping("/orders/{orderId}/cancel-unpaid")
    public ResponseEntity<ApiResponse<Void>> cancelUnpaid(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId) {
        orders.cancelCashUnpaid(actor(jwt), orderId);
        return ResponseEntity.ok(ApiResponse.success("Đã yêu cầu nhả ghế chưa thu tiền"));
    }

    public record CancelPaidRequest(String reason) {}

    @PostMapping("/orders/{orderId}/cancel-paid")
    public ResponseEntity<ApiResponse<Void>> cancelPaid(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId, @RequestBody(required = false) CancelPaidRequest request) {
        orders.cancelPaid(actor(jwt), orderId, request == null ? null : request.reason());
        return ResponseEntity.ok(ApiResponse.success("Vé đã hủy; tiền mặt đang chờ hoàn có chứng từ"));
    }

    private UUID actor(Jwt jwt) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (Exception invalid) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
    }
}
