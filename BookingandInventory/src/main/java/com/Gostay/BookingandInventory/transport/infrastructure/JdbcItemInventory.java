package com.Gostay.BookingandInventory.transport.infrastructure;
import com.Gostay.BookingandInventory.transport.domain.ItemInventoryPort;
import com.Gostay.BookingandInventory.transport.domain.TransportInventoryRepository;
import com.Gostay.BookingandInventory.transport.domain.TransportInventory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
@Repository @RequiredArgsConstructor
public class JdbcItemInventory implements ItemInventoryPort {
 private final JdbcTemplate jdbc;
 private final TransportInventoryRepository inventory;
 private ResponseStatusException conflict(String message){return new ResponseStatusException(HttpStatus.CONFLICT,message);}
 public Result get(UUID id){return jdbc.query("select state,expires_at from transport_item_inventory_operations where operation_id=?",(rs,row)->new Result(id,rs.getString(1),rs.getTimestamp(2).toInstant()),id).stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
 @Transactional public Result apply(Command c,String action){
  inventory.lockKey(c.orderId());
  var saved=jdbc.queryForList("select * from transport_item_inventory_operations where operation_id=? for update",c.operationId());
  if(!saved.isEmpty()){
   var row=saved.get(0);
   if(!c.requestHash().equals(row.get("request_hash")) || !c.itemId().equals(row.get("item_id")) || !c.orderId().equals(row.get("order_id"))) throw conflict("Operation payload khác");
  }else if("abort".equals(action)) {
    jdbc.update("insert into transport_item_inventory_operations(operation_id,order_id,item_id,kind,request_hash,old_trip_id,old_seat_id,new_trip_id,new_seat_id,state,expires_at) values(?,?,?,?,?,?,?,?,?,'ABORTED',?)",c.operationId(),c.orderId(),c.itemId(),c.kind(),c.requestHash(),c.oldTripId(),c.oldSeatId(),c.newTripId(),c.newSeatId(),Timestamp.from(c.expiresAt()));
    return new Result(c.operationId(),"ABORTED",c.expiresAt());
  }
  else if(!"prepare".equals(action)) throw conflict("Chưa prepare inventory operation");
  var trips=new TreeSet<UUID>();trips.add(c.oldTripId());if(c.newTripId()!=null)trips.add(c.newTripId());
  for(UUID trip:trips) inventory.findTripForUpdate(trip).orElseThrow(()->conflict("Không có inventory chuyến"));
  if(saved.isEmpty()){
   var old=inventory.findSeatsForUpdate(c.oldTripId(),List.of(c.oldSeatId())).stream().findFirst().orElseThrow(()->conflict("Không có ghế cũ"));
   if(old.status()!=TransportInventory.SeatStatus.SOLD || !c.orderId().equals(old.orderId())) throw conflict("Ghế cũ không thuộc đơn đã trả tiền");
   var ownership=jdbc.queryForList("select * from transport_item_inventory where item_id=? for update",c.itemId());
   if(ownership.isEmpty()){
    // First registration must be backed by original order hold; a sold seat cannot be claimed twice.
    var hold=inventory.findHoldForUpdate(c.orderId()).orElseThrow(()->conflict("Không có hold gốc"));
    if(!hold.tripId().equals(c.oldTripId()) || !hold.seatIds().contains(c.oldSeatId()) || !hold.id().equals(old.holdId())) throw conflict("Ghế không khớp nguồn gốc");
    Integer occupied=jdbc.queryForObject("select count(*) from transport_item_inventory where trip_id=? and seat_id=? and state='SOLD'",Integer.class,c.oldTripId(),c.oldSeatId());
    if(occupied!=null&&occupied>0) throw conflict("Ghế đã gán cho item khác");
    jdbc.update("insert into transport_item_inventory(item_id,order_id,trip_id,seat_id,reservation_id) values(?,?,?,?,?)",c.itemId(),c.orderId(),c.oldTripId(),c.oldSeatId(),old.holdId());
   }else{
    var mapped=ownership.get(0);
    if(!c.orderId().equals(mapped.get("order_id")) || !c.oldTripId().equals(mapped.get("trip_id")) || !c.oldSeatId().equals(mapped.get("seat_id")) || !"SOLD".equals(mapped.get("state")))throw conflict("Item inventory không khớp");
   }
   if(!c.expiresAt().isAfter(Instant.now()))throw conflict("Operation hết hạn");
   if("EXCHANGE".equals(c.kind())){
    var target=inventory.findTripForUpdate(c.newTripId()).orElseThrow();
    if(!target.saleEnabled()||!target.departureAt().isAfter(c.expiresAt()))throw conflict("Chuyến thay thế không mở bán");
    var seat=inventory.findSeatsForUpdate(c.newTripId(),List.of(c.newSeatId())).stream().findFirst().orElseThrow(()->conflict("Không có ghế mới"));
    if(seat.status()!=TransportInventory.SeatStatus.AVAILABLE)throw conflict("Ghế thay thế đã có người giữ/bán");
    inventory.updateSeats(List.of(seat.change(TransportInventory.SeatStatus.HELD,c.orderId(),c.operationId(),c.expiresAt())));
   }
   jdbc.update("insert into transport_item_inventory_operations(operation_id,order_id,item_id,kind,request_hash,old_trip_id,old_seat_id,new_trip_id,new_seat_id,state,expires_at) values(?,?,?,?,?,?,?,?,?,'HELD',?)",c.operationId(),c.orderId(),c.itemId(),c.kind(),c.requestHash(),c.oldTripId(),c.oldSeatId(),c.newTripId(),c.newSeatId(),Timestamp.from(c.expiresAt()));
  }
  Result current=get(c.operationId());
  if("prepare".equals(action)||"COMPLETED".equals(current.state())||"ABORTED".equals(current.state()))return current;
  if("abort".equals(action)){
   if(!List.of("HELD","COMMITTED").contains(current.state()))throw conflict("Inventory đã hoàn tất; cần đối soát");
   if("EXCHANGE".equals(c.kind()))release(c.newTripId(),c.newSeatId(),c.orderId(),c.operationId(),"COMMITTED".equals(current.state())?TransportInventory.SeatStatus.SOLD:TransportInventory.SeatStatus.HELD);
   jdbc.update("update transport_item_inventory_operations set state='ABORTED' where operation_id=?",c.operationId());
  }else if("commit".equals(action)){
   if("COMMITTED".equals(current.state()))return current;
   if(!current.expiresAt().isAfter(Instant.now()))throw conflict("Giữ ghế thay thế đã hết hạn");
   if("EXCHANGE".equals(c.kind())){
    var target=inventory.findTripForUpdate(c.newTripId()).orElseThrow();
    if(!target.saleEnabled()||!target.departureAt().isAfter(Instant.now()))throw conflict("Chuyến thay thế ngừng bán/hủy");
    var seat=inventory.findSeatsForUpdate(c.newTripId(),List.of(c.newSeatId())).get(0);
    if(seat.status()!=TransportInventory.SeatStatus.HELD||!c.operationId().equals(seat.holdId())||!c.orderId().equals(seat.orderId()))throw conflict("Không sở hữu hold thay thế");
    inventory.updateSeats(List.of(seat.change(TransportInventory.SeatStatus.SOLD,c.orderId(),c.operationId(),null)));
   }
   jdbc.update("update transport_item_inventory_operations set state='COMMITTED' where operation_id=?",c.operationId());
  }else if("complete".equals(action)){
   if(!"COMMITTED".equals(current.state()))throw conflict("Chưa commit ghế thay thế");
   var old=inventory.findSeatsForUpdate(c.oldTripId(),List.of(c.oldSeatId())).get(0);
   if(old.status()!=TransportInventory.SeatStatus.SOLD||!c.orderId().equals(old.orderId()))throw conflict("Ghế cũ không còn khớp");
   inventory.updateSeats(List.of(old.change(TransportInventory.SeatStatus.AVAILABLE,null,null,null)));
   if("EXCHANGE".equals(c.kind()))jdbc.update("update transport_item_inventory set trip_id=?,seat_id=?,reservation_id=? where item_id=?",c.newTripId(),c.newSeatId(),c.operationId(),c.itemId());
   else jdbc.update("update transport_item_inventory set state='CANCELLED' where item_id=?",c.itemId());
   jdbc.update("update transport_item_inventory_operations set state='COMPLETED' where operation_id=?",c.operationId());
  }
  return get(c.operationId());
 }
 public List<UUID> expired(int limit){return jdbc.query("select operation_id from transport_item_inventory_operations where state='HELD' and expires_at<=now() order by expires_at limit ?",(rs,row)->rs.getObject(1,UUID.class),limit);}
 @Transactional public void expire(UUID id){
  var values=jdbc.queryForList("select * from transport_item_inventory_operations where operation_id=?",id);
  if(values.isEmpty())return;var initial=values.get(0);inventory.lockKey((UUID)initial.get("order_id"));
  var row=jdbc.queryForMap("select * from transport_item_inventory_operations where operation_id=? for update",id);
  if(!"HELD".equals(row.get("state")) || ((Timestamp)row.get("expires_at")).toInstant().isAfter(Instant.now()))return;
  if("EXCHANGE".equals(row.get("kind"))){
   UUID trip=(UUID)row.get("new_trip_id");inventory.findTripForUpdate(trip).orElseThrow();
   release(trip,(UUID)row.get("new_seat_id"),(UUID)row.get("order_id"),id,TransportInventory.SeatStatus.HELD);
  }
  jdbc.update("update transport_item_inventory_operations set state='ABORTED' where operation_id=? and state='HELD'",id);
 }
 private void release(UUID tripId,UUID seatId,UUID orderId,UUID reservationId,TransportInventory.SeatStatus expected){
  var seat=inventory.findSeatsForUpdate(tripId,List.of(seatId)).get(0);
  if(seat.status()!=expected||!orderId.equals(seat.orderId())||!reservationId.equals(seat.holdId()))throw conflict("Reservation không khớp");
  inventory.updateSeats(List.of(seat.change(TransportInventory.SeatStatus.AVAILABLE,null,null,null)));
 }
}
