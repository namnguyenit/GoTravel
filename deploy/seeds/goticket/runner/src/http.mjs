import { id } from "./core.mjs";
export class Pending extends Error {}
export class Api {
  constructor(p) {
    this.p = p;
    this.tokens = new Map();
    this.urls = {
      auth: process.env.SEED_AUTH_URL || "http://127.0.0.1:8080",
      car: process.env.SEED_CAR_URL || "http://127.0.0.1:3333",
      cart: process.env.SEED_CART_URL || "http://127.0.0.1:8084",
      pay: process.env.SEED_PAY_URL || "http://127.0.0.1:8085",
      catalog: process.env.SEED_CATALOG_URL || "http://127.0.0.1:8082",
    };
  }
  async auth(account) {
    if (account === "admin") {
      if (!process.env.SEED_ADMIN_ACCESS_TOKEN)
        throw new Pending(
          "Cần phiên đăng nhập Admin hiện có qua SEED_ADMIN_ACCESS_TOKEN; seed không tạo Admin hoặc đổi mật khẩu.",
        );
      const token = process.env.SEED_ADMIN_ACCESS_TOKEN;
      let payload;
      try {
        payload = JSON.parse(
          Buffer.from(token.split(".")[1], "base64url").toString(),
        );
      } catch {
        throw new Pending("Token Admin không đúng định dạng");
      }
      if (payload.sub !== this.p.adminId || payload.exp * 1000 < Date.now())
        throw new Pending(
          "Phiên Admin không khớp tài khoản có sẵn hoặc đã hết hạn",
        );
      return { token, id: this.p.adminId };
    }
    if (this.tokens.has(account.id)) return this.tokens.get(account.id);
    const body = await this.request("auth", "/api/auth/login", "POST", {
      username: account.username,
      password: account.password,
    });
    if (!body?.token) throw Error("Identity không trả token đăng nhập");
    const result = { token: body.token, id: account.id };
    this.tokens.set(account.id, result);
    return result;
  }
  async request(service, path, method = "GET", body, session, headers = {}) {
    const response = await fetch(this.urls[service] + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(session
          ? {
              Authorization: `Bearer ${session.token}`,
              "X-User-Id": session.id,
            }
          : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) {
      const e = new Error(
        `${service} ${method} ${path}: HTTP ${response.status} ${String(payload?.message || "").slice(0, 300)}`,
      );
      e.status = response.status;
      throw e;
    }
    return payload?.data ?? payload;
  }
  async call(account, service, path, method = "GET", body, headers = {}) {
    return this.request(
      service,
      path,
      method,
      body,
      await this.auth(account),
      headers,
    );
  }
  key(name) {
    return id(this.p.runId, "api-command", name);
  }
}
