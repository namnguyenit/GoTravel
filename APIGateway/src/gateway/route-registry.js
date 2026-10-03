import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { userInfo } from 'node:os';

export const serviceDefinitions = [
    { key: 'identity', name: 'Identity', env: 'IDENTITY_SERVICE_URL', fallback: 'http://localhost:8080' },
    { key: 'media', name: 'Media', env: 'MEDIA_SERVICE_URL', fallback: 'http://localhost:5001' },
    { key: 'catalog', name: 'Catalog & Listing', env: 'CATALOG_SERVICE_URL', fallback: 'http://localhost:8082' },
    { key: 'booking', name: 'Booking & Inventory', env: 'BOOKING_SERVICE_URL', fallback: 'http://localhost:8083' },
    { key: 'cart', name: 'Cart & Order', env: 'CART_SERVICE_URL', fallback: 'http://localhost:8084' },
    { key: 'payment', name: 'Payment & Wallet', env: 'PAYMENT_SERVICE_URL', fallback: 'http://localhost:8085' },
    { key: 'search', name: 'Search & Recommendation', env: 'SEARCH_SERVICE_URL', fallback: 'http://localhost:8086' },
    { key: 'car', name: 'GoCar', env: 'CAR_SERVICE_URL', fallback: 'http://localhost:3333' },
    { key: 'ticket', name: 'GoTicket', env: 'TICKET_SERVICE_URL' },
];

export const getServiceTargets = () => serviceDefinitions.map(({ key, name, env, fallback }) => {
    const configured = process.env[env] || fallback;
    if (!configured) return { key, name, target: null };
    try {
        const url = new URL(configured);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
            url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid upstream URL');
        return { key, name, target: url.origin };
    } catch {
        return { key, name, target: null };
    }
});

const defaultFile = join(userInfo().homedir, '.local', 'share', 'gotravel-gateway', 'routes.json');
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LITERAL_PATTERN = /^[A-Za-z0-9._-]+$/;
const PARAM_PATTERN = /^:([A-Za-z][A-Za-z0-9_]*)$/;

export class RouteValidationError extends Error {
    constructor(message, status = 400, code = 'INVALID_GATEWAY_ROUTE') {
        super(message);
        this.status = status;
        this.code = code;
    }
}

const pathSegments = (value, field) => {
    if (typeof value !== 'string' || value.length < 2 || value.length > 180 ||
        !value.startsWith('/') || value.endsWith('/') || value.includes('//') ||
        /[?#%\s]/.test(value) || value.includes('\\')) {
        throw new RouteValidationError(`${field} phải là đường dẫn tuyệt đối, không chứa query, khoảng trắng hoặc ký tự mã hóa.`);
    }
    const segments = value.slice(1).split('/');
    if (segments.length > 12 || segments.some((segment) =>
        segment === '.' || segment === '..' ||
        (!LITERAL_PATTERN.test(segment) && !PARAM_PATTERN.test(segment)))) {
        throw new RouteValidationError(`${field} chứa đoạn đường dẫn không hợp lệ.`);
    }
    return segments;
};

const hasPrefix = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);

const normalizeRoute = (input, staticRoutes, targets, allowUnavailable = false) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new RouteValidationError('Route phải là một đối tượng.');
    }
    const allowedFields = new Set(['id', 'name', 'method', 'sourcePath', 'upstreamPath', 'serviceKey', 'enabled']);
    if (Object.keys(input).some((field) => !allowedFields.has(field))) {
        throw new RouteValidationError('Route chứa trường cấu hình không được hỗ trợ.');
    }
    const { id, name, method, sourcePath, upstreamPath, serviceKey, enabled } = input;
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) throw new RouteValidationError('ID route không hợp lệ.');
    if (typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 80) {
        throw new RouteValidationError('Tên route phải dài từ 3 đến 80 ký tự.');
    }
    if (!METHODS.has(method)) throw new RouteValidationError('HTTP method không được hỗ trợ.');
    if (typeof enabled !== 'boolean') throw new RouteValidationError('Trạng thái route không hợp lệ.');
    const service = targets.find((candidate) => candidate.key === serviceKey);
    if (!service) throw new RouteValidationError('Service đích không được hỗ trợ.');
    if (!allowUnavailable && enabled && !service.target) {
        throw new RouteValidationError('Service đích chưa được cấu hình URL hợp lệ.');
    }
    const sourceSegments = pathSegments(sourcePath, 'Đường dẫn Gateway');
    const targetSegments = pathSegments(upstreamPath, 'Đường dẫn service');
    if (sourceSegments[0] !== 'api' || sourceSegments[1] !== 'v1' || sourceSegments.length < 3) {
        throw new RouteValidationError('Đường dẫn Gateway phải bắt đầu bằng /api/v1/.');
    }
    if (sourceSegments.slice(0, 3).some((segment) => segment.startsWith(':')) ||
        targetSegments.slice(0, 3).some((segment) => segment.startsWith(':'))) {
        throw new RouteValidationError('Namespace ba đoạn đầu phải cố định, không dùng tham số.');
    }
    if (sourceSegments.some((segment) => segment.toLowerCase() === 'internal') ||
        targetSegments.some((segment) => segment.toLowerCase() === 'internal')) {
        throw new RouteValidationError('Không được công khai đường dẫn nội bộ qua Gateway.');
    }
    const reserved = ['/api/v1/auth', '/api/v1/gateway-admin', '/api/v1/internal',
        ...staticRoutes.map((route) => route.url)];
    if (reserved.some((prefix) => hasPrefix(sourcePath, prefix))) {
        throw new RouteValidationError('Đường dẫn Gateway trùng namespace của route hệ thống.');
    }
    const sourceParams = sourceSegments.filter((segment) => segment.startsWith(':')).map((segment) => segment.slice(1));
    const targetParams = targetSegments.filter((segment) => segment.startsWith(':')).map((segment) => segment.slice(1));
    if (new Set(sourceParams).size !== sourceParams.length ||
        targetParams.some((param) => !sourceParams.includes(param))) {
        throw new RouteValidationError('Tham số đường dẫn service phải có trong đường dẫn Gateway và không được lặp.');
    }
    return { id, name: name.trim(), method, sourcePath, upstreamPath, serviceKey, enabled };
};

const compile = (route) => {
    const names = [];
    const pattern = route.sourcePath.slice(1).split('/').map((segment) => {
        if (segment.startsWith(':')) {
            names.push(segment.slice(1));
            return '([^/]+)';
        }
        return segment.replaceAll('.', '\\.');
    }).join('/');
    return { ...route, pattern: new RegExp(`^/${pattern}$`), names };
};

const overlaps = (left, right) => {
    if (left.method !== right.method) return false;
    const first = left.sourcePath.split('/');
    const second = right.sourcePath.split('/');
    return first.length === second.length && first.every((segment, index) =>
        segment === second[index] || segment.startsWith(':') || second[index].startsWith(':'));
};

export const createRouteRegistry = ({ staticRoutes = [], filePath = process.env.GATEWAY_ROUTES_FILE || defaultFile } = {}) => {
    const location = resolve(filePath);
    const targets = getServiceTargets();
    const validateRoutes = (routes, allowUnavailable = false) => {
        if (!Array.isArray(routes) || routes.length > 100) {
            throw new RouteValidationError('Danh sách route phải có tối đa 100 mục.');
        }
        const normalized = routes.map((route) => normalizeRoute(route, staticRoutes, targets, allowUnavailable));
        const ids = new Set();
        for (const route of normalized) {
            if (ids.has(route.id)) {
                throw new RouteValidationError('ID route bị trùng.');
            }
            ids.add(route.id);
        }
        for (let index = 0; index < normalized.length; index += 1) {
            if (normalized.slice(index + 1).some((other) => overlaps(normalized[index], other))) {
                throw new RouteValidationError('Các route có cùng method và đường dẫn trùng hoặc chồng lấn.');
            }
        }
        return normalized;
    };

    let state = { version: 0, updatedAt: null, routes: [] };
    if (existsSync(location)) {
        const stored = JSON.parse(readFileSync(location, 'utf8'));
        if (!Number.isSafeInteger(stored.version) || stored.version < 0) {
            throw new RouteValidationError('Phiên bản dữ liệu route không hợp lệ.');
        }
        state = { version: stored.version, updatedAt: stored.updatedAt || null,
            routes: validateRoutes(stored.routes, true) };
    }
    let compiled = state.routes.map(compile);
    let queue = Promise.resolve();

    return {
        snapshot: () => ({ version: state.version, updatedAt: state.updatedAt,
            routes: state.routes.map((route) => ({ ...route })) }),
        match: (method, path) => {
            for (const route of compiled) {
                if (!route.enabled || route.method !== method) continue;
                const match = route.pattern.exec(path);
                if (!match) continue;
                const values = Object.fromEntries(route.names.map((name, index) => [name, match[index + 1]]));
                const destination = route.upstreamPath.replace(/:([A-Za-z][A-Za-z0-9_]*)/g,
                    (_, name) => encodeURIComponent(values[name]));
                return { serviceKey: route.serviceKey, destination };
            }
            return null;
        },
        replace: (expectedVersion, routes) => {
            const work = queue.then(async () => {
                if (expectedVersion !== state.version) {
                    throw new RouteValidationError('Cấu hình đã được thay đổi ở phiên khác. Hãy tải lại trước khi lưu.', 409, 'GATEWAY_ROUTE_CONFLICT');
                }
                const normalized = validateRoutes(routes);
                const next = { version: state.version + 1, updatedAt: new Date().toISOString(), routes: normalized };
                await mkdir(dirname(location), { recursive: true, mode: 0o700 });
                const temp = `${location}.${randomUUID()}.tmp`;
                try {
                    await writeFile(temp, `${JSON.stringify(next, null, 2)}\n`, { flag: 'wx', mode: 0o660 });
                    await rename(temp, location);
                } catch (error) {
                    await rm(temp, { force: true });
                    throw error;
                }
                state = next;
                compiled = normalized.map(compile);
                return { version: state.version, updatedAt: state.updatedAt,
                    routes: state.routes.map((route) => ({ ...route })) };
            });
            queue = work.catch(() => {});
            return work;
        },
    };
};
