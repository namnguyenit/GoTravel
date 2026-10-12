package com.GoTravel.CartandOrder.transport.adjustment.presentation;
import com.GoTravel.CartandOrder.transport.adjustment.application.ItemOperationService;
import com.GoTravel.CartandOrder.transport.adjustment.domain.ItemOperationRepository;
import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequiredArgsConstructor @RequestMapping("/api/v1/internal/orders/transport/item-operations")
public class InternalItemOperationController {
 private final ItemOperationService service;
 @GetMapping("/{id}")public ApiResponse<ItemOperationRepository.Operation> get(@PathVariable UUID id){return ApiResponse.success(service.trusted(id));}
 @GetMapping("/{id}/cash-proof")public ApiResponse<Map<String,Object>> cash(@PathVariable UUID id){service.trusted(id);return ApiResponse.success(service.cashProof(id));}
 @GetMapping("/{id}/refund-proof")public ApiResponse<Map<String,Object>> refund(@PathVariable UUID id){service.trusted(id);return ApiResponse.success(service.refundProof(id));}
}
