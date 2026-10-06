package com.gotravel.PaymentandWallet.configuration;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class VnpayConfigTest {
    @Test
    void missingMerchantCannotBeEnabled() {
        var config = new VnpayConfig();
        assertThatThrownBy(config::requireEnabled).isInstanceOf(RuntimeException.class);
        config.setEnabled(true);
        assertThatThrownBy(config::validate).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectsUntrustedPaymentUrlOrRedirectCredentials() {
        var config = new VnpayConfig(); config.setEnabled(true); config.setTmnCode("TEST1234"); config.setHashSecret("test-only-secret");
        config.validate();
        config.setPaymentUrl("https://evil.example/paymentv2/vpcpay.html");
        assertThatThrownBy(config::validate).isInstanceOf(IllegalStateException.class);
        config.setPaymentUrl("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html");
        config.setReturnUrl("https://user:password@pay.trungcaodev.io.vn/vnpay/return");
        assertThatThrownBy(config::validate).isInstanceOf(IllegalStateException.class);
    }
}
