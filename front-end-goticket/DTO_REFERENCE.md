# DTO_REFERENCE — schema và validation source snapshot

Đọc loại tương ứng signature trong API_REFERENCE. Snapshot ngày 11/10/2026, không phải generated OpenAPI hoặc xác nhận runtime. Có DTO dùng chung ngoài GoTicket; không implement STAY/EXP/SVC chỉ vì DTO xuất hiện. Source backend mới nhất là authoritative nếu sau này snapshot lệch.

DTO cùng tên ở service khác nhau không thể dùng lẫn. Lombok private fields là JSON properties bình thường; BigDecimal có JsonFormat STRING thì giữ string, legacy numeric cần adapter/lossless handling. Domain ItemOperationPlan/internal proof không được gửi từ browser.

Inline request records trong controller và View/Preview/service records xem phần bổ sung cuối tài liệu và source link API. User ID/role không lấy từ body để quyết định authorization.

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/request/BatchLockRequest.java

```java
package com.GoTravel.CartandOrder.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchLockRequest {
    @NotNull(message = "Order ID không được để trống")
    private UUID orderId;

    @NotEmpty(message = "Danh sách lock không được để trống")
    @Valid
    private List<LockItemRequest> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LockItemRequest {
        @NotNull(message = "Listing ID không được để trống")
        private UUID listingId;

        @NotNull(message = "Ngày bắt đầu không được để trống")
        @FutureOrPresent(message = "Ngày bắt đầu không được ở quá khứ")
        private LocalDate startDate;

        @NotNull(message = "Ngày kết thúc không được để trống")
        @FutureOrPresent(message = "Ngày kết thúc không được ở quá khứ")
        private LocalDate endDate;

        private String timeSlot;

        @NotNull(message = "Số lượng không được để trống")
        @Min(value = 1, message = "Số lượng phải lớn hơn 0")
        private Integer quantity;

        @AssertTrue(message = "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu")
        public boolean isDateRangeValid() {
            if (startDate == null || endDate == null) {
                return true;
            }

            return !endDate.isBefore(startDate);
        }
    }
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/request/BookNowRequest.java

```java
package com.GoTravel.CartandOrder.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookNowRequest {
    @NotNull(message = "Thông tin item không được để trống")
    @Valid
    private CartItemRequest item;
    
    @NotBlank(message = "Họ tên khách hàng không được để trống")
    private String fullName;

    @NotBlank(message = "Email khách hàng không được để trống")
    @Email(message = "Email khách hàng không hợp lệ")
    private String email;

    @NotBlank(message = "Số điện thoại khách hàng không được để trống")
    private String phone;
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/request/CartItemRequest.java

```java
package com.GoTravel.CartandOrder.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemRequest {
    @NotNull(message = "Listing ID không được để trống")
    private UUID listingId;

    private UUID hostId;
    
    private String listingTitle;
    
    private String thumbnailUrl;
    
    @NotNull(message = "Ngày bắt đầu không được để trống")
    @FutureOrPresent(message = "Ngày bắt đầu không được ở quá khứ")
    private LocalDate startDate;
    
    @NotNull(message = "Ngày kết thúc không được để trống")
    @FutureOrPresent(message = "Ngày kết thúc không được ở quá khứ")
    private LocalDate endDate;
    
    private String timeSlot;
    
    @NotNull(message = "Số lượng không được để trống")
    @Min(value = 1, message = "Số lượng phải lớn hơn 0")
    private Integer quantity;
    
    private BigDecimal unitPrice;

    @AssertTrue(message = "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu")
    public boolean isDateRangeValid() {
        if (startDate == null || endDate == null) {
            return true;
        }

        return !endDate.isBefore(startDate);
    }
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/request/CheckoutCartRequest.java

```java
package com.GoTravel.CartandOrder.dto.request;

import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import com.GoTravel.CartandOrder.entity.Order;

@Data
public class CheckoutCartRequest {
    @NotNull(message = "Danh sách itemIds không được để trống")
    @NotEmpty(message = "Phải chọn ít nhất 1 dịch vụ để thanh toán")
    private List<UUID> itemIds;

    @NotNull(message = "Thông tin khách hàng không được để trống")
    @Valid
    private Order.CustomerInfo customerInfo;
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/request/CreateOrderDisputeRequest.java

```java
package com.GoTravel.CartandOrder.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateOrderDisputeRequest {
    @NotNull(message = "Order ID không được để trống")
    private UUID orderId;

    @NotBlank(message = "Lý do khiếu nại không được để trống")
    private String reason;

    private String description;
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/request/ForceCancelOrderRequest.java

```java
package com.GoTravel.CartandOrder.dto.request;

import lombok.Data;

@Data
public class ForceCancelOrderRequest {
    private String reason;
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/request/RefundEmailRequest.java

```java
package com.GoTravel.CartandOrder.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundEmailRequest {
    private String to;
    private String customerName;
    private UUID orderId;
    private String orderNumber;
    private BigDecimal refundAmount;
    private BigDecimal totalAmount;
    private String currency;
    private String reason;
    private String orderUrl;
    private List<RefundEmailItem> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RefundEmailItem {
        private UUID listingId;
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
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/request/RefundOrderRequest.java

```java
package com.GoTravel.CartandOrder.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundOrderRequest {
    private String reason;
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/request/ResolveOrderDisputeRequest.java

```java
package com.GoTravel.CartandOrder.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResolveOrderDisputeRequest {
    @NotBlank(message = "Action không được để trống")
    private String action;

    private String adminNote;
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/request/TicketEmailRequest.java

```java
package com.GoTravel.CartandOrder.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketEmailRequest {
    private String to;
    private String customerName;
    private UUID orderId;
    private String orderNumber;
    private BigDecimal totalAmount;
    private String currency;
    private String ticketUrl;
    private String qrImageUrl;
    private List<TicketEmailItem> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TicketEmailItem {
        private UUID listingId;
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
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/request/UpdateCartItemRequest.java

```java
package com.GoTravel.CartandOrder.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCartItemRequest {
    @FutureOrPresent(message = "Ngày bắt đầu không được ở quá khứ")
    private LocalDate startDate;

    @FutureOrPresent(message = "Ngày kết thúc không được ở quá khứ")
    private LocalDate endDate;

    private String timeSlot;

    @Min(value = 1, message = "Số lượng phải lớn hơn 0")
    private Integer quantity;

    @AssertTrue(message = "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu")
    public boolean isDateRangeValid() {
        if (startDate == null || endDate == null) {
            return true;
        }

        return !endDate.isBefore(startDate);
    }
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/response/AdminOrderSummaryResponse.java

```java
package com.GoTravel.CartandOrder.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminOrderSummaryResponse {
    private long totalOrders;
    private long pendingOrders;
    private long paymentPendingOrders;
    private long confirmedOrders;
    private long completedOrders;
    private long cancelledOrders;
    private BigDecimal totalOrderAmount;
    private BigDecimal confirmedOrderAmount;
    private BigDecimal completedOrderAmount;
    private BigDecimal cancelledOrderAmount;
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/response/ApiResponse.java

```java
package com.GoTravel.CartandOrder.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    @Builder.Default
    private final boolean success = false;
    private final int status;
    private final String code;
    private final String message;
    private final T data;

    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .status(200)
                .code("SUCCESS")
                .message(message)
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> success(String message) {
        return success(message, null);
    }

    public static <T> ApiResponse<T> success(T data) {
        return success("Thành công", data);
    }

    public static <T> ApiResponse<T> created(String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .status(201)
                .code("CREATED")
                .message(message)
                .build();
    }

    public static <T> ApiResponse<T> error(int status, String code, String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .status(status)
                .code(code)
                .message(message)
                .build();
    }
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/response/BatchLockResponse.java

```java
package com.GoTravel.CartandOrder.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchLockResponse {
    private LocalDateTime expiresAt;
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/response/CartResponse.java

```java
package com.GoTravel.CartandOrder.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartResponse {
    private UUID cartId;
    private UUID userId;
    private List<CartItemResponse> items;
    private BigDecimal cartTotal;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CartItemResponse {
        private UUID itemId;
        private UUID listingId;
        private UUID hostId;
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
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/response/CatalogListingResponse.java

```java
package com.GoTravel.CartandOrder.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CatalogListingResponse {
    private UUID id;
    private UUID hostId;
    private String title;
    private BigDecimal basePrice;
    private String thumbnailUrl;
    private String status;
    private String category;
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/response/EmailSendResponse.java

```java
package com.GoTravel.CartandOrder.dto.response;

import lombok.Data;

import java.util.List;

@Data
public class EmailSendResponse {
    private String messageId;
    private List<String> accepted;
    private List<String> rejected;
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/response/OrderDisputeResponse.java

```java
package com.GoTravel.CartandOrder.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderDisputeResponse {
    private UUID disputeId;
    private UUID orderId;
    private UUID userId;
    private String orderNumber;
    private String orderStatus;
    private BigDecimal orderAmount;
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private String reason;
    private String description;
    private String status;
    private String adminNote;
    private UUID resolvedBy;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/response/OrderPaymentSummaryResponse.java

```java
package com.GoTravel.CartandOrder.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderPaymentSummaryResponse {
    private UUID orderId;
    private UUID userId;
    private UUID hostId;
    private String orderKind;
    private String providerType;
    private java.math.BigDecimal transportRefundDue;
    private java.math.BigDecimal transportCancellationFee;
    private BigDecimal totalAmount;
    private String currency;
    private String status;
    private LocalDateTime expiresAt;
    private List<ProviderBreakdown> providerBreakdowns;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProviderBreakdown {
        private UUID hostId;
        private BigDecimal totalAmount;
    }
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/dto/response/OrderResponse.java

```java
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
    @com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING)
    private BigDecimal transportActiveFareAmount;
    private String transportOriginalChargeVnd;
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
        private String transportBoardingStatus;
        private String transportCheckInToken;
        private Integer transportTicketRevision;
        private String transportItemState;
        private BigDecimal transportRefundTotal;
        private String transportFareVnd;
        private String transportRefundedVnd;
        private java.time.LocalDateTime transportDepartureAt;
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
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/enums/DisputeStatus.java

```java
package com.GoTravel.CartandOrder.enums;

public enum DisputeStatus {
    OPEN,
    IN_REVIEW,
    RESOLVED,
    REJECTED,
    REFUNDED
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/enums/OrderKind.java

```java
package com.GoTravel.CartandOrder.enums;

public enum OrderKind {
    GOTRAVEL_LISTING,
    GOCAR_TICKET
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/enums/OrderStatus.java

```java
package com.GoTravel.CartandOrder.enums;

public enum OrderStatus {
    PENDING,
    PAYMENT_PENDING,
    CASH_PENDING,
    FULFILLMENT_PENDING,
    CANCELLATION_PENDING,
    PAID_REVIEW,
    CASH_RECEIVED_PENDING_RECONCILIATION,
    REFUND_PENDING,
    REFUNDED,
    CONFIRMED,
    CANCELLED,
    COMPLETED
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/enums/PaymentMethod.java

```java
package com.GoTravel.CartandOrder.enums;

public enum PaymentMethod {
    ONLINE,
    CASH
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportCheckoutRequest.java

```java
package com.GoTravel.CartandOrder.transport;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record TransportCheckoutRequest(
        @NotNull UUID tripId,
        @NotBlank @Size(max = 255) String fullName,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(max = 30) String phone,
        @NotEmpty List<@Valid Passenger> passengers
) {
    public record Passenger(
            @NotNull UUID seatId,
            @NotBlank @Size(max = 255) String name,
            @NotNull UUID pickupStopId,
            @NotNull UUID dropoffStopId
    ) {}
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportQuote.java

```java
package com.GoTravel.CartandOrder.transport;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TransportQuote(
        UUID tripId, UUID listingId, UUID operatorId, UUID operatorUserId,
        String routeTitle, Instant departureAt, Instant expiresAt,
        BigDecimal totalAmount, String currency, List<SeatQuote> seats,
        UUID quoteId, String quoteVersion, String quoteHash
) {
    public record SeatQuote(UUID seatId, String code, BigDecimal price) {}
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/domain/ItemOperationPlan.java

```java
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
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/domain/ItemOperationRepository.java

```java
package com.GoTravel.CartandOrder.transport.adjustment.domain;
import java.util.*;
import java.time.Instant;
public interface ItemOperationRepository {
 record Operation(ItemOperationPlan plan,String state,Instant expiresAt,String resultJson,String error,int attempts) {}
 Operation get(UUID id);
 Operation insert(ItemOperationPlan plan);
 boolean transition(UUID id,String expected,String next,String resultJson);
 void retryLater(UUID id,String error);
 List<UUID> pending();
 boolean requestAbort(UUID operationId,UUID actorId,String reason);
}
```

## CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/cash/domain/CashLedger.java

```java
package com.GoTravel.CartandOrder.transport.cash.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import java.util.List;

public interface CashLedger {
    record Shift(UUID id, UUID actorId, UUID operatorId, Instant openedAt,
                 String commissionVersion, BigDecimal commissionRate) {}
    record Receipt(UUID id, String receiptNo, UUID orderId, UUID shiftId, BigDecimal amount,
                   Instant receivedAt) {}
    record ClosedShift(UUID id, BigDecimal grossAmount, BigDecimal cashRefundAmount,
                       BigDecimal expectedAmount, BigDecimal countedAmount,
                       BigDecimal variance, BigDecimal commissionDue,
                       String commissionVersion) {}
    record Settlement(UUID shiftId, UUID operatorId, BigDecimal grossAmount,
                      BigDecimal commissionDue, String commissionVersion,
                      BigDecimal commissionRate) {}
    record RefundAdjustment(UUID orderId, UUID shiftId, UUID operatorId,
                            BigDecimal refundAmount, BigDecimal commissionReversal,
                            String commissionVersion, BigDecimal commissionRate) {}
    record ShiftDetail(UUID id, UUID actorId, UUID operatorId, Instant openedAt, Instant closedAt,
                       BigDecimal grossAmount, BigDecimal expectedAmount, BigDecimal countedAmount,
                       BigDecimal variance, BigDecimal commissionDue, String commissionVersion,
                       List<Receipt> receipts,List<java.util.Map<String,Object>> adjustments) {}

    Shift open(UUID actorId, UUID operatorId, String commissionVersion, BigDecimal commissionRate);
    Shift active(UUID actorId);
    Receipt record(UUID orderId, UUID shiftId, UUID actorId, UUID operatorId, BigDecimal amount);
    Receipt findReceipt(UUID orderId);
    ClosedShift close(UUID actorId, BigDecimal countedAmount);
    List<Shift> listShiftsByOperator(UUID operatorId, int limit, int offset);
    List<Shift> listShiftsByActor(UUID actorId, int limit);
    ShiftDetail findShiftDetail(UUID shiftId);
    List<Settlement> pendingSettlements(int limit);
    void markSettlementSent(UUID shiftId);
    List<RefundAdjustment> pendingRefundAdjustments(int limit);
    void markRefundAdjustmentSent(UUID orderId);
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/request/InitializeInventoryRequest.java

```java
package com.Listing.CatalogandListing.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InitializeInventoryRequest {
    private UUID listingId;
    private Integer totalQuantity;
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/request/complex/CreateComplexRequest.java

```java
package com.Listing.CatalogandListing.dto.request.complex;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateComplexRequest {
    @NotBlank(message = "Tên Tổ hợp không được để trống")
    private String name;

    private String description;

    @NotBlank(message = "Tỉnh/Thành phố không được để trống")
    private String province;

    @NotNull(message = "Vĩ độ không được để trống")
    @DecimalMin(value = "-90.0", message = "Vĩ độ phải nằm trong khoảng [-90, 90]")
    @DecimalMax(value = "90.0", message = "Vĩ độ phải nằm trong khoảng [-90, 90]")
    private Double latitude;

    @NotNull(message = "Kinh độ không được để trống")
    @DecimalMin(value = "-180.0", message = "Kinh độ phải nằm trong khoảng [-180, 180]")
    @DecimalMax(value = "180.0", message = "Kinh độ phải nằm trong khoảng [-180, 180]")
    private Double longitude;

    private String thumbnailUrl;

    private List<String> galleryUrls;
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/request/landmark/SaveLandmarkRequest.java

```java
package com.Listing.CatalogandListing.dto.request.landmark;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaveLandmarkRequest {
    @NotBlank(message = "Tên địa danh không được để trống")
    private String name;

    private String description;

    @NotBlank(message = "Tỉnh/Thành phố không được để trống")
    private String province;

    @NotNull(message = "Vĩ độ không được để trống")
    @DecimalMin(value = "-90.0", message = "Vĩ độ phải nằm trong khoảng [-90, 90]")
    @DecimalMax(value = "90.0", message = "Vĩ độ phải nằm trong khoảng [-90, 90]")
    private Double latitude;

    @NotNull(message = "Kinh độ không được để trống")
    @DecimalMin(value = "-180.0", message = "Kinh độ phải nằm trong khoảng [-180, 180]")
    @DecimalMax(value = "180.0", message = "Kinh độ phải nằm trong khoảng [-180, 180]")
    private Double longitude;

    private Integer radiusMeters;
    
    private String thumbnailUrl;
    
    private List<String> galleryUrls;

    private UUID resolvedSuggestionId;

    private Boolean isFeatured;
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/request/landmark/SuggestLandmarkRequest.java

```java
package com.Listing.CatalogandListing.dto.request.landmark;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SuggestLandmarkRequest {
    @NotBlank(message = "Tên địa danh không được để trống")
    private String name;

    private String description;

    @NotBlank(message = "Tỉnh/Thành phố không được để trống")
    private String suggestedProvince;

    @NotNull(message = "Vĩ độ không được để trống")
    @DecimalMin(value = "-90.0", message = "Vĩ độ phải nằm trong khoảng [-90, 90]")
    @DecimalMax(value = "90.0", message = "Vĩ độ phải nằm trong khoảng [-90, 90]")
    private Double suggestedLatitude;

    @NotNull(message = "Kinh độ không được để trống")
    @DecimalMin(value = "-180.0", message = "Kinh độ phải nằm trong khoảng [-180, 180]")
    @DecimalMax(value = "180.0", message = "Kinh độ phải nằm trong khoảng [-180, 180]")
    private Double suggestedLongitude;

    private String referenceImageUrl;

    private String thumbnailUrl;
    private java.util.List<String> galleryUrls;
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/request/landmark/UpdateLandmarkStatusRequest.java

```java
package com.Listing.CatalogandListing.dto.request.landmark;

import com.Listing.CatalogandListing.enums.LandmarkStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateLandmarkStatusRequest {
    @NotNull(message = "Status cannot be null")
    private LandmarkStatus status;
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/request/landmark/UpdateSuggestionStatusRequest.java

```java
package com.Listing.CatalogandListing.dto.request.landmark;

import com.Listing.CatalogandListing.enums.SuggestionStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateSuggestionStatusRequest {
    @NotNull(message = "Status cannot be null")
    private SuggestionStatus status;
    private String rejectReason;
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/request/listing/SaveListingRequest.java

```java
package com.Listing.CatalogandListing.dto.request.listing;

import com.Listing.CatalogandListing.entity.attributes.BaseListingAttributes;
import com.Listing.CatalogandListing.enums.ListingCategory;
import com.Listing.CatalogandListing.enums.PriceUnit;
import com.Listing.CatalogandListing.enums.SubCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaveListingRequest {
    private UUID complexId;

    @NotNull(message = "Category không được để trống")
    private ListingCategory category;

    @NotNull(message = "SubCategory không được để trống")
    private SubCategory subCategory;

    @NotBlank(message = "Title không được để trống")
    private String title;

    private String description;

    @NotBlank(message = "Province không được để trống")
    private String province;

    @NotNull(message = "Base price không được để trống")
    @DecimalMin(value = "0.0", inclusive = false, message = "Giá cơ bản phải lớn hơn 0")
    private BigDecimal basePrice;

    @NotNull(message = "Price unit không được để trống")
    private PriceUnit priceUnit;

    @NotNull(message = "Latitude không được để trống")
    @DecimalMin(value = "-90.0", message = "Latitude phải nằm trong khoảng [-90, 90]")
    @DecimalMax(value = "90.0", message = "Latitude phải nằm trong khoảng [-90, 90]")
    private Double latitude;

    @NotNull(message = "Longitude không được để trống")
    @DecimalMin(value = "-180.0", message = "Longitude phải nằm trong khoảng [-180, 180]")
    @DecimalMax(value = "180.0", message = "Longitude phải nằm trong khoảng [-180, 180]")
    private Double longitude;

    private String thumbnailUrl;

    @Valid
    @NotNull(message = "Attributes không được để trống")
    private BaseListingAttributes attributes;
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/request/review/SubmitReviewRequest.java

```java
package com.Listing.CatalogandListing.dto.request.review;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmitReviewRequest {
    @NotNull(message = "Listing ID không được để trống")
    private UUID listingId;

    @NotNull(message = "Rating không được để trống")
    @Min(value = 1, message = "Rating nhỏ nhất là 1")
    @Max(value = 5, message = "Rating lớn nhất là 5")
    private Integer rating;

    @NotBlank(message = "Comment không được để trống")
    private String comment;

    private List<String> images;
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/request/shared/ChangeStatusRequest.java

```java
package com.Listing.CatalogandListing.dto.request.shared;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangeStatusRequest {
    @NotBlank(message = "Status không được để trống")
    private String status;
    
    private String rejectReason;
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/response/AdminCatalogSummaryResponse.java

```java
package com.Listing.CatalogandListing.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminCatalogSummaryResponse {
    private long totalListings;
    private long activeListings;
    private long pendingListings;
    private long hiddenListings;
    private long deletedListings;
    private long totalLandmarks;
    private long activeLandmarks;
    private long hiddenLandmarks;
    private long maintenanceLandmarks;
    private long featuredLandmarks;
    private long totalLandmarkSuggestions;
    private long pendingLandmarkSuggestions;
    private long resolvedLandmarkSuggestions;
    private long rejectedLandmarkSuggestions;
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/response/ApiResponse.java

```java
package com.Listing.CatalogandListing.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private boolean success;
    private int code;
    private String message;
    private T data;

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, 200, "Success", data);
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, 200, message, data);
    }

    public static <T> ApiResponse<T> created(String message, T data) {
        return new ApiResponse<>(true, 201, message, data);
    }

    public static <T> ApiResponse<T> created(String message) {
        return new ApiResponse<>(true, 201, message, null);
    }

    public static <T> ApiResponse<T> success(String message) {
        return new ApiResponse<>(true, 200, message, null);
    }
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/response/ComplexResponse.java

```java
package com.Listing.CatalogandListing.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;
import java.util.UUID;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ComplexResponse {
    UUID id;
    String name;
    String description;
    String province;
    String district;
    String ward;
    String streetAddress;
    Double latitude;
    Double longitude;
    String status;
    LocalDateTime createdAt;
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/response/IdentityApiResponse.java

```java
package com.Listing.CatalogandListing.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonIgnoreProperties(ignoreUnknown = true)
public class IdentityApiResponse<T> {
    boolean success;
    Integer status;
    String code;
    String message;
    T data;
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/response/ListingDetailResponse.java

```java
package com.Listing.CatalogandListing.dto.response;

import com.Listing.CatalogandListing.entity.attributes.BaseListingAttributes;
import com.Listing.CatalogandListing.enums.ListingCategory;
import com.Listing.CatalogandListing.enums.ListingStatus;
import com.Listing.CatalogandListing.enums.PriceUnit;
import com.Listing.CatalogandListing.enums.SubCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListingDetailResponse {
    private UUID id;
    private UUID hostId;
    private UUID complexId;
    private String title;
    private String description;
    private String province;
    private ListingCategory category;
    private SubCategory subCategory;
    private BigDecimal basePrice;
    private PriceUnit priceUnit;
    private Double latitude;
    private Double longitude;
    private String thumbnailUrl;
    private BigDecimal averageRating;
    private Integer totalReviews;
    private ListingStatus status;
    private BaseListingAttributes attributes;
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/response/OrderCompletionResponse.java

```java
package com.Listing.CatalogandListing.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class OrderCompletionResponse {
    private Boolean success;
    private Integer status;
    private String code;
    private String message;
    private Boolean data;
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/response/PaginationResponse.java

```java
package com.Listing.CatalogandListing.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaginationResponse<T> {
    private List<T> content;
    private int totalPages;
    private long totalElements;
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/response/ReviewItemResponse.java

```java
package com.Listing.CatalogandListing.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewItemResponse {
    private UUID id;
    private UUID userId;
    private String userName;
    private String userAvatar;
    private Integer rating;
    private String comment;
    private List<String> images;
    private LocalDateTime createdAt;
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/dto/response/UserStatusResponse.java

```java
package com.Listing.CatalogandListing.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserStatusResponse {
    Boolean isActive;
    Boolean isDeleted;
    Boolean isAllowed;
    String hostApprovalStatus;
    String enterpriseApprovalStatus;
    String ticketVendorApprovalStatus;
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/enums/ComplexStatus.java

```java
package com.Listing.CatalogandListing.enums;

public enum ComplexStatus {
    ACTIVE, HIDDEN
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/enums/LandmarkStatus.java

```java
package com.Listing.CatalogandListing.enums;

public enum LandmarkStatus {
    ACTIVE, MAINTENANCE, HIDDEN
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/enums/ListingStatus.java

```java
package com.Listing.CatalogandListing.enums;

public enum ListingStatus {
    PENDING, ACTIVE, HIDDEN, DELETED
}
```

## CatalogandListing/src/main/java/com/Listing/CatalogandListing/enums/SuggestionStatus.java

```java
package com.Listing.CatalogandListing.enums;

public enum SuggestionStatus {
    PENDING, RESOLVED, REJECTED
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/request/AccountStatusRequest.java

```java
package com.gotravel.Identity.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AccountStatusRequest {
    String status; // BANNED, ACTIVE
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/request/ApiRequest.java

```java
package com.gotravel.Identity.dto.request;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.gotravel.Identity.exception.ErrorCode;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiRequest <T>{
    @Builder.Default
    boolean success = true;
    @Builder.Default
    int status = 200;
    String code;
    String message;
    T data;

    public static <T> ApiRequest<T> success(ErrorCode successCode, T data) {
        return success(successCode, data, successCode.isSuccess());
    }

    public static <T> ApiRequest<T> success(ErrorCode successCode, T data, boolean success) {
        return ApiRequest.<T>builder()
                .success(success)
                .status(successCode.getStatus())
                .code(successCode.getCode())
                .message(successCode.getMessage())
                .data(data)
                .build();
    }

    public static <T> ApiRequest<T> success(ErrorCode successCode) {
        return success(successCode, null);
    }
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/request/ApprovalRequest.java

```java
package com.gotravel.Identity.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ApprovalRequest {
    @NotBlank
    String status; // APPROVED, REJECTED
    @Size(max = 1000)
    String reason;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/request/AuthenticationRequest.java

```java
package com.gotravel.Identity.dto.request;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuthenticationRequest {
    String username;
    String password;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/request/BankAccountRequest.java

```java
package com.gotravel.Identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BankAccountRequest {
    @NotBlank(message = "Tên ngân hàng không được để trống")
    String bankName;

    @NotBlank(message = "Số tài khoản không được để trống")
    String bankAccount;

    @NotBlank(message = "Tên chủ tài khoản không được để trống")
    String bankAccountName;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/request/EnterpriseProfileRequest.java

```java
package com.gotravel.Identity.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class EnterpriseProfileRequest {
    String companyName;
    String taxCode;
    String companyAddress;
    String representativeName;
    String bankAccount;
    String bankName;
    String bankAccountName;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/request/ForgotPasswordRequest.java

```java
package com.gotravel.Identity.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ForgotPasswordRequest {
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    String email;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/request/HostProfileRequest.java

```java
package com.gotravel.Identity.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HostProfileRequest {
    String fullName;
    String phone;
    String cccdNumber;
    String taxCode;
    String idCard;
    String bankAccount;
    String bankName;
    String bankAccountName;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/request/ResetPasswordRequest.java

```java
package com.gotravel.Identity.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ResetPasswordRequest {
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    String email;

    @NotBlank(message = "Mã xác thực không được để trống")
    String otp;

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Size(min = 8, message = "Mật khẩu phải có tối thiểu 8 ký tự")
    String newPassword;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/request/TicketVendorApplicationRequest.java

```java
package com.gotravel.Identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TicketVendorApplicationRequest {
    @NotBlank
    @Size(max = 255)
    String companyName;

    @NotBlank
    @Size(max = 255)
    String companyAddress;

    @NotBlank
    @Size(max = 255)
    String representativeName;

    @NotBlank
    @Size(max = 30)
    String representativeIdNumber;

    @Size(max = 50)
    String taxCode;

    @Pattern(regexp = "^(?:[0-9]{10,11})?$")
    String contactPhone;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/request/UserProfileRequest.java

```java
package com.gotravel.Identity.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserProfileRequest {
    String fullName;
    String phoneNumber;
    LocalDate dateOfBirth;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/request/UserRequest.java

```java
package com.gotravel.Identity.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Builder
public class UserRequest {
    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3 đến 50 ký tự")
    String username;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 8, message = "Mật khẩu phải từ 8 ký tự trở lên")
    String password;
    
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    String email;
    
    @NotBlank(message = "Họ và tên không được để trống")
    String fullName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^[0-9]{10,11}$", message = "Số điện thoại phải từ 10 đến 11 chữ số")
    String phoneNumber;

    @NotNull(message = "Ngày sinh không được để trống")
    LocalDate dateOfBirth;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/request/UserUpdateRequest.java

```java
package com.gotravel.Identity.dto.request;


import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Builder
public class UserUpdateRequest {
    String password;
    String fullName;
    String phoneNumber;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/response/AdminIdentitySummaryResponse.java

```java
package com.gotravel.Identity.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminIdentitySummaryResponse {
    private long totalAccounts;
    private long totalUsers;
    private long activeAccounts;
    private long bannedAccounts;
    private long deletedAccounts;
    private long totalHosts;
    private long pendingHosts;
    private long approvedHosts;
    private long rejectedHosts;
    private long totalEnterprises;
    private long pendingEnterprises;
    private long approvedEnterprises;
    private long rejectedEnterprises;
    private long totalTicketVendors;
    private long pendingTicketVendors;
    private long approvedTicketVendors;
    private long rejectedTicketVendors;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/response/ApprovalStatusResponse.java

```java
package com.gotravel.Identity.dto.response;


import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ApprovalStatusResponse {
    String approvalstatus;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/response/AuthenticationResponse.java

```java
package com.gotravel.Identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuthenticationResponse {
    String token;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/response/BankAccountResponse.java

```java
package com.gotravel.Identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BankAccountResponse {
    String ownerType;
    String approvalStatus;
    String bankName;
    String bankAccount;
    String bankAccountName;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/response/EnterpriseProfileResponse.java

```java
package com.gotravel.Identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class EnterpriseProfileResponse {
    String companyName;
    String taxCode;
    String companyAddress;
    String representativeName;
    String bankAccount;
    String bankName;
    String bankAccountName;
    String avatarUrl;
    String approvalStatus;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/response/HostDetailResponse.java

```java
package com.gotravel.Identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HostDetailResponse {
    String accountId;
    String fullName;
    String avatarUrl;
    String hostType; // ENTERPRISE or PERSONAL (can derive from user roles/profile)
    IdentityInfo identityInfo;
    String approvalStatus;
    String bankName;
    String bankAccount;
    String bankAccountName;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class IdentityInfo {
        String taxCode;
        String frontImageUrl;
        String backImageUrl;
    }
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/response/HostProfileResponse.java

```java
package com.gotravel.Identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HostProfileResponse {
    String fullName;
    String phone;
    String cccdNumber;
    String taxCode;
    String bankAccount;
    String bankName;
    String bankAccountName;
    String frontImageUrl;
    String backImageUrl;
    String avatarUrl;
    String approvalStatus;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/response/PageResponse.java

```java
package com.gotravel.Identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PageResponse<T> {
    List<T> content;
    int totalPages;
    long totalElements;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/response/TicketVendorProfileResponse.java

```java
package com.gotravel.Identity.dto.response;

import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TicketVendorProfileResponse {
    String companyName;
    String companyAddress;
    String representativeName;
    String representativeIdNumber;
    String taxCode;
    String contactPhone;
    String documentFrontUrl;
    String documentBackUrl;
    String approvalStatus;
    String rejectionReason;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/response/UpgradeApplicationsResponse.java

```java
package com.gotravel.Identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpgradeApplicationsResponse {
    HostProfileResponse hostApplication;
    EnterpriseProfileResponse enterpriseApplication;
    TicketVendorProfileResponse ticketVendorApplication;
    List<ApplicationHistoryEntry> history;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ApplicationHistoryEntry {
        String type;
        String status;
        String title;
        String description;
        LocalDateTime occurredAt;
    }
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/response/UserProfileResponse.java

```java
package com.gotravel.Identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserProfileResponse {
    String fullName;
    String phoneNumber;
    LocalDate dateOfBirth;
    String avatarUrl;
}
```

## Identity/src/main/java/com/gotravel/Identity/dto/response/UserResponse.java

```java
package com.gotravel.Identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;
import com.gotravel.Identity.enums.Provider;
import java.time.Instant;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserResponse {
    String id;
    String username;
    String email;
    Boolean isActive;
    Boolean isDeleted;
    Instant createdAt;
    Instant lastLoginAt;
    Provider provider;
    Set<String> roles;
    String avatarUrl;
    
    UserProfileResponse userProfile;
    HostProfileResponse hostProfile;
    EnterpriseProfileResponse enterpriseProfile;
    TicketVendorProfileResponse ticketVendorProfile;
}
```

## Identity/src/main/java/com/gotravel/Identity/enums/Role.java

```java
package com.gotravel.Identity.enums;

public enum Role {
    USER,
    ADMIN,
    HOST,
    ENTERPRISE,
    TICKET_VENDOR
}
```

## PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/dto/request/CreatePaymentRequest.java

```java
package com.gotravel.PaymentandWallet.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePaymentRequest {
    @NotNull(message = "Order ID không được để trống")
    private UUID orderId;

    private BigDecimal amount;

    private UUID hostId;
}
```

## PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/dto/request/RefundOrderRequest.java

```java
package com.gotravel.PaymentandWallet.dto.request;

import lombok.Data;

@Data
public class RefundOrderRequest {
    private String reason;
}
```

## PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/dto/request/SepayWebhookRequest.java

```java
package com.gotravel.PaymentandWallet.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SepayWebhookRequest {
    private Long id;
    private String gateway;
    private String transactionDate;
    private String accountNumber;
    private String subAccount;
    private String transferType;
    private BigDecimal transferAmount;
    private BigDecimal accumulated;
    private String code;
    private String content;
    private String referenceCode;
    private String description;
}
```

## PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/dto/request/UpdateCommissionConfigRequest.java

```java
package com.gotravel.PaymentandWallet.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateCommissionConfigRequest {
    @NotNull(message = "Tỷ lệ hoa hồng không được để trống")
    @DecimalMin(value = "0.0000", message = "Tỷ lệ hoa hồng không được âm")
    @DecimalMax(value = "0.5000", message = "Tỷ lệ hoa hồng không được vượt quá 50%")
    private BigDecimal rate;

    private String reason;
}
```

## PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/dto/response/AdminPaymentSummaryResponse.java

```java
package com.gotravel.PaymentandWallet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPaymentSummaryResponse {
    private long totalPaymentRequests;
    private long pendingPayments;
    private long completedPayments;
    private long failedPayments;
    private long expiredPayments;
    private BigDecimal totalRequestedAmount;
    private BigDecimal completedPaymentAmount;
    private BigDecimal totalTransactionAmount;
    private long totalPayouts;
    private long pendingPayouts;
    private long requestedPayouts;
    private long paidPayouts;
    private long cancelledPayouts;
    private BigDecimal totalPayoutAmount;
    private BigDecimal totalHostAmount;
    private BigDecimal totalCommissionAmount;
    private BigDecimal pendingHostAmount;
    private BigDecimal requestedHostAmount;
    private BigDecimal paidHostAmount;
    private BigDecimal paidCommissionAmount;
}
```

## PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/dto/response/AdminRevenueReportResponse.java

```java
package com.gotravel.PaymentandWallet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminRevenueReportResponse {
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal totalAmount;
    private BigDecimal hostAmount;
    private BigDecimal commissionAmount;
    private long payoutCount;
    private List<DailyRevenue> daily;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyRevenue {
        private LocalDate date;
        private BigDecimal totalAmount;
        private BigDecimal hostAmount;
        private BigDecimal commissionAmount;
        private long payoutCount;
    }
}
```

## PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/dto/response/ApiResponse.java

```java
package com.gotravel.PaymentandWallet.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    @Builder.Default
    private final boolean success = false;
    private final int status;
    private final String code;
    private final String message;
    private final T data;

    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder().success(true).status(200).code("SUCCESS").message(message).data(data).build();
    }

    public static <T> ApiResponse<T> success(String message) {
        return success(message, null);
    }

    public static <T> ApiResponse<T> success(T data) {
        return success("Thành công", data);
    }

    public static <T> ApiResponse<T> error(int status, String code, String message) {
        return ApiResponse.<T>builder().success(false).status(status).code(code).message(message).build();
    }
}
```

## PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/dto/response/CommissionConfigResponse.java

```java
package com.gotravel.PaymentandWallet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommissionConfigResponse {
    private BigDecimal rate;
    private BigDecimal percent;
    private UUID updatedBy;
    private String reason;
    private LocalDateTime updatedAt;
}
```

## PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/dto/response/HostPayoutResponse.java

```java
package com.gotravel.PaymentandWallet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HostPayoutResponse {
    private UUID payoutId;
    private UUID orderId;
    private UUID hostId;
    private String providerType;
    private BigDecimal totalAmount;
    private BigDecimal commissionRate;
    private BigDecimal commissionAmount;
    private BigDecimal hostAmount;
    private String status;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
}
```

## PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/dto/response/OrderPaymentSummaryResponse.java

```java
package com.gotravel.PaymentandWallet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderPaymentSummaryResponse {
    private UUID orderId;
    private UUID userId;
    private UUID hostId;
    private String orderKind;
    private String providerType;
    private BigDecimal transportRefundDue;
    private BigDecimal transportCancellationFee;
    private BigDecimal totalAmount;
    private String currency;
    private String status;
    private LocalDateTime expiresAt;
    private List<ProviderBreakdown> providerBreakdowns;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProviderBreakdown {
        private UUID hostId;
        private BigDecimal totalAmount;
    }
}
```

## PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/dto/response/PaymentResponse.java

```java
package com.gotravel.PaymentandWallet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponse {
    private UUID paymentId;
    private UUID orderId;
    private String paymentCode;
    private BigDecimal amount;
    private String status;
    private String provider;
    private String paymentUrl;
    private String qrUrl;
    private String bankAccount;
    private String bankName;
    private LocalDateTime expiresAt;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
}
```

## PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/dto/response/VnpayReturnResponse.java

```java
package com.gotravel.PaymentandWallet.dto.response;

import java.util.UUID;

public record VnpayReturnResponse(UUID orderId, UUID paymentId, String result, String responseCode,
                                  String frontendUrl, boolean orderConfirmed) {}
```

## PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/enums/PaymentStatus.java

```java
package com.gotravel.PaymentandWallet.enums;

public enum PaymentStatus {
    PENDING,
    COMPLETED,
    PAID_REVIEW,
    FAILED,
    EXPIRED,
    REFUNDED
}
```

## PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/enums/PayoutStatus.java

```java
package com.gotravel.PaymentandWallet.enums;

public enum PayoutStatus {
    PENDING,
    REQUESTED,
    PAID,
    CANCELLED
}
```

## PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/transport/domain/ItemMoneyLedger.java

```java
package com.gotravel.PaymentandWallet.transport.domain;
import java.util.UUID;
import java.math.BigDecimal;
public interface ItemMoneyLedger {
 record Result(UUID operationId,String state,BigDecimal topup,BigDecimal refundDue){}
 record Proof(UUID operation_id,UUID shift_id,UUID actor_id,BigDecimal amount,String reference,String evidence_url,BigDecimal commission_rate,String commission_version){}
 record Commission(BigDecimal rate,String version){}
 Commission originalCommission(UUID orderId);
 Result reserve(ItemOperationPlan plan,BigDecimal rate,String version);
 Result fund(ItemOperationPlan plan,boolean paid,String onlineReference,Proof cashProof);
 Result commit(ItemOperationPlan plan);
 Result abort(ItemOperationPlan plan,boolean paid,String onlineReference,Proof cashProof);
 Result refund(ItemOperationPlan plan,Proof proof);
}
```

## car/src/car/presentation/dto/create-car.dto.ts

```typescript
import { IsEnum, IsInt, IsNotEmpty, IsString, Min, Length } from 'class-validator';
import { CarType } from '../../domain/value-object/car-type.enum';

export class CreateCarDto {
  @IsNotEmpty({ message: 'Tên xe không được để trống.' })
  @IsString({ message: 'Tên xe phải là chuỗi ký tự.' })
  @Length(3, 100, { message: 'Tên xe phải có độ dài từ 3 đến 100 ký tự.' })
  name: string;

  @IsNotEmpty({ message: 'Loại xe không được để trống.' })
  @IsEnum(CarType, { message: 'Loại xe phải là SLEEPER, LIMOUSINE hoặc SEAT.' })
  type: CarType;

  @IsNotEmpty({ message: 'Biển số xe không được để trống.' })
  @IsString({ message: 'Biển số xe phải là chuỗi ký tự.' })
  licensePlate: string;

  @IsNotEmpty({ message: 'Tổng số ghế không được để trống.' })
  @IsInt({ message: 'Tổng số ghế phải là số nguyên.' })
  @Min(1, { message: 'Tổng số ghế phải lớn hơn 0.' })
  totalSeats: number;
}
```

## car/src/car/presentation/dto/get-cars-query.dto.ts

```typescript
import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CarType } from '../../domain/value-object/car-type.enum';

export class GetCarsQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(CarType, { message: 'Loại xe phải là SLEEPER, LIMOUSINE hoặc SEAT.' })
  type?: CarType;

  @IsOptional()
  @IsEnum(['createdAt', 'name', 'totalSeats'], { message: 'SortBy phải là createdAt, name hoặc totalSeats.' })
  sortBy?: 'createdAt' | 'name' | 'totalSeats';

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'SortOrder phải là asc hoặc desc.' })
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên.' })
  @Min(1, { message: 'Trang tối thiểu là 1.' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số dòng mỗi trang phải là số nguyên.' })
  @Min(1, { message: 'Số dòng tối thiểu là 1.' })
  @Max(100, { message: 'Số dòng tối đa là 100.' })
  limit?: number = 10;
}
```

## car/src/car/presentation/dto/update-car-status.dto.ts

```typescript
import { IsEnum, IsNotEmpty } from 'class-validator';
import { CarStatus } from '../../domain/value-object/car-status.enum';

export class UpdateCarStatusDto {
  @IsNotEmpty({ message: 'Trạng thái xe không được để trống.' })
  @IsEnum(CarStatus, { message: 'Trạng thái xe không hợp lệ.' })
  status!: CarStatus;
}
```

## car/src/car/presentation/dto/update-car.dto.ts

```typescript
import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { CarType } from '../../domain/value-object/car-type.enum';

export class UpdateCarDto {
  @IsOptional()
  @IsString()
  @Length(3, 100, { message: 'Tên xe phải có độ dài từ 3 đến 100 ký tự.' })
  name?: string;

  @IsOptional()
  @IsEnum(CarType, { message: 'Loại xe không hợp lệ.' })
  type?: CarType;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{2}[A-Z]{1,2}-[0-9]{4,5}$/, {
    message:
      'Biển số xe không đúng định dạng chuẩn Việt Nam (VD: 29B-12345, 51A-9999).',
  })
  licensePlate?: string;
}
```

## car/src/operator/presentation/dto/create-operator-application.dto.ts

```typescript
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CreateOperatorApplicationDto {
  @IsNotEmpty({ message: 'Tên nhà xe không được để trống.' })
  @IsString({ message: 'Tên nhà xe phải là chuỗi ký tự.' })
  @Length(3, 100, { message: 'Tên nhà xe phải có độ dài từ 3 đến 100 ký tự.' })
  name: string;

  @IsNotEmpty({ message: 'Số điện thoại liên hệ không được để trống.' })
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự.' })
  @Matches(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, {
    message: 'Số điện thoại liên hệ không đúng định dạng số điện thoại Việt Nam 10 chữ số.',
  })
  phone: string;

  @IsNotEmpty({ message: 'Địa chỉ trụ sở không được để trống.' })
  @IsString({ message: 'Địa chỉ trụ sở phải là chuỗi ký tự.' })
  address: string;
}
```

## car/src/operator/presentation/dto/get-operators-query.dto.ts

```typescript
import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetOperatorsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'name'], { message: 'SortBy phải là createdAt hoặc name.' })
  sortBy?: 'createdAt' | 'name';

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'SortOrder phải là asc hoặc desc.' })
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên.' })
  @Min(1, { message: 'Trang tối thiểu là 1.' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số dòng mỗi trang phải là số nguyên.' })
  @Min(1, { message: 'Số dòng tối thiểu là 1.' })
  @Max(100, { message: 'Số dòng tối đa là 100.' })
  limit?: number = 10;
}
```

## car/src/operator/presentation/dto/process-operator-application.dto.ts

```typescript
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OperatorApplicationStatus } from '../../domain/value-object/operator-application-status.enum';

export class ProcessOperatorApplicationDto {
  @IsNotEmpty({ message: 'Trạng thái xử lý không được để trống.' })
  @IsIn([OperatorApplicationStatus.APPROVED, OperatorApplicationStatus.REJECTED], {
    message: 'Trạng thái phải là APPROVED hoặc REJECTED.',
  })
  status: OperatorApplicationStatus.APPROVED | OperatorApplicationStatus.REJECTED;

  @IsOptional()
  @IsString({ message: 'Lý do từ chối phải là chuỗi ký tự.' })
  rejectReason?: string;
}
```

## car/src/operator/presentation/dto/update-operator-profile.dto.ts

```typescript
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateOperatorProfileDto {
  @IsOptional()
  @IsString({ message: 'Tên thương hiệu phải là chuỗi ký tự.' })
  @MaxLength(100, { message: 'Tên thương hiệu không vượt quá 100 ký tự.' })
  displayName?: string;

  @IsOptional()
  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'URL logo phải là đường dẫn HTTPS hợp lệ.' },
  )
  @MaxLength(500, { message: 'URL logo không vượt quá 500 ký tự.' })
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Số điện thoại không vượt quá 20 ký tự.' })
  @Matches(/^[0-9+\s\-()]{8,20}$/, {
    message: 'Số điện thoại liên hệ không hợp lệ.',
  })
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Địa chỉ liên hệ không vượt quá 255 ký tự.' })
  contactAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Mô tả không vượt quá 1000 ký tự.' })
  description?: string;
}
```

## car/src/operator/presentation/dto/update-operator-status.dto.ts

```typescript
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateOperatorStatusDto {
  @IsNotEmpty({ message: 'Trạng thái nhà xe không được để trống.' })
  @IsIn(['ACTIVE', 'SUSPENDED'], {
    message: 'Trạng thái chỉ có thể là ACTIVE hoặc SUSPENDED.',
  })
  status!: 'ACTIVE' | 'SUSPENDED';

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Lý do đình chỉ không vượt quá 500 ký tự.' })
  reason?: string;
}
```

## car/src/route/presentation/dto/create-route.dto.ts

```typescript
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Length,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRouteStopDto {
  @IsNotEmpty({ message: 'Tên điểm dừng không được để trống.' })
  @IsString({ message: 'Tên điểm dừng phải là chuỗi ký tự.' })
  @Length(3, 100, { message: 'Tên điểm dừng phải có độ dài từ 3 đến 100 ký tự.' })
  name: string;

  @IsNotEmpty({ message: 'Thứ tự điểm dừng không được để trống.' })
  @IsInt({ message: 'Thứ tự điểm dừng phải là số nguyên.' })
  @Min(0, { message: 'Thứ tự điểm dừng phải lớn hơn hoặc bằng 0.' })
  order: number;
}

export class CreateRouteDto {
  @IsNotEmpty({ message: 'Điểm khởi hành không được để trống.' })
  @IsString({ message: 'Điểm khởi hành phải là chuỗi ký tự.' })
  @Length(2, 100, { message: 'Điểm khởi hành phải có độ dài từ 2 đến 100 ký tự.' })
  origin: string;

  @IsNotEmpty({ message: 'Điểm đến không được để trống.' })
  @IsString({ message: 'Điểm đến phải là chuỗi ký tự.' })
  @Length(2, 100, { message: 'Điểm đến phải có độ dài từ 2 đến 100 ký tự.' })
  destination: string;

  @IsArray({ message: 'Danh sách điểm dừng phải là một mảng.' })
  @ArrayMinSize(2, { message: 'Tuyến đường phải có ít nhất 2 điểm dừng (gồm điểm đầu và điểm cuối).' })
  @ValidateNested({ each: true })
  @Type(() => CreateRouteStopDto)
  stops: CreateRouteStopDto[];
}
```

## car/src/route/presentation/dto/get-routes-query.dto.ts

```typescript
import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetRoutesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'], {
    message: 'Trạng thái tuyến đường phải là ACTIVE hoặc INACTIVE.',
  })
  status?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'origin', 'destination'], {
    message: 'SortBy phải là createdAt, origin hoặc destination.',
  })
  sortBy?: 'createdAt' | 'origin' | 'destination';

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'SortOrder phải là asc hoặc desc.' })
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên.' })
  @Min(1, { message: 'Trang tối thiểu là 1.' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số dòng mỗi trang phải là số nguyên.' })
  @Min(1, { message: 'Số dòng tối thiểu là 1.' })
  @Max(100, { message: 'Số dòng tối đa là 100.' })
  limit?: number = 10;
}
```

## car/src/route/presentation/dto/update-route-status.dto.ts

```typescript
import { IsEnum, IsNotEmpty } from 'class-validator';
import { RouteStatus } from '../../domain/value-object/route-status.enum';

export class UpdateRouteStatusDto {
  @IsNotEmpty({ message: 'Trạng thái tuyến đường không được để trống.' })
  @IsEnum(RouteStatus, {
    message: 'Trạng thái tuyến đường phải là ACTIVE hoặc INACTIVE.',
  })
  status: RouteStatus;
}
```

## car/src/route/presentation/dto/update-route.dto.ts

```typescript
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRouteStopDto {
  @IsOptional()
  @IsUUID('4', { message: 'Mã điểm dừng danh mục không hợp lệ' })
  operatorStopId?: string;

  @IsNotEmpty({ message: 'Tên điểm dừng không được để trống.' })
  @IsString({ message: 'Tên điểm dừng phải là chuỗi ký tự.' })
  @Length(2, 100, {
    message: 'Tên điểm dừng phải có độ dài từ 2 đến 100 ký tự.',
  })
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsNotEmpty({ message: 'Thứ tự điểm dừng không được để trống.' })
  @IsInt({ message: 'Thứ tự điểm dừng phải là số nguyên.' })
  @Min(0, { message: 'Thứ tự điểm dừng phải lớn hơn hoặc bằng 0.' })
  order!: number;
}

export class UpdateRouteDto {
  @IsOptional()
  @IsString({ message: 'Điểm khởi hành phải là chuỗi ký tự.' })
  @Length(2, 100, {
    message: 'Điểm khởi hành phải có độ dài từ 2 đến 100 ký tự.',
  })
  origin?: string;

  @IsOptional()
  @IsString({ message: 'Điểm đến phải là chuỗi ký tự.' })
  @Length(2, 100, { message: 'Điểm đến phải có độ dài từ 2 đến 100 ký tự.' })
  destination?: string;

  @IsOptional()
  @IsArray({ message: 'Danh sách điểm dừng phải là một mảng.' })
  @ArrayMinSize(2, { message: 'Tuyến đường phải có ít nhất 2 điểm dừng.' })
  @ValidateNested({ each: true })
  @Type(() => UpdateRouteStopDto)
  stops?: UpdateRouteStopDto[];
}
```

## car/src/stop/presentation/dto/create-stop.dto.ts

```typescript
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateOperatorStopDto {
  @IsNotEmpty({ message: 'Tên điểm dừng không được để trống.' })
  @IsString()
  @Length(2, 100, { message: 'Tên điểm dừng từ 2 đến 100 ký tự.' })
  name!: string;

  @IsNotEmpty({ message: 'Địa chỉ không được để trống.' })
  @IsString()
  @Length(2, 255, { message: 'Địa chỉ từ 2 đến 255 ký tự.' })
  address!: string;

  @IsNotEmpty({ message: 'Tỉnh/thành phố không được để trống.' })
  @IsString()
  @Length(2, 100, { message: 'Tỉnh/thành phố từ 2 đến 100 ký tự.' })
  province!: string;
}
```

## car/src/stop/presentation/dto/get-stops-query.dto.ts

```typescript
import {
  IsBooleanString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetOperatorStopsQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsBooleanString()
  active?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
```

## car/src/stop/presentation/dto/update-stop.dto.ts

```typescript
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateOperatorStopDto {
  @IsOptional()
  @IsString()
  @Length(2, 100, { message: 'Tên điểm dừng từ 2 đến 100 ký tự.' })
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 255, { message: 'Địa chỉ từ 2 đến 255 ký tự.' })
  address?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100, { message: 'Tỉnh/thành phố từ 2 đến 100 ký tự.' })
  province?: string;
}
```

## car/src/transport/domain/transport.types.ts

```typescript
export interface SeatTemplate {
  id: string;
  code: string;
  level: number;
  seatClass: string;
  row?: number;
  column?: number;
}

export interface RouteStop {
  id: string;
  name: string;
  order: number;
  scheduledAt?: string;
  pickupAllowed?: boolean;
  dropoffAllowed?: boolean;
  address?: string | null;
  province?: string | null;
}

export interface TransportTrip {
  id: string;
  operatorId: string;
  operatorUserId: string;
  routeId: string;
  origin: string;
  destination: string;
  departureAt: Date;
  arrivalAt: Date;
  priceVnd: string | null;
  offerListingId: string | null;
  status: string;
  totalSeats: number;
  seats: SeatTemplate[];
  stops: RouteStop[];
  version?: string;
  classPrices?: Record<string, string>;
  inventorySyncPending?: boolean;
  operatorStatus?: string;
  vehicle?: { id: string; name: string; type: string; licensePlate: string };
  operatorProfile?: {
    id: string;
    name: string;
    logoUrl: string | null;
    contactPhone: string | null;
  };
}

export interface PassengerSeat {
  orderItemId: string;
  seatId: string;
  passengerName: string;
  pickupStopId: string;
  dropoffStopId: string;
}

export interface TicketReceipt {
  orderItemId: string;
  ticketId: string;
  checkInToken: string;
}

export interface TicketForCheckIn {
  revision: number;
  id: string;
  orderId: string;
  orderItemId: string;
  tripId: string;
  status: 'ACTIVE' | 'VOID' | 'CHECKED_IN' | 'NO_SHOW';
  seatId: string;
  departureAt: Date;
  tripStatus?: string;
}
```

## car/src/transport/presentation/transport.dto.ts

```typescript
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class SeatDefinitionDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
  @IsInt()
  @Min(1)
  @Max(3)
  level!: number;
  @IsString()
  @IsNotEmpty()
  seatClass!: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) row?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10) column?: number;
}

export class ReplaceSeatsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SeatDefinitionDto)
  seats!: SeatDefinitionDto[];
}

export class QuotePassengerDto {
  @IsUUID()
  seatId!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
  @IsUUID()
  pickupStopId!: string;
  @IsUUID()
  dropoffStopId!: string;
}

export class QuoteRequestDto {
  @IsUUID()
  tripId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => QuotePassengerDto)
  passengers!: QuotePassengerDto[];
}

export class IssueTicketItemDto {
  @IsUUID()
  orderItemId!: string;
  @IsUUID()
  tripId!: string;
  @IsUUID()
  seatId!: string;
  @IsString()
  @IsNotEmpty()
  passengerName!: string;
  @IsUUID()
  pickupStopId!: string;
  @IsUUID()
  dropoffStopId!: string;
}

export class IssueTicketsDto {
  @IsUUID()
  orderId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => IssueTicketItemDto)
  items!: IssueTicketItemDto[];
}

export class CheckInDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class AmendTicketDto {
  @IsUUID() @IsNotEmpty() commandId!: string;
  @IsUUID() @IsNotEmpty() orderId!: string;
  @IsUUID() @IsNotEmpty() orderItemId!: string;
  @IsUUID() @IsNotEmpty() ticketId!: string;
  @IsInt() @Min(1) expectedRevision!: number;
  @IsString() @IsNotEmpty() @MaxLength(64) payloadHash!: string;
  @IsString() @IsNotEmpty() @MaxLength(255) passengerName!: string;
  @IsUUID() @IsNotEmpty() pickupStopId!: string;
  @IsUUID() @IsNotEmpty() dropoffStopId!: string;
}
```

## car/src/trip/presentation/dto/create-trip.dto.ts

```typescript
import {
  IsNotEmpty,
  IsUUID,
  IsISO8601,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateTripDto {
  @IsNotEmpty({ message: 'Tuyến đường (routeId) không được để trống.' })
  @IsUUID('all', { message: 'Mã tuyến đường (routeId) phải là UUID hợp lệ.' })
  routeId: string;

  @IsNotEmpty({ message: 'Xe khách (carId) không được để trống.' })
  @IsUUID('all', { message: 'Mã xe khách (carId) phải là UUID hợp lệ.' })
  carId: string;

  @IsNotEmpty({ message: 'Thời gian xuất bến không được để trống.' })
  @IsISO8601(
    {},
    {
      message:
        'Thời gian xuất bến phải là chuỗi ngày giờ theo định dạng ISO 8601.',
    },
  )
  departureTime: string;

  @IsNotEmpty({ message: 'Thời gian đến dự kiến không được để trống.' })
  @IsISO8601(
    {},
    {
      message:
        'Thời gian đến dự kiến phải là chuỗi ngày giờ theo định dạng ISO 8601.',
    },
  )
  arrivalTime: string;

  @IsNotEmpty({ message: 'Giá vé cơ bản trên mỗi ghế không được để trống.' })
  @IsInt({ message: 'Giá vé cơ bản phải là số nguyên (VNĐ).' })
  @Min(10000, { message: 'Giá vé cơ bản tối thiểu là 10.000 VNĐ.' })
  @Max(Number.MAX_SAFE_INTEGER)
  pricePerSeat: number;
}
```

## car/src/trip/presentation/dto/get-trips-query.dto.ts

```typescript
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TripStatus } from '../../domain/value-object/trip-status.enum';

export class GetTripsQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(TripStatus, {
    message: 'Trạng thái chuyến đi không hợp lệ.',
  })
  status?: TripStatus;

  @IsOptional()
  @IsUUID('all', { message: 'Mã tuyến đường (routeId) phải là UUID hợp lệ.' })
  routeId?: string;

  @IsOptional()
  @IsUUID('all', { message: 'Mã xe khách (carId) phải là UUID hợp lệ.' })
  carId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày xuất bến (departureDate) phải có định dạng YYYY-MM-DD.',
  })
  departureDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên.' })
  @Min(1, { message: 'Trang tối thiểu là 1.' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số dòng mỗi trang phải là số nguyên.' })
  @Min(1, { message: 'Số dòng tối thiểu là 1.' })
  @Max(100, { message: 'Số dòng tối đa là 100.' })
  limit?: number = 10;

  @IsOptional()
  @IsEnum(['departureTime', 'pricePerSeat', 'createdAt'], {
    message: 'SortBy phải là departureTime, pricePerSeat hoặc createdAt.',
  })
  sortBy?: 'departureTime' | 'pricePerSeat' | 'createdAt' = 'departureTime';

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'SortOrder phải là asc hoặc desc.' })
  sortOrder?: 'asc' | 'desc' = 'asc';
}
```

## car/src/trip/presentation/dto/search-trips-query.dto.ts

```typescript
import {
  IsEnum,
  IsArray,
  ArrayMaxSize,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchTripsQueryDto {
  @IsNotEmpty({ message: 'Điểm khởi hành (origin) không được để trống.' })
  @IsString({ message: 'Điểm khởi hành phải là chuỗi ký tự.' })
  origin: string;

  @IsNotEmpty({ message: 'Điểm đến (destination) không được để trống.' })
  @IsString({ message: 'Điểm đến phải là chuỗi ký tự.' })
  destination: string;

  @IsNotEmpty({
    message: 'Ngày khởi hành (departureDate) không được để trống.',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày khởi hành (departureDate) phải có định dạng YYYY-MM-DD.',
  })
  departureDate: string;

  @IsOptional()
  @IsEnum(['morning', 'afternoon', 'evening'])
  timeOfDay?: 'morning' | 'afternoon' | 'evening';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d-(?:[01]\d|2[0-3]):[0-5]\d$/, {
    each: true,
  })
  timeSlots?: string[];

  @IsOptional()
  @IsEnum(['SLEEPER', 'LIMOUSINE', 'SEAT'], {
    message: 'Loại xe (type) phải là SLEEPER, LIMOUSINE hoặc SEAT.',
  })
  type?: string;

  @IsOptional()
  @Type(() => String)
  @Matches(/^\d{1,18}$/)
  minPrice?: string;
  @IsOptional()
  @Type(() => String)
  @Matches(/^\d{1,18}$/)
  maxPrice?: string;

  @IsOptional()
  @IsUUID('all', { message: 'Mã nhà xe (operatorId) phải là UUID hợp lệ.' })
  operatorId?: string;

  @IsOptional()
  @IsEnum(['departureTime', 'pricePerSeat'], {
    message: 'SortBy phải là departureTime hoặc pricePerSeat.',
  })
  sortBy?: 'departureTime' | 'pricePerSeat' = 'departureTime';

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'SortOrder phải là asc hoặc desc.' })
  sortOrder?: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên.' })
  @Min(1, { message: 'Trang tối thiểu là 1.' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số dòng mỗi trang phải là số nguyên.' })
  @Min(1, { message: 'Số dòng tối thiểu là 1.' })
  @Max(50, { message: 'Số dòng tối đa là 50.' })
  limit?: number = 10;
}
```

## car/src/trip/presentation/dto/set-trip-stops.dto.ts

```typescript
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class TripStopOverrideDto {
  @IsNotEmpty({
    message: 'Mã điểm dừng tuyến (routeStopId) không được để trống.',
  })
  @IsUUID('4', { message: 'Mã điểm dừng tuyến phải là UUID.' })
  routeStopId!: string;

  @IsNotEmpty({ message: 'Thứ tự điểm dừng không được để trống.' })
  @IsInt()
  @Min(0)
  order!: number;

  @IsOptional()
  @IsIn(['PICKUP', 'DROPOFF', 'BOTH'], {
    message: 'Loại điểm dừng phải là PICKUP, DROPOFF hoặc BOTH.',
  })
  type?: 'PICKUP' | 'DROPOFF' | 'BOTH';

  @IsOptional()
  @IsDateString({}, { message: 'Thời gian đón/trả không hợp lệ.' })
  scheduledAt?: string;

  @IsOptional()
  @IsBoolean()
  pickupAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  dropoffAllowed?: boolean;
}

export class SetTripStopsDto {
  @IsArray({ message: 'Danh sách điểm dừng phải là mảng.' })
  @ArrayMinSize(2, { message: 'Chuyến xe phải có ít nhất 2 điểm đón/trả.' })
  @ValidateNested({ each: true })
  @Type(() => TripStopOverrideDto)
  stops!: TripStopOverrideDto[];
}
```

## car/src/trip/presentation/dto/update-draft-trip.dto.ts

```typescript
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class UpdateDraftTripDto {
  @IsOptional()
  @IsUUID('4', { message: 'Mã xe không hợp lệ.' })
  carId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Mã tuyến đường không hợp lệ.' })
  routeId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Thời gian khởi hành không hợp lệ.' })
  departureTime?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Thời gian đến dự kiến không hợp lệ.' })
  arrivalTime?: string;

  @IsOptional()
  @IsString({ message: 'Giá vé phải là chuỗi số nguyên.' })
  @Matches(/^[1-9]\d{0,17}$/, {
    message: 'Giá vé phải là số nguyên dương tính theo VND.',
  })
  priceVnd?: string;
}
```

## car/src/trip/presentation/dto/update-trip-status.dto.ts

```typescript
import { IsEnum, IsNotEmpty } from 'class-validator';
import { TripStatus } from '../../domain/value-object/trip-status.enum';

export class UpdateTripStatusDto {
  @IsNotEmpty({ message: 'Trạng thái chuyến đi không được để trống.' })
  @IsEnum(TripStatus, {
    message: 'Trạng thái chuyến đi không hợp lệ.',
  })
  status: TripStatus;
}
```

## Inline record DTO / response shape

### CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportOrderController.java:61

```java
public record CancelPaidRequest(String reason)
```

### CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:68

```java
public record ReconciliationNote(@NotBlank @Size(max = 1000) String note)
```

### CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:82

```java
public record ExchangeRequest(@NotNull UUID oldOrderId, @NotNull UUID newOrderId,
                                  @NotBlank @Size(max = 500) String reason)
```

### CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:125

```java
public record CompleteRefundRequest(
            @NotNull @DecimalMin("0.01") @Digits(integer = 18, fraction = 0) BigDecimal amount,
            @NotBlank @Size(max = 160) String reference,
            @NotBlank @Size(max = 1000) String evidenceUrl)
```

### CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TripCancellationController.java:22

```java
public record CancelRequest(String reason)
```

### CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/cash/presentation/CashController.java:31

```java
public record OpenShiftRequest(@NotNull UUID tripId)
```

### CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/cash/presentation/CashController.java:32

```java
public record CloseShiftRequest(@NotNull @DecimalMin("0") @Digits(integer = 18, fraction = 0)
                                    BigDecimal countedAmount)
```

### CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/cash/presentation/CashController.java:34

```java
public record ReceiveRequest(@NotNull @DecimalMin("0.01") @Digits(integer = 18, fraction = 0)
                                 BigDecimal amount)
```

### CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/cash/presentation/CashController.java:90

```java
public record CancelPaidRequest(String reason)
```

### CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/presentation/ItemOperationController.java:22

```java
public record PreviewRequest(String kind,UUID tripId,UUID seatId,UUID pickupStopId,UUID dropoffStopId)
```

### CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/presentation/ItemOperationController.java:26

```java
public record Proof(BigDecimal amount,String reference,String evidenceUrl,String refundMethod,UUID cashShiftId)
```

### CatalogandListing/src/main/java/com/Listing/CatalogandListing/transport/TransportContentController.java:20

```java
public record Content(@NotBlank @Size(max=200) String title,
                          @NotBlank @Size(max=10000) String description,
                          @Size(max=1000) String thumbnailUrl)
```

### PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/TransportFinanceController.java:36

```java
public record CommissionPaidRequest(
            @NotNull @DecimalMin("0") @Digits(integer = 18, fraction = 0) BigDecimal amount,
            @NotBlank @Size(max = 160) String reference,
            @NotBlank @Size(max = 1000) String evidenceUrl)
```

### PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/InternalPaymentController.java:37

```java
public record ManualTransportRefundRequest(java.math.BigDecimal amount, String reference,
                                               String evidenceUrl, UUID recordedBy)
```

### PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/InternalPaymentController.java:51

```java
public record CashSettlementRequest(UUID shiftId, UUID operatorId, java.math.BigDecimal grossAmount,
                                        java.math.BigDecimal commissionDue, String commissionVersion,
                                        java.math.BigDecimal commissionRate)
```

### PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/InternalPaymentController.java:55

```java
public record CashRefundAdjustmentRequest(UUID orderId, UUID shiftId, UUID operatorId,
                                              java.math.BigDecimal refundAmount,
                                              java.math.BigDecimal commissionReversal,
                                              String commissionVersion,
                                              java.math.BigDecimal commissionRate)
```

### PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/HostPayoutController.java:83

```java
public record TransportPayoutProof(java.math.BigDecimal amount,String reference,String evidenceUrl)
```

### BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport/presentation/TransportInventoryController.java:22

```java
public record InitializeRequest(@NotNull UUID operatorId, @NotNull Instant departureAt,
                                    @NotEmpty List<@Valid SeatDefinition> seats)
```

### BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport/presentation/TransportInventoryController.java:24

```java
public record SeatDefinition(@NotNull UUID seatId, @NotNull String code)
```

### BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport/presentation/TransportInventoryController.java:25

```java
public record ReserveRequest(@NotNull UUID orderId, @NotEmpty List<@NotNull UUID> seatIds)
```

### BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport/presentation/TransportInventoryController.java:27

```java
public record SeatBlockRequest(@NotNull UUID actorId, @NotEmpty List<@NotNull UUID> seatIds,
                                   boolean blocked, @NotNull String reason)
```

### CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/application/ItemOperationService.java:31

```java
public record View(UUID operationId,UUID orderId,UUID itemId,String kind,String state,Instant expiresAt,
   UUID oldTripId,UUID oldSeatId,UUID newTripId,UUID newSeatId,
   @com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal oldAmount,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal newAmount,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal fee,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal topup,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal refundDue,String error)
```

### CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/application/ItemOperationService.java:38

```java
public record Request(UUID operationId,UUID tripId,UUID seatId,UUID pickupStopId,UUID dropoffStopId)
```

### CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/application/ItemOperationService.java:47

```java
public record Preview(String kind,String currency,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal oldAmount,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal newAmount,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal fee,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal topup,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) BigDecimal refundDue,String policyVersion)
```

### CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAmendmentService.java:38

```java
public record AmendRequest(UUID commandId, String passengerName, UUID pickupStopId, UUID dropoffStopId)
```

### CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAmendmentService.java:40

```java
public record AmendmentRecord(
            UUID commandId,
            UUID orderId,
            UUID orderItemId,
            UUID actorId,
            int expectedRevision,
            Integer newRevision,
            String passengerName,
            UUID pickupStopId,
            UUID dropoffStopId,
            String payloadHash,
            String status,
            String errorReason,
            Instant createdAt,
            Instant appliedAt,
            int retryCount
    )
```

## Bổ sung DTO inline TypeScript và enum vận tải

Các lớp DTO đặt ngay trong controller chưa nằm trong thư mục DTO. Decorator validation bên dưới là contract source; các DTO Internal chỉ server sử dụng.

### car/src/staff/presentation/staff.controller.ts — AssignStaffDto

Source: [controller](/home/DoANLienNganh/car/src/staff/presentation/staff.controller.ts:24).

```typescript
export class AssignStaffDto {
  @IsBoolean() canSellCash: boolean;
  @IsBoolean() canCheckIn: boolean;
  @IsBoolean() active: boolean;
  @IsOptional() @IsBoolean() canManageTrip?: boolean;
  @IsOptional() @IsBoolean() canCloseShift?: boolean;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID(undefined, { each: true })
  tripIds?: string[];
}
```

### car/src/transport/presentation/transport-operations.controller.ts — AdminCancelDto

Source: [controller](/home/DoANLienNganh/car/src/transport/presentation/transport-operations.controller.ts:29).

```typescript
class AdminCancelDto {
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}
```

### car/src/transport/presentation/transport-operations.controller.ts — LifecycleDto

Source: [controller](/home/DoANLienNganh/car/src/transport/presentation/transport-operations.controller.ts:32).

```typescript
class LifecycleDto {
  @IsIn(['DEPARTED', 'COMPLETED']) status!: 'DEPARTED' | 'COMPLETED';
}
```

### car/src/transport/presentation/transport-operations.controller.ts — PricingDto

Source: [controller](/home/DoANLienNganh/car/src/transport/presentation/transport-operations.controller.ts:35).

```typescript
class PricingDto {
  @IsObject() classPrices!: Record<string, string>;
}
```

### car/src/transport/presentation/transport-operations.controller.ts — SeatBlockDto

Source: [controller](/home/DoANLienNganh/car/src/transport/presentation/transport-operations.controller.ts:38).

```typescript
class SeatBlockDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  seatIds!: string[];
  @IsBoolean() blocked!: boolean;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}
```

### car/src/transport/presentation/transport.controller.ts — ClaimQuoteDto

Source: [controller](/home/DoANLienNganh/car/src/transport/presentation/transport.controller.ts:27).

```typescript
class ClaimQuoteDto {
  @IsString() @IsNotEmpty() @MaxLength(64) quoteHash!: string;
  @IsString() @IsNotEmpty() @MaxLength(64) orderId!: string;
}
```

### car/src/transport/presentation/transport.controller.ts — CancelTripDto

Source: [controller](/home/DoANLienNganh/car/src/transport/presentation/transport.controller.ts:32).

```typescript
class CancelTripDto {
  @IsString() @IsNotEmpty() @MaxLength(500) reason: string;
}
```

### car/src/car/domain/value-object/car-type.enum.ts

```typescript
export enum CarType {
  SLEEPER = 'SLEEPER',
  LIMOUSINE = 'LIMOUSINE',
  SEAT = 'SEAT',
}
```

### car/src/transport/domain/transport.types.ts

```typescript
export interface SeatTemplate {
  id: string;
  code: string;
  level: number;
  seatClass: string;
  row?: number;
  column?: number;
}

export interface RouteStop {
  id: string;
  name: string;
  order: number;
  scheduledAt?: string;
  pickupAllowed?: boolean;
  dropoffAllowed?: boolean;
  address?: string | null;
  province?: string | null;
}

export interface TransportTrip {
  id: string;
  operatorId: string;
  operatorUserId: string;
  routeId: string;
  origin: string;
  destination: string;
  departureAt: Date;
  arrivalAt: Date;
  priceVnd: string | null;
  offerListingId: string | null;
  status: string;
  totalSeats: number;
  seats: SeatTemplate[];
  stops: RouteStop[];
  version?: string;
  classPrices?: Record<string, string>;
  inventorySyncPending?: boolean;
  operatorStatus?: string;
  vehicle?: { id: string; name: string; type: string; licensePlate: string };
  operatorProfile?: {
    id: string;
    name: string;
    logoUrl: string | null;
    contactPhone: string | null;
  };
}

export interface PassengerSeat {
  orderItemId: string;
  seatId: string;
  passengerName: string;
  pickupStopId: string;
  dropoffStopId: string;
}

export interface TicketReceipt {
  orderItemId: string;
  ticketId: string;
  checkInToken: string;
}

export interface TicketForCheckIn {
  revision: number;
  id: string;
  orderId: string;
  orderItemId: string;
  tripId: string;
  status: 'ACTIVE' | 'VOID' | 'CHECKED_IN' | 'NO_SHOW';
  seatId: string;
  departureAt: Date;
  tripStatus?: string;
}
```
