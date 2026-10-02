package com.gotravel.Identity.service;

import com.gotravel.Identity.enums.Approval_status;
import com.gotravel.Identity.mapper.UserMapper;
import com.gotravel.Identity.repository.HostProfileRepository;
import com.gotravel.Identity.repository.RoleRepository;
import com.gotravel.Identity.repository.TicketVendorProfileRepository;
import com.gotravel.Identity.repository.UserRepository;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.PersistenceUnit;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.gotravel.Identity.entity.User;
import com.gotravel.Identity.entity.Role;
import com.gotravel.Identity.entity.UserProfile;
import com.gotravel.Identity.entity.HostProfile;
import com.gotravel.Identity.entity.EnterpriseProfile;
import com.gotravel.Identity.entity.TicketVendorProfile;
import com.gotravel.Identity.enums.Provider;
import com.gotravel.Identity.dto.request.*;
import com.gotravel.Identity.dto.response.*;
import com.gotravel.Identity.exception.*;
import java.security.PublicKey;
import java.time.LocalDateTime;
import java.util.*;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
@FieldDefaults(level = AccessLevel.PRIVATE)
@RequiredArgsConstructor
public class UserService {
    final UserRepository userRepository;
    final UserMapper userMapper;
    final RoleRepository roleRepository;
    final HostProfileRepository hostProfileRepository;
    final TicketVendorProfileRepository ticketVendorProfileRepository;
    final com.gotravel.Identity.repository.EnterpriseProfileRepository enterpriseProfileRepository;
    final PasswordEncoder passwordEncoder;
    /**
     * hàm sẽ set role mặc định là USER khi tạo tài khoản và setProvider Local
     * user thì phải set role và provider và isActive
     * userprofile thì phải set name số điện thoại
     *
     * @param userRequest
     * @return trả về Userresponse
     */
    @Transactional
    public UserResponse createUser(UserRequest userRequest) {
        if (userRepository.existsByUsername(userRequest.getUsername())) {
            throw new AppException(UserErrorCode.USER_ALREADY_EXISTS);
        }
        if (userRequest.getEmail() != null && userRepository.existsByEmail(userRequest.getEmail())) {
            throw new AppException(UserErrorCode.EMAIL_ALREADY_EXISTS);
        }
        // mapper toàn bộ dữ liệu sang user
        User user = userMapper.userRequestToUser(userRequest);
        user.setPassword(passwordEncoder.encode(userRequest.getPassword()));
        // set thêm các dữ liệu mặc định
        Role userRole = roleRepository.findById("USER")
                .orElseThrow(() -> new AppException(UserErrorCode.ROLE_NOT_FOUND));
        user.setRoles(new HashSet<>(Set.of(userRole)));
        user.setProvider(Provider.LOCAL);
        user.setIsActive(true);

        // set các chức năng còn lại vào Userprofile
        UserProfile userProfile = UserProfile.builder()
                .user(user)
                .fullName(userRequest.getFullName())
                .phoneNumber(userRequest.getPhoneNumber())
                .dateOfBirth(userRequest.getDateOfBirth())
                .build();
        user.setUserProfile(userProfile);
        // lưu user
        userRepository.save(user);

        return userMapper.userToUserResponse(user);
    }

    /**
     * logic lấy user từ userId
     * @param userId
     * @return UserReponse
     */
    public UserResponse getUserById(String userId) {
        User user = findUserById(userId);
        return userMapper.userToUserResponse(user);
    }

    /**
     * lấy cả người dùng bị ban hay bị xoá
     * @return list người dùng
     */
    public PageResponse<UserResponse> getAllUsers(int page, int size) {
        return getAllUsers(page, size, null);
    }

    public PageResponse<UserResponse> getAllUsers(int page, int size, String keyword) {
        Pageable pageable = PageRequest.of(page, size);
        String cleanKeyword = keyword == null ? "" : keyword.trim();
        Page<User> userPage = cleanKeyword.isBlank()
                ? userRepository.findAllByRoles_Name("USER", pageable)
                : userRepository.searchByRoleNameAndKeyword("USER", cleanKeyword, pageable);

        return PageResponse.<UserResponse>builder()
                .content(userPage.getContent().stream().map(userMapper::userToUserResponse).toList())
                .totalPages(userPage.getTotalPages())
                .totalElements(userPage.getTotalElements())
                .build();
    }

    public AdminIdentitySummaryResponse getAdminSummary() {
        long totalHosts = hostProfileRepository.count();
        long totalEnterprises = enterpriseProfileRepository.count();
        long totalTicketVendors = ticketVendorProfileRepository.count();

        return AdminIdentitySummaryResponse.builder()
                .totalAccounts(userRepository.count())
                .totalUsers(userRepository.countByRoleName("USER"))
                .activeAccounts(userRepository.countByIsActive(true))
                .bannedAccounts(userRepository.countByIsActive(false))
                .deletedAccounts(userRepository.countByIsDeleted(true))
                .totalHosts(totalHosts)
                .pendingHosts(hostProfileRepository.countByApprovalStatus(Approval_status.PENDING))
                .approvedHosts(hostProfileRepository.countByApprovalStatus(Approval_status.APPROVED))
                .rejectedHosts(hostProfileRepository.countByApprovalStatus(Approval_status.REJECTED))
                .totalEnterprises(totalEnterprises)
                .pendingEnterprises(enterpriseProfileRepository.countByApprovalStatus(Approval_status.PENDING))
                .approvedEnterprises(enterpriseProfileRepository.countByApprovalStatus(Approval_status.APPROVED))
                .rejectedEnterprises(enterpriseProfileRepository.countByApprovalStatus(Approval_status.REJECTED))
                .totalTicketVendors(totalTicketVendors)
                .pendingTicketVendors(ticketVendorProfileRepository.countByApprovalStatus(Approval_status.PENDING))
                .approvedTicketVendors(ticketVendorProfileRepository.countByApprovalStatus(Approval_status.APPROVED))
                .rejectedTicketVendors(ticketVendorProfileRepository.countByApprovalStatus(Approval_status.REJECTED))
                .build();
    }


    /**
     *  update user
     * @param userId
     * @param userUpdateRequest
     * @return UserResponse
     */
    @Transactional
    public UserResponse updateUser(String userId, UserUpdateRequest userUpdateRequest) {
        User user = findUserById(userId);

        if(userUpdateRequest.getPassword() != null && !userUpdateRequest.getPassword().isEmpty() ) {
            user.setPassword(passwordEncoder.encode(userUpdateRequest.getPassword()));
        }
        UserProfile userProfile = user.getUserProfile();
        if (userProfile == null) {
            userProfile = UserProfile.builder().user(user).build();
            user.setUserProfile(userProfile);
        }
        if (userUpdateRequest.getFullName() != null && !userUpdateRequest.getFullName().trim().isEmpty()) {
            userProfile.setFullName(userUpdateRequest.getFullName());
        }

        if (userUpdateRequest.getPhoneNumber() != null && !userUpdateRequest.getPhoneNumber().trim().isEmpty()) {
            userProfile.setPhoneNumber(userUpdateRequest.getPhoneNumber());
        }
        userRepository.save(user);
        return userMapper.userToUserResponse(user);
    }


    /**
     * @Logic tìm người dùng theo userId và xoá người dùng
     * @param userId
     */
    @Transactional
    public void deleteUser(String userId) {
        User user = findUserById(userId);
        user.setIsDeleted(true);
        user.setIsActive(false);
        userRepository.save(user);
    }

    @Transactional
    public void banUser(String userId) {
        User user = findUserById(userId);
        user.setIsActive(false);
        userRepository.save(user);
    }


    /**
     * @Note khi update role phải cần hỏi thêm về các thông tin và map thêm vào user cho từng hạng mục nữa .
     * @param userId
     * @param roleName
     */
    @Transactional
    public void upgradeToRole(String userId, String roleName) {
        User user = findUserById(userId);

        boolean hasHost = user.getRoles().stream().anyMatch(r -> r.getName().equalsIgnoreCase("HOST"));
        boolean hasEnterprise = user.getRoles().stream().anyMatch(r -> r.getName().equalsIgnoreCase("ENTERPRISE"));

        if (roleName.equalsIgnoreCase("HOST") && hasEnterprise) {
            throw new AppException(UserErrorCode.MUTUALLY_EXCLUSIVE_ROLES);
        }
        // ENTERPRISE is an upgrade from HOST - allowed, HOST will be revoked when Admin approves

        Role role = roleRepository.findById(roleName.toUpperCase())
                .orElseThrow(() -> new AppException(UserErrorCode.ROLE_NOT_FOUND));

        if ("TICKET_VENDOR".equalsIgnoreCase(roleName)
                && (user.getTicketVendorProfile() == null
                || user.getTicketVendorProfile().getApprovalStatus() != Approval_status.APPROVED)) {
            throw new AppException(UserErrorCode.TICKET_VENDOR_AWAITING_APPROVAL);
        }

        user.getRoles().add(role);

        if (roleName.equalsIgnoreCase("HOST") && user.getHostProfile() == null) {
            HostProfile hostProfile = HostProfile.builder()
                    .user(user)
                    .build();
            user.setHostProfile(hostProfile);
        } else if (roleName.equalsIgnoreCase("ENTERPRISE") && user.getEnterpriseProfile() == null) {
            EnterpriseProfile enterpriseProfile = EnterpriseProfile.builder()
                    .user(user)
                    .build();
            user.setEnterpriseProfile(enterpriseProfile);
        }

        userRepository.save(user);
    }

    @Transactional
    public void revokeRole(String userId, String roleName) {
        if (roleName.equalsIgnoreCase("USER")) {
            throw new AppException(UserErrorCode.CANNOT_REMOVE_USER_ROLE);
        }
        User user = findUserById(userId);
        Role role = roleRepository.findById(roleName.toUpperCase())
                .orElseThrow(() -> new AppException(UserErrorCode.ROLE_NOT_FOUND));

        if (user.getRoles().remove(role)) {
            if (roleName.equalsIgnoreCase("HOST")) {
                if (user.getHostProfile() != null) {
                    user.getHostProfile().setApprovalStatus(Approval_status.REJECTED);
                }
            } else if (roleName.equalsIgnoreCase("ENTERPRISE")) {
                if (user.getEnterpriseProfile() != null) {
                    user.getEnterpriseProfile().setApprovalStatus(Approval_status.REJECTED);
                }
            } else if (roleName.equalsIgnoreCase("TICKET_VENDOR")) {
                if (user.getTicketVendorProfile() != null) {
                    user.getTicketVendorProfile().setApprovalStatus(Approval_status.REJECTED);
                }
            }
            userRepository.save(user);
        }
    }

    /**
     * @Logic upgrade từ người dùng lên Host
     * @param userId
     * @param hostProfileRequest
     * @retuhostn UserReponse
     */
    @Transactional
    public ApprovalStatusResponse upgradeToHost(
            String userId,
            HostProfileRequest hostProfileRequest,
            MultipartFile frontImage,
            MultipartFile backImage) {
        User user = findUserById(userId);
        Boolean check = user.getRoles().stream()
                .anyMatch(role -> role.getName().equals("HOST"));
        if(check){
            throw new AppException(UserErrorCode.ROLE_USER_ALREADY_EXISTS);
        }
        boolean hasEnterprise = user.getRoles().stream()
                .anyMatch(role -> role.getName().equals("ENTERPRISE"));
        if(hasEnterprise){
            throw new AppException(UserErrorCode.MUTUALLY_EXCLUSIVE_ROLES);
        }
        if(user.getHostProfile() != null){
            HostProfile hostProfile = user.getHostProfile();
            if(hostProfile.getApprovalStatus() == Approval_status.PENDING){
                throw new AppException(UserErrorCode.POFILE_USER_AWAITING_EXISTS);
            }
            if(hostProfile.getApprovalStatus() == Approval_status.APPROVED){
                throw new AppException(UserErrorCode.ROLE_USER_ALREADY_EXISTS);
            }
            // If REJECTED, proceed to update
        } else {
            HostProfile hostProfile = HostProfile.builder()
                    .user(user)
                    .approvalStatus(Approval_status.PENDING)
                    .build();
            user.setHostProfile(hostProfile);
        }

        userMapper.updateHostProfileFromRequest(hostProfileRequest, user.getHostProfile());
        if (frontImage != null && !frontImage.isEmpty() && backImage != null && !backImage.isEmpty()) {
            List<String> documentUrls = uploadSecureDocuments(userId, frontImage, backImage);
            user.getHostProfile().setFrontImageUrl(documentUrls.get(0));
            user.getHostProfile().setBackImageUrl(documentUrls.get(1));
        }
        user.getHostProfile().setApprovalStatus(Approval_status.PENDING);
        userRepository.save(user);
        return ApprovalStatusResponse
                .builder()
                .approvalstatus("PENDING")
                .build();
    }

    public UpgradeApplicationsResponse getMyUpgradeApplications(String userId) {
        User user = findUserById(userId);
        HostProfileResponse hostApplication = null;
        EnterpriseProfileResponse enterpriseApplication = null;
        TicketVendorProfileResponse ticketVendorApplication = null;
        List<UpgradeApplicationsResponse.ApplicationHistoryEntry> history = new ArrayList<>();

        if (user.getHostProfile() != null) {
            hostApplication = userMapper.toHostProfileResponse(user.getHostProfile());
            hostApplication.setAvatarUrl(getAvatarUrl(user));
            history.addAll(buildApplicationHistory("HOST", user.getHostProfile().getApprovalStatus(), user.getHostProfile().getCreatedAt(), user.getHostProfile().getUpdatedAt()));
        }

        if (user.getEnterpriseProfile() != null) {
            enterpriseApplication = userMapper.toEnterpriseProfileResponse(user.getEnterpriseProfile());
            enterpriseApplication.setAvatarUrl(getAvatarUrl(user));
            history.addAll(buildApplicationHistory("ENTERPRISE", user.getEnterpriseProfile().getApprovalStatus(), user.getEnterpriseProfile().getCreatedAt(), user.getEnterpriseProfile().getUpdatedAt()));
        }

        if (user.getTicketVendorProfile() != null) {
            ticketVendorApplication = userMapper.toTicketVendorProfileResponse(user.getTicketVendorProfile());
            history.addAll(buildApplicationHistory("TICKET_VENDOR", user.getTicketVendorProfile().getApprovalStatus(),
                    user.getTicketVendorProfile().getCreatedAt(), user.getTicketVendorProfile().getUpdatedAt()));
        }

        history.sort(Comparator.comparing(
                UpgradeApplicationsResponse.ApplicationHistoryEntry::getOccurredAt,
                Comparator.nullsLast(Comparator.reverseOrder())
        ));

        return UpgradeApplicationsResponse.builder()
                .hostApplication(hostApplication)
                .enterpriseApplication(enterpriseApplication)
                .ticketVendorApplication(ticketVendorApplication)
                .history(history)
                .build();
    }

    @Transactional
    public TicketVendorProfileResponse submitTicketVendorApplication(
            String userId,
            TicketVendorApplicationRequest request,
            MultipartFile frontImage,
            MultipartFile backImage,
            boolean updateExisting) {
        User user = findUserById(userId);
        TicketVendorProfile profile = user.getTicketVendorProfile();

        if (updateExisting && profile == null) {
            throw new AppException(UserErrorCode.TICKET_VENDOR_PROFILE_NOT_FOUND);
        }
        if (profile != null && profile.getApprovalStatus() == Approval_status.APPROVED) {
            throw new AppException(UserErrorCode.TICKET_VENDOR_ALREADY_APPROVED);
        }
        if (!updateExisting && profile != null && profile.getApprovalStatus() == Approval_status.PENDING) {
            throw new AppException(UserErrorCode.TICKET_VENDOR_AWAITING_APPROVAL);
        }
        if (profile == null) {
            profile = TicketVendorProfile.builder().user(user).build();
            user.setTicketVendorProfile(profile);
        }

        profile.setCompanyName(request.getCompanyName().trim());
        profile.setCompanyAddress(request.getCompanyAddress().trim());
        profile.setRepresentativeName(request.getRepresentativeName().trim());
        profile.setRepresentativeIdNumber(request.getRepresentativeIdNumber().trim());
        profile.setTaxCode(request.getTaxCode());
        profile.setContactPhone(request.getContactPhone());

        boolean hasFront = frontImage != null && !frontImage.isEmpty();
        boolean hasBack = backImage != null && !backImage.isEmpty();
        if (hasFront != hasBack) {
            throw new AppException(UserErrorCode.TICKET_VENDOR_DOCUMENTS_REQUIRED);
        }
        if (hasFront) {
            List<String> documentUrls = uploadSecureDocuments(userId, frontImage, backImage, "ticket-vendor-applications");
            profile.setDocumentFrontUrl(documentUrls.get(0));
            profile.setDocumentBackUrl(documentUrls.get(1));
        }
        if (profile.getDocumentFrontUrl() == null || profile.getDocumentBackUrl() == null) {
            throw new AppException(UserErrorCode.TICKET_VENDOR_DOCUMENTS_REQUIRED);
        }

        profile.setApprovalStatus(Approval_status.PENDING);
        profile.setRejectionReason(null);
        user.getRoles().removeIf(role -> "TICKET_VENDOR".equals(role.getName()));
        userRepository.save(user);
        return userMapper.toTicketVendorProfileResponse(profile);
    }

    public TicketVendorProfileResponse getTicketVendorProfile(String userId) {
        User user = findUserById(userId);
        if (user.getTicketVendorProfile() == null) {
            throw new AppException(UserErrorCode.TICKET_VENDOR_PROFILE_NOT_FOUND);
        }
        return userMapper.toTicketVendorProfileResponse(user.getTicketVendorProfile());
    }

    public PageResponse<UserResponse> getTicketVendorApplications(int page, int size, String status) {
        Pageable pageable = PageRequest.of(page, size);
        Page<TicketVendorProfile> profiles;
        if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) {
            profiles = ticketVendorProfileRepository.findAll(pageable);
        } else {
            Approval_status approvalStatus;
            try {
                approvalStatus = Approval_status.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new AppException(UserErrorCode.INVALID_APPROVAL_STATUS);
            }
            profiles = ticketVendorProfileRepository.findAllByApprovalStatus(approvalStatus, pageable);
        }
        return PageResponse.<UserResponse>builder()
                .content(profiles.getContent().stream().map(profile -> userMapper.userToUserResponse(profile.getUser())).toList())
                .totalPages(profiles.getTotalPages())
                .totalElements(profiles.getTotalElements())
                .build();
    }

    @Transactional
    public TicketVendorProfileResponse reviewTicketVendorApplication(String userId, ApprovalRequest request) {
        User user = findUserById(userId);
        TicketVendorProfile profile = user.getTicketVendorProfile();
        if (profile == null) {
            throw new AppException(UserErrorCode.TICKET_VENDOR_PROFILE_NOT_FOUND);
        }

        String status = request.getStatus() == null ? "" : request.getStatus().toUpperCase();
        if (!"APPROVED".equals(status) && !"REJECTED".equals(status)) {
            throw new AppException(UserErrorCode.INVALID_APPROVAL_STATUS);
        }
        if ("REJECTED".equals(status) && (request.getReason() == null || request.getReason().isBlank())) {
            throw new AppException(UserErrorCode.TICKET_VENDOR_REJECTION_REASON_REQUIRED);
        }
        if (profile.getApprovalStatus() != Approval_status.PENDING) {
            throw new AppException(UserErrorCode.TICKET_VENDOR_NOT_PENDING);
        }

        profile.setApprovalStatus(Approval_status.valueOf(status));
        if (profile.getApprovalStatus() == Approval_status.APPROVED) {
            Role role = roleRepository.findById("TICKET_VENDOR")
                    .orElseThrow(() -> new AppException(UserErrorCode.ROLE_NOT_FOUND));
            user.getRoles().add(role);
            profile.setRejectionReason(null);
        } else {
            user.getRoles().removeIf(role -> "TICKET_VENDOR".equals(role.getName()));
            profile.setRejectionReason(request.getReason().trim());
        }
        userRepository.save(user);
        return userMapper.toTicketVendorProfileResponse(profile);
    }

    /**
     * @Logic upgrade từ người dùng lên Host
     * @param userId
     * @param hostProfileRequest
     * @retuhostn UserReponse
     */
    @Transactional
    public ApprovalStatusResponse updateProfileUpgradeToHost(
            String userId,
            HostProfileRequest hostProfileRequest,
            MultipartFile frontImage,
            MultipartFile backImage) {
        User user = findUserById(userId);
        Boolean check = user.getRoles().stream()
                .anyMatch(role -> role.getName().equals("HOST"));
        if(check){
            throw new AppException(UserErrorCode.ROLE_USER_ALREADY_EXISTS);
        }
        boolean hasEnterprise = user.getRoles().stream()
                .anyMatch(role -> role.getName().equals("ENTERPRISE"));
        if(hasEnterprise){
            throw new AppException(UserErrorCode.MUTUALLY_EXCLUSIVE_ROLES);
        }
        HostProfile existingProfile = user.getHostProfile();
        if(existingProfile == null){
            throw new AppException(HostErrorCode.HOST_PROFILE_NOT_EXIST);
        }

        if(existingProfile.getApprovalStatus() == Approval_status.APPROVED){
            throw new AppException(UserErrorCode.POFILE_USER_AWAITING_EXISTS);
        }

        userMapper.updateHostProfileFromRequest(hostProfileRequest, existingProfile);
        if (frontImage != null && !frontImage.isEmpty() && backImage != null && !backImage.isEmpty()) {
            List<String> documentUrls = uploadSecureDocuments(userId, frontImage, backImage);
            existingProfile.setFrontImageUrl(documentUrls.get(0));
            existingProfile.setBackImageUrl(documentUrls.get(1));
        } else if (existingProfile.getFrontImageUrl() == null || existingProfile.getBackImageUrl() == null) {
            throw new AppException(UserErrorCode.UPLOAD_IMAGE_FAILED);
        }

        // Revoke HOST role since profile is pending again
        user.getRoles().removeIf(r -> r.getName().equals("HOST"));

        existingProfile.setApprovalStatus(Approval_status.PENDING);
        userRepository.save(user);
        return ApprovalStatusResponse
                .builder()
                .approvalstatus("PENDING")
                .build();
    }

    @Transactional
    public UserResponse updateProfileUpgradeToEnterprise(String userId, EnterpriseProfileRequest enterpriseProfileRequest) {
        User user = findUserById(userId);

        Boolean check = user.getRoles().stream()
                .anyMatch(role -> role.getName().equals("ENTERPRISE"));
        if(check){
            throw new AppException(UserErrorCode.ROLE_USER_ALREADY_EXISTS);
        }

        EnterpriseProfile existingProfile = user.getEnterpriseProfile();
        if(existingProfile == null){
            throw new AppException(EnterpriseErrorCode.ENTERPRISE_PROFILE_NOT_EXIST);
        }

        if(existingProfile.getApprovalStatus() == Approval_status.APPROVED){
            throw new AppException(UserErrorCode.POFILE_USER_AWAITING_EXISTS);
        }

        userMapper.updateEnterpriseProfileFromRequest(enterpriseProfileRequest, existingProfile);
        existingProfile.setApprovalStatus(Approval_status.PENDING);
        userRepository.save(user);
        return userMapper.userToUserResponse(user);
    }

    @Transactional
    public boolean deleteProfileUpgradeToHost(String userId){
        User user = findUserById(userId);

        if(user.getHostProfile() == null){
            throw new AppException(HostErrorCode.HOST_PROFILE_NOT_EXIST);
        }

        user.getHostProfile().setApprovalStatus(Approval_status.REJECTED);
        userRepository.save(user);
        return true;
    }

    public HostDetailResponse getHostDetail(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(UserErrorCode.USER_NOT_FOUND));
        HostProfile hostProfile = user.getHostProfile();
        if (hostProfile == null) {
            throw new AppException(HostErrorCode.HOST_PROFILE_NOT_EXIST);
        }

        String hostType = user.getRoles().stream()
                .anyMatch(role -> role.getName().equals("ENTERPRISE")) ? "ENTERPRISE" : "PERSONAL";
        EnterpriseProfile enterpriseProfile = user.getEnterpriseProfile();
        boolean useEnterpriseBank = "ENTERPRISE".equals(hostType) && enterpriseProfile != null;
        String bankName = useEnterpriseBank ? enterpriseProfile.getBankName() : hostProfile.getBankName();
        String bankAccount = useEnterpriseBank ? enterpriseProfile.getBankAccount() : hostProfile.getBankAccount();
        String bankAccountName = useEnterpriseBank ? enterpriseProfile.getBankAccountName() : hostProfile.getBankNameAccont();

        return HostDetailResponse.builder()
                .accountId(user.getId())
                .fullName(hostProfile.getFullName())
                .avatarUrl(getAvatarUrl(user))
                .hostType(hostType)
                .approvalStatus(hostProfile.getApprovalStatus().toString())
                .bankName(bankName)
                .bankAccount(bankAccount)
                .bankAccountName(bankAccountName)
                .identityInfo(HostDetailResponse.IdentityInfo.builder()
                        .taxCode(hostProfile.getTaxCode())
                        .frontImageUrl(hostProfile.getFrontImageUrl())
                        .backImageUrl(hostProfile.getBackImageUrl())
                        .build())
                .build();
    }

    public PageResponse<UserResponse> getHostsByStatus(int page, int size, String status) {
        Pageable pageable = PageRequest.of(page, size);
        Approval_status approvalStatus = Approval_status.valueOf(status.toUpperCase());

        Page<HostProfile> hostPage = hostProfileRepository.findAllByApprovalStatus(approvalStatus, pageable);

        return PageResponse.<UserResponse>builder()
                .content(hostPage.getContent().stream().map(hp -> userMapper.userToUserResponse(hp.getUser())).toList())
                .totalPages(hostPage.getTotalPages())
                .totalElements(hostPage.getTotalElements())
                .build();
    }

    public PageResponse<UserResponse> getAllHosts(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<HostProfile> hostPage = hostProfileRepository.findAll(pageable);

        return PageResponse.<UserResponse>builder()
                .content(hostPage.getContent().stream().map(hp -> userMapper.userToUserResponse(hp.getUser())).toList())
                .totalPages(hostPage.getTotalPages())
                .totalElements(hostPage.getTotalElements())
                .build();
    }

    public PageResponse<UserResponse> getEnterprisesByStatus(int page, int size, String status) {
        Pageable pageable = PageRequest.of(page, size);
        Approval_status approvalStatus = Approval_status.valueOf(status.toUpperCase());

        Page<EnterpriseProfile> entPage = enterpriseProfileRepository.findAllByApprovalStatus(approvalStatus, pageable);

        return PageResponse.<UserResponse>builder()
                .content(entPage.getContent().stream().map(ep -> userMapper.userToUserResponse(ep.getUser())).toList())
                .totalPages(entPage.getTotalPages())
                .totalElements(entPage.getTotalElements())
                .build();
    }

    public PageResponse<UserResponse> getAllEnterprises(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<EnterpriseProfile> entPage = enterpriseProfileRepository.findAll(pageable);

        return PageResponse.<UserResponse>builder()
                .content(entPage.getContent().stream().map(ep -> userMapper.userToUserResponse(ep.getUser())).toList())
                .totalPages(entPage.getTotalPages())
                .totalElements(entPage.getTotalElements())
                .build();
    }

    @Transactional
    public Boolean approvalHostStatus(String userId,String type, ApprovalRequest request) {
        User user = findUserById(userId);
        if(type.equals(com.gotravel.Identity.enums.Role.HOST.toString())){
            HostProfile hostProfile = user.getHostProfile();
            if (hostProfile == null) {
                throw new AppException(HostErrorCode.HOST_PROFILE_NOT_EXIST);
            }
            Approval_status status = Approval_status.valueOf(request.getStatus().toUpperCase());
            hostProfile.setApprovalStatus(status);
            // If APPROVED, automatically grant HOST role
            if (status == Approval_status.APPROVED) {
                Role hostRole = roleRepository.findById("HOST")
                        .orElseThrow(() -> new AppException(UserErrorCode.ROLE_NOT_FOUND));
                user.getRoles().add(hostRole);
            }
            userRepository.save(user);
        }else if(type.equals(com.gotravel.Identity.enums.Role.ENTERPRISE.toString())){
            EnterpriseProfile enterpriseProfile = user.getEnterpriseProfile();
            if(enterpriseProfile == null){
                throw new AppException(EnterpriseErrorCode.ENTERPRISE_PROFILE_NOT_EXIST);
            }
            Approval_status status = Approval_status.valueOf(request.getStatus().toUpperCase());
            enterpriseProfile.setApprovalStatus(status);
            // If APPROVED, grant ENTERPRISE and revoke HOST
            if (status == Approval_status.APPROVED) {
                user.getRoles().removeIf(r -> r.getName().equals("HOST"));
                Role enterpriseRole = roleRepository.findById("ENTERPRISE")
                        .orElseThrow(() -> new AppException(UserErrorCode.ROLE_NOT_FOUND));
                if (user.getRoles().stream().noneMatch(r -> r.getName().equals("ENTERPRISE"))) {
                    user.getRoles().add(enterpriseRole);
                }
            }
            userRepository.save(user);
        }
        return true;
    }


    @Transactional
    public Boolean updateBanAccountStatus(String userId, AccountStatusRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(UserErrorCode.USER_NOT_FOUND));

        boolean isActive = !"BANNED".equalsIgnoreCase(request.getStatus());
        user.setIsActive(isActive);

        userRepository.save(user);
        return true;
    }

    @Transactional
    public boolean successUpgradeToHost(String userId){
        User user = findUserById(userId);
        boolean hasEnterprise = user.getRoles().stream()
                .anyMatch(r -> r.getName().equals("ENTERPRISE"));
        if (hasEnterprise) {
            throw new AppException(UserErrorCode.MUTUALLY_EXCLUSIVE_ROLES);
        }
        Role role = roleRepository.findById("HOST")
                .orElseThrow(() -> new AppException(UserErrorCode.ROLE_NOT_FOUND));

        user.getRoles().add(role);
        if (user.getHostProfile() != null) {
            user.getHostProfile().setApprovalStatus(Approval_status.APPROVED);
        }
        userRepository.save(user);
        return true;
    }

    @Transactional
    public boolean successUpgradeToEnterprise(String userId) {
        User user = findUserById(userId);
        
        // Remove HOST role if exists, as ENTERPRISE is a superset/upgrade
        user.getRoles().removeIf(r -> r.getName().equals("HOST"));
        
        Role role = roleRepository.findById("ENTERPRISE")
                .orElseThrow(() -> new AppException(UserErrorCode.ROLE_NOT_FOUND));

        if (!user.getRoles().contains(role)) {
            user.getRoles().add(role);
        }
        
        if (user.getEnterpriseProfile() != null) {
            user.getEnterpriseProfile().setApprovalStatus(com.gotravel.Identity.enums.Approval_status.APPROVED);
        }
        
        userRepository.save(user);
        return true;
    }

    /**
     * @Logic upgrade từ người dùng lên  enterprise
     * @param userId
     * @retuhostn UserReponse
     */
    @Transactional
    public UserResponse upgradeToEnterprise(String userId, EnterpriseProfileRequest enterpriseProfileRequest) {
        User user = findUserById(userId);

        Boolean check = user.getRoles().stream()
                .anyMatch(role -> role.getName().equals("ENTERPRISE"));
        if(check){
            throw new AppException(UserErrorCode.ROLE_USER_ALREADY_EXISTS);
        }
        // HOST users are allowed to apply for ENTERPRISE upgrade
        // HOST role will be revoked automatically when Admin approves the application


        if(user.getEnterpriseProfile() != null){
            EnterpriseProfile enterpriseProfile = user.getEnterpriseProfile();
            if(enterpriseProfile.getApprovalStatus() == Approval_status.PENDING){
                throw new AppException(UserErrorCode.POFILE_USER_AWAITING_EXISTS);
            }
            if(enterpriseProfile.getApprovalStatus() == Approval_status.APPROVED){
                throw new AppException(UserErrorCode.ROLE_USER_ALREADY_EXISTS);
            }
        } else {
            EnterpriseProfile enterpriseProfile = EnterpriseProfile.builder()
                    .user(user)
                    .approvalStatus(Approval_status.PENDING)
                    .build();
            user.setEnterpriseProfile(enterpriseProfile);
        }

        userMapper.updateEnterpriseProfileFromRequest(enterpriseProfileRequest, user.getEnterpriseProfile());
        user.getEnterpriseProfile().setApprovalStatus(Approval_status.PENDING);
        userRepository.save(user);
        return userMapper.userToUserResponse(user);
    }

    /**
     * @Logic lấy profile của user
     * @param userId
     * @return UserProfileResponse
     */
    public UserProfileResponse getUserProfile(String userId) {
        User user = findUserById(userId);
        return userMapper.toUserProfileResponse(user.getUserProfile());
    }

    /**
     * @Logic lấy userId và request để cập nhật userprofilereponse
     * @param userId
     * @param request
     * @return UserProfileResponse
     */
    @Transactional
    public UserProfileResponse updateUserProfile(String userId, UserProfileRequest request) {
        User user = findUserById(userId);
        if (user.getUserProfile() == null) {
            user.setUserProfile(UserProfile.builder().user(user).build());
        }
        userMapper.updateUserProfileFromRequest(request, user.getUserProfile());
        userRepository.save(user);
        return userMapper.toUserProfileResponse(user.getUserProfile());
    }

    /**
     *
     * @param userId
     * @return HostProfileResponse
     */
    public HostProfileResponse getHostProfile(String userId) {
        User user = findUserById(userId);
        if (user.getHostProfile() == null) {
            throw new AppException(HostErrorCode.HOST_PROFILE_NOT_FOUND);
        }
        HostProfileResponse response = userMapper.toHostProfileResponse(user.getHostProfile());
        response.setAvatarUrl(getAvatarUrl(user));
        return response;
    }

    /**
     *
     * @param userId
     * @param request
     * @return HostProfileResponse
     */
    @Transactional
    public HostProfileResponse updateHostProfile(String userId, HostProfileRequest request) {
        User user = findUserById(userId);
        if (user.getHostProfile() == null) {
            throw new AppException(HostErrorCode.USER_NOT_HOST);
        }
        userMapper.updateHostProfileFromRequest(request, user.getHostProfile());
        userRepository.save(user);
        HostProfileResponse response = userMapper.toHostProfileResponse(user.getHostProfile());
        response.setAvatarUrl(getAvatarUrl(user));
        return response;
    }

    public BankAccountResponse getHostBankAccount(String userId) {
        User user = findUserById(userId);
        HostProfile profile = user.getHostProfile();
        if (profile == null) {
            throw new AppException(HostErrorCode.USER_NOT_HOST);
        }

        return toBankAccountResponse("HOST", profile.getApprovalStatus(), profile.getBankName(), profile.getBankAccount(), profile.getBankNameAccont());
    }

    @Transactional
    public BankAccountResponse updateHostBankAccount(String userId, BankAccountRequest request) {
        User user = findUserById(userId);
        HostProfile profile = user.getHostProfile();
        if (profile == null) {
            throw new AppException(HostErrorCode.USER_NOT_HOST);
        }

        profile.setBankName(request.getBankName().trim());
        profile.setBankAccount(request.getBankAccount().trim());
        profile.setBankNameAccont(request.getBankAccountName().trim());
        userRepository.save(user);

        return toBankAccountResponse("HOST", profile.getApprovalStatus(), profile.getBankName(), profile.getBankAccount(), profile.getBankNameAccont());
    }

    /**
     *
     * @param userId
     * @return EnterpriseProfileResponse
     */
    public EnterpriseProfileResponse getEnterpriseProfile(String userId) {
        User user = findUserById(userId);
        if (user.getEnterpriseProfile() == null) {
            throw new AppException(EnterpriseErrorCode.ENTERPRISE_PROFILE_NOT_FOUND);
        }
        EnterpriseProfileResponse response = userMapper.toEnterpriseProfileResponse(user.getEnterpriseProfile());
        response.setAvatarUrl(getAvatarUrl(user));
        return response;
    }

    /**
     *
     * @param userId
     * @param request
     * @return EnterpriseProfileResponse
     */
    @Transactional
    public EnterpriseProfileResponse updateEnterpriseProfile(String userId, EnterpriseProfileRequest request) {
        User user = findUserById(userId);
        if (user.getEnterpriseProfile() == null) {
            throw new AppException(EnterpriseErrorCode.USER_NOT_ENTERPRISE);
        }
        if(!user.getEnterpriseProfile().getApprovalStatus().equals(Approval_status.APPROVED))
            throw new AppException(UserErrorCode.POFILE_USER_AWAITING_EXISTS);

        userMapper.updateEnterpriseProfileFromRequest(request, user.getEnterpriseProfile());
        userRepository.save(user);
        EnterpriseProfileResponse response = userMapper.toEnterpriseProfileResponse(user.getEnterpriseProfile());
        response.setAvatarUrl(getAvatarUrl(user));
        return response;
    }

    public BankAccountResponse getEnterpriseBankAccount(String userId) {
        User user = findUserById(userId);
        EnterpriseProfile profile = user.getEnterpriseProfile();
        if (profile == null) {
            throw new AppException(EnterpriseErrorCode.USER_NOT_ENTERPRISE);
        }

        return toBankAccountResponse("ENTERPRISE", profile.getApprovalStatus(), profile.getBankName(), profile.getBankAccount(), profile.getBankAccountName());
    }

    @Transactional
    public BankAccountResponse updateEnterpriseBankAccount(String userId, BankAccountRequest request) {
        User user = findUserById(userId);
        EnterpriseProfile profile = user.getEnterpriseProfile();
        if (profile == null) {
            throw new AppException(EnterpriseErrorCode.USER_NOT_ENTERPRISE);
        }

        profile.setBankName(request.getBankName().trim());
        profile.setBankAccount(request.getBankAccount().trim());
        profile.setBankAccountName(request.getBankAccountName().trim());
        userRepository.save(user);

        return toBankAccountResponse("ENTERPRISE", profile.getApprovalStatus(), profile.getBankName(), profile.getBankAccount(), profile.getBankAccountName());
    }

    private String getAvatarUrl(User user) {
        return user.getUserProfile() != null ? user.getUserProfile().getAvatarUrl() : null;
    }

    private BankAccountResponse toBankAccountResponse(String ownerType, Approval_status approvalStatus, String bankName, String bankAccount, String bankAccountName) {
        return BankAccountResponse.builder()
                .ownerType(ownerType)
                .approvalStatus(approvalStatus != null ? approvalStatus.toString() : null)
                .bankName(bankName)
                .bankAccount(bankAccount)
                .bankAccountName(bankAccountName)
                .build();
    }

    private List<UpgradeApplicationsResponse.ApplicationHistoryEntry> buildApplicationHistory(
            String type,
            Approval_status status,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
        List<UpgradeApplicationsResponse.ApplicationHistoryEntry> entries = new ArrayList<>();
        String statusValue = status != null ? status.toString() : "PENDING";

        if (createdAt != null) {
            entries.add(UpgradeApplicationsResponse.ApplicationHistoryEntry.builder()
                    .type(type)
                    .status("SUBMITTED")
                    .title("Đã nộp hồ sơ " + type)
                    .description("Hệ thống đã tiếp nhận hồ sơ nâng cấp.")
                    .occurredAt(createdAt)
                    .build());
        }

        if (updatedAt != null && (createdAt == null || updatedAt.isAfter(createdAt.plusSeconds(1)))) {
            entries.add(UpgradeApplicationsResponse.ApplicationHistoryEntry.builder()
                    .type(type)
                    .status("UPDATED")
                    .title("Đã cập nhật hồ sơ " + type)
                    .description("Người dùng đã sửa hoặc nộp lại thông tin hồ sơ.")
                    .occurredAt(updatedAt)
                    .build());
        }

        entries.add(UpgradeApplicationsResponse.ApplicationHistoryEntry.builder()
                .type(type)
                .status(statusValue)
                .title("Trạng thái hiện tại: " + statusValue)
                .description(buildApplicationStatusDescription(type, status))
                .occurredAt(updatedAt != null ? updatedAt : createdAt)
                .build());

        return entries;
    }

    private String buildApplicationStatusDescription(String type, Approval_status status) {
        if (status == Approval_status.APPROVED) {
            return "Hồ sơ " + type + " đã được admin phê duyệt.";
        }
        if (status == Approval_status.REJECTED) {
            return "Hồ sơ " + type + " đã bị từ chối. Bạn có thể chỉnh sửa và nộp lại.";
        }
        return "Hồ sơ " + type + " đang chờ admin kiểm duyệt.";
    }

    /**
     * Helper method để tìm user và kiểm tra trạng thái (Active/Banned)
     * Giúp code trong service clean hơn và tránh lặp lại logic check ban.
     */
    private User findUserById(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(UserErrorCode.USER_NOT_FOUND));

        if (Boolean.TRUE.equals(user.getIsDeleted())) {
            throw new AppException(UserErrorCode.DELETE_USER);
        }

        if(Boolean.FALSE.equals(user.getIsActive())){
            throw new AppException(UserErrorCode.BANED_USER);
        }

        return user;
    }


    public UserStatusResponese checkUserStatus(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(UserErrorCode.USER_NOT_FOUND));
        boolean isActive = Boolean.TRUE.equals(user.getIsActive());
        boolean isDeleted = Boolean.TRUE.equals(user.getIsDeleted());

        String hostStatus = user.getHostProfile() != null ? user.getHostProfile().getApprovalStatus().toString() : null;
        String enterpriseStatus = user.getEnterpriseProfile() != null ? user.getEnterpriseProfile().getApprovalStatus().toString() : null;
        String ticketVendorStatus = user.getTicketVendorProfile() != null ? user.getTicketVendorProfile().getApprovalStatus().toString() : null;

        return UserStatusResponese.builder()
                .isActive(isActive)
                .isDeleted(isDeleted)
                .isAllowed(isActive && !isDeleted)
                .hostApprovalStatus(hostStatus)
                .enterpriseApprovalStatus(enterpriseStatus)
                .ticketVendorApprovalStatus(ticketVendorStatus)
                .build();
    }


    @Value("${media.service.url}")
    private String mediaServiceUrl;

    @Value("${media.service.token:}")
    private String mediaServiceToken;
/**
 * @Logic Nhận file từ FE, gọi sang Node.js upload Cloudinary, lưu URL vào DB
 */
    public UserProfileResponse uploadAvatar(String userId, MultipartFile file, String authorizationHeader){
        User user = findUserById(userId);
        try{
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.set(HttpHeaders.AUTHORIZATION, authorizationHeader);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            
            HttpHeaders fileHeaders = new HttpHeaders();
            if (file.getContentType() != null) {
                fileHeaders.setContentType(MediaType.parseMediaType(file.getContentType()));
            }
            
            org.springframework.core.io.ByteArrayResource fileResource = new org.springframework.core.io.ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename() != null ? file.getOriginalFilename() : "avatar.jpg";
                }
            };
            
            HttpEntity<org.springframework.core.io.ByteArrayResource> filePart = new HttpEntity<>(fileResource, fileHeaders);
            
            body.add("file", filePart);
            body.add("folder", "avatar");


            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<Map> response = restTemplate.postForEntity(mediaServiceUrl, requestEntity, Map.class);


            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String ,Object> responseBody = response.getBody();
                Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
                String avatarUrl = (String) data.get("url");
                if(user.getUserProfile()==null){
                    user.setUserProfile(UserProfile.builder().user(user).build());
                }
                user.getUserProfile().setAvatarUrl(avatarUrl);
                userRepository.save(user);

                return userMapper.toUserProfileResponse(user.getUserProfile());
            }else {
                throw new AppException(UserErrorCode.UPLOAD_IMAGE_FAILED);
            }


        } catch (AppException e){
            throw e;
        } catch (Exception e) {
            throw new AppException(UserErrorCode.UPLOAD_IMAGE_FAILED);
        }
    }

    private List<String> uploadSecureDocuments(String userId, MultipartFile frontImage, MultipartFile backImage) {
        return uploadSecureDocuments(userId, frontImage, backImage, "host-applications");
    }

    private List<String> uploadSecureDocuments(String userId, MultipartFile frontImage, MultipartFile backImage, String folder) {
        if (mediaServiceToken == null || mediaServiceToken.isBlank()) {
            throw new AppException(UserErrorCode.UPLOAD_IMAGE_FAILED);
        }
        if (frontImage == null || frontImage.isEmpty() || backImage == null || backImage.isEmpty()) {
            throw new AppException(UserErrorCode.UPLOAD_IMAGE_FAILED);
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.set("x-internal-service-token", mediaServiceToken);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("files", toFilePart(frontImage, "front-image.jpg"));
            body.add("files", toFilePart(backImage, "back-image.jpg"));
            body.add("folder", folder + "/" + userId);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<Map> response = restTemplate.postForEntity(getSecureMediaUploadUrl(), requestEntity, Map.class);

            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
                throw new AppException(UserErrorCode.UPLOAD_IMAGE_FAILED);
            }

            Map<String, Object> responseBody = response.getBody();
            Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
            List<?> urls = data != null ? (List<?>) data.get("urls") : null;

            if (urls == null || urls.size() < 2) {
                throw new AppException(UserErrorCode.UPLOAD_IMAGE_FAILED);
            }

            return List.of(String.valueOf(urls.get(0)), String.valueOf(urls.get(1)));
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException(UserErrorCode.UPLOAD_IMAGE_FAILED);
        }
    }

    private HttpEntity<org.springframework.core.io.ByteArrayResource> toFilePart(MultipartFile file, String defaultFileName) throws java.io.IOException {
        HttpHeaders fileHeaders = new HttpHeaders();
        if (file.getContentType() != null) {
            fileHeaders.setContentType(MediaType.parseMediaType(file.getContentType()));
        }

        org.springframework.core.io.ByteArrayResource fileResource = new org.springframework.core.io.ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return file.getOriginalFilename() != null ? file.getOriginalFilename() : defaultFileName;
            }
        };

        return new HttpEntity<>(fileResource, fileHeaders);
    }

    private String getSecureMediaUploadUrl() {
        String uploadUrl = mediaServiceUrl.endsWith("/")
                ? mediaServiceUrl.substring(0, mediaServiceUrl.length() - 1)
                : mediaServiceUrl;

        if (uploadUrl.endsWith("/secure-documents")) {
            return uploadUrl;
        }

        return uploadUrl + "/secure-documents";
    }



}
