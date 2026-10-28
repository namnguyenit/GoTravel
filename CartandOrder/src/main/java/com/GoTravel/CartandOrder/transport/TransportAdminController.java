package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import com.GoTravel.CartandOrder.dto.response.OrderResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders/transport/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class TransportAdminController {
    private final TransportAdminQueryService queries;
    private final com.GoTravel.CartandOrder.service.OrderDisputeService disputes;

    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> orders(
            @RequestParam(defaultValue = "ATTENTION") String view,
            @RequestParam(required = false) String search, Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(queries.list(view, search, pageable)));
    }
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<java.util.Map<String,Long>>> orderSummary() {
        return ResponseEntity.ok(ApiResponse.success(queries.summary()));
    }
    @GetMapping("/disputes")
    public ResponseEntity<ApiResponse<Page<com.GoTravel.CartandOrder.dto.response.OrderDisputeResponse>>> disputes(
            @RequestParam(required = false) com.GoTravel.CartandOrder.enums.DisputeStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "true") boolean active, Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(disputes.getAdminDisputes(status, pageable,
                com.GoTravel.CartandOrder.enums.OrderKind.GOCAR_TICKET, active, search)));
    }
    @PutMapping("/disputes/{id}/resolve")
    public ResponseEntity<ApiResponse<com.GoTravel.CartandOrder.dto.response.OrderDisputeResponse>> resolveDispute(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @RequestBody @Valid com.GoTravel.CartandOrder.dto.request.ResolveOrderDisputeRequest request) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        UUID actor;
        try { actor = UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException invalid) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED); }
        return ResponseEntity.ok(ApiResponse.success(disputes.resolveTransportDispute(actor, id, request)));
    }
    private final TransportOrderService service;
    private final TransportNotificationService notifications;
    private final TransportOperationsReportService reports;
    @GetMapping("/reports/{operatorUserId}")
    public ResponseEntity<ApiResponse<java.util.Map<String,Object>>> report(@PathVariable UUID operatorUserId,
            @RequestParam java.time.LocalDate from, @RequestParam java.time.LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(reports.report(operatorUserId, from, to)));
    }
    @GetMapping("/reports/overview")
    public ResponseEntity<ApiResponse<java.util.Map<String,Object>>> overviewReport(
            @RequestParam java.time.LocalDate from, @RequestParam java.time.LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(reports.adminOverviewReport(from, to)));
    }
    @GetMapping("/notifications")
    public ResponseEntity<ApiResponse<java.util.List<java.util.Map<String,Object>>>> notifications() {
        return ResponseEntity.ok(ApiResponse.success(notifications.pending()));
    }
    @PostMapping("/notifications/{eventId}/retry")
    public ResponseEntity<ApiResponse<Void>> retryNotification(@PathVariable UUID eventId) {
        notifications.retry(eventId);
        return ResponseEntity.ok(ApiResponse.success("Đã xếp lại email thất bại"));
    }
    private final TransportExchangeService exchanges;
    private final TripCancellationService tripCancellations;
    private final TransportReconciliationService reconciliation;

    @GetMapping("/reconciliation")
    public ResponseEntity<ApiResponse<java.util.List<TransportReconciliationService.Finding>>> findings(
            @RequestParam(defaultValue = "100") int limit) {
        return ResponseEntity.ok(ApiResponse.success(reconciliation.openFindings(limit)));
    }

    @PutMapping("/reconciliation/{orderId}/refresh")
    public ResponseEntity<ApiResponse<java.util.List<TransportReconciliationService.Finding>>> refresh(
            @PathVariable UUID orderId) {
        return ResponseEntity.ok(ApiResponse.success(reconciliation.scan(orderId)));
    }

    public record ReconciliationNote(@NotBlank @Size(max = 1000) String note) {}

    @PostMapping("/reconciliation/{orderId}/{code}/notes")
    public ResponseEntity<ApiResponse<Void>> addReconciliationNote(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId, @PathVariable String code,
            @RequestBody @Valid ReconciliationNote request) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        UUID actor;
        try { actor = UUID.fromString(jwt.getSubject()); }
        catch (Exception invalid) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED); }
        reconciliation.addNote(orderId, code, actor, request.note());
        return ResponseEntity.ok(ApiResponse.success("Đã ghi chú đối soát"));
    }

    public record ExchangeRequest(@NotNull UUID oldOrderId, @NotNull UUID newOrderId,
                                  @NotBlank @Size(max = 500) String reason) {}

    @PostMapping("/exchanges")
    public ResponseEntity<ApiResponse<TransportExchangeService.ExchangeCase>> exchange(
            @AuthenticationPrincipal Jwt jwt, @RequestBody @Valid ExchangeRequest request) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        UUID actor;
        try { actor = UUID.fromString(jwt.getSubject()); }
        catch (Exception invalid) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED); }
        return ResponseEntity.ok(ApiResponse.success(exchanges.request(actor,
                request.oldOrderId(), request.newOrderId(), request.reason())));
    }

    @GetMapping("/exchanges/exceptions")
    public ResponseEntity<ApiResponse<java.util.List<java.util.Map<String,Object>>>> exchangeExceptions() {
        return ResponseEntity.ok(ApiResponse.success(exchanges.exceptions()));
    }
    @PostMapping("/exchanges/{oldOrderId}/resolve-exception")
    public ResponseEntity<ApiResponse<Void>> resolveExchange(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID oldOrderId, @RequestBody @Valid ReconciliationNote request) {
        if (jwt==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        exchanges.resolveException(UUID.fromString(jwt.getSubject()),oldOrderId,request.note());
        return ResponseEntity.ok(ApiResponse.success("Đã đóng ngoại lệ đổi vé theo chứng cứ trạng thái đơn"));
    }

    @GetMapping("/exchanges/{oldOrderId}")
    public ResponseEntity<ApiResponse<TransportExchangeService.ExchangeCase>> exchangeStatus(
            @PathVariable UUID oldOrderId) {
        return ResponseEntity.ok(ApiResponse.success(exchanges.get(oldOrderId)));
    }

    @GetMapping("/trip-cancellations/{tripId}")
    public ResponseEntity<ApiResponse<TripCancellationService.Progress>> tripCancellationStatus(
            @PathVariable UUID tripId) {
        return ResponseEntity.ok(ApiResponse.success(tripCancellations.progress(tripId)));
    }

    @GetMapping("/attention")
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> attention(Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(service.attention(pageable)));
    }

    public record CompleteRefundRequest(
            @NotNull @DecimalMin("0.01") @Digits(integer = 18, fraction = 0) BigDecimal amount,
            @NotBlank @Size(max = 160) String reference,
            @NotBlank @Size(max = 1000) String evidenceUrl) {}

    @PutMapping("/refunds/{orderId}/complete")
    public ResponseEntity<ApiResponse<Void>> complete(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId, @RequestBody @Valid CompleteRefundRequest request) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        UUID actor;
        try {
            actor = UUID.fromString(jwt.getSubject());
        } catch (Exception invalid) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        service.completeManualRefund(actor, orderId, request.amount(), request.reference(), request.evidenceUrl());
        return ResponseEntity.ok(ApiResponse.success("Đã lưu bằng chứng hoàn tiền đã thực hiện"));
    }

    @PutMapping("/refunds/{orderId}/open-paid-review")
    public ResponseEntity<ApiResponse<Void>> openPaidReview(@PathVariable UUID orderId) {
        service.openPaidReviewRefund(orderId);
        return ResponseEntity.ok(ApiResponse.success("Đã mở hồ sơ hoàn tiền cho đơn thiếu ghế"));
    }
}
