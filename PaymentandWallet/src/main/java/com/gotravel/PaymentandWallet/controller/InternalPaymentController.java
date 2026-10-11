package com.gotravel.PaymentandWallet.controller;

import com.gotravel.PaymentandWallet.dto.request.RefundOrderRequest;
import com.gotravel.PaymentandWallet.dto.response.ApiResponse;
import com.gotravel.PaymentandWallet.dto.response.PaymentResponse;
import com.gotravel.PaymentandWallet.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Controller nội bộ - Cho các Service khác gọi (CartandOrder, v.v.)
 */
@RestController
@RequestMapping("/api/v1/internal/payments")
@RequiredArgsConstructor
public class InternalPaymentController {

    private final PaymentService paymentService;

    @GetMapping("/order/{orderId}/status")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentStatus(@PathVariable UUID orderId) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getPaymentStatusByOrderId(orderId)));
    }

    @PutMapping("/order/{orderId}/refund")
    public ResponseEntity<ApiResponse<Void>> refundOrder(
            @PathVariable UUID orderId,
            @RequestBody(required = false) RefundOrderRequest request) {
        paymentService.refundOrder(orderId, request);
        return ResponseEntity.ok(ApiResponse.success("Đã ghi nhận hoàn tiền cho đơn hàng"));
    }

    public record ManualTransportRefundRequest(java.math.BigDecimal amount, String reference,
                                               String evidenceUrl, UUID recordedBy) {}

    @GetMapping("/transport/commission")
    public ResponseEntity<ApiResponse<PaymentService.TransportCommission>> transportCommission() {
        return ResponseEntity.ok(ApiResponse.success(paymentService.transportCommission()));
    }

    public record CashSettlementRequest(UUID shiftId, UUID operatorId, java.math.BigDecimal grossAmount,
                                        java.math.BigDecimal commissionDue, String commissionVersion,
                                        java.math.BigDecimal commissionRate) {}

    public record CashRefundAdjustmentRequest(UUID orderId, UUID shiftId, UUID operatorId,
                                              java.math.BigDecimal refundAmount,
                                              java.math.BigDecimal commissionReversal,
                                              String commissionVersion,
                                              java.math.BigDecimal commissionRate) {}

    @PutMapping("/transport/cash-settlements/{shiftId}")
    public ResponseEntity<ApiResponse<Void>> recordCashSettlement(@PathVariable UUID shiftId,
            @RequestBody CashSettlementRequest request) {
        paymentService.recordCashSettlement(shiftId, request.shiftId(), request.operatorId(),
                request.grossAmount(), request.commissionDue(), request.commissionVersion(),
                request.commissionRate());
        return ResponseEntity.ok(ApiResponse.success("Đã ghi nghĩa vụ hoa hồng tiền mặt"));
    }

    @PutMapping("/transport/cash-refund-adjustments/{orderId}")
    public ResponseEntity<ApiResponse<Void>> recordCashRefundAdjustment(@PathVariable UUID orderId,
            @RequestBody CashRefundAdjustmentRequest request) {
        paymentService.recordCashRefundAdjustment(orderId, request.orderId(), request.shiftId(),
                request.operatorId(), request.refundAmount(), request.commissionReversal(),
                request.commissionVersion(), request.commissionRate());
        return ResponseEntity.ok(ApiResponse.success("Đã ghi điều chỉnh hoa hồng do hoàn tiền mặt"));
    }

    @PutMapping("/order/{orderId}/transport-manual-refund")
    public ResponseEntity<ApiResponse<Void>> recordManualTransportRefund(
            @PathVariable UUID orderId, @RequestBody ManualTransportRefundRequest request) {
        paymentService.recordManualTransportRefund(orderId, request.amount(), request.reference(),
                request.evidenceUrl(), request.recordedBy());
        return ResponseEntity.ok(ApiResponse.success("Đã ghi bằng chứng hoàn tiền vận tải"));
    }
}
