import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const orderId = '76352086-593f-4bd9-9f75-a3566c341843';
const paymentId = 'eece0b16-4753-4ec6-a4e5-3925c10f799e';
const otherPaymentId = 'a1c1f855-0684-44be-9559-acce51250838';
const orderItems = [
  { itemId: 'stay', listingTitle: 'Phòng nghỉ Đà Lạt', quantity: 1, unitPrice: 100000, totalPrice: 100000,
    startDate: '2026-10-10', endDate: '2026-10-11' },
  { itemId: 'experience', listingTitle: 'Trải nghiệm làm gốm', quantity: 2, unitPrice: 10000, totalPrice: 20000,
    startDate: '2026-10-11', endDate: '2026-10-11', timeSlot: '09:00 - 10:00' },
];

async function freePort() {
  const server = http.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  server.close();
  await once(server, 'close');
  return port;
}

test('checkout handoff requires GoStay origin, owned order and matching login cookie', async () => {
  let mockCalls = 0;
  const gateway = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url.startsWith('/api/v1/payments/vnpay/ipn?')) {
      res.setHeader('content-type', 'application/json'); return res.end('{"RspCode":"97","Message":"Invalid signature"}');
    }
    const authenticated = req.headers.cookie?.includes('access_token=good');
    res.setHeader('content-type', 'application/json');
    if (!authenticated) { res.statusCode = 401; return res.end('{}'); }
    if (req.url === '/api/v1/auth/session') return res.end('{"data":{"userId":"owner"}}');
    if (req.url === '/api/v1/orders/' + orderId) {
      return res.end(JSON.stringify({ data: { orderId, status: mockCalls ? 'CONFIRMED' : 'PAYMENT_PENDING', totalAmount: 120000,
        orderNumber: 'GO-20261006-2ITEMS', currency: 'VND', createdAt: '2026-10-06T10:00:00',
        customerInfo: { fullName: 'Khách kiểm thử', email: 'test@example.invalid', phone: '0900000000' }, items: orderItems } }));
    }
    if (req.method === 'GET' && req.url === '/api/v1/payments/' + paymentId) {
      return res.end(JSON.stringify({ data: { paymentId, orderId, status: 'PENDING' } }));
    }
    if (req.method === 'GET' && req.url === '/api/v1/payments/' + otherPaymentId) {
      return res.end(JSON.stringify({ data: { paymentId: otherPaymentId, orderId: otherPaymentId, status: 'PENDING' } }));
    }
    if (req.method === 'POST' && req.url === '/api/v1/payments/' + paymentId + '/mock-pay') {
      assert.equal(req.headers['x-payment-session'], undefined);
      mockCalls += 1;
      return res.end('{"message":"Thanh toán mô phỏng thành công"}');
    }
    res.statusCode = 404;
    res.end('{}');
  });
  gateway.listen(0, '127.0.0.1');
  await once(gateway, 'listening');
  const port = await freePort();
  const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PAYMENT_PORTAL_HOST: '127.0.0.1', PAYMENT_PORTAL_PORT: String(port),
      PAYMENT_GATEWAY_URL: 'http://127.0.0.1:' + gateway.address().port },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await Promise.race([
      once(child.stdout, 'data'),
      once(child, 'exit').then(() => { throw new Error('Portal exited early'); }),
    ]);
    const base = 'http://127.0.0.1:' + port;
    const missingPage = await fetch(base);
    assert.equal(missingPage.status, 200);
    assert.match(await missingPage.text(), /GoPay/);
    const missingRoute = await fetch(base + '/missing');
    assert.equal(missingRoute.status, 404);
    assert.match(await missingRoute.text(), /Trang này không tồn tại/);
    assert.equal((await fetch(base + '/pay?orderId=' + orderId, { headers: { cookie: 'access_token=good' } })).status, 404);
    const launch = (origin, cookie, id = orderId) => fetch(base + '/launch', {
      method: 'POST', headers: { origin, cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ orderId: id }),
    });
    assert.equal((await launch('https://evil.example', 'access_token=good')).status, 403);
    assert.equal((await launch('https://gostay.nonnet123.io.vn', '')).status, 401);
    assert.equal((await launch('https://gostay.nonnet123.io.vn', 'access_token=good', 'a1111111-1111-4111-8111-111111111111')).status, 404);
    const response = await launch('https://gostay.nonnet123.io.vn', 'access_token=good');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://gostay.nonnet123.io.vn');
    const { url } = await response.json();
    assert.match(url, /^\/pay\?session=[a-f0-9]{64}$/);
    assert.equal((await fetch(base + url)).status, 404);
    assert.equal((await fetch(base + url, { headers: { cookie: 'access_token=other' } })).status, 404);
    assert.equal((await fetch(base + url, { headers: { cookie: 'access_token=good' } })).status, 200);
    const ticket = new URL(url, base).searchParams.get('session');
    const sessionResponse = await fetch(base + '/session?ticket=' + ticket, { headers: { cookie: 'access_token=good' } });
    assert.equal(sessionResponse.status, 200);
    assert.equal((await sessionResponse.json()).orderId, orderId);
    const newDomainLaunch = await launch('https://gotravel.trungcaodev.io.vn', 'access_token=good');
    assert.equal(newDomainLaunch.status, 200);
    const newDomainUrl = (await newDomainLaunch.json()).url;
    const newTicket = new URL(newDomainUrl, base).searchParams.get('session');
    const newSession = await fetch(base + '/session?ticket=' + newTicket, { headers: { cookie: 'access_token=good' } });
    assert.equal((await newSession.json()).gostayOrigin, 'https://gotravel.trungcaodev.io.vn');
    const fullOrderResponse = await fetch(base + '/api/v1/orders/' + orderId, { headers: { cookie: 'access_token=good' } });
    assert.equal(fullOrderResponse.status, 200);
    const fullOrder = (await fullOrderResponse.json()).data;
    assert.deepEqual(fullOrder.items, orderItems);
    assert.equal(fullOrder.customerInfo.fullName, 'Khách kiểm thử');
    assert.equal((await fetch(base + '/api/v1/orders/' + orderId)).status, 401);
    const mock = (id, suppliedTicket) => fetch(base + '/api/v1/payments/' + id + '/mock-pay', {
      method: 'POST',
      headers: { cookie: 'access_token=good', 'x-payment-session': suppliedTicket, 'content-type': 'application/json' },
      body: '{}',
    });
    assert.equal((await mock(paymentId, 'invalid')).status, 404);
    assert.equal((await mock(otherPaymentId, ticket)).status, 404);
    assert.equal((await mock(paymentId, ticket)).status, 404);
    assert.equal(mockCalls, 0);
    const page = await (await fetch(base + url, { headers: { cookie: 'access_token=good' } })).text();
    assert.match(page, /Thanh toán qua VNPAY/);
    assert.doesNotMatch(page, /Thanh toán mô phỏng|qr.sepay.vn|Ngân hàng, thẻ hoặc mã QR|payment-instructions|provider-logo.*<b>/);
    assert.match(page, /id="order-items"/);
    assert.match(page, /src="\/brand\/vnpay-logo.svg"/);
    const securedPage = await fetch(base + url, { headers: { cookie: 'access_token=good' } });
    assert.match(securedPage.headers.get('content-security-policy'), /img-src 'self' data: https:\/\/res.cloudinary.com;/);
    assert.doesNotMatch(securedPage.headers.get('content-security-policy'), /unsafe-inline|unsafe-eval/);
    const logo = await fetch(base + '/brand/vnpay-logo.svg');
    assert.equal(logo.status, 200);
    assert.match(logo.headers.get('content-type'), /image\/svg\+xml/);
    const callbackPage = await fetch(base + '/vnpay/return?vnp_TxnRef=unknown');
    assert.equal(callbackPage.status, 200);
    assert.match(await callbackPage.text(), /vnpay-return.js/);
    const ipn = await fetch(base + '/api/v1/payments/vnpay/ipn?vnp_TxnRef=unknown');
    assert.equal(ipn.status, 200);
    assert.equal((await ipn.json()).RspCode, '97');
    assert.equal((await fetch(base + '/api/v1/payments/vnpay/ipn', { method: 'POST' })).status, 404);
    const order = await fetch(base + '/api/v1/orders/' + orderId, { headers: { cookie: 'access_token=good' } });
    assert.equal(order.status, 200);
    assert.equal((await order.json()).data.status, 'PAYMENT_PENDING');
  } finally {
    child.kill();
    gateway.close();
    await once(gateway, 'close');
  }
});
