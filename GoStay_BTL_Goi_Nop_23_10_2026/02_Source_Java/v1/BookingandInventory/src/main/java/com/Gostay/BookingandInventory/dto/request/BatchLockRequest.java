package com.Gostay.BookingandInventory.dto.request;

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

        @Min(value = 1, message = "Số lượng phải lớn hơn 0")
        private int quantity;

        private String timeSlot;

        @AssertTrue(message = "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu")
        public boolean isDateRangeValid() {
            if (startDate == null || endDate == null) {
                return true;
            }

            return !endDate.isBefore(startDate);
        }
    }
}
