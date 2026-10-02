package com.gotravel.Identity.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum UserErrorCode implements ErrorCode {
    USER_NOT_FOUND(404, "USER_NOT_FOUND", "User not found", HttpStatus.NOT_FOUND),
    USER_ALREADY_EXISTS(400, "USER_ALREADY_EXISTS", "User already exists", HttpStatus.BAD_REQUEST),
    EMAIL_ALREADY_EXISTS(400, "EMAIL_ALREADY_EXISTS", "Email already exists", HttpStatus.BAD_REQUEST),
    ROLE_NOT_FOUND(404, "ROLE_NOT_FOUND", "Role not found", HttpStatus.NOT_FOUND),
    ROLE_USER_ALREADY_EXISTS(400, "ROLE_USER_ALREADY_EXISTS", "Role user already exists", HttpStatus.BAD_REQUEST),
    BANED_USER(400, "BANNED_USER", "banned account", HttpStatus.BAD_REQUEST),
    DELETE_USER(400, "DELETE_USER", "deleted account", HttpStatus.BAD_REQUEST),
    POFILE_USER_AWAITING_EXISTS(409, "POFILE_USER_AWAITING_EXISTS", "User profile awaiting approval", HttpStatus.BAD_REQUEST),
    UPLOAD_IMAGE_FAILED(500, "UPLOAD_IMAGE_FAILED", "Failed to upload image", HttpStatus.INTERNAL_SERVER_ERROR),
    CANNOT_REMOVE_USER_ROLE(400, "CANNOT_REMOVE_USER_ROLE", "Cannot remove USER role from a user", HttpStatus.BAD_REQUEST),
    MUTUALLY_EXCLUSIVE_ROLES(400, "MUTUALLY_EXCLUSIVE_ROLES", "A user cannot be both a HOST and an ENTERPRISE", HttpStatus.BAD_REQUEST),
    TICKET_VENDOR_PROFILE_NOT_FOUND(404, "TICKET_VENDOR_PROFILE_NOT_FOUND", "Ticket vendor application not found", HttpStatus.NOT_FOUND),
    TICKET_VENDOR_ALREADY_APPROVED(409, "TICKET_VENDOR_ALREADY_APPROVED", "Ticket vendor application is already approved", HttpStatus.CONFLICT),
    TICKET_VENDOR_AWAITING_APPROVAL(409, "TICKET_VENDOR_AWAITING_APPROVAL", "Ticket vendor application is awaiting approval", HttpStatus.CONFLICT),
    TICKET_VENDOR_NOT_PENDING(409, "TICKET_VENDOR_NOT_PENDING", "Ticket vendor application is not pending", HttpStatus.CONFLICT),
    TICKET_VENDOR_DOCUMENTS_REQUIRED(400, "TICKET_VENDOR_DOCUMENTS_REQUIRED", "Two identity document images are required", HttpStatus.BAD_REQUEST),
    TICKET_VENDOR_REJECTION_REASON_REQUIRED(400, "TICKET_VENDOR_REJECTION_REASON_REQUIRED", "A rejection reason is required", HttpStatus.BAD_REQUEST),
    INVALID_APPROVAL_STATUS(400, "INVALID_APPROVAL_STATUS", "Invalid approval status", HttpStatus.BAD_REQUEST);

    private final boolean success = false;
    private final int status;
    private final String code;
    private final String message;
    private final HttpStatusCode httpStatus;

    UserErrorCode(int status, String code, String message, HttpStatusCode httpStatus) {
        this.status = status;
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
}
