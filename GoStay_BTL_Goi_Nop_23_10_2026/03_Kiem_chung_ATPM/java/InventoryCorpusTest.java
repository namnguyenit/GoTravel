package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.dto.request.BatchLockRequest;
import com.Gostay.BookingandInventory.entity.InventoryCalendar;
import com.Gostay.BookingandInventory.enums.InventoryCalendarStatus;
import com.Gostay.BookingandInventory.exeption.AppException;
import com.Gostay.BookingandInventory.mapper.InventoryMapper;
import com.Gostay.BookingandInventory.repository.*;
import org.junit.jupiter.api.Test;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** The exact same test source and CSV are executed against both Java versions. */
class InventoryCorpusTest {
    @Test void sharedSeedCorpusRunsOnJavaServices() throws Exception {
        String version=System.getProperty("atpm.version");
        Path corpus=Path.of(System.getProperty("atpm.corpus"));
        Path output=Path.of(System.getProperty("atpm.corpus.output"));
        var calendars=mock(InventoryCalendarRepository.class);
        when(calendars.findByListingIdAndDateBetween(any(),any(),any())).thenReturn(List.of());
        when(calendars.findByListingIdAndDateAndTimeSlot(any(),any(),any())).thenAnswer(inv->Optional.of(
            InventoryCalendar.builder().listingId(inv.getArgument(0)).date(inv.getArgument(1))
                .timeSlot(inv.getArgument(2)).availableQuantity(1000).status(InventoryCalendarStatus.AVAILABLE).build()));
        var internal=new InventoryInternalService(mock(InventoryConfigRepository.class),calendars,mock(InventoryLockRepository.class));
        var external=new InventoryPublicService(calendars,mock(InventoryMapper.class));
        LocalDate anchor=LocalDate.parse(System.getProperty("atpm.anchor"));
        List<String> results=new ArrayList<>();results.add("test_id,category,outcome");
        int incorrect=0;
        List<String> inputs=Files.readAllLines(corpus,StandardCharsets.UTF_8);
        for(String line:inputs.subList(1,inputs.size())) {
            String[] c=line.split(",");String outcome="ACCEPTED";
            LocalDate start=anchor.plusDays(Integer.parseInt(c[2])),end=anchor.plusDays(Integer.parseInt(c[3]));
            try {
                if(c[1].equals("INVERTED_DATES")) external.getAvailability(UUID.randomUUID(),start,end);
                else internal.batchLock(BatchLockRequest.builder().orderId(UUID.randomUUID()).items(List.of(
                    BatchLockRequest.LockItemRequest.builder().listingId(UUID.randomUUID()).startDate(start).endDate(end)
                        .quantity(Integer.parseInt(c[4])).build())).build());
            } catch(AppException expectedRejection) {outcome="REJECTED";}
              catch(RuntimeException unexpected) {outcome="ERROR";}
            boolean valid=Boolean.parseBoolean(c[5]);
            String expected=valid||version.equals("v0")?"ACCEPTED":"REJECTED";
            if(!outcome.equals(expected)) incorrect++;
            results.add(c[0]+","+c[1]+","+outcome);
        }
        Files.write(output,results,StandardCharsets.UTF_8);
        System.out.println("SHARED_CORPUS version="+version+" cases="+(results.size()-1)+" unexpected="+incorrect);
        assertEquals(0,incorrect,"Inspect the persisted per-input CSV before drawing a conclusion");
    }
}
