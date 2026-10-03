import jwt from "jsonwebtoken";
import { timingSafeEqual } from 'node:crypto';
import jwksClient from "jwks-rsa";
import { throwError } from "../utils/throwError.js";

const identityServiceUrl = process.env.IDENTITY_SERVICE_URL || "http://localhost:8080";

const client = jwksClient({
    jwksUri: `${identityServiceUrl}/.well-known/jwks.json`,
    cache: true,
    rateLimit: true,
});

function getKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            return callback(err);
        }

        const signingKey = key.publicKey || key.rsaPublicKey;
        callback(null, signingKey);
    });
}

export const verifyMediaJWT = (req, res, next) => {
    const internalServiceToken =
        process.env.MEDIA_INTERNAL_SERVICE_TOKEN ||
        process.env.INTERNAL_SERVICE_TOKEN;
    const providedServiceToken = req.headers["x-internal-service-token"];

    if (providedServiceToken && !internalServiceToken) {
        return res.status(503).json({ success: false, code: 'INTERNAL_TOKEN_NOT_CONFIGURED', message: 'Internal service token is not configured' });
    }

    const matchesInternalToken = typeof providedServiceToken === 'string' && typeof internalServiceToken === 'string'
        && Buffer.byteLength(providedServiceToken) === Buffer.byteLength(internalServiceToken)
        && timingSafeEqual(Buffer.from(providedServiceToken), Buffer.from(internalServiceToken));
    if (providedServiceToken && !matchesInternalToken) {
        return next(throwError("UNAUTHORIZED"));
    }

    if (matchesInternalToken) {
        req.headers["x-user-id"] = "identity-service";
        req.headers["x-user-roles"] = "INTERNAL_SERVICE";
        return next();
    }

    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme?.toLowerCase() !== "bearer" || !token) {
        return next(throwError("UNAUTHORIZED"));
    }

    jwt.verify(token, getKey, { algorithms: ["RS256"], issuer: "com.gotravel.identity", audience: "gotravel-api", maxAge: '8h' }, (err, decoded) => {
        if (err || !decoded?.sub) {
            return next(throwError("UNAUTHORIZED"));
        }

        req.headers["x-user-id"] = decoded.sub;
        req.headers["x-user-roles"] = decoded.scope || "";

        next();
    });
};
