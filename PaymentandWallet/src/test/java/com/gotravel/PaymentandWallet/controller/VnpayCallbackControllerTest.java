package com.gotravel.PaymentandWallet.controller;

import com.gotravel.PaymentandWallet.service.VnpayService;
import org.junit.jupiter.api.Test;
import org.springframework.util.LinkedMultiValueMap;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class VnpayCallbackControllerTest {
    @Test
    void duplicateParametersAreRejectedBeforeProcessing() {
        var service = mock(VnpayService.class);
        var controller = new VnpayCallbackController(service);
        var params = new LinkedMultiValueMap<String, String>();
        params.add("vnp_Amount", "10000"); params.add("vnp_Amount", "1");
        assertThat(controller.ipn(params).getBody()).containsEntry("RspCode", "99");
        assertThatThrownBy(() -> controller.result(params)).isInstanceOf(RuntimeException.class);
        verifyNoInteractions(service);
    }

    @Test
    void uncommittedIpnReturnsProviderRetryResponseAtHttp200() {
        var service = mock(VnpayService.class);
        when(service.handleIpn(anyMap())).thenThrow(new IllegalStateException("test rollback"));
        var response = new VnpayCallbackController(service).ipn(new LinkedMultiValueMap<>());
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).containsEntry("RspCode", "99");
        assertThat(response.getHeaders().getCacheControl()).isEqualTo("no-store");
    }
}
