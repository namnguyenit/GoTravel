package com.Listing.CatalogandListing.service;

import com.Listing.CatalogandListing.client.InventoryClient;
import com.Listing.CatalogandListing.dto.request.listing.SaveListingRequest;
import com.Listing.CatalogandListing.entity.Listing;
import com.Listing.CatalogandListing.entity.attributes.StayAttributes;
import com.Listing.CatalogandListing.enums.ListingCategory;
import com.Listing.CatalogandListing.enums.ListingStatus;
import com.Listing.CatalogandListing.enums.PriceUnit;
import com.Listing.CatalogandListing.enums.SubCategory;
import com.Listing.CatalogandListing.mapper.ListingMapper;
import com.Listing.CatalogandListing.repository.ComplexRepository;
import com.Listing.CatalogandListing.repository.ListingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.Listing.CatalogandListing.client.IdentityClient;
import com.Listing.CatalogandListing.dto.response.IdentityApiResponse;
import com.Listing.CatalogandListing.dto.response.UserStatusResponse;
import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ListingServiceTest {

    @Mock
    ListingMapper listingMapper;

    @Mock
    ListingRepository listingRepository;

    @Mock
    ComplexRepository complexRepository;

    @Mock
    InventoryClient inventoryClient;
    
    @Mock
    private IdentityClient identityClient; 

    @Test
    void createListingStartsAsPendingForAdminReview() {
        UUID hostId = UUID.randomUUID();
        SaveListingRequest request = SaveListingRequest.builder()
                .category(ListingCategory.STAY)
                .subCategory(SubCategory.NONE)
                .title("Villa da lat")
                .province("Lam Dong")
                .basePrice(BigDecimal.valueOf(1_000_000))
                .priceUnit(PriceUnit.PER_NIGHT)
                .latitude(11.9404)
                .longitude(108.4583)
                .attributes(new StayAttributes())
                .build();
        Listing mappedListing = Listing.builder()
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .build();

        when(listingMapper.toEntity(request)).thenReturn(mappedListing);
        when(listingRepository.save(any(Listing.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(identityClient.checkUserStatus(hostId.toString())).thenReturn(
                new IdentityApiResponse<>(true, 200, null, null,
                        UserStatusResponse.builder()
                                .isAllowed(true)
                                .hostApprovalStatus("APPROVED")
                                .build())
        );

        ListingService service = new ListingService(
                listingMapper,
                listingRepository,
                complexRepository,
                inventoryClient,
                identityClient
        );

        service.createListing(hostId.toString(), request);
        verify(identityClient).checkUserStatus(hostId.toString());

        ArgumentCaptor<Listing> listingCaptor = ArgumentCaptor.forClass(Listing.class);
        verify(listingRepository).save(listingCaptor.capture());
        Listing savedListing = listingCaptor.getValue();
        assertThat(savedListing.getHostId()).isEqualTo(hostId);
        assertThat(savedListing.getStatus()).isEqualTo(ListingStatus.PENDING);
        assertThat(savedListing.getLocation()).isNotNull();
        assertThat(savedListing.getLocation().getSRID()).isEqualTo(4326);
    }
}
