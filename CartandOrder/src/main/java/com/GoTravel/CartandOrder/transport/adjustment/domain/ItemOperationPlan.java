package com.GoTravel.CartandOrder.transport.adjustment.domain;
import java.util.UUID;
import java.time.Instant;
import java.math.BigDecimal;
public record ItemOperationPlan(
 UUID operationId,UUID orderId,UUID itemId,UUID actorId,String kind,String requestHash,
 UUID oldTicketId,int expectedRevision,UUID oldTripId,UUID oldSeatId,UUID newTripId,UUID newSeatId,
 String passengerName,UUID pickupStopId,UUID dropoffStopId,String newSeatCode,UUID newListingId,String newRouteTitle,Instant newDepartureAt,UUID quoteId,String quoteHash,
 UUID operatorId,UUID ownerUserId,UUID userId,String paymentMethod,
 @com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal originalAmount,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal originalOrderAmount,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal oldAmount,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal newAmount,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal fee,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal topup,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal refundDue,
 UUID originalCashShiftId,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal cashReceived,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal commissionRate,String commissionVersion,
 Instant expiresAt,boolean forcedTripCancellation) {}
