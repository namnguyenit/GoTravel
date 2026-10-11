package com.Listing.CatalogandListing.client;

import com.Listing.CatalogandListing.dto.response.IdentityApiResponse;
import com.Listing.CatalogandListing.dto.response.UserStatusResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.Listing.CatalogandListing.configuration.InternalFeignConfig;

@FeignClient(name = "identity-service", url = "${services.identity.url:http://localhost:8080}", configuration = InternalFeignConfig.class)
public interface IdentityClient {

    @GetMapping("/api/users/internal/{userId}/status")
    IdentityApiResponse<UserStatusResponse> checkUserStatus(@PathVariable("userId") String userId);
}
