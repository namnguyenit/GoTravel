package com.gotravel.PaymentandWallet.transport.refund;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gotravel.PaymentandWallet.client.OrderClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;
import java.sql.Timestamp;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ProviderRefundClaimTest {
    private static final UUID PAYMENT=UUID.randomUUID(), LEG=UUID.randomUUID();
    private final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    private final ProviderRefundGateway gateway=mock(ProviderRefundGateway.class);
    private final Map<String,Object> leg=new HashMap<>();
    private ProviderRefundService service;
    private String occupied="select count(*) from transport_provider_refund_legs where payment_id=? and id<>? and (lease_until>now() or (? and submitted_at is not null and state in ('SENDING','PENDING')))";
    @BeforeEach @SuppressWarnings("unchecked") void setup(){
        var tx=mock(TransactionTemplate.class);
        when(tx.execute(any(TransactionCallback.class))).thenAnswer(i->((TransactionCallback<?>)i.getArgument(0)).doInTransaction(new SimpleTransactionStatus()));
        service=new ProviderRefundService(jdbc,mock(OrderClient.class),gateway,tx,new ObjectMapper());
        leg.put("state","PREPARED");leg.put("provider","VNPAY");
        when(jdbc.queryForMap("select * from payment_requests where id=? for update",PAYMENT)).thenReturn(Map.of("id",PAYMENT));
        when(jdbc.queryForMap("select * from transport_provider_refund_legs where id=? for update",LEG)).thenReturn(leg);
        var gate=new HashMap<String,Object>();gate.put("retry_at",null);
        when(jdbc.queryForList(startsWith("select max(next_attempt_at)"),eq(PAYMENT),eq(LEG))).thenReturn(List.of(gate));
        when(jdbc.update(startsWith("update transport_provider_refund_legs set lease_until"),eq(LEG))).thenReturn(1);
    }
    private Object claim(){return ReflectionTestUtils.invokeMethod(service,"claim",LEG,PAYMENT);}
    @Test void anotherPendingRefundDefersNewSubmission(){
        when(jdbc.queryForObject(occupied,Integer.class,PAYMENT,LEG,true)).thenReturn(1);
        assertNull(claim());verifyNoInteractions(gateway);
        verify(jdbc,never()).update(startsWith("update transport_provider_refund_legs set request_json"),any(),any());
    }
    @Test void stalePreparedSnapshotCannotResubmitAnAlreadySubmittedLeg(){
        leg.put("submitted_at",Timestamp.valueOf("2026-10-26 21:00:00"));leg.put("state","PENDING");
        Object attempt=claim();assertNotNull(attempt);
        assertEquals(false,ReflectionTestUtils.invokeMethod(attempt,"first"));
        verifyNoInteractions(gateway);
    }
    @Test void sourceCooldownDefersNextTicketEvenAfterPreviousRefundFinished(){
        when(jdbc.queryForList(startsWith("select max(next_attempt_at)"),eq(PAYMENT),eq(LEG)))
            .thenReturn(List.of(Map.of("retry_at",Timestamp.valueOf("2026-10-26 21:05:00"))));
        assertNull(claim());verifyNoInteractions(gateway);
    }
}
