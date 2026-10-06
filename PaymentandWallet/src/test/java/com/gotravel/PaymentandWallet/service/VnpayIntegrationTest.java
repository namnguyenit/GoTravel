package com.gotravel.PaymentandWallet.service;

import com.gotravel.PaymentandWallet.client.OrderClient;
import com.gotravel.PaymentandWallet.configuration.*;
import com.gotravel.PaymentandWallet.dto.request.CreatePaymentRequest;
import com.gotravel.PaymentandWallet.dto.response.*;
import com.gotravel.PaymentandWallet.entity.*;
import com.gotravel.PaymentandWallet.enums.PaymentStatus;
import com.gotravel.PaymentandWallet.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@DataJpaTest(properties = {"spring.config.import=", "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false", "vnpay.enabled=true",
        "vnpay.tmn-code=TEST1234", "vnpay.hash-secret=test-only-secret", "payment.mock-enabled=false"})
@EnableConfigurationProperties(VnpayConfig.class)
@Import({VnpayService.class, VnpaySigner.class, PaymentService.class, MapperConfig.class, SepayConfig.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class VnpayIntegrationTest {
    @Autowired VnpayService service;
    @Autowired PaymentService paymentService;
    @Autowired VnpaySigner signer;
    @Autowired PaymentRequestRepository payments;
    @Autowired VnpayPaymentAttemptRepository attempts;
    @Autowired PaymentTransactionRepository transactions;
    @Autowired HostPayoutRepository payouts;
    @Autowired PaymentOrderNotificationRepository notifications;
    @MockitoBean OrderClient orders;
    private UUID user, orderId, host;
    private OrderPaymentSummaryResponse summary;

    @BeforeEach
    void setup() {
        attempts.deleteAll(); transactions.deleteAll(); payouts.deleteAll(); notifications.deleteAll(); payments.deleteAll();
        user = UUID.randomUUID(); orderId = UUID.randomUUID(); host = UUID.randomUUID();
        summary = OrderPaymentSummaryResponse.builder().orderId(orderId).userId(user).hostId(host)
                .totalAmount(new BigDecimal("120000")).currency("VND").status("PAYMENT_PENDING")
                .expiresAt(LocalDateTime.now(VnpayService.ZONE).plusMinutes(10))
                .providerBreakdowns(List.of(OrderPaymentSummaryResponse.ProviderBreakdown.builder()
                        .hostId(host).totalAmount(new BigDecimal("120000")).build())).build();
        when(orders.getPaymentSummary(orderId)).thenReturn(ApiResponse.success(summary));
    }

    private PaymentResponse create() {
        return service.createPayment(user, CreatePaymentRequest.builder().orderId(orderId)
                .amount(BigDecimal.ONE).hostId(UUID.randomUUID()).build(), "203.0.113.10");
    }

    private Map<String, String> callback(PaymentResponse response, String code, String transactionStatus) {
        var url = java.net.URI.create(response.getPaymentUrl());
        var fields = new HashMap<String, String>();
        for (var pair : url.getRawQuery().split("&")) {
            var parts = pair.split("=", 2);
            fields.put(parts[0], URLDecoder.decode(parts[1], StandardCharsets.UTF_8));
        }
        // Callback fields differ from the request fields; use the provider's documented response shape.
        fields.keySet().removeAll(Set.of("vnp_Version", "vnp_Command", "vnp_CreateDate", "vnp_ExpireDate", "vnp_ReturnUrl", "vnp_IpAddr", "vnp_Locale", "vnp_OrderType", "vnp_CurrCode"));
        fields.put("vnp_ResponseCode", code); fields.put("vnp_TransactionStatus", transactionStatus);
        fields.put("vnp_TransactionNo", "123456789"); fields.put("vnp_BankCode", "NCB");
        fields.put("vnp_PayDate", LocalDateTime.now(VnpayService.ZONE).format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")));
        fields.put("vnp_SecureHash", signer.sign(fields, "test-only-secret"));
        return fields;
    }

    @Test
    void createsSignedUrlUsingTrustedAmountAndReservationDeadlineAndReusesPendingAttempt() {
        var first = create(); var again = create();
        assertThat(first.getPaymentUrl()).startsWith("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?");
        assertThat(first.getAmount()).isEqualByComparingTo("120000");
        assertThat(first.getProvider()).isEqualTo("VNPAY");
        assertThat(first.getQrUrl()).isNull();
        assertThat(first.getExpiresAt()).isBeforeOrEqualTo(summary.getExpiresAt());
        assertThat(first.getPaymentUrl()).isEqualTo(again.getPaymentUrl());
        assertThat(attempts.count()).isEqualTo(1);
    }

    @Test
    void verifiedReturnDoesNotMarkPaymentPaidOrCreatePayouts() {
        var payment = create(); var fields = callback(payment, "00", "00");
        assertThat(service.getReturnResult(fields).result()).isEqualTo("PENDING");
        assertThat(payments.findById(payment.getPaymentId()).orElseThrow().getStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(transactions.count()).isZero(); assertThat(payouts.count()).isZero();
    }

    @Test
    void successfulIpnCommitsLedgerPayoutAndDurableNotificationAndDuplicateIsIdempotent() {
        var payment = create(); var fields = callback(payment, "00", "00");
        assertThat(service.handleIpn(fields).get("RspCode")).isEqualTo("00");
        assertThat(service.handleIpn(fields).get("RspCode")).isEqualTo("02");
        assertThat(transactions.count()).isEqualTo(1); assertThat(payouts.count()).isEqualTo(1);
        assertThat(notifications.findById(orderId).orElseThrow().getDeliveredAt()).isNull();
        assertThat(service.getReturnResult(fields).result()).isEqualTo("CONFIRMING");
        var notification = notifications.findById(orderId).orElseThrow();
        notification.setDeliveredAt(LocalDateTime.now(VnpayService.ZONE)); notifications.save(notification);
        assertThat(service.getReturnResult(fields).result()).isEqualTo("SUCCESS");
    }

    @Test
    void concurrentIpnsCannotDoubleCreditThePayment() throws Exception {
        var payment = create(); var fields = callback(payment, "00", "00");
        var executor = Executors.newFixedThreadPool(2);
        try {
            var start = new CountDownLatch(1);
            Callable<String> call = () -> { start.await(); return service.handleIpn(fields).get("RspCode"); };
            var a = executor.submit(call); var b = executor.submit(call); start.countDown();
            assertThat(List.of(a.get(15, TimeUnit.SECONDS), b.get(15, TimeUnit.SECONDS))).containsExactlyInAnyOrder("00", "02");
            assertThat(transactions.count()).isEqualTo(1); assertThat(payouts.count()).isEqualTo(1);
        } finally { executor.shutdownNow(); }
    }

    @Test
    void forgedSignatureMerchantOrAmountCannotChangePayment() {
        var payment = create(); var fields = callback(payment, "00", "00");
        fields.put("vnp_Amount", "100");
        assertThat(service.handleIpn(fields).get("RspCode")).isEqualTo("97");
        fields.put("vnp_SecureHash", signer.sign(fields, "test-only-secret"));
        assertThat(service.handleIpn(fields).get("RspCode")).isEqualTo("04");
        fields.put("vnp_TmnCode", "EVIL1234"); fields.put("vnp_SecureHash", signer.sign(fields, "test-only-secret"));
        assertThat(service.handleIpn(fields).get("RspCode")).isEqualTo("97");
        assertThat(transactions.count()).isZero(); assertThat(payouts.count()).isZero();
    }

    @Test
    void backendOutageRollsBackIpnAndAllowsProviderRetry() {
        var payment = create(); var fields = callback(payment, "00", "00");
        when(orders.getPaymentSummary(orderId)).thenThrow(new IllegalStateException("test outage"));
        assertThatThrownBy(() -> service.handleIpn(fields)).isInstanceOf(RuntimeException.class);
        assertThat(transactions.count()).isZero(); assertThat(payouts.count()).isZero();
        doReturn(ApiResponse.success(summary)).when(orders).getPaymentSummary(orderId);
        assertThat(service.handleIpn(fields).get("RspCode")).isEqualTo("00");
    }

    @Test
    void cancelledAttemptCanRetryWithoutExtendingReservation() {
        var first = create(); var fields = callback(first, "24", "02");
        assertThat(service.handleIpn(fields).get("RspCode")).isEqualTo("00");
        assertThat(service.getReturnResult(fields).result()).isEqualTo("FAILED");
        var retry = create();
        assertThat(retry.getPaymentUrl()).isNotEqualTo(first.getPaymentUrl());
        assertThat(retry.getExpiresAt()).isEqualTo(first.getExpiresAt());
        assertThat(transactions.count()).isZero();
    }

    @Test
    void lateOrSuspiciousPaymentIsRecordedForReviewWithoutConfirmingOrder() {
        var payment = create(); var fields = callback(payment, "07", "07");
        assertThat(service.handleIpn(fields).get("RspCode")).isEqualTo("00");
        assertThat(payments.findById(payment.getPaymentId()).orElseThrow().getStatus()).isEqualTo(PaymentStatus.PAID_REVIEW);
        assertThat(transactions.count()).isEqualTo(1); assertThat(payouts.count()).isZero();
        assertThat(notifications.count()).isZero(); assertThat(service.getReturnResult(fields).result()).isEqualTo("REVIEW");
    }

    @Test
    void receivedPaymentAfterOrderCancellationNeedsReview() {
        var payment = create(); var fields = callback(payment, "00", "00"); summary.setStatus("CANCELLED");
        assertThat(service.handleIpn(fields).get("RspCode")).isEqualTo("00");
        assertThat(payments.findById(payment.getPaymentId()).orElseThrow().getStatus()).isEqualTo(PaymentStatus.PAID_REVIEW);
        assertThat(payouts.count()).isZero();
    }

    @Test
    void mockEndpointAndFakeRefundCannotMarkVnpayPaymentPaidOrRefunded() {
        var payment = create();
        assertThatThrownBy(() -> paymentService.mockPaymentSuccess(user, payment.getPaymentId())).isInstanceOf(RuntimeException.class);
        service.handleIpn(callback(payment, "00", "00"));
        assertThatThrownBy(() -> paymentService.refundOrder(orderId, null)).isInstanceOf(RuntimeException.class);
        assertThat(payments.findById(payment.getPaymentId()).orElseThrow().getStatus()).isEqualTo(PaymentStatus.COMPLETED);
    }
}
