package com.Gostay.BookingandInventory.dto.response;

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
    private int status;
    private String code;
    private String message;
    private T data;

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, 200, "SUCCESS", "Thành công", data);
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, 200, "SUCCESS", message, data);
    }

    public static <T> ApiResponse<T> created(String message, T data) {
        return new ApiResponse<>(true, 201, "CREATED", message, data);
    }

    public static <T> ApiResponse<T> created(String message) {
        return new ApiResponse<>(true, 201, "CREATED", message, null);
    }

    public static <T> ApiResponse<T> success(String message) {
        return new ApiResponse<>(true, 200, "SUCCESS", message, null);
    }
}
