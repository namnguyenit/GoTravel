package com.Listing.CatalogandListing.entity.attributes;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import lombok.Data;
import java.util.List;

@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.PROPERTY,
    property = "categoryType"
)
@JsonSubTypes({
    @JsonSubTypes.Type(value = StayAttributes.class, name = "STAY"),
    @JsonSubTypes.Type(value = ExpAttributes.class, name = "EXP"),
    @JsonSubTypes.Type(value = PhotographyAttributes.class, name = "SVC_PHOTOGRAPHY"),
    @JsonSubTypes.Type(value = ChefAttributes.class, name = "SVC_CHEF"),
    @JsonSubTypes.Type(value = MassageAttributes.class, name = "SVC_MASSAGE"),
    @JsonSubTypes.Type(value = PreparedMealsAttributes.class, name = "SVC_PREPARED_MEALS"),
    @JsonSubTypes.Type(value = TrainingAttributes.class, name = "SVC_TRAINING"),
    @JsonSubTypes.Type(value = MakeupAttributes.class, name = "SVC_MAKEUP"),
    @JsonSubTypes.Type(value = HairStylingAttributes.class, name = "SVC_HAIR_STYLING"),
    @JsonSubTypes.Type(value = SpaAttributes.class, name = "SVC_SPA"),
    @JsonSubTypes.Type(value = CateringAttributes.class, name = "SVC_CATERING"),
    @JsonSubTypes.Type(value = TransportAttributes.class, name = "TRANSPORT")
})
@Data
public abstract class BaseListingAttributes {
    private List<String> galleryUrls;
}
