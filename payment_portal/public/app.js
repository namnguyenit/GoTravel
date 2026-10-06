const params = new URLSearchParams(window.location.search);
const ticket = params.get('session') || '';
let orderId = '';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const views = ['loading', 'error', 'payment', 'success', 'expired'];
const el = (id) => document.getElementById(id);
let paymentId = null;
let pollTimer = null;
let checking = false;
let simulationSubmitted = false;
let verifyingOrder = false;
let gostayOrigin = 'https://gostay.nonnet123.io.vn';

function show(view) {
  for (const name of views) el(`${name}-view`).hidden = name !== view;
}

function homeUrl() { return new URL('/', gostayOrigin).href; }
function orderUrl() {
  const url = new URL('/orders/completed', gostayOrigin);
  url.searchParams.set('orderId', orderId);
  return url.href;
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : 'Vui lòng thử lại sau.';
}

function fail(message, title = 'Không thể mở thanh toán') {
  stopPolling();
  el('error-title').textContent = title;
  el('error-message').textContent = message;
  show('error');
}

function readCookie(name) {
  const part = document.cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  if (!part) return '';
  try { return decodeURIComponent(part.slice(name.length + 1)); }
  catch { return ''; }
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.method && !['GET', 'HEAD'].includes(options.method)) {
    headers.set('content-type', 'application/json');
    const csrf = readCookie('csrf_token');
    if (csrf) headers.set('x-csrf-token', csrf);
  }
  const response = await fetch(`/api/v1${path}`, { ...options, credentials: 'include', headers, cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.message || `Yêu cầu thất bại (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return payload?.data?.data ?? payload?.data?.result ?? payload?.data ?? payload;
}

function renderPayment(payment) {
  paymentId = payment.paymentId;
  el('order-id').textContent = orderId;
  el('amount').textContent = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(payment.amount));
  el('bank-name').textContent = payment.bankName || '—';
  el('bank-account').textContent = payment.bankAccount || '—';
  el('payment-code').textContent = payment.paymentCode || '—';
  const qr = el('qr-image');
  try {
    const source = new URL(payment.qrUrl);
    if (source.protocol === 'https:' && source.hostname === 'qr.sepay.vn') {
      qr.src = source.href;
      el('qr-wrap').hidden = false;
    } else el('qr-wrap').hidden = true;
  } catch { el('qr-wrap').hidden = true; }
  show('payment');
}

async function verifySimulatedOrder() {
  if (verifyingOrder) return;
  verifyingOrder = true;
  try {
    const order = await api(`/orders/${encodeURIComponent(orderId)}`);
    if (['CONFIRMED', 'COMPLETED'].includes(String(order.status).toUpperCase())) {
      stopPolling();
      el('success-order').textContent = orderId;
      show('success');
    } else {
      el('simulation-note').textContent = 'Giao dịch đã hoàn tất, đang chờ GoStay xác nhận đơn hàng.';
    }
  } catch {
    el('simulation-note').textContent = 'Giao dịch đã hoàn tất nhưng chưa kiểm tra được đơn hàng. Vui lòng đợi trạng thái tự cập nhật.';
  } finally {
    verifyingOrder = false;
  }
}

function applyStatus(payment) {
  const status = String(payment.status || '').toUpperCase();
  if (status === 'COMPLETED' || status === 'PAID') {
    if (simulationSubmitted) {
      verifySimulatedOrder();
      return;
    }
    stopPolling();
    el('success-order').textContent = orderId;
    show('success');
    return;
  }
  if (['EXPIRED', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(status)) {
    stopPolling();
    el('expired-message').textContent = status === 'EXPIRED'
      ? 'Phiên thanh toán đã hết hạn. Vui lòng kiểm tra đơn trên GoStay trước khi thử lại.'
      : 'Giao dịch không còn ở trạng thái chờ thanh toán. Vui lòng kiểm tra đơn trên GoStay.';
    show('expired');
    return;
  }
  if (status !== 'PENDING') {
    fail('Trạng thái thanh toán chưa xác định. Vui lòng kiểm tra đơn trên GoStay.');
    return;
  }
  renderPayment(payment);
}

async function refresh() {
  if (!paymentId || checking) return;
  checking = true;
  el('refresh-button').disabled = true;
  try {
    applyStatus(await api(`/payments/${encodeURIComponent(paymentId)}`));
    el('update-note').textContent = 'Trạng thái vừa được cập nhật.';
  } catch (error) {
    el('update-note').textContent = `Chưa kiểm tra được trạng thái: ${errorMessage(error)}`;
  } finally {
    checking = false;
    el('refresh-button').disabled = false;
  }
}

async function start() {
  show('loading');
  try {
    const response = await fetch(`/session?ticket=${encodeURIComponent(ticket)}`, { credentials: 'include', cache: 'no-store' });
    if (!response.ok) throw new Error('Phiên thanh toán không tồn tại hoặc đã hết hạn. Hãy mở lại từ GoStay.');
    const session = await response.json();
    orderId = session.orderId;
    gostayOrigin = new URL(session.gostayOrigin).origin;
    el('trip-title').textContent = session.title || 'Dịch vụ của bạn';
  } catch (error) {
    return fail(errorMessage(error), 'Không tìm thấy trang thanh toán');
  }
  for (const id of ['brand-link', 'header-home', 'error-home', 'expired-home']) el(id).href = homeUrl();
  el('view-order').href = orderUrl();

  if (!UUID.test(orderId)) return fail('Thông tin đơn hàng không hợp lệ.');
  try {
    await api('/auth/session');
  } catch (error) {
    return fail(error.status === 401
      ? 'Bạn cần đăng nhập vào GoStay rồi mở lại đơn hàng để thanh toán.'
      : errorMessage(error), 'Không tìm thấy phiên đăng nhập');
  }

  try {
    let payment;
    try {
      payment = await api(`/payments/order/${encodeURIComponent(orderId)}`);
    } catch (error) {
      if (error.status !== 404) throw error;
      payment = await api('/payments/create', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      });
    }
    if (!payment?.paymentId || payment.orderId !== orderId || !Number.isFinite(Number(payment.amount))) {
      throw new Error('Thông tin thanh toán từ hệ thống không hợp lệ.');
    }
    applyStatus(payment);
    if (String(payment.status).toUpperCase() === 'PENDING') pollTimer = setInterval(refresh, 5000);
  } catch (error) {
    fail(error.status === 401
      ? 'Phiên đăng nhập đã hết hạn. Vui lòng quay về GoStay để đăng nhập lại.'
      : errorMessage(error));
  }
}

el('refresh-button').addEventListener('click', refresh);
function setMode(mode) {
  const demo = mode === 'demo';
  el('real-mode').classList.toggle('active', !demo);
  el('demo-mode').classList.toggle('active', demo);
  el('real-mode').setAttribute('aria-selected', String(!demo));
  el('demo-mode').setAttribute('aria-selected', String(demo));
  el('real-panel').hidden = demo;
  el('demo-panel').hidden = !demo;
}
el('real-mode').addEventListener('click', () => setMode('real'));
el('demo-mode').addEventListener('click', () => setMode('demo'));
el('simulate-button').addEventListener('click', async () => {
  if (!paymentId || simulationSubmitted) return;
  const button = el('simulate-button');
  const note = el('simulation-note');
  button.disabled = true;
  simulationSubmitted = true;
  let accepted = false;
  note.textContent = 'Đang xác nhận thanh toán mô phỏng...';
  try {
    await api(`/payments/${encodeURIComponent(paymentId)}/mock-pay`, {
      method: 'POST',
      headers: { 'x-payment-session': ticket },
      body: '{}',
    });
    accepted = true;
    note.textContent = 'Đang cập nhật trạng thái đơn hàng...';
    applyStatus(await api(`/payments/${encodeURIComponent(paymentId)}`));
  } catch (error) {
    if (!accepted) {
      try {
        const current = await api(`/payments/${encodeURIComponent(paymentId)}`);
        accepted = ['COMPLETED', 'PAID'].includes(String(current.status).toUpperCase());
        if (accepted) applyStatus(current);
      } catch { /* Keep the original request error visible. */ }
    }
    note.textContent = accepted
      ? 'Yêu cầu đã được gửi. Hệ thống đang tự kiểm tra trạng thái đơn hàng.'
      : `Không thể mô phỏng thanh toán: ${errorMessage(error)}`;
    if (!accepted) {
      simulationSubmitted = false;
      button.disabled = false;
    }
  }
});
start();
