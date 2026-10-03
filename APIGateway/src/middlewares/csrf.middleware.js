import { createHmac, timingSafeEqual } from 'node:crypto';

export const readCookie = (req, name) => {
    const pair = (req.headers.cookie || '').split(';').map((part) => part.trim())
        .find((part) => part.startsWith(`${name}=`));
    if (!pair) return undefined;
    try { return decodeURIComponent(pair.slice(name.length + 1)); }
    catch { return undefined; }
};

const allowedOrigins = new Set([
    'https://gostay.nonnet123.io.vn',
    'https://auth.nonnet123.io.vn',
    'http://localhost:3000',
    'http://localhost:3335',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3335',
    ...(process.env.AUTH_ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean),
]);

export const isAllowedOrigin = (origin, req) => {
    if (!origin || origin === 'null') return false;
    try {
        const parsed = new URL(origin);
        if (parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol)) return false;
        return allowedOrigins.has(origin) || Boolean(req && origin === `${req.protocol}://${req.get('host')}`);
    } catch { return false; }
};

const sourceOrigin = (req) => {
    if (req.get('origin')) return req.get('origin');
    try { return new URL(req.get('referer')).origin; }
    catch { return undefined; }
};

const equal = (left, right) => {
    if (!left || !right) return false;
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
};

export const csrfTokenFor = (accessToken) => {
    const secret = process.env.CSRF_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) {
        throw new Error('CSRF_SECRET must contain at least 32 bytes');
    }
    return createHmac('sha256', secret).update(accessToken).digest('base64url');
};

export const protectCookieRequests = (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

    const accessToken = readCookie(req, 'access_token');
    const browserRequest = Boolean(req.get('origin') || req.get('referer') || req.get('sec-fetch-site'));
    const isLogin = req.path === '/api/v1/auth/login';
    const origin = sourceOrigin(req);

    // A browser cannot log a victim into an attacker-controlled account.
    if ((accessToken || isLogin || browserRequest) && origin && !isAllowedOrigin(origin, req)) {
        return res.status(403).json({ success: false, code: 'INVALID_ORIGIN', message: 'Origin not allowed' });
    }
    if ((accessToken || isLogin) && browserRequest && !origin) {
        return res.status(403).json({ success: false, code: 'MISSING_ORIGIN', message: 'Origin required' });
    }
    if (!accessToken || isLogin) return next();
    if (!origin || !isAllowedOrigin(origin, req)) {
        return res.status(403).json({ success: false, code: 'MISSING_ORIGIN', message: 'Origin required' });
    }
    try {
        const cookieToken = readCookie(req, 'csrf_token');
        const headerToken = req.get('x-csrf-token');
        if (!equal(cookieToken, headerToken) || !equal(headerToken, csrfTokenFor(accessToken))) {
            return res.status(403).json({ success: false, code: 'INVALID_CSRF_TOKEN', message: 'CSRF token invalid' });
        }
    } catch (error) {
        console.error('[CSRF] Configuration error:', error.message);
        return res.status(503).json({ success: false, code: 'CSRF_NOT_CONFIGURED', message: 'Session protection unavailable' });
    }
    next();
};
