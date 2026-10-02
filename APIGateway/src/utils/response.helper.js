export const GatewayError = {
    MISSING_TOKEN: { status: 401, errorCode: "AUTH_MISSING_TOKEN", message: "Vui lòng cung cấp token xác thực." },
    INVALID_TOKEN: { status: 403, errorCode: "AUTH_INVALID_TOKEN", message: "Token không hợp lệ hoặc đã hết hạn." },
    ACCOUNT_BANNED: { status: 403, errorCode: "AUTH_ACCOUNT_BANNED", message: "Tài khoản của bạn đã bị vô hiệu hóa hoặc xóa." },
    INTERNAL_ROUTE_BLOCKED: { status: 404, errorCode: "GATEWAY_INTERNAL_ROUTE_BLOCKED", message: "Internal API không được expose qua API Gateway." },
    ROUTE_NOT_FOUND: { status: 404, errorCode: "GATEWAY_ROUTE_NOT_FOUND", message: "API không tồn tại." },
    RATE_LIMIT_EXCEEDED: { status: 429, errorCode: "GATEWAY_RATE_LIMIT_EXCEEDED", message: "Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau." },
    INTERNAL_ERROR: { status: 500, errorCode: "GATEWAY_INTERNAL_ERROR", message: "Lỗi nội bộ tại API Gateway." },
    SERVICE_UNAVAILABLE: { status: 503, errorCode: "GATEWAY_SERVICE_UNAVAILABLE", message: "Service đích hiện không phản hồi." }
};

export const GatewaySuccess = {
    HEALTH_CHECK_SUCCESS: { status: 200, errorCode: "HEALTH_CHECK_SUCCESS", message: "API gateway đang hoạt động bình thường" }
};

export const buildErrorResponse = (res, errorConfig, customMessage) => {
    return res.status(errorConfig.status).json({
        status: errorConfig.status,
        message: customMessage || errorConfig.message,
        errorCode: errorConfig.errorCode,
        data: null
    });
}

export const buildSuccessResponse = (res, successConfig, data = null) => {
    return res.status(successConfig.status).json({
        status: successConfig.status,
        message: successConfig.message,
        errorCode: successConfig.errorCode,
        data
    });
}

export const buildErorRespone = (res, errorConfig, customMessage) => {
    return buildErrorResponse(res, errorConfig, customMessage);
}
