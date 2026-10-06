# GoID — Tài khoản GoTravel & GoTicket

Giao diện tài khoản dùng chung: đăng nhập, đăng ký, quên mật khẩu, đặt lại mật khẩu và đăng xuất. React + TypeScript + Vite; cổng 3335. GoID là tên nhận diện của hệ thống SSO hiện có, không tạo thêm kho tài khoản.

## Chạy ứng dụng

```bash
npm install
npm run dev
npm run build
npm run preview -- --host 127.0.0.1 --port 3335
```

API `/api` được proxy tới Gateway nội bộ `http://localhost:5555`. Frontend không giữ khóa ký JWT hoặc secret thanh toán.

## Phiên đăng nhập

- Đăng nhập qua Gateway; cookie phiên là HttpOnly và Secure trên HTTPS.
- Yêu cầu ghi dữ liệu gửi cookie CSRF qua `X-CSRF-Token`.
- `redirect_uri` và `continue` được kiểm tra bằng allowlist trong `src/platform-domains.ts` trước khi chuyển hướng.
- Các form dùng chung thông tin tài khoản; không đưa thông tin hành khách từng đơn vào hồ sơ GoID.
- Khi kết nối frontend GoTicket, khai báo chính xác origin được phép và cấu hình cookie/CORS tương ứng tại Gateway. Không cho phép redirect tới origin tùy ý.

## Nhận diện

- GoID: `public/goid-mark.svg`, màu tím `#5950D5`.
- GoTravel: biểu tượng la bàn gốc `public/gotravel-mark.svg`; cùng nguồn logo dùng trên GoTravel.
- GoTicket: `public/goticket-mark.svg`, dùng để nhận diện dịch vụ trong giao diện tài khoản chung.
- Font logo Outfit được lưu cục bộ trong `public/fonts`, kèm giấy phép OFL. Trang không cần gọi Google Fonts để tải giao diện.
