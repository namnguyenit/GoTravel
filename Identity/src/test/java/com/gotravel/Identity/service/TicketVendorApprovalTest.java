package com.gotravel.Identity.service;

import com.gotravel.Identity.dto.request.ApprovalRequest;
import com.gotravel.Identity.entity.Role;
import com.gotravel.Identity.entity.TicketVendorProfile;
import com.gotravel.Identity.entity.User;
import com.gotravel.Identity.enums.Approval_status;
import com.gotravel.Identity.exception.AppException;
import com.gotravel.Identity.mapper.UserMapper;
import com.gotravel.Identity.repository.EnterpriseProfileRepository;
import com.gotravel.Identity.repository.HostProfileRepository;
import com.gotravel.Identity.repository.RoleRepository;
import com.gotravel.Identity.repository.TicketVendorProfileRepository;
import com.gotravel.Identity.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TicketVendorApprovalTest {
    @Mock UserRepository userRepository;
    @Mock UserMapper userMapper;
    @Mock RoleRepository roleRepository;
    @Mock HostProfileRepository hostProfileRepository;
    @Mock TicketVendorProfileRepository ticketVendorProfileRepository;
    @Mock EnterpriseProfileRepository enterpriseProfileRepository;
    @Mock PasswordEncoder passwordEncoder;
    @InjectMocks UserService userService;

    @Test
    void approvingPendingApplicationGrantsTicketVendorRole() {
        User user = pendingVendor();
        Role vendorRole = new Role("TICKET_VENDOR");
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(roleRepository.findById("TICKET_VENDOR")).thenReturn(Optional.of(vendorRole));

        userService.reviewTicketVendorApplication("user-1", new ApprovalRequest("APPROVED", null));

        assertEquals(Approval_status.APPROVED, user.getTicketVendorProfile().getApprovalStatus());
        assertTrue(user.getRoles().contains(vendorRole));
        verify(userRepository).save(user);
    }

    @Test
    void directRoleUpgradeRequiresApprovedApplication() {
        User user = pendingVendor();
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(roleRepository.findById("TICKET_VENDOR")).thenReturn(Optional.of(new Role("TICKET_VENDOR")));

        assertThrows(AppException.class, () -> userService.upgradeToRole("user-1", "TICKET_VENDOR"));

        assertTrue(user.getRoles().isEmpty());
        verify(userRepository, never()).save(any());
    }

    @Test
    void rejectingApplicationKeepsCustomerAccountWithoutVendorRole() {
        User user = pendingVendor();
        user.getRoles().add(new Role("USER"));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));

        userService.reviewTicketVendorApplication("user-1", new ApprovalRequest("REJECTED", "Giấy tờ không hợp lệ"));

        assertEquals(Approval_status.REJECTED, user.getTicketVendorProfile().getApprovalStatus());
        assertEquals("Giấy tờ không hợp lệ", user.getTicketVendorProfile().getRejectionReason());
        assertTrue(user.getRoles().stream().anyMatch(role -> "USER".equals(role.getName())));
        assertFalse(user.getRoles().stream().anyMatch(role -> "TICKET_VENDOR".equals(role.getName())));
    }

    private User pendingVendor() {
        User user = User.builder()
                .id("user-1")
                .roles(new HashSet<>())
                .isActive(true)
                .isDeleted(false)
                .build();
        TicketVendorProfile profile = TicketVendorProfile.builder()
                .user(user)
                .approvalStatus(Approval_status.PENDING)
                .build();
        user.setTicketVendorProfile(profile);
        return user;
    }
}
