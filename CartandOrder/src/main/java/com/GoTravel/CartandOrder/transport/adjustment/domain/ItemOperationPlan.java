package com.GoTravel.CartandOrder.transport.adjustment.domain;
import java.util.UUID;
import java.time.Instant;
import java.math.BigDecimal;
public record ItemOperationPlan(
 UUID operationId,UUID orderId,UUID itemId,UUID actorId,String kind,String requestHash,
 UUID oldTicketId,int expectedRevision,UUID oldTripId,UUID oldSeatId,UUID newTripId,UUID newSeatId,
 String passengerName,UUID pickupStopId,UUID dropoffStopId,String newSeatCode,UUID newListingId,String newRouteTitle,Instant newDepartureAt,UUID quoteId,String quoteHash,
 UUID operatorId,UUID ownerUserId,UUID userId,String paymentMethod,
 BigDecimal originalAmount,BigDecimal originalOrderAmount,BigDecimal oldAmount,BigDecimal newAmount,BigDecimal fee,BigDecimal topup,BigDecimal refundDue,
 UUID originalCashShiftId,BigDecimal cashReceived,BigDecimal commissionRate,String commissionVersion,
 Instant expiresAt,boolean forcedTripCancellation) {}
