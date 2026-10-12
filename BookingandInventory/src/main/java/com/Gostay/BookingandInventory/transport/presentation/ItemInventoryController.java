package com.Gostay.BookingandInventory.transport.presentation;
import com.Gostay.BookingandInventory.transport.application.ItemInventoryService;
import com.Gostay.BookingandInventory.transport.domain.ItemInventoryPort;
import com.Gostay.BookingandInventory.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
@RestController @RequiredArgsConstructor @RequestMapping("/api/v1/internal/inventory/transport/item-operations")
public class ItemInventoryController {
 private final ItemInventoryService service;
 @PutMapping("/{action}") public ApiResponse<ItemInventoryPort.Result> apply(@PathVariable String action,@RequestBody ItemInventoryPort.Command command){return ApiResponse.success(service.apply(command,action));}
 @GetMapping("/{operationId}") public ApiResponse<ItemInventoryPort.Result> get(@PathVariable UUID operationId){return ApiResponse.success(service.get(operationId));}
}
