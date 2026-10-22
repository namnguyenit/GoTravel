package com.Gostay.BookingandInventory.configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.*;

import java.util.List;

@Configuration
public class JwtDecoderConfig {

    @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}")
    private String jwkSetUri;

    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();

        OAuth2TokenValidator<Jwt> audienceValidator = token -> {
            List<String> aud = token.getAudience();
            if (aud != null && aud.contains("gotravel-api")) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "The required audience is missing", null));
        };

        OAuth2TokenValidator<Jwt> issuerValidator = JwtValidators.createDefaultWithIssuer("com.gotravel.identity");

        OAuth2TokenValidator<Jwt> withIssuerAndAudience = new DelegatingOAuth2TokenValidator<>(
                issuerValidator, audienceValidator);

        jwtDecoder.setJwtValidator(withIssuerAndAudience);
        return jwtDecoder;
    }
}
