package com.Gostay.BookingandInventory.configuration;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

public class InternalServiceTokenFilter extends OncePerRequestFilter {

    public static final String HEADER_NAME = "X-Internal-Service-Token";
    public static final String AUTHORITY = "INTERNAL_SERVICE";

    private final byte[] expectedToken;
    private final String internalPathPrefix;

    public InternalServiceTokenFilter(String expectedToken, String internalPathPrefix) {
        this.expectedToken = normalize(expectedToken).getBytes(StandardCharsets.UTF_8);
        this.internalPathPrefix = internalPathPrefix;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !isInternalPath(request);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (expectedToken.length == 0) {
            reject(response, HttpServletResponse.SC_SERVICE_UNAVAILABLE, "INTERNAL_SERVICE_TOKEN_NOT_CONFIGURED");
            return;
        }

        String providedToken = request.getHeader(HEADER_NAME);
        if (providedToken == null || !tokenMatches(providedToken)) {
            reject(response, HttpServletResponse.SC_UNAUTHORIZED, "INTERNAL_SERVICE_UNAUTHORIZED");
            return;
        }

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                "internal-service",
                null,
                List.of(new SimpleGrantedAuthority(AUTHORITY))
        );
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);

        filterChain.doFilter(request, response);
    }

    private boolean isInternalPath(HttpServletRequest request) {
        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isBlank() && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }

        return path.equals(internalPathPrefix) || path.startsWith(internalPathPrefix + "/");
    }

    private boolean tokenMatches(String providedToken) {
        byte[] providedTokenBytes = providedToken.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expectedToken, providedTokenBytes);
    }

    private void reject(HttpServletResponse response, int status, String errorCode) throws IOException {
        SecurityContextHolder.clearContext();
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"status\":" + status
                + ",\"message\":\"Unauthorized internal service call\","
                + "\"errorCode\":\"" + errorCode + "\",\"data\":null}");
    }

    private String normalize(String token) {
        return token == null ? "" : token.trim();
    }
}
