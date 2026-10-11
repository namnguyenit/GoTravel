package com.gotravel.PaymentandWallet.controller;

import com.gotravel.PaymentandWallet.dto.response.ApiResponse;
import com.gotravel.PaymentandWallet.service.PaymentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payouts/transport")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class TransportFinanceController {
    private final PaymentService payments;

    @GetMapping("/cash-summary")
    public ResponseEntity<ApiResponse<PaymentService.CashSettlementSummary>> cashSummary(
            @RequestParam(required = false) UUID operatorId) {
        return ResponseEntity.ok(ApiResponse.success(payments.cashSettlementSummary(operatorId)));
    }

    public record CommissionPaidRequest(
            @NotNull @DecimalMin("0") @Digits(integer = 18, fraction = 0) BigDecimal amount,
            @NotBlank @Size(max = 160) String reference,
            @NotBlank @Size(max = 1000) String evidenceUrl) {}

    @PutMapping("/cash-settlements/{shiftId}/mark-paid")
    public ResponseEntity<ApiResponse<Void>> markCashCommissionPaid(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID shiftId, @RequestBody @Valid CommissionPaidRequest request) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        UUID actor;
        try {
            actor = UUID.fromString(jwt.getSubject());
        } catch (Exception invalid) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        payments.recordCashCommissionPaid(shiftId, request.amount(), request.reference(),
                request.evidenceUrl(), actor);
        return ResponseEntity.ok(ApiResponse.success("Đã ghi chứng từ nộp hoa hồng tiền mặt"));
    }
}
