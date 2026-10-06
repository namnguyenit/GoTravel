package com.gotravel.PaymentandWallet.scheduler;

import com.gotravel.PaymentandWallet.client.OrderClient;
import com.gotravel.PaymentandWallet.dto.response.*;
import com.gotravel.PaymentandWallet.entity.PaymentOrderNotification;
import com.gotravel.PaymentandWallet.repository.PaymentOrderNotificationRepository;
import com.gotravel.PaymentandWallet.service.*;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class PaymentNotificationSchedulerTest {
    private final PaymentOrderNotificationRepository notifications = mock(PaymentOrderNotificationRepository.class);
    private final OrderClient orders = mock(OrderClient.class);
    private final PaymentService payments = mock(PaymentService.class);
    private final PaymentNotificationScheduler scheduler = new PaymentNotificationScheduler(notifications, orders, payments);

    private PaymentOrderNotification pending(String status) {
        var n = PaymentOrderNotification.builder().orderId(UUID.randomUUID()).successful(true).createdAt(LocalDateTime.now()).build();
        when(notifications.findTop50ByDeliveredAtIsNullOrderByCreatedAtAsc()).thenReturn(List.of(n));
        when(orders.getPaymentSummary(n.getOrderId())).thenReturn(ApiResponse.success(OrderPaymentSummaryResponse.builder()
                .status(status).expiresAt(LocalDateTime.now(VnpayService.ZONE).plusMinutes(5)).build()));
        return n;
    }

    @Test
    void downstreamOutageRetainsDurableNotificationUntilSuccessfulRetry() {
        var n = pending("PAYMENT_PENDING");
        when(orders.notifyPaymentSuccess(n.getOrderId())).thenThrow(new IllegalStateException("test outage"))
                .thenReturn(ApiResponse.success("ok"));
        scheduler.deliverPendingNotifications();
        assertThat(n.getDeliveredAt()).isNull(); verify(notifications, never()).save(any());
        scheduler.deliverPendingNotifications();
        assertThat(n.getDeliveredAt()).isNotNull(); verify(notifications).save(n);
    }

    @Test
    void alreadyConfirmedOrderIsNotConfirmedAgainAfterWorkerRestart() {
        var n = pending("CONFIRMED");
        scheduler.deliverPendingNotifications();
        verify(orders, never()).notifyPaymentSuccess(any());
        assertThat(n.getDeliveredAt()).isNotNull();
    }

    @Test
    void cancelledOrderMovesReceivedPaymentToReview() {
        var n = pending("CANCELLED"); scheduler.deliverPendingNotifications();
        verify(payments).reviewVnpayPayment(n.getOrderId());
        verify(orders, never()).notifyPaymentSuccess(any());
    }
}
