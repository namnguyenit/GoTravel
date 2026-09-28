import express from 'express';
import cors from 'cors';
import {setupProxy} from './gateway/proxy.routes.js';
import { buildErrorResponse, buildSuccessResponse, GatewayError, GatewaySuccess } from './utils/response.helper.js';

const app = express();

const parseTrustProxy = (value) => {
    if (!value) return undefined;
    if (value === "true") return true;
    if (value === "false") return false;

    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? value : numericValue;
};

const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
if (trustProxy !== undefined) {
    app.set("trust proxy", trustProxy);
}

app.use(cors());

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
    delete req.headers["x-internal-service-token"];
    next();
});

app.use((req, res, next) => {
    if (req.path === "/api/v1/internal" || req.path.startsWith("/api/v1/internal/")) {
        return buildErrorResponse(res, GatewayError.INTERNAL_ROUTE_BLOCKED);
    }

    next();
});

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
