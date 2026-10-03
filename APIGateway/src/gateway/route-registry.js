import Database from "better-sqlite3";
import { mkdirSync, existsSync, readFileSync, chmodSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { userInfo } from "node:os";
import { EventEmitter } from "node:events";
import { seedConfiguration, newRoute } from "./seed-config.js";
import {
  validateConfiguration,
  compileConfiguration,
  RouteValidationError,
} from "./config-validation.js";
export { RouteValidationError } from "./config-validation.js";

export function createRouteRegistry(options = {}) {
  const legacyFile = options.legacyFile ?? process.env.GATEWAY_ROUTES_FILE;
  const dbPath =
    options.dbPath ||
    process.env.GATEWAY_CONFIG_DB ||
    (legacyFile
      ? join(dirname(resolve(legacyFile)), "gateway.sqlite")
      : join(
          userInfo().homedir,
          ".local/share/gotravel-gateway/gateway.sqlite",
        ));
  if (dbPath !== ":memory:")
    mkdirSync(dirname(resolve(dbPath)), { recursive: true, mode: 0o770 });
  const db = new Database(dbPath);
  if (db.pragma("user_version", { simple: true }) > 1) {
    db.close();
    throw new Error("Gateway database schema is newer than this application");
  }
  db.pragma("busy_timeout = 5000");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
        CREATE TABLE IF NOT EXISTS meta (id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS services (key TEXT PRIMARY KEY, config TEXT NOT NULL CHECK(json_valid(config)));
        CREATE TABLE IF NOT EXISTS routes (id TEXT PRIMARY KEY, service_key TEXT NOT NULL REFERENCES services(key), config TEXT NOT NULL CHECK(json_valid(config)));
        CREATE INDEX IF NOT EXISTS routes_service ON routes(service_key);
        CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), config TEXT NOT NULL CHECK(json_valid(config)));
        CREATE TABLE IF NOT EXISTS revisions (version INTEGER PRIMARY KEY, created_at TEXT NOT NULL, actor TEXT NOT NULL, reason TEXT NOT NULL, snapshot TEXT NOT NULL CHECK(json_valid(snapshot)));
        PRAGMA user_version=1;
    `);
  const events = new EventEmitter();
  events.setMaxListeners(100);
  const meta = db.prepare(
    "SELECT version, updated_at AS updatedAt FROM meta WHERE id=1",
  );
  const insertService = db.prepare(
    "INSERT INTO services(key,config) VALUES (?,?)",
  );
  const insertRoute = db.prepare(
    "INSERT INTO routes(id,service_key,config) VALUES (?,?,?)",
  );
  const readConfig = () => ({
    services: db
      .prepare("SELECT config FROM services ORDER BY key")
      .all()
      .map((x) => JSON.parse(x.config)),
    routes: db
      .prepare("SELECT config FROM routes ORDER BY rowid")
      .all()
      .map((x) => JSON.parse(x.config)),
    settings: JSON.parse(
      db.prepare("SELECT config FROM settings WHERE id=1").get().config,
    ),
  });
  const permissions = () => {
    if (dbPath === ":memory:") return;
    for (const path of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
      if (existsSync(path)) {
        try {
          chmodSync(path, 0o660);
        } catch (error) {
          if (error.code !== "EPERM") throw error;
        }
      }
    }
  };
  const persist = (config, version, actor, reason) => {
    const updatedAt = new Date().toISOString();
    db.exec("DELETE FROM routes; DELETE FROM services;");
    config.services.forEach((x) => insertService.run(x.key, JSON.stringify(x)));
    config.routes.forEach((x) =>
      insertRoute.run(x.id, x.serviceKey, JSON.stringify(x)),
    );
    db.prepare("INSERT OR REPLACE INTO settings(id,config) VALUES(1,?)").run(
      JSON.stringify(config.settings),
    );
    db.prepare(
      "INSERT OR REPLACE INTO meta(id,version,updated_at) VALUES(1,?,?)",
    ).run(version, updatedAt);
    db.prepare(
      "INSERT INTO revisions(version,created_at,actor,reason,snapshot) VALUES(?,?,?,?,?)",
    ).run(version, updatedAt, actor, reason, JSON.stringify(config));
    db.prepare("DELETE FROM revisions WHERE version < ?").run(
      Math.max(1, version - 99),
    );
    return { version, updatedAt, ...config };
  };
  db.transaction(() => {
    if (meta.get()) return;
    let config = options.seed || seedConfiguration();
    if (legacyFile && existsSync(legacyFile)) {
      const legacy = JSON.parse(readFileSync(legacyFile, "utf8"));
      if (!Array.isArray(legacy.routes))
        throw new Error(
          "Invalid legacy routes file; refusing to discard configuration",
        );
      config.routes.push(
        ...legacy.routes
          .map((x) =>
            newRoute({ ...x, methods: [x.method], method: undefined }),
          )
          .map(({ method, ...x }) => x),
      );
    }
    config = validateConfiguration(config);
    persist(config, 1, "migration", "Khởi tạo SQLite từ các route hiện có");
  }).immediate();
  permissions();
  let cached;
  let dispatch;
  const current = () => {
    const current = meta.get();
    if (!cached || cached.version !== current.version) {
      // A read transaction keeps meta, services, routes and settings on one
      // SQLite snapshot when another process commits concurrently.
      const refreshed = db.transaction(() => ({
        ...meta.get(),
        ...readConfig(),
      }))();
      const { version, updatedAt, ...data } = refreshed;
      const config = validateConfiguration(data);
      dispatch = compileConfiguration(config);
      cached = { version, updatedAt, ...config };
    }
    return cached;
  };
  const snapshot = () => structuredClone(current());
  snapshot();
  const mutate = (
    version,
    update,
    actor = "unknown",
    reason = "Cập nhật cấu hình",
  ) => {
    if (!Number.isSafeInteger(version))
      throw new RouteValidationError("Thiếu phiên bản cấu hình.");
    const result = db
      .transaction(() => {
        if (meta.get().version !== version)
          throw new RouteValidationError(
            "Cấu hình đã đổi ở phiên khác. Hãy tải lại trước khi lưu.",
            409,
            "GATEWAY_CONFIG_CONFLICT",
          );
        const config = validateConfiguration(update(readConfig()));
        compileConfiguration(config);
        return persist(
          config,
          version + 1,
          String(actor).slice(0, 200),
          String(reason).slice(0, 500),
        );
      })
      .immediate();
    permissions();
    cached = null;
    snapshot();
    events.emit("change", {
      version: result.version,
      updatedAt: result.updatedAt,
    });
    return result;
  };
  return {
    dbPath,
    snapshot,
    version: () => current().version,
    getSettings: () => structuredClone(current().settings),
    mutate,
    match: (method, url) => {
      current();
      return dispatch(method, url);
    },
    getService: (key) =>
      structuredClone(current().services.find((x) => x.key === key)),
    replace: (version, config, actor) =>
      mutate(version, () => config, actor, "Thay toàn bộ cấu hình"),
    revisions: () =>
      db
        .prepare(
          "SELECT version,created_at AS createdAt,actor,reason FROM revisions ORDER BY version DESC LIMIT 100",
        )
        .all(),
    restore: (version, revision, actor) => {
      const row = db
        .prepare("SELECT snapshot FROM revisions WHERE version=?")
        .get(revision);
      if (!row) throw new RouteValidationError("Phiên bản không tồn tại.", 404);
      return mutate(
        version,
        () => JSON.parse(row.snapshot),
        actor,
        `Khôi phục từ v${revision}`,
      );
    },
    preview: ({ method, url, route }) => {
      if (
        typeof url !== "string" ||
        url.length > 4000 ||
        !url.startsWith("/") ||
        !["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(
          method,
        )
      )
        throw new RouteValidationError("Request mẫu không hợp lệ.");
      let config = snapshot();
      if (route)
        config.routes = [
          ...config.routes.filter((x) => x.id !== route.id),
          route,
        ];
      const { services, routes, settings } = config;
      const matched = compileConfiguration(
        validateConfiguration({ services, routes, settings }),
      )(method, url);
      return matched
        ? {
            routeId: matched.route.id,
            name: matched.route.name,
            method,
            gatewayPath: url,
            backendUrl: matched.backendUrl,
            serviceKey: matched.service.key,
            serviceEnabled: matched.service.enabled,
            auth: matched.route.auth,
            roles: matched.route.roles,
            timeoutMs: matched.route.timeoutMs,
          }
        : { matched: false, method, gatewayPath: url };
    },
    subscribe: (callback) => {
      events.on("change", callback);
      return () => events.off("change", callback);
    },
    close: () => {
      events.removeAllListeners();
      db.close();
    },
  };
}
