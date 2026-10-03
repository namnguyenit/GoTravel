package com.gotravel.Identity.service;

import com.gotravel.Identity.dto.request.ForgotPasswordRequest;
import com.gotravel.Identity.dto.request.ResetPasswordRequest;
import com.gotravel.Identity.entity.User;
import com.gotravel.Identity.exception.AppException;
import com.gotravel.Identity.exception.AuthErrorCode;
import com.gotravel.Identity.exception.UserErrorCode;
import com.gotravel.Identity.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Slf4j
public class PasswordResetService {

    final UserRepository userRepository;
    final PasswordEncoder passwordEncoder;
    final RestTemplate restTemplate = new RestTemplate();
    final SecureRandom secureRandom = new SecureRandom();
    final Map<String, ResetCode> resetCodes = new ConcurrentHashMap<>();

    @Value("${communication.service.forgot-password-url:http://localhost:5001/api/v1/communications/email/forgot-password}")
    String forgotPasswordEmailUrl;

    @Value("${communication.service.token:}")
    String communicationToken;

    @Value("${password-reset.otp-expiration-minutes:10}")
    long otpExpirationMinutes;

    @Transactional(readOnly = true)
    public void requestReset(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.getEmail());
        Optional<User> userOptional = userRepository.findByEmailIgnoreCase(email);

        if (userOptional.isEmpty()) {
            log.info("Password reset requested for non-existing email {}", email);
            return;
        }

        User user = userOptional.get();
        if (Boolean.TRUE.equals(user.getIsDeleted()) || Boolean.FALSE.equals(user.getIsActive())) {
            log.info("Password reset ignored for inactive/deleted account {}", email);
            return;
        }

        String otp = generateOtp();
        resetCodes.put(email, new ResetCode(passwordEncoder.encode(otp), LocalDateTime.now().plusMinutes(otpExpirationMinutes)));
        sendResetEmail(user, email, otp);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String email = normalizeEmail(request.getEmail());
        ResetCode resetCode = resetCodes.get(email);

        if (resetCode == null || resetCode.expiresAt().isBefore(LocalDateTime.now())) {
            resetCodes.remove(email);
            throw new AppException(AuthErrorCode.INVALID_RESET_OTP);
        }

        if (!passwordEncoder.matches(request.getOtp().trim(), resetCode.otpHash())) {
            throw new AppException(AuthErrorCode.INVALID_RESET_OTP);
        }

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AppException(UserErrorCode.USER_NOT_FOUND));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        resetCodes.remove(email);
    }

    private void sendResetEmail(User user, String email, String otp) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-internal-service-token", communicationToken);

            Map<String, Object> body = Map.of(
                    "to", email,
                    "name", resolveDisplayName(user),
                    "otp", otp,
                    "expiresMinutes", otpExpirationMinutes
            );

            restTemplate.postForEntity(forgotPasswordEmailUrl, new HttpEntity<>(body, headers), Map.class);
        } catch (Exception e) {
            resetCodes.remove(email);
            log.error("Cannot send password reset email to {}", email, e);
            throw new AppException(AuthErrorCode.EMAIL_SEND_FAILED);
        }
    }

    private String resolveDisplayName(User user) {
        if (user.getUserProfile() != null && user.getUserProfile().getFullName() != null
                && !user.getUserProfile().getFullName().isBlank()) {
            return user.getUserProfile().getFullName();
        }
        return user.getUsername();
    }

    private String generateOtp() {
        return String.format("%06d", secureRandom.nextInt(1_000_000));
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private record ResetCode(String otpHash, LocalDateTime expiresAt) {}
}
