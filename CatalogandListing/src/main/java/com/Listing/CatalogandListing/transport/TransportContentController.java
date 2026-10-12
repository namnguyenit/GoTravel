package com.Listing.CatalogandListing.transport;

import com.Listing.CatalogandListing.dto.response.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/catalog/transport/offers")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('TICKET_VENDOR')")
public class TransportContentController {
    private final TransportOfferService service;
    public record Content(@NotBlank @Size(max=200) String title,
                          @NotBlank @Size(max=10000) String description,
                          @Size(max=1000) String thumbnailUrl) {}
    @PutMapping("/{listingId}/content")
    public ApiResponse<TransportOfferService.OfferResult> update(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID listingId, @RequestBody @Valid Content content) {
        return ApiResponse.success(service.updateContent(UUID.fromString(jwt.getSubject()), listingId, new TransportOfferService.ContentUpdate(content.title(), content.description(), content.thumbnailUrl())));
    }
}
