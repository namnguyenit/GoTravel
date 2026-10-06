package com.gotravel.PaymentandWallet.configuration;

import com.gotravel.PaymentandWallet.exeption.AppException;
import com.gotravel.PaymentandWallet.exeption.PaymentErrorCode;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.net.URI;

@Component
@ConfigurationProperties(prefix = "vnpay")
@Getter
@Setter
public class VnpayConfig {
    private boolean enabled;
    private String tmnCode = "";
    private String hashSecret = "";
    private String paymentUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    private String returnUrl = "https://pay.trungcaodev.io.vn/vnpay/return";
    // Registered in the VNPAY merchant dashboard, not sent in the payment query.
    private String ipnUrl = "https://pay.trungcaodev.io.vn/api/v1/payments/vnpay/ipn";
    private String frontendUrl = "https://gotravel.trungcaodev.io.vn";
    private String locale = "vn";
    private String orderType = "other";
    private int timeoutMinutes = 15;

    @PostConstruct
    public void validate() {
        if (!enabled) return;
        if (!tmnCode.matches("[A-Za-z0-9]{8}") || hashSecret.isBlank()) {
            throw new IllegalStateException("Configure vnpay.tmn-code and vnpay.hash-secret before enabling VNPAY");
        }
        for (String value : new String[]{paymentUrl, returnUrl, ipnUrl, frontendUrl}) {
            URI uri = URI.create(value);
            if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                    || uri.getRawQuery() != null || uri.getFragment() != null) {
                throw new IllegalStateException("VNPAY URLs must be absolute HTTPS URLs without credentials or query strings");
            }
        }
        if (!java.util.Set.of("sandbox.vnpayment.vn", "pay.vnpay.vn").contains(URI.create(paymentUrl).getHost())
                || !"/paymentv2/vpcpay.html".equals(URI.create(paymentUrl).getPath())) {
            throw new IllegalStateException("Untrusted VNPAY payment hostname");
        }
        if (timeoutMinutes < 1 || timeoutMinutes > 15 || !java.util.Set.of("vn", "en").contains(locale)
                || !orderType.matches("[A-Za-z0-9]{1,100}")) {
            throw new IllegalStateException("Invalid VNPAY timeout, locale or order type");
        }
    }

    public void requireEnabled() {
        if (!enabled) throw new AppException(PaymentErrorCode.VNPAY_NOT_CONFIGURED);
    }
}
