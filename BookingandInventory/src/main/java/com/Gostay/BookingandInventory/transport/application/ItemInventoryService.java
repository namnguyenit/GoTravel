package com.Gostay.BookingandInventory.transport.application;
import com.Gostay.BookingandInventory.transport.domain.ItemInventoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Service @RequiredArgsConstructor
public class ItemInventoryService {
 private final ItemInventoryPort port;
 public ItemInventoryPort.Result apply(ItemInventoryPort.Command c,String action) {
  if(c==null || c.operationId()==null || c.orderId()==null || c.itemId()==null || c.oldTripId()==null || c.oldSeatId()==null || c.expiresAt()==null || c.requestHash()==null || !c.requestHash().matches("[a-f0-9]{64}") || !java.util.List.of("CANCEL","EXCHANGE").contains(c.kind()) || !java.util.List.of("prepare","commit","complete","abort").contains(action)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  if("EXCHANGE".equals(c.kind()) && (c.newTripId()==null || c.newSeatId()==null || (c.oldTripId().equals(c.newTripId())&&c.oldSeatId().equals(c.newSeatId())))) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Ghế thay thế phải khác ghế cũ");
  return port.apply(c,action);
 }
 @org.springframework.scheduling.annotation.Scheduled(fixedDelay=15000)
 public void expireHolds(){for(var id:port.expired(100)){try{port.expire(id);}catch(RuntimeException e){org.slf4j.LoggerFactory.getLogger(getClass()).warn("Replacement hold {} retained for expiry retry",id);}}}
 public ItemInventoryPort.Result get(java.util.UUID id) {return port.get(id);}
}
