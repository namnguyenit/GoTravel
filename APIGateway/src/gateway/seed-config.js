import defaults from "./default-config.json" with { type: "json" };
import { randomUUID } from "node:crypto";

const serviceEnv = {
  identity: "IDENTITY_SERVICE_URL",
  media: "MEDIA_SERVICE_URL",
  catalog: "CATALOG_SERVICE_URL",
  booking: "BOOKING_SERVICE_URL",
  cart: "CART_SERVICE_URL",
  payment: "PAYMENT_SERVICE_URL",
  search: "SEARCH_SERVICE_URL",
  car: "CAR_SERVICE_URL",
  ticket: "TICKET_SERVICE_URL",
};
export const initialServices = () =>
  defaults.services.map((service) => ({
    ...service,
    target: process.env[serviceEnv[service.key]] || service.target,
    enabled: Boolean(process.env[serviceEnv[service.key]] || service.enabled),
  }));
// Bootstrap data is imported once for an empty SQLite database. It is never
// merged into existing configuration at startup, so deleted routes stay deleted.
export function seedConfiguration() {
  const config = structuredClone(defaults);
  config.services = initialServices();
  config.settings.cookieDomain =
    process.env.AUTH_COOKIE_DOMAIN || config.settings.cookieDomain;
  config.settings.allowedOrigins = [
    ...new Set([
      ...config.settings.allowedOrigins,
      ...(process.env.AUTH_ALLOWED_ORIGINS || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    ]),
  ];
  return config;
}
export const newRoute = (fields = {}) => ({
  id: randomUUID(),
  name: "New route",
  description: "",
  methods: ["GET"],
  matchType: "exact",
  sourcePath: "/api/v1/example",
  upstreamPath: "/api/v1/example",
  serviceKey: "catalog",
  enabled: true,
  auth: "jwt",
  roles: [],
  priority: 0,
  timeoutMs: 15000,
  changeOrigin: true,
  preserveQuery: true,
  forwardAuthorization: true,
  query: { set: {}, remove: [] },
  headers: { request: {}, response: {}, removeRequest: [], removeResponse: [] },
  rateLimit: { enabled: false, limit: 100, windowMs: 60000 },
  paramTypes: {},
  ...fields,
});
