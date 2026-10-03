import express from 'express';
import { connect } from 'node:net';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { buildErrorResponse, GatewayError } from '../utils/response.helper.js';
import { getServiceTargets, RouteValidationError } from './route-registry.js';

const adminBase = '/api/v1/gateway-admin';

const requireAdmin = (req, res, next) => {
    if (!req.auth?.roles?.split(/\s+/).includes('ROLE_ADMIN')) {
        return res.status(403).json({
            status: 403, errorCode: 'GATEWAY_ADMIN_FORBIDDEN',
            message: 'Chỉ quản trị viên mới được quản lý Gateway.', data: null
        });
    }
    next();
};

const probeConnection = (service) => new Promise((resolve) => {
    if (!service.target) {
        resolve({ ...service, state: 'unconfigured' });
        return;
    }
    const url = new URL(service.target);
    const socket = connect({
        host: url.hostname,
        port: Number(url.port || (url.protocol === 'https:' ? 443 : 80))
    });
    let settled = false;
    const finish = (state) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve({ ...service, state });
    };
    socket.setTimeout(800);
    socket.once('connect', () => finish('reachable'));
    socket.once('timeout', () => finish('unreachable'));
    socket.once('error', () => finish('unreachable'));
});

export const setupGatewayAdmin = (app, registry, staticRoutes) => {
    app.get(`${adminBase}/overview`, verifyJWT, requireAdmin, async (_req, res) => {
        const services = await Promise.all(getServiceTargets().map(probeConnection));
        return res.set('Cache-Control', 'no-store').json({
            status: 200,
            data: {
                ...registry.snapshot(),
                services,
                staticRoutes: staticRoutes.map((route) => ({
                    path: route.url,
                    service: services.find((service) => service.target === route.target)?.key || 'other',
                    auth: route.auth ? 'jwt' : 'public',
                    publicRequests: (route.publicRequests || []).map(({ method, path }) => ({
                        method, path: typeof path === 'string' ? path : path.toString()
                    }))
                }))
            }
        });
    });

    app.put(`${adminBase}/routes`, verifyJWT, requireAdmin,
        express.json({ limit: '64kb', strict: true }), async (req, res) => {
            try {
                if (!req.body || typeof req.body !== 'object') {
                    throw new RouteValidationError('Dữ liệu cấu hình không hợp lệ.');
                }
                const snapshot = await registry.replace(req.body.version, req.body.routes);
                console.info(`[Gateway Admin] ${req.auth.sub} saved route version ${snapshot.version} (${snapshot.routes.length} routes)`);
                return res.set('Cache-Control', 'no-store').json({ status: 200, data: snapshot });
            } catch (error) {
                if (error instanceof RouteValidationError) {
                    return res.status(error.status).json({
                        status: error.status, errorCode: error.code, message: error.message, data: null
                    });
                }
                console.error('[Gateway Admin] Cannot save routes:', error);
                return res.status(503).json({
                    status: 503, errorCode: 'GATEWAY_ROUTE_SAVE_FAILED',
                    message: 'Không thể lưu cấu hình route trên máy chủ.', data: null
                });
            }
        });
};

export const setupDynamicProxy = (app, registry) => {
    const proxies = new Map(getServiceTargets().filter((service) => service.target)
        .map((service) => [service.key, createProxyMiddleware({
            target: service.target,
            changeOrigin: true,
            pathRewrite: (_path, req) => req.gatewayDestination,
            on: {
                error: (error, req, res) => {
                    console.error(`[Dynamic Proxy] ${service.key}: ${error.message}`);
                    if (!res.headersSent) buildErrorResponse(res, GatewayError.SERVICE_UNAVAILABLE);
                }
            }
        })]));

    app.use((req, res, next) => {
        const route = registry.match(req.method, req.path);
        if (!route) return next();
        const proxy = proxies.get(route.serviceKey);
        if (!proxy) return buildErrorResponse(res, GatewayError.SERVICE_UNAVAILABLE);

        return verifyJWT(req, res, () => {
            const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
            req.gatewayDestination = `${route.destination}${query}`;
            delete req.headers.cookie;
            delete req.headers['x-csrf-token'];
            proxy(req, res, next);
        });
    });
};
