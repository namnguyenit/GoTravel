const $ = (id) => document.getElementById(id);
const show = (element, visible) => element.classList.toggle("hidden", !visible);
const element = (tag, className = "", text) => {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
};
const message = (target, text = "", error = false) => {
  target.textContent = text;
  target.classList.toggle("error", error);
  show(target, Boolean(text));
};
const split = (text) => [
  ...new Set(
    text
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean),
  ),
];
const cookie = (name) => {
  const pair = document.cookie
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${name}=`));
  try {
    return pair ? decodeURIComponent(pair.slice(name.length + 1)) : "";
  } catch {
    return "";
  }
};
const uuid = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
let overview,
  editingRoute,
  editingService,
  events,
  dirty = false,
  settingsDirty = false,
  saving = false,
  activeView = "routes";
let previousFocus;
const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const time = (value) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

async function request(path, options = {}) {
  const method = options.method || "GET";
  const headers = {
    ...(options.body ? { "content-type": "application/json" } : {}),
    ...(options.headers || {}),
  };
  if (!["GET", "HEAD"].includes(method) && cookie("csrf_token"))
    headers["x-csrf-token"] = cookie("csrf_token");
  const response = await fetch(path, {
    ...options,
    method,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      payload.message || `Yêu cầu thất bại (HTTP ${response.status}).`,
    );
    error.status = response.status;
    throw error;
  }
  return payload.data;
}
const api = (path, options) => request(`/api/v1/gateway-admin${path}`, options);
function loggedOut(text = "") {
  events?.close();
  events = null;
  overview = null;
  dirty = false;
  settingsDirty = false;
  closeDrawer(true);
  show($("dashboard-view"), false);
  show($("login-view"), true);
  message($("login-error"), text, true);
}
async function start(session) {
  if (!session.roles?.includes("ROLE_ADMIN"))
    return loggedOut("Tài khoản này không có quyền ROLE_ADMIN.");
  show($("login-view"), false);
  show($("dashboard-view"), true);
  $("session-user").textContent = session.userId;
  await loadOverview(true);
  if (!overview) return;
  events?.close();
  events = new EventSource("/api/v1/gateway-admin/events");
  events.addEventListener("configuration", (event) => {
    const update = JSON.parse(event.data);
    $("realtime-state").textContent = "● Đồng bộ trực tiếp";
    $("realtime-state").classList.remove("offline");
    if (overview && update.version !== overview.version && !saving) {
      if (dirty || settingsDirty)
        message(
          $("notice"),
          `Có cấu hình mới v${update.version}. Bản nháp của bạn được giữ nguyên; hãy tải lại trước khi lưu.`,
          true,
        );
      else loadOverview(true);
    }
  });
  events.onopen = () => {
    $("realtime-state").textContent = "● Đồng bộ trực tiếp";
    $("realtime-state").classList.remove("offline");
  };
  events.onerror = () => {
    $("realtime-state").textContent = "● Chưa kết nối realtime";
    $("realtime-state").classList.add("offline");
  };
}
async function checkSession() {
  try {
    await start(await request("/api/v1/auth/session"));
  } catch (error) {
    loggedOut(error.status === 401 ? "" : error.message);
  }
}
async function loadOverview(force = false) {
  if (!force && (dirty || settingsDirty)) {
    if (!confirm("Tải lại sẽ bỏ các thay đổi chưa lưu. Tiếp tục?")) return;
    closeDrawer(true);
    settingsDirty = false;
  }
  try {
    overview = await api("/overview");
    render();
    if (activeView === "history") await loadHistory();
  } catch (error) {
    if ([401, 403].includes(error.status)) return loggedOut(error.message);
    message($("notice"), error.message, true);
  }
}
function cell(row, content, className = "") {
  const td = element("td", className);
  if (typeof content === "string") td.textContent = content;
  else td.append(content);
  row.append(td);
  return td;
}
function render() {
  const enabled = overview.routes.filter((x) => x.enabled);
  $("nav-route-count").textContent = overview.routes.length;
  $("metric-routes").textContent = enabled.length;
  $("metric-total").textContent =
    `${overview.routes.length} route được cấu hình`;
  $("metric-services").textContent =
    `${overview.services.filter((x) => x.state === "reachable").length} / ${overview.services.length}`;
  $("metric-protected").textContent = overview.routes.filter(
    (x) => x.auth === "jwt",
  ).length;
  $("metric-updated").textContent = time(overview.updatedAt);
  $("metric-version").textContent = `SQLite · phiên bản ${overview.version}`;
  $("version-label").textContent = `v${overview.version}`;
  const filter = $("route-service-filter"),
    selected = filter.value;
  filter.replaceChildren(element("option", "", "Tất cả service"));
  filter.firstChild.value = "";
  for (const service of overview.services) {
    const option = element("option", "", service.name);
    option.value = service.key;
    filter.append(option);
  }
  filter.value = selected;
  renderRoutes();
  renderServices();
  if (!settingsDirty) fillSettings();
}
function renderRoutes() {
  if (!overview) return;
  const query = $("route-search").value.trim().toLowerCase();
  const selectedService = $("route-service-filter").value,
    auth = $("route-auth-filter").value,
    methodFilter = $("route-method-filter").value,
    stateFilter = $("route-state-filter").value;
  const routes = overview.routes.filter(
    (x) =>
      (!selectedService || x.serviceKey === selectedService) &&
      (!auth || x.auth === auth) &&
      (!methodFilter || x.methods.includes(methodFilter)) &&
      (!stateFilter || x.enabled === (stateFilter === "enabled")) &&
      [x.name, x.description, x.sourcePath, x.upstreamPath, x.serviceKey].some(
        (y) => y.toLowerCase().includes(query),
      ),
  );
  renderNodeMap();
  renderRouteGroups(routes);
  const body = $("route-body");
  body.replaceChildren();
  for (const route of routes) {
    const row = element("tr", "route-row");
    row.tabIndex = 0;
    row.setAttribute("aria-label", `Cấu hình ${route.name}`);
    row.onclick = () => openRoute(route);
    row.onkeydown = (event) => {
      if (["Enter", " "].includes(event.key) && event.target === row) {
        event.preventDefault();
        openRoute(route);
      }
    };
    const name = element("div");
    name.append(element("b", "route-name", route.name));
    route.methods.forEach((method) =>
      name.append(element("span", `badge ${method.toLowerCase()}`, method)),
    );
    cell(row, name);
    const path = element("div");
    path.append(
      element("code", "", route.sourcePath),
      element(
        "div",
        "route-description",
        route.matchType === "prefix"
          ? "+ phần đường dẫn còn lại"
          : "Khớp endpoint chính xác",
      ),
    );
    cell(row, path);
    cell(row, "→", "route-arrow");
    const service = overview.services.find((x) => x.key === route.serviceKey);
    const backend = element("div");
    backend.append(
      element("span", "backend-base", service?.target || "Chưa cấu hình"),
      element("code", "", route.upstreamPath),
    );
    cell(row, backend);
    const policy = element("div");
    policy.append(
      element(
        "span",
        `badge ${route.auth}`,
        route.auth === "jwt" ? "JWT" : "Công khai",
      ),
    );
    if (route.roles.length)
      policy.append(
        element(
          "div",
          "route-description",
          route.roles.map((x) => x.replace("ROLE_", "")).join(" / "),
        ),
      );
    if (route.rateLimit.enabled)
      policy.append(
        element(
          "div",
          "route-description",
          `${route.rateLimit.limit} req / ${route.rateLimit.windowMs / 1000}s`,
        ),
      );
    cell(row, policy);
    const toggle = element(
      "button",
      `route-status ${route.enabled ? "" : "disabled"}`,
      route.enabled ? "● Đang bật" : "● Đã tắt",
    );
    toggle.type = "button";
    toggle.title = "Bật / tắt route";
    toggle.onclick = async (event) => {
      event.stopPropagation();
      toggle.disabled = true;
      try {
        await saveItem("routes", { ...route, enabled: !route.enabled }, false);
      } catch (error) {
        message($("notice"), error.message, true);
        toggle.disabled = false;
      }
    };
    cell(row, toggle);
    body.append(row);
  }
  $("route-result-count").textContent =
    `${routes.length} / ${overview.routes.length} route`;
  show($("route-empty"), !routes.length && !selectedService);
}
function renderServices() {
  $("service-grid").replaceChildren();
  for (const service of overview.services) {
    const card = element("button", "service-card");
    card.type = "button";
    card.onclick = () => openService(service);
    const head = element("div", "service-head"),
      state = {
        reachable: "● Kết nối",
        unreachable: "● Không kết nối",
        disabled: "● Đã tắt",
        unconfigured: "● Chưa cấu hình",
      };
    head.append(
      element("span", "service-symbol", service.name.slice(0, 1).toUpperCase()),
      element(
        "span",
        `health ${service.state === "unreachable" ? "bad" : service.state}`,
        state[service.state] || service.state,
      ),
    );
    card.append(
      head,
      element("h3", "", service.name),
      element("small", "", service.key),
      element("code", "", service.target || "Chưa có URL backend"),
    );
    const meta = element("div", "service-meta");
    meta.append(
      element(
        "span",
        "",
        `${overview.routes.filter((x) => x.serviceKey === service.key).length} route liên quan`,
      ),
      element("span", "", "Cấu hình →"),
    );
    card.append(meta);
    $("service-grid").append(card);
  }
}
function switchView(view) {
  activeView = view;
  document
    .querySelectorAll(".view")
    .forEach((x) => show(x, x.id === `view-${view}`));
  document
    .querySelectorAll(".nav-item")
    .forEach((x) => x.classList.toggle("active", x.dataset.view === view));
  $("page-title").textContent = {
    routes: "Ánh xạ API",
    services: "Services",
    settings: "Chính sách Gateway",
    history: "Lịch sử cấu hình",
  }[view];
  if (view === "history") loadHistory();
}
function selectTab(tab) {
  document
    .querySelectorAll(".editor-tab")
    .forEach((x) => show(x, x.id === `tab-${tab}`));
  document
    .querySelectorAll("[data-tab]")
    .forEach((x) => x.classList.toggle("active", x.dataset.tab === tab));
}
function openDrawer(id) {
  previousFocus = document.activeElement;
  show($("drawer-backdrop"), true);
  show($(id), true);
  document.body.classList.add("drawer-open");
}
function closeDrawer(force = false) {
  if (!force && dirty && !confirm("Bỏ thay đổi chưa lưu?")) return;
  show($("route-drawer"), false);
  show($("service-drawer"), false);
  show($("rest-drawer"), false);
  show($("drawer-backdrop"), false);
  document.body.classList.remove("drawer-open");
  dirty = false;
  editingRoute = null;
  editingService = null;
  previousFocus?.focus();
}
function kvFill(id, values) {
  const container = $(id);
  container.replaceChildren();
  const heading = element("div", "kv-heading");
  heading.append(element("span", "", container.dataset.title));
  const add = element("button", "", "+ Thêm");
  add.type = "button";
  add.onclick = () => {
    kvRow(id, "", "");
    dirty = true;
  };
  heading.append(add);
  container.append(heading);
  Object.entries(values).forEach(([key, value]) => kvRow(id, key, value));
}
function kvRow(id, key, value) {
  const row = element("div", "kv-row"),
    keyInput = element("input"),
    valueInput = element("input");
  keyInput.value = key;
  valueInput.value = value;
  keyInput.placeholder = "Tên";
  valueInput.placeholder = "Giá trị";
  keyInput.setAttribute("aria-label", `${$(id).dataset.title}: tên`);
  valueInput.setAttribute("aria-label", `${$(id).dataset.title}: giá trị`);
  const remove = element("button", "", "×");
  remove.type = "button";
  remove.setAttribute("aria-label", "Xóa trường");
  remove.onclick = () => {
    row.remove();
    dirty = true;
  };
  row.append(keyInput, valueInput, remove);
  $(id).append(row);
}
function kvRead(id) {
  const result = {};
  for (const row of $(id).querySelectorAll(".kv-row")) {
    const [key, value] = row.querySelectorAll("input");
    if (!key.value.trim()) {
      if (value.value) throw new Error("Mỗi giá trị query/header cần có tên.");
      continue;
    }
    if (Object.hasOwn(result, key.value.trim()))
      throw new Error("Tên query/header bị trùng.");
    Object.defineProperty(result, key.value.trim(), {
      value: value.value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return result;
}
function defaultRoute() {
  return {
    id: uuid(),
    name: "",
    description: "",
    methods: ["GET"],
    matchType: "exact",
    sourcePath: "/api/v1/new-route",
    upstreamPath: "/api/v1/new-route",
    serviceKey:
      $("route-service-filter").value ||
      overview.services.find((x) => x.key === "catalog")?.key ||
      "identity",
    enabled: true,
    auth: "jwt",
    roles: [],
    priority: 0,
    timeoutMs: 15000,
    changeOrigin: true,
    preserveQuery: true,
    forwardAuthorization: true,
    query: { set: {}, remove: [] },
    headers: {
      request: {},
      response: {},
      removeRequest: [],
      removeResponse: [],
    },
    rateLimit: {
      enabled: true,
      limit: 120,
      windowMs: 60000,
      key: "ip",
      group: "",
    },
    security: {
      requireHttps: false,
      maxBodyBytes: 1048576,
      allowedContentTypes: [],
      allowedIps: [],
      blockedIps: [],
      allowedOrigins: [],
    },
    paramTypes: {},
  };
}
function openRoute(route = null) {
  if (!overview) return;
  editingRoute = route ? structuredClone(route) : defaultRoute();
  editingService = null;
  $("editor-title").textContent = route ? "Cấu hình route" : "Thêm route";
  for (const [id, key] of Object.entries({
    "route-name": "name",
    "route-description": "description",
    "route-source": "sourcePath",
    "route-upstream": "upstreamPath",
    "route-priority": "priority",
    "route-timeout": "timeoutMs",
    "route-match": "matchType",
    "route-auth": "auth",
  }))
    $(id).value = editingRoute[key];
  for (const [id, key] of Object.entries({
    "route-enabled": "enabled",
    "route-change-origin": "changeOrigin",
    "route-preserve-query": "preserveQuery",
    "route-forward-auth": "forwardAuthorization",
  }))
    $(id).checked = editingRoute[key];
  $("route-roles").value = editingRoute.roles.join(", ");
  $("route-rate-enabled").checked = editingRoute.rateLimit.enabled;
  $("route-rate-limit").value = editingRoute.rateLimit.limit;
  $("route-rate-window").value = editingRoute.rateLimit.windowMs / 1000;
  $("route-rate-key").value = editingRoute.rateLimit.key || "ip";
  $("route-rate-group").value = editingRoute.rateLimit.group || "";
  $("route-rate-update-group").checked = false;
  const context = overview.requestContext;
  $('policy-request-context').textContent = context ? `Kết nối quản trị hiện tại: IP ${context.ip} · ${context.secure ? 'HTTPS' : 'HTTP'}. IP client được xác định theo proxy tin cậy.` : '';
  const security = editingRoute.security || {
    requireHttps: false,
    maxBodyBytes: 0,
    allowedContentTypes: [],
    allowedIps: [],
    blockedIps: [],
    allowedOrigins: [],
  };
  $("route-https").checked = security.requireHttps;
  $("route-body-limit").value = security.maxBodyBytes / 1024;
  $("route-content-types").value = security.allowedContentTypes.join(", ");
  $("route-allow-ips").value = security.allowedIps.join("\n");
  $("route-deny-ips").value = security.blockedIps.join("\n");
  $("route-origins").value = security.allowedOrigins.join("\n");
  $("query-remove").value = editingRoute.query.remove.join(", ");
  $("request-remove").value = editingRoute.headers.removeRequest.join(", ");
  $("response-remove").value = editingRoute.headers.removeResponse.join(", ");
  kvFill("query-set", editingRoute.query.set);
  kvFill("request-headers", editingRoute.headers.request);
  kvFill("response-headers", editingRoute.headers.response);
  const select = $("route-service");
  select.replaceChildren();
  for (const service of overview.services) {
    const option = element("option", "", `${service.name} (${service.key})`);
    option.value = service.key;
    select.append(option);
  }
  select.value = editingRoute.serviceKey;
  const options = $("route-methods");
  options.replaceChildren();
  for (const method of methods) {
    const label = element("label", "method-option"),
      checkbox = element("input");
    checkbox.type = "checkbox";
    checkbox.value = method;
    checkbox.checked = editingRoute.methods.includes(method);
    label.append(checkbox, document.createTextNode(method));
    options.append(label);
  }
  $("preview-method").replaceChildren();
  for (const method of methods) {
    const option = element("option", "", method);
    option.value = method;
    $("preview-method").append(option);
  }
  $("preview-method").value = editingRoute.methods[0];
  $("preview-url").value = editingRoute.sourcePath.replace(
    /:([\w]+)/g,
    (_, key) =>
      editingRoute.paramTypes[key] === "uuid"
        ? "12345678-1234-1234-1234-123456789abc"
        : "123",
  );
  updateParams(editingRoute.paramTypes);
  updateMapping();
  updateAuth(false);
  selectTab("mapping");
  show($("delete-route"), Boolean(route));
  show($("clone-route"), Boolean(route));
  show($("preview-result"), false);
  message($("editor-error"));
  dirty = false;
  openDrawer("route-drawer");
  $("route-name").focus();
}
function updateMapping() {
  $("flow-source").textContent =
    `${location.origin}${$("route-source").value}${$("route-match").value === "prefix" ? " /…" : ""}`;
  const service = overview?.services.find(
    (x) => x.key === $("route-service").value,
  );
  $("flow-target").textContent =
    `${service?.target || "[chưa cấu hình]"}${$("route-upstream").value}${$("route-match").value === "prefix" ? " /…" : ""}`;
  $("service-target-hint").textContent = service
    ? `${service.target || "Chưa có URL"} · ${service.enabled ? "đang bật" : "đang tắt"}`
    : "";
}
function updateParams(values) {
  const previous =
    values ||
    Object.fromEntries(
      [...$("param-types").querySelectorAll("select")].map((x) => [
        x.dataset.param,
        x.value,
      ]),
    );
  $("param-types").replaceChildren();
  for (const key of [
    ...new Set(
      [...$("route-source").value.matchAll(/:([A-Za-z][A-Za-z0-9_]*)/g)].map(
        (x) => x[1],
      ),
    ),
  ]) {
    const row = element("div", "form-row");
    row.append(element("code", "", `:${key}`));
    const select = element("select");
    select.dataset.param = key;
    select.setAttribute("aria-label", `Kiểu tham số ${key}`);
    for (const [value, name] of [
      ["segment", "Một đoạn đường dẫn"],
      ["uuid", "UUID"],
      ["number", "Số nguyên"],
    ]) {
      const option = element("option", "", name);
      option.value = value;
      select.append(option);
    }
    select.value = previous[key] || "segment";
    row.append(select);
    $("param-types").append(row);
  }
}
function updateAuth(mark = true) {
  const publicRoute = $("route-auth").value === "public";
  $("route-roles").disabled = publicRoute;
  $("route-forward-auth").disabled = publicRoute;
  $("route-rate-key").disabled = publicRoute;
  if (publicRoute) $("route-rate-key").value = "ip";
  if (publicRoute) {
    $("route-roles").value = "";
    $("route-forward-auth").checked = false;
    $("route-match").value = "exact";
    updateMapping();
  }
  if (mark) dirty = true;
}
function draftRoute() {
  return {
    ...editingRoute,
    name: $("route-name").value.trim(),
    description: $("route-description").value,
    serviceKey: $("route-service").value,
    methods: [...$("route-methods").querySelectorAll("input:checked")].map(
      (x) => x.value,
    ),
    matchType: $("route-match").value,
    sourcePath: $("route-source").value.trim(),
    upstreamPath: $("route-upstream").value.trim(),
    enabled: $("route-enabled").checked,
    auth: $("route-auth").value,
    roles: split($("route-roles").value),
    priority: Number($("route-priority").value),
    timeoutMs: Number($("route-timeout").value),
    changeOrigin: $("route-change-origin").checked,
    preserveQuery: $("route-preserve-query").checked,
    forwardAuthorization: $("route-forward-auth").checked,
    query: { set: kvRead("query-set"), remove: split($("query-remove").value) },
    headers: {
      request: kvRead("request-headers"),
      response: kvRead("response-headers"),
      removeRequest: split($("request-remove").value),
      removeResponse: split($("response-remove").value),
    },
    security: {
      requireHttps: $("route-https").checked,
      maxBodyBytes: Math.round(Number($("route-body-limit").value) * 1024),
      allowedContentTypes: split($("route-content-types").value).map((x) =>
        x.toLowerCase(),
      ),
      allowedIps: split($("route-allow-ips").value),
      blockedIps: split($("route-deny-ips").value),
      allowedOrigins: split($("route-origins").value),
    },
    rateLimit: {
      key: $("route-rate-key").value,
      group: $("route-rate-group").value.trim(),
      enabled: $("route-rate-enabled").checked,
      limit: Number($("route-rate-limit").value),
      windowMs: Number($("route-rate-window").value) * 1000,
    },
    paramTypes: Object.fromEntries(
      [...$("param-types").querySelectorAll("select")].map((x) => [
        x.dataset.param,
        x.value,
      ]),
    ),
  };
}
async function saveItem(type, item, isNew, applyGroup = false) {
  saving = true;
  try {
    await api(
      `/${type}${isNew ? "" : `/${encodeURIComponent(type === "routes" ? item.id : item.key)}`}`,
      {
        method: isNew ? "POST" : "PUT",
        body: JSON.stringify({
          version: overview.version,
          item,
          ...(type === "routes" ? { applyRateLimitToGroup: applyGroup } : {}),
        }),
      },
    );
    dirty = false;
    closeDrawer(true);
    await loadOverview(true);
    message($("notice"), "Đã lưu vào SQLite. Cấu hình mới đang được áp dụng.");
  } finally {
    saving = false;
  }
}
function openService(service = null) {
  editingService = service;
  editingRoute = null;
  $("service-title").textContent = service
    ? "Cấu hình service"
    : "Thêm service";
  $("service-key").value = service?.key || "";
  $("service-key").disabled = Boolean(service);
  $("service-name").value = service?.name || "";
  $("service-target").value = service?.target || "";
  $("service-description").value = service?.description || "";
  $("service-enabled").checked = service?.enabled ?? true;
  $("service-impact").textContent = service
    ? `${overview.routes.filter((x) => x.serviceKey === service.key).length} route đang dùng service này. Đổi URL sẽ đổi đích của tất cả các route đó.`
    : "Thêm service rồi gán service này trong cấu hình route.";
  show($("delete-service"), Boolean(service));
  message($("service-error"));
  dirty = false;
  openDrawer("service-drawer");
  $("service-name").focus();
}
function fillSettings() {
  const s = overview.settings;
  $("setting-origins").value = s.allowedOrigins.join("\n");
  $("setting-cookie").value = s.cookieDomain;
  $("setting-session").value = s.sessionMaxAgeMinutes;
  $("setting-login-limit").value = s.loginRateLimit.limit;
  $("setting-login-window").value = s.loginRateLimit.windowMs / 1000;
  $("setting-geo").checked = s.geoRestriction;
  $("setting-countries").value = s.allowedCountries.join(", ");
  const traffic = s.trafficPolicy || {
    securityHeaders: true,
    hstsMaxAgeSeconds: 0,
    rateLimit: { enabled: false, limit: 600, windowMs: 60000 },
  };
  $("setting-global-limit").checked = traffic.rateLimit.enabled;
  $("setting-global-count").value = traffic.rateLimit.limit;
  $("setting-global-window").value = traffic.rateLimit.windowMs / 1000;
  $("setting-security-headers").checked = traffic.securityHeaders;
  $("setting-hsts").value = traffic.hstsMaxAgeSeconds;
}
async function loadHistory() {
  try {
    const revisions = await api("/revisions");
    $("history-body").replaceChildren();
    for (const revision of revisions) {
      const row = element("tr");
      cell(row, `v${revision.version}`);
      cell(row, time(revision.createdAt));
      cell(row, revision.actor);
      cell(row, revision.reason);
      const restore = element(
        "button",
        "history-action",
        revision.version === overview.version ? "Đang chạy" : "Khôi phục",
      );
      restore.disabled = revision.version === overview.version;
      restore.onclick = async () => {
        if (
          !confirm(
            `Khôi phục toàn bộ services, routes và chính sách từ v${revision.version}?`,
          )
        )
          return;
        try {
          saving = true;
          await api(`/revisions/${revision.version}/restore`, {
            method: "POST",
            body: JSON.stringify({ version: overview.version }),
          });
          settingsDirty = false;
          closeDrawer(true);
          await loadOverview(true);
          message(
            $("notice"),
            `Đã khôi phục cấu hình từ v${revision.version}.`,
          );
        } catch (error) {
          message($("notice"), error.message, true);
        } finally {
          saving = false;
        }
      };
      cell(row, restore);
      $("history-body").append(row);
    }
  } catch (error) {
    message($("notice"), error.message, true);
  }
}
async function busy(form, work, errorTarget) {
  const buttons = [
    ...form.querySelectorAll("button,input,select,textarea"),
  ].map((control) => [control, control.disabled]);
  buttons.forEach(([control]) => (control.disabled = true));
  message(errorTarget);
  try {
    await work();
  } catch (error) {
    message(
      errorTarget,
      error.status === 409
        ? "Cấu hình đã đổi ở phiên khác. Hãy tải lại trước khi lưu."
        : error.message,
      true,
    );
  } finally {
    buttons.forEach(
      ([control, wasDisabled]) => (control.disabled = wasDisabled),
    );
  }
}
$("login-form").onsubmit = async (event) => {
  event.preventDefault();
  await busy(
    $("login-form"),
    async () => {
      const session = await request("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: $("username").value,
          password: $("password").value,
        }),
      });
      $("password").value = "";
      await start(session);
    },
    $("login-error"),
  );
  $("password").value = "";
};
$("logout-button").onclick = async () => {
  try {
    await request("/api/v1/auth/logout", { method: "POST", body: "{}" });
    loggedOut();
  } catch (error) {
    message($("notice"), `Đăng xuất thất bại: ${error.message}`, true);
  }
};
$("refresh-button").onclick = () => loadOverview();
for (const button of document.querySelectorAll("[data-view]"))
  button.onclick = () => switchView(button.dataset.view);
for (const button of document.querySelectorAll("[data-tab]"))
  button.onclick = () => selectTab(button.dataset.tab);
for (const button of document.querySelectorAll(".close-drawer"))
  button.onclick = () => closeDrawer();
$("drawer-backdrop").onclick = () => closeDrawer();
$("add-route-button").onclick = () => openRoute();
$("add-service-button").onclick = () => openService();
for (const id of [
  "route-search",
  "route-service-filter",
  "route-auth-filter",
  "route-method-filter",
  "route-state-filter",
])
  $(id).addEventListener("input", renderRoutes);
$("route-form").noValidate = true;
$("route-form").addEventListener("input", () => {
  dirty = true;
  updateMapping();
});
$("service-form").addEventListener("input", () => (dirty = true));
$("settings-form").addEventListener("input", () => (settingsDirty = true));
$("route-source").addEventListener("input", () => updateParams());
$("route-auth").onchange = () => updateAuth();
$("route-form").onsubmit = async (event) => {
  event.preventDefault();
  await busy(
    $("route-form"),
    async () => {
      const route = draftRoute();
      await saveItem(
        "routes",
        route,
        !overview.routes.some((x) => x.id === route.id),
        $("route-rate-update-group").checked,
      );
    },
    $("editor-error"),
  );
};
$("clone-route").onclick = () => {
  const route = draftRoute();
  route.id = uuid();
  route.name += " (copy)";
  route.sourcePath += "/copy";
  openRoute(route);
  show($("delete-route"), false);
  show($("clone-route"), false);
  dirty = true;
};
$("delete-route").onclick = async () => {
  if (!confirm("Xóa route này và ngừng áp dụng ngay?")) return;
  await busy(
    $("route-form"),
    async () => {
      saving = true;
      try {
        await api(`/routes/${editingRoute.id}`, {
          method: "DELETE",
          body: JSON.stringify({ version: overview.version }),
        });
        closeDrawer(true);
        await loadOverview(true);
        message($("notice"), "Đã xóa route.");
      } finally {
        saving = false;
      }
    },
    $("editor-error"),
  );
};
$("preview-button").onclick = async () => {
  await busy(
    $("route-form"),
    async () => {
      const result = await api("/preview", {
        method: "POST",
        body: JSON.stringify({
          method: $("preview-method").value,
          url: $("preview-url").value,
          route: draftRoute(),
        }),
      });
      $("preview-result").textContent =
        result.matched === false
          ? "Không có route đang bật khớp request này."
          : `${result.method} ${result.gatewayPath}\n↓\n${result.backendUrl || "Service chưa có URL"}\n\nRoute: ${result.name}\nService: ${result.serviceKey} (${result.serviceEnabled ? "bật" : "tắt"})\nXác thực: ${result.auth} ${result.roles.join(", ")}\nTimeout: ${result.timeoutMs} ms`;
      show($("preview-result"), true);
    },
    $("editor-error"),
  );
};
$("service-form").onsubmit = async (event) => {
  event.preventDefault();
  await busy(
    $("service-form"),
    () =>
      saveItem(
        "services",
        {
          key: $("service-key").value.trim(),
          name: $("service-name").value.trim(),
          target: $("service-target").value.trim(),
          description: $("service-description").value,
          enabled: $("service-enabled").checked,
        },
        !editingService,
      ),
    $("service-error"),
  );
};
$("delete-service").onclick = async () => {
  if (
    !confirm("Xóa service? Các route phải được chuyển sang service khác trước.")
  )
    return;
  await busy(
    $("service-form"),
    async () => {
      saving = true;
      try {
        await api(`/services/${editingService.key}`, {
          method: "DELETE",
          body: JSON.stringify({ version: overview.version }),
        });
        closeDrawer(true);
        await loadOverview(true);
      } finally {
        saving = false;
      }
    },
    $("service-error"),
  );
};
$("settings-form").onsubmit = async (event) => {
  event.preventDefault();
  await busy(
    $("settings-form"),
    async () => {
      saving = true;
      try {
        await api("/settings", {
          method: "PUT",
          body: JSON.stringify({
            version: overview.version,
            settings: {
              allowedOrigins: split($("setting-origins").value),
              cookieDomain: $("setting-cookie").value.trim(),
              sessionMaxAgeMinutes: Number($("setting-session").value),
              loginRateLimit: {
                limit: Number($("setting-login-limit").value),
                windowMs: Number($("setting-login-window").value) * 1000,
              },
              trafficPolicy: {
                securityHeaders: $("setting-security-headers").checked,
                hstsMaxAgeSeconds: Number($("setting-hsts").value),
                rateLimit: {
                  enabled: $("setting-global-limit").checked,
                  limit: Number($("setting-global-count").value),
                  windowMs: Number($("setting-global-window").value) * 1000,
                },
              },
              geoRestriction: $("setting-geo").checked,
              allowedCountries: split($("setting-countries").value).map((x) =>
                x.toUpperCase(),
              ),
            },
          }),
        });
        settingsDirty = false;
        await loadOverview(true);
        message($("notice"), "Đã áp dụng chính sách Gateway mới.");
      } finally {
        saving = false;
      }
    },
    $("notice"),
  );
};
$("export-button").onclick = async () => {
  try {
    const snapshot = await api("/config");
    const blob = new Blob(
      [
        JSON.stringify(
          {
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            config: {
              services: snapshot.services,
              routes: snapshot.routes,
              settings: snapshot.settings,
            },
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      link = element("a");
    link.href = url;
    link.download = `gateway-config-v${snapshot.version}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    message($("notice"), error.message, true);
  }
};
$("import-button").onclick = () => $("import-file").click();
$("import-file").onchange = async () => {
  const file = $("import-file").files[0];
  if (!file) return;
  try {
    if (file.size > 1024 * 1024)
      throw new Error("Tệp cấu hình phải nhỏ hơn 1 MB.");
    const data = JSON.parse(await file.text());
    if (data.schemaVersion !== 1 || !data.config)
      throw new Error("Tệp không đúng định dạng export Gateway.");
    if (
      !confirm(
        `Thay cấu hình hiện tại bằng ${data.config.services?.length || 0} services và ${data.config.routes?.length || 0} routes trong tệp?`,
      )
    )
      return;
    saving = true;
    await api("/config", {
      method: "PUT",
      body: JSON.stringify({ version: overview.version, config: data.config }),
    });
    settingsDirty = false;
    closeDrawer(true);
    await loadOverview(true);
    message($("notice"), "Đã nhập và áp dụng cấu hình.");
  } catch (error) {
    message($("notice"), error.message, true);
  } finally {
    saving = false;
    $("import-file").value = "";
  }
};
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDrawer();
  if (
    event.key === "Tab" &&
    !$("drawer-backdrop").classList.contains("hidden")
  ) {
    const drawer = document.querySelector(".drawer:not(.hidden)");
    const focusable = [
      ...drawer.querySelectorAll("button,input,select,textarea"),
    ].filter((x) => !x.disabled && x.getClientRects().length);
    if (event.shiftKey && document.activeElement === focusable[0]) {
      event.preventDefault();
      focusable.at(-1)?.focus();
    } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
      event.preventDefault();
      focusable[0]?.focus();
    }
  }
});
window.addEventListener("beforeunload", (event) => {
  if (dirty || settingsDirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});
let mappingMode = "nodes";
const expandedNodes = new Map();
const serviceStates = {
  reachable: "Kết nối TCP",
  unreachable: "Không kết nối",
  disabled: "Đã tắt",
  unconfigured: "Chưa cấu hình",
};
function setMappingMode(mode) {
  mappingMode = mode;
  show($("route-node-groups"), mode === "nodes");
  show($("route-table-view"), mode === "table");
  for (const value of ["node", "table"]) {
    const button = $(`${value}-mode-button`);
    const active = mode === (value === "node" ? "nodes" : "table");
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}
function chooseService(key) {
  $("route-service-filter").value = key;
  if (key) expandedNodes.set(key, true);
  renderRoutes();
}
function renderNodeMap() {
  const selected = $("route-service-filter").value;
  $("gateway-origin").textContent = location.origin;
  $("gateway-node-count").textContent =
    `${overview.routes.length} route · ${overview.services.length} service`;
  $("all-service-nodes").setAttribute("aria-pressed", String(!selected));
  $("service-nodes").replaceChildren();
  const order = [
    "catalog",
    "booking",
    "cart",
    "identity",
    "media",
    "search",
    "payment",
    "ticket",
    "car",
  ];
  const services = [...overview.services].sort(
    (a, b) =>
      (order.indexOf(a.key) === -1 ? 99 : order.indexOf(a.key)) -
        (order.indexOf(b.key) === -1 ? 99 : order.indexOf(b.key)) ||
      a.name.localeCompare(b.name),
  );
  for (const service of services) {
    const routes = overview.routes.filter(
      (route) => route.serviceKey === service.key,
    );
    const node = element(
      "button",
      `service-node ${selected === service.key ? "selected" : ""}`,
    );
    node.type = "button";
    node.dataset.serviceKey = service.key;
    node.setAttribute("aria-pressed", String(selected === service.key));
    node.title = `${service.name}: ${service.target || "Chưa có backend URL"}`;
    const head = element("div", "node-head");
    head.append(
      element(
        "span",
        `status-dot ${service.state !== "reachable" ? "inactive" : ""}`,
      ),
      element("strong", "", service.name),
      element("span", "node-route-count", routes.length),
    );
    node.append(
      head,
      element("code", "", service.target || "Chưa cấu hình URL"),
      element(
        "small",
        "",
        `${serviceStates[service.state] || service.state} · ${routes.filter((x) => x.enabled).length} route bật`,
      ),
    );
    node.onclick = () =>
      chooseService(selected === service.key ? "" : service.key);
    $("service-nodes").append(node);
  }
  const service = overview.services.find((x) => x.key === selected);
  $("mapping-title").textContent = service
    ? `API của ${service.name}`
    : "API theo node service";
  $("mapping-subtitle").textContent = service
    ? `${service.target || "Chưa cấu hình URL backend"} · Bấm endpoint để chỉnh ánh xạ và chính sách.`
    : "Mở từng node để xem tài nguyên, phương thức và đường đi tới backend.";
}
async function copyValue(value) {
  try {
    if (navigator.clipboard && window.isSecureContext)
      await navigator.clipboard.writeText(value);
    else {
      const input = element("textarea", "copy-buffer");
      input.value = value;
      document.body.append(input);
      input.select();
      const copied = document.execCommand("copy");
      input.remove();
      if (!copied) throw new Error("Trình duyệt không cho phép sao chép.");
    }
    message($("notice"), "Đã sao chép URL.");
  } catch (error) {
    message($("notice"), error.message, true);
  }
}
function urlBlock(title, url) {
  const block = element("div", "url-block");
  const head = element("div", "url-label");
  const copy = element("button", "copy-url", "Chép");
  copy.type = "button";
  copy.title = `Sao chép ${title}`;
  copy.onclick = (event) => {
    event.stopPropagation();
    copyValue(url);
  };
  head.append(element("small", "", title), copy);
  block.append(head, element("code", "", url));
  return block;
}
function policyBadges(route) {
  const policy = element("div", "api-policy");
  policy.append(
    element(
      "span",
      `badge ${route.auth}`,
      route.auth === "public" ? "Công khai" : "JWT / SSO",
    ),
  );
  if (route.roles.length)
    policy.append(
      element(
        "span",
        "policy-chip",
        route.roles.map((x) => x.replace("ROLE_", "")).join(" / "),
      ),
    );
  const limit = route.rateLimit;
  const keyName = { ip: "IP", user: "tài khoản", "ip-user": "IP + tài khoản" }[
    limit.key || "ip"
  ];
  policy.append(
    element(
      "span",
      `policy-chip ${limit.enabled ? "" : "unlimited"}`,
      limit.enabled
        ? `${limit.limit} req / ${limit.windowMs / 1000}s · ${keyName}${limit.group ? ` · nhóm ${limit.group}` : ""}`
        : "Chưa đặt rate limit riêng",
    ),
  );
  const security = route.security || {};
  if (security.requireHttps)
    policy.append(element("span", "policy-chip", "HTTPS"));
  if (security.maxBodyBytes)
    policy.append(
      element(
        "span",
        "policy-chip",
        `Body ≤ ${security.maxBodyBytes / 1024} KiB`,
      ),
    );
  if (security.allowedIps?.length || security.blockedIps?.length)
    policy.append(element("span", "policy-chip", "Lọc IP/CIDR"));
  if (security.allowedContentTypes?.length)
    policy.append(
      element("span", "policy-chip", security.allowedContentTypes.join(", ")),
    );
  if (security.allowedOrigins?.length)
    policy.append(element("span", "policy-chip", "Lọc origin"));
  return policy;
}
function renderRouteGroups(routes) {
  const groups = $("route-node-groups");
  groups.replaceChildren();
  const selected = $("route-service-filter").value;
  const services = [...overview.services].sort((a, b) =>
    a.key === "catalog"
      ? -1
      : b.key === "catalog"
        ? 1
        : a.name.localeCompare(b.name),
  );
  for (const service of services) {
    const items = routes.filter((route) => route.serviceKey === service.key);
    if (selected && selected !== service.key) continue;
    if (!items.length && !selected) continue;
    const details = element("details", "service-route-group");
    details.dataset.serviceKey = service.key;
    details.open = Boolean(
      selected ||
      $("route-search").value ||
      expandedNodes.get(service.key) ||
      (!expandedNodes.has(service.key) && service.key === "catalog"),
    );
    details.ontoggle = () => expandedNodes.set(service.key, details.open);
    const summary = element("summary", "service-group-head");
    const identity = element("div", "service-group-identity");
    const title = element("div");
    title.append(
      element("h3", "", service.name),
      element("code", "", service.target || "Chưa có URL backend"),
    );
    identity.append(element("span", "service-symbol", service.name[0]), title);
    const stats = element("div", "service-group-stats");
    stats.append(
      element(
        "span",
        `health ${service.state}`,
        serviceStates[service.state] || service.state,
      ),
      element("span", "policy-chip", `${items.length} route`),
      element("span", "group-chevron", "⌄"),
    );
    summary.append(identity, stats);
    details.append(summary);
    const controls = element("div", "service-group-controls");
    controls.append(
      element("span", "", "Đường dẫn Gateway → URL cục bộ / backend"),
    );
    const edit = element("button", "secondary", "Cấu hình node");
    edit.type = "button";
    edit.onclick = () => openService(service);
    const rest = element("button", "secondary", "+ Tài nguyên REST");
    rest.type = "button";
    rest.onclick = () => openRest(service.key);
    controls.append(edit, rest);
    details.append(controls);
    const resources = new Map();
    for (const route of [...items].sort(
      (a, b) =>
        a.sourcePath.localeCompare(b.sourcePath) ||
        a.methods[0].localeCompare(b.methods[0]),
    )) {
      const key = `${route.sourcePath}:${route.matchType}`;
      if (!resources.has(key)) resources.set(key, []);
      resources.get(key).push(route);
    }
    for (const resourceRoutes of resources.values()) {
      const first = resourceRoutes[0],
        resource = element("article", "rest-resource");
      const heading = element("div", "resource-head");
      heading.append(
        element("code", "", first.sourcePath),
        element(
          "span",
          `badge ${first.matchType === "prefix" ? "namespace" : "jwt"}`,
          first.matchType === "prefix"
            ? "Namespace + phần path còn lại"
            : "Endpoint chính xác",
        ),
      );
      resource.append(heading);
      for (const route of resourceRoutes) {
        const row = element(
          "div",
          `api-mapping ${!route.enabled ? "is-disabled" : ""}`,
        );
        row.tabIndex = 0;
        row.dataset.routeId = route.id;
        row.setAttribute("aria-label", `Cấu hình ${route.name}`);
        row.onclick = () => openRoute(route);
        row.onkeydown = (event) => {
          if (event.target === row && ["Enter", " "].includes(event.key)) {
            event.preventDefault();
            openRoute(route);
          }
        };
        const flow = element("div", "api-flow"),
          badges = element("div", "api-methods");
        route.methods.forEach((method) =>
          badges.append(
            element("span", `badge ${method.toLowerCase()}`, method),
          ),
        );
        flow.append(
          badges,
          urlBlock(
            "GATEWAY / CLIENT",
            `${location.origin}${route.sourcePath}${route.matchType === "prefix" ? "/…" : ""}`,
          ),
          element("span", "mapping-arrow", "→"),
          urlBlock(
            `${service.key.toUpperCase()} / BACKEND`,
            `${service.target || "[chưa cấu hình]"}${route.upstreamPath}${route.matchType === "prefix" ? "/…" : ""}`,
          ),
        );
        const editRoute = element("button", "route-configure", "Thiết lập");
        editRoute.type = "button";
        editRoute.onclick = (event) => {
          event.stopPropagation();
          openRoute(route);
        };
        flow.append(editRoute);
        row.append(flow);
        const foot = element("div", "api-foot");
        foot.append(policyBadges(route));
        const toggle = element(
          "button",
          `route-status ${route.enabled ? "" : "disabled"}`,
          route.enabled ? "● Bật" : "● Tắt",
        );
        toggle.type = "button";
        toggle.onclick = async (event) => {
          event.stopPropagation();
          toggle.disabled = true;
          try {
            await saveItem(
              "routes",
              { ...route, enabled: !route.enabled },
              false,
            );
          } catch (error) {
            toggle.disabled = false;
            message($("notice"), error.message, true);
          }
        };
        foot.append(toggle);
        row.append(foot);
        if (route.description)
          row.append(element("p", "api-description", route.description));
        resource.append(row);
      }
      details.append(resource);
    }
    if (!items.length)
      details.append(
        element(
          "p",
          "empty",
          "Node này chưa có API. Tạo tài nguyên REST hoặc thêm route để định nghĩa ánh xạ.",
        ),
      );
    groups.append(details);
  }
  setMappingMode(mappingMode);
}
const restOperations = [
  { key: "list", method: "GET", item: false, label: "Danh sách", status: 200 },
  {
    key: "read",
    method: "GET",
    item: true,
    label: "Chi tiết theo ID",
    status: 200,
  },
  { key: "create", method: "POST", item: false, label: "Tạo mới", status: 201 },
  {
    key: "replace",
    method: "PUT",
    item: true,
    label: "Thay toàn bộ",
    status: 200,
  },
  {
    key: "update",
    method: "PATCH",
    item: true,
    label: "Cập nhật một phần",
    status: 200,
  },
  { key: "delete", method: "DELETE", item: true, label: "Xóa", status: 204 },
];
function openRest(serviceKey = $("route-service-filter").value || "catalog") {
  closeDrawer(true);
  const select = $("rest-service");
  select.replaceChildren();
  for (const service of overview.services) {
    const option = element("option", "", service.name);
    option.value = service.key;
    select.append(option);
  }
  select.value = overview.services.some((x) => x.key === serviceKey)
    ? serviceKey
    : overview.services[0].key;
  const service = overview.services.find((x) => x.key === select.value);
  $("rest-name").value = `Tài nguyên ${service.name}`;
  $("rest-source").value = `/api/v1/${service.key}/resources`;
  $("rest-target").value = "/api/resources";
  $("rest-param").value = "id";
  $("rest-param-type").value = "uuid";
  $("rest-roles").value = "";
  $("rest-public-reads").checked = false;
  $("rest-share-limit").checked = true;
  $("rest-rate-key").value = "ip";
  $("rest-read-limit").value = 180;
  $("rest-write-limit").value = 30;
  $("rest-operations").replaceChildren();
  for (const operation of restOperations) {
    const label = element("label", "rest-operation"),
      checkbox = element("input");
    checkbox.type = "checkbox";
    checkbox.value = operation.key;
    checkbox.checked = true;
    label.append(
      checkbox,
      element(
        "span",
        `badge ${operation.method.toLowerCase()}`,
        operation.method,
      ),
      document.createTextNode(operation.label),
    );
    $("rest-operations").append(label);
  }
  message($("rest-error"));
  renderRestPreview();
  dirty = false;
  openDrawer("rest-drawer");
  $("rest-name").focus();
}
function restDraft() {
  const serviceKey = $("rest-service").value,
    service = overview.services.find((x) => x.key === serviceKey);
  const source = $("rest-source").value.trim(),
    target = $("rest-target").value.trim(),
    parameter = $("rest-param").value.trim();
  const roles = split($("rest-roles").value),
    group = source.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 55)
      + '-' + [...source].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261).toString(16).padStart(8, '0');
  const selected = [
    ...$("rest-operations").querySelectorAll("input:checked"),
  ].map((x) => x.value);
  return restOperations
    .filter((x) => selected.includes(x.key))
    .map((operation) => {
      const read = operation.method === "GET",
        publicRead = read && $("rest-public-reads").checked;
      const route = defaultRoute();
      return {
        ...route,
        name: `${$("rest-name").value.trim()} · ${operation.label}`,
        description: `${operation.method}: ${operation.label}. Backend quyết định response.`,
        serviceKey,
        sourcePath: source + (operation.item ? `/:${parameter}` : ""),
        upstreamPath: target + (operation.item ? `/:${parameter}` : ""),
        methods: [operation.method],
        matchType: "exact",
        enabled: Boolean(service?.enabled && service.target),
        auth: publicRead ? "public" : "jwt",
        roles: publicRead ? [] : roles,
        paramTypes: operation.item
          ? { [parameter]: $("rest-param-type").value }
          : {},
        rateLimit: {
          enabled: true,
          limit: Number($(read ? "rest-read-limit" : "rest-write-limit").value),
          windowMs: 60000,
          key: publicRead ? "ip" : $("rest-rate-key").value,
          group: $("rest-share-limit").checked
            ? `${group}-${read ? "read" : "write"}`
            : "",
        },
        security: {
          ...route.security,
          allowedContentTypes: read ? [] : ["application/json"],
        },
      };
    });
}
function renderRestPreview() {
  const preview = $("rest-preview");
  preview.replaceChildren();
  const routes = restDraft(),
    service = overview.services.find((x) => x.key === $("rest-service").value);
  let conflict = false;
  routes.forEach((route, index) => {
    const operation = restOperations.find(
      (x) =>
        x.method === route.methods[0] &&
        x.item ===
          route.sourcePath.endsWith(`/:${$("rest-param").value.trim()}`),
    );
    const existing = overview.routes.find(
      (x) =>
        x.enabled &&
        x.matchType === "exact" &&
        x.sourcePath === route.sourcePath &&
        x.methods.includes(route.methods[0]),
    );
    const row = element(
      "div",
      `rest-preview-row ${existing ? "conflict" : ""}`,
    );
    const title = element("div");
    title.append(
      element(
        "span",
        `badge ${route.methods[0].toLowerCase()}`,
        route.methods[0],
      ),
      element("b", "", operation?.label || route.name),
      element("small", "", `Response thường: ${operation?.status || 200}`),
    );
    row.append(
      title,
      element("code", "", `${location.origin}${route.sourcePath}`),
      element("span", "mapping-arrow", "↓"),
      element(
        "code",
        "",
        `${service?.target || "[chưa cấu hình]"}${route.upstreamPath}`,
      ),
      policyBadges(route),
    );
    if (existing) {
      conflict = true;
      row.append(
        element(
          "span",
          "conflict-message",
          `Trùng endpoint đã có: ${existing.name}. Bỏ chọn thao tác hoặc chỉnh route hiện tại.`,
        ),
      );
    }
    preview.append(row);
  });
  $("rest-count").textContent =
    `${routes.length} endpoint · ${service?.enabled && service.target ? "sẽ bật sau khi lưu" : "sẽ lưu ở trạng thái tắt"}`;
  $("save-rest").disabled = !routes.length || conflict;
}
function setupNodeWorkspace() {
  $("all-service-nodes").onclick = () => chooseService("");
  $("node-mode-button").onclick = () => setMappingMode("nodes");
  $("table-mode-button").onclick = () => setMappingMode("table");
  $("rest-resource-button").onclick = () => openRest();
  $("rest-form").addEventListener("input", () => {
    dirty = true;
    renderRestPreview();
  });
  $("rest-form").onsubmit = async (event) => {
    event.preventDefault();
    await busy(
      $("rest-form"),
      async () => {
        const items = restDraft();
        if (!items.length) throw new Error("Chọn ít nhất một thao tác REST.");
        saving = true;
        try {
          await api("/routes/batch", {
            method: "POST",
            body: JSON.stringify({ version: overview.version, items }),
          });
          dirty = false;
          closeDrawer(true);
          chooseService(items[0].serviceKey);
          await loadOverview(true);
          message(
            $("notice"),
            `Đã lưu và áp dụng ${items.length} endpoint REST trong một transaction.`,
          );
        } finally {
          saving = false;
        }
      },
      $("rest-error"),
    );
  };
  for (const button of document.querySelectorAll("[data-rate-preset]"))
    button.onclick = () => {
      const preset = { read: [120, 60], write: [30, 60], strict: [5, 900] }[
        button.dataset.ratePreset
      ];
      $("route-rate-enabled").checked = true;
      $("route-rate-limit").value = preset[0];
      $("route-rate-window").value = preset[1];
      dirty = true;
    };
}

setupNodeWorkspace();
checkSession();
