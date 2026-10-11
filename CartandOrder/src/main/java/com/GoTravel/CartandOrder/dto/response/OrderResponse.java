package com.GoTravel.CartandOrder.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private UUID orderId;
    private UUID userId;
    private UUID hostId;
    private String orderNumber;
    private String status;
    private String orderKind;
    private String paymentMethod;
    private BigDecimal totalAmount;
    private String currency;
    private OrderCustomerInfo customerInfo;
    private LocalDateTime expiresAt;
    private Boolean ticketEmailSent;
    private LocalDateTime ticketEmailSentAt;
    private String ticketEmailRecipient;
    private Integer ticketEmailAttempts;
    private LocalDateTime createdAt;
    private List<OrderItemResponse> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderCustomerInfo {
        private String fullName;
        private String email;
        private String phone;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemResponse {
        private UUID itemId;
        private UUID listingId;
        private UUID hostId;
        private UUID transportTripId;
        private UUID transportSeatId;
        private String transportSeatCode;
        private String passengerName;
        private UUID pickupStopId;
        private UUID dropoffStopId;
        private UUID transportTicketId;
        private String transportCheckInToken;
        private String listingTitle;
        private String thumbnailUrl;
        private LocalDate startDate;
        private LocalDate endDate;
        private String timeSlot;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
    }
}
