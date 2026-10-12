package com.GoTravel.CartandOrder.configuration;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class InternalFeignConfig {

    @Bean
    public RequestInterceptor internalServiceTokenRequestInterceptor(
            @Value("${internal.service.token:}") String internalServiceToken
    ) {
        return requestTemplate -> {
            if (!isInternalPath(requestTemplate.path()) && !isCommunicationPath(requestTemplate.path())) {
                return;
            }

            String token = internalServiceToken == null ? "" : internalServiceToken.trim();
            if (!token.isEmpty()) requestTemplate.header(InternalServiceTokenFilter.HEADER_NAME, token);
            String path = requestTemplate.path();
            boolean scopedPath = path.contains("/transport") || path.contains("/internal/car/staff");
            if(scopedPath) {
                String target = path.contains("/internal/car/") ? "car" :
                        path.contains("/internal/inventory/") ? "inventory" :
                        path.contains("/internal/payments/") ? "payment" :
                        path.contains("/communications/") ? "communication" :
                        path.contains("/internal/catalog/") ? "catalog" : "cart";
                String json = System.getenv("TRANSPORT_INTERNAL_TOKENS");
                if (json != null && !json.isBlank()) {
                    try {
                        var tokens = new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);
                        String scopedToken = tokens.path(target).asText("");
                        if (scopedToken.length() < 32) throw new IllegalStateException("Missing transport destination credential");
                        requestTemplate.removeHeader(InternalServiceTokenFilter.HEADER_NAME);
                        requestTemplate.header(InternalServiceTokenFilter.HEADER_NAME, scopedToken);
                        requestTemplate.header("X-Internal-Caller", "cart");
                    } catch (java.io.IOException invalid) { throw new IllegalStateException("Invalid transport credential configuration"); }
                }
            }
        };
    }

    private boolean isInternalPath(String path) {
        if (path == null || path.isBlank()) {
            return false;
        }

        String normalizedPath = path.startsWith("/") ? path : "/" + path;
        return normalizedPath.equals("/api/v1/internal") || normalizedPath.startsWith("/api/v1/internal/");
    }

    private boolean isCommunicationPath(String path) {
        if (path == null || path.isBlank()) {
            return false;
        }

        String normalizedPath = path.startsWith("/") ? path : "/" + path;
        return normalizedPath.equals("/api/v1/communications") || normalizedPath.startsWith("/api/v1/communications/");
    }
}
