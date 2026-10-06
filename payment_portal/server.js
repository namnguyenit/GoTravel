import http from 'node:http';
import https from 'node:https';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PAYMENT_PORTAL_PORT || 3336);
const host = process.env.PAYMENT_PORTAL_HOST || '0.0.0.0';
const gateway = new URL(process.env.PAYMENT_GATEWAY_URL || 'http://127.0.0.1:5555');
const gostay = new URL(process.env.GOSTAY_BASE_URL || 'https://gotravel.trungcaodev.io.vn');
const allowedLaunchOrigins = new Set([gostay.origin, 'https://gotrvel.trungcaodev.io.vn', 'https://gotravel.trungcaodev.io.vn', 'https://gostay.nonnet123.io.vn', 'http://localhost:3000', 'http://127.0.0.1:3000']);
const sessions = new Map();
const sessionLifetimeMs = 30 * 60 * 1000;

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PAYMENT_PORTAL_PORT');
if (!['http:', 'https:'].includes(gateway.protocol)) throw new Error('Invalid PAYMENT_GATEWAY_URL');
if (!['http:', 'https:'].includes(gostay.protocol)) throw new Error('Invalid GOSTAY_BASE_URL');

const pages = new Map([
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/vnpay-return.js', ['vnpay-return.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/favicon.ico', ['favicon.ico', 'image/png']],
  ['/gopay-mark.svg', ['gopay-mark.svg', 'image/svg+xml']],
  ['/brand/gopay-symbol.svg', ['brand/gopay-symbol.svg', 'image/svg+xml']],
  ['/brand/gopay-icon.svg', ['brand/gopay-icon.svg', 'image/svg+xml']],
  ['/brand/gopay-icon-32.png', ['brand/gopay-icon-32.png', 'image/png']],
  ['/brand/gopay-icon-180.png', ['brand/gopay-icon-180.png', 'image/png']],
  ['/brand/vnpay-logo.svg', ['brand/vnpay-logo.svg', 'image/svg+xml']],
  ['/fonts/outfit-500.ttf', ['fonts/outfit-500.ttf', 'font/ttf']],
  ['/fonts/outfit-800.ttf', ['fonts/outfit-800.ttf', 'font/ttf']],
]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const apiRoutes = [
  ['GET', /^\/api\/v1\/auth\/session$/],
  ['GET', /^\/api\/v1\/orders\/[0-9a-f-]{36}$/i],
  ['GET', /^\/api\/v1\/payments\/order\/[0-9a-f-]{36}$/i],
  ['GET', /^\/api\/v1\/payments\/[0-9a-f-]{36}$/i],
  ['POST', /^\/api\/v1\/payments\/create$/],
];
const vnpayCallback = /^\/api\/v1\/payments\/vnpay\/(ipn|return)$/;

function sendJson(res, status, body, extra = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra });
  res.end(JSON.stringify(body));
}

function accessToken(req) {
  const match = (req.headers.cookie || '').match(/(?:^|;\s*)access_token=([^;]+)/);
  return match ? match[1] : '';
}

function sessionFor(req, ticket) {
  if (typeof ticket !== 'string' || !/^[a-f0-9]{64}$/.test(ticket)) return null;
  const session = sessions.get(ticket);
  const token = accessToken(req);
  if (!session || !token) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(ticket);
    return null;
  }
  const digest = createHash('sha256').update(token).digest();
  return timingSafeEqual(digest, session.tokenDigest) ? session : null;
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 4096) throw new Error('Payload too large');
  }
  return JSON.parse(body);
}

async function gatewayGet(path, cookie) {
  const response = await fetch(new URL(path, gateway), {
    headers: { cookie },
    signal: AbortSignal.timeout(10000),
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, data: payload?.data?.data ?? payload?.data ?? payload };
}

function proxyApi(req, res) {
  const incoming = new URL(req.url, 'http://localhost');
  const target = new URL(`${incoming.pathname}${incoming.search}`, gateway);
  const headers = { ...req.headers, host: gateway.host };
  for (const name of ['connection', 'proxy-connection', 'forwarded', 'x-payment-session']) delete headers[name];
  for (const name of Object.keys(headers)) if (name.startsWith('x-forwarded-')) delete headers[name];
  const fromLocalProxy = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  const cfIp = fromLocalProxy ? req.headers['cf-connecting-ip'] : undefined;
  headers['x-forwarded-for'] = typeof cfIp === 'string' && /^[0-9a-fA-F:.]{3,45}$/.test(cfIp) ? cfIp : req.socket.remoteAddress;
  const upstream = (gateway.protocol === 'https:' ? https : http).request(target, {
    method: req.method,
    headers,
    timeout: 20000,
  }, (response) => {
    const responseHeaders = { ...response.headers, 'cache-control': 'no-store' };
    delete responseHeaders.connection;
    res.writeHead(response.statusCode || 502, responseHeaders);
    response.pipe(res);
  });
  upstream.on('timeout', () => upstream.destroy(new Error('Gateway timeout')));
  upstream.on('error', () => {
    if (!res.headersSent) sendJson(res, 502, { success: false, message: 'Không thể kết nối cổng thanh toán.' });
    else res.destroy();
  });
  req.pipe(upstream);
}

async function serveFile(req, res, filename, contentType, status = 200) {
  try {
    let body = await readFile(join(root, 'public', filename));
    if (['not-found.html', 'home.html'].includes(filename) && String(req.headers.host || '').split(':')[0].toLowerCase() === 'pay.trungcaodev.io.vn') {
      body = Buffer.from(body.toString().replaceAll('https://gostay.nonnet123.io.vn', 'https://gotravel.trungcaodev.io.vn'));
    }
    res.writeHead(status, {
      'content-type': contentType,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data: https://res.cloudinary.com; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'",
    });
    if (req.method === 'HEAD') res.end();
    else res.end(body);
  } catch { sendJson(res, 500, { message: 'Page unavailable' }); }
}

const server = http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); }
  catch { return sendJson(res, 400, { message: 'Invalid URL' }); }
  const pathname = url.pathname;

  if (pathname === '/launch') {
    const origin = req.headers.origin;
    if (!allowedLaunchOrigins.has(origin)) return sendJson(res, 403, { message: 'Nguồn truy cập không hợp lệ.' });
    const cors = {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      vary: 'Origin',
    };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    if (req.method !== 'POST') return sendJson(res, 405, { message: 'Method not allowed' }, cors);
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return sendJson(res, 415, { message: 'Content type không hợp lệ.' }, cors);
    let input;
    try { input = await readJson(req); }
    catch { return sendJson(res, 400, { message: 'Yêu cầu không hợp lệ.' }, cors); }
    if (!uuid.test(input?.orderId || '')) return sendJson(res, 400, { message: 'Mã đơn không hợp lệ.' }, cors);
    const token = accessToken(req);
    if (!token) return sendJson(res, 401, { message: 'Bạn cần đăng nhập GoID trước khi thanh toán.' }, cors);
    try {
      const identity = await gatewayGet('/api/v1/auth/session', req.headers.cookie);
      if (identity.status !== 200) return sendJson(res, 401, { message: 'Phiên đăng nhập đã hết hạn.' }, cors);
      const orderResult = await gatewayGet(`/api/v1/orders/${input.orderId}`, req.headers.cookie);
      if (orderResult.status !== 200 || orderResult.data?.orderId !== input.orderId) {
        return sendJson(res, 404, { message: 'Không tìm thấy đơn hàng của bạn.' }, cors);
      }
      const ticket = randomBytes(32).toString('hex');
      sessions.set(ticket, {
        orderId: input.orderId,
        gostayOrigin: origin,
        amount: orderResult.data.totalAmount,
        tokenDigest: createHash('sha256').update(token).digest(),
        expiresAt: Date.now() + sessionLifetimeMs,
      });
      for (const [key, value] of sessions) if (value.expiresAt <= Date.now()) sessions.delete(key);
      return sendJson(res, 200, { url: `/pay?session=${ticket}` }, cors);
    } catch { return sendJson(res, 502, { message: 'Chưa kết nối được GoTravel. Vui lòng thử lại.' }, cors); }
  }

  if (pathname === '/session') {
    if (req.method !== 'GET') return sendJson(res, 405, { message: 'Method not allowed' });
    const session = sessionFor(req, url.searchParams.get('ticket'));
    if (!session) return sendJson(res, 404, { message: 'Phiên thanh toán không tồn tại hoặc đã hết hạn.' });
    return sendJson(res, 200, { orderId: session.orderId, amount: session.amount, gostayOrigin: session.gostayOrigin });
  }

  if (pathname.startsWith('/api/')) {
    if (req.method === 'GET' && vnpayCallback.test(pathname)) return proxyApi(req, res);
    if (!apiRoutes.some(([method, pattern]) => req.method === method && pattern.test(pathname))) {
      return sendJson(res, 404, { message: 'API route not found' });
    }
    return proxyApi(req, res);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { message: 'Method not allowed' });
  if (pathname === '/health') return sendJson(res, 200, { service: 'payment-portal', status: 'ok' });
  if (pathname === '/') return serveFile(req, res, 'home.html', 'text/html; charset=utf-8');
  if (pathname === '/vnpay/return') return serveFile(req, res, 'vnpay-return.html', 'text/html; charset=utf-8');
  if (pathname === '/pay') {
    if (!sessionFor(req, url.searchParams.get('session'))) return serveFile(req, res, 'not-found.html', 'text/html; charset=utf-8', 404);
    return serveFile(req, res, 'index.html', 'text/html; charset=utf-8');
  }
  const page = pages.get(pathname);
  if (page) return serveFile(req, res, page[0], page[1]);
  return serveFile(req, res, 'not-found.html', 'text/html; charset=utf-8', 404);
});

server.listen(port, host, () => console.log(`Payment portal listening on ${host}:${port}`));
