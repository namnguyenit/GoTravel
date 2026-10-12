package com.gotravel.PaymentandWallet.dto.response;

import java.util.UUID;

public record VnpayReturnResponse(UUID orderId, UUID paymentId, String result, String responseCode,
                                  String frontendUrl, boolean orderConfirmed, String orderKind) {
    public VnpayReturnResponse(UUID orderId, UUID paymentId, String result, String responseCode,
                               String frontendUrl, boolean orderConfirmed) {
        this(orderId, paymentId, result, responseCode, frontendUrl, orderConfirmed, null);
    }
}
