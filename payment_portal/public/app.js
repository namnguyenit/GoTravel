const ticket = new URLSearchParams(window.location.search).get('session') || '';
const el = id => document.getElementById(id);
const views = ['loading', 'error', 'payment', 'success', 'expired'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let orderId = '', paymentId = '', pollTimer = null, checking = false, launching = false;
let home = window.location.hostname === 'pay.nonnet123.io.vn' ? 'https://gostay.nonnet123.io.vn' : 'https://gotravel.trungcaodev.io.vn';
let currentOrder = null;
const money = value => value !== null && value !== undefined && Number.isFinite(Number(value))
  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value)) : '—';
function dateLabel(value, withTime = false) {
  if (!value) return '—';
  const text = String(value);
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  const date = new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(text) ? text : text + '+07:00');
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}
function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function detail(list, label, value) {
  const row = node('div'); row.append(node('dt', '', label), node('dd', '', value)); list.append(row);
}
function renderOrder(order) {
  if (order?.orderId !== orderId || !Array.isArray(order.items) || !order.items.length
      || order.totalAmount == null || !Number.isFinite(Number(order.totalAmount))
      || (order.currency && order.currency !== 'VND')) throw new Error('Thông tin đơn hàng không hợp lệ.');
  currentOrder = order;
  el('order-id').textContent = order.orderNumber || order.orderId;
  el('order-created').textContent = dateLabel(order.createdAt, true);
  el('order-status').textContent = ({ PENDING: 'Chờ thanh toán', PAYMENT_PENDING: 'Chờ thanh toán',
    CONFIRMED: 'Đã xác nhận', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy' })[order.status] || 'Đang cập nhật';
  el('order-expiry-row').hidden = !order.expiresAt || !['PENDING', 'PAYMENT_PENDING'].includes(order.status);
  el('order-expiry').textContent = dateLabel(order.expiresAt, true);
  el('customer-name').textContent = order.customerInfo?.fullName || '—';
  el('customer-phone').textContent = order.customerInfo?.phone || '—';
  el('customer-email').textContent = order.customerInfo?.email || '—';
  el('item-count').textContent = `${order.items.length} sản phẩm`;
  el('amount').textContent = money(order.totalAmount);
  const products = order.items.map((item, index) => {
    const article = node('article', 'order-item'); article.dataset.orderItem = String(index);
    const top = node('div', 'item-main');
    const thumbnail = node('div', 'item-thumbnail', String(index + 1));
    try {
      const imageUrl = new URL(item.thumbnailUrl);
      if (imageUrl.protocol === 'https:' && imageUrl.hostname === 'res.cloudinary.com'
          && !imageUrl.username && !imageUrl.password) {
        const image = node('img'); image.src = imageUrl.href; image.alt = ''; image.loading = 'lazy';
        image.referrerPolicy = 'no-referrer'; image.addEventListener('error', () => image.remove(), { once: true });
        thumbnail.append(image);
      }
    } catch { /* The item remains readable when its image is unavailable. */ }
    top.append(thumbnail, node('h4', 'item-title', item.listingTitle || `Sản phẩm ${index + 1}`));
    const details = node('dl', 'item-details');
    detail(details, item.endDate && item.endDate !== item.startDate ? 'Thời gian sử dụng' : 'Ngày sử dụng',
      dateLabel(item.startDate) + (item.endDate && item.endDate !== item.startDate ? ' – ' + dateLabel(item.endDate) : ''));
    if (item.timeSlot) detail(details, 'Khung giờ', item.timeSlot);
    detail(details, 'Số lượng', item.quantity ?? '—');
    detail(details, 'Đơn giá', money(item.unitPrice));
    detail(details, 'Thành tiền', money(item.totalPrice));
    article.append(top, details); return article;
  });
  el('order-items').replaceChildren(...products);
}
function validatePayment(payment) {
  if (!UUID.test(payment?.paymentId || '') || payment.orderId !== orderId || payment.amount == null
      || !Number.isFinite(Number(payment.amount)) || Number(payment.amount) !== Number(currentOrder?.totalAmount)) {
    throw new Error('Thông tin hoặc số tiền thanh toán không khớp đơn hàng.');
  }
}
function show(view) { for (const name of views) el(`${name}-view`).hidden = name !== view; }
function stop() { clearInterval(pollTimer); pollTimer = null; }
function fail(message, title = 'Không thể mở thanh toán') {
  stop(); el('error-title').textContent = title; el('error-message').textContent = message; show('error');
}
function readCookie(name) {
  const value = document.cookie.split(';').map(x => x.trim()).find(x => x.startsWith(name + '='));
  try { return value ? decodeURIComponent(value.slice(name.length + 1)) : ''; } catch { return ''; }
}
async function api(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.method === 'POST') {
    headers.set('content-type', 'application/json');
    const csrf = readCookie('csrf_token'); if (csrf) headers.set('x-csrf-token', csrf);
  }
  const response = await fetch('/api/v1' + path, { ...options, headers, credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) { const error = new Error(payload?.message || `Yêu cầu thất bại (${response.status}).`); error.status = response.status; throw error; }
  return payload?.data?.data ?? payload?.data?.result ?? payload?.data ?? payload;
}
async function apply(payment) {
  validatePayment(payment);
  paymentId = payment.paymentId;
  el('amount').textContent = money(payment.amount);
  if (payment.paymentUrl) {
    const sandbox = new URL(payment.paymentUrl).hostname === 'sandbox.vnpayment.vn';
    el('provider-title').textContent = sandbox ? 'VNPAY Sandbox' : 'VNPAY';
    el('environment-note').textContent = sandbox ? 'Môi trường kiểm thử. Không chuyển tiền thật vào tài khoản ngân hàng.' : 'Kiểm tra số tiền và phương thức thanh toán trên VNPAY trước khi xác nhận.';
  }
  const status = String(payment.status).toUpperCase();
  if (status === 'COMPLETED') {
    el('vnpay-button').disabled = true;
    const order = await api(`/orders/${encodeURIComponent(orderId)}`);
    renderOrder(order);
    if (['CONFIRMED', 'COMPLETED'].includes(String(order.status).toUpperCase())) {
      stop(); el('success-order').textContent = order.orderNumber || orderId; show('success');
    } else {
      show('payment'); el('update-note').textContent = 'Đã nhận thanh toán. Đang xác nhận đơn hàng, vui lòng chờ.';
    }
  } else if (status === 'PAID_REVIEW') {
    return fail('Giao dịch cần đối soát vì đơn hàng hoặc lượt giữ chỗ đã thay đổi. Vui lòng liên hệ hỗ trợ; không thanh toán thêm.', 'Cần kiểm tra giao dịch');
  } else if (['EXPIRED', 'FAILED', 'REFUNDED'].includes(status)) {
    stop(); el('expired-message').textContent = 'Đơn không còn nhận thanh toán. Hãy kiểm tra đơn hàng trên GoTravel.'; show('expired');
  } else if (status === 'PENDING') show('payment');
  else throw new Error('Trạng thái thanh toán không hợp lệ.');
}
async function refresh() {
  if (!paymentId || checking) return;
  checking = true; el('refresh-button').disabled = true;
  try { await apply(await api(`/payments/${encodeURIComponent(paymentId)}`)); }
  catch (error) { el('update-note').textContent = error.message; }
  finally { checking = false; el('refresh-button').disabled = false; }
}
async function createPayment() {
  return api('/payments/create', { method: 'POST', body: JSON.stringify({ orderId }) });
}
async function start() {
  try {
    const response = await fetch(`/session?ticket=${encodeURIComponent(ticket)}`, { credentials: 'include', cache: 'no-store' });
    if (!response.ok) throw new Error('Phiên thanh toán đã hết hạn. Hãy mở lại từ đơn hàng trên GoTravel.');
    const session = await response.json(); orderId = session.orderId; home = new URL(session.gostayOrigin).origin;
    if (!UUID.test(orderId)) throw new Error('Mã đơn hàng không hợp lệ.');
    for (const id of ['header-home', 'error-home', 'expired-home']) el(id).href = home + '/';
    el('view-order').href = home + '/orders/completed?orderId=' + encodeURIComponent(orderId);
    await api('/auth/session');
    renderOrder(await api(`/orders/${encodeURIComponent(orderId)}`));
    let payment;
    try { payment = await api(`/payments/order/${encodeURIComponent(orderId)}`); }
    catch (error) { if (error.status !== 404) throw error; }
    if (!payment || payment.status === 'PENDING') payment = await createPayment();
    await apply(payment);
    if (['PENDING', 'COMPLETED'].includes(payment.status) && !pollTimer && el('success-view').hidden) pollTimer = setInterval(refresh, 5000);
  } catch (error) { fail(error.message); }
}
el('refresh-button').addEventListener('click', refresh);
el('vnpay-button').addEventListener('click', async () => {
  if (launching) return; launching = true; el('vnpay-button').disabled = true;
  try {
    const payment = await createPayment();
    validatePayment(payment);
    if (payment.status !== 'PENDING') { await apply(payment); launching = false; return; }
    const destination = new URL(payment.paymentUrl);
    if (destination.protocol !== 'https:' || !['sandbox.vnpayment.vn', 'pay.vnpay.vn'].includes(destination.hostname)
        || destination.pathname !== '/paymentv2/vpcpay.html' || destination.username || destination.password) throw new Error('URL VNPAY không hợp lệ.');
    window.location.assign(destination.href);
  } catch (error) { el('update-note').textContent = error.message; launching = false; el('vnpay-button').disabled = false; }
});
start();
