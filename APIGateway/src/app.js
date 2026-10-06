import express from "express";
import { createDynamicLimiter } from "./middlewares/dynamic-rate-limit.middleware.js";
import cors from "cors";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setupProxy } from "./gateway/proxy.routes.js";
import { setupSessionRoutes } from "./gateway/session.routes.js";
import { createRouteRegistry } from "./gateway/route-registry.js";
import { setupGatewayAdmin } from "./gateway/gateway-admin.routes.js";
import { setRegistry } from "./gateway/configuration.js";
import {
  isAllowedOrigin,
  protectCookieRequests,
} from "./middlewares/csrf.middleware.js";
import {
  buildErrorResponse,
  buildSuccessResponse,
  GatewayError,
  GatewaySuccess,
} from "./utils/response.helper.js";

const app = express();
const routeRegistry = createRouteRegistry();
setRegistry(routeRegistry);
app.locals.gatewayRegistry = routeRegistry;

const trustedProxy = process.env.TRUST_PROXY?.trim() || "loopback";
if (trustedProxy === "true" || /^\d+$/.test(trustedProxy)) {
  throw new Error(
    "TRUST_PROXY must name trusted proxy IPs or subnets, not all proxies or a hop count",
  );
}
app.set("trust proxy", trustedProxy === "false" ? false : trustedProxy);

app.disable("x-powered-by");
const globalLimiter = createDynamicLimiter();
app.use((req, res, next) => {
  const policy = routeRegistry.getSettings().trafficPolicy;
  if (policy.securityHeaders)
    res.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    });
  if (req.secure && policy.hstsMaxAgeSeconds)
    res.set("Strict-Transport-Security", `max-age=${policy.hstsMaxAgeSeconds}`);

  next();
});

app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, !origin || isAllowedOrigin(origin)),
    credentials: true,
  }),
);

app.use((req, res, next) => {
  const policy = routeRegistry.getSettings().trafficPolicy;
  const path = req.path.toLowerCase();
  // Keep the control plane accessible to fix an accidentally restrictive limit.
  if (
    policy.rateLimit.enabled &&
    path.startsWith("/api/v1/") &&
    !(
      path === "/api/v1/gateway-admin" ||
      path.startsWith("/api/v1/gateway-admin/")
    )
  )
    return globalLimiter(req, res, next, "gateway-api", policy.rateLimit);
  next();
});

// Apply the current country policy when the trusted ingress supplies GeoIP.
app.use((req, res, next) => {
  // VNPAY server notifications are authenticated by Java's signature check.
  // Provider infrastructure may call from another country; this exception
  // applies only to the exact GET IPN endpoint, never to browser/API routes.
  if (req.method === "GET" && req.path === "/api/v1/payments/vnpay/ipn")
    return next();
  const cfCountry = req.headers["cf-ipcountry"];
  const policy = routeRegistry.getSettings();
  if (
    policy.geoRestriction &&
    cfCountry &&
    !policy.allowedCountries.includes(cfCountry.toUpperCase())
  ) {
    console.warn(
      `[GeoBlock] Access denied for country ${cfCountry} on ${req.method} ${req.path}`,
    );
    return res.status(403).json({
      success: false,
      message: `Access restricted: visitors from ${policy.allowedCountries.join(", ")} only.`,
      country: cfCountry,
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
  if (
    req.path === "/api/v1/internal" ||
    req.path.startsWith("/api/v1/internal/")
  ) {
    return buildErrorResponse(res, GatewayError.INTERNAL_ROUTE_BLOCKED);
  }

  next();
});

setupSessionRoutes(app);
setupGatewayAdmin(app, routeRegistry);
setupProxy(app, routeRegistry);

const adminUi = process.env.GATEWAY_ADMIN_UI_DIR
  ? `${resolve(process.env.GATEWAY_ADMIN_UI_DIR)}/`
  : fileURLToPath(new URL("./admin-ui/", import.meta.url));
app.use("/admin/gateway", (_req, res, next) => {
  res.set({
    "Cache-Control": "no-store",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  });
  next();
});
app.get("/admin/gateway", (_req, res) => res.sendFile(`${adminUi}/index.html`));
app.use(
  "/admin/gateway",
  express.static(adminUi, { index: false, dotfiles: "deny" }),
);

app.get("/health", (req, res) => {
  // Log ra console để ghi nhận có request (tạo activity log)
  console.log(`[${new Date().toISOString()}] Health check pinged!`);
  return buildSuccessResponse(res, GatewaySuccess.HEALTH_CHECK_SUCCESS, {
    service: "APIGateway",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default app;
