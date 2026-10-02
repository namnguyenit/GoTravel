package com.gotravel.Identity.controller;

import com.gotravel.Identity.configuration.RsaKeyConfig;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// BƯỚC 4: TẠO API CHO CÁC SERVICE KHÁC LẤY PUBLIC KEY (JWKS endpoint - Chuẩn hóa Enterprise)
@RestController
public class JwksController {

    private final RsaKeyConfig rsaKeyConfig;

    public JwksController(RsaKeyConfig rsaKeyConfig) {
        this.rsaKeyConfig = rsaKeyConfig;
    }

    // Endpoint cố định theo chuẩn quốc tế OAuth2/OIDC.
    // Các framework từ các Microservice phía sau (Gateway, Resource server) sẽ gọi api này
    // mỗi khi nó mới khởi động.
    @GetMapping("/.well-known/jwks.json")
    public Map<String, Object> keys() {
        // Dùng thư viện Nimbus đóng gói sẵn thành chuẩn JSON Web Key xuất ra
        RSAKey rsaKey = new RSAKey.Builder(rsaKeyConfig.getPublicKey())
                .keyID(rsaKeyConfig.getKeyId())
                .build();
        JWKSet jwkSet = new JWKSet(rsaKey);
        
        return jwkSet.toJSONObject();
    }
}
