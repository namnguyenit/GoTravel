import { timingSafeEqual } from 'node:crypto';

const tokenMatches = (provided, expected) => {
    if (typeof provided !== 'string' || typeof expected !== 'string') return false;
    const left = Buffer.from(provided);
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
};

export const verifyInternalToken = (req, res, next) => {
    if (req.path === '/transport' &&
        (process.env.TRANSPORT_INTERNAL_AUTH_REQUIRED === 'true' || req.headers['x-internal-caller'])) {
        let callers;
        try { callers = JSON.parse(process.env.TRANSPORT_INTERNAL_CALLERS || '{}'); }
        catch { return res.status(503).json({ success: false, code: 'INVALID_TRANSPORT_AUTH_CONFIG' }); }
        const token = callers.cart;
        if (req.headers['x-internal-caller'] !== 'cart' || typeof token !== 'string' || token.length < 32 ||
            !tokenMatches(req.headers['x-internal-service-token'], token)) {
            return res.status(401).json({ success: false, code: 'TRANSPORT_SERVICE_SCOPE_DENIED' });
        }
        return next();
    }
    const configuredToken =
        process.env.EMAIL_INTERNAL_TOKEN ||
        process.env.INTERNAL_SERVICE_TOKEN;

    const providedToken = req.headers["x-internal-service-token"];

    if (!configuredToken) {
        return res.status(503).json({
            success: false,
            status: 503,
            code: "INTERNAL_TOKEN_NOT_CONFIGURED",
            message: "Internal email token is not configured",
            data: null,
        });
    }

    if (!tokenMatches(providedToken, configuredToken)) {
        return res.status(401).json({
            success: false,
            status: 401,
            code: "UNAUTHORIZED",
            message: "Unauthorized internal email request",
            data: null,
        });
    }

    return next();
};
