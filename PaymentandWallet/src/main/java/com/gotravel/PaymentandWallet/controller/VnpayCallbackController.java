package com.gotravel.PaymentandWallet.controller;

import com.gotravel.PaymentandWallet.dto.response.*;
import com.gotravel.PaymentandWallet.exeption.AppException;
import com.gotravel.PaymentandWallet.exeption.PaymentErrorCode;
import com.gotravel.PaymentandWallet.service.VnpayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/public/payments/vnpay")
@RequiredArgsConstructor
@Slf4j
public class VnpayCallbackController {
    private final VnpayService service;

    @GetMapping("/ipn")
    public ResponseEntity<Map<String, String>> ipn(@RequestParam MultiValueMap<String, String> params) {
        try {
            return ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore())
                    .body(service.handleIpn(singleParams(params)));
        } catch (Exception e) {
            // Transaction rolled back; 99 asks VNPAY to retry. Never acknowledge an uncommitted result.
            log.warn("VNPAY IPN was not committed ({})", e.getClass().getSimpleName());
            return ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore())
                    .body(VnpayService.ack("99", "Unable to process callback"));
        }
    }

    @GetMapping("/return")
    public ResponseEntity<ApiResponse<VnpayReturnResponse>> result(@RequestParam MultiValueMap<String, String> params) {
        return ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore())
                .body(ApiResponse.success(service.getReturnResult(singleParams(params))));
    }

    private Map<String, String> singleParams(MultiValueMap<String, String> params) {
        var result = new LinkedHashMap<String, String>();
        if (params.size() > 40) throw new AppException(PaymentErrorCode.INVALID_VNPAY_CALLBACK);
        params.forEach((key, values) -> {
            if (values.size() != 1 || key.length() > 64 || values.get(0).length() > 2048)
                throw new AppException(PaymentErrorCode.INVALID_VNPAY_CALLBACK);
            result.put(key, values.get(0));
        });
        return result;
    }
}
