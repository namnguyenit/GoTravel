# GoPay — Cổng thanh toán VNPAY

GoPay có trang chủ `/`, trang thanh toán `/pay` và trang kết quả `/vnpay/return`. Nhận diện GoPay màu xanh ngọc; tài khoản lấy từ phiên GoID hiện có.

Portal chạy cổng 3336, Gateway nội bộ 5555, Java PaymentandWallet 8085. Không có npm dependency.

Checkout gọi `POST /launch`, portal xác minh phiên và quyền sở hữu đơn, rồi mở `/pay?session=...`. Cookie SSO HttpOnly và CSRF vẫn được sử dụng. Nút VNPAY tạo URL đã ký từ backend và chuyển tới cổng thanh toán; không còn QR SePay hay nút mô phỏng.

Trang thanh toán đọc `GET /api/v1/orders/{orderId}` bằng phiên của khách hàng, hiển thị **toàn bộ `items`**: tên/ảnh, ngày sử dụng, khung giờ nếu có, số lượng, đơn giá và thành tiền. Mã đơn, ngày đặt, trạng thái, hạn thanh toán, tên khách, điện thoại và email lấy từ cùng đơn hàng. Không lấy tên sản phẩm đầu tiên từ handoff hoặc thông tin từ query string.

Số tiền thanh toán phải khớp `order.totalAmount`; nút chuyển sang VNPAY chỉ hoạt động với giao dịch `PENDING` và URL HTTPS nằm trong danh sách VNPAY cho phép. Ảnh sản phẩm chỉ nhận URL HTTPS của Cloudinary; dữ liệu động dựng bằng `textContent`. CSP chỉ bổ sung Cloudinary cho ảnh, giữ nguyên hạn chế script/style.

Logo VNPAY được lưu cục bộ tại `public/brand/vnpay-logo.svg`, lấy nguyên bản từ [trang chính thức VNPAY](https://vnpay.vn/) ([tệp nguồn](https://1889324617.cloud.edgevnpay.vn/assets/images/logo-icon/logo-primary.svg)). Trình duyệt không cần tải logo từ website VNPAY.

- Return page: `https://pay.trungcaodev.io.vn/vnpay/return`.
- IPN: `https://pay.trungcaodev.io.vn/api/v1/payments/vnpay/ipn`.
- API xác minh Return: `GET /api/v1/payments/vnpay/return`.

Callback không cần phiên handoff/cookie và chỉ mở GET chính xác. Java xác minh chữ ký, merchant, reference và số tiền. Return page chỉ đọc kết quả; IPN mới ghi nhận thanh toán. Không đánh dấu đơn thành công trước khi notification sang service đơn hàng được xử lý.

Cấu hình và kịch bản test: [VNPAY Sandbox setup](../document/VNPAY_SANDBOX_SETUP_2026-10-06.md).

```bash
npm start
node --test test/*.test.js
```

Env tùy chọn: `PAYMENT_PORTAL_HOST` (mặc định `0.0.0.0`, runtime server bind loopback), `PAYMENT_PORTAL_PORT=3336`, `PAYMENT_GATEWAY_URL=http://127.0.0.1:5555`, `GOSTAY_BASE_URL=https://gotravel.trungcaodev.io.vn`.

Cả GoTravel mới và miền gostay.nonnet123 cũ có thể launch portal. Return URL VNPAY dùng miền pay mới; trang kết quả callback hoạt động ngay cả khi trình duyệt không có cookie trên miền mới. Khi mở chi tiết đơn ở miền mới, người dùng của miền cũ có thể cần đăng nhập SSO mới.
