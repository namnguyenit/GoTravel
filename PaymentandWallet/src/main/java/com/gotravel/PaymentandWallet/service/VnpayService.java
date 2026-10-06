package com.gotravel.PaymentandWallet.service;

import com.gotravel.PaymentandWallet.configuration.VnpayConfig;
import com.gotravel.PaymentandWallet.dto.request.CreatePaymentRequest;
import com.gotravel.PaymentandWallet.dto.response.PaymentResponse;
import com.gotravel.PaymentandWallet.dto.response.VnpayReturnResponse;
import com.gotravel.PaymentandWallet.entity.PaymentRequest;
import com.gotravel.PaymentandWallet.entity.PaymentTransaction;
import com.gotravel.PaymentandWallet.entity.VnpayPaymentAttempt;
import com.gotravel.PaymentandWallet.enums.PaymentStatus;
import com.gotravel.PaymentandWallet.exeption.AppException;
import com.gotravel.PaymentandWallet.exeption.PaymentErrorCode;
import com.gotravel.PaymentandWallet.mapper.PaymentMapper;
import com.gotravel.PaymentandWallet.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.util.*;

@Service
@RequiredArgsConstructor
public class VnpayService {
    public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("uuuuMMddHHmmss")
            .withResolverStyle(ResolverStyle.STRICT);
    private final VnpayConfig config;
    private final VnpaySigner signer;
    private final PaymentService paymentService;
    private final PaymentRequestRepository payments;
    private final VnpayPaymentAttemptRepository attempts;
    private final PaymentTransactionRepository transactions;
    private final PaymentOrderNotificationRepository notifications;
    private final PaymentMapper mapper;
    private final jakarta.persistence.EntityManager entityManager;

    @Transactional
    public PaymentResponse createPayment(UUID userId, CreatePaymentRequest input, String clientIp) {
        config.requireEnabled();
        var response = paymentService.createPayment(userId, input);
        var payment = payments.findByIdForUpdate(response.getPaymentId())
                .orElseThrow(() -> new AppException(PaymentErrorCode.PAYMENT_NOT_FOUND));
        var now = LocalDateTime.now(ZONE).withNano(0);
        if (payment.getStatus() != PaymentStatus.PENDING || payment.getExpiresAt() == null
                || !payment.getExpiresAt().isAfter(now)) throw new AppException(PaymentErrorCode.PAYMENT_EXPIRED);
        // Migrate only unpaid legacy requests; never change completed historical transactions.
        payment.setProvider("VNPAY");
        payment.setQrUrl(null);
        payment.setBankName(null);
        payment.setBankAccount(null);
        var current = attempts.findFirstByPaymentRequestIdOrderByCreatedAtDesc(payment.getId()).orElse(null);
        if (current == null || !"CREATED".equals(current.getStatus())) {
            current = buildAttempt(payment, clientIp, now);
            attempts.save(current);
        }
        var result = mapper.toPaymentResponse(payment);
        result.setPaymentUrl(current.getPaymentUrl());
        return result;
    }

    private VnpayPaymentAttempt buildAttempt(PaymentRequest payment, String clientIp, LocalDateTime now) {
        UUID id = UUID.randomUUID();
        var fields = new TreeMap<String, String>();
        fields.put("vnp_Version", "2.1.0");
        fields.put("vnp_Command", "pay");
        fields.put("vnp_TmnCode", config.getTmnCode());
        fields.put("vnp_Amount", amountUnits(payment.getAmount()));
        fields.put("vnp_CurrCode", "VND");
        fields.put("vnp_TxnRef", id.toString().replace("-", ""));
        fields.put("vnp_OrderInfo", "Thanh toan don hang GoTravel " + payment.getOrderId());
        fields.put("vnp_OrderType", config.getOrderType());
        fields.put("vnp_Locale", config.getLocale());
        fields.put("vnp_IpAddr", clientIp);
        fields.put("vnp_ReturnUrl", config.getReturnUrl());
        fields.put("vnp_CreateDate", DATE.format(now));
        fields.put("vnp_ExpireDate", DATE.format(payment.getExpiresAt()));
        String url = config.getPaymentUrl() + "?" + signer.canonicalQuery(fields)
                + "&vnp_SecureHash=" + signer.sign(fields, config.getHashSecret());
        return VnpayPaymentAttempt.builder().id(id).paymentRequest(payment).txnRef(fields.get("vnp_TxnRef"))
                .tmnCode(config.getTmnCode()).amount(payment.getAmount()).paymentUrl(url).createdAt(now)
                .expiresAt(payment.getExpiresAt()).status("CREATED").build();
    }

    // Invalid callbacks must fail before any database lookup or state change.
    public boolean validSignature(Map<String, String> fields) {
        return config.isEnabled() && config.getTmnCode().equals(fields.get("vnp_TmnCode"))
                && signer.verify(fields, config.getHashSecret());
    }

    @Transactional
    public Map<String, String> handleIpn(Map<String, String> fields) {
        if (!validSignature(fields)) return ack("97", "Invalid signature");
        var candidate = attempts.findByTxnRef(fields.getOrDefault("vnp_TxnRef", "")).orElse(null);
        if (candidate == null) return ack("01", "Order not found");
        var payment = payments.findByIdForUpdate(candidate.getPaymentRequest().getId()).orElseThrow();
        // Refresh after acquiring the payment lock to see a concurrent IPN's committed result.
        var attempt = attempts.findByTxnRef(candidate.getTxnRef()).orElseThrow();
        entityManager.refresh(attempt);
        if (!validAmount(fields, attempt)) return ack("04", "Invalid amount");
        if (!validFields(fields, attempt)) return ack("99", "Invalid callback data");
        if (!"CREATED".equals(attempt.getStatus())) return ack("02", "Order already confirmed");

        String code = fields.get("vnp_ResponseCode");
        boolean successful = "00".equals(code) && "00".equals(fields.get("vnp_TransactionStatus"));
        boolean needsReview = "07".equals(code);
        attempt.setResponseCode(code);
        attempt.setTransactionStatus(fields.get("vnp_TransactionStatus"));
        attempt.setBankCode(fields.get("vnp_BankCode"));
        attempt.setProcessedAt(LocalDateTime.now(ZONE));
        if (!successful && !needsReview) {
            // A cancelled/failed attempt may be retried while the inventory reservation remains valid.
            attempt.setStatus("FAILED");
            attempts.save(attempt);
            return ack("00", "Confirm Success");
        }

        String transactionNo = fields.get("vnp_TransactionNo");
        if (attempts.existsByTransactionNo(transactionNo)) return ack("02", "Transaction already confirmed");
        var paidAt = LocalDateTime.parse(fields.get("vnp_PayDate"), DATE);
        var order = paymentService.getInternalOrderPaymentSummary(payment.getOrderId());
        if (order.getTotalAmount().compareTo(attempt.getAmount()) != 0
                || !payment.getOrderId().equals(order.getOrderId())) return ack("04", "Invalid amount");
        var now = LocalDateTime.now(ZONE);
        needsReview |= payment.getStatus() != PaymentStatus.PENDING
                || !attempt.getExpiresAt().isAfter(paidAt)
                || !"PAYMENT_PENDING".equalsIgnoreCase(order.getStatus())
                || order.getExpiresAt() == null || !order.getExpiresAt().isAfter(now);
        attempt.setTransactionNo(transactionNo);
        attempt.setPaidAt(paidAt);
        attempt.setStatus(needsReview ? "REVIEW" : "SUCCEEDED");
        transactions.save(PaymentTransaction.builder().paymentRequest(payment).amount(attempt.getAmount())
                .gateway("VNPAY").referenceCode("VNPAY:" + transactionNo).content("VNPAY txnRef " + attempt.getTxnRef())
                .transactionDate(paidAt).build());
        if (needsReview) {
            payment.setStatus(PaymentStatus.PAID_REVIEW);
            payment.setPaidAt(paidAt);
            payments.save(payment);
        } else {
            paymentService.completeVnpayPayment(payment, order, paidAt);
        }
        attempts.save(attempt);
        return ack("00", "Confirm Success");
    }

    @Transactional(readOnly = true)
    public VnpayReturnResponse getReturnResult(Map<String, String> fields) {
        config.requireEnabled();
        if (!validSignature(fields)) throw new AppException(PaymentErrorCode.INVALID_VNPAY_CALLBACK);
        var attempt = attempts.findByTxnRef(fields.getOrDefault("vnp_TxnRef", ""))
                .orElseThrow(() -> new AppException(PaymentErrorCode.PAYMENT_NOT_FOUND));
        if (!validAmount(fields, attempt) || !validFields(fields, attempt))
            throw new AppException(PaymentErrorCode.INVALID_VNPAY_CALLBACK);
        var payment = attempt.getPaymentRequest();
        boolean orderConfirmed = notifications.findById(payment.getOrderId())
                .map(n -> n.isSuccessful() && n.getDeliveredAt() != null).orElse(false);
        String result = "PENDING";
        if (payment.getStatus() == PaymentStatus.PAID_REVIEW || "REVIEW".equals(attempt.getStatus())) result = "REVIEW";
        else if (payment.getStatus() == PaymentStatus.COMPLETED) result = orderConfirmed ? "SUCCESS" : "CONFIRMING";
        else if (!"00".equals(fields.get("vnp_ResponseCode")) || !"00".equals(fields.get("vnp_TransactionStatus")) || "FAILED".equals(attempt.getStatus())) result = "FAILED";
        else if (payment.getStatus() == PaymentStatus.EXPIRED) result = "EXPIRED";
        return new VnpayReturnResponse(payment.getOrderId(), payment.getId(), result,
                fields.get("vnp_ResponseCode"), config.getFrontendUrl(), orderConfirmed);
    }

    private boolean validAmount(Map<String, String> fields, VnpayPaymentAttempt attempt) {
        String amount = fields.getOrDefault("vnp_Amount", "");
        return attempt.getTmnCode().equals(fields.get("vnp_TmnCode")) && amount.matches("[0-9]{1,12}")
                && new BigDecimal(amount).compareTo(new BigDecimal(amountUnits(attempt.getAmount()))) == 0;
    }

    private boolean validFields(Map<String, String> fields, VnpayPaymentAttempt attempt) {
        if (!fields.getOrDefault("vnp_ResponseCode", "").matches("[0-9]{2}")
                || !fields.getOrDefault("vnp_TransactionStatus", "").matches("[0-9]{2}")) return false;
        if (!"00".equals(fields.get("vnp_ResponseCode")) && !"07".equals(fields.get("vnp_ResponseCode"))) return true;
        String number = fields.getOrDefault("vnp_TransactionNo", "");
        if (!number.matches("[1-9][0-9]{0,14}")) return false;
        try {
            var paid = LocalDateTime.parse(fields.getOrDefault("vnp_PayDate", ""), DATE);
            return !paid.isBefore(attempt.getCreatedAt().minusMinutes(1)) && !paid.isAfter(LocalDateTime.now(ZONE).plusMinutes(5));
        } catch (java.time.DateTimeException e) { return false; }
    }

    public static String amountUnits(BigDecimal amount) {
        try {
            if (amount == null || amount.signum() <= 0 || amount.stripTrailingZeros().scale() > 0) throw new ArithmeticException();
            String units = amount.multiply(new BigDecimal("100")).toBigIntegerExact().toString();
            if (units.length() > 12) throw new ArithmeticException();
            return units;
        } catch (ArithmeticException e) { throw new AppException(PaymentErrorCode.INVALID_ORDER_FOR_PAYMENT); }
    }

    public static Map<String, String> ack(String code, String message) {
        return Map.of("RspCode", code, "Message", message);
    }
}
