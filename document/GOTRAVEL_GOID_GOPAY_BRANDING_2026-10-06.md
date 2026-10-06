# Cập nhật nhận diện GoTravel, GoID và GoPay

> Nhận diện và runtime trong báo cáo này là phiên bản trước. Phiên bản tiếp theo dùng bộ logo chữ G, wordmark thống nhất và giao diện GoID mới: [GO_BRAND_FAMILY_2026-10-06.md](GO_BRAND_FAMILY_2026-10-06.md).

Ngày 06/10/2026. Thực hiện tại `/home/trungcao/DoANLienNganh-devserver`, nhánh `devserver`.

## Giao diện đã triển khai

| Ứng dụng | Địa chỉ | Nhận diện |
| --- | --- | --- |
| GoTravel | https://gotravel.trungcaodev.io.vn | Logo la bàn và wordmark `gotravel.` từ giao diện Auth; dùng ở header, footer và favicon. |
| GoID | https://auth.trungcaodev.io.vn | Logo tài khoản, màu tím; đăng nhập, đăng ký, quên/đặt lại mật khẩu, đăng xuất; nội dung tài khoản chung GoTravel và GoTicket. |
| GoPay | https://pay.trungcaodev.io.vn | Logo thanh toán, màu xanh ngọc; trang chủ, thông tin đơn hàng, phương thức VNPAY, kết quả thanh toán và liên kết hết hạn. |

Tên miền không thay đổi. Logo GoTravel được sao chép từ `auth_front-end/public/gotravel-mark.svg` sang `front_end/public/gotravel-mark.svg`; SHA-256 hai tệp giống nhau. Font wordmark Outfit được lưu cục bộ và có giấy phép OFL trong `public/fonts`. GoID/GoPay không cần tải Google Fonts. Các biểu tượng nhận diện là SVG cục bộ, không phụ thuộc URL ảnh ngoài.

GoPay có trang chủ `/` trả HTTP 200 để người dùng không gặp trang 404 khi mở tên miền trực tiếp. Trang `/pay` vẫn yêu cầu phiên thanh toán hợp lệ. Liên kết sai/hết hạn vẫn trả 404 với hướng dẫn mở lại từ đơn hàng.

## Cơ chế xác thực và thanh toán

- GoID vẫn dùng Identity/Gateway và kho tài khoản chung hiện có. Không tạo thêm tài khoản hay đổi issuer JWT.
- Cookie phiên HttpOnly/Secure; CSRF và kiểm tra redirect theo allowlist được giữ nguyên.
- Các trường hồ sơ tài khoản dùng chung. Thông tin hành khách tiếp tục theo từng đơn, không thêm vào hồ sơ GoID.
- GoPay giữ nguyên bước kiểm tra phiên đăng nhập và quyền sở hữu đơn trước khi cấp handoff. API thanh toán vẫn nằm trong allowlist của portal.
- GoPay là tên cổng thanh toán; VNPAY vẫn là nhà cung cấp thanh toán. Return chỉ đọc kết quả; IPN xác thực chữ ký tại backend mới ghi nhận thanh toán.
- Trang kết quả có các trạng thái đang xác minh, chờ xác nhận, thành công, thất bại, hết hạn và cần đối soát; không xác nhận thành công khi đơn chưa được xác nhận tại backend.
- CSP của GoPay chỉ cho phép script/style/font cục bộ; không thêm inline script hoặc nới quyền gọi API.

**Kết nối GoTicket:** Giao diện GoID thể hiện tài khoản chung, nhưng đợt này không triển khai lại backend hay checkout của GoTicket. Allowlist hiện chỉ gồm các origin nền tảng đã cấu hình. Khi frontend GoTicket có tên miền triển khai, cần thêm đúng origin tại GoID/Gateway và cấu hình cookie/CORS tương ứng; không chấp nhận redirect tùy ý. GoPay hiện nhận đơn GoTravel; đơn GoTicket cần tích hợp nghiệp vụ riêng khi backend GoTicket sẵn sàng.

## Kiểm tra

- Build GoTravel: Next.js production thành công, build ID `8qI5rZ7n6Vw4BTkOtV6b7`.
- Build GoID: TypeScript/Vite production thành công.
- Kiểm thử handoff GoPay: `node --test` thành công; kiểm tra origin, quyền sở hữu đơn và cookie, chặn route mock thanh toán.
- Kiểm tra trình duyệt trên tên miền thật, desktop 1440px và mobile 390px: logo tải được, GoID đăng nhập HTTP 200, trở về GoTravel, cookie HttpOnly/Secure, đăng xuất thu hồi phiên và lần đọc phiên tiếp theo trả 401.
- Tạo đơn thử từ dịch vụ 2.000đ, mở GoPay và kiểm tra số tiền từ backend; nút VNPAY chuyển tới Sandbox. Đơn thử được hủy sau kiểm tra để trả tồn chỗ. **Không thực hiện giao dịch ngân hàng mới trong đợt đổi giao diện.**
- Trang kết quả GoPay khi mở không có chữ ký hợp lệ hiển thị trạng thái chưa xác minh, không hiển thị thành công giả.
- Không có ảnh/logo/font nhận diện trả lỗi; không có tràn ngang trên các màn hình mobile đã kiểm tra.
- Kiểm tra form quên/đặt lại mật khẩu dùng phản hồi email giả lập trong trình duyệt, không gửi email thực tế; kiểm tra chuyển form, tự điền email và kiểm tra mật khẩu tối thiểu.
- `git diff --check` không phát hiện lỗi khoảng trắng. Không commit/push trong đợt này vì yêu cầu hiện tại là cập nhật giao diện.

Bằng chứng: `BRANDING_VERIFICATION_2026-10-06.json`, `BRANDING_AUTH_RECOVERY_CHECK_2026-10-06.json`, các ảnh `BRANDING_*.png` cùng thư mục.

## Vấn đề hiện có quan sát được

1. GoTravel có cảnh báo React hydration #418 trên trang chi tiết và trang chủ. Đã chạy so sánh bản trước đợt thay giao diện và bản mới: cả hai đều có cảnh báo, không có lỗi JavaScript khác trong phép so sánh. Bằng chứng `BRANDING_HYDRATION_BASELINE_2026-10-06.json`. Cảnh báo có thể khiến một số tương tác phải đợi hydrate lại; chưa sửa trong đợt nhận diện này.
2. Thời gian ghi nhận khoảng 17,7 giây trong phép kiểm tra bao gồm đăng nhập **và tải lại trang chủ GoTravel**, không phải thời gian xử lý API đăng nhập riêng. Không kết luận GoID đã giải quyết vấn đề hiệu năng đăng nhập.
3. PM2 đang chạy đúng ba tiến trình sau restart, nhưng `dump.pm2` vẫn thuộc tài khoản `nhan` và phiên `trungcao` không có quyền ghi. Snapshot cũ còn trỏ về checkout chung. Chủ PM2 hoặc root cần lưu danh sách tiến trình hiện tại để tránh rollback khi reboot:

```bash
sudo -u nhan env PM2_HOME=/home/nhan/.pm2 /home/nhan/.nodejs-22/bin/node /home/nhan/.nodejs/lib/node_modules/pm2/bin/pm2 save
```

Không chạy lệnh trên với quyền vượt ACL trong phiên này.

## Runtime

- `gostay-frontend` (PM2 24), cổng 3000, `NEXT_BUILD_DIR=.next-go-branding-20261006`.
- `auth-frontend` (PM2 27), cổng 3335, Vite preview `--outDir dist-goid-20261006`.
- `gostay-payment-portal` (PM2 35), cổng 3336.

Build được tạo trong thư mục riêng. Giữ các static asset của bản trước để hạn chế lỗi với tab trình duyệt đã mở. Bản sao giao diện trước khi sửa nằm ngoài Git tại `/home/trungcao/.local/state/gotravel-deployments/branding-20261006`.
