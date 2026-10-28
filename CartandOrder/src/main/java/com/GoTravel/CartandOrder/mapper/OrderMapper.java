package com.GoTravel.CartandOrder.mapper;

import com.GoTravel.CartandOrder.dto.response.OrderResponse;
import com.GoTravel.CartandOrder.entity.Order;
import com.GoTravel.CartandOrder.entity.OrderItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring", builder = @org.mapstruct.Builder(disableBuilder = true))
public interface OrderMapper {

    @Mapping(target = "transportFareVnd", ignore = true)
    @Mapping(target = "transportRefundedVnd", ignore = true)
    @Mapping(target = "itemId", source = "id")
    OrderResponse.OrderItemResponse toOrderItemResponse(OrderItem orderItem);

    @Mapping(target = "transportOriginalChargeVnd", ignore = true)
    @Mapping(target = "transportCancellationPolicy", ignore = true)
    @Mapping(target = "transportPendingItemRefundDue", ignore = true)
    @Mapping(target = "transportPendingItemRefundCount", ignore = true)
    @Mapping(target = "transportPendingItemRefundOperationId", ignore = true)
    @Mapping(target = "transportActiveFareAmount", ignore = true)
    @Mapping(target = "orderId", source = "id")
    @Mapping(target = "status", expression = "java(order.getStatus().name())")
    OrderResponse toOrderResponse(Order order);

    @org.mapstruct.AfterMapping
    default void transportTotals(Order order, @org.mapstruct.MappingTarget OrderResponse response) {
        if (order.getOrderKind() != com.GoTravel.CartandOrder.enums.OrderKind.GOCAR_TICKET) return;
        if (order.getTransportFullRefundHours() != null && order.getTransportPartialRefundHours() != null && order.getTransportPartialFeeRate() != null) {
            response.setTransportCancellationPolicy(new com.GoTravel.CartandOrder.transport.CancellationPolicy.Details(
                    order.getTransportPolicyVersion(), Math.multiplyExact(order.getTransportFullRefundHours(), 60),
                    Math.multiplyExact(order.getTransportPartialRefundHours(), 60), order.getTransportPartialFeeRate()));
        }
        response.setTransportOriginalChargeVnd(order.getTotalAmount().stripTrailingZeros().toPlainString());
        response.setTransportActiveFareAmount(order.getItems().stream()
                .filter(item -> List.of("ACTIVE", "OPERATION_PENDING", "COMPLETED")
                        .contains(item.getTransportItemState()))
                .map(OrderItem::getTotalPrice)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add));
    }

    @org.mapstruct.AfterMapping
    default void transportItemTotals(OrderItem item,
            @org.mapstruct.MappingTarget OrderResponse.OrderItemResponse response) {
        if (item.getTransportTripId() == null) return;
        response.setTransportFareVnd(item.getTotalPrice().stripTrailingZeros().toPlainString());
        response.setTransportRefundedVnd(item.getTransportRefundTotal() == null ? "0"
                : item.getTransportRefundTotal().stripTrailingZeros().toPlainString());
    }
}
