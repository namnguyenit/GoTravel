package com.gotravel.Identity.mapper;

import com.gotravel.Identity.dto.request.*;
import com.gotravel.Identity.dto.response.*;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import com.gotravel.Identity.entity.*;

@Mapper(componentModel = "spring")
public interface UserMapper {
    UserResponse userRequestToUserResponse(UserRequest userRequest);

    User userRequestToUser(UserRequest userRequest);

    @Mapping(target = "avatarUrl", source = "userProfile.avatarUrl")
    @Mapping(target = "hostProfile", expression = "java(user.getHostProfile() != null ? toHostProfileResponse(user.getHostProfile()) : null)")
    @Mapping(target = "enterpriseProfile", expression = "java(user.getEnterpriseProfile() != null ? toEnterpriseProfileResponse(user.getEnterpriseProfile()) : null)")
    @Mapping(target = "ticketVendorProfile", expression = "java(user.getTicketVendorProfile() != null ? toTicketVendorProfileResponse(user.getTicketVendorProfile()) : null)")
    UserResponse userToUserResponse(User user);

    UserProfileResponse toUserProfileResponse(UserProfile userProfile);

    void updateUserProfileFromRequest(UserProfileRequest dto, @MappingTarget UserProfile profile);

    @Mapping(target = "approvalStatus", expression = "java(hostProfile.getApprovalStatus() != null ? hostProfile.getApprovalStatus().toString() : null)")
    @Mapping(target = "avatarUrl", source = "avatar_url")
    @Mapping(target = "bankAccountName", source = "bankNameAccont")
    HostProfileResponse toHostProfileResponse(HostProfile hostProfile);

    @Mapping(target = "bankNameAccont", source = "bankAccountName")
    void updateHostProfileFromRequest(HostProfileRequest dto, @MappingTarget HostProfile profile);

    @Mapping(target = "approvalStatus", expression = "java(enterpriseProfile.getApprovalStatus() != null ? enterpriseProfile.getApprovalStatus().toString() : null)")
    EnterpriseProfileResponse toEnterpriseProfileResponse(EnterpriseProfile enterpriseProfile);

    void updateEnterpriseProfileFromRequest(EnterpriseProfileRequest dto, @MappingTarget EnterpriseProfile profile);

    @Mapping(target = "approvalStatus", expression = "java(profile.getApprovalStatus() != null ? profile.getApprovalStatus().toString() : null)")
    TicketVendorProfileResponse toTicketVendorProfileResponse(TicketVendorProfile profile);

    default String mapRoleString(Role role) {
        return role != null ? role.getName() : null;
    }
}
