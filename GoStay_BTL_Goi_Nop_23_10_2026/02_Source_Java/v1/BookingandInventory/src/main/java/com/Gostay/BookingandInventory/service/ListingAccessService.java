package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.exeption.AppException;
import com.Gostay.BookingandInventory.exeption.InventoryErrorCode;
import com.Gostay.BookingandInventory.repository.InventoryConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ListingAccessService {
    private final InventoryConfigRepository configs;

    public void requireAdmin() {
        if (!isAdmin()) throw new AppException(InventoryErrorCode.UNAUTHORIZED_ACCESS);
    }

    public void requireOwnerOrAdmin(UUID listingId) {
        if (isAdmin()) return;
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || listingId == null) deny();
        UUID caller;
        try { caller = UUID.fromString(auth.getName()); }
        catch (IllegalArgumentException invalidSubject) { deny(); return; }
        var config = configs.findByListingId(listingId).orElse(null);
        if (config == null || config.getOwnerId() == null || !caller.equals(config.getOwnerId())) deny();
    }

    private boolean isAdmin() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() && auth.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }

    private void deny() { throw new AppException(InventoryErrorCode.UNAUTHORIZED_ACCESS); }
}
