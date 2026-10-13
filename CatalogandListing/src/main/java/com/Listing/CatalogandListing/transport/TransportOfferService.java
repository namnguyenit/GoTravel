package com.Listing.CatalogandListing.transport;

import com.Listing.CatalogandListing.client.IdentityClient;
import com.Listing.CatalogandListing.entity.Listing;
import com.Listing.CatalogandListing.entity.attributes.TransportAttributes;
import com.Listing.CatalogandListing.enums.ListingCategory;
import com.Listing.CatalogandListing.enums.ListingStatus;
import com.Listing.CatalogandListing.enums.PriceUnit;
import com.Listing.CatalogandListing.enums.SubCategory;
import com.Listing.CatalogandListing.repository.ListingRepository;
import com.Listing.CatalogandListing.util.GeometryUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransportOfferService {
    private final ListingRepository listings;
    private final IdentityClient identity;

    @Transactional
    public OfferResult upsert(OfferRequest request) {
        if (request.operatorId() == null || request.operatorUserId() == null || request.routeId() == null ||
                blank(request.origin()) || blank(request.destination()) ||
                request.fromPrice() == null || request.fromPrice().compareTo(BigDecimal.ZERO) <= 0 ||
                request.fromPrice().stripTrailingZeros().scale() > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transport offer không hợp lệ");
        }
        var userStatus = identity.checkUserStatus(request.operatorUserId().toString());
        if (userStatus == null || userStatus.getData() == null ||
                !Boolean.TRUE.equals(userStatus.getData().getIsAllowed()) ||
                !"APPROVED".equals(userStatus.getData().getTicketVendorApprovalStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nhà xe chưa được duyệt");
        }
        var existing = listings.findByTransportRouteId(request.routeId());
        Listing listing = existing.orElseGet(Listing::new);
        if (existing.isPresent() && (!request.operatorId().equals(listing.getTransportOperatorId()) ||
                !request.operatorUserId().equals(listing.getHostId()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tuyến đã thuộc nhà xe khác");
        }
        var attributes = new TransportAttributes();
        attributes.setOperatorId(request.operatorId());
        attributes.setRouteId(request.routeId());
        attributes.setOrigin(request.origin().trim());
        attributes.setDestination(request.destination().trim());

        listing.setHostId(request.operatorUserId());
        listing.setTransportOperatorId(request.operatorId());
        listing.setTransportRouteId(request.routeId());
        listing.setCategory(ListingCategory.TRANSPORT);
        listing.setSubCategory(SubCategory.NONE);
        if (existing.isEmpty()) listing.setTitle(request.origin().trim() + " – " + request.destination().trim());
        if (existing.isEmpty() || request.description() != null) listing.setDescription(request.description());
        listing.setProvince(request.province() == null || request.province().isBlank()
                ? request.origin().trim() : request.province().trim());
        listing.setBasePrice(request.fromPrice());
        listing.setPriceUnit(PriceUnit.PER_SEAT);
        listing.setLatitude(request.latitude());
        listing.setLongitude(request.longitude());
        listing.setLocation(GeometryUtil.createPoint(request.longitude(), request.latitude()));
        if (existing.isEmpty() || request.thumbnailUrl() != null) listing.setThumbnailUrl(request.thumbnailUrl());
        listing.setAttributes(attributes);
        if (existing.isEmpty()) {
            listing.setStatus(ListingStatus.ACTIVE);
            listing.setAverageRating(BigDecimal.ZERO);
            listing.setTotalReviews(0);
        }
        listing = listings.save(listing);
        return new OfferResult(listing.getId(), listing.getStatus().name());
    }

    @Transactional(readOnly = true)
    public java.util.List<UUID> activeRouteIds() {
        var routes = listings.findActiveTransportRouteIds();
        var owners = new java.util.HashMap<UUID, Boolean>();
        return routes.stream().filter(routeId -> {
            var listing = listings.findByTransportRouteId(routeId).orElseThrow();
            return owners.computeIfAbsent(listing.getHostId(), owner -> {
                var status = identity.checkUserStatus(owner.toString());
                if (status == null || status.getData() == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Identity không xác nhận được nhà xe");
                return Boolean.TRUE.equals(status.getData().getIsAllowed()) && "APPROVED".equals(status.getData().getTicketVendorApprovalStatus());
            });
        }).toList();
    }

    @Transactional(readOnly = true)
    public OfferResult getByRoute(UUID routeId) {
        Listing listing = listings.findByTransportRouteId(routeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa có offer cho tuyến"));
        return new OfferResult(listing.getId(), listing.getStatus().name());
    }

    @Transactional
    public OfferResult updateContent(UUID userId, UUID listingId, ContentUpdate content) {
        var account = identity.checkUserStatus(userId.toString());
        if (account == null || account.getData() == null ||
                !Boolean.TRUE.equals(account.getData().getIsAllowed()) ||
                !"APPROVED".equals(account.getData().getTicketVendorApprovalStatus()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nhà xe chưa được duyệt");
        Listing listing = listings.findById(listingId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (listing.getCategory() != ListingCategory.TRANSPORT || !userId.equals(listing.getHostId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if (content.thumbnailUrl() != null && !content.thumbnailUrl().isBlank()) {
            java.net.URI url;
            try { url = java.net.URI.create(content.thumbnailUrl()); }
            catch (Exception invalid) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL ảnh không hợp lệ"); }
            if (!"https".equalsIgnoreCase(url.getScheme()) || url.getHost() == null)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ảnh phải dùng URL HTTPS");
        }
        listing.setTitle(content.title().trim()); listing.setDescription(content.description().trim());
        listing.setThumbnailUrl(content.thumbnailUrl());
        // Content changes go through moderation. Suspension is never bypassed by editing.
        if (listing.getStatus() == ListingStatus.ACTIVE) listing.setStatus(ListingStatus.PENDING);
        listings.save(listing);
        return new OfferResult(listing.getId(), listing.getStatus().name());
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    public record ContentUpdate(String title, String description, String thumbnailUrl) {}

    public record OfferRequest(
            UUID operatorId, UUID operatorUserId, UUID routeId,
            String origin, String destination, String province,
            String description, BigDecimal fromPrice,
            Double latitude, Double longitude, String thumbnailUrl
    ) {}
    public record OfferResult(UUID listingId, String status) {}
}
