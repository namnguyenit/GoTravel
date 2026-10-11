package com.Listing.CatalogandListing.transport;

import com.Listing.CatalogandListing.dto.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/internal/catalog/transport-offers")
@RequiredArgsConstructor
public class TransportOfferController {
    private final TransportOfferService service;

    @PutMapping("/routes/{routeId}")
    public ResponseEntity<ApiResponse<TransportOfferService.OfferResult>> upsert(
            @PathVariable UUID routeId, @RequestBody @Valid TransportOfferService.OfferRequest request) {
        if (!routeId.equals(request.routeId())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Route ID không khớp");
        }
        return ResponseEntity.ok(ApiResponse.success(service.upsert(request)));
    }

    @GetMapping("/routes/{routeId}")
    public ResponseEntity<ApiResponse<TransportOfferService.OfferResult>> get(@PathVariable UUID routeId) {
        return ResponseEntity.ok(ApiResponse.success(service.getByRoute(routeId)));
    }
}
