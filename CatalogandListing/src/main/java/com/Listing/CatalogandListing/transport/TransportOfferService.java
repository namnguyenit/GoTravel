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
        listing.setTitle(request.origin().trim() + " – " + request.destination().trim());
        listing.setDescription(request.description());
        listing.setProvince(request.province() == null || request.province().isBlank()
                ? request.origin().trim() : request.province().trim());
        listing.setBasePrice(request.fromPrice());
        listing.setPriceUnit(PriceUnit.PER_SEAT);
        listing.setLatitude(request.latitude());
        listing.setLongitude(request.longitude());
        listing.setLocation(GeometryUtil.createPoint(request.longitude(), request.latitude()));
        listing.setThumbnailUrl(request.thumbnailUrl());
        listing.setAttributes(attributes);
        if (existing.isEmpty()) {
            listing.setStatus(ListingStatus.PENDING);
            listing.setAverageRating(BigDecimal.ZERO);
            listing.setTotalReviews(0);
        }
        listing = listings.save(listing);
        return new OfferResult(listing.getId(), listing.getStatus().name());
    }

    @Transactional(readOnly = true)
    public OfferResult getByRoute(UUID routeId) {
        Listing listing = listings.findByTransportRouteId(routeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa có offer cho tuyến"));
        return new OfferResult(listing.getId(), listing.getStatus().name());
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    public record OfferRequest(
            UUID operatorId, UUID operatorUserId, UUID routeId,
            String origin, String destination, String province,
            String description, BigDecimal fromPrice,
            Double latitude, Double longitude, String thumbnailUrl
    ) {}
    public record OfferResult(UUID listingId, String status) {}
}
