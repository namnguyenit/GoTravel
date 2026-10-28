import express from "express";
import jwt from "jsonwebtoken";
import { createHash } from 'node:crypto';
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createDynamicLimiter } from "../middlewares/dynamic-rate-limit.middleware.js";
import {
  csrfTokenFor,
  isAllowedOrigin,
  readAccessToken,
  readCookies,
  SIGNED_OUT_COOKIE,
} from "../middlewares/csrf.middleware.js";
import { settings, identityTarget } from "./configuration.js";

const limitLogin = createDynamicLimiter();
const loginLimiter = (req, res, next) => {
  const policy = settings()?.loginRateLimit || { limit: 10, windowMs: 900000 };
  limitLogin(req, res, next, "sso-login", policy);
};

// Only guards in-flight refresh responses. The browser logout marker survives restarts.
const loggedOutTokens = new Map();
const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
const pruneLoggedOutTokens = () => {
  const now = Date.now();
  for (const [hash, expiresAt] of loggedOutTokens) if (expiresAt <= now) loggedOutTokens.delete(hash);
};
const rememberEndedTokens = (req, keepToken) => {
  pruneLoggedOutTokens();
  const expiresAt = Date.now() + (settings()?.sessionMaxAgeMinutes || 480) * 60_000;
  for (const token of readCookies(req, 'access_token')) {
    if (token !== keepToken) loggedOutTokens.set(tokenHash(token), expiresAt);
  }
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
  const { domain, ...hostOptions } = options;
  // Remove legacy host-only/path cookies as well as the canonical shared cookie.
  // Clearing only the parent domain leaves a host cookie that can log the user back in.
  for (const scope of domain ? [hostOptions, options] : [hostOptions]) {
    for (const path of ['/', '/api', '/api/v1', '/api/v1/auth']) {
      res.clearCookie("access_token", { ...scope, path, httpOnly: true });
      res.clearCookie("csrf_token", { ...scope, path, httpOnly: false });
    }
  }
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
  res.set('X-CSRF-Token', csrf);
  const options = { ...cookieOptions(req), maxAge };
  clearSession(req, res);
  const { domain, ...hostOptions } = cookieOptions(req);
  res.clearCookie(SIGNED_OUT_COOKIE, { ...hostOptions, httpOnly: true });
  if (domain) res.clearCookie(SIGNED_OUT_COOKIE, { ...cookieOptions(req), httpOnly: true });
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
  const priorToken = path === '/api/auth/refresh-roles' ? readAccessToken(req) : undefined;
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
    pruneLoggedOutTokens();
    if (priorToken && loggedOutTokens.has(tokenHash(priorToken))) {
      return res.status(401).json({ success: false, code: 'SESSION_ENDED', message: 'Session ended' });
    }
    if (path === '/api/auth/login') {
      rememberEndedTokens(req, payload.data.token);
      loggedOutTokens.delete(tokenHash(payload.data.token));
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

  app.get("/api/v1/auth/session", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.vary('Cookie');
    res.vary('Authorization');
    const token = readAccessToken(req);
    if (token) {
      // Bootstrap CSRF even for an expired session so it can still be logged out.
      // A read MUST NOT write access_token: a late response could undo logout/login.
      try {
        const csrf = csrfTokenFor(token);
        res.set('X-CSRF-Token', csrf);
        if (!readCookies(req, 'csrf_token').includes(csrf)) {
          const decoded = jwt.decode(token);
          const maxAge = Math.max(60_000, Math.min(
            (Number(decoded?.exp || 0) * 1000) - Date.now(),
            (settings()?.sessionMaxAgeMinutes || 480) * 60_000,
          ));
          res.cookie('csrf_token', csrf, { ...cookieOptions(req), httpOnly: false, maxAge });
        }
      } catch (error) {
        console.error("[Session] Cannot prepare CSRF:", error.message);
        return res.status(503).json({
          success: false,
          code: "SESSION_NOT_CONFIGURED",
          message: "Session unavailable",
        });
      }
    }
    next();
  }, verifyJWT, (req, res) => {
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
    if (req.auth.source !== "cookie" || !readAccessToken(req)) {
      return res.status(403).json({
        success: false,
        code: "SESSION_REQUIRED",
        message: "Browser session required",
      });
    }
    return forwardAuth(req, res, "/api/auth/refresh-roles", {});
  });

  app.post("/api/v1/auth/logout", (req, res) => {
    const maxAge = (settings()?.sessionMaxAgeMinutes || 480) * 60_000;
    rememberEndedTokens(req);
    clearSession(req, res);
    res.cookie(SIGNED_OUT_COOKIE, '1', { ...cookieOptions(req), httpOnly: true, maxAge });
    res.set("Cache-Control", "no-store");
    res.json({ success: true, data: { authenticated: false } });
  });
};
