import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { generateKeyPairSync } from 'node:crypto';
import { after, before, test } from 'node:test';
import jwt from 'jsonwebtoken';

let upstream;
let gateway;
let baseUrl;
let upstreamCalls;
let accessToken;

const listen = (server) => new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});
const close = (server) => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
});

before(async () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    accessToken = jwt.sign({ scope: 'ROLE_USER' }, privateKey, {
        algorithm: 'RS256', keyid: 'test-key', subject: 'test-user',
        issuer: 'com.gotravel.identity', audience: 'gotravel-api', expiresIn: '8h'
    });
    upstreamCalls = 0;
    upstream = createServer((req, res) => {
        upstreamCalls += 1;
        res.setHeader('content-type', 'application/json');
        if (req.url === '/.well-known/jwks.json') {
            const key = publicKey.export({ format: 'jwk' });
            res.end(JSON.stringify({ keys: [{ ...key, kid: 'test-key', alg: 'RS256', use: 'sig' }] }));
            return;
        }
        if (req.url === '/api/users/internal/test-user/status') {
            res.end(JSON.stringify({ data: { isAllowed: true } }));
            return;
        }
        if (req.url === '/api/auth/login') {
            res.end(JSON.stringify({ success: true, data: { token: accessToken } }));
            return;
        }
        res.end(JSON.stringify({ method: req.method, path: req.url, headers: req.headers }));
    });
    const upstreamPort = await listen(upstream);
    const target = `http://127.0.0.1:${upstreamPort}`;
    for (const name of [
        'IDENTITY_SERVICE_URL', 'MEDIA_SERVICE_URL', 'CATALOG_SERVICE_URL',
        'BOOKING_SERVICE_URL', 'CART_SERVICE_URL', 'PAYMENT_SERVICE_URL',
        'SEARCH_SERVICE_URL', 'CAR_SERVICE_URL'
    ]) process.env[name] = target;
    process.env.CSRF_SECRET = 'test-secret-that-is-at-least-thirty-two-bytes-long';
    process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';

    const { default: app } = await import('../src/app.js');
    gateway = createServer(app);
    const gatewayPort = await listen(gateway);
    baseUrl = `http://127.0.0.1:${gatewayPort}`;
});

after(async () => {
    if (gateway) await close(gateway);
    if (upstream) await close(upstream);
});

test('public recommendations allow only declared endpoint and method', async () => {
    const allowed = await fetch(`${baseUrl}/api/v1/recommendations/home/feed?page=2`);
    assert.equal(allowed.status, 200);
    assert.equal((await allowed.json()).path, '/api/v1/recommendations/home/feed?page=2');

    const callsBefore = upstreamCalls;
    const undeclared = await fetch(`${baseUrl}/api/v1/recommendations/future-endpoint`);
    const wrongMethod = await fetch(`${baseUrl}/api/v1/recommendations/home/feed`, { method: 'POST' });
    const anonymousEvent = await fetch(`${baseUrl}/api/v1/recommendations/events`, { method: 'POST' });
    assert.equal(undeclared.status, 404);
    assert.equal(wrongMethod.status, 404);
    assert.equal(anonymousEvent.status, 401);
    assert.equal(upstreamCalls, callsBefore);
});

test('internal email is not reachable and client identity headers are removed', async () => {
    const callsBefore = upstreamCalls;
    const email = await fetch(`${baseUrl}/api/v1/communications/email/ticket`, { method: 'POST' });
    assert.equal(email.status, 404);
    assert.equal(upstreamCalls, callsBefore);

    const response = await fetch(`${baseUrl}/api/v1/search/listings`, {
        headers: {
            'x-internal-service-token': 'forged',
            'x-internal-token': 'forged',
            'x-user-id': 'forged',
            'x-user-roles': 'ADMIN'
        }
    });
    assert.equal(response.status, 200);
    const { headers } = await response.json();
    for (const name of ['x-internal-service-token', 'x-internal-token', 'x-user-id', 'x-user-roles']) {
        assert.equal(headers[name], undefined);
    }
});

test('payment webhook and catalog listings reject extra public methods', async () => {
    const webhook = await fetch(`${baseUrl}/api/v1/public/payments/sepay-webhook`, { method: 'POST' });
    const invalidWebhook = await fetch(`${baseUrl}/api/v1/public/payments/sepay-webhook`);
    const invalidCatalog = await fetch(`${baseUrl}/api/v1/catalog/listings/12345678-1234-1234-1234-123456789abc`, { method: 'DELETE' });
    assert.equal(webhook.status, 200);
    assert.equal(invalidWebhook.status, 404);
    assert.equal(invalidCatalog.status, 404);
});

test('browser session hides JWT and requires session-bound CSRF on writes', async () => {
    const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'test', password: 'test' })
    });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).data.token, undefined);
    const setCookies = login.headers.getSetCookie();
    const accessCookie = setCookies.find((cookie) => cookie.startsWith('access_token='));
    const csrfCookie = setCookies.find((cookie) => cookie.startsWith('csrf_token='));
    assert.match(accessCookie, /HttpOnly/i);
    assert.match(accessCookie, /SameSite=Lax/i);
    assert.doesNotMatch(csrfCookie, /HttpOnly/i);
    const cookie = `${accessCookie.split(';')[0]}; ${csrfCookie.split(';')[0]}`;
    const csrf = csrfCookie.split(';')[0].split('=')[1];

    const session = await fetch(`${baseUrl}/api/v1/auth/session`, { headers: { cookie } });
    assert.equal(session.status, 200);
    assert.deepEqual((await session.json()).data.roles, ['ROLE_USER']);

    const blocked = await fetch(`${baseUrl}/api/v1/me`, {
        method: 'PUT', headers: { cookie, origin: 'http://localhost:3000' }
    });
    assert.equal(blocked.status, 403);
    const forgedOrigin = await fetch(`${baseUrl}/api/v1/me`, {
        method: 'PUT', headers: { cookie, origin: 'https://evil.example', 'x-csrf-token': csrf }
    });
    assert.equal(forgedOrigin.status, 403);

    const allowed = await fetch(`${baseUrl}/api/v1/me`, {
        method: 'PUT', headers: {
            cookie, origin: 'http://localhost:3000', 'x-csrf-token': csrf,
            'x-internal-anything': 'forged', 'x-user-roles': 'ROLE_ADMIN'
        }
    });
    assert.equal(allowed.status, 200);
    const upstreamRequest = await allowed.json();
    assert.equal(upstreamRequest.headers.cookie, undefined);
    assert.equal(upstreamRequest.headers['x-csrf-token'], undefined);
    assert.equal(upstreamRequest.headers['x-internal-anything'], undefined);
    assert.equal(upstreamRequest.headers['x-user-roles'], 'ROLE_USER');
    assert.equal(upstreamRequest.headers.authorization, `Bearer ${accessToken}`);

    const logout = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST', headers: { cookie, origin: 'http://localhost:3000', 'x-csrf-token': csrf }
    });
    assert.equal(logout.status, 200);
    assert.ok(logout.headers.getSetCookie().some((value) => value.startsWith('access_token=;')));
});

test('login, registration and recovery have effective per-IP limits', async () => {
    const cases = [
        ['/api/v1/auth/login', 10],
        ['/api/v1/auth/register', 5],
        ['/api/v1/auth/forgot-password', 5],
        ['/api/v1/auth/reset-password', 10]
    ];
    for (const [path, limit] of cases) {
        for (let count = 0; count < limit - (path.endsWith('/login') ? 1 : 0); count += 1) {
            const response = await fetch(`${baseUrl}${path}`, { method: 'POST' });
            assert.equal(response.status, 200, `${path} request ${count + 1}`);
        }
        const blocked = await fetch(`${baseUrl}${path}`, { method: 'POST' });
        assert.equal(blocked.status, 429, path);
    }
});
