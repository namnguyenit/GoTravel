package com.GoTravel.CartandOrder.transport.adjustment.infrastructure;
import com.GoTravel.CartandOrder.transport.adjustment.application.ItemOperationIntegrations;
import com.GoTravel.CartandOrder.transport.adjustment.domain.ItemOperationPlan;
import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import com.GoTravel.CartandOrder.configuration.InternalFeignConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;
import java.util.UUID;
@Component @RequiredArgsConstructor
public class HttpItemOperationIntegrations implements ItemOperationIntegrations {
 private final InventoryOperations inventory;private final TicketOperations tickets;private final MoneyOperations funds;
 public Receipt inventory(ItemOperationPlan p,String action){var ack=data(inventory.apply(action,p));if(!p.operationId().equals(ack.operationId()))throw new IllegalStateException("Inventory operation ACK khác");return ack;}
 public Receipt inventoryState(UUID id){return data(inventory.get(id));}
 public Ticket ticket(UUID id,String action){var ack=data(tickets.apply(id,action));if(!id.equals(ack.operationId()))throw new IllegalStateException("Ticket operation ACK khác");return ack;}
 public Money money(UUID id,String action){var ack=data(funds.apply(id,action));if(!id.equals(ack.operationId()))throw new IllegalStateException("Money operation ACK khác");return ack;}
 private <T>T data(ApiResponse<T> r){if(r==null||!r.isSuccess()||r.getData()==null)throw new IllegalStateException("Service chưa ACK operation");return r.getData();}
 @FeignClient(name="inventory-item-operations",url="${services.inventory.url:http://127.0.0.1:8083}",configuration=InternalFeignConfig.class)
 public interface InventoryOperations {
  @PutMapping("/api/v1/internal/inventory/transport/item-operations/{action}") ApiResponse<Receipt> apply(@PathVariable("action")String action,@RequestBody ItemOperationPlan plan);
  @GetMapping("/api/v1/internal/inventory/transport/item-operations/{id}") ApiResponse<Receipt> get(@PathVariable("id")UUID id);
 }
 @FeignClient(name="gocar-item-operations",url="${services.car.url:http://127.0.0.1:3333}",configuration=InternalFeignConfig.class)
 public interface TicketOperations {
  @PutMapping("/api/v1/internal/car/transport/item-operations/{id}/{action}")ApiResponse<Ticket> apply(@PathVariable("id")UUID id,@PathVariable("action")String action);
 }
 @FeignClient(name="payment-item-operations",url="${services.payment.url:http://127.0.0.1:8085}",configuration=InternalFeignConfig.class)
 public interface MoneyOperations {
  @PutMapping("/api/v1/internal/payments/transport/item-operations/{id}/{action}")ApiResponse<Money> apply(@PathVariable("id")UUID id,@PathVariable("action")String action);
 }
}
