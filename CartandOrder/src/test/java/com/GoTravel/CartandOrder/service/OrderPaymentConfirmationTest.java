package com.GoTravel.CartandOrder.service;

import com.GoTravel.CartandOrder.client.*;
import com.GoTravel.CartandOrder.entity.Order;
import com.GoTravel.CartandOrder.enums.OrderStatus;
import com.GoTravel.CartandOrder.mapper.OrderMapper;
import com.GoTravel.CartandOrder.repository.*;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class OrderPaymentConfirmationTest {
    private final OrderRepository orders = mock(OrderRepository.class);
    private final InventoryClient inventory = mock(InventoryClient.class);
    private final CommunicationClient mail = mock(CommunicationClient.class);
    private final OrderService service = new OrderService(orders, mock(CartRepository.class), inventory,
            mock(CatalogClient.class), mail, mock(OrderMapper.class));

    @Test
    void repeatedConfirmationDoesNotSendEmailOrReserveAgain() {
        UUID id = UUID.randomUUID();
        when(orders.findByIdForUpdate(id)).thenReturn(Optional.of(Order.builder().id(id).status(OrderStatus.CONFIRMED).build()));
        service.confirmPayment(id);
        verifyNoInteractions(inventory, mail); verify(orders, never()).save(any());
    }

    @Test
    void cancelledOrExpiredOrderCannotBeRevivedByPaymentNotification() {
        UUID id = UUID.randomUUID();
        var order = Order.builder().id(id).status(OrderStatus.CANCELLED).expiresAt(LocalDateTime.now().plusMinutes(5)).build();
        when(orders.findByIdForUpdate(id)).thenReturn(Optional.of(order));
        assertThatThrownBy(() -> service.confirmPayment(id)).isInstanceOf(RuntimeException.class);
        order.setStatus(OrderStatus.PAYMENT_PENDING); order.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        assertThatThrownBy(() -> service.confirmPayment(id)).isInstanceOf(RuntimeException.class);
        verifyNoInteractions(inventory, mail); verify(orders, never()).save(any());
    }

    @Test
    void inventoryOutageLeavesOrderPendingForRetryAndDoesNotSendTicket() {
        UUID id = UUID.randomUUID();
        var order = Order.builder().id(id).status(OrderStatus.PAYMENT_PENDING).expiresAt(LocalDateTime.now().plusMinutes(5)).build();
        when(orders.findByIdForUpdate(id)).thenReturn(Optional.of(order));
        when(inventory.confirmLock(id)).thenThrow(new IllegalStateException("test outage"));
        assertThatThrownBy(() -> service.confirmPayment(id)).isInstanceOf(RuntimeException.class);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAYMENT_PENDING);
        verifyNoInteractions(mail); verify(orders, never()).save(any());
    }

    @Test
    void delayedFailureCannotCancelAnAlreadyConfirmedOrder() {
        UUID id = UUID.randomUUID();
        when(orders.findByIdForUpdate(id)).thenReturn(Optional.of(Order.builder().id(id).status(OrderStatus.CONFIRMED).build()));
        service.failPayment(id);
        verifyNoInteractions(inventory, mail); verify(orders, never()).save(any());
    }
}
