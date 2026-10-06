const el = id => document.getElementById(id);
const query = new URLSearchParams(window.location.search);
let timer = null, tries = 0, checking = false;
const messages = {
  SUCCESS: ['Thanh toán thành công', 'Đơn hàng đã được xác nhận.'],
  CONFIRMING: ['Đã nhận thanh toán', 'Hệ thống đang xác nhận đơn hàng. Vui lòng chờ, không thanh toán thêm.'],
  PENDING: ['Đang chờ xác nhận từ VNPAY', 'GoPay đang chờ xác nhận giao dịch từ VNPAY. Vui lòng chờ và không thanh toán thêm.'],
  FAILED: ['Thanh toán chưa hoàn tất', 'Giao dịch bị hủy hoặc không thành công. Bạn có thể mở lại thanh toán từ đơn hàng khi còn thời gian giữ chỗ.'],
  EXPIRED: ['Phiên thanh toán đã hết hạn', 'Hãy kiểm tra đơn hàng trên GoTravel. Nếu đã bị trừ tiền, liên hệ hỗ trợ để đối soát.'],
  REVIEW: ['Giao dịch cần đối soát', 'Giao dịch cần được kiểm tra do thay đổi trạng thái đơn hàng hoặc thời hạn giữ chỗ. Không thanh toán thêm; vui lòng liên hệ hỗ trợ.'],
};
async function check() {
  if (checking) return; checking = true; el('check-button').disabled = true;
  try {
    const response = await fetch('/api/v1/payments/vnpay/return?' + query.toString(), { credentials: 'omit', cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message || 'Không xác minh được kết quả thanh toán.');
    const result = payload?.data?.data ?? payload?.data ?? payload;
    const message = messages[result.result]; if (!message) throw new Error('Kết quả thanh toán không hợp lệ.');
    el('result-card').dataset.state = result.result.toLowerCase();
    el('result-icon').textContent = result.result === 'SUCCESS' ? '✓' : ['FAILED', 'EXPIRED', 'REVIEW'].includes(result.result) ? '!' : '…';
    el('result-title').textContent = message[0]; el('result-message').textContent = message[1];
    const home = new URL(result.frontendUrl);
    if (home.protocol !== 'https:' || home.username || home.password) throw new Error('Địa chỉ GoTravel không hợp lệ.');
    el('home-link').href = home.origin + '/';
    el('order-link').href = home.origin + '/orders/completed?orderId=' + encodeURIComponent(result.orderId);
    el('order-link').textContent = 'Xem đơn hàng'; el('order-reference').textContent = 'Mã đơn: ' + result.orderId;
    clearTimeout(timer);
    if (['PENDING', 'CONFIRMING'].includes(result.result) && ++tries < 24) timer = setTimeout(check, 2500);
  } catch (error) {
    el('result-card').dataset.state = 'error'; el('result-icon').textContent = '!';
    el('result-title').textContent = 'Chưa xác minh được thanh toán'; el('result-message').textContent = error.message;
    clearTimeout(timer);
  } finally { checking = false; el('check-button').disabled = false; }
}
el('check-button').addEventListener('click', () => { tries = 0; check(); });
check();
