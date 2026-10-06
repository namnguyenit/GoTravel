package com.gotravel.PaymentandWallet.service;

import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Component
public class VnpaySigner {
    public String canonicalQuery(Map<String, String> fields) {
        return new TreeMap<>(fields).entrySet().stream()
                .filter(e -> e.getKey().startsWith("vnp_") && !e.getKey().equals("vnp_SecureHash")
                        && !e.getKey().equals("vnp_SecureHashType") && e.getValue() != null && !e.getValue().isEmpty())
                .map(e -> encode(e.getKey()) + "=" + encode(e.getValue()))
                .collect(Collectors.joining("&"));
    }

    public String sign(Map<String, String> fields, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            return HexFormat.of().formatHex(mac.doFinal(canonicalQuery(fields).getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException("Unable to initialize payment signature", e);
        }
    }

    public boolean verify(Map<String, String> fields, String secret) {
        String provided = fields.get("vnp_SecureHash");
        if (secret == null || secret.isBlank() || provided == null || !provided.matches("[a-fA-F0-9]{128}")) return false;
        return MessageDigest.isEqual(HexFormat.of().parseHex(sign(fields, secret)), HexFormat.of().parseHex(provided));
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
