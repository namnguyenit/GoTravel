package com.GoTravel.CartandOrder.transport.adjustment.presentation;
import com.GoTravel.CartandOrder.transport.adjustment.application.ItemOperationService;
import com.GoTravel.CartandOrder.transport.adjustment.domain.ItemOperationRepository;
import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;
import java.math.BigDecimal;
@RestController @RequiredArgsConstructor @RequestMapping("/api/v1/orders/transport")
public class ItemOperationController {
 private final ItemOperationService service;
 private UUID actor(Jwt jwt){if(jwt==null)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);try{return UUID.fromString(jwt.getSubject());}catch(Exception e){throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);}}
 @PostMapping("/{orderId}/items/{itemId}/cancel")public ApiResponse<ItemOperationService.View> cancel(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID orderId,@PathVariable UUID itemId,@RequestBody ItemOperationService.Request request){return ApiResponse.success(service.view(actor(jwt),service.request(actor(jwt),orderId,itemId,"CANCEL",request)));}
 @PostMapping("/{orderId}/items/{itemId}/exchange")public ApiResponse<ItemOperationService.View> exchange(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID orderId,@PathVariable UUID itemId,@RequestBody ItemOperationService.Request request){return ApiResponse.success(service.view(actor(jwt),service.request(actor(jwt),orderId,itemId,"EXCHANGE",request)));}
 @GetMapping("/item-operations/{id}")public ApiResponse<ItemOperationService.View> get(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id){return ApiResponse.success(service.view(actor(jwt),service.get(actor(jwt),id)));}
 @PostMapping("/item-operations/{id}/retry")public ApiResponse<ItemOperationService.View> retry(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id){service.get(actor(jwt),id);service.process(id);return ApiResponse.success(service.view(actor(jwt),service.get(actor(jwt),id)));}
 public record PreviewRequest(String kind,UUID tripId,UUID seatId,UUID pickupStopId,UUID dropoffStopId){}
 @PostMapping("/{orderId}/items/{itemId}/operation-preview") public ApiResponse<ItemOperationService.Preview> preview(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID orderId,@PathVariable UUID itemId,@RequestBody PreviewRequest request){return ApiResponse.success(service.preview(actor(jwt),orderId,itemId,request.kind(),new ItemOperationService.Request(null,request.tripId(),request.seatId(),request.pickupStopId(),request.dropoffStopId())));}
 @PostMapping("/item-operations/{id}/abort") public ApiResponse<ItemOperationService.View> abort(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id){service.abort(actor(jwt),id);return ApiResponse.success(service.view(actor(jwt),service.get(actor(jwt),id)));}
 @PostMapping("/admin/item-operations/{id}/abort") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<String> adminAbort(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id){service.adminAbort(actor(jwt),id);return ApiResponse.success("Đã yêu cầu dừng operation chưa commit");}
 public record Proof(BigDecimal amount,String reference,String evidenceUrl,String refundMethod,UUID cashShiftId){}
 @PostMapping("/item-operations/{id}/cash-topup")public ApiResponse<ItemOperationService.View> cash(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@RequestBody Proof proof){service.cashTopup(actor(jwt),id,proof.amount(),proof.reference());return ApiResponse.success(service.view(actor(jwt),service.get(actor(jwt),id)));}
 @PostMapping("/item-operations/{id}/cash-refund") public ApiResponse<ItemOperationService.View> cashRefund(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@RequestBody Proof proof){
  service.get(actor(jwt),id);service.refund(actor(jwt),id,proof.amount(),proof.reference(),proof.evidenceUrl(),"CASH",proof.cashShiftId());return ApiResponse.success(service.view(actor(jwt),service.get(actor(jwt),id)));
 }
 @PostMapping("/admin/item-operations/{id}/refund") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<String> refund(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@RequestBody Proof proof){service.refund(actor(jwt),id,proof.amount(),proof.reference(),proof.evidenceUrl(),proof.refundMethod(),proof.cashShiftId());return ApiResponse.success("Đã ghi chứng cứ hoàn; GoPay sẽ đối chiếu");}
 @GetMapping("/admin/item-operations/attention") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<java.util.List<ItemOperationRepository.Operation>> attention(){return ApiResponse.success(service.attention());}
 @PostMapping("/admin/item-operations/{id}/retry") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<String> adminRetry(@PathVariable UUID id){service.adminRetry(id);return ApiResponse.success("Đã yêu cầu worker xử lý lại");}

}
