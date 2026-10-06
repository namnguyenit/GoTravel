import express from "express";
import { connect } from "node:net";
import { identityTarget } from "./configuration.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { RouteValidationError } from "./config-validation.js";

const base = "/api/v1/gateway-admin";
const admin = async (req, res, next) => {
  if (!req.auth?.roles.split(/\s+/).includes("ROLE_ADMIN"))
    return res.status(403).json({
      status: 403,
      message: "Chỉ quản trị viên được quản lý Gateway.",
    });
  try {
    // JWT scopes can outlive a role revocation. Read current roles from SSO
    // before every management request; never grant access on lookup failure.
    const response = await fetch(`${identityTarget()}/api/users/me`, {
      headers: { authorization: req.headers.authorization },
      signal: AbortSignal.timeout(5000),
    });
    if ([401, 403].includes(response.status))
      return res.status(403).json({
        status: 403,
        message: "Quyền quản trị đã thay đổi. Hãy đăng nhập lại.",
      });
    if (!response.ok) throw new Error("Identity unavailable");
    const payload = await response.json();
    if (
      !Array.isArray(payload.data?.roles) ||
      !payload.data.roles.some((role) => ["ADMIN", "ROLE_ADMIN"].includes(role))
    )
      return res.status(403).json({
        status: 403,
        message: "Tài khoản không còn quyền quản trị Gateway.",
      });
    next();
  } catch {
    res.status(503).json({
      status: 503,
      message:
        "Không thể xác minh quyền quản trị với Identity. Vui lòng thử lại.",
    });
  }
};
const probe = (service) =>
  new Promise((resolve) => {
    if (!service.enabled || !service.target)
      return resolve({
        ...service,
        state: service.enabled ? "unconfigured" : "disabled",
      });
    const url = new URL(service.target);
    const socket = connect({
      host: url.hostname.replace(/^\[|\]$/g, ""),
      port: Number(url.port || (url.protocol === "https:" ? 443 : 80)),
    });
    let finished = false;
    const done = (state) => {
      if (finished) return;
      finished = true;
      socket.destroy();
      resolve({ ...service, state });
    };
    socket.setTimeout(800);
    socket.once("connect", () => done("reachable"));
    socket.once("timeout", () => done("unreachable"));
    socket.once("error", () => done("unreachable"));
  });

export function setupGatewayAdmin(app, registry) {
  const router = express.Router();
  router.use(verifyJWT, admin, (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.get("/overview", async (_req, res) => {
    const snapshot = registry.snapshot();
    res.json({
      status: 200,
      data: {
        ...snapshot,
        services: await Promise.all(snapshot.services.map(probe)),
        storage: "sqlite",
        requestContext: { ip: _req.ip, secure: _req.secure },
      },
    });
  });
  router.get("/config", (_req, res) =>
    res.json({ status: 200, data: registry.snapshot() }),
  );
  router.get("/revisions", (_req, res) =>
    res.json({ status: 200, data: registry.revisions() }),
  );
  router.get("/events", (req, res) => {
    res.set({
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    const startedAt = Date.now();
    let last = -1;
    const send = () => {
      // Reconnect once a minute so revoked accounts must pass a fresh check.
      if (Date.now() >= req.auth.exp * 1000 || Date.now() - startedAt >= 60000)
        return res.end();
      const state = registry.snapshot();
      if (state.version !== last) {
        last = state.version;
        res.write(
          `event: configuration\ndata: ${JSON.stringify({ version: state.version, updatedAt: state.updatedAt })}\n\n`,
        );
      } else res.write(": heartbeat\n\n");
    };
    send();
    const unsubscribe = registry.subscribe(send);
    const timer = setInterval(send, 10000);
    req.on("close", () => {
      clearInterval(timer);
      unsubscribe();
    });
  });
  router.use(express.json({ limit: "1mb", strict: true }));
  router.use((req, _res, next) => {
    if (
      ["POST", "PUT", "DELETE"].includes(req.method) &&
      (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
    )
      return next(new RouteValidationError("Request cần có JSON object."));
    next();
  });
  const reply = (res, data) => res.json({ status: 200, data });
  router.post("/routes/batch", (req, res) => {
    if (
      !Array.isArray(req.body.items) ||
      !req.body.items.length ||
      req.body.items.length > 20
    )
      throw new RouteValidationError("Mỗi lần thêm cần 1–20 route.");
    reply(
      res,
      registry.mutate(
        req.body.version,
        (config) => ({
          ...config,
          routes: [...config.routes, ...req.body.items],
        }),
        req.auth.sub,
        `Thêm ${req.body.items.length} endpoint REST`,
      ),
    );
  });
  router.post("/preview", (req, res) => reply(res, registry.preview(req.body)));
  router.put("/config", (req, res) =>
    reply(
      res,
      registry.replace(req.body.version, req.body.config, req.auth.sub),
    ),
  );
  router.post("/revisions/:version/restore", (req, res) =>
    reply(
      res,
      registry.restore(
        req.body.version,
        Number(req.params.version),
        req.auth.sub,
      ),
    ),
  );
  const applyGroupLimit = (config, item, enabled) => {
    if (enabled === undefined || enabled === false) return;
    if (enabled !== true || !item?.rateLimit?.group)
      throw new RouteValidationError("Cần chọn nhóm rate limit hợp lệ.");
    for (const route of config.routes)
      if (
        route.serviceKey === item.serviceKey &&
        route.rateLimit.group === item.rateLimit.group
      )
        route.rateLimit = structuredClone(item.rateLimit);
  };
  for (const type of ["routes", "services"]) {
    const key = type === "routes" ? "id" : "key";
    router.post(`/${type}`, (req, res) =>
      reply(
        res,
        registry.mutate(
          req.body.version,
          (config) => {
            if (config[type].some((x) => x[key] === req.body.item?.[key]))
              throw new RouteValidationError("Mục đã tồn tại.", 409);
            config[type].push(req.body.item);
            if (type === "routes")
              applyGroupLimit(
                config,
                req.body.item,
                req.body.applyRateLimitToGroup,
              );
            return config;
          },
          req.auth.sub,
          `Thêm ${type}: ${req.body.item?.[key]}`,
        ),
      ),
    );
    router.put(`/${type}/:id`, (req, res) =>
      reply(
        res,
        registry.mutate(
          req.body.version,
          (config) => {
            const index = config[type].findIndex(
              (x) => x[key] === req.params.id,
            );
            if (index < 0)
              throw new RouteValidationError("Mục không tồn tại.", 404);
            if (req.body.item?.[key] !== req.params.id)
              throw new RouteValidationError(
                "Không được đổi ID/mã của mục hiện có.",
              );
            if (type === "routes") {
              // Older open consoles do not know the newly added policy fields.
              // Omission must not silently remove an existing security policy.
              const previous = config[type][index];
              req.body.item = {
                ...req.body.item,
                security: req.body.item.security ?? previous.security,
                rateLimit: {
                  ...req.body.item.rateLimit,
                  key: req.body.item.rateLimit?.key ?? previous.rateLimit.key,
                  group:
                    req.body.item.rateLimit?.group ?? previous.rateLimit.group,
                },
              };
            }
            config[type][index] = req.body.item;
            if (type === "routes")
              applyGroupLimit(
                config,
                req.body.item,
                req.body.applyRateLimitToGroup,
              );
            return config;
          },
          req.auth.sub,
          `Sửa ${type}: ${req.params.id}`,
        ),
      ),
    );
    router.delete(`/${type}/:id`, (req, res) =>
      reply(
        res,
        registry.mutate(
          req.body.version,
          (config) => {
            if (!config[type].some((x) => x[key] === req.params.id))
              throw new RouteValidationError("Mục không tồn tại.", 404);
            config[type] = config[type].filter((x) => x[key] !== req.params.id);
            return config;
          },
          req.auth.sub,
          `Xóa ${type}: ${req.params.id}`,
        ),
      ),
    );
  }
  router.put("/settings", (req, res) =>
    reply(
      res,
      registry.mutate(
        req.body.version,
        (config) => ({ ...config, settings: { ...req.body.settings, cookieDomains: req.body.settings.cookieDomains ?? config.settings.cookieDomains } }),
        req.auth.sub,
        "Cập nhật chính sách Gateway",
      ),
    ),
  );
  router.use((error, _req, res, _next) => {
    const status =
      error instanceof RouteValidationError
        ? error.status
        : error.type === "entity.too.large"
          ? 413
          : error instanceof SyntaxError
            ? 400
            : 503;
    res.status(status).json({
      status,
      errorCode: error.code || "GATEWAY_CONFIG_FAILED",
      message:
        status === 503
          ? "Không thể lưu cấu hình. Phiên bản đang chạy vẫn được giữ nguyên."
          : error.message,
    });
  });
  app.use(base, router);
}
