package com.gotravel.PaymentandWallet.controller;

import com.gotravel.PaymentandWallet.dto.response.ApiResponse;
import com.gotravel.PaymentandWallet.transport.application.SettlementSimulationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
@RequestMapping("/api/v1/payouts/transport")
public class SettlementSimulationController {
    private final SettlementSimulationService service;
    public record Approval(BigDecimal amount) {}
    @GetMapping("/simulation") public ApiResponse<Map<String,Boolean>> config(){return ApiResponse.success(Map.of("enabled",service.enabled()));}
    @PostMapping("/{id}/simulation-preview") public ApiResponse<SettlementSimulationService.Result> preview(@PathVariable UUID id){return ApiResponse.success(service.previewPayout(id));}
    @PostMapping("/{id}/simulate-paid") public ApiResponse<SettlementSimulationService.Result> pay(@PathVariable UUID id,@AuthenticationPrincipal Jwt jwt,@RequestBody Approval request){return ApiResponse.success(service.simulatePayout(id,UUID.fromString(jwt.getSubject()),request.amount()));}
    @PostMapping("/cash-settlements/{id}/simulation-preview") public ApiResponse<SettlementSimulationService.Result> cashPreview(@PathVariable UUID id){return ApiResponse.success(service.previewCash(id));}
    @PostMapping("/cash-settlements/{id}/simulate-paid") public ApiResponse<SettlementSimulationService.Result> cash(@PathVariable UUID id,@AuthenticationPrincipal Jwt jwt,@RequestBody Approval request){return ApiResponse.success(service.simulateCash(id,UUID.fromString(jwt.getSubject()),request.amount()));}
}
