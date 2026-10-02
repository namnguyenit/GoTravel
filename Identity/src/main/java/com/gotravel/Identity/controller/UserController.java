package com.gotravel.Identity.controller;

import com.gotravel.Identity.dto.request.*;
import com.gotravel.Identity.dto.response.*;
import com.gotravel.Identity.exception.SuccessCode;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.gotravel.Identity.service.UserService;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class UserController {

    UserService userService;



    @PostMapping
    public ApiRequest<UserResponse> createUser(@RequestBody @Valid UserRequest user) {
        return ApiRequest.success(SuccessCode.USER_CREATED_SUCCESS, userService.createUser(user));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiRequest<PageResponse<UserResponse>> getAllUser(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword) {
        return ApiRequest.success(SuccessCode.GET_USERS_SUCCESS, userService.getAllUsers(page, size, keyword));
    }

    @GetMapping("/admin/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiRequest<AdminIdentitySummaryResponse> getAdminSummary() {
        return ApiRequest.success(SuccessCode.GET_USERS_SUCCESS, userService.getAdminSummary());
    }

    @GetMapping("/hosts")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiRequest<PageResponse<UserResponse>> getAllHostPending(
            @RequestParam(defaultValue = "PENDING") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiRequest.success(SuccessCode.GET_HOSTS_SUCCESS, userService.getHostsByStatus(page, size, status));
    }

    @GetMapping("/hosts/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiRequest<PageResponse<UserResponse>> getAllHosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiRequest.success(SuccessCode.GET_ALL_HOSTS_SUCCESS, userService.getAllHosts(page, size));
    }

    @GetMapping("/enterprises")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiRequest<PageResponse<UserResponse>> getAllEnterprisePending(
            @RequestParam(defaultValue = "PENDING") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiRequest.success(SuccessCode.GET_HOSTS_SUCCESS, userService.getEnterprisesByStatus(page, size, status));
    }

    @GetMapping("/enterprises/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiRequest<PageResponse<UserResponse>> getAllEnterprises(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiRequest.success(SuccessCode.GET_ALL_HOSTS_SUCCESS, userService.getAllEnterprises(page, size));
    }

    @GetMapping("/ticket-vendors")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiRequest<PageResponse<UserResponse>> getTicketVendorApplications(
            @RequestParam(defaultValue = "PENDING") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiRequest.success(SuccessCode.GET_USERS_SUCCESS,
                userService.getTicketVendorApplications(page, size, status));
    }

    @PutMapping("/ticket-vendors/{accountId}/approval")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiRequest<TicketVendorProfileResponse> reviewTicketVendorApplication(
            @PathVariable String accountId,
            @Valid @RequestBody ApprovalRequest request) {
        return ApiRequest.success(SuccessCode.APPROVAL_STATUS_UPDATED_SUCCESS,
                userService.reviewTicketVendorApplication(accountId, request));
    }


    @GetMapping("/hosts/{accountId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiRequest<HostDetailResponse> getHostDetail(@PathVariable String accountId) {
        return ApiRequest.success(SuccessCode.GET_HOST_DETAIL_SUCCESS, userService.getHostDetail(accountId));
    }

    @PutMapping("/{accountId}/approvalstatus")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiRequest<Void> approvalHostStatus(
            @RequestParam String type,
            @PathVariable String accountId,
            @RequestBody ApprovalRequest request) {
        userService.approvalHostStatus(accountId,type, request );
        return ApiRequest.<Void>builder()
                .success(true)
                .message("Đã cập nhật trạng thái phê duyệt thành " + request.getStatus())
                .code("APPROVAL_HOST_SUCCESS")
                .build();

    }

    @PutMapping("/accounts/{accountId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiRequest<Void> updateBanAccountStatus(
            @PathVariable String accountId,
            @RequestBody AccountStatusRequest request) {
        userService.updateBanAccountStatus(accountId, request);

        String message = "BANNED".equalsIgnoreCase(request.getStatus()) ? "Đã khóa tài khoản thành công" : "Đã mở khóa tài khoản thành công";
        return ApiRequest.<Void>builder()
                .success(true)
                .message(message)
                .code("UPDATE_ACCOUNT_STATUS_SUCCESS")
                .build();
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ApiRequest<UserResponse> getMyInfo() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info(SecurityContextHolder.getContext().getAuthentication().toString());
        return ApiRequest.success(SuccessCode.GET_MY_INFO_SUCCESS, userService.getUserById(userId));
    }

    @PutMapping("/me")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ApiRequest<UserResponse> updateMyInfo(@RequestBody UserUpdateRequest userUpdateRequest) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(SuccessCode.UPDATE_MY_INFO_SUCCESS, userService.updateUser(userId, userUpdateRequest));
    }

    @GetMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiRequest<UserResponse> getUserById(@PathVariable String id) {
        return ApiRequest.success(SuccessCode.GET_USERS_SUCCESS, userService.getUserById(id));
    }

    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiRequest<Void> deleteAccount(@PathVariable String id) {
        userService.deleteUser(id);
        return ApiRequest.<Void>builder()
                .success(true)
                .message("User deleted successfully")
                .build();
    }

    @PatchMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public  ApiRequest<Void> banAccount(@PathVariable String id){
        userService.banUser(id);
        return ApiRequest.<Void>builder()
                .success(true)
                .message("User Banned successfully")
                .build();
    }

    @PostMapping("/{id}/upgraderole")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiRequest<String> upgradeRole(@PathVariable String id,@RequestParam String role) {
        userService.upgradeToRole(id, role);
        return ApiRequest.success(SuccessCode.ROLE_UPGRADED_SUCCESS, role);
    }

    @PostMapping("/{id}/revokerole")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiRequest<String> revokeRole(@PathVariable String id, @RequestParam String role) {
        userService.revokeRole(id, role);
        return ApiRequest.success(SuccessCode.ROLE_REVOKED_SUCCESS, role);
    }

    @PostMapping(value = "/me/upgradetohost", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('USER')")
    public ApiRequest<ApprovalStatusResponse> upgradeToHost(
            @ModelAttribute HostProfileRequest hostProfileRequest,
            @RequestParam("frontImage") MultipartFile frontImage,
            @RequestParam("backImage") MultipartFile backImage) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(
                SuccessCode.APPLICATION_SUBMITTED_SUCCESS,
                userService.upgradeToHost(userId, hostProfileRequest, frontImage, backImage)
        );
    }

    @GetMapping("/me/upgrade-applications")
    @PreAuthorize("hasAnyRole('USER', 'HOST', 'ENTERPRISE')")
    public ApiRequest<UpgradeApplicationsResponse> getMyUpgradeApplications() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(SuccessCode.GET_USER_PROFILE_SUCCESS, userService.getMyUpgradeApplications(userId));
    }

    @PostMapping(value = "/me/ticket-vendor-application", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('USER')")
    public ApiRequest<TicketVendorProfileResponse> applyToTicketVendor(
            @Valid @ModelAttribute TicketVendorApplicationRequest request,
            @RequestParam("frontImage") MultipartFile frontImage,
            @RequestParam("backImage") MultipartFile backImage) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(SuccessCode.APPLICATION_SUBMITTED_SUCCESS,
                userService.submitTicketVendorApplication(userId, request, frontImage, backImage, false));
    }

    @PutMapping(value = "/me/ticket-vendor-application", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('USER')")
    public ApiRequest<TicketVendorProfileResponse> updateTicketVendorApplication(
            @Valid @ModelAttribute TicketVendorApplicationRequest request,
            @RequestParam(value = "frontImage", required = false) MultipartFile frontImage,
            @RequestParam(value = "backImage", required = false) MultipartFile backImage) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(SuccessCode.APPLICATION_SUBMITTED_SUCCESS,
                userService.submitTicketVendorApplication(userId, request, frontImage, backImage, true));
    }

    @GetMapping("/me/ticket-vendor-profile")
    @PreAuthorize("hasRole('USER')")
    public ApiRequest<TicketVendorProfileResponse> getMyTicketVendorProfile() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(SuccessCode.GET_USER_PROFILE_SUCCESS,
                userService.getTicketVendorProfile(userId));
    }

    @PutMapping(value = "/me/upgradetohost", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('USER')")
    public ApiRequest<ApprovalStatusResponse> updateUpgradeToHost(
            @ModelAttribute HostProfileRequest hostProfileRequest,
            @RequestParam(value = "frontImage", required = false) MultipartFile frontImage,
            @RequestParam(value = "backImage", required = false) MultipartFile backImage) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(
                SuccessCode.APPLICATION_SUBMITTED_SUCCESS,
                userService.updateProfileUpgradeToHost(userId, hostProfileRequest, frontImage, backImage)
        );
    }



    @DeleteMapping("/me/upgradetohost")
    @PreAuthorize("hasAnyRole('USER')")
    public ApiRequest<ApprovalStatusResponse> deleteProfileUpgradeToHost() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        userService.deleteProfileUpgradeToHost(userId);
        return ApiRequest.success(SuccessCode.APPLICATION_DELETED_SUCCESS);
    }


    @PostMapping("/{id}/successupgradetohost")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ApiRequest<UserResponse> successUpgradeToHost(@PathVariable String id) {
        Boolean check = userService.successUpgradeToHost(id);
        return ApiRequest.success(SuccessCode.UPGRADE_TO_HOST_SUCCESS, null, check);
    }

    @PostMapping("/{id}/successupgradetoenterprise")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ApiRequest<UserResponse> successUpgradeToEnterprise(@PathVariable String id) {
        Boolean check = userService.successUpgradeToEnterprise(id);
        return ApiRequest.success(SuccessCode.UPGRADE_TO_ENTERPRISE_SUCCESS, null, check);
    }

    @PostMapping("/me/upgradetoenterprise")
    @PreAuthorize("hasAnyRole('USER')")
    public ApiRequest<UserResponse> upgradeToEnterprise(@RequestBody EnterpriseProfileRequest enterpriseProfileRequest) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(SuccessCode.UPGRADE_TO_ENTERPRISE_SUCCESS, userService.upgradeToEnterprise(userId, enterpriseProfileRequest));
    }

    @PutMapping("/me/upgradetoenterprise")
    @PreAuthorize("hasAnyRole('USER')")
    public ApiRequest<UserResponse> updateUpgradeToEnterprise(@RequestBody EnterpriseProfileRequest enterpriseProfileRequest) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(SuccessCode.UPGRADE_TO_ENTERPRISE_SUCCESS, userService.updateProfileUpgradeToEnterprise(userId, enterpriseProfileRequest));
    }


    @GetMapping("/me/profile")
    @PreAuthorize("hasAnyRole('USER')")
    public ApiRequest<UserProfileResponse> getMyProfile() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(SuccessCode.GET_USER_PROFILE_SUCCESS, userService.getUserProfile(userId));
    }

    @PutMapping("/me/profile")
    @PreAuthorize("hasAnyRole('USER')")
    public ApiRequest<UserProfileResponse> updateMyProfile(@RequestBody UserProfileRequest dto) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(SuccessCode.UPDATE_USER_PROFILE_SUCCESS, userService.updateUserProfile(userId, dto));
    }

    @GetMapping("/me/host-profile")
    @PreAuthorize("hasAnyRole('HOST')")
    public ApiRequest<HostProfileResponse> getMyHostProfile() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(SuccessCode.GET_HOST_PROFILE_SUCCESS, userService.getHostProfile(userId));
    }

    @PutMapping("/me/host-profile")
    @PreAuthorize("hasAnyRole('HOST')")
    public ApiRequest<HostProfileResponse> updateMyHostProfile(@RequestBody HostProfileRequest dto) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(SuccessCode.UPDATE_HOST_PROFILE_SUCCESS, userService.updateHostProfile(userId, dto));
    }

    @GetMapping("/me/host-bank-account")
    @PreAuthorize("hasAnyRole('HOST')")
    public ApiRequest<BankAccountResponse> getMyHostBankAccount() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(SuccessCode.GET_HOST_PROFILE_SUCCESS, userService.getHostBankAccount(userId));
    }

    @PutMapping("/me/host-bank-account")
    @PreAuthorize("hasAnyRole('HOST')")
    public ApiRequest<BankAccountResponse> updateMyHostBankAccount(@RequestBody @Valid BankAccountRequest dto) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(SuccessCode.UPDATE_HOST_PROFILE_SUCCESS, userService.updateHostBankAccount(userId, dto));
    }

    @GetMapping("/me/enterprise-profile")
    @PreAuthorize("hasAnyRole('ENTERPRISE')")
    public ApiRequest<EnterpriseProfileResponse> getMyEnterpriseProfile() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(SuccessCode.GET_ENTERPRISE_PROFILE_SUCCESS, userService.getEnterpriseProfile(userId));
    }

    @PutMapping("/me/enterprise-profile")
    @PreAuthorize("hasAnyRole('ENTERPRISE')")
    public ApiRequest<EnterpriseProfileResponse> updateMyEnterpriseProfile(@RequestBody EnterpriseProfileRequest dto) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(SuccessCode.UPDATE_ENTERPRISE_PROFILE_SUCCESS, userService.updateEnterpriseProfile(userId, dto));
    }

    @GetMapping("/me/enterprise-bank-account")
    @PreAuthorize("hasAnyRole('ENTERPRISE')")
    public ApiRequest<BankAccountResponse> getMyEnterpriseBankAccount() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(SuccessCode.GET_ENTERPRISE_PROFILE_SUCCESS, userService.getEnterpriseBankAccount(userId));
    }

    @PutMapping("/me/enterprise-bank-account")
    @PreAuthorize("hasAnyRole('ENTERPRISE')")
    public ApiRequest<BankAccountResponse> updateMyEnterpriseBankAccount(@RequestBody @Valid BankAccountRequest dto) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiRequest.success(SuccessCode.UPDATE_ENTERPRISE_PROFILE_SUCCESS, userService.updateEnterpriseBankAccount(userId, dto));
    }

    // Endpoint: GET /api/users/internal/{userId}/status
    @GetMapping("/internal/{userId}/status")
    public ApiRequest<UserStatusResponese> checkUserStatus(@PathVariable String userId) {
        UserStatusResponese statusResponese = userService.checkUserStatus(userId);
        return ApiRequest.success(SuccessCode.USER_STATUS_RETRIEVED_SUCCESS, statusResponese);
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('USER', 'HOST', 'ENTERPRISE')")
    public ApiRequest<UserProfileResponse> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @RequestHeader("Authorization") String authorizationHeader) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        UserProfileResponse response = userService.uploadAvatar(userId, file, authorizationHeader);

        return ApiRequest.success(SuccessCode.UPLOAD_AVATAR_SUCCESS, response);
    }
}
