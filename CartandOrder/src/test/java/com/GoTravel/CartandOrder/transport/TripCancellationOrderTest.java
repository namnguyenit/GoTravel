package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.client.CatalogClient;
import com.GoTravel.CartandOrder.client.PaymentClient;
import com.GoTravel.CartandOrder.dto.response.ApiResponse;
import com.GoTravel.CartandOrder.entity.Order;
import com.GoTravel.CartandOrder.enums.OrderKind;
import com.GoTravel.CartandOrder.enums.OrderStatus;
import com.GoTravel.CartandOrder.enums.PaymentMethod;
import com.GoTravel.CartandOrder.mapper.OrderMapper;
import com.GoTravel.CartandOrder.repository.OrderRepository;
import com.GoTravel.CartandOrder.transport.cash.domain.CashLedger;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TripCancellationOrderTest {
    private final OrderRepository orders = mock(OrderRepository.class);
    private final TransportInventoryClient inventory = mock(TransportInventoryClient.class);
    private final GoCarClient car = mock(GoCarClient.class);
    private final PaymentClient payments = mock(PaymentClient.class);
    private final TransactionTemplate transactions = mock(TransactionTemplate.class);
    private final TransportOrderService service = new TransportOrderService(orders,
            mock(CatalogClient.class), car, inventory, payments, mock(OrderMapper.class),
            transactions, mock(CashLedger.class), mock(CancellationPolicy.class), mock(JdbcTemplate.class));

    private void runTransactions() {
        doAnswer(call -> {
            @SuppressWarnings("unchecked")
            Consumer<TransactionStatus> callback = call.getArgument(0);
            callback.accept(mock(TransactionStatus.class));
            return null;
        }).when(transactions).executeWithoutResult(any());
    }

    @Test
    void operatorCancellationVoidsPaidTicketBeforeReleasingSoldSeatAndRefundsFullAmount() {
        runTransactions();
        UUID orderId = UUID.randomUUID(), tripId = UUID.randomUUID();
        var order = Order.builder().id(orderId).orderKind(OrderKind.GOCAR_TICKET)
                .paymentMethod(PaymentMethod.ONLINE).transportTripId(tripId)
                .totalAmount(new BigDecimal("250000")).status(OrderStatus.CONFIRMED).build();
        when(orders.findById(orderId)).thenReturn(Optional.of(order));
        when(orders.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));
        when(car.voidTickets(orderId)).thenReturn(ApiResponse.success("voided"));
        when(inventory.orderStatus(orderId)).thenReturn(ApiResponse.success(
                new TransportInventoryClient.HoldStatus(orderId, tripId, List.of(UUID.randomUUID()),
                        "SOLD", Instant.now().plusSeconds(60))));
        when(inventory.cancelSold(orderId)).thenReturn(ApiResponse.success("released"));

        service.cancelForTrip(orderId, tripId, "Nhà xe hủy chuyến");

        assertThat(order.getStatus()).isEqualTo(OrderStatus.REFUND_PENDING);
        assertThat(order.getTransportRefundDue()).isEqualByComparingTo("250000");
        assertThat(order.getTransportCancellationFee()).isEqualByComparingTo("0");
        var sequence = inOrder(car, inventory);
        sequence.verify(car).voidTickets(orderId);
        sequence.verify(inventory).orderStatus(orderId);
        sequence.verify(inventory).cancelSold(orderId);
    }

    @Test
    void unpaidTicketReleasesHoldWithoutOpeningRefund() {
        runTransactions();
        UUID orderId = UUID.randomUUID(), tripId = UUID.randomUUID();
        var order = Order.builder().id(orderId).orderKind(OrderKind.GOCAR_TICKET)
                .paymentMethod(PaymentMethod.ONLINE).transportTripId(tripId)
                .totalAmount(new BigDecimal("250000")).status(OrderStatus.PAYMENT_PENDING).build();
        when(orders.findById(orderId)).thenReturn(Optional.of(order));
        when(orders.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));
        when(payments.getPaymentStatus(orderId)).thenReturn(ApiResponse.success(
                new PaymentClient.PaymentStatusResponse(orderId, new BigDecimal("250000"),
                        "PENDING", "VNPAY", null)));
        when(inventory.releaseUnpaid(orderId)).thenReturn(ApiResponse.success("released"));

        service.cancelForTrip(orderId, tripId, "Nhà xe hủy chuyến");

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(order.getTransportRefundDue()).isNull();
        verify(inventory).releaseUnpaid(orderId);
        verify(car, never()).voidTickets(any());
    }
}
