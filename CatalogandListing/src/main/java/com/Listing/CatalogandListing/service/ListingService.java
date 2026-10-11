package com.Listing.CatalogandListing.service;

import com.Listing.CatalogandListing.dto.request.listing.SaveListingRequest;
import com.Listing.CatalogandListing.dto.response.IdentityApiResponse;
import com.Listing.CatalogandListing.entity.Listing;
import com.Listing.CatalogandListing.enums.ListingStatus;
import com.Listing.CatalogandListing.exception.AppException;
import com.Listing.CatalogandListing.exception.ListingErrorCode;
import com.Listing.CatalogandListing.mapper.ListingMapper;
import com.Listing.CatalogandListing.repository.ListingRepository;
import com.Listing.CatalogandListing.repository.ComplexRepository;
import com.Listing.CatalogandListing.entity.Complex;
import com.Listing.CatalogandListing.dto.response.PaginationResponse;
import com.Listing.CatalogandListing.dto.response.ListingDetailResponse;
import com.Listing.CatalogandListing.dto.response.UserStatusResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.Listing.CatalogandListing.client.InventoryClient;
import com.Listing.CatalogandListing.dto.request.InitializeInventoryRequest;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

import java.util.UUID;
import com.Listing.CatalogandListing.enums.ListingCategory;
import com.Listing.CatalogandListing.enums.SubCategory;
import com.Listing.CatalogandListing.util.GeometryUtil;

@Service
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequiredArgsConstructor
@Slf4j
public class ListingService {

    ListingMapper listingMapper;
    ListingRepository listingRepository;
    ComplexRepository complexRepository;
    InventoryClient inventoryClient;
    com.Listing.CatalogandListing.client.IdentityClient identityClient;

    public PaginationResponse<ListingDetailResponse> getListingsByHost(String userId, int page, int size) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        Page<Listing> listingPage = listingRepository.findByHostId(UUID.fromString(userId), pageable);

        java.util.List<ListingDetailResponse> dtoList = listingPage.getContent()
                .stream()
                .map(listingMapper::toDetailResponse)
                .collect(java.util.stream.Collectors.toList());

        return PaginationResponse.<ListingDetailResponse>builder()
                .content(dtoList)
                .totalPages(listingPage.getTotalPages())
                .totalElements(listingPage.getTotalElements())
                .build();
    }

    public ListingDetailResponse getDetailListing(UUID id){
        Listing listing = listingRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ListingErrorCode.LISTING_NOT_FOUND));

        return listingMapper.toDetailResponse(listing);
    }

    public ListingDetailResponse getPublicDetailListing(UUID id){
        Listing listing = listingRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ListingErrorCode.LISTING_NOT_FOUND));

        if (listing.getStatus() != ListingStatus.ACTIVE) {
            throw new AppException(ListingErrorCode.LISTING_NOT_FOUND);
        }

        return listingMapper.toDetailResponse(listing);
    }

    public void createListing(String userId, SaveListingRequest request) {
        if (request.getCategory() == ListingCategory.TRANSPORT) {
            throw new AppException(ListingErrorCode.LISTING_ACCESS_DENIED);
        }
        ensureUserCanManageListings(userId);

        validateCategoryAndAttributes(request.getCategory(), request.getSubCategory(), request.getAttributes());
        Listing listing = listingMapper.toEntity(request);
        
        if (request.getComplexId() != null) {
            Complex complex = complexRepository.findById(request.getComplexId())
                    .orElseThrow(() -> new AppException(ListingErrorCode.COMPLEX_NOT_FOUND));
            
            if (!complex.getHostId().equals(UUID.fromString(userId))) {
                throw new AppException(ListingErrorCode.COMPLEX_ACCESS_DENIED);
            }
            
            listing.setComplex(complex);
            
            if (complex.getLatitude() != null && complex.getLongitude() != null &&
                listing.getLatitude() != null && listing.getLongitude() != null) {
                double distance = calculateDistance(
                        complex.getLatitude(), complex.getLongitude(),
                        listing.getLatitude(), listing.getLongitude()
                );
                if (distance > 3.0) {
                    throw new AppException(ListingErrorCode.LISTING_OUT_OF_RANGE);
                }
            }
        }

        listing.setHostId(UUID.fromString(userId));
        listing.setStatus(ListingStatus.PENDING);
        listing.setLocation(GeometryUtil.createPoint(listing.getLongitude(), listing.getLatitude()));
        listing = listingRepository.save(listing);
    }

    public void updateListing(UUID listingId, String userId, SaveListingRequest request) {
        if (request.getCategory() == ListingCategory.TRANSPORT) {
            throw new AppException(ListingErrorCode.LISTING_ACCESS_DENIED);
        }
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new com.Listing.CatalogandListing.exception.AppException(
                        com.Listing.CatalogandListing.exception.ListingErrorCode.LISTING_NOT_FOUND));

        if (!listing.getHostId().equals(UUID.fromString(userId))) {
            throw new com.Listing.CatalogandListing.exception.AppException(
                    com.Listing.CatalogandListing.exception.ListingErrorCode.LISTING_ACCESS_DENIED);
        }

        if (listing.getCategory() == ListingCategory.TRANSPORT) {
            throw new AppException(ListingErrorCode.LISTING_ACCESS_DENIED);
        }

        ensureUserCanManageListings(userId);

        validateCategoryAndAttributes(request.getCategory(), request.getSubCategory(), request.getAttributes());
        
        if (request.getComplexId() != null) {
            Complex complex = complexRepository.findById(request.getComplexId())
                    .orElseThrow(() -> new AppException(ListingErrorCode.COMPLEX_NOT_FOUND));
            
            if (!complex.getHostId().equals(UUID.fromString(userId))) {
                throw new AppException(ListingErrorCode.COMPLEX_ACCESS_DENIED);
            }
            
            listing.setComplex(complex);
            
            Double requestLat = request.getLatitude() != null ? request.getLatitude() : listing.getLatitude();
            Double requestLng = request.getLongitude() != null ? request.getLongitude() : listing.getLongitude();
            
            if (complex.getLatitude() != null && complex.getLongitude() != null &&
                requestLat != null && requestLng != null) {
                double distance = calculateDistance(
                        complex.getLatitude(), complex.getLongitude(),
                        requestLat, requestLng
                );
                if (distance > 3.0) {
                    throw new AppException(ListingErrorCode.LISTING_OUT_OF_RANGE);
                }
            }
        }

        listingMapper.updateEntityFromRequest(request, listing);
        listing.setLocation(GeometryUtil.createPoint(listing.getLongitude(), listing.getLatitude()));
        listingRepository.save(listing);
    }

    public void deleteListing(UUID listingId, String userId) {
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new com.Listing.CatalogandListing.exception.AppException(
                        com.Listing.CatalogandListing.exception.ListingErrorCode.LISTING_NOT_FOUND));

        if (!listing.getHostId().equals(UUID.fromString(userId))) {
            throw new com.Listing.CatalogandListing.exception.AppException(
                    com.Listing.CatalogandListing.exception.ListingErrorCode.LISTING_ACCESS_DENIED);
        }

        listing.setStatus(ListingStatus.DELETED);
        listingRepository.save(listing);
    }

    public PaginationResponse<ListingDetailResponse> getAllListings(String status, int page, int size) {
        return getAllListings(status, page, size, null);
    }

    public PaginationResponse<ListingDetailResponse> getAllListings(String status, int page, int size, String keyword) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        Page<Listing> listingPage;
        ListingStatus enumStatus = null;
        if (status != null && !status.isBlank()) {
            enumStatus = ListingStatus.valueOf(status.toUpperCase());
        }

        String cleanKeyword = keyword == null ? "" : keyword.trim();
        if (!cleanKeyword.isBlank()) {
            listingPage = listingRepository.searchForAdmin(enumStatus, cleanKeyword, pageable);
        } else if (enumStatus != null) {
            listingPage = listingRepository.findByStatus(enumStatus, pageable);
        } else {
            listingPage = listingRepository.findAll(pageable);
        }

        java.util.List<ListingDetailResponse> dtoList = listingPage.getContent()
                .stream()
                .map(listingMapper::toDetailResponse)
                .collect(java.util.stream.Collectors.toList());

        return PaginationResponse.<ListingDetailResponse>builder()
                .content(dtoList)
                .totalPages(listingPage.getTotalPages())
                .totalElements(listingPage.getTotalElements())
                .build();
    }

    public void changeListingStatus(UUID listingId, ListingStatus status) {
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new com.Listing.CatalogandListing.exception.AppException(
                        com.Listing.CatalogandListing.exception.ListingErrorCode.LISTING_NOT_FOUND));

        listing.setStatus(status);
        listingRepository.save(listing);
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Bán kính Trái Đất (km)
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private void ensureUserCanManageListings(String userId) {
        IdentityApiResponse<UserStatusResponse> userStatusResp = identityClient.checkUserStatus(userId);
        if (userStatusResp == null || userStatusResp.getData() == null) {
            throw new AppException(ListingErrorCode.LISTING_ACCESS_DENIED);
        }

        UserStatusResponse status = userStatusResp.getData();
        boolean approvedHost = "APPROVED".equals(status.getHostApprovalStatus());
        boolean approvedEnterprise = "APPROVED".equals(status.getEnterpriseApprovalStatus());
        if (!approvedHost && !approvedEnterprise) {
            throw new AppException(ListingErrorCode.LISTING_ACCESS_DENIED);
        }
    }

    private void validateCategoryAndAttributes(ListingCategory category, SubCategory subCategory, com.Listing.CatalogandListing.entity.attributes.BaseListingAttributes attributes) {
        if (category == null || subCategory == null || attributes == null) {
            throw new AppException(ListingErrorCode.INVALID_LISTING_DATA);
        }

        switch (category) {
            case STAY:
                if (subCategory != SubCategory.NONE || !(attributes instanceof com.Listing.CatalogandListing.entity.attributes.StayAttributes)) {
                    throw new AppException(ListingErrorCode.INVALID_CATEGORY_COMBINATION);
                }
                break;
            case EXP:
                if (subCategory != SubCategory.NONE || !(attributes instanceof com.Listing.CatalogandListing.entity.attributes.ExpAttributes)) {
                    throw new AppException(ListingErrorCode.INVALID_CATEGORY_COMBINATION);
                }
                break;
            case SVC:
                if (subCategory == SubCategory.NONE) {
                    throw new AppException(ListingErrorCode.INVALID_CATEGORY_COMBINATION);
                }
                boolean validAttr = false;
                switch (subCategory) {
                    case PHOTOGRAPHY: validAttr = attributes instanceof com.Listing.CatalogandListing.entity.attributes.PhotographyAttributes; break;
                    case CHEF: validAttr = attributes instanceof com.Listing.CatalogandListing.entity.attributes.ChefAttributes; break;
                    case MASSAGE: validAttr = attributes instanceof com.Listing.CatalogandListing.entity.attributes.MassageAttributes; break;
                    case PREPARED_MEALS: validAttr = attributes instanceof com.Listing.CatalogandListing.entity.attributes.PreparedMealsAttributes; break;
                    case TRAINING: validAttr = attributes instanceof com.Listing.CatalogandListing.entity.attributes.TrainingAttributes; break;
                    case MAKEUP: validAttr = attributes instanceof com.Listing.CatalogandListing.entity.attributes.MakeupAttributes; break;
                    case HAIR_STYLING: validAttr = attributes instanceof com.Listing.CatalogandListing.entity.attributes.HairStylingAttributes; break;
                    case SPA: validAttr = attributes instanceof com.Listing.CatalogandListing.entity.attributes.SpaAttributes; break;
                    case CATERING: validAttr = attributes instanceof com.Listing.CatalogandListing.entity.attributes.CateringAttributes; break;
                    default: break;
                }
                if (!validAttr) {
                    throw new AppException(ListingErrorCode.INVALID_CATEGORY_COMBINATION);
                }
                break;
            default:
                throw new AppException(ListingErrorCode.INVALID_CATEGORY_COMBINATION);
        }
    }
}
