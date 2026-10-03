package com.gotravel.Identity.controller;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gotravel.Identity.dto.request.ApiRequest;
import com.gotravel.Identity.dto.request.AuthenticationRequest;
import com.gotravel.Identity.dto.request.ForgotPasswordRequest;
import com.gotravel.Identity.dto.request.ResetPasswordRequest;
import com.gotravel.Identity.dto.response.AuthenticationResponse;
import com.gotravel.Identity.exception.SuccessCode;
import com.gotravel.Identity.service.AuthenticationService;
import com.gotravel.Identity.service.PasswordResetService;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationController {

    AuthenticationService authenticationService;
    PasswordResetService passwordResetService;

    @PostMapping("/login")
    public ApiRequest<AuthenticationResponse> authenticate(@RequestBody AuthenticationRequest request) {
        var result = authenticationService.authenticate(request);
        return ApiRequest.success(SuccessCode.LOGIN_SUCCESS, result);
    }

    @PostMapping("/forgot-password")
    public ApiRequest<Void> forgotPassword(@RequestBody @Valid ForgotPasswordRequest request) {
        passwordResetService.requestReset(request);
        return ApiRequest.success(SuccessCode.PASSWORD_RESET_REQUESTED);
    }

    @PostMapping("/reset-password")
    public ApiRequest<Void> resetPassword(@RequestBody @Valid ResetPasswordRequest request) {
        passwordResetService.resetPassword(request);
        return ApiRequest.success(SuccessCode.PASSWORD_RESET_SUCCESS);
    }

    /**
     * Refresh token: cấp JWT mới với roles mới nhất từ DB mà không cần đăng nhập lại.
     * Người dùng phải đang có JWT hợp lệ (Bearer token).
     * Hữu ích khi admin nâng quyền user — user tự refresh mà không cần logout.
     */
    @PostMapping("/refresh-roles")
    public ApiRequest<AuthenticationResponse> refreshRoles() {
        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        var result = authenticationService.refreshRoles(jwt.getSubject(), jwt.getIssuedAt(), jwt.getExpiresAt());
        return ApiRequest.success(SuccessCode.LOGIN_SUCCESS, result);
    }
}
