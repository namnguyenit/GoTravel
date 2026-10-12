package com.GoTravel.CartandOrder.transport.adjustment.infrastructure;
import com.GoTravel.CartandOrder.transport.adjustment.domain.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.jdbc.core.JdbcTemplate;
import java.sql.*;
import java.util.*;
@Repository @RequiredArgsConstructor
public class JdbcItemOperationRepository implements ItemOperationRepository {
 private final JdbcTemplate jdbc;private final ObjectMapper json;
 public Operation get(UUID id){return jdbc.query("select * from transport_item_operations where id=?",(rs,row)->map(rs),id).stream().findFirst().orElse(null);}
 private Operation map(ResultSet rs)throws SQLException {
  try{return new Operation(json.readValue(rs.getString("plan_json"),ItemOperationPlan.class),rs.getString("state"),rs.getTimestamp("expires_at").toInstant(),rs.getString("result_json"),rs.getString("error"),rs.getInt("attempts"));}
  catch(java.io.IOException e){throw new IllegalStateException("Corrupt item operation",e);}
 }
 public Operation insert(ItemOperationPlan p){
  try{jdbc.update("insert into transport_item_operations(id,order_id,item_id,kind,request_hash,plan_json,expires_at) values(?,?,?,?,?,?,?)",p.operationId(),p.orderId(),p.itemId(),p.kind(),p.requestHash(),json.writeValueAsString(p),Timestamp.from(p.expiresAt()));}
  catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException(e);}
  return get(p.operationId());
 }
 public boolean transition(UUID id,String expected,String next,String resultJson){return jdbc.update("update transport_item_operations set state=?,result_json=coalesce(?,result_json),error=case when ? in ('ABORTING','ABORTED','ABORT_REFUND_PENDING') then error else null end,attempts=0,next_attempt_at=now(),updated_at=now() where id=? and state=?",next,resultJson,next,id,expected)==1;}
 public void retryLater(UUID id,String error){jdbc.update("update transport_item_operations set attempts=attempts+1,error=?,next_attempt_at=now()+interval '30 seconds',updated_at=now() where id=? and state not in ('COMPLETED','ABORTED')",error.substring(0,Math.min(500,error.length())),id);}
 public boolean requestAbort(UUID id,UUID actor,String reason){return jdbc.update("update transport_item_operations set state='ABORTING',abort_requested_by=?,abort_reason=?,next_attempt_at=now(),updated_at=now() where id=? and state in ('PREPARED','HELD','WAITING_FUNDS')",actor,reason,id)==1;}
 public List<UUID> pending(){return jdbc.query("select id from transport_item_operations where state not in ('COMPLETED','ABORTED','REFUND_PENDING','ABORT_REFUND_PENDING') and next_attempt_at<=now() order by updated_at limit 50",(rs,row)->rs.getObject(1,UUID.class));}
}
