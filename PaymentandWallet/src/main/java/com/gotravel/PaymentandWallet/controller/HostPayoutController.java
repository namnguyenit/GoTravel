package com.gotravel.PaymentandWallet.controller;

import com.gotravel.PaymentandWallet.dto.request.UpdateCommissionConfigRequest;
import com.gotravel.PaymentandWallet.dto.response.ApiResponse;
import com.gotravel.PaymentandWallet.dto.response.AdminPaymentSummaryResponse;
import com.gotravel.PaymentandWallet.dto.response.AdminRevenueReportResponse;
import com.gotravel.PaymentandWallet.dto.response.CommissionConfigResponse;
import com.gotravel.PaymentandWallet.dto.response.HostPayoutResponse;
import jakarta.validation.Valid;
import com.gotravel.PaymentandWallet.service.HostPayoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.time.LocalDate;

/**
 * Controller cho Host (chủ dịch vụ) xem thu nhập.
 */
@RestController
@RequestMapping("/api/v1/payouts")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class HostPayoutController {

    private final HostPayoutService hostPayoutService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Page<HostPayoutResponse>>> getMyPayouts(
            @AuthenticationPrincipal Jwt jwt,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(hostPayoutService.getPayoutsByHost(actor(jwt), pageable)));
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<HostPayoutResponse>>> getAllPayouts(Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(hostPayoutService.getAllPayouts(pageable)));
    }

    @GetMapping("/admin/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AdminPaymentSummaryResponse>> getAdminSummary() {
        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê thanh toán thành công", hostPayoutService.getAdminSummary()));
    }

    @GetMapping("/admin/revenue-report")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AdminRevenueReportResponse>> getRevenueReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(ApiResponse.success("Lấy báo cáo doanh thu thành công", hostPayoutService.getRevenueReport(startDate, endDate)));
    }

    @GetMapping("/admin/commission")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CommissionConfigResponse>> getCommissionConfig() {
        return ResponseEntity.ok(ApiResponse.success("Lấy cấu hình hoa hồng thành công", hostPayoutService.getCommissionConfig()));
    }

    @PutMapping("/admin/commission")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CommissionConfigResponse>> updateCommissionConfig(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody @Valid UpdateCommissionConfigRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật cấu hình hoa hồng thành công", hostPayoutService.updateCommissionConfig(actor(jwt), request)));
    }

    @PostMapping("/transport/{payoutId}/withdraw")
    public ResponseEntity<ApiResponse<HostPayoutResponse>> requestTransportWithdrawal(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID payoutId) {
        return ResponseEntity.ok(ApiResponse.success(hostPayoutService.requestTransportWithdrawal(payoutId,actor(jwt))));
    }

    public record TransportPayoutProof(java.math.BigDecimal amount,String reference,String evidenceUrl) {}

    @PutMapping("/transport/{payoutId}/mark-paid")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> markTransportPaid(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID payoutId,@RequestBody TransportPayoutProof proof) {
        hostPayoutService.markTransportPaid(payoutId,actor(jwt),proof.amount(),proof.reference(),proof.evidenceUrl());
        return ResponseEntity.ok(ApiResponse.success("Đã ghi chứng cứ chi trả vận tải theo net payable"));
    }

    @PutMapping("/{payoutId}/mark-paid")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> markAsPaid(@PathVariable UUID payoutId) {
        hostPayoutService.markAsPaid(payoutId);
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu đã thanh toán cho Host"));
    }

    @PutMapping("/host/{hostId}/mark-paid")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> markAllAsPaidByHost(@PathVariable UUID hostId) {
        hostPayoutService.markAllAsPaidByHost(hostId);
        return ResponseEntity.ok(ApiResponse.success("Đã thanh toán toàn bộ cho Host"));
    }

    @PostMapping("/withdraw")
    public ResponseEntity<ApiResponse<Void>> requestWithdrawal(@AuthenticationPrincipal Jwt jwt) {
        hostPayoutService.requestWithdrawal(actor(jwt));
        return ResponseEntity.ok(ApiResponse.success("Đã gửi yêu cầu rút tiền thành công"));
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
