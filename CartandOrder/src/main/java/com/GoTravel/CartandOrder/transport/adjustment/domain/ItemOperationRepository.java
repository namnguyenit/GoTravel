package com.GoTravel.CartandOrder.transport.adjustment.domain;
import java.util.*;
import java.time.Instant;
public interface ItemOperationRepository {
 record Reason(String code,String text) {}
 record Operation(ItemOperationPlan plan,String state,Instant expiresAt,String resultJson,String error,int attempts,Reason reason) {
  public Operation(ItemOperationPlan plan,String state,Instant expiresAt,String resultJson,String error,int attempts){this(plan,state,expiresAt,resultJson,error,attempts,null);}
 }
 Operation get(UUID id);
 Operation insert(ItemOperationPlan plan);
 boolean transition(UUID id,String expected,String next,String resultJson);
 void retryLater(UUID id,String error);
 List<UUID> pending();
 boolean requestAbort(UUID operationId,UUID actorId,String reason);
}
