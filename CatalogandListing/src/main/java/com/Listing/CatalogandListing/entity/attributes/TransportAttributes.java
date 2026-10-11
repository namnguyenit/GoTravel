package com.Listing.CatalogandListing.entity.attributes;

import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.UUID;

@Data
@EqualsAndHashCode(callSuper = true)
public class TransportAttributes extends BaseListingAttributes {
    private UUID operatorId;
    private UUID routeId;
    private String origin;
    private String destination;
}
