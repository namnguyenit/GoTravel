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

    public Quote quote(Order order) {
        if (order.getTransportDepartureAt() == null || order.getTransportFullRefundHours() == null ||
                order.getTransportPartialRefundHours() == null || order.getTransportPartialFeeRate() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn chưa có chính sách hủy được chốt");
        }
        long minutes = Duration.between(LocalDateTime.now(VN_ZONE),
                order.getTransportDepartureAt()).toMinutes();
        if (minutes < (long) order.getTransportPartialRefundHours() * 60) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Gần giờ khởi hành; chuyển bộ phận hỗ trợ xử lý hủy");
        }
        BigDecimal fee = minutes >= (long) order.getTransportFullRefundHours() * 60
                ? BigDecimal.ZERO
                : order.getTotalAmount().multiply(order.getTransportPartialFeeRate())
                        .setScale(0, RoundingMode.HALF_UP);
        return new Quote(fee, order.getTotalAmount().subtract(fee), order.getTransportPolicyVersion());
    }

    public record Quote(BigDecimal fee, BigDecimal refundDue, String policyVersion) {}
}
