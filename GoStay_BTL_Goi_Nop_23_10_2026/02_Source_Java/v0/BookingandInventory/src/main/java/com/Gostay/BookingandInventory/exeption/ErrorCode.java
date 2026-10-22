package com.Gostay.BookingandInventory.exeption;

import org.springframework.http.HttpStatusCode;

public interface ErrorCode {
    boolean isSuccess();

    int getStatus();

    String getCode();

    String getMessage();

    HttpStatusCode getHttpStatus();
}
