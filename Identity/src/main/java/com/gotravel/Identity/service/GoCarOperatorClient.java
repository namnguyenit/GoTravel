package com.gotravel.Identity.service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.gotravel.Identity.entity.TicketVendorProfile;

@Service
public class GoCarOperatorClient {
    private final RestTemplate http = new RestTemplate();

    @Value("${gocar.service.url:http://127.0.0.1:3333}")
    private String baseUrl;

    @Value("${gocar.service.scoped-token:}")
    private String scopedToken;

    @Value("${internal.service.token:}")
    private String legacyToken;

    public void provision(String userId, TicketVendorProfile profile) {
        String token = scopedToken == null || scopedToken.isBlank() ? legacyToken : scopedToken;
        if (token == null || token.isBlank()) {
            throw new IllegalStateException("Chưa cấu hình token nội bộ Identity → GoCar");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-internal-service-token", token);
        if (scopedToken != null && !scopedToken.isBlank()) {
            headers.set("x-internal-caller", "identity");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("userId", userId);
        payload.put("companyName", profile.getCompanyName());
        payload.put("companyAddress", profile.getCompanyAddress());
        payload.put("contactPhone", profile.getContactPhone());
        payload.put("logoUrl", profile.getLogoUrl());

        try {
            http.postForEntity(
                    baseUrl + "/api/v1/internal/operators/provision",
                    new HttpEntity<>(payload, headers),
                    Map.class);
        } catch (RestClientException error) {
            throw new IllegalStateException("Không thể đồng bộ nhà xe sang GoCar", error);
        }
    }
}
