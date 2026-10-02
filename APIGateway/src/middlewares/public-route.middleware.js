import { buildErrorResponse, GatewayError } from "../utils/response.helper.js";

export const allowPublicRequests = (allowedRequests) => {
    if (!Array.isArray(allowedRequests) || allowedRequests.length === 0) {
        throw new Error("Every public proxy route must declare its allowed methods and paths");
    }

    return (req, res, next) => {
        const path = req.originalUrl.split("?", 1)[0];
        const allowed = allowedRequests.some(({ method, path: expectedPath }) =>
            req.method === method &&
            (expectedPath instanceof RegExp ? expectedPath.test(path) : path === expectedPath)
        );

        if (!allowed) {
            return buildErrorResponse(res, GatewayError.ROUTE_NOT_FOUND);
        }

        next();
    };
};
