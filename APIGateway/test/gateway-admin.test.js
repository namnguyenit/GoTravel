import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import jwt from 'jsonwebtoken';

let upstream;
let gateway;
let baseUrl;
let adminToken;
let userToken;
let filePath;
let tempDir;

const listen = (server) => new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});
const close = (server) => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
});
const auth = (token) => ({ authorization: `Bearer ${token}` });

before(async () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const sign = (userId, role) => jwt.sign({ scope: role }, privateKey, {
        algorithm: 'RS256', keyid: 'gateway-admin-test', subject: userId,
        issuer: 'com.gotravel.identity', audience: 'gotravel-api', expiresIn: '8h'
    });
    adminToken = sign('test-admin', 'ROLE_ADMIN');
    userToken = sign('test-user', 'ROLE_USER');
    upstream = createServer((req, res) => {
        res.setHeader('content-type', 'application/json');
        if (req.url === '/.well-known/jwks.json') {
            res.end(JSON.stringify({ keys: [{ ...publicKey.export({ format: 'jwk' }),
                kid: 'gateway-admin-test', alg: 'RS256', use: 'sig' }] }));
            return;
        }
        if (req.url === '/api/auth/login') {
            res.end(JSON.stringify({ data: { token: adminToken } }));
            return;
        }
        if (/^\/api\/users\/internal\/test-(admin|user)\/status$/.test(req.url)) {
            res.end(JSON.stringify({ data: { isAllowed: true } }));
            return;
        }
        res.end(JSON.stringify({ method: req.method, path: req.url, headers: req.headers }));
    });
    const port = await listen(upstream);
    const target = `http://127.0.0.1:${port}`;
    for (const name of [
        'IDENTITY_SERVICE_URL', 'MEDIA_SERVICE_URL', 'CATALOG_SERVICE_URL',
        'BOOKING_SERVICE_URL', 'CART_SERVICE_URL', 'PAYMENT_SERVICE_URL',
        'SEARCH_SERVICE_URL', 'CAR_SERVICE_URL', 'TICKET_SERVICE_URL'
    ]) process.env[name] = target;
    process.env.INTERNAL_SERVICE_TOKEN = 'gateway-admin-test-service-token';
    process.env.CSRF_SECRET = 'gateway-admin-test-csrf-secret-with-enough-bytes';
    tempDir = mkdtempSync(join(tmpdir(), 'gateway-admin-test-'));
    filePath = join(tempDir, 'routes.json');
    process.env.GATEWAY_ROUTES_FILE = filePath;
    const { default: app } = await import('../src/app.js');
    gateway = createServer(app);
    baseUrl = `http://127.0.0.1:${await listen(gateway)}`;
});

after(async () => {
    if (gateway) await close(gateway);
    if (upstream) await close(upstream);
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
});

const route = () => ({
    id: randomUUID(), name: 'GoTicket reservations', method: 'GET',
    sourcePath: '/api/v1/tickets/reservations/:id',
    upstreamPath: '/api/v1/ticket-orders/:id',
    serviceKey: 'ticket', enabled: true
});

const save = (version, routes, token = adminToken) => fetch(`${baseUrl}/api/v1/gateway-admin/routes`, {
    method: 'PUT', headers: { ...auth(token), 'content-type': 'application/json' },
    body: JSON.stringify({ version, routes })
});

test('gateway admin endpoints enforce JWT and ADMIN role', async () => {
    const anonymous = await fetch(`${baseUrl}/api/v1/gateway-admin/overview`);
    const user = await fetch(`${baseUrl}/api/v1/gateway-admin/overview`, { headers: auth(userToken) });
    const admin = await fetch(`${baseUrl}/api/v1/gateway-admin/overview`, { headers: auth(adminToken) });
    assert.equal(anonymous.status, 401);
    assert.equal(user.status, 403);
    assert.equal(admin.status, 200);
    const data = (await admin.json()).data;
    assert.equal(data.version, 0);
    assert.ok(data.services.some((service) => service.key === 'ticket' && service.state === 'reachable'));
    assert.ok(data.staticRoutes.length > 0);
    const cookieWrite = await fetch(`${baseUrl}/api/v1/gateway-admin/routes`, {
        method: 'PUT', headers: {
            cookie: `access_token=${adminToken}`,
            origin: 'http://localhost:3000',
            'content-type': 'application/json'
        }, body: JSON.stringify({ version: 0, routes: [] })
    });
    assert.equal(cookieWrite.status, 403);
});

test('gateway console is served from Gateway with a restrictive content policy', async () => {
    const page = await fetch(`${baseUrl}/admin/gateway`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
    assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.match(await page.text(), /Gateway Console/);
    const app = await fetch(`${baseUrl}/admin/gateway/app.js`);
    assert.equal(app.status, 200);
    assert.match(await app.text(), /api\/v1\/gateway-admin\/overview/);
});

test('console login uses HttpOnly session and cookie writes require CSRF', async () => {
    const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST', headers: { origin: baseUrl, 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'test' })
    });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).data.token, undefined);
    const setCookies = login.headers.getSetCookie();
    assert.ok(setCookies.some((value) => value.startsWith('access_token=') && value.includes('HttpOnly')));
    assert.ok(setCookies.some((value) => value.startsWith('csrf_token=')));
    const cookieHeader = setCookies.map((value) => value.split(';')[0]).join('; ');
    const overview = await fetch(`${baseUrl}/api/v1/gateway-admin/overview`, {
        headers: { cookie: cookieHeader }
    });
    assert.equal(overview.status, 200);
    const blockedWrite = await fetch(`${baseUrl}/api/v1/gateway-admin/routes`, {
        method: 'PUT', headers: { origin: baseUrl, cookie: cookieHeader, 'content-type': 'application/json' },
        body: JSON.stringify({ version: 0, routes: [] })
    });
    assert.equal(blockedWrite.status, 403);
});

test('route save validates target, namespace, role and conflicting versions', async () => {
    const valid = route();
    assert.equal((await save(0, [valid], userToken)).status, 403);
    assert.equal((await save(0, [{ ...valid, sourcePath: '/api/v1/internal/fake' }])).status, 400);
    assert.equal((await save(0, [{ ...valid, upstreamPath: '/api/v1/internal/orders/:id' }])).status, 400);
    assert.equal((await save(0, [{ ...valid, sourcePath: '/api/v1/catalog/host/fake' }])).status, 400);
    assert.equal((await save(0, [{ ...valid, serviceKey: 'unknown-service' }])).status, 400);
    assert.equal((await save(0, [{ ...valid, auth: false }])).status, 400);
    assert.equal((await save(0, [valid, { ...route(), sourcePath: '/api/v1/tickets/reservations/fixed' }])).status, 400);
    const saved = await save(0, [valid]);
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).data.version, 1);
    assert.equal((await save(0, [])).status, 409);
    assert.equal(JSON.parse(readFileSync(filePath, 'utf8')).routes[0].id, valid.id);
});

test('saved routes activate immediately, require JWT and persist across registry reload', async () => {
    const anonymous = await fetch(`${baseUrl}/api/v1/tickets/reservations/abc`);
    assert.equal(anonymous.status, 401);
    const response = await fetch(`${baseUrl}/api/v1/tickets/reservations/abc?page=2`, {
        headers: { ...auth(userToken), 'x-internal-service-token': 'forged', 'x-user-id': 'forged' }
    });
    assert.equal(response.status, 200);
    const upstreamRequest = await response.json();
    assert.equal(upstreamRequest.path, '/api/v1/ticket-orders/abc?page=2');
    assert.equal(upstreamRequest.headers['x-internal-service-token'], undefined);
    assert.equal(upstreamRequest.headers['x-user-id'], 'test-user');

    const { createRouteRegistry } = await import('../src/gateway/route-registry.js');
    const { configuredRoutes } = await import('../src/gateway/proxy.routes.js');
    const reloaded = createRouteRegistry({ filePath, staticRoutes: configuredRoutes });
    assert.equal(reloaded.match('GET', '/api/v1/tickets/reservations/abc').destination,
        '/api/v1/ticket-orders/abc');
    const disabled = { ...reloaded.snapshot().routes[0], enabled: false };
    assert.equal((await save(1, [disabled])).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/v1/tickets/reservations/abc`, { headers: auth(userToken) })).status, 404);
});
