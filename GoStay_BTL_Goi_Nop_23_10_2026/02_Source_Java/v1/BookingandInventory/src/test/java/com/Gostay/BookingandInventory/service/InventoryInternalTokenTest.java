package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.configuration.InternalServiceTokenFilter;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.*;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.junit.jupiter.api.Assertions.*;

/** Isolated filter tests, not an end-to-end HTTP/security-chain test. */
class InventoryInternalTokenTest {
    @AfterEach void clearContext(){ SecurityContextHolder.clearContext(); }
    @Test void missingTokenReturns401() throws Exception {
        var filter=new InternalServiceTokenFilter("audit-local-token","/api/v1/internal");
        var req=new MockHttpServletRequest("POST","/api/v1/internal/inventory/locks");
        var res=new MockHttpServletResponse(); var invoked=new AtomicBoolean();
        filter.doFilter(req,res,(a,b)->invoked.set(true));
        assertEquals(401,res.getStatus()); assertFalse(invoked.get());
    }
    @Test void invalidTokenReturns401() throws Exception {
        var filter=new InternalServiceTokenFilter("audit-local-token","/api/v1/internal");
        var req=new MockHttpServletRequest("POST","/api/v1/internal/inventory/locks");
        req.addHeader(InternalServiceTokenFilter.HEADER_NAME,"invalid");
        var res=new MockHttpServletResponse(); var invoked=new AtomicBoolean();
        filter.doFilter(req,res,(a,b)->invoked.set(true));
        assertEquals(401,res.getStatus()); assertFalse(invoked.get());
    }
    @Test void configuredValidTokenReachesChain() throws Exception {
        var filter=new InternalServiceTokenFilter("audit-local-token","/api/v1/internal");
        var req=new MockHttpServletRequest("POST","/api/v1/internal/inventory/locks");
        req.addHeader(InternalServiceTokenFilter.HEADER_NAME,"audit-local-token");
        var res=new MockHttpServletResponse(); var invoked=new AtomicBoolean();
        filter.doFilter(req,res,(a,b)->invoked.set(true));
        assertTrue(invoked.get());
        assertTrue(SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a->a.getAuthority().equals(InternalServiceTokenFilter.AUTHORITY)));
    }
}
