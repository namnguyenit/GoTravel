package com.GoTravel.CartandOrder.transport;

import com.GoTravel.CartandOrder.entity.Order;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CancellationPolicyTest {
    private CancellationPolicy policy() {
        var policy = new CancellationPolicy();
        ReflectionTestUtils.setField(policy, "version", "test-v1");
        ReflectionTestUtils.setField(policy, "fullRefundHours", 24);
        ReflectionTestUtils.setField(policy, "partialRefundHours", 6);
        ReflectionTestUtils.setField(policy, "partialFeeRate", new BigDecimal("0.10"));
        return policy;
    }

    @Test
    void usesSnapshotAndExactVndFeeAtTenHours() {
        var policy = policy();
        var order = Order.builder().totalAmount(new BigDecimal("125001")).build();
        policy.snapshot(order, Instant.now().plus(10, ChronoUnit.HOURS));
        var quote = policy.quote(order);
        assertThat(quote.fee()).isEqualByComparingTo("12500");
        assertThat(quote.refundDue()).isEqualByComparingTo("112501");
        assertThat(quote.policyVersion()).isEqualTo("test-v1");
    }

    @Test
    void blocksSelfCancellationCloseToDeparture() {
        var policy = policy();
        var order = Order.builder().totalAmount(new BigDecimal("250000")).build();
        policy.snapshot(order, Instant.now().plus(5, ChronoUnit.HOURS));
        assertThatThrownBy(() -> policy.quote(order)).hasMessageContaining("hỗ trợ");
    }
}
