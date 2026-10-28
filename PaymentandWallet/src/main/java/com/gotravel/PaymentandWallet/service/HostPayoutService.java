package com.gotravel.PaymentandWallet.service;

import com.gotravel.PaymentandWallet.dto.request.UpdateCommissionConfigRequest;
import com.gotravel.PaymentandWallet.dto.response.AdminPaymentSummaryResponse;
import com.gotravel.PaymentandWallet.dto.response.AdminRevenueReportResponse;
import com.gotravel.PaymentandWallet.dto.response.CommissionConfigResponse;
import com.gotravel.PaymentandWallet.dto.response.HostPayoutResponse;
import com.gotravel.PaymentandWallet.entity.CommissionConfig;
import com.gotravel.PaymentandWallet.entity.HostPayout;
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
import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Service quản lý việc chi trả cho Host (chủ dịch vụ).
 * Sau khi khách thanh toán, GoStay giữ 5% hoa hồng và ghi nhận 95% cần trả cho Host.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HostPayoutService {

    private final HostPayoutRepository hostPayoutRepository;
    private final CommissionConfigRepository commissionConfigRepository;
    private final PaymentRequestRepository paymentRequestRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PaymentMapper paymentMapper;
    private final com.gotravel.PaymentandWallet.transport.application.TransportSettlementService transportSettlement;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    private HostPayout lockTransportPayout(UUID id) {
        var candidate=hostPayoutRepository.findById(id).orElseThrow(()->new AppException(PaymentErrorCode.PAYMENT_NOT_FOUND));
        if(!"TRANSPORT".equals(candidate.getProviderType()))throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"Khoản chi không thuộc GoTicket.");
        jdbc.query("select pg_advisory_xact_lock(hashtextextended(?,0))",rs->null,candidate.getOrderId().toString());
        return hostPayoutRepository.findByIdForUpdate(id).orElseThrow();
    }
    private static final String DEFAULT_COMMISSION_CONFIG_ID = "DEFAULT";
    private static final BigDecimal DEFAULT_COMMISSION_RATE = new BigDecimal("0.05");

    /**
     * Host xem danh sách các khoản tiền sẽ nhận (phân trang).
     */
    @Transactional(readOnly = true)
    public Page<HostPayoutResponse> getPayoutsByHost(UUID hostId, Pageable pageable) {
        return hostPayoutRepository.findByHostIdOrderByCreatedAtDesc(hostId, pageable)
                .map(paymentMapper::toHostPayoutResponse);
    }

    @Transactional(readOnly = true)
    public Page<HostPayoutResponse> getAllPayouts(Pageable pageable) {
        return hostPayoutRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(paymentMapper::toHostPayoutResponse);
    }

    @Transactional(readOnly = true)
    public Page<HostPayoutResponse> getAllPayouts(Pageable pageable, String providerType) {
        if (providerType == null || providerType.isBlank()) return getAllPayouts(pageable);
        String type = providerType.trim().toUpperCase(java.util.Locale.ROOT);
        if (!java.util.List.of("HOST", "TRANSPORT").contains(type))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Loại nhà cung cấp không hợp lệ");
        var bounded = org.springframework.data.domain.PageRequest.of(Math.max(0, pageable.getPageNumber()), Math.min(100, Math.max(1, pageable.getPageSize())));
        return hostPayoutRepository.findByProviderTypeOrderByCreatedAtDesc(type, bounded).map(paymentMapper::toHostPayoutResponse);
    }

    @Transactional(readOnly = true)
    public Page<HostPayoutResponse> getFilteredPayouts(Pageable pageable, String providerType, String status, UUID hostId) {
        String type=providerType==null||providerType.isBlank()?null:providerType.trim().toUpperCase(java.util.Locale.ROOT);
        if(type!=null&&!List.of("HOST","TRANSPORT").contains(type))throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Loại nhà cung cấp không hợp lệ");
        if(type==null&&(status==null||status.isBlank())&&hostId==null)return getAllPayouts(pageable);
        PayoutStatus selected=null;
        if(status!=null&&!status.isBlank())try{selected=PayoutStatus.valueOf(status.trim().toUpperCase(java.util.Locale.ROOT));}
        catch(IllegalArgumentException invalid){throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Trạng thái quyết toán không hợp lệ");}
        var bounded=org.springframework.data.domain.PageRequest.of(Math.max(0,pageable.getPageNumber()),Math.min(100,Math.max(1,pageable.getPageSize())),org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC,"createdAt").and(org.springframework.data.domain.Sort.by("id")));
        return hostPayoutRepository.findFiltered(type,selected,hostId,bounded).map(paymentMapper::toHostPayoutResponse);
    }

    @Transactional(readOnly = true)
    public AdminPaymentSummaryResponse getAdminSummary() {
        return AdminPaymentSummaryResponse.builder()
                .totalPaymentRequests(paymentRequestRepository.count())
                .pendingPayments(paymentRequestRepository.countByStatus(PaymentStatus.PENDING))
                .completedPayments(paymentRequestRepository.countByStatus(PaymentStatus.COMPLETED))
                .failedPayments(paymentRequestRepository.countByStatus(PaymentStatus.FAILED))
                .expiredPayments(paymentRequestRepository.countByStatus(PaymentStatus.EXPIRED))
                .totalRequestedAmount(paymentRequestRepository.sumAmount())
                .completedPaymentAmount(paymentRequestRepository.sumAmountByStatus(PaymentStatus.COMPLETED))
                .totalTransactionAmount(paymentTransactionRepository.sumAmount())
                .totalPayouts(hostPayoutRepository.count())
                .pendingPayouts(hostPayoutRepository.countByStatus(PayoutStatus.PENDING))
                .requestedPayouts(hostPayoutRepository.countByStatus(PayoutStatus.REQUESTED))
                .paidPayouts(hostPayoutRepository.countByStatus(PayoutStatus.PAID))
                .cancelledPayouts(hostPayoutRepository.countByStatus(PayoutStatus.CANCELLED))
                .totalPayoutAmount(hostPayoutRepository.sumTotalAmount())
                .totalHostAmount(hostPayoutRepository.sumHostAmount())
                .totalCommissionAmount(hostPayoutRepository.sumCommissionAmount())
                .pendingHostAmount(hostPayoutRepository.sumHostAmountByStatus(PayoutStatus.PENDING))
                .requestedHostAmount(hostPayoutRepository.sumHostAmountByStatus(PayoutStatus.REQUESTED))
                .paidHostAmount(hostPayoutRepository.sumHostAmountByStatus(PayoutStatus.PAID))
                .paidCommissionAmount(hostPayoutRepository.sumCommissionAmountByStatus(PayoutStatus.PAID))
                .build();
    }

    @Transactional(readOnly = true)
    public AdminRevenueReportResponse getRevenueReport(LocalDate startDate, LocalDate endDate) {
        LocalDate safeStart = startDate != null ? startDate : LocalDate.now().minusDays(29);
        LocalDate safeEnd = endDate != null ? endDate : LocalDate.now();
        if (safeEnd.isBefore(safeStart)) {
            LocalDate tmp = safeStart;
            safeStart = safeEnd;
            safeEnd = tmp;
        }

        List<Object[]> rows = hostPayoutRepository.getDailyRevenueReport(
                safeStart.atStartOfDay(),
                safeEnd.plusDays(1).atStartOfDay()
        );

        BigDecimal totalAmount = BigDecimal.ZERO;
        BigDecimal hostAmount = BigDecimal.ZERO;
        BigDecimal commissionAmount = BigDecimal.ZERO;
        long payoutCount = 0;
        List<AdminRevenueReportResponse.DailyRevenue> daily = new ArrayList<>();

        for (Object[] row : rows) {
            LocalDate date = toLocalDate(row[0]);
            BigDecimal rowTotal = toBigDecimal(row[1]);
            BigDecimal rowHost = toBigDecimal(row[2]);
            BigDecimal rowCommission = toBigDecimal(row[3]);
            long rowCount = ((Number) row[4]).longValue();

            totalAmount = totalAmount.add(rowTotal);
            hostAmount = hostAmount.add(rowHost);
            commissionAmount = commissionAmount.add(rowCommission);
            payoutCount += rowCount;

            daily.add(AdminRevenueReportResponse.DailyRevenue.builder()
                    .date(date)
                    .totalAmount(rowTotal)
                    .hostAmount(rowHost)
                    .commissionAmount(rowCommission)
                    .payoutCount(rowCount)
                    .build());
        }

        return AdminRevenueReportResponse.builder()
                .startDate(safeStart)
                .endDate(safeEnd)
                .totalAmount(totalAmount)
                .hostAmount(hostAmount)
                .commissionAmount(commissionAmount)
                .payoutCount(payoutCount)
                .daily(daily)
                .build();
    }

    @Transactional(readOnly = true)
    public CommissionConfigResponse getCommissionConfig() {
        CommissionConfig config = getOrCreateDefaultCommissionConfig();
        return toCommissionConfigResponse(config);
    }

    @Transactional
    public CommissionConfigResponse updateCommissionConfig(UUID adminId, UpdateCommissionConfigRequest request) {
        CommissionConfig config = getOrCreateDefaultCommissionConfig();
        config.setRate(request.getRate());
        config.setReason(request.getReason());
        config.setUpdatedBy(adminId);
        return toCommissionConfigResponse(commissionConfigRepository.save(config));
    }

    @Transactional
    public void markAsPaid(UUID payoutId) {
        HostPayout payout = hostPayoutRepository.findById(payoutId)
                .orElseThrow(() -> new AppException(PaymentErrorCode.PAYMENT_NOT_FOUND));

        if("TRANSPORT".equals(payout.getProviderType()))throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"Dùng API transport mark-paid kèm chứng cứ và net payable");
        payout.setStatus(PayoutStatus.PAID);
        payout.setPaidAt(LocalDateTime.now());
        hostPayoutRepository.save(payout);

        log.info("Payout {} marked as PAID. Host {} receives {}", payoutId, payout.getHostId(), payout.getHostAmount());
    }

    private void applyNet(HostPayout payout) {
        var net=transportSettlement.prepare(payout);
        payout.setTotalAmount(net.gross());payout.setCommissionAmount(net.commission());payout.setHostAmount(net.payable());
    }

    @Transactional
    public HostPayoutResponse requestTransportWithdrawal(UUID payoutId,UUID ownerId) {
        var payout=lockTransportPayout(payoutId);
        if(!ownerId.equals(payout.getHostId()) || !"TRANSPORT".equals(payout.getProviderType()) || !List.of(PayoutStatus.PENDING,PayoutStatus.REQUESTED).contains(payout.getStatus()))throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT);
        applyNet(payout);payout.setStatus(PayoutStatus.REQUESTED);
        return paymentMapper.toHostPayoutResponse(hostPayoutRepository.save(payout));
    }

    @Transactional
    public HostPayoutResponse prepareTransportPayout(UUID payoutId) {
        var payout = lockTransportPayout(payoutId);
        if (!"TRANSPORT".equals(payout.getProviderType()) || payout.getStatus() != PayoutStatus.REQUESTED)
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                    "Chỉ đối chiếu khoản chi nhà xe đã yêu cầu rút");
        applyNet(payout);
        return paymentMapper.toHostPayoutResponse(hostPayoutRepository.save(payout));
    }

    @Transactional
    public void markTransportPaid(UUID payoutId,UUID actorId,BigDecimal amount,String reference,String evidence) {
        HostPayout payout=lockTransportPayout(payoutId);
        if(!"TRANSPORT".equals(payout.getProviderType()) || payout.getStatus()==PayoutStatus.CANCELLED)throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT);
        if(!List.of(PayoutStatus.REQUESTED,PayoutStatus.PAID).contains(payout.getStatus()))throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"Nhà xe cần gửi yêu cầu rút trước khi ghi nhận chi trả.");
        if(payout.getStatus()!=PayoutStatus.PAID)applyNet(payout);
        transportSettlement.proof(payout,actorId,amount,reference,evidence);
        if(payout.getStatus()!=PayoutStatus.PAID){payout.setStatus(PayoutStatus.PAID);payout.setPaidAt(LocalDateTime.now());hostPayoutRepository.save(payout);}
    }

    private LocalDate toLocalDate(Object value) {
        if (value instanceof Date sqlDate) return sqlDate.toLocalDate();
        if (value instanceof java.sql.Timestamp timestamp) return timestamp.toLocalDateTime().toLocalDate();
        if (value instanceof LocalDate localDate) return localDate;
        return LocalDate.parse(String.valueOf(value));
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value instanceof BigDecimal bigDecimal) return bigDecimal;
        if (value instanceof Number number) return BigDecimal.valueOf(number.doubleValue());
        return new BigDecimal(String.valueOf(value));
    }

    private CommissionConfig getOrCreateDefaultCommissionConfig() {
        return commissionConfigRepository.findById(DEFAULT_COMMISSION_CONFIG_ID)
                .orElseGet(() -> commissionConfigRepository.save(CommissionConfig.builder()
                        .id(DEFAULT_COMMISSION_CONFIG_ID)
                        .rate(DEFAULT_COMMISSION_RATE)
                        .reason("Default GoStay commission rate")
                        .build()));
    }

    private CommissionConfigResponse toCommissionConfigResponse(CommissionConfig config) {
        return CommissionConfigResponse.builder()
                .rate(config.getRate())
                .percent(config.getRate().multiply(BigDecimal.valueOf(100)))
                .updatedBy(config.getUpdatedBy())
                .reason(config.getReason())
                .updatedAt(config.getUpdatedAt())
                .build();
    }

    @Transactional
    public void markAllAsPaidByHost(UUID hostId) {
        java.util.List<HostPayout> payouts = hostPayoutRepository.findByHostIdOrderByCreatedAtDesc(hostId, Pageable.unpaged())
                .stream()
                .filter(p -> !"TRANSPORT".equals(p.getProviderType()) && (p.getStatus() == PayoutStatus.PENDING || p.getStatus() == PayoutStatus.REQUESTED))
                .toList();

        if (payouts.isEmpty()) {
            throw new AppException(PaymentErrorCode.PAYMENT_NOT_FOUND);
        }

        LocalDateTime now = LocalDateTime.now();
        // Transport transfers require an individual proof; a bulk mark cannot provide it.
        if(payouts.stream().anyMatch(p->"TRANSPORT".equals(p.getProviderType())))throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"Có payout vận tải; ghi chứng cứ từng khoản trước");
        for (HostPayout payout : payouts) {
            payout.setStatus(PayoutStatus.PAID);
            payout.setPaidAt(now);
            hostPayoutRepository.save(payout);
        }

        log.info("Marked {} payouts as PAID for Host {}", payouts.size(), hostId);
    }

    /**
     * Host yêu cầu rút tiền cho tất cả các khoản thu nhập đang PENDING.
     */
    @Transactional
    public void requestWithdrawal(UUID hostId) {
        java.util.List<HostPayout> pendingPayouts = hostPayoutRepository.findByHostIdOrderByCreatedAtDesc(hostId, Pageable.unpaged())
            .stream()
            .filter(p -> !"TRANSPORT".equals(p.getProviderType()) && p.getStatus() == PayoutStatus.PENDING)
            .toList();

        if (pendingPayouts.isEmpty()) {
            throw new AppException(PaymentErrorCode.INVALID_ORDER_FOR_PAYMENT);
        }

        for (HostPayout payout : pendingPayouts) {
            if("TRANSPORT".equals(payout.getProviderType()))applyNet(payout);
            payout.setStatus(PayoutStatus.REQUESTED);
            hostPayoutRepository.save(payout);
        }
        
        log.info("Host {} requested withdrawal for {} payouts", hostId, pendingPayouts.size());
    }
}
