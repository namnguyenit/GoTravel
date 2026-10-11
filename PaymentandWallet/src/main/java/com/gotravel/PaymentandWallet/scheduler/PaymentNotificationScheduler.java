package com.gotravel.PaymentandWallet.scheduler;

import com.gotravel.PaymentandWallet.client.OrderClient;
import com.gotravel.PaymentandWallet.repository.PaymentOrderNotificationRepository;
import com.gotravel.PaymentandWallet.service.PaymentService;
import com.gotravel.PaymentandWallet.service.VnpayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentNotificationScheduler {
    private final PaymentOrderNotificationRepository notifications;
    private final OrderClient orders;
    private final PaymentService paymentService;

    @Scheduled(fixedDelay = 2000, initialDelay = 10000)
    public void deliverPendingNotifications() {
        for (var notification : notifications.findTop50ByDeliveredAtIsNullOrderByCreatedAtAsc()) {
            try {
                var response = orders.getPaymentSummary(notification.getOrderId());
                var order = response == null ? null : response.getData();
                if (order == null) throw new IllegalStateException("Order summary unavailable");
                boolean alreadyConfirmed = "CONFIRMED".equals(order.getStatus()) || "COMPLETED".equals(order.getStatus());
                boolean transport = "GOCAR_TICKET".equals(order.getOrderKind());
                if (notification.isSuccessful() && !alreadyConfirmed) {
                    var payment = transport ? paymentService.getPaymentStatusByOrderId(notification.getOrderId()) : null;
                    if (transport && payment != null && "PAID_REVIEW".equals(payment.getStatus())) {
                        var result = orders.notifyPaymentReview(notification.getOrderId());
                        if (result == null || !result.isSuccess()) throw new IllegalStateException("Order review failed");
                    } else if (transport && "FULFILLMENT_PENDING".equals(order.getStatus())) {
                        // Cart owns the retry for ticket issuance after seats are sold.
                    } else if (!"PAYMENT_PENDING".equals(order.getStatus()) || order.getExpiresAt() == null
                            || (!transport && !order.getExpiresAt().isAfter(LocalDateTime.now(VnpayService.ZONE)))) {
                        paymentService.reviewVnpayPayment(notification.getOrderId());
                        if (transport) {
                            var result = orders.notifyPaymentReview(notification.getOrderId());
                            if (result == null || !result.isSuccess()) throw new IllegalStateException("Order review failed");
                        }
                    } else {
                        try {
                            var result = orders.notifyPaymentSuccess(notification.getOrderId());
                            if (result == null || !result.isSuccess()) throw new IllegalStateException("Order confirmation failed");
                        } catch (feign.FeignException e) {
                            // A definitive reservation/state rejection needs manual settlement, not endless retries.
                            if (e.status() == 400 || e.status() == 409) {
                                paymentService.reviewVnpayPayment(notification.getOrderId());
                                if (transport) {
                                    var review = orders.notifyPaymentReview(notification.getOrderId());
                                    if (review == null || !review.isSuccess()) throw new IllegalStateException("Order review failed");
                                }
                            }
                            else throw e;
                        }
                    }
                } else if (!notification.isSuccessful() && !alreadyConfirmed) {
                    var result = orders.notifyPaymentFailed(notification.getOrderId());
                    if (result == null || !result.isSuccess()) throw new IllegalStateException("Order cancellation failed");
                }
                notification.setDeliveredAt(LocalDateTime.now(VnpayService.ZONE));
                notifications.save(notification);
            } catch (Exception e) {
                log.warn("Payment notification for order {} will be retried ({})", notification.getOrderId(), e.getClass().getSimpleName());
            }
        }
    }
}
