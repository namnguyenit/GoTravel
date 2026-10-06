package com.gotravel.PaymentandWallet.service;

import com.gotravel.PaymentandWallet.client.OrderClient;
import com.gotravel.PaymentandWallet.configuration.SepayConfig;
import com.gotravel.PaymentandWallet.configuration.VnpayConfig;
import com.gotravel.PaymentandWallet.entity.PaymentOrderNotification;
import com.gotravel.PaymentandWallet.repository.PaymentOrderNotificationRepository;
import org.springframework.beans.factory.annotation.Value;
import com.gotravel.PaymentandWallet.dto.request.CreatePaymentRequest;
import com.gotravel.PaymentandWallet.dto.request.RefundOrderRequest;
import com.gotravel.PaymentandWallet.dto.request.SepayWebhookRequest;
import com.gotravel.PaymentandWallet.dto.response.ApiResponse;
import com.gotravel.PaymentandWallet.dto.response.HostPayoutResponse;
import com.gotravel.PaymentandWallet.dto.response.OrderPaymentSummaryResponse;
import com.gotravel.PaymentandWallet.dto.response.PaymentResponse;
import com.gotravel.PaymentandWallet.entity.CommissionConfig;
import com.gotravel.PaymentandWallet.entity.HostPayout;
import com.gotravel.PaymentandWallet.entity.PaymentRequest;
import com.gotravel.PaymentandWallet.entity.PaymentTransaction;
import com.gotravel.PaymentandWallet.enums.PaymentStatus;
import com.gotravel.PaymentandWallet.enums.PayoutStatus;
import com.gotravel.PaymentandWallet.exeption.AppException;
import com.gotravel.PaymentandWallet.exeption.PaymentErrorCode;
import com.gotravel.PaymentandWallet.mapper.PaymentMapper;
import com.gotravel.PaymentandWallet.repository.CommissionConfigRepository;
import com.gotravel.PaymentandWallet.repository.HostPayoutRepository;
import com.gotravel.PaymentandWallet.repository.PaymentRequestRepository;
import com.gotravel.PaymentandWallet.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRequestRepository paymentRequestRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final HostPayoutRepository hostPayoutRepository;
    private final CommissionConfigRepository commissionConfigRepository;
    private final OrderClient orderClient;
    private final SepayConfig sepayConfig;
    private final PaymentMapper paymentMapper;
    private final VnpayConfig vnpayConfig;
    private final PaymentOrderNotificationRepository notificationRepository;
    @Value("${payment.mock-enabled:false}")
    private boolean mockEnabled;

    private static final String DEFAULT_COMMISSION_CONFIG_ID = "DEFAULT";
    private static final BigDecimal DEFAULT_COMMISSION_RATE = new BigDecimal("0.05"); // 5% hoa hồng GoStay
    private static final Pattern PAYMENT_CODE_PATTERN = Pattern.compile("(GS[A-Z0-9]{10})");

    /**
     * Tạo yêu cầu thanh toán mới cho một đơn hàng.
     * Sinh yêu cầu VNPAY; tổng tiền và hạn giữ chỗ lấy từ service đơn hàng.
     */
    @Transactional
    public PaymentResponse createPayment(UUID userId, CreatePaymentRequest request) {
        OrderPaymentSummaryResponse order = getTrustedOrderPaymentSummary(userId, request.getOrderId());

        PaymentRequest existingPayment = paymentRequestRepository.findByOrderIdAndUserId(order.getOrderId(), userId)
                .orElse(null);
        if (existingPayment != null) {
            return paymentMapper.toPaymentResponse(existingPayment);
        }

        String paymentCode = generatePaymentCode();

        var now = LocalDateTime.now(VnpayService.ZONE);
        var expiry = now.plusMinutes(vnpayConfig.getTimeoutMinutes());
        if (order.getExpiresAt() == null || !order.getExpiresAt().isAfter(now)) {
            throw new AppException(PaymentErrorCode.PAYMENT_EXPIRED);
        }
        if (order.getExpiresAt().isBefore(expiry)) expiry = order.getExpiresAt();
        expiry = expiry.withNano(0);
        VnpayService.amountUnits(order.getTotalAmount());
        if (!"VND".equalsIgnoreCase(order.getCurrency())) {
            throw new AppException(PaymentErrorCode.INVALID_ORDER_FOR_PAYMENT);
        }

        PaymentRequest paymentRequest = PaymentRequest.builder()
                .orderId(order.getOrderId())
                .userId(userId)
                .hostId(resolvePaymentRequestHostId(order))
                .paymentCode(paymentCode)
                .amount(order.getTotalAmount())
                .status(PaymentStatus.PENDING)
                .provider("VNPAY")
                .expiresAt(expiry)
                .build();

        paymentRequest = paymentRequestRepository.save(paymentRequest);
        log.info("Created payment request {} for order {}", paymentCode, order.getOrderId());

        return paymentMapper.toPaymentResponse(paymentRequest);
    }

    /**
     * Xử lý webhook từ SePay khi ngân hàng báo có tiền vào.
     * So khớp nội dung chuyển khoản với payment_code trong hệ thống.
     */
    @Transactional
    public void handleSepayWebhook(SepayWebhookRequest webhook) {
        if (webhook.getId() == null || webhook.getContent() == null || webhook.getTransferAmount() == null) {
            throw new AppException(PaymentErrorCode.INVALID_WEBHOOK);
        }

        if (paymentTransactionRepository.existsBySepayId(webhook.getId())) {
            log.info("SePay webhook {} was already processed; skipping duplicate delivery", webhook.getId());
            return;
        }

        String paymentCode = extractPaymentCode(webhook.getContent());
        if (paymentCode == null) {
            log.warn("Webhook received but no payment code found in content: {}", webhook.getContent());
            return;
        }

        PaymentRequest paymentRequest = paymentRequestRepository.findByPaymentCodeForUpdate(paymentCode)
                .orElse(null);

        if (paymentRequest == null) {
            log.warn("Payment code {} not found in system", paymentCode);
            return;
        }

        if ("VNPAY".equals(paymentRequest.getProvider())) {
            throw new AppException(PaymentErrorCode.INVALID_WEBHOOK);
        }
        if (paymentRequest.getStatus() == PaymentStatus.COMPLETED) {
            log.info("Payment {} is already completed; skipping webhook {}", paymentCode, webhook.getId());
            return;
        }

        if (paymentRequest.getStatus() == PaymentStatus.EXPIRED) {
            throw new AppException(PaymentErrorCode.PAYMENT_EXPIRED);
        }

        validateWebhookMatchesPayment(webhook, paymentRequest);

        PaymentTransaction transaction = PaymentTransaction.builder()
                .paymentRequest(paymentRequest)
                .amount(webhook.getTransferAmount())
                .gateway(webhook.getGateway())
                .senderAccount(webhook.getAccountNumber())
                .content(webhook.getContent())
                .referenceCode(webhook.getReferenceCode())
                .sepayId(webhook.getId())
                .transactionDate(parseTransactionDate(webhook.getTransactionDate()))
                .build();

        paymentTransactionRepository.save(transaction);

        paymentRequest.setStatus(PaymentStatus.COMPLETED);
        paymentRequest.setPaidAt(LocalDateTime.now());
        paymentRequestRepository.save(paymentRequest);

        OrderPaymentSummaryResponse order = getInternalOrderPaymentSummary(paymentRequest.getOrderId());
        createProviderPayouts(paymentRequest, order);

        log.info("Payment {} completed for order {}. Total: {}",
                paymentCode, paymentRequest.getOrderId(), paymentRequest.getAmount());

        try {
            orderClient.notifyPaymentSuccess(paymentRequest.getOrderId());
        } catch (Exception e) {
            log.error("Failed to notify CartOrder about payment success for order {}", paymentRequest.getOrderId(), e);
        }
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(UUID userId, UUID paymentId) {
        PaymentRequest paymentRequest = paymentRequestRepository.findByIdAndUserId(paymentId, userId)
                .orElseThrow(() -> new AppException(PaymentErrorCode.PAYMENT_NOT_FOUND));
        return paymentMapper.toPaymentResponse(paymentRequest);
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentByOrderId(UUID userId, UUID orderId) {
        PaymentRequest paymentRequest = paymentRequestRepository.findByOrderIdAndUserId(orderId, userId)
                .orElseThrow(() -> new AppException(PaymentErrorCode.PAYMENT_NOT_FOUND));
        return paymentMapper.toPaymentResponse(paymentRequest);
    }

    @Transactional(readOnly = true)
    public Page<PaymentResponse> getPaymentHistory(UUID userId, Pageable pageable) {
        return paymentRequestRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(paymentMapper::toPaymentResponse);
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentStatusByOrderId(UUID orderId) {
        PaymentRequest paymentRequest = paymentRequestRepository.findByOrderId(orderId)
                .orElseThrow(() -> new AppException(PaymentErrorCode.PAYMENT_NOT_FOUND));
        return paymentMapper.toPaymentResponse(paymentRequest);
    }

    @Transactional
    public void refundOrder(UUID orderId, RefundOrderRequest request) {
        PaymentRequest paymentRequest = paymentRequestRepository.findByOrderId(orderId)
                .orElseThrow(() -> new AppException(PaymentErrorCode.PAYMENT_NOT_FOUND));

        if (paymentRequest.getStatus() == PaymentStatus.REFUNDED) {
            return;
        }

        if ("VNPAY".equals(paymentRequest.getProvider())) {
            throw new AppException(PaymentErrorCode.VNPAY_REFUND_REQUIRED);
        }
        if (paymentRequest.getStatus() != PaymentStatus.COMPLETED) {
            throw new AppException(PaymentErrorCode.REFUND_NOT_ALLOWED);
        }

        List<HostPayout> payouts = hostPayoutRepository.findByOrderId(orderId);
        boolean hasPaidPayout = payouts.stream().anyMatch(payout -> payout.getStatus() == PayoutStatus.PAID);
        if (hasPaidPayout) {
            throw new AppException(PaymentErrorCode.REFUND_NOT_ALLOWED);
        }

        for (HostPayout payout : payouts) {
            payout.setStatus(PayoutStatus.CANCELLED);
            hostPayoutRepository.save(payout);
        }

        paymentRequest.setStatus(PaymentStatus.REFUNDED);
        paymentRequestRepository.save(paymentRequest);

        log.info("Refund simulated for order {}. Reason: {}", orderId, request == null ? null : request.getReason());
    }

    private OrderPaymentSummaryResponse getTrustedOrderPaymentSummary(UUID userId, UUID orderId) {
        try {
            ApiResponse<OrderPaymentSummaryResponse> response = orderClient.getPaymentSummary(orderId);
            OrderPaymentSummaryResponse order = response == null ? null : response.getData();
            if (order == null || order.getOrderId() == null || order.getUserId() == null
                    || order.getTotalAmount() == null) {
                throw new AppException(PaymentErrorCode.INVALID_ORDER_FOR_PAYMENT);
            }

            if (!userId.equals(order.getUserId())) {
                throw new AppException(PaymentErrorCode.PAYMENT_NOT_FOUND);
            }

            if (!"PAYMENT_PENDING".equalsIgnoreCase(order.getStatus())
                    || order.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new AppException(PaymentErrorCode.INVALID_ORDER_FOR_PAYMENT);
            }

            validateProviderBreakdowns(order);

            return order;
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Cannot load trusted payment summary for order {}", orderId, e);
            throw new AppException(PaymentErrorCode.INVALID_ORDER_FOR_PAYMENT);
        }
    }

    private String generatePaymentCode() {
        return "GS" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
    }

    private String extractPaymentCode(String content) {
        if (content == null) return null;
        Matcher matcher = PAYMENT_CODE_PATTERN.matcher(content.toUpperCase());
        return matcher.find() ? matcher.group(1) : null;
    }

    private void validateWebhookMatchesPayment(SepayWebhookRequest webhook, PaymentRequest paymentRequest) {
        if (!"in".equalsIgnoreCase(normalize(webhook.getTransferType()))) {
            log.warn("Rejected SePay webhook {} because transferType is not inbound: {}",
                    webhook.getId(), webhook.getTransferType());
            throw new AppException(PaymentErrorCode.INVALID_WEBHOOK);
        }

        if (webhook.getTransferAmount().compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Rejected SePay webhook {} because transferAmount is not positive: {}",
                    webhook.getId(), webhook.getTransferAmount());
            throw new AppException(PaymentErrorCode.INVALID_WEBHOOK);
        }

        if (webhook.getTransferAmount().compareTo(paymentRequest.getAmount()) != 0) {
            log.warn("Rejected SePay webhook {} for payment {} due to amount mismatch. Expected={}, actual={}",
                    webhook.getId(), paymentRequest.getPaymentCode(), paymentRequest.getAmount(), webhook.getTransferAmount());
            throw new AppException(PaymentErrorCode.AMOUNT_MISMATCH);
        }

        String expectedBankAccount = normalize(sepayConfig.getBankAccount());
        String actualBankAccount = normalize(webhook.getAccountNumber());
        if (!expectedBankAccount.isBlank() && !actualBankAccount.isBlank()
                && !expectedBankAccount.equals(actualBankAccount)) {
            log.warn("Rejected SePay webhook {} for payment {} due to bank account mismatch. Expected={}, actual={}",
                    webhook.getId(), paymentRequest.getPaymentCode(), expectedBankAccount, actualBankAccount);
            throw new AppException(PaymentErrorCode.INVALID_WEBHOOK);
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private LocalDateTime parseTransactionDate(String dateStr) {
        if (dateStr == null) return null;
        try {
            return LocalDateTime.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        } catch (Exception e) {
            return null;
        }
    }

    @Transactional
    public void mockPaymentSuccess(UUID userId, UUID paymentId) {
        if (!mockEnabled) throw new AppException(PaymentErrorCode.MOCK_PAYMENT_DISABLED);
        PaymentRequest paymentRequest = paymentRequestRepository.findByIdAndUserId(paymentId, userId)
                .orElseThrow(() -> new AppException(PaymentErrorCode.PAYMENT_NOT_FOUND));

        if ("VNPAY".equals(paymentRequest.getProvider())) throw new AppException(PaymentErrorCode.MOCK_PAYMENT_DISABLED);
        if (paymentRequest.getStatus() == PaymentStatus.COMPLETED) {
            return;
        }

        paymentRequest.setStatus(PaymentStatus.COMPLETED);
        paymentRequest.setPaidAt(LocalDateTime.now());
        paymentRequestRepository.save(paymentRequest);

        OrderPaymentSummaryResponse order = getInternalOrderPaymentSummary(paymentRequest.getOrderId());
        createProviderPayouts(paymentRequest, order);

        try {
            orderClient.notifyPaymentSuccess(paymentRequest.getOrderId());
        } catch (Exception e) {
            log.error("Failed to notify order service for mock payment success", e);
        }
    }

    public OrderPaymentSummaryResponse getInternalOrderPaymentSummary(UUID orderId) {
        try {
            ApiResponse<OrderPaymentSummaryResponse> response = orderClient.getPaymentSummary(orderId);
            OrderPaymentSummaryResponse order = response == null ? null : response.getData();
            if (order == null || order.getOrderId() == null || order.getTotalAmount() == null) {
                throw new AppException(PaymentErrorCode.INVALID_ORDER_FOR_PAYMENT);
            }
            validateProviderBreakdowns(order);
            return order;
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Cannot load provider breakdowns for order {}", orderId, e);
            throw new AppException(PaymentErrorCode.INVALID_ORDER_FOR_PAYMENT);
        }
    }

    @Transactional
    public void completeVnpayPayment(PaymentRequest payment, OrderPaymentSummaryResponse order, LocalDateTime paidAt) {
        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setPaidAt(paidAt);
        paymentRequestRepository.save(payment);
        createProviderPayouts(payment, order);
        notificationRepository.save(PaymentOrderNotification.builder().orderId(payment.getOrderId())
                .successful(true).createdAt(LocalDateTime.now(VnpayService.ZONE)).build());
    }

    @Transactional
    public void reviewVnpayPayment(UUID orderId) {
        var candidate = paymentRequestRepository.findByOrderId(orderId).orElseThrow();
        var payment = paymentRequestRepository.findByIdForUpdate(candidate.getId()).orElseThrow();
        payment.setStatus(PaymentStatus.PAID_REVIEW);
        for (var payout : hostPayoutRepository.findByOrderId(orderId)) {
            if (payout.getStatus() != PayoutStatus.PAID) payout.setStatus(PayoutStatus.CANCELLED);
        }
        log.warn("VNPAY payment for order {} requires manual review; order cannot be fulfilled", orderId);
    }

    private void validateProviderBreakdowns(OrderPaymentSummaryResponse order) {
        if (order.getProviderBreakdowns() == null || order.getProviderBreakdowns().isEmpty()) {
            throw new AppException(PaymentErrorCode.INVALID_ORDER_FOR_PAYMENT);
        }

        BigDecimal breakdownTotal = order.getProviderBreakdowns().stream()
                .map(OrderPaymentSummaryResponse.ProviderBreakdown::getTotalAmount)
                .filter(amount -> amount != null && amount.compareTo(BigDecimal.ZERO) > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (breakdownTotal.compareTo(order.getTotalAmount()) != 0) {
            throw new AppException(PaymentErrorCode.INVALID_ORDER_FOR_PAYMENT);
        }

        boolean hasInvalidProvider = order.getProviderBreakdowns().stream()
                .anyMatch(item -> item.getHostId() == null
                        || item.getTotalAmount() == null
                        || item.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0);
        if (hasInvalidProvider) {
            throw new AppException(PaymentErrorCode.INVALID_ORDER_FOR_PAYMENT);
        }
    }

    private UUID resolvePaymentRequestHostId(OrderPaymentSummaryResponse order) {
        if (order.getHostId() != null) {
            return order.getHostId();
        }

        validateProviderBreakdowns(order);
        return order.getProviderBreakdowns().get(0).getHostId();
    }

    private void createProviderPayouts(PaymentRequest paymentRequest, OrderPaymentSummaryResponse order) {
        validateProviderBreakdowns(order);

        for (OrderPaymentSummaryResponse.ProviderBreakdown breakdown : order.getProviderBreakdowns()) {
            if (hostPayoutRepository.existsByOrderIdAndHostId(paymentRequest.getOrderId(), breakdown.getHostId())) {
                continue;
            }

            BigDecimal providerTotal = breakdown.getTotalAmount();
            BigDecimal commissionRate = getCurrentCommissionRate();
            BigDecimal commissionAmount = providerTotal.multiply(commissionRate);
            BigDecimal hostAmount = providerTotal.subtract(commissionAmount);

            HostPayout payout = HostPayout.builder()
                    .paymentRequestId(paymentRequest.getId())
                    .orderId(paymentRequest.getOrderId())
                    .hostId(breakdown.getHostId())
                    .totalAmount(providerTotal)
                    .commissionRate(commissionRate)
                    .commissionAmount(commissionAmount)
                    .hostAmount(hostAmount)
                    .status(PayoutStatus.PENDING)
                    .build();
            hostPayoutRepository.save(payout);
        }
    }

    private BigDecimal getCurrentCommissionRate() {
        return commissionConfigRepository.findById(DEFAULT_COMMISSION_CONFIG_ID)
                .map(CommissionConfig::getRate)
                .filter(rate -> rate != null && rate.compareTo(BigDecimal.ZERO) >= 0)
                .orElse(DEFAULT_COMMISSION_RATE);
    }
}
