package com.gotravel.Identity.configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

@Configuration
public class RsaKeyConfig {

    private final RSAPrivateKey privateKey;
    private final RSAPublicKey publicKey;
    private final String keyId;

    public RsaKeyConfig(
            @Value("${jwt.keystore.path}") String keyStorePath,
            @Value("${jwt.keystore.password}") String keyStorePassword,
            @Value("${jwt.keystore.alias}") String keyAlias,
            @Value("${jwt.keystore.private-key-password}") String privateKeyPassword,
            @Value("${jwt.key-id}") String keyId) {
        if (keyId == null || keyId.isBlank() || keyId.contains("${")) {
            throw new IllegalStateException("JWT_KEY_ID must be configured");
        }
        this.keyId = keyId;
        try {
            Path path = Path.of(keyStorePath);
            if (!path.isAbsolute() || !Files.isRegularFile(path)) {
                throw new IllegalStateException("JWT keystore must be an existing absolute file path");
            }
            KeyStore keyStore = KeyStore.getInstance("JKS");
            try (InputStream input = Files.newInputStream(path)) {
                keyStore.load(input, keyStorePassword.toCharArray());
            }

            this.privateKey = (RSAPrivateKey) keyStore.getKey(keyAlias, privateKeyPassword.toCharArray());
            this.publicKey = (RSAPublicKey) keyStore.getCertificate(keyAlias).getPublicKey();
        } catch (Exception e) {
            throw new IllegalStateException("Cannot load JWT signing keystore; Identity will not start", e);
        }
    }

    public RSAPrivateKey getPrivateKey() {
        return privateKey;
    }

    public RSAPublicKey getPublicKey() {
        return publicKey;
    }

    public String getKeyId() {
        return keyId;
    }
}
