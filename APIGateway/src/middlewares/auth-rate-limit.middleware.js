import { rateLimit } from "express-rate-limit";
import { buildErrorResponse, GatewayError } from "../utils/response.helper.js";

const normalizePath = (path) => path.replace(/\/+$/, "") || "/";

const matchesPath = (req, expectedPath) => {
    const requestPath = normalizePath(req.originalUrl.split("?")[0]);
    return requestPath === expectedPath;
};

export const createEndpointLimiter = ({ path, method = "POST", windowMs, limit, message }) => {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        skip: (req) => req.method !== method || !matchesPath(req, path),
        handler: (req, res) => {
            return buildErrorResponse(res, GatewayError.RATE_LIMIT_EXCEEDED, message);
        }
    });
};

export const authRateLimiters = [
    createEndpointLimiter({
        path: "/api/v1/auth/login",
        windowMs: 15 * 60 * 1000,
        limit: 10,
        message: "Bạn đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút."
    }),
    createEndpointLimiter({
        path: "/api/v1/auth/register",
        windowMs: 60 * 60 * 1000,
        limit: 5,
        message: "Bạn đăng ký quá nhiều lần. Vui lòng thử lại sau 1 giờ."
    }),
    createEndpointLimiter({
        path: "/api/v1/auth/forgot-password",
        windowMs: 60 * 60 * 1000,
        limit: 5,
        message: "Bạn yêu cầu đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau 1 giờ."
    }),
    createEndpointLimiter({
        path: "/api/v1/auth/reset-password",
        windowMs: 15 * 60 * 1000,
        limit: 10,
        message: "Bạn đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau 15 phút."
    })
];
