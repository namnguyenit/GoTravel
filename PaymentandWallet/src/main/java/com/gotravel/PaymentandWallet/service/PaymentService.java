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
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
    private final JdbcTemplate jdbc;
    @Value("${transport.commission-rate:0.05}")
    private BigDecimal transportCommissionRate;
    @Value("${transport.commission-version:2026-10-v1}")
    private String transportCommissionVersion;
    @Value("${payment.mock-enabled:false}")
    private boolean mockEnabled;
    @Value("${payment.mock-demo-user-file:}")
    private String mockDemoUserFile;

    /** Narrow demo permission: only explicitly seeded buyers and transport orders. */
    private boolean demoMockAllowed(UUID userId, UUID orderId) {
        if (mockDemoUserFile == null || mockDemoUserFile.isBlank() || userId == null || orderId == null) return false;
        try {
            var path = java.nio.file.Path.of(mockDemoUserFile);
            if (!java.nio.file.Files.isRegularFile(path) || java.nio.file.Files.size(path) > 262144) return false;
            boolean listed;
            try (var lines = java.nio.file.Files.lines(path)) {
                listed = lines.anyMatch(line -> line.trim().equals(userId.toString()));
            }
            if (!listed) return false;
            var order = getInternalOrderPaymentSummary(orderId);
            return userId.equals(order.getUserId()) &&
                    ("GOCAR_TICKET".equals(order.getOrderKind()) || "GOCAR_EXCHANGE".equals(order.getOrderKind()));
        } catch (Exception unavailable) { return false; }
    }

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
                .orderKind(order.getOrderKind())
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
     * Creates the same durable payment request used by a real provider, but
     * marks it as MOCK so the test-only confirmation endpoint can complete it.
     * The feature flag is checked server-side; production cannot enable this
     * flow merely by changing a client request.
     */
    @Transactional
    public PaymentResponse createMockPayment(UUID userId, CreatePaymentRequest request) {
        if (!mockEnabled && !demoMockAllowed(userId, request.getOrderId())) throw new AppException(PaymentErrorCode.MOCK_PAYMENT_DISABLED);
        PaymentResponse created = createPayment(userId, request);
        PaymentRequest payment = paymentRequestRepository.findByIdForUpdate(created.getPaymentId())
                .orElseThrow(() -> new AppException(PaymentErrorCode.PAYMENT_NOT_FOUND));
        if (payment.getStatus() == PaymentStatus.PENDING) {
            payment.setProvider("MOCK");
            payment.setQrUrl(null);
            payment.setBankAccount(null);
            payment.setBankName(null);
            paymentRequestRepository.save(payment);
        }
        return paymentMapper.toPaymentResponse(payment);
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

        OrderPaymentSummaryResponse order = getInternalOrderPaymentSummary(paymentRequest.getOrderId());
        var receivedAt = parseTransactionDate(webhook.getTransactionDate());
        if (receivedAt == null) receivedAt = LocalDateTime.now(VnpayService.ZONE);
        boolean review = paymentRequest.getStatus() != PaymentStatus.PENDING ||
                paymentRequest.getExpiresAt() == null ||
                !paymentRequest.getExpiresAt().isAfter(receivedAt) ||
                !"PAYMENT_PENDING".equals(order.getStatus());
        paymentRequest.setStatus(review ? PaymentStatus.PAID_REVIEW : PaymentStatus.COMPLETED);
        paymentRequest.setPaidAt(receivedAt);
        paymentRequestRepository.save(paymentRequest);
        if (!review) createProviderPayouts(paymentRequest, order);

        log.info("Payment {} received for order {}. Review={}",
                paymentCode, paymentRequest.getOrderId(), review);

        if (!review || ("GOCAR_TICKET".equals(order.getOrderKind()) || "GOCAR_EXCHANGE".equals(order.getOrderKind()))) {
            notificationRepository.save(PaymentOrderNotification.builder().orderId(paymentRequest.getOrderId())
                    .successful(true).createdAt(LocalDateTime.now(VnpayService.ZONE)).build());
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

        if ("GOCAR_TICKET".equals(paymentRequest.getOrderKind()) || "GOCAR_EXCHANGE".equals(paymentRequest.getOrderKind())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Transport hoàn qua coordinator và chứng cứ thực tế");
        }
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

    @Transactional
    public void recordManualTransportRefund(UUID orderId, BigDecimal amount, String reference,
                                            String evidenceUrl, UUID recordedBy) {
        if (amount == null || amount.signum() <= 0 || amount.stripTrailingZeros().scale() > 0 ||
                reference == null || reference.isBlank() || reference.length() > 160 ||
                evidenceUrl == null || evidenceUrl.isBlank() || evidenceUrl.length() > 1000 ||
                recordedBy == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bằng chứng hoàn tiền không hợp lệ");
        }
        if (reference.trim().startsWith("AUTO-ORDER-SIM-REFUND-")) {
            var audit=jdbc.queryForList("select actor_id,amount,reference,evidence_url from transport_order_refund_simulations where order_id=?",orderId);
            if(audit.size()!=1||!recordedBy.equals(audit.get(0).get("actor_id"))||amount.compareTo((BigDecimal)audit.get(0).get("amount"))!=0||!reference.trim().equals(audit.get(0).get("reference"))||!evidenceUrl.trim().equals(audit.get(0).get("evidence_url")))throw new ResponseStatusException(HttpStatus.CONFLICT,"Thiếu hồ sơ mô phỏng đã xác thực.");
        }
        Integer itemAccounts=jdbc.queryForObject("select count(*) from transport_item_accounts where order_id=?",Integer.class,orderId);
        if(itemAccounts!=null&&itemAccounts>0)throw new ResponseStatusException(HttpStatus.CONFLICT,"Đơn đã phân bổ tiền theo item; dùng item refund coordinator");
        var candidate = paymentRequestRepository.findByOrderId(orderId)
                .orElseThrow(() -> new AppException(PaymentErrorCode.PAYMENT_NOT_FOUND));
        var payment = paymentRequestRepository.findByIdForUpdate(candidate.getId()).orElseThrow();
        var existing = jdbc.query("select amount,reference,evidence_url,recorded_by from transport_manual_refunds where order_id=?",
                (rs, row) -> new Object[]{rs.getBigDecimal(1), rs.getString(2), rs.getString(3),
                        rs.getObject(4, UUID.class)}, orderId).stream().findFirst().orElse(null);
        if (existing != null) {
            if (payment.getStatus() == PaymentStatus.REFUNDED &&
                    ((BigDecimal) existing[0]).compareTo(amount) == 0 &&
                    reference.equals(existing[1]) && evidenceUrl.equals(existing[2]) &&
                    recordedBy.equals(existing[3])) return;
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn đã có bằng chứng hoàn tiền khác");
        }
        var order = getInternalOrderPaymentSummary(orderId);
        if (!"GOCAR_TICKET".equals(order.getOrderKind()) ||
                !"REFUND_PENDING".equals(order.getStatus()) ||
                order.getTransportRefundDue() == null || order.getTransportCancellationFee() == null ||
                amount.compareTo(order.getTransportRefundDue()) != 0 ||
                amount.add(order.getTransportCancellationFee()).compareTo(payment.getAmount()) != 0 ||
                (payment.getStatus() != PaymentStatus.COMPLETED &&
                        payment.getStatus() != PaymentStatus.PAID_REVIEW)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Thanh toán chưa đủ điều kiện ghi nhận hoàn");
        }
        var payouts = hostPayoutRepository.findByOrderId(orderId);
        if (payouts.stream().anyMatch(p -> p.getStatus() == PayoutStatus.PAID)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Nhà xe đã được trả tiền; cần đối soát thủ công");
        }
        BigDecimal fee = order.getTransportCancellationFee();
        BigDecimal feeCommission = BigDecimal.ZERO;
        BigDecimal feeOperator = BigDecimal.ZERO;
        BigDecimal feeRate = BigDecimal.ZERO;
        if (fee.signum() > 0) {
            if (payouts.size() != 1 || !payouts.get(0).getHostId().equals(order.getHostId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Thiếu payout gốc để chia phí hủy");
            }
            feeRate = payouts.get(0).getCommissionRate();
            feeCommission = fee.multiply(feeRate).setScale(0, RoundingMode.HALF_UP);
            feeOperator = fee.subtract(feeCommission);
        }
        jdbc.update("insert into transport_manual_refunds(id,order_id,amount,fee_amount,fee_commission," +
                        "fee_operator_amount,reference,evidence_url,recorded_by) values (?,?,?,?,?,?,?,?,?)",
                UUID.randomUUID(), orderId, amount, fee, feeCommission, feeOperator,
                reference.trim(), evidenceUrl.trim(), recordedBy);
        for (var payout : payouts) payout.setStatus(PayoutStatus.CANCELLED);
        if (fee.signum() > 0) {
            hostPayoutRepository.save(HostPayout.builder()
                    .paymentRequestId(payment.getId())
                    .orderId(orderId)
                    .hostId(order.getHostId())
                    .providerType("TRANSPORT_FEE")
                    .totalAmount(fee)
                    .commissionRate(feeRate)
                    .commissionAmount(feeCommission)
                    .hostAmount(feeOperator)
                    .status(PayoutStatus.PENDING)
                    .build());
        }
        payment.setStatus(PaymentStatus.REFUNDED);
        paymentRequestRepository.save(payment);
    }

    public TransportCommission transportCommission() {
        var configured = commissionConfigRepository.findById("TRANSPORT");
        if (configured.isPresent()) {
            var value = configured.get();
            String version = value.getUpdatedAt() == null ? "transport-config-v1" :
                    "transport-" + value.getUpdatedAt().atZone(VnpayService.ZONE).toInstant().toEpochMilli();
            return new TransportCommission(version, value.getRate());
        }
        if (transportCommissionRate == null || transportCommissionRate.signum() < 0 ||
                transportCommissionRate.compareTo(BigDecimal.ONE) >= 0 ||
                transportCommissionVersion == null || transportCommissionVersion.isBlank()) {
            throw new IllegalStateException("Invalid transport commission configuration");
        }
        return new TransportCommission(transportCommissionVersion, transportCommissionRate);
    }

    public com.gotravel.PaymentandWallet.dto.response.CommissionConfigResponse getTransportCommissionConfig() {
        var configured = commissionConfigRepository.findById("TRANSPORT");
        var rate = transportCommission().rate();
        return com.gotravel.PaymentandWallet.dto.response.CommissionConfigResponse.builder()
                .rate(rate).percent(rate.multiply(BigDecimal.valueOf(100)))
                .reason(configured.map(CommissionConfig::getReason).orElse("Tỷ lệ mặc định của GoTicket"))
                .updatedBy(configured.map(CommissionConfig::getUpdatedBy).orElse(null))
                .updatedAt(configured.map(CommissionConfig::getUpdatedAt).orElse(null)).build();
    }

    @Transactional
    public com.gotravel.PaymentandWallet.dto.response.CommissionConfigResponse updateTransportCommissionConfig(
            UUID adminId, com.gotravel.PaymentandWallet.dto.request.UpdateCommissionConfigRequest request) {
        if (request.getRate() == null || request.getRate().signum() < 0 ||
                request.getRate().compareTo(new BigDecimal("0.5")) > 0 || request.getRate().stripTrailingZeros().scale() > 4 ||
                request.getReason() == null || request.getReason().isBlank() || request.getReason().trim().length() > 500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nhập tỷ lệ 0–50%, tối đa 2 chữ số thập phân và lý do tối đa 500 ký tự");
        var config = commissionConfigRepository.findById("TRANSPORT").orElseGet(() ->
                CommissionConfig.builder().id("TRANSPORT").build());
        config.setRate(request.getRate()); config.setReason(request.getReason().trim()); config.setUpdatedBy(adminId);
        commissionConfigRepository.saveAndFlush(config);
        return getTransportCommissionConfig();
    }

    public record CashSettlementRow(UUID shiftId, UUID operatorId, BigDecimal grossAmount,
            BigDecimal refundedAmount, BigDecimal commissionRate, BigDecimal commissionDue,
            BigDecimal commissionPaid, BigDecimal outstandingAmount, boolean paymentRecorded,
            java.time.OffsetDateTime recordedAt, boolean settlementSimulated, BigDecimal simulationAmount) {}

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<CashSettlementRow> cashSettlements(
            UUID operatorId, org.springframework.data.domain.Pageable pageable) {
        var page = org.springframework.data.domain.PageRequest.of(Math.max(0, pageable.getPageNumber()),
                Math.min(100, Math.max(1, pageable.getPageSize())));
        String from = """
            from transport_cash_settlements s
            left join (select shift_id,sum(refund_amount) amount,sum(commission_reversal) reversal
              from transport_cash_refund_adjustments group by shift_id) r on r.shift_id=s.shift_id
            left join (select a.shift_id,sum(a.amount) amount,sum(a.commission_reversal) reversal
              from transport_item_cash_refund_allocations a join transport_item_money_events e
              on e.operation_id=a.operation_id and e.kind='REFUND' group by a.shift_id) i on i.shift_id=s.shift_id
            left join (select shift_id,sum(amount) amount,count(*) entries from (
              select shift_id,amount from transport_cash_commission_payments
              union all select target_id,amount from transport_settlement_simulations where kind='CASH_COMMISSION'
            ) credits group by shift_id) p on p.shift_id=s.shift_id
            left join transport_settlement_simulations sim on sim.kind='CASH_COMMISSION' and sim.target_id=s.shift_id
            where (?::uuid is null or s.operator_id=?)
            """;
        String due = "round(s.gross_amount*s.commission_rate-coalesce(r.amount,0)*s.commission_rate-coalesce(i.reversal,0),0)";
        var rows = jdbc.query("select s.shift_id,s.operator_id,s.gross_amount,coalesce(r.amount,0)+coalesce(i.amount,0)," +
                "s.commission_rate," + due + ",coalesce(p.amount,0)," + due + "-coalesce(p.amount,0)," +
                "coalesce(p.entries,0)>0,s.recorded_at,sim.target_id is not null,coalesce(sim.amount,0) " + from + " order by s.recorded_at desc,s.shift_id limit ? offset ?",
                (rs,n) -> new CashSettlementRow(rs.getObject(1,UUID.class),rs.getObject(2,UUID.class),
                        rs.getBigDecimal(3),rs.getBigDecimal(4),rs.getBigDecimal(5),rs.getBigDecimal(6),
                        rs.getBigDecimal(7),rs.getBigDecimal(8),rs.getBoolean(9),rs.getObject(10,java.time.OffsetDateTime.class),rs.getBoolean(11),rs.getBigDecimal(12)),
                operatorId,operatorId,page.getPageSize(),page.getOffset());
        Long count=jdbc.queryForObject("select count(*) from transport_cash_settlements s where (?::uuid is null or s.operator_id=?)",Long.class,operatorId,operatorId);
        return new org.springframework.data.domain.PageImpl<>(rows,page,count==null?0:count);
    }

    public BigDecimal cashCommissionOutstanding(UUID shiftId) {
        return jdbc.queryForObject("""
          select round(s.gross_amount*s.commission_rate
            -coalesce((select sum(r.refund_amount*s.commission_rate) from transport_cash_refund_adjustments r where r.shift_id=s.shift_id),0)
            -coalesce((select sum(a.commission_reversal) from transport_item_cash_refund_allocations a join transport_item_money_events e on e.operation_id=a.operation_id and e.kind='REFUND' where a.shift_id=s.shift_id),0),0)
            -coalesce((select sum(p.amount) from transport_cash_commission_payments p where p.shift_id=s.shift_id),0)
            -coalesce((select sum(p.amount) from transport_settlement_simulations p where p.kind='CASH_COMMISSION' and p.target_id=s.shift_id),0)
          from transport_cash_settlements s where s.shift_id=?
          """,BigDecimal.class,shiftId);
    }

    public record TransportCommission(String version, BigDecimal rate) {}

    @Transactional
    public void recordCashSettlement(UUID pathShiftId, UUID shiftId, UUID operatorId,
                                     BigDecimal grossAmount, BigDecimal commissionDue,
                                     String commissionVersion, BigDecimal commissionRate) {
        if (pathShiftId == null || !pathShiftId.equals(shiftId) || operatorId == null ||
                grossAmount == null || grossAmount.signum() < 0 ||
                grossAmount.stripTrailingZeros().scale() > 0 ||
                commissionDue == null || commissionDue.signum() < 0 ||
                commissionVersion == null || commissionVersion.isBlank() ||
                commissionVersion.length() > 40 || commissionRate == null ||
                commissionRate.signum() < 0 || commissionRate.compareTo(BigDecimal.ONE) >= 0 ||
                grossAmount.multiply(commissionRate).setScale(0, RoundingMode.HALF_UP)
                        .compareTo(commissionDue) != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Báo cáo hoa hồng tiền mặt không hợp lệ");
        }
        var existing = jdbc.query("select operator_id,gross_amount,commission_due,commission_version,commission_rate " +
                        "from transport_cash_settlements where shift_id=?",
                (rs, row) -> new Object[]{rs.getObject(1, UUID.class), rs.getBigDecimal(2),
                        rs.getBigDecimal(3), rs.getString(4), rs.getBigDecimal(5)}, shiftId)
                .stream().findFirst().orElse(null);
        if (existing != null) {
            if (operatorId.equals(existing[0]) && ((BigDecimal) existing[1]).compareTo(grossAmount) == 0 &&
                    ((BigDecimal) existing[2]).compareTo(commissionDue) == 0 &&
                    commissionVersion.equals(existing[3]) &&
                    ((BigDecimal) existing[4]).compareTo(commissionRate) == 0) return;
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ca đã có báo cáo tiền mặt khác");
        }
        var adjustments = jdbc.query("select coalesce(sum(refund_amount),0),coalesce(sum(commission_reversal),0)," +
                        "count(*) filter (where operator_id<>? or commission_version<>? or commission_rate<>?) " +
                        "from transport_cash_refund_adjustments where shift_id=?",
                (rs, row) -> new Object[]{rs.getBigDecimal(1), rs.getBigDecimal(2), rs.getLong(3)},
                operatorId, commissionVersion, commissionRate, shiftId).get(0);
        if (((BigDecimal) adjustments[0]).compareTo(grossAmount) > 0 ||
                ((BigDecimal) adjustments[1]).compareTo(commissionDue) > 0 ||
                (long) adjustments[2] > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Hoàn tiền không khớp ca tiền mặt");
        }
        jdbc.update("insert into transport_cash_settlements(shift_id,operator_id,gross_amount,commission_due," +
                        "commission_version,commission_rate) values (?,?,?,?,?,?)",
                shiftId, operatorId, grossAmount, commissionDue, commissionVersion, commissionRate);
    }

    @Transactional
    public void recordCashRefundAdjustment(UUID pathOrderId, UUID orderId, UUID shiftId,
                                           UUID operatorId, BigDecimal refundAmount,
                                           BigDecimal commissionReversal, String commissionVersion,
                                           BigDecimal commissionRate) {
        if (pathOrderId == null || !pathOrderId.equals(orderId) || shiftId == null || operatorId == null ||
                refundAmount == null || refundAmount.signum() <= 0 ||
                refundAmount.stripTrailingZeros().scale() > 0 ||
                commissionReversal == null || commissionReversal.signum() < 0 ||
                commissionVersion == null || commissionVersion.isBlank() || commissionVersion.length() > 40 ||
                commissionRate == null || commissionRate.signum() < 0 ||
                commissionRate.compareTo(BigDecimal.ONE) >= 0 ||
                refundAmount.multiply(commissionRate).setScale(0, RoundingMode.HALF_UP)
                        .compareTo(commissionReversal) != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Điều chỉnh hoàn tiền mặt không hợp lệ");
        }
        var shift = jdbc.query("select operator_id,commission_version,commission_rate,gross_amount,commission_due " +
                        "from transport_cash_settlements where shift_id=?",
                (rs, row) -> new Object[]{rs.getObject(1, UUID.class), rs.getString(2), rs.getBigDecimal(3),
                        rs.getBigDecimal(4), rs.getBigDecimal(5)},
                shiftId).stream().findFirst().orElse(null);
        if (shift != null && (!operatorId.equals(shift[0]) || !commissionVersion.equals(shift[1]) ||
                ((BigDecimal) shift[2]).compareTo(commissionRate) != 0)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Điều chỉnh không khớp ca tiền mặt");
        }
        jdbc.update("insert into transport_cash_refund_adjustments(order_id,shift_id,operator_id,refund_amount," +
                        "commission_reversal,commission_version,commission_rate) values (?,?,?,?,?,?,?) " +
                        "on conflict (order_id) do nothing",
                orderId, shiftId, operatorId, refundAmount, commissionReversal,
                commissionVersion, commissionRate);
        var saved = jdbc.query("select shift_id,operator_id,refund_amount,commission_reversal," +
                        "commission_version,commission_rate from transport_cash_refund_adjustments where order_id=?",
                (rs, row) -> new Object[]{rs.getObject(1, UUID.class), rs.getObject(2, UUID.class),
                        rs.getBigDecimal(3), rs.getBigDecimal(4), rs.getString(5), rs.getBigDecimal(6)},
                orderId).get(0);
        if (!shiftId.equals(saved[0]) || !operatorId.equals(saved[1]) ||
                ((BigDecimal) saved[2]).compareTo(refundAmount) != 0 ||
                ((BigDecimal) saved[3]).compareTo(commissionReversal) != 0 ||
                !commissionVersion.equals(saved[4]) ||
                ((BigDecimal) saved[5]).compareTo(commissionRate) != 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn đã có điều chỉnh hoàn tiền khác");
        }
        if (shift != null) {
            var totals = jdbc.query("select coalesce(sum(refund_amount),0),coalesce(sum(commission_reversal),0) " +
                            "from transport_cash_refund_adjustments where shift_id=?",
                    (rs, row) -> new BigDecimal[]{rs.getBigDecimal(1), rs.getBigDecimal(2)}, shiftId).get(0);
            if (totals[0].compareTo((BigDecimal) shift[3]) > 0 ||
                    totals[1].compareTo((BigDecimal) shift[4]) > 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Tổng hoàn tiền vượt quá ca");
            }
        }
    }

    @Transactional(readOnly = true)
    public CashSettlementSummary cashSettlementSummary(UUID operatorId) {
        String where = operatorId == null ? "" : " where operator_id=?";
        Object[] args = operatorId == null ? new Object[]{} : new Object[]{operatorId};
        var base = jdbc.query("select count(*),coalesce(sum(gross_amount),0),coalesce(sum(commission_due),0) " +
                        "from transport_cash_settlements" + where,
                (rs, row) -> new Object[]{rs.getLong(1), rs.getBigDecimal(2), rs.getBigDecimal(3)}, args).get(0);
        var refunds = jdbc.query("select coalesce(sum(r.refund_amount),0),coalesce(sum(r.commission_reversal),0) " +
                        "from transport_cash_refund_adjustments r join transport_cash_settlements s on s.shift_id=r.shift_id" +
                        (operatorId == null ? "" : " where s.operator_id=?"),
                (rs, row) -> new BigDecimal[]{rs.getBigDecimal(1), rs.getBigDecimal(2)}, args).get(0);
        String itemWhere=operatorId==null?"":" and s.operator_id=?";
        var itemRefunds=jdbc.query("select coalesce(sum(a.amount),0),coalesce(sum(a.commission_reversal),0) from transport_item_cash_refund_allocations a join transport_item_money_events e on e.operation_id=a.operation_id and e.kind='REFUND' join transport_cash_settlements s on s.shift_id=a.shift_id where 1=1"+itemWhere,(rs,row)->new BigDecimal[]{rs.getBigDecimal(1),rs.getBigDecimal(2)},args).get(0);
        refunds[0]=refunds[0].add(itemRefunds[0]);refunds[1]=refunds[1].add(itemRefunds[1]);
        String paidWhere = operatorId == null ? "" : " where s.operator_id=?";
        BigDecimal paid = jdbc.queryForObject("select coalesce(sum(p.amount),0) " +
                        "from (select shift_id,amount from transport_cash_commission_payments union all select target_id,amount from transport_settlement_simulations where kind='CASH_COMMISSION') p " +
                        "join transport_cash_settlements s on s.shift_id=p.shift_id" + paidWhere,
                BigDecimal.class, args);
        BigDecimal due = jdbc.queryForObject("""
            select coalesce(sum(round(s.gross_amount*s.commission_rate
              -coalesce((select sum(r.refund_amount*s.commission_rate) from transport_cash_refund_adjustments r where r.shift_id=s.shift_id),0)
              -coalesce((select sum(a.commission_reversal) from transport_item_cash_refund_allocations a join transport_item_money_events e on e.operation_id=a.operation_id and e.kind='REFUND' where a.shift_id=s.shift_id),0),0)),0)
            from transport_cash_settlements s
            """ + (operatorId==null?"":" where s.operator_id=?"),BigDecimal.class,args);
        return new CashSettlementSummary((long) base[0], (BigDecimal) base[1], refunds[0],
                due, paid, due.subtract(paid));
    }

    public record CashSettlementSummary(long shifts, BigDecimal grossAmount, BigDecimal refundedAmount,
                                        BigDecimal commissionDue, BigDecimal commissionPaid,
                                        BigDecimal outstandingAmount) {}

    @Transactional
    public void recordCashCommissionPaid(UUID shiftId, BigDecimal amount, String reference,
                                         String evidenceUrl, UUID adminId) {
        if (shiftId == null || amount == null || amount.signum() < 0 ||
                amount.stripTrailingZeros().scale() > 0 || reference == null || reference.isBlank() ||
                reference.length() > 160 || evidenceUrl == null || evidenceUrl.isBlank() ||
                evidenceUrl.length() > 1000 || adminId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bằng chứng thu hoa hồng không hợp lệ");
        }
        var due = jdbc.query("select gross_amount*commission_rate from transport_cash_settlements where shift_id=? for update",
                (rs, row) -> rs.getBigDecimal(1), shiftId).stream().findFirst().orElse(null);
        var prior = jdbc.query("select amount,reference,evidence_url,recorded_by " +
                        "from transport_cash_commission_payments where shift_id=?",
                (rs, row) -> new Object[]{rs.getBigDecimal(1), rs.getString(2), rs.getString(3),
                        rs.getObject(4, UUID.class)}, shiftId).stream().findFirst().orElse(null);
        if (prior != null) {
            if (((BigDecimal) prior[0]).compareTo(amount) == 0 && reference.trim().equals(prior[1]) &&
                    evidenceUrl.trim().equals(prior[2]) && adminId.equals(prior[3])) return;
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ca đã có chứng từ nộp hoa hồng khác");
        }
        if(jdbc.queryForObject("select count(*) from transport_settlement_simulations where kind='CASH_COMMISSION' and target_id=?",Integer.class,shiftId)>0)throw new ResponseStatusException(HttpStatus.CONFLICT,"Ca đã ghi nhận nộp hoa hồng mô phỏng; không ghi thêm chứng từ trùng.");
        if(reference.trim().startsWith("SIM-CASH-COMMISSION-"))throw new ResponseStatusException(HttpStatus.CONFLICT,"Dùng chức năng mô phỏng để ghi nhận khoản nộp thử nghiệm.");
        BigDecimal reversal = jdbc.queryForObject("select coalesce(sum(r.refund_amount*s.commission_rate),0) from transport_cash_refund_adjustments r join transport_cash_settlements s on s.shift_id=r.shift_id where r.shift_id=?",BigDecimal.class,shiftId);
        BigDecimal itemReversal=jdbc.queryForObject("select coalesce(sum(a.commission_reversal),0) from transport_item_cash_refund_allocations a join transport_item_money_events e on e.operation_id=a.operation_id and e.kind='REFUND' where a.shift_id=?",BigDecimal.class,shiftId);
        reversal=reversal.add(itemReversal);
        if (due == null || due.subtract(reversal).setScale(0,RoundingMode.HALF_UP).compareTo(amount) != 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Số tiền hoa hồng không khớp ca sau hoàn tiền");
        }
        jdbc.update("insert into transport_cash_commission_payments(id,shift_id,amount,reference,evidence_url,recorded_by) " +
                        "values (?,?,?,?,?,?)", UUID.randomUUID(), shiftId, amount,
                reference.trim(), evidenceUrl.trim(), adminId);
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
        PaymentRequest paymentRequest = paymentRequestRepository.findByIdAndUserId(paymentId, userId)
                .orElseThrow(() -> new AppException(PaymentErrorCode.PAYMENT_NOT_FOUND));

        if (!mockEnabled && !demoMockAllowed(userId, paymentRequest.getOrderId())) throw new AppException(PaymentErrorCode.MOCK_PAYMENT_DISABLED);
        if (!"MOCK".equals(paymentRequest.getProvider())) throw new AppException(PaymentErrorCode.MOCK_PAYMENT_DISABLED);
        if (paymentRequest.getStatus() == PaymentStatus.COMPLETED) {
            return;
        }

        if (paymentRequest.getStatus() == PaymentStatus.REFUNDED) {
            throw new AppException(PaymentErrorCode.REFUND_NOT_ALLOWED);
        }

        OrderPaymentSummaryResponse order = getInternalOrderPaymentSummary(paymentRequest.getOrderId());
        var paidAt = LocalDateTime.now(VnpayService.ZONE);
        boolean review = paymentRequest.getStatus() != PaymentStatus.PENDING ||
                paymentRequest.getExpiresAt() == null || !paymentRequest.getExpiresAt().isAfter(paidAt) ||
                !"PAYMENT_PENDING".equals(order.getStatus());
        paymentRequest.setStatus(review ? PaymentStatus.PAID_REVIEW : PaymentStatus.COMPLETED);
        paymentRequest.setPaidAt(paidAt);
        paymentRequestRepository.save(paymentRequest);
        if (!review) createProviderPayouts(paymentRequest, order);

        if (!review || ("GOCAR_TICKET".equals(order.getOrderKind()) || "GOCAR_EXCHANGE".equals(order.getOrderKind()))) {
            notificationRepository.save(PaymentOrderNotification.builder().orderId(paymentRequest.getOrderId())
                    .successful(true).createdAt(LocalDateTime.now(VnpayService.ZONE)).build());
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
        if ("GOCAR_EXCHANGE".equals(order.getOrderKind())) return; // top-up stays in the item allocation ledger
        validateProviderBreakdowns(order);

        for (OrderPaymentSummaryResponse.ProviderBreakdown breakdown : order.getProviderBreakdowns()) {
            if (hostPayoutRepository.existsByOrderIdAndHostId(paymentRequest.getOrderId(), breakdown.getHostId())) {
                continue;
            }

            BigDecimal providerTotal = breakdown.getTotalAmount();
            boolean transport = "TRANSPORT".equals(order.getProviderType());
            BigDecimal commissionRate = transport ? transportCommission().rate() : getCurrentCommissionRate();
            if (commissionRate == null || commissionRate.signum() < 0 ||
                    commissionRate.compareTo(BigDecimal.ONE) >= 0) {
                throw new IllegalStateException("Invalid provider commission rate");
            }
            BigDecimal commissionAmount = providerTotal.multiply(commissionRate);
            if (transport) commissionAmount = commissionAmount.setScale(0, RoundingMode.HALF_UP);
            BigDecimal hostAmount = providerTotal.subtract(commissionAmount);

            HostPayout payout = HostPayout.builder()
                    .paymentRequestId(paymentRequest.getId())
                    .orderId(paymentRequest.getOrderId())
                    .hostId(breakdown.getHostId())
                    .providerType(transport ? "TRANSPORT" : "HOST")
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
