import { throwError } from "./throwError.js";

const ROLE = {
    INTERNAL: "INTERNAL_SERVICE",
    ADMIN: "ADMIN",
    ENTERPRISE: "ENTERPRISE",
    HOST: "HOST",
    VENDOR: "TICKET_VENDOR",
    USER: "USER",
};

const trimSlashes = (value) => String(value || "").replace(/^\/+|\/+$/g, "");

const sanitizeSegment = (segment) =>
    String(segment || "")
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-.]+|[-.]+$/g, "");

const normalizeUserId = (req) => sanitizeSegment(req.headers["x-user-id"]);

const getRoleSet = (req) => {
    const roles = String(req.headers["x-user-roles"] || "")
        .split(/\s+/)
        .map((role) => role.trim())
        .filter(Boolean);

    return new Set(roles.flatMap((role) => [role, role.replace(/^ROLE_/, "")]));
};

const hasRole = (req, role) => getRoleSet(req).has(role);

const sanitizeFolder = (folder) => {
    const normalized = trimSlashes(folder || "");
    if (!normalized) {
        return "";
    }

    const segments = normalized.split("/").filter(Boolean);
    const safeSegments = segments.map(sanitizeSegment).filter(Boolean);

    if (!safeSegments.length) {
        return "";
    }

    return safeSegments.join("/");
};

export const normalizePublicId = (publicId) => {
    const normalized = trimSlashes(publicId || "");
    if (
        !normalized ||
        normalized.includes("..") ||
        normalized.includes("\\") ||
        normalized.includes("://") ||
        normalized.split("/").some((segment) => !segment)
    ) {
        throw throwError("INVALID_PUBLIC_ID");
    }

    return normalized;
};

const withSuffix = (prefix, suffix) => {
    const safeSuffix = sanitizeFolder(suffix);
    return safeSuffix ? `${prefix}/${safeSuffix}` : prefix;
};

const buildScopedFolder = (scope, userId, requestedFolder) => {
    return withSuffix(`${scope}/${userId}`, requestedFolder);
};

export const buildMediaAccess = (req, actionType) => {
    const userId = normalizeUserId(req);
    const requestedFolder = req.body?.folder;

    if (!userId) {
        throw throwError("UNAUTHORIZED");
    }

    if (hasRole(req, ROLE.INTERNAL)) {
        return {
            folder: sanitizeFolder(requestedFolder) || "internal-uploads",
            deletePrefixes: ["internal-uploads/", "secImg/", "users/", "hosts/", "enterprises/", "admins/", "admin-uploads/", "avatar/", "reviews/", "listing/"],
            canDeletePrivate: true,
        };
    }

    if (hasRole(req, ROLE.ADMIN)) {
        return {
            folder: buildScopedFolder("admins", userId, requestedFolder || "uploads"),
            deletePrefixes: ["secImg/", "users/", "hosts/", "enterprises/", "admins/", "admin-uploads/", "avatar/", "reviews/", "listing/"],
            canDeletePrivate: true,
        };
    }

    if (hasRole(req, ROLE.ENTERPRISE)) {
        if (actionType === "single") {
            return {
                folder: buildScopedFolder("enterprises", userId, requestedFolder || "uploads"),
                deletePrefixes: [`enterprises/${userId}/`],
                canDeletePrivate: false,
            };
        }

        if (!requestedFolder && actionType !== "delete") {
            throw throwError("MISSING_FOLDER");
        }

        return {
            folder: buildScopedFolder("enterprises", userId, requestedFolder || "uploads"),
            deletePrefixes: [`enterprises/${userId}/`],
            canDeletePrivate: false,
        };
    }

    if (hasRole(req, ROLE.VENDOR)) {
        if (actionType === "secure") throw throwError("FORBIDDEN");
        return { folder: buildScopedFolder("transport", userId, requestedFolder),
            deletePrefixes: [`transport/${userId}/`], canDeletePrivate: false };
    }

    if (hasRole(req, ROLE.HOST)) {
        if (actionType === "single") {
            return {
                folder: buildScopedFolder("hosts", userId, requestedFolder || "uploads"),
                deletePrefixes: [`hosts/${userId}/`],
                canDeletePrivate: false,
            };
        }

        if (!requestedFolder && actionType !== "delete") {
            throw throwError("MISSING_FOLDER");
        }

        return {
            folder: buildScopedFolder("hosts", userId, requestedFolder || "uploads"),
            deletePrefixes: [`hosts/${userId}/`],
            canDeletePrivate: false,
        };
    }

    if (hasRole(req, ROLE.USER)) {
        if (actionType === "secure") {
            throw throwError("FORBIDDEN");
        }

        return {
            folder: actionType === "bulk" ? `users/${userId}/reviews` : `users/${userId}/avatar`,
            deletePrefixes: [`users/${userId}/`],
            canDeletePrivate: false,
        };
    }

    throw throwError("FORBIDDEN");
};

export const assertCanDeletePublicId = (req, publicId, deliveryType = "upload") => {
    const mediaAccess = req.mediaAccess || buildMediaAccess(req, "delete");
    const normalizedPublicId = normalizePublicId(publicId);
    const normalizedDeliveryType = String(deliveryType || "upload").trim();

    if (normalizedDeliveryType === "private" && !mediaAccess.canDeletePrivate) {
        throw throwError("MEDIA_OWNERSHIP_DENIED");
    }

    const allowed = mediaAccess.deletePrefixes.some((prefix) => normalizedPublicId.startsWith(prefix));
    if (!allowed) {
        throw throwError("MEDIA_OWNERSHIP_DENIED");
    }

    return normalizedPublicId;
};
