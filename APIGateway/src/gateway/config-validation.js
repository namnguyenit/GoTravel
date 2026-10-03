import {
  normalizeRouteSecurity,
  normalizeTrafficPolicy,
} from "./security-policy.js";
import { initialServices } from "./seed-config.js";

export class RouteValidationError extends Error {
  constructor(message, status = 400, code = "INVALID_GATEWAY_CONFIG") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const fail = (message) => {
  throw new RouteValidationError(message);
};
const object = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
const text = (value, name, max = 200) => {
  if (
    typeof value !== "string" ||
    value.length > max ||
    /[\x00-\x1f\x7f]/.test(value)
  )
    fail(`${name} không hợp lệ.`);
  return value.trim();
};
const integer = (value, name, min, max) => {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    fail(`${name} phải nằm trong ${min}–${max}.`);
  return value;
};
const boolean = (value, name) => {
  if (typeof value !== "boolean") fail(`${name} phải là true hoặc false.`);
  return value;
};
const list = (value, name, max = 100) => {
  if (!Array.isArray(value) || value.length > max)
    fail(`${name} phải là danh sách tối đa ${max} mục.`);
  return value;
};
const only = (value, fields, name) => {
  if (!object(value) || Object.keys(value).some((key) => !fields.includes(key)))
    fail(`${name} chứa trường không hợp lệ.`);
};
const methods = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);
const blockedHeaders =
  /^(authorization|cookie|set-cookie|host|connection|content-length|transfer-encoding|upgrade|proxy-.*|x-internal-.*|x-user-.*|x-forwarded-.*|forwarded|cf-.*|x-csrf-token|access-control-.*|x-content-type-options|x-frame-options|strict-transport-security|referrer-policy)$/i;
const blockedDestination = new Set([
  "internal",
  "actuator",
  "gateway-admin",
  "admin-ui",
]);
const corePaths = [
  "/api/v1/gateway-admin",
  "/admin/gateway",
  "/health",
  "/api/v1/auth/login",
  "/api/v1/auth/logout",
  "/api/v1/auth/session",
  "/api/v1/auth/refresh-roles",
];
const under = (path, prefix) =>
  path.toLowerCase() === prefix.toLowerCase() ||
  path.toLowerCase().startsWith(`${prefix.toLowerCase()}/`);
const overlapsReserved = (template, matchType, paths) => {
  const parts = template.toLowerCase().split("/");
  return paths.some((path) => {
    const reserved = path.toLowerCase().split("/");
    if (parts.length < reserved.length && matchType !== "prefix") return false;
    const sharedLength = Math.min(parts.length, reserved.length);
    return parts
      .slice(0, sharedLength)
      .every((part, index) => part.startsWith(":") || part === reserved[index]);
  });
};
const sessionDestinations = ["/api/auth/login", "/api/auth/refresh-roles"];
export function segments(path, name = "Đường dẫn") {
  if (
    typeof path !== "string" ||
    path.length > 300 ||
    !path.startsWith("/") ||
    path.includes("//") ||
    (path.length > 1 && path.endsWith("/")) ||
    /[?#%\s\\]/.test(path)
  )
    fail(`${name} không hợp lệ.`);
  const parts = path.slice(1).split("/");
  if (
    parts.length > 20 ||
    parts.some(
      (part) =>
        [".", ".."].includes(part) ||
        !/^(?:[A-Za-z0-9._-]+|:[A-Za-z][A-Za-z0-9_]*)$/.test(part),
    )
  )
    fail(`${name} chứa đoạn không hợp lệ.`);
  return parts;
}
const allowedHosts = () =>
  new Set([
    "localhost",
    "127.0.0.1",
    "[::1]",
    ...initialServices()
      .filter((x) => x.target)
      .map((x) => {
        try {
          return new URL(x.target).hostname;
        } catch {
          return "";
        }
      }),
    ...(process.env.GATEWAY_UPSTREAM_HOSTS || "")
      .split(",")
      .map((x) => x.trim().toLowerCase()),
  ]);
function normalizeService(input) {
  only(input, ["key", "name", "description", "target", "enabled"], "Service");
  if (!/^[a-z][a-z0-9-]{1,39}$/.test(input.key))
    fail(
      "Mã service phải dài 2–40 ký tự, gồm chữ thường, số và dấu gạch ngang.",
    );
  const name = text(input.name, "Tên service", 100);
  if (name.length < 2) fail("Tên service quá ngắn.");
  let target = text(input.target, "URL service", 300);
  const enabled = boolean(input.enabled, "Trạng thái service");
  if (target) {
    let url;
    try {
      url = new URL(target);
    } catch {
      fail("URL service không hợp lệ.");
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      !allowedHosts().has(url.hostname.toLowerCase()) ||
      ["0.0.0.0", "169.254.169.254", "[::]"].includes(url.hostname)
    )
      fail(
        "URL phải là HTTP(S) origin thuộc GATEWAY_UPSTREAM_HOSTS; không được chứa mật khẩu hoặc đường dẫn.",
      );
    if (
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      Number(url.port || (url.protocol === "https:" ? 443 : 80)) ===
        Number(process.env.GATEWAY_PORT || 5555)
    )
      fail("Service không được trỏ về chính Gateway.");
    target = url.origin;
  } else if (enabled) fail("Service đang bật phải có URL.");
  return {
    key: input.key,
    name,
    description: text(input.description ?? "", "Mô tả", 1000),
    target,
    enabled,
  };
}
function stringMap(input, name, headers = false) {
  if (!object(input) || Object.keys(input).length > 30)
    fail(`${name} phải là object tối đa 30 mục.`);
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (
      !/^[A-Za-z0-9_.-]{1,80}$/.test(key) ||
      ["__proto__", "constructor", "prototype"].includes(key)
    )
      fail(`${name}: khóa không hợp lệ.`);
    if (headers && blockedHeaders.test(key))
      fail(`Không được ghi đè header tin cậy: ${key}.`);
    const normalized = headers ? key.toLowerCase() : key;
    if (Object.hasOwn(result, normalized))
      fail(`${name}: tên header bị trùng.`);
    result[normalized] = text(value, name, 1000);
  }
  return result;
}
function names(input, name, headers = false) {
  return [
    ...new Set(
      list(input, name, 30).map((key) => {
        if (
          typeof key !== "string" ||
          !/^[A-Za-z0-9_.-]{1,80}$/.test(key) ||
          (headers && blockedHeaders.test(key))
        )
          fail(`${name}: tên không hợp lệ hoặc header được bảo vệ.`);
        return headers ? key.toLowerCase() : key;
      }),
    ),
  ];
}
function normalizeRoute(input, services) {
  only(
    input,
    [
      "id",
      "name",
      "description",
      "methods",
      "matchType",
      "sourcePath",
      "upstreamPath",
      "serviceKey",
      "enabled",
      "auth",
      "roles",
      "priority",
      "timeoutMs",
      "changeOrigin",
      "preserveQuery",
      "forwardAuthorization",
      "query",
      "headers",
      "rateLimit",
      "paramTypes",
      "security",
    ],
    "Route",
  );
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input.id,
    )
  )
    fail("ID route không hợp lệ.");
  const name = text(input.name, "Tên route", 160);
  if (name.length < 3) fail("Tên route phải có ít nhất 3 ký tự.");
  const source = segments(input.sourcePath, "Đường dẫn Gateway");
  const destination = segments(input.upstreamPath, "Đường dẫn backend");
  if (
    !(
      under(input.sourcePath, "/api/v1") ||
      input.sourcePath === "/.well-known/jwks.json"
    ) ||
    source.slice(0, 3).some((x) => x.startsWith(":")) ||
    overlapsReserved(input.sourcePath, input.matchType, corePaths) ||
    (input.sourcePath !== "/.well-known/jwks.json" && source.length < 3) ||
    (input.sourcePath === "/.well-known/jwks.json" &&
      input.matchType !== "exact")
  )
    fail(
      "Đường dẫn Gateway thuộc namespace dành riêng hoặc không bắt đầu bằng /api/v1/.",
    );
  if (
    [...source, ...destination].some((x) =>
      blockedDestination.has(x.toLowerCase()),
    ) ||
    overlapsReserved(input.upstreamPath, input.matchType, corePaths) ||
    overlapsReserved(input.upstreamPath, input.matchType, sessionDestinations)
  )
    fail("Không được ánh xạ tới API nội bộ hoặc API điều khiển Gateway.");
  const params = source.filter((x) => x.startsWith(":")).map((x) => x.slice(1));
  if (
    new Set(params).size !== params.length ||
    destination.some((x) => x.startsWith(":") && !params.includes(x.slice(1)))
  )
    fail("Tham số backend phải có trong đường dẫn Gateway.");
  const routeMethods = [...new Set(list(input.methods, "HTTP methods", 7))];
  if (!routeMethods.length || routeMethods.some((x) => !methods.has(x)))
    fail("HTTP method không hợp lệ.");
  if (!["exact", "prefix"].includes(input.matchType))
    fail("Kiểu khớp phải là exact hoặc prefix.");
  if (!["jwt", "public"].includes(input.auth))
    fail("Kiểu xác thực phải là jwt hoặc public.");
  const roles = [...new Set(list(input.roles, "Vai trò", 20))];
  if (
    roles.some(
      (x) => typeof x !== "string" || !/^ROLE_[A-Z0-9_]{2,50}$/.test(x),
    )
  )
    fail("Tên quyền phải có dạng ROLE_ADMIN.");
  if (
    input.auth === "public" &&
    (input.matchType !== "exact" ||
      roles.length ||
      [...source, ...destination].some((x) =>
        ["admin", "host", "me"].includes(x.toLowerCase()),
      ))
  )
    fail(
      "Route công khai phải khớp endpoint chính xác và không được trỏ tới namespace đặc quyền.",
    );
  if (!services.some((x) => x.key === input.serviceKey))
    fail("Service đích không tồn tại.");
  const enabled = boolean(input.enabled, "Trạng thái route");
  only(input.paramTypes, params, "Kiểu tham số");
  if (
    Object.values(input.paramTypes).some(
      (x) => !["segment", "uuid", "number"].includes(x),
    )
  )
    fail("Kiểu tham số không hợp lệ.");
  only(input.query, ["set", "remove"], "Query");
  only(
    input.headers,
    ["request", "response", "removeRequest", "removeResponse"],
    "Headers",
  );
  only(
    input.rateLimit,
    ["enabled", "limit", "windowMs", "key", "group"],
    "Rate limit",
  );
  const rateKey = input.rateLimit.key ?? "ip";
  if (
    !["ip", "user", "ip-user"].includes(rateKey) ||
    (input.auth === "public" && rateKey !== "ip")
  )
    fail(
      "Rate limit theo tài khoản cần route JWT; khóa phải là ip, user hoặc ip-user.",
    );
  const rateGroup = text(input.rateLimit.group ?? "", "Nhóm rate limit", 80);
  if (!/^[A-Za-z0-9_.:-]*$/.test(rateGroup))
    fail(
      "Nhóm rate limit chỉ dùng chữ, số, dấu chấm, gạch ngang, gạch dưới hoặc hai chấm.",
    );
  return {
    id: input.id,
    name,
    description: text(input.description ?? "", "Mô tả", 1000),
    methods: routeMethods,
    matchType: input.matchType,
    sourcePath: input.sourcePath,
    upstreamPath: input.upstreamPath,
    serviceKey: input.serviceKey,
    enabled,
    auth: input.auth,
    roles,
    priority: integer(input.priority, "Ưu tiên", -1000, 1000),
    timeoutMs: integer(input.timeoutMs, "Timeout", 100, 120000),
    changeOrigin: boolean(input.changeOrigin, "Change origin"),
    preserveQuery: boolean(input.preserveQuery, "Giữ query"),
    forwardAuthorization:
      boolean(input.forwardAuthorization, "Chuyển tiếp JWT") &&
      input.auth === "jwt",
    query: {
      set: stringMap(input.query.set, "Query"),
      remove: names(input.query.remove, "Query xóa"),
    },
    headers: {
      request: stringMap(input.headers.request, "Header request", true),
      response: stringMap(input.headers.response, "Header response", true),
      removeRequest: names(
        input.headers.removeRequest,
        "Header request xóa",
        true,
      ),
      removeResponse: names(
        input.headers.removeResponse,
        "Header response xóa",
        true,
      ),
    },
    security: normalizeRouteSecurity(input.security, fail),
    rateLimit: {
      key: rateKey,
      group: rateGroup,
      enabled: boolean(input.rateLimit.enabled, "Bật giới hạn"),
      limit: integer(input.rateLimit.limit, "Số request", 1, 100000),
      windowMs: integer(
        input.rateLimit.windowMs,
        "Cửa sổ giới hạn",
        1000,
        86400000,
      ),
    },
    paramTypes: { ...input.paramTypes },
  };
}
function normalizeSettings(value) {
  only(
    value,
    [
      "allowedOrigins",
      "cookieDomain",
      "sessionMaxAgeMinutes",
      "loginRateLimit",
      "geoRestriction",
      "allowedCountries",
      "trafficPolicy",
    ],
    "Settings",
  );
  const allowedOrigins = [
    ...new Set(
      list(value.allowedOrigins, "CORS origins", 50).map((x) => {
        let url;
        try {
          url = new URL(x);
        } catch {
          fail("CORS origin không hợp lệ.");
        }
        if (
          !["http:", "https:"].includes(url.protocol) ||
          url.origin !== x ||
          url.username ||
          url.password
        )
          fail("CORS yêu cầu origin HTTP(S) chính xác.");
        return x;
      }),
    ),
  ];
  const cookieDomain = text(value.cookieDomain, "Cookie domain", 200)
    .replace(/^\./, "")
    .toLowerCase();
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(cookieDomain))
    fail("Cookie domain không hợp lệ.");
  only(value.loginRateLimit, ["limit", "windowMs"], "Giới hạn đăng nhập");
  const countries = [...new Set(list(value.allowedCountries, "Quốc gia", 250))];
  if (!countries.length || countries.some((x) => !/^[A-Z]{2}$/.test(x)))
    fail("Mã quốc gia phải gồm hai chữ in hoa.");
  return {
    trafficPolicy: normalizeTrafficPolicy(value.trafficPolicy, fail),
    allowedOrigins,
    cookieDomain,
    sessionMaxAgeMinutes: integer(
      value.sessionMaxAgeMinutes,
      "Tuổi phiên",
      5,
      480,
    ),
    loginRateLimit: {
      limit: integer(value.loginRateLimit.limit, "Giới hạn đăng nhập", 1, 30),
      windowMs: integer(
        value.loginRateLimit.windowMs,
        "Cửa sổ đăng nhập",
        60000,
        86400000,
      ),
    },
    geoRestriction: boolean(value.geoRestriction, "Geo restriction"),
    allowedCountries: countries,
  };
}
export function validateConfiguration(input) {
  only(input, ["services", "routes", "settings"], "Cấu hình");
  const services = list(input.services, "Services", 50).map(normalizeService);
  if (new Set(services.map((x) => x.key)).size !== services.length)
    fail("Mã service bị trùng.");
  if (!services.some((x) => x.key === "identity" && x.enabled && x.target))
    fail("Identity phải được cấu hình và bật để duy trì xác thực.");
  const routes = list(input.routes, "Routes", 1000).map((x) =>
    normalizeRoute(x, services),
  );
  if (new Set(routes.map((x) => x.id)).size !== routes.length)
    fail("ID route bị trùng.");
  const sharedLimits = new Map();
  for (const route of routes.filter(
    (x) => x.enabled && x.rateLimit.enabled && x.rateLimit.group,
  )) {
    const key = `${route.serviceKey}:${route.rateLimit.group}`;
    const signature = JSON.stringify([
      route.rateLimit.key,
      route.rateLimit.limit,
      route.rateLimit.windowMs,
    ]);
    if (sharedLimits.has(key) && sharedLimits.get(key) !== signature)
      fail(
        "Các route cùng nhóm rate limit phải dùng cùng khóa, số request và cửa sổ.",
      );
    sharedLimits.set(key, signature);
  }
  for (let i = 0; i < routes.length; i++)
    for (let j = i + 1; j < routes.length; j++) {
      const a = routes[i],
        b = routes[j];
      if (
        !a.enabled ||
        !b.enabled ||
        a.priority !== b.priority ||
        a.matchType !== b.matchType ||
        !a.methods.some((x) => b.methods.includes(x))
      )
        continue;
      const aa = a.sourcePath.split("/"),
        bb = b.sourcePath.split("/");
      if (
        aa.length === bb.length &&
        aa.filter((x) => !x.startsWith(":")).length ===
          bb.filter((x) => !x.startsWith(":")).length &&
        aa.every(
          (x, k) => x === bb[k] || x.startsWith(":") || bb[k].startsWith(":"),
        )
      )
        fail(`Route chồng lấn cùng ưu tiên: ${a.name} và ${b.name}.`);
    }
  return { services, routes, settings: normalizeSettings(input.settings) };
}

export function compileConfiguration(config) {
  const services = new Map(config.services.map((x) => [x.key, x]));
  const routes = config.routes
    .filter((x) => x.enabled)
    .map((route) => {
      const parts = route.sourcePath.slice(1).split("/");
      const pattern = parts
        .map((x) => (x.startsWith(":") ? "([^/]+)" : x.replaceAll(".", "\\.")))
        .join("/");
      return {
        ...route,
        pattern: new RegExp(
          `^/${pattern}${route.matchType === "prefix" ? "(?:/(.*))?" : ""}/?$`,
        ),
        params: parts.filter((x) => x.startsWith(":")).map((x) => x.slice(1)),
        specificity:
          parts.filter((x) => !x.startsWith(":")).length * 100 +
          parts.length * 2 +
          (route.matchType === "exact" ? 1 : 0),
      };
    })
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        b.specificity - a.specificity ||
        a.id.localeCompare(b.id),
    );
  return (method, originalUrl) => {
    const [rawPath, ...rest] = originalUrl.split("?");
    let path;
    try {
      path = rawPath
        .split("/")
        .map((x) => {
          const part = decodeURIComponent(x);
          if (
            /[/%\\\x00-\x20\x7f]/.test(part) ||
            [".", ".."].includes(part) ||
            blockedDestination.has(part.toLowerCase())
          )
            throw new Error();
          return part;
        })
        .join("/");
    } catch {
      throw new RouteValidationError(
        "Đường dẫn yêu cầu không an toàn.",
        400,
        "UNSAFE_PATH",
      );
    }
    for (const route of routes) {
      if (!route.methods.includes(method)) continue;
      const match = route.pattern.exec(path);
      if (!match) continue;
      const values = Object.fromEntries(
        route.params.map((key, i) => [key, match[i + 1]]),
      );
      if (
        Object.entries(values).some(([key, value]) =>
          route.paramTypes[key] === "uuid"
            ? !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
            : route.paramTypes[key] === "number" && !/^\d+$/.test(value),
        )
      )
        continue;
      let destination = route.upstreamPath.replace(
        /:([A-Za-z][A-Za-z0-9_]*)/g,
        (_, key) => encodeURIComponent(values[key]),
      );
      const suffix =
        route.matchType === "prefix" ? match[route.params.length + 1] : "";
      if (suffix)
        destination += `/${suffix.split("/").map(encodeURIComponent).join("/")}`;
      if (
        route.auth === "public" &&
        destination
          .split("/")
          .some((x) => ["admin", "host", "me"].includes(x.toLowerCase()))
      ) {
        throw new RouteValidationError(
          "Không được ánh xạ công khai tới namespace đặc quyền.",
        );
      }
      if (sessionDestinations.some((x) => under(destination, x)))
        throw new RouteValidationError(
          "Endpoint cấp phiên chỉ được đi qua luồng SSO của Gateway.",
        );
      const query = new URLSearchParams(
        route.preserveQuery ? rest.join("?") : "",
      );
      route.query.remove.forEach((key) => query.delete(key));
      Object.entries(route.query.set).forEach(([key, value]) =>
        query.set(key, value),
      );
      if (query.size) destination += `?${query.toString()}`;
      const service = services.get(route.serviceKey);
      return {
        route,
        service,
        destination,
        backendUrl: service.target ? `${service.target}${destination}` : null,
      };
    }
    return null;
  };
}
