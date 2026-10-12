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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders/transport")
@RequiredArgsConstructor
public class TransportOrderController {
    private final TransportOrderService service;
    private final TransportAmendmentService amendments;
    private final TransportOperationsReportService reports;

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

    @GetMapping("/{orderId}/cancellation-preview")
    public ResponseEntity<ApiResponse<CancellationPolicy.Quote>> cancellationPreview(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID orderId) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        UUID actor;
        try { actor = UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException invalid) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED); }
        return ResponseEntity.ok(ApiResponse.success(service.cancellationPreview(actor, orderId)));
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

    @GetMapping("/vendor")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<OrderResponse>>> listVendorOrders(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) UUID operatorId,
            @RequestParam(required = false) com.GoTravel.CartandOrder.enums.OrderStatus status,
            @RequestParam(required=false) UUID tripId,
            @RequestParam(required=false) com.GoTravel.CartandOrder.enums.PaymentMethod method,
            @RequestParam(required=false) String search,
            @RequestParam(required=false) java.time.LocalDate from,
            @RequestParam(required=false) java.time.LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        UUID actorId;
        try { actorId = UUID.fromString(jwt.getSubject()); }
        catch (Exception e) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED); }
        var pageable = org.springframework.data.domain.PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        return ResponseEntity.ok(ApiResponse.success(service.listVendorOrders(actorId, operatorId, status, tripId, method,search,from,to,pageable)));
    }

    @GetMapping("/vendor/{orderId}")
    public ResponseEntity<ApiResponse<OrderResponse>> getVendorOrderDetail(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        UUID actorId;
        try { actorId = UUID.fromString(jwt.getSubject()); }
        catch (Exception e) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED); }
        return ResponseEntity.ok(ApiResponse.success(service.getVendorOrderDetail(actorId, orderId)));
    }

    @GetMapping("/vendor/{orderId}/items/{itemId}/ticket-document")
    public ResponseEntity<ApiResponse<TransportOrderService.CounterTicketDocument>> counterTicket(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID orderId,@PathVariable UUID itemId){
        if(jwt==null)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        UUID actor;try{actor=UUID.fromString(jwt.getSubject());}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);}
        return ResponseEntity.ok(ApiResponse.success(service.counterTicket(actor,orderId,itemId)));
    }

    @GetMapping("/vendor/reports")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> vendorReport(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) UUID operatorId,
            @RequestParam java.time.LocalDate from,
            @RequestParam java.time.LocalDate to) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        UUID actorId;
        try { actorId = UUID.fromString(jwt.getSubject()); }
        catch (Exception e) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED); }
        return ResponseEntity.ok(ApiResponse.success(reports.vendorReport(actorId, operatorId, from, to)));
    }

    @PostMapping("/{orderId}/items/{itemId}/amend")
    public ResponseEntity<ApiResponse<TransportAmendmentService.AmendmentRecord>> amend(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId,
            @PathVariable UUID itemId,
            @RequestBody @Valid TransportAmendmentService.AmendRequest request) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        UUID actorId;
        try { actorId = UUID.fromString(jwt.getSubject()); }
        catch (Exception e) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED); }
        return ResponseEntity.ok(ApiResponse.success(amendments.amend(actorId, orderId, itemId, request)));
    }

    @GetMapping("/{orderId}/items/{itemId}/amendments")
    public ResponseEntity<ApiResponse<List<TransportAmendmentService.AmendmentRecord>>> listAmendments(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId,
            @PathVariable UUID itemId) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        UUID actorId;
        try { actorId = UUID.fromString(jwt.getSubject()); }
        catch (Exception e) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED); }
        return ResponseEntity.ok(ApiResponse.success(amendments.listAmendmentsByItem(actorId, orderId, itemId)));
    }

    @GetMapping("/vendor/amendments/attention")
    public ResponseEntity<ApiResponse<List<TransportAmendmentService.AmendmentRecord>>> listAttentionAmendments(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) UUID operatorId) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        UUID actorId;
        try { actorId = UUID.fromString(jwt.getSubject()); }
        catch (Exception e) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED); }
        return ResponseEntity.ok(ApiResponse.success(amendments.listAttentionAmendments(actorId, operatorId)));
    }
    @PostMapping("/vendor/amendments/{commandId}/retry")
    public ResponseEntity<ApiResponse<TransportAmendmentService.AmendmentRecord>> retryAmendment(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID commandId) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return ResponseEntity.ok(ApiResponse.success(amendments.retry(UUID.fromString(jwt.getSubject()),commandId)));
    }

}
