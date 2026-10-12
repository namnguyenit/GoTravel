package com.Gostay.BookingandInventory.configuration;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.Set;

/** Per-receiver credentials. Configure distinct random secrets for each caller. */
final class TransportInternalAccess {
    private static final String SERVICE = "inventory";
    private static final boolean REQUIRED = Boolean.parseBoolean(System.getenv("TRANSPORT_INTERNAL_AUTH_REQUIRED"));
    private static final Map<String,String> CALLERS = readTokens();
    private static Map<String,String> readTokens() {
        String json = System.getenv("TRANSPORT_INTERNAL_CALLERS");
        if (json == null || json.isBlank()) return Map.of();
        try {
            Map<String,String> result = new ObjectMapper().readValue(json, new TypeReference<Map<String,String>>() {});
            if (result.values().stream().anyMatch(token -> token == null || token.length() < 32))
                throw new IllegalArgumentException("Transport caller tokens must have at least 32 characters");
            return Map.copyOf(result);
        } catch (Exception error) { throw new IllegalStateException("Invalid TRANSPORT_INTERNAL_CALLERS configuration"); }
    }
    static boolean applies(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.contains("/transport") || (request.getHeader("X-Internal-Caller") != null &&
                CALLERS.containsKey(request.getHeader("X-Internal-Caller")));
    }
    static boolean required(HttpServletRequest request) {
        return REQUIRED || request.getHeader("X-Internal-Caller") != null;
    }
    static boolean allows(HttpServletRequest request) {
        String caller = request.getHeader("X-Internal-Caller");
        String supplied = request.getHeader("X-Internal-Service-Token");
        String expected = CALLERS.get(caller == null ? "" : caller);
        if (expected == null || supplied == null || !MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                supplied.getBytes(StandardCharsets.UTF_8))) return false;
        String path = request.getRequestURI(); boolean read = "GET".equals(request.getMethod());
        if (SERVICE.equals("catalog")) return caller.equals("car") || (read && caller.equals("cart"));
        if (SERVICE.equals("payment")) return caller.equals("cart");
        if (SERVICE.equals("inventory")) {
            if (read && path.contains("/item-operations")) return Set.of("car","cart").contains(caller);
            if (path.contains("/item-operations") || path.contains("/holds") || path.contains("/confirm") || path.contains("/release-unpaid") ||
                    path.contains("/cancel-sold")) return caller.equals("cart");
            if (read) return Set.of("car","cart").contains(caller);
            return caller.equals("car");
        }
        if (path.contains("/payment-success") || path.contains("/payment-failed") || path.contains("/payment-review"))
            return caller.equals("payment");
        if (read && path.contains("/payment-summary")) return caller.equals("payment");
        if (path.contains("/transport")) return caller.equals("car");
        return false;
    }
}
