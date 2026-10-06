package com.gotravel.PaymentandWallet.service;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;

class VnpaySignerTest {
    private final VnpaySigner signer = new VnpaySigner();

    @Test
    void signsSortedUrlEncodedParametersAndDetectsTampering() {
        var fields = new HashMap<>(Map.of("vnp_TxnRef", "ref1", "vnp_OrderInfo", "GoTravel booking: 1+2", "vnp_Amount", "12000000"));
        assertThat(signer.canonicalQuery(fields)).isEqualTo("vnp_Amount=12000000&vnp_OrderInfo=GoTravel+booking%3A+1%2B2&vnp_TxnRef=ref1");
        assertThat(signer.sign(fields, "test-only-secret")).isEqualTo("0dc5fe1fd1d77f6ef574b8751738fe881b49c97a280db60fcb4fd5390b6ad07c5d9cfb654589efa523de53ca215abf049e54276d62b02643c3c530130bf0c2bc");
        fields.put("vnp_SecureHash", signer.sign(fields, "test-only-secret"));
        assertThat(signer.verify(fields, "test-only-secret")).isTrue();
        assertThat(signer.verify(fields, "wrong-secret")).isFalse();
        fields.put("vnp_Amount", "100");
        assertThat(signer.verify(fields, "test-only-secret")).isFalse();
    }

    @Test
    void excludesHashMetadataAndRejectsMissingOrMalformedHashes() {
        var fields = new HashMap<>(Map.of("vnp_Amount", "10000", "vnp_SecureHashType", "HMACSHA512", "unrelated", "ignored"));
        assertThat(signer.canonicalQuery(fields)).isEqualTo("vnp_Amount=10000");
        assertThat(signer.verify(fields, "secret")).isFalse();
        fields.put("vnp_SecureHash", "not-a-hash");
        assertThat(signer.verify(fields, "secret")).isFalse();
        assertThat(signer.verify(fields, "")).isFalse();
    }

    @Test
    void usesExactVndAmountsWithoutFloatingPointOrTruncation() {
        assertThat(VnpayService.amountUnits(new BigDecimal("120000.00"))).isEqualTo("12000000");
        for (String invalid : new String[]{"0", "-1", "10.01", "10000000000"}) {
            assertThatThrownBy(() -> VnpayService.amountUnits(new BigDecimal(invalid))).isInstanceOf(RuntimeException.class);
        }
    }
}
