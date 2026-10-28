package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.entity.Order;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Component
public class CancellationPolicy {
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    @Value("${transport.cancellation.version:2026-10-v1}")
    private String version;
    @Value("${transport.cancellation.full-refund-hours:24}")
    private int fullRefundHours;
    @Value("${transport.cancellation.partial-refund-hours:6}")
    private int partialRefundHours;
    @Value("${transport.cancellation.partial-fee-rate:0.10}")
    private BigDecimal partialFeeRate;

    public void snapshot(Order order, java.time.Instant departureAt) {
        if (fullRefundHours <= partialRefundHours || partialRefundHours < 0 ||
                partialFeeRate.signum() < 0 || partialFeeRate.compareTo(BigDecimal.ONE) >= 0) {
            throw new IllegalStateException("Transport cancellation policy is invalid");
        }
        order.setTransportDepartureAt(LocalDateTime.ofInstant(departureAt, VN_ZONE));
        order.setTransportPolicyVersion(version);
        order.setTransportFullRefundHours(fullRefundHours);
        order.setTransportPartialRefundHours(partialRefundHours);
        order.setTransportPartialFeeRate(partialFeeRate);
    }

    public Quote quote(Order order) { return quoteAmount(order,order.getTransportDepartureAt(),order.getTotalAmount()); }
    public record Details(String version, int fullRefundMinutes, int refundCutoffMinutes, BigDecimal partialFeeRate) {}
    public Details current() { return new Details(version, Math.multiplyExact(fullRefundHours, 60), Math.multiplyExact(partialRefundHours, 60), partialFeeRate); }
    public Quote quoteAmount(Order order,LocalDateTime departureAt,BigDecimal amount) {
        if (departureAt == null || order.getTransportFullRefundHours() == null ||
                order.getTransportPartialRefundHours() == null || order.getTransportPartialFeeRate() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn chưa có chính sách hủy được chốt");
        }
        long minutes = Duration.between(LocalDateTime.now(VN_ZONE),
                departureAt).toMinutes();
        if (minutes < (long) order.getTransportPartialRefundHours() * 60) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Không thể tự hủy/đổi và hoàn tiền khi còn dưới " + ((long) order.getTransportPartialRefundHours() * 60) + " phút trước khởi hành. Vui lòng liên hệ bộ phận hỗ trợ.");
        }
        BigDecimal fee = minutes >= (long) order.getTransportFullRefundHours() * 60
                ? BigDecimal.ZERO
                : amount.multiply(order.getTransportPartialFeeRate())
                        .setScale(0, RoundingMode.HALF_UP);
        return new Quote(fee, amount.subtract(fee), order.getTransportPolicyVersion());
    }

    public record Quote(BigDecimal fee, BigDecimal refundDue, String policyVersion) {}
}
