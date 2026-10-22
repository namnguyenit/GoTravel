package com.Gostay.BookingandInventory.exeption;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum InventoryErrorCode implements ErrorCode {
    INVENTORY_CALENDAR_NOT_FOUND(404, "INVENTORY_CALENDAR_NOT_FOUND", "Inventory calendar not found",
            HttpStatus.NOT_FOUND),
    INVENTORY_LOCK_NOT_FOUND(404, "INVENTORY_LOCK_NOT_FOUND", "Inventory lock not found", HttpStatus.NOT_FOUND),
    OVERBOOKING_DETECTED(409, "OVERBOOKING_DETECTED", "Rất tiếc, dịch vụ này không còn đủ chỗ.", HttpStatus.CONFLICT),
    INVALID_INVENTORY_ACTION(400, "INVALID_INVENTORY_ACTION", "Invalid inventory action requested",
            HttpStatus.BAD_REQUEST),
    INVENTORY_BLOCKED(400, "INVENTORY_BLOCKED", "Dịch vụ đã bị phong tỏa trong khoảng thời gian này.",
            HttpStatus.BAD_REQUEST),
    UNAUTHORIZED_ACCESS(403, "UNAUTHORIZED_ACCESS", "You do not have permission to perform this action",
            HttpStatus.FORBIDDEN);

    private final boolean success = false;
    private final int status;
    private final String code;
    private final String message;
    private final HttpStatusCode httpStatus;

    InventoryErrorCode(int status, String code, String message, HttpStatusCode httpStatus) {
        this.status = status;
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
}
