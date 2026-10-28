package com.gotravel.PaymentandWallet.configuration;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "sepay")
@Getter
@Setter
public class SepayConfig {
    private boolean refundEnabled;
    private String refundBankAccountId = "";
    private String bankAccount;
    private String bankName;
    private String apiToken;
    private String webhookAuthMode = "HMAC_SHA256";
    private String webhookSecret;
    private long webhookToleranceSeconds = 300;
}
