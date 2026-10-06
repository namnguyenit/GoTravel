import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, after, test } from "node:test";
import jwt from "jsonwebtoken";
import { newRoute, seedConfiguration } from "../src/gateway/seed-config.js";
import { createRouteRegistry } from "../src/gateway/route-registry.js";

let upstream,
  second,
  gateway,
  baseUrl,
  adminToken,
  userToken,
  registry,
  firstTarget,
  secondTarget,
  tempDir;
const listen = (server) =>
  new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server.address().port)),
  );
const close = (server) =>
  new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
const headers = (token = adminToken) => ({
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
});
const json = async (path, method = "GET", body, token = adminToken) =>
  fetch(`${baseUrl}/api/v1/gateway-admin${path}`, {
    method,
    headers: headers(token),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const version = () => registry.snapshot().version;
const add = (route) =>
  json("/routes", "POST", { version: version(), item: route });
const update = (route) =>
  json(`/routes/${route.id}`, "PUT", { version: version(), item: route });
let customRoute;
let adminRoleActive = true;
let secondUserToken;
const upstreamPaths = [];

before(async () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const sign = (
    role,
    subject = role === "ROLE_ADMIN" ? "test-admin" : "test-user",
  ) =>
    jwt.sign({ scope: role }, privateKey, {
      algorithm: "RS256",
      keyid: "admin-test",
      subject,
      issuer: "com.gotravel.identity",
      audience: "gotravel-api",
      expiresIn: "8h",
    });
  adminToken = sign("ROLE_ADMIN");
  userToken = sign("ROLE_USER");
  secondUserToken = sign("ROLE_USER", "test-user-2");
  const handler = (marker) => (req, res) => {
    upstreamPaths.push({ marker, path: req.url, method: req.method });
    res.setHeader("content-type", "application/json");
    if (req.url === "/.well-known/jwks.json")
      return res.end(
        JSON.stringify({
          keys: [
            {
              ...publicKey.export({ format: "jwk" }),
              kid: "admin-test",
              alg: "RS256",
              use: "sig",
            },
          ],
        }),
      );
    if (req.url.startsWith("/api/users/internal/"))
      return res.end(JSON.stringify({ data: { isAllowed: true } }));
    if (req.url === "/api/users/me")
      return res.end(
        JSON.stringify({
          data: { roles: adminRoleActive ? ["ADMIN"] : ["USER"] },
        }),
      );
    if (req.url === "/api/auth/login")
      return res.end(JSON.stringify({ data: { token: adminToken } }));
    let body = "";
    req.on("data", (x) => (body += x));
    req.on("end", () => {
      const finish = () =>
        res.end(
          JSON.stringify({
            marker,
            method: req.method,
            path: req.url,
            headers: req.headers,
            body,
          }),
        );
      if (req.url === "/slow") return setTimeout(finish, 400);
      finish();
    });
  };
  upstream = createServer(handler("first"));
  second = createServer(handler("second"));
  firstTarget = `http://127.0.0.1:${await listen(upstream)}`;
  secondTarget = `http://127.0.0.1:${await listen(second)}`;
  for (const name of [
    "IDENTITY_SERVICE_URL",
    "MEDIA_SERVICE_URL",
    "CATALOG_SERVICE_URL",
    "BOOKING_SERVICE_URL",
    "CART_SERVICE_URL",
    "PAYMENT_SERVICE_URL",
    "SEARCH_SERVICE_URL",
    "CAR_SERVICE_URL",
    "TICKET_SERVICE_URL",
  ])
    process.env[name] = firstTarget;
  process.env.INTERNAL_SERVICE_TOKEN = "admin-test-internal-token";
  process.env.CSRF_SECRET = "admin-test-csrf-secret-at-least-thirty-two-bytes";
  tempDir = mkdtempSync(join(tmpdir(), "gateway-sqlite-"));
  process.env.GATEWAY_CONFIG_DB = join(tempDir, "gateway.sqlite");
  delete process.env.GATEWAY_ROUTES_FILE;
  const { default: app } = await import("../src/app.js");
  registry = app.locals.gatewayRegistry;
  gateway = createServer(app);
  baseUrl = `http://127.0.0.1:${await listen(gateway)}`;
});
after(async () => {
  if (gateway) await close(gateway);
  if (upstream) await close(upstream);
  if (second) await close(second);
  registry?.close();
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
});

test("existing routes are migrated to SQLite and admin access is enforced", async () => {
  assert.equal(
    readFileSync(process.env.GATEWAY_CONFIG_DB).subarray(0, 15).toString(),
    "SQLite format 3",
  );
  const anonymous = await fetch(`${baseUrl}/api/v1/gateway-admin/overview`);
  assert.equal(anonymous.status, 401);
  assert.equal((await json("/overview", "GET", null, userToken)).status, 403);
  const response = await json("/overview");
  assert.equal(response.status, 200);
  const data = (await response.json()).data;
  assert.equal(data.storage, "sqlite");
  assert.ok(data.routes.length >= 60);
  assert.ok(data.routes.some((x) => x.sourcePath === "/api/v1/me"));
  assert.equal(data.staticRoutes, undefined);
  const page = await fetch(`${baseUrl}/admin/gateway`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<title>Quản trị Gateway · GoTravel<\/title>/);
  assert.match(
    page.headers.get("content-security-policy"),
    /frame-ancestors 'none'/,
  );
});

test("host-only HttpOnly login works and admin writes remain CSRF protected", async () => {
  const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { origin: baseUrl, "content-type": "application/json" },
    body: '{"username":"admin","password":"test"}',
  });
  assert.equal(login.status, 200);
  assert.equal((await login.json()).data.token, undefined);
  const cookies = login.headers.getSetCookie();
  assert.ok(
    cookies.some(
      (x) => x.startsWith("access_token=") && x.includes("HttpOnly"),
    ),
  );
  assert.ok(cookies.every((x) => !x.includes("Domain=")));
  const cookie = cookies.map((x) => x.split(";")[0]).join("; ");
  const csrf = cookies
    .find((x) => x.startsWith("csrf_token="))
    .split(";")[0]
    .slice("csrf_token=".length);
  const policy = registry.snapshot().settings;
  const options = {
    method: "PUT",
    headers: { origin: baseUrl, cookie, "content-type": "application/json" },
    body: JSON.stringify({ version: version(), settings: policy }),
  };
  assert.equal(
    (await fetch(`${baseUrl}/api/v1/gateway-admin/settings`, options)).status,
    403,
  );
  options.headers["x-csrf-token"] = csrf;
  assert.equal(
    (await fetch(`${baseUrl}/api/v1/gateway-admin/settings`, options)).status,
    200,
  );
});

test("routes support live mapping, query transforms, headers and unparsed request bodies", async () => {
  customRoute = newRoute({
    name: "Ticket orders",
    serviceKey: "ticket",
    sourcePath: "/api/v1/tickets/orders/:id",
    upstreamPath: "/api/orders/:id",
    methods: ["POST"],
    query: { set: { channel: "gateway" }, remove: ["debug"] },
    headers: {
      request: { "x-route-name": "ticket-orders" },
      response: { "x-gateway-policy": "active" },
      removeRequest: ["x-debug"],
      removeResponse: [],
    },
  });
  const response = await add(customRoute);
  assert.equal(response.status, 200, await response.text());
  assert.equal(
    (await fetch(`${baseUrl}/api/v1/tickets/orders/42`, { method: "POST" }))
      .status,
    401,
  );
  const proxy = await fetch(
    `${baseUrl}/api/v1/tickets/orders/42?page=2&debug=true`,
    {
      method: "POST",
      headers: {
        ...headers(userToken),
        "x-internal-token": "forged",
        "x-user-id": "forged",
        "x-debug": "remove",
      },
      body: '{"ticket":42}',
    },
  );
  assert.equal(proxy.status, 200);
  assert.equal(proxy.headers.get("x-gateway-policy"), "active");
  const data = await proxy.json();
  assert.equal(data.path, "/api/orders/42?page=2&channel=gateway");
  assert.equal(data.body, '{"ticket":42}');
  assert.equal(data.headers["x-route-name"], "ticket-orders");
  assert.equal(data.headers["x-debug"], undefined);
  assert.equal(data.headers["x-internal-token"], undefined);
  assert.equal(data.headers["x-user-id"], "test-user");
  const service = { ...registry.getService("ticket"), target: secondTarget };
  const changed = await json("/services/ticket", "PUT", {
    version: version(),
    item: service,
  });
  assert.equal(changed.status, 200);
  const live = await fetch(`${baseUrl}/api/v1/tickets/orders/42`, {
    method: "POST",
    headers: headers(userToken),
  });
  assert.equal((await live.json()).marker, "second");
  assert.equal(
    (
      await json(`/routes/${customRoute.id}`, "PUT", {
        version: version() - 1,
        item: customRoute,
      })
    ).status,
    409,
  );
});

test("existing seeded route mappings can be edited live, with deterministic prefix precedence", async () => {
  const original = registry
    .snapshot()
    .routes.find((x) => x.sourcePath === "/api/v1/search/listings");
  assert.equal(
    (await update({ ...original, upstreamPath: "/new-search" })).status,
    200,
  );
  assert.equal(
    (await (await fetch(`${baseUrl}/api/v1/search/listings`)).json()).path,
    "/new-search",
  );
  assert.equal((await update(original)).status, 200);
  const prefix = newRoute({
    name: "Ticket prefix",
    serviceKey: "ticket",
    sourcePath: "/api/v1/tickets",
    upstreamPath: "/tickets",
    matchType: "prefix",
  });
  assert.equal((await add(prefix)).status, 200);
  const preview = await json("/preview", "POST", {
    method: "POST",
    url: "/api/v1/tickets/orders/42?page=1",
  });
  const match = (await preview.json()).data;
  assert.equal(match.routeId, customRoute.id);
  assert.match(match.backendUrl, /\/api\/orders\/42\?page=1&channel=gateway$/);
  const prefixed = await fetch(`${baseUrl}/api/v1/tickets/other/path`, {
    headers: headers(userToken),
  });
  assert.equal((await prefixed.json()).path, "/tickets/other/path");
});

test("unsafe configuration is rejected atomically without changing the live version", async () => {
  const before = version();
  const invalid = [
    {
      ...customRoute,
      id: newRoute().id,
      sourcePath: "/api/v1/internal/orders",
    },
    {
      ...customRoute,
      id: newRoute().id,
      upstreamPath: "/api/users/internal/:id",
    },
    { ...customRoute, id: newRoute().id, auth: "public", matchType: "prefix" },
    {
      ...customRoute,
      id: newRoute().id,
      headers: {
        ...customRoute.headers,
        request: { "x-internal-service-token": "secret" },
      },
    },
    {
      ...customRoute,
      id: newRoute().id,
      headers: {
        ...customRoute.headers,
        request: { "x-test": "bad\r\nInjected: 1" },
      },
    },
    {
      ...customRoute,
      id: newRoute().id,
      sourcePath: "/api/v1/auth/:action",
      upstreamPath: "/api/custom/:action",
    },
    {
      ...customRoute,
      id: newRoute().id,
      sourcePath: "/api/v1/login-copy",
      upstreamPath: "/api/auth/login",
    },
    { ...customRoute, id: newRoute().id },
  ];
  for (const item of invalid) assert.equal((await add(item)).status, 400);
  assert.equal(
    (
      await json("/services", "POST", {
        version: version(),
        item: {
          key: "metadata",
          name: "Metadata",
          target: "http://169.254.169.254",
          description: "",
          enabled: true,
        },
      })
    ).status,
    400,
  );
  assert.equal(
    (await json("/services/identity", "DELETE", { version: version() })).status,
    400,
  );
  assert.equal(version(), before);
  for (const path of [
    "/api/v1/tickets/%69nternal/path",
    "/api/v1/tickets/a%2fb",
    "/api/v1/tickets/%2569nternal",
  ]) {
    assert.equal(
      (await fetch(`${baseUrl}${path}`, { headers: headers(userToken) }))
        .status,
      400,
    );
  }
});

test("JWT role policy, per-route rate limits and timeout work on live routes", async () => {
  const protectedRoute = newRoute({
    name: "Admin ticket settings",
    serviceKey: "ticket",
    sourcePath: "/api/v1/ticket-settings",
    upstreamPath: "/settings",
    roles: ["ROLE_ADMIN"],
    rateLimit: { enabled: true, limit: 2, windowMs: 60000 },
  });
  assert.equal((await add(protectedRoute)).status, 200);
  assert.equal(
    (
      await fetch(`${baseUrl}/api/v1/ticket-settings`, {
        headers: headers(userToken),
      })
    ).status,
    403,
  );
  assert.equal(
    (await fetch(`${baseUrl}/api/v1/ticket-settings`, { headers: headers() }))
      .status,
    200,
  );
  assert.equal(
    (
      await json("/settings", "PUT", {
        version: version(),
        settings: registry.snapshot().settings,
      })
    ).status,
    200,
  );
  assert.equal(
    (await fetch(`${baseUrl}/api/v1/ticket-settings`, { headers: headers() }))
      .status,
    429,
  );
  const slow = newRoute({
    name: "Timeout sample",
    sourcePath: "/api/v1/slow-sample",
    upstreamPath: "/slow",
    serviceKey: "catalog",
    timeoutMs: 100,
  });
  assert.equal((await add(slow)).status, 200);
  assert.equal(
    (
      await fetch(`${baseUrl}/api/v1/slow-sample`, {
        headers: headers(userToken),
      })
    ).status,
    504,
  );
});

test("SSE delivers committed versions and history rollback changes live mapping", async () => {
  const abort = new AbortController();
  const response = await fetch(`${baseUrl}/api/v1/gateway-admin/events`, {
    headers: headers(),
    signal: abort.signal,
  });
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  await reader.read();
  const oldVersion = version();
  const pending = reader.read();
  const modified = { ...customRoute, upstreamPath: "/changed/:id" };
  assert.equal((await update(modified)).status, 200);
  const chunk = await pending;
  assert.match(
    new TextDecoder().decode(chunk.value),
    new RegExp(`"version":${version()}`),
  );
  await reader.cancel();
  abort.abort();
  const restored = await json(`/revisions/${oldVersion}/restore`, "POST", {
    version: version(),
  });
  assert.equal(restored.status, 200);
  const preview = (
    await (
      await json("/preview", "POST", {
        method: "POST",
        url: "/api/v1/tickets/orders/42",
      })
    ).json()
  ).data;
  assert.match(preview.backendUrl, /\/api\/orders\/42/);
  assert.ok(
    (await (await json("/revisions")).json()).data.some((x) =>
      x.reason.includes("Khôi phục"),
    ),
  );
});

test("SQLite survives reload and multiple registries detect conflicts rather than overwriting", () => {
  const path = join(tempDir, "persistence.sqlite");
  const first = createRouteRegistry({
    dbPath: path,
    legacyFile: null,
    seed: seedConfiguration(),
  });
  const secondRegistry = createRouteRegistry({
    dbPath: path,
    legacyFile: null,
  });
  const initial = first.snapshot();
  first.mutate(
    initial.version,
    (config) => {
      config.routes.push(
        newRoute({
          name: "Persistent route",
          sourcePath: "/api/v1/persistent",
          upstreamPath: "/persistent",
        }),
      );
      return config;
    },
    "test",
  );
  assert.equal(secondRegistry.snapshot().version, initial.version + 1);
  assert.throws(
    () =>
      secondRegistry.replace(initial.version, {
        services: initial.services,
        routes: initial.routes,
        settings: initial.settings,
      }),
    /phiên khác/,
  );
  first.close();
  secondRegistry.close();
  const reloaded = createRouteRegistry({ dbPath: path, legacyFile: null });
  assert.equal(
    reloaded.match("GET", "/api/v1/persistent").destination,
    "/persistent",
  );
  reloaded.close();
});

test("revoking the SSO admin role immediately rejects an old management token", async () => {
  const before = version();
  adminRoleActive = false;
  try {
    assert.equal((await json("/config")).status, 403);
    assert.equal(
      (
        await json("/settings", "PUT", {
          version: before,
          settings: registry.snapshot().settings,
        })
      ).status,
      403,
    );
    assert.equal(version(), before);
  } finally {
    adminRoleActive = true;
  }
  assert.equal((await json("/config")).status, 200);
});

test("legacy JSON is imported once and deleting seeded routes persists after restart", () => {
  const path = join(tempDir, "migration.sqlite");
  const legacyPath = join(tempDir, "routes.json");
  const route = {
    id: newRoute().id,
    name: "Legacy mapping",
    method: "POST",
    sourcePath: "/api/v1/legacy/items/:id",
    upstreamPath: "/api/items/:id",
    serviceKey: "catalog",
    enabled: true,
  };
  writeFileSync(legacyPath, JSON.stringify({ version: 7, routes: [route] }));
  const first = createRouteRegistry({ dbPath: path, legacyFile: legacyPath });
  assert.equal(first.snapshot().routes.length, 70);
  assert.equal(
    first.match("POST", "/api/v1/legacy/items/42").destination,
    "/api/items/42",
  );
  assert.equal(
    first.match("POST", "/api/v1/legacy/items/42").route.auth,
    "jwt",
  );
  const removed = first
    .snapshot()
    .routes.find((x) => x.sourcePath === "/api/v1/search/listings");
  first.mutate(first.version(), (config) => ({
    ...config,
    routes: config.routes.filter((x) => x.id !== removed.id),
  }));
  first.close();
  const reloaded = createRouteRegistry({
    dbPath: path,
    legacyFile: legacyPath,
  });
  assert.equal(reloaded.snapshot().routes.length, 69);
  assert.equal(reloaded.match("GET", "/api/v1/search/listings"), null);
  assert.equal(
    reloaded.snapshot().routes.filter((x) => x.id === route.id).length,
    1,
  );
  assert.equal(
    readFileSync(legacyPath, "utf8"),
    JSON.stringify({ version: 7, routes: [route] }),
  );
  reloaded.close();
});

test("Identity service changes affect authentication and SSO immediately", async () => {
  const original = registry.getService("identity");
  assert.equal(
    (
      await json("/services/identity", "PUT", {
        version: version(),
        item: { ...original, target: secondTarget },
      })
    ).status,
    200,
  );
  try {
    assert.equal((await json("/config")).status, 200);
    const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { origin: baseUrl, "content-type": "application/json" },
      body: '{"username":"admin","password":"test"}',
    });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).data.authenticated, true);
    assert.ok(
      login.headers
        .getSetCookie()
        .some((x) => x.startsWith("access_token=") && x.includes("HttpOnly")),
    );
  } finally {
    assert.equal(
      (
        await json("/services/identity", "PUT", {
          version: version(),
          item: original,
        })
      ).status,
      200,
    );
  }
});

test("invalid management bodies and protected response headers cannot alter configuration", async () => {
  const before = version();
  const missing = await fetch(`${baseUrl}/api/v1/gateway-admin/settings`, {
    method: "PUT",
    headers: headers(),
  });
  assert.equal(missing.status, 400);
  const cors = newRoute({
    name: "Unsafe response CORS",
    sourcePath: "/api/v1/unsafe-cors",
    headers: {
      request: {},
      response: { "access-control-allow-origin": "*" },
      removeRequest: [],
      removeResponse: [],
    },
  });
  assert.equal((await add(cors)).status, 400);
  assert.equal(version(), before);
});

test("CORS, country policy, session lifetime and login limits change without restart", async () => {
  const original = registry.snapshot().settings;
  const origin = "https://ops.example.com";
  const beforeCors = await fetch(`${baseUrl}/health`, { headers: { origin } });
  assert.equal(beforeCors.headers.get("access-control-allow-origin"), null);
  assert.equal(
    (await fetch(`${baseUrl}/health`, { headers: { "cf-ipcountry": "US" } }))
      .status,
    403,
  );
  const changed = {
    ...original,
    allowedOrigins: [...original.allowedOrigins, origin],
    allowedCountries: ["US"],
    sessionMaxAgeMinutes: 5,
    loginRateLimit: { limit: 1, windowMs: 60000 },
  };
  assert.equal(
    (await json("/settings", "PUT", { version: version(), settings: changed }))
      .status,
    200,
  );
  try {
    const afterCors = await fetch(`${baseUrl}/health`, {
      headers: { origin, "cf-ipcountry": "US" },
    });
    assert.equal(afterCors.status, 200);
    assert.equal(afterCors.headers.get("access-control-allow-origin"), origin);
    assert.equal(
      (await fetch(`${baseUrl}/health`, { headers: { "cf-ipcountry": "VN" } }))
        .status,
      403,
    );
    const loginOptions = {
      method: "POST",
      headers: { origin: baseUrl, "content-type": "application/json" },
      body: '{"username":"admin","password":"test"}',
    };
    const login = await fetch(`${baseUrl}/api/v1/auth/login`, loginOptions);
    assert.equal(login.status, 200);
    assert.ok(
      login.headers
        .getSetCookie()
        .some(
          (x) =>
            x.startsWith("access_token=") && /Max-Age=(299|300)(?:;|$)/.test(x),
        ),
    );
    assert.equal(
      (await fetch(`${baseUrl}/api/v1/auth/login`, loginOptions)).status,
      429,
    );
  } finally {
    assert.equal(
      (
        await json("/settings", "PUT", {
          version: version(),
          settings: original,
        })
      ).status,
      200,
    );
  }
});

test("REST batch saves all endpoints atomically and rejects a conflicting batch", async () => {
  const base = "/api/v1/rest-sample/items";
  const items = [
    ["GET", false],
    ["GET", true],
    ["POST", false],
    ["PUT", true],
    ["PATCH", true],
    ["DELETE", true],
  ].map(([method, item]) =>
    newRoute({
      name: `REST ${method} ${item ? "item" : "collection"}`,
      serviceKey: "ticket",
      sourcePath: base + (item ? "/:id" : ""),
      upstreamPath: "/api/items" + (item ? "/:id" : ""),
      methods: [method],
      paramTypes: item ? { id: "number" } : {},
    }),
  );
  const oldVersion = version();
  const saved = await json("/routes/batch", "POST", {
    version: oldVersion,
    items,
  });
  assert.equal(saved.status, 200);
  assert.equal(version(), oldVersion + 1);
  for (const route of items) {
    const path = route.sourcePath.replace(":id", "42");
    const response = await fetch(baseUrl + path, {
      method: route.methods[0],
      headers: headers(userToken),
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.method, route.methods[0]);
    assert.equal(data.path, route.upstreamPath.replace(":id", "42"));
  }
  const before = registry.snapshot();
  const valid = newRoute({
    name: "Atomic candidate",
    sourcePath: "/api/v1/atomic-candidate",
  });
  const conflict = { ...items[0], id: newRoute().id };
  assert.equal(
    (
      await json("/routes/batch", "POST", {
        version: before.version,
        items: [valid, conflict],
      })
    ).status,
    400,
  );
  assert.equal(version(), before.version);
  assert.equal(registry.match("GET", valid.sourcePath), null);
  assert.equal(
    (
      await json("/routes/batch", "POST", {
        version: oldVersion,
        items: [valid],
      })
    ).status,
    409,
  );
});

test("user and IP-user quotas use verified accounts and groups share their counters", async () => {
  const route = newRoute({
    name: "Per account quota",
    sourcePath: "/api/v1/account-quota",
    upstreamPath: "/quota",
    rateLimit: {
      enabled: true,
      limit: 1,
      windowMs: 60000,
      key: "user",
      group: "",
    },
  });
  assert.equal((await add(route)).status, 200);
  assert.equal(
    (await fetch(baseUrl + route.sourcePath, { headers: headers(userToken) }))
      .status,
    200,
  );
  assert.equal(
    (
      await fetch(baseUrl + route.sourcePath, {
        headers: {
          ...headers(userToken),
          "x-forwarded-for": "198.51.100.1",
          "x-user-id": "fake",
        },
      })
    ).status,
    429,
  );
  assert.equal(
    (
      await fetch(baseUrl + route.sourcePath, {
        headers: headers(secondUserToken),
      })
    ).status,
    200,
  );
  const both = newRoute({
    name: "IP account quota",
    sourcePath: "/api/v1/ip-account-quota",
    upstreamPath: "/quota",
    rateLimit: {
      enabled: true,
      limit: 1,
      windowMs: 60000,
      key: "ip-user",
      group: "",
    },
  });
  assert.equal((await add(both)).status, 200);
  assert.equal(
    (await fetch(baseUrl + both.sourcePath, { headers: headers(userToken) }))
      .status,
    200,
  );
  assert.equal(
    (await fetch(baseUrl + both.sourcePath, { headers: headers(userToken) }))
      .status,
    429,
  );
  assert.equal(
    (
      await fetch(baseUrl + both.sourcePath, {
        headers: { ...headers(userToken), "x-forwarded-for": "198.51.100.1" },
      })
    ).status,
    200,
  );
  const policy = {
    enabled: true,
    limit: 2,
    windowMs: 60000,
    key: "user",
    group: "shared-actions",
  };
  const first = newRoute({
    name: "Shared action one",
    serviceKey: "ticket",
    sourcePath: "/api/v1/shared-one",
    upstreamPath: "/one",
    rateLimit: policy,
  });
  const secondRoute = newRoute({
    name: "Shared action two",
    serviceKey: "ticket",
    sourcePath: "/api/v1/shared-two",
    upstreamPath: "/two",
    rateLimit: policy,
  });
  assert.equal(
    (
      await json("/routes/batch", "POST", {
        version: version(),
        items: [first, secondRoute],
      })
    ).status,
    200,
  );
  assert.equal(
    (await fetch(baseUrl + first.sourcePath, { headers: headers(userToken) }))
      .status,
    200,
  );
  assert.equal(
    (
      await fetch(baseUrl + secondRoute.sourcePath, {
        headers: headers(userToken),
      })
    ).status,
    200,
  );
  assert.equal(
    (await fetch(baseUrl + first.sourcePath, { headers: headers(userToken) }))
      .status,
    429,
  );
  const changed = { ...first, rateLimit: { ...policy, limit: 3 } };
  assert.equal((await update(changed)).status, 400);
  assert.equal(
    (
      await json(`/routes/${first.id}`, "PUT", {
        version: version(),
        item: changed,
        applyRateLimitToGroup: true,
      })
    ).status,
    200,
  );
  assert.equal(
    registry.snapshot().routes.find((x) => x.id === secondRoute.id).rateLimit
      .limit,
    3,
  );
  const publicRoute = newRoute({
    name: "Invalid public account quota",
    sourcePath: "/api/v1/public-quota",
    auth: "public",
    rateLimit: policy,
  });
  assert.equal((await add(publicRoute)).status, 400);
});

const securityDefaults = () => ({
  requireHttps: false,
  maxBodyBytes: 0,
  allowedContentTypes: [],
  allowedIps: [],
  blockedIps: [],
  allowedOrigins: [],
});
test("HTTPS, CIDR deny priority and browser origins are enforced on live mappings", async () => {
  const route = newRoute({
    name: "Source policy",
    sourcePath: "/api/v1/source-policy",
    upstreamPath: "/source-policy",
    security: {
      ...securityDefaults(),
      allowedIps: ["127.0.0.0/8", "198.51.100.0/24"],
      blockedIps: ["198.51.100.99"],
    },
  });
  assert.equal((await add(route)).status, 200);
  assert.equal(
    (await fetch(baseUrl + route.sourcePath, { headers: headers(userToken) }))
      .status,
    200,
  );
  for (const ip of ["198.51.100.99", "203.0.113.1"])
    assert.equal(
      (
        await fetch(baseUrl + route.sourcePath, {
          headers: { ...headers(userToken), "x-forwarded-for": ip },
        })
      ).status,
      403,
    );
  assert.equal(
    (
      await fetch(baseUrl + route.sourcePath, {
        headers: {
          ...headers(userToken),
          "x-forwarded-for": "::ffff:198.51.100.2",
        },
      })
    ).status,
    200,
  );
  const https = {
    ...route,
    security: { ...securityDefaults(), requireHttps: true },
  };
  assert.equal((await update(https)).status, 200);
  assert.equal(
    (await fetch(baseUrl + route.sourcePath, { headers: headers(userToken) }))
      .status,
    403,
  );
  assert.equal(
    (
      await fetch(baseUrl + route.sourcePath, {
        headers: { ...headers(userToken), "x-forwarded-proto": "https" },
      })
    ).status,
    200,
  );
  const origin = {
    ...route,
    security: {
      ...securityDefaults(),
      allowedOrigins: ["https://app.example.com"],
    },
  };
  assert.equal((await update(origin)).status, 200);
  assert.equal(
    (
      await fetch(baseUrl + route.sourcePath, {
        headers: { ...headers(userToken), origin: "https://bad.example.com" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(baseUrl + route.sourcePath, {
        headers: { ...headers(userToken), origin: "https://app.example.com" },
      })
    ).status,
    200,
  );
  assert.equal(
    (await fetch(baseUrl + route.sourcePath, { headers: headers(userToken) }))
      .status,
    200,
  );
  const before = version();
  assert.equal(
    (
      await update({
        ...route,
        security: { ...securityDefaults(), allowedIps: ["127.1"] },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await update({
        ...route,
        security: { ...securityDefaults(), allowedIps: ["10.0.0.0/99"] },
      })
    ).status,
    400,
  );
  assert.equal(version(), before);
});

function chunked(path, chunks, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      baseUrl + path,
      { method: "POST", headers: { ...headers(userToken), ...extraHeaders } },
      (response) => {
        let data = "";
        response.on("data", (x) => (data += x));
        response.on("end", () =>
          resolve({ status: response.statusCode, data: JSON.parse(data) }),
        );
      },
    );
    request.on("error", reject);
    for (const chunk of chunks) request.write(chunk);
    request.end();
  });
}
test("MIME and body limits reject content-length and chunked payloads before backend writes", async () => {
  const route = newRoute({
    name: "Bounded upload",
    sourcePath: "/api/v1/bounded-upload",
    upstreamPath: "/bounded-upload",
    methods: ["POST"],
    security: {
      ...securityDefaults(),
      maxBodyBytes: 8,
      allowedContentTypes: ["application/json"],
    },
  });
  assert.equal((await add(route)).status, 200);
  const count = () =>
    upstreamPaths.filter((x) => x.path === "/bounded-upload").length;
  const before = count();
  assert.equal(
    (
      await fetch(baseUrl + route.sourcePath, {
        method: "POST",
        headers: { ...headers(userToken), "content-type": "text/plain" },
        body: "{}",
      })
    ).status,
    415,
  );
  assert.equal(
    (
      await fetch(baseUrl + route.sourcePath, {
        method: "POST",
        headers: headers(userToken),
        body: '{"id":123}',
      })
    ).status,
    413,
  );
  assert.equal(
    (await chunked(route.sourcePath, ['{"id":', "123}"])).status,
    413,
  );
  assert.equal(count(), before);
  const accepted = await chunked(route.sourcePath, ['{"id":', "1}"]);
  assert.equal(accepted.status, 200);
  assert.equal(accepted.data.body, '{"id":1}');
  assert.equal(accepted.data.headers["content-length"], "8");
  assert.equal(accepted.data.headers["transfer-encoding"], undefined);
  const direct = await fetch(baseUrl + route.sourcePath, {
    method: "POST",
    headers: headers(userToken),
    body: "{}",
  });
  assert.equal(direct.status, 200);
  assert.equal((await direct.json()).body, "{}");
  const images = {
    ...route,
    security: {
      ...securityDefaults(),
      maxBodyBytes: 1024,
      allowedContentTypes: ["image/*"],
    },
  };
  assert.equal((await update(images)).status, 200);
  assert.equal(
    (
      await chunked(route.sourcePath, ["image-data"], {
        "content-type": "image/png",
      })
    ).status,
    200,
  );
});

test("global rate limits and response security headers update while administration stays accessible", async () => {
  const original = registry.snapshot().settings;
  const updated = {
    ...original,
    trafficPolicy: {
      securityHeaders: true,
      hstsMaxAgeSeconds: 86400,
      rateLimit: { enabled: true, limit: 1, windowMs: 60000 },
    },
  };
  assert.equal(
    (await json("/settings", "PUT", { version: version(), settings: updated }))
      .status,
    200,
  );
  try {
    const first = await fetch(baseUrl + "/api/v1/search/listings", {
      headers: { "x-forwarded-proto": "https" },
    });
    assert.equal(first.status, 200);
    assert.equal(first.headers.get("x-content-type-options"), "nosniff");
    assert.equal(
      first.headers.get("strict-transport-security"),
      "max-age=86400",
    );
    const limited = await fetch(baseUrl + "/api/v1/search/listings", {
      headers: { origin: original.allowedOrigins[0] },
    });
    assert.equal(limited.status, 429);
    assert.equal(
      limited.headers.get("access-control-allow-origin"),
      original.allowedOrigins[0],
    );
    assert.equal((await json("/config")).status, 200);
    assert.equal((await fetch(baseUrl + "/health")).status, 200);
  } finally {
    assert.equal(
      (
        await json("/settings", "PUT", {
          version: version(),
          settings: original,
        })
      ).status,
      200,
    );
  }
});

test("an older console cannot erase account quotas or body protection by omitting new fields", async () => {
  const route = newRoute({
    name: "Compatible security policy",
    sourcePath: "/api/v1/compatible-policy",
    upstreamPath: "/compatible-policy",
    rateLimit: {
      enabled: true,
      limit: 10,
      windowMs: 60000,
      key: "user",
      group: "compat",
    },
    security: { ...securityDefaults(), maxBodyBytes: 1024, requireHttps: true },
  });
  assert.equal((await add(route)).status, 200);
  const stored = registry.snapshot().routes.find((x) => x.id === route.id);
  const legacy = {
    ...stored,
    name: "Updated by legacy editor",
    rateLimit: { enabled: true, limit: 10, windowMs: 60000 },
  };
  delete legacy.security;
  assert.equal((await update(legacy)).status, 200);
  const updated = registry.snapshot().routes.find((x) => x.id === route.id);
  assert.deepEqual(updated.security, stored.security);
  assert.deepEqual(updated.rateLimit, stored.rateLimit);
});
