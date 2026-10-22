package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.entity.InventoryConfig;
import com.Gostay.BookingandInventory.exeption.AppException;
import com.Gostay.BookingandInventory.repository.InventoryConfigRepository;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InventoryOwnershipTest {
    private final InventoryConfigRepository repo=mock(InventoryConfigRepository.class);
    private final ListingAccessService access=new ListingAccessService(repo);
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    private void login(UUID user,String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                user.toString(),null,List.of(new SimpleGrantedAuthority(role))));
    }
    @Test void ownerCanAccessTheirListing() {
        UUID owner=UUID.randomUUID(),listing=UUID.randomUUID();login(owner,"ROLE_HOST");
        when(repo.findByListingId(listing)).thenReturn(Optional.of(InventoryConfig.builder().ownerId(owner).build()));
        assertDoesNotThrow(()->access.requireOwnerOrAdmin(listing));
    }
    @Test void differentHostIsDenied() {
        UUID listing=UUID.randomUUID();login(UUID.randomUUID(),"ROLE_HOST");
        when(repo.findByListingId(listing)).thenReturn(Optional.of(InventoryConfig.builder().ownerId(UUID.randomUUID()).build()));
        assertThrows(AppException.class,()->access.requireOwnerOrAdmin(listing));
    }
    @Test void unassignedListingIsDenied() {
        UUID listing=UUID.randomUUID();login(UUID.randomUUID(),"ROLE_HOST");
        when(repo.findByListingId(listing)).thenReturn(Optional.of(new InventoryConfig()));
        assertThrows(AppException.class,()->access.requireOwnerOrAdmin(listing));
    }
    @Test void adminCanAccessAndHostCannotClaimInitialization() {
        login(UUID.randomUUID(),"ROLE_ADMIN");assertDoesNotThrow(()->access.requireOwnerOrAdmin(UUID.randomUUID()));
        login(UUID.randomUUID(),"ROLE_HOST");assertThrows(AppException.class,()->access.requireAdmin());
    }
}
