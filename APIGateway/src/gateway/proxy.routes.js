import { createProxyMiddleware } from "http-proxy-middleware";
import { createDynamicLimiter } from "../middlewares/dynamic-rate-limit.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { enforceRequestPolicy, bufferLimitedBody } from "./security-policy.js";
import { RouteValidationError } from "./config-validation.js";

export function setupProxy(app, registry) {
  const proxies = new Map();
  const limiter = createDynamicLimiter();
  let version = -1;
  app.use((req, res, next) => {
    const currentVersion = registry.version();
    if (currentVersion !== version) {
      // Existing requests keep their proxy closure; subsequent requests use
      // the committed snapshot. No server restart or partially updated state.
      proxies.clear();
      version = currentVersion;
    }
    let matched;
    try {
      matched = registry.match(req.method, req.originalUrl);
    } catch (error) {
      if (error instanceof RouteValidationError)
        return res
          .status(error.status)
          .json({ status: error.status, message: error.message });
      return next(error);
    }
    if (!matched) return next();
    const { route, service, destination } = matched;
    if (!service?.enabled || !service.target)
      return res.status(503).json({
        status: 503,
        message: "Service đích đang tắt hoặc chưa được cấu hình.",
      });
    const forwardBuffered = async () => {
      if (
        !(await bufferLimitedBody(
          req,
          res,
          route.security.maxBodyBytes,
          route.timeoutMs,
        ))
      )
        return;
      const proxyKey = `${currentVersion}:${route.id}`;
      let proxy = proxies.get(proxyKey);
      if (!proxy) {
        proxy = createProxyMiddleware({
          target: service.target,
          changeOrigin: route.changeOrigin,
          proxyTimeout: route.timeoutMs,
          timeout: route.timeoutMs + 1000,
          pathRewrite: (_path, request) => request.gatewayDestination,
          on: {
            proxyReq: (upstream, request) => {
              if (request.gatewayBodyBuffer) {
                upstream.removeHeader("transfer-encoding");
                upstream.setHeader(
                  "content-length",
                  request.gatewayBodyBuffer.length,
                );
                upstream.write(request.gatewayBodyBuffer, () => {
                  delete request.gatewayBodyBuffer;
                  request.gatewayBodyRelease?.();
                });
                upstream.once("error", () => request.gatewayBodyRelease?.());
              }
            },
            proxyRes: (response) => {
              // Browser sessions are created exclusively by the SSO handlers.
              delete response.headers["set-cookie"];
              for (const name of [
                "x-content-type-options",
                "x-frame-options",
                "strict-transport-security",
                "referrer-policy",
              ])
                delete response.headers[name];
              for (const key of Object.keys(response.headers))
                if (key.startsWith("access-control-"))
                  delete response.headers[key];
              route.headers.removeResponse.forEach(
                (key) => delete response.headers[key],
              );
              Object.assign(response.headers, route.headers.response);
            },
            error: (error, request, response) => {
              const timedOut =
                Date.now() - request.gatewayStartedAt >= route.timeoutMs ||
                error.code === "ETIMEDOUT";
              if (!response.headersSent)
                response.writeHead(timedOut ? 504 : 503, {
                  "content-type": "application/json",
                });
              if (!response.writableEnded)
                response.end(
                  JSON.stringify({
                    status: timedOut ? 504 : 503,
                    message: timedOut
                      ? "Backend phản hồi quá thời gian cho phép."
                      : "Không thể kết nối backend.",
                  }),
                );
            },
          },
        });
        proxies.set(proxyKey, proxy);
      }
      req.gatewayDestination = destination;
      req.gatewayStartedAt = Date.now();
      delete req.headers.cookie;
      delete req.headers["x-csrf-token"];
      if (route.auth === "public" || !route.forwardAuthorization)
        delete req.headers.authorization;
      route.headers.removeRequest.forEach((key) => delete req.headers[key]);
      Object.assign(req.headers, route.headers.request);
      proxy(req, res, next);
    };
    const forward = () => forwardBuffered().catch(next);
    const authenticate = () => {
      if (!enforceRequestPolicy(req, res, route.security)) return;
      if (route.auth === "public") return forward();
      verifyJWT(req, res, () => {
        const roles = req.auth.roles.split(/\s+/);
        if (
          route.roles.length &&
          !route.roles.some((role) => roles.includes(role))
        )
          return res.status(403).json({
            status: 403,
            message: "Tài khoản không có quyền truy cập route này.",
          });
        if (route.rateLimit.enabled && route.rateLimit.key !== "ip")
          return limiter(
            req,
            res,
            forward,
            route.rateLimit.group
              ? `group:${service.key}:${route.rateLimit.group}`
              : route.id,
            route.rateLimit,
          );
        forward();
      });
    };
    if (!route.rateLimit.enabled || route.rateLimit.key !== "ip")
      return authenticate();
    return limiter(
      req,
      res,
      authenticate,
      route.rateLimit.group
        ? `group:${service.key}:${route.rateLimit.group}`
        : route.id,
      route.rateLimit,
    );
  });
}
