import ipaddr from "ipaddr.js";
import { isIP } from "node:net";

const plain = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
function fields(value, allowed, fail) {
  if (!plain(value) || Object.keys(value).some((key) => !allowed.includes(key)))
    fail("Chính sách bảo mật chứa trường không hợp lệ.");
}
function flag(value, fail) {
  if (typeof value !== "boolean")
    fail("Trạng thái chính sách phải là true hoặc false.");
  return value;
}
function number(value, min, max, fail) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    fail(`Giá trị chính sách phải nằm trong ${min}–${max}.`);
  return value;
}
function entries(value, validate, fail) {
  if (!Array.isArray(value) || value.length > 50)
    fail("Danh sách chính sách tối đa 50 mục.");
  return [
    ...new Set(
      value.map((item) => {
        if (typeof item !== "string" || item.length > 300 || !validate(item))
          fail(`Giá trị chính sách không hợp lệ: ${String(item).slice(0, 80)}`);
        return item;
      }),
    ),
  ];
}
export const emptyRouteSecurity = () => ({
  requireHttps: false,
  maxBodyBytes: 0,
  allowedContentTypes: [],
  allowedIps: [],
  blockedIps: [],
  allowedOrigins: [],
});
export function normalizeRouteSecurity(input, fail) {
  const value = input === undefined ? emptyRouteSecurity() : input;
  fields(value, Object.keys(emptyRouteSecurity()), fail);
  const validIp = (text) => {
    const [address, prefix, extra] = text.split("/");
    if (!isIP(address) || address.includes("%") || extra !== undefined)
      return false;
    return (
      prefix === undefined ||
      (/^\d{1,3}$/.test(prefix) && ipaddr.isValidCIDR(text))
    );
  };
  return {
    requireHttps: flag(value.requireHttps, fail),
    maxBodyBytes: number(value.maxBodyBytes, 0, 50 * 1024 * 1024, fail),
    allowedContentTypes: entries(
      value.allowedContentTypes,
      (text) =>
        /^[a-z0-9!#$&^_.+-]+\/(?:[a-z0-9!#$&^_.+-]+|\*|\*\+[a-z0-9_.+-]+)$/.test(
          text,
        ),
      fail,
    ),
    allowedIps: entries(value.allowedIps, validIp, fail),
    blockedIps: entries(value.blockedIps, validIp, fail),
    allowedOrigins: entries(
      value.allowedOrigins,
      (text) => {
        try {
          const url = new URL(text);
          return (
            ["http:", "https:"].includes(url.protocol) &&
            url.origin === text &&
            !url.username &&
            !url.password
          );
        } catch {
          return false;
        }
      },
      fail,
    ),
  };
}
export function normalizeTrafficPolicy(input, fail) {
  const value =
    input === undefined
      ? {
          securityHeaders: true,
          hstsMaxAgeSeconds: 0,
          rateLimit: { enabled: false, limit: 600, windowMs: 60000 },
        }
      : input;
  fields(value, ["securityHeaders", "hstsMaxAgeSeconds", "rateLimit"], fail);
  fields(value.rateLimit, ["enabled", "limit", "windowMs"], fail);
  return {
    securityHeaders: flag(value.securityHeaders, fail),
    hstsMaxAgeSeconds: number(value.hstsMaxAgeSeconds, 0, 63072000, fail),
    rateLimit: {
      enabled: flag(value.rateLimit.enabled, fail),
      limit: number(value.rateLimit.limit, 1, 100000, fail),
      windowMs: number(value.rateLimit.windowMs, 1000, 86400000, fail),
    },
  };
}

const compiledPolicies = new WeakMap();
function compiled(policy) {
  if (!compiledPolicies.has(policy)) {
    const cidrs = (values) =>
      values.map((value) =>
        ipaddr.parseCIDR(
          value.includes("/")
            ? value
            : `${value}/${isIP(value) === 4 ? 32 : 128}`,
        ),
      );
    compiledPolicies.set(policy, {
      allow: cidrs(policy.allowedIps),
      deny: cidrs(policy.blockedIps),
    });
  }
  return compiledPolicies.get(policy);
}
function matches(address, networks) {
  return networks.some(([network, prefix]) => {
    const source =
      network.kind() === "ipv4" &&
      address.kind() === "ipv6" &&
      address.isIPv4MappedAddress()
        ? address.toIPv4Address()
        : address;
    return source.kind() === network.kind() && source.match(network, prefix);
  });
}
export function enforceRequestPolicy(req, res, policy) {
  const reject = (status, message, code) => {
    res.status(status).json({ status, message, errorCode: code });
    return false;
  };
  if (policy.requireHttps && !req.secure)
    return reject(403, "Route này yêu cầu HTTPS.", "HTTPS_REQUIRED");
  if (policy.allowedIps.length || policy.blockedIps.length) {
    let address;
    try {
      address = ipaddr.parse(req.ip || req.socket.remoteAddress);
    } catch {
      return reject(403, "Không xác minh được IP nguồn.", "IP_NOT_ALLOWED");
    }
    const ranges = compiled(policy);
    if (
      matches(address, ranges.deny) ||
      (ranges.allow.length && !matches(address, ranges.allow))
    )
      return reject(
        403,
        "IP nguồn không được phép truy cập route.",
        "IP_NOT_ALLOWED",
      );
  }
  let origin = req.get("origin");
  if (!origin && req.get("referer")) {
    try {
      origin = new URL(req.get("referer")).origin;
    } catch {
      return reject(403, "Origin không hợp lệ.", "ROUTE_ORIGIN_NOT_ALLOWED");
    }
  }
  if (
    origin &&
    policy.allowedOrigins.length &&
    !policy.allowedOrigins.includes(origin)
  )
    return reject(
      403,
      "Origin không được phép truy cập route.",
      "ROUTE_ORIGIN_NOT_ALLOWED",
    );
  const hasBody =
    Number(req.headers["content-length"] || 0) > 0 ||
    Boolean(req.headers["transfer-encoding"]);
  if (hasBody && policy.allowedContentTypes.length) {
    const mime = (req.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const allowed = policy.allowedContentTypes.some((value) => {
      if (value === mime) return true;
      const [type, subtype] = value.split("/"),
        [actualType, actualSubtype = ""] = mime.split("/");
      return (
        type === actualType &&
        (subtype === "*" ||
          (subtype.startsWith("*+") &&
            actualSubtype.endsWith(subtype.slice(1))))
      );
    });
    if (!allowed)
      return reject(
        415,
        "Content-Type không được phép cho route.",
        "CONTENT_TYPE_NOT_ALLOWED",
      );
  }
  if (
    policy.maxBodyBytes &&
    Number(req.headers["content-length"]) > policy.maxBodyBytes
  )
    return reject(413, "Body vượt kích thước cho phép.", "BODY_TOO_LARGE");
  return true;
}

// Read bounded bodies before opening the upstream request. This also rejects
// chunked oversize payloads without passing a partial write to the backend.
let bufferedBytes = 0;
let activeBuffers = 0;
const bufferBudget = 64 * 1024 * 1024;
export function bufferLimitedBody(req, res, limit, timeoutMs) {
  if (req.destroyed) return Promise.resolve(false);
  const hasBody =
    Number(req.headers["content-length"] || 0) > 0 ||
    Boolean(req.headers["transfer-encoding"]);
  if (!limit || req.readableEnded || !hasBody) return Promise.resolve(true);
  if (activeBuffers >= 32) {
    res.set("Retry-After", "1").status(503).json({
      status: 503,
      message: "Gateway đang xử lý nhiều body. Vui lòng thử lại.",
    });
    req.resume();
    return Promise.resolve(false);
  }
  activeBuffers++;
  return new Promise((resolve) => {
    let length = 0,
      chunks = [],
      finished = false,
      reserved = 0,
      released = false;
    const release = () => {
      if (released) return;
      released = true;
      bufferedBytes -= reserved;
      activeBuffers--;
      delete req.gatewayBodyBuffer;
      delete req.gatewayBodyRelease;
    };
    res.once("close", release);
    const done = (ok, status, message) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      req.off("data", data);
      req.off("end", end);
      req.off("error", error);
      req.off("aborted", error);
      if (ok) {
        req.gatewayBodyBuffer = Buffer.concat(chunks, length);
        req.gatewayBodyRelease = release;
      } else release();
      chunks = [];
      if (status && !res.headersSent && !res.destroyed)
        res.status(status).json({ status, message });
      if (!ok && !req.destroyed) req.resume();
      resolve(ok);
    };
    const data = (chunk) => {
      length += chunk.length;
      if (length > limit)
        return done(false, 413, "Body vượt kích thước cho phép.");
      if (bufferedBytes + chunk.length > bufferBudget)
        return done(
          false,
          503,
          "Gateway đạt giới hạn bộ nhớ nhận body. Vui lòng thử lại.",
        );
      bufferedBytes += chunk.length;
      reserved += chunk.length;
      chunks.push(chunk);
    };
    const end = () => done(true);
    const error = () => done(false);
    const timer = setTimeout(
      () => done(false, 408, "Quá thời gian nhận body."),
      Math.min(timeoutMs, 30000),
    );
    req.on("data", data);
    req.once("end", end);
    req.once("error", error);
    req.once("aborted", error);
    res.once("close", error);
  });
}
