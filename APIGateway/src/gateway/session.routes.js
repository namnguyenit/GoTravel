import express from "express";
import jwt from "jsonwebtoken";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createDynamicLimiter } from "../middlewares/dynamic-rate-limit.middleware.js";
import {
  csrfTokenFor,
  isAllowedOrigin,
  readCookie,
} from "../middlewares/csrf.middleware.js";
import { settings, identityTarget } from "./configuration.js";

const limitLogin = createDynamicLimiter();
const loginLimiter = (req, res, next) => {
  const policy = settings()?.loginRateLimit || { limit: 10, windowMs: 900000 };
  limitLogin(req, res, next, "sso-login", policy);
};

export const cookieOptions = (req) => {
  const primaryDomain = (
    settings()?.cookieDomain ||
    process.env.AUTH_COOKIE_DOMAIN ||
    "nonnet123.io.vn"
  )
    .replace(/^\./, "")
    .toLowerCase();
  const hostname = req.hostname.toLowerCase();
  const browserOrigin =
    req.get("origin") ||
    (() => {
      try {
        return new URL(req.get("referer")).origin;
      } catch {
        return undefined;
      }
    })();
  const browserHost = isAllowedOrigin(browserOrigin, req)
    ? new URL(browserOrigin).hostname.toLowerCase()
    : "";
  const domains = [...new Set([...(settings()?.cookieDomains || []), primaryDomain])]
    .sort((a, b) => b.length - a.length);
  // Proxies may replace Host with localhost. Only a validated browser origin
  // can select the cookie domain in that case; never derive it from an arbitrary host.
  const matches = (host, domain) => host === domain || host.endsWith(`.${domain}`);
  const domain = domains.find(domain => matches(hostname, domain)) ||
    domains.find(domain => matches(browserHost, domain));
  const sharedDomain = Boolean(domain);
  return {
    path: "/",
    sameSite: "lax",
    secure: req.secure || sharedDomain,
    ...(sharedDomain ? { domain } : {}),
  };
};

const clearSession = (req, res) => {
  const options = cookieOptions(req);
  res.clearCookie("access_token", { ...options, httpOnly: true });
  res.clearCookie("csrf_token", { ...options, httpOnly: false });
};

const setSession = (req, res, token) => {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== "object" || !decoded.sub || !decoded.exp) {
    throw new Error("Identity returned an invalid access token");
  }
  const maxAge = Math.min(
    decoded.exp * 1000 - Date.now(),
    (settings()?.sessionMaxAgeMinutes || 480) * 60000,
  );
  if (maxAge <= 0) throw new Error("Identity returned an expired access token");
  const csrf = csrfTokenFor(token);
  const options = { ...cookieOptions(req), maxAge };
  res.cookie("access_token", token, { ...options, httpOnly: true });
  res.cookie("csrf_token", csrf, { ...options, httpOnly: false });
  return {
    authenticated: true,
    userId: decoded.sub,
    roles: (decoded.scope || "").split(/\s+/).filter(Boolean),
    expiresAt: decoded.exp,
  };
};

const forwardAuth = async (req, res, path, body) => {
  try {
    const upstream = await fetch(`${identityTarget()}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(req.headers.authorization
          ? { authorization: req.headers.authorization }
          : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await upstream.json();
    res.set("Cache-Control", "no-store");
    if (!upstream.ok) {
      if (payload?.data?.token) delete payload.data.token;
      return res.status(upstream.status).json(payload);
    }
    if (!payload?.data?.token) {
      return res.status(502).json({
        success: false,
        code: "INVALID_IDENTITY_RESPONSE",
        message: "Authentication unavailable",
      });
    }
    const session = setSession(req, res, payload.data.token);
    return res.status(upstream.status).json({ ...payload, data: session });
  } catch (error) {
    console.error("[Session] Identity request failed:", error.message);
    return res.status(502).json({
      success: false,
      code: "IDENTITY_UNAVAILABLE",
      message: "Authentication unavailable",
    });
  }
};

export const setupSessionRoutes = (app) => {
  app.post(
    "/api/v1/auth/login",
    loginLimiter,
    express.json({ limit: "16kb" }),
    (req, res) => forwardAuth(req, res, "/api/auth/login", req.body),
  );

  app.get("/api/v1/auth/session", verifyJWT, (req, res) => {
    res.set("Cache-Control", "no-store");
    if (req.auth.source === "cookie") {
      // Replace a legacy JavaScript-readable cookie during the short migration window.
      try {
        setSession(req, res, readCookie(req, "access_token"));
      } catch (error) {
        console.error("[Session] Cannot secure cookie:", error.message);
        return res.status(503).json({
          success: false,
          code: "SESSION_NOT_CONFIGURED",
          message: "Session unavailable",
        });
      }
    }
    res.json({
      success: true,
      data: {
        authenticated: true,
        userId: req.auth.sub,
        roles: req.auth.roles.split(/\s+/).filter(Boolean),
        expiresAt: req.auth.exp,
      },
    });
  });

  app.post("/api/v1/auth/refresh-roles", verifyJWT, (req, res) => {
    if (req.auth.source !== "cookie" || !readCookie(req, "access_token")) {
      return res.status(403).json({
        success: false,
        code: "SESSION_REQUIRED",
        message: "Browser session required",
      });
    }
    return forwardAuth(req, res, "/api/auth/refresh-roles", {});
  });

  app.post("/api/v1/auth/logout", (req, res) => {
    clearSession(req, res);
    res.set("Cache-Control", "no-store");
    res.json({ success: true, data: { authenticated: false } });
  });
};
