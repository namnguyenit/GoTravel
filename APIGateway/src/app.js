import express from 'express';
import cors from 'cors';
import {setupProxy} from './gateway/proxy.routes.js';
import { setupSessionRoutes } from './gateway/session.routes.js';
import { isAllowedOrigin, protectCookieRequests } from './middlewares/csrf.middleware.js';
import { buildErrorResponse, buildSuccessResponse, GatewayError, GatewaySuccess } from './utils/response.helper.js';

const app = express();

const trustedProxy = process.env.TRUST_PROXY?.trim() || "loopback";
if (trustedProxy === "true" || /^\d+$/.test(trustedProxy)) {
    throw new Error("TRUST_PROXY must name trusted proxy IPs or subnets, not all proxies or a hop count");
}
app.set("trust proxy", trustedProxy === "false" ? false : trustedProxy);

app.use(cors({
    origin: (origin, callback) => callback(null, !origin || isAllowedOrigin(origin)),
    credentials: true
}));

// GeoIP restriction: only allow Vietnam traffic through Cloudflare Tunnel
app.use((req, res, next) => {
    const cfCountry = req.headers['cf-ipcountry'];
    if (cfCountry && cfCountry.toUpperCase() !== 'VN') {
        console.warn(`[GeoBlock] Access denied for country ${cfCountry} on ${req.method} ${req.originalUrl}`);
        return res.status(403).json({
            success: false,
            message: 'Access restricted: Only visitors from Vietnam (VN) are permitted.',
            country: cfCountry
        });
    }
    next();
});

app.use((req, res, next) => {
    for (const name of Object.keys(req.headers)) {
        if (/^(x-internal-|x-user-)/i.test(name)) delete req.headers[name];
    }
    next();
});

app.use(protectCookieRequests);

app.use((req, res, next) => {
    if (req.path === "/api/v1/internal" || req.path.startsWith("/api/v1/internal/")) {
        return buildErrorResponse(res, GatewayError.INTERNAL_ROUTE_BLOCKED);
    }

    next();
});

setupSessionRoutes(app);
setupProxy(app);

app.get('/health', (req, res) => {
    // Log ra console để ghi nhận có request (tạo activity log)
    console.log(`[${new Date().toISOString()}] Health check pinged!`);
    return buildSuccessResponse(res, GatewaySuccess.HEALTH_CHECK_SUCCESS, {
        service: 'APIGateway',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

export default app;
