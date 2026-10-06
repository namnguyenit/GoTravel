# Bộ nhận diện GoTravel, GoID, GoPay và GoTicket

Ngày 06/10/2026. Đợt cập nhật tiếp theo sau `GOTRAVEL_GOID_GOPAY_BRANDING_2026-10-06.md`.

## Thiết kế

Bốn logo dùng chung vòng chữ G mở, nét bo tròn và độ dày thống nhất. Các nét bên trong phân biệt hướng đi của GoTravel, đường nối của GoID, chữ P của GoPay và chữ T của GoTicket. Biểu tượng được dựng bằng đường SVG gốc.

Wordmark thống nhất với GoTravel: `gotravel.`, `goid.`, `gopay.`, `goticket.`. Phần `go` dùng Outfit 800, phần tên dịch vụ dùng Outfit 500, khoảng cách chữ −0,07em và dấu chấm theo màu thương hiệu. Font phục vụ tại ứng dụng; chữ trong các SVG bàn giao đã chuyển thành đường vector.

| Thương hiệu | Màu | Vị trí sử dụng |
| --- | --- | --- |
| GoTravel | `#FF385C` | Header, footer, favicon |
| GoID | `#6554D9` | Nhận diện trang xác thực, hiệu ứng và favicon |
| GoPay | `#008B79` | Trang chủ, checkout, kết quả và liên kết hết hạn |
| GoTicket | `#147FCC` | Header, footer và favicon trong mã nguồn GoTicket |

## Nội dung GoID

- Bỏ nhãn “Tài khoản chung”, câu “Đăng nhập bằng tài khoản hiện có. Hồ sơ và thông tin liên hệ được dùng chung giữa các dịch vụ.” và các đoạn giải thích kỹ thuật về hồ sơ/quyền.
- Trang đăng nhập: “Truy cập GoTravel và GoTicket với GoID.”
- Trang đăng ký: “Điền thông tin để tạo tài khoản GoID.”
- Thông báo đăng xuất: “Bạn đã đăng xuất khỏi GoID.”
- Quên/đặt lại mật khẩu tiếp tục hiển thị hướng dẫn email, mã xác thực và mật khẩu mới.

Các thay đổi là nội dung hiển thị. Kho tài khoản, thông tin hồ sơ, API, cookie phiên, CSRF và kiểm tra đường dẫn chuyển hướng tiếp tục sử dụng cơ chế hiện có.

## Hiệu ứng và bố cục GoID

- Nền sáng ở khu vực form; mảng tím riêng cho nhận diện trên desktop.
- Chuyển động quỹ đạo, thẻ thương hiệu nổi, nền sáng chuyển nhẹ và trạng thái hover/focus.
- Form trượt theo chiều khi chuyển giữa đăng nhập, đăng ký và khôi phục mật khẩu. Form đang rời đi dùng `inert` để tránh tương tác trong lúc chuyển cảnh.
- Mobile ưu tiên form, ẩn khu vực minh họa để giữ không gian nhập liệu.
- `prefers-reduced-motion` tắt hiệu ứng và chuyển form tức thời.

## Tệp bàn giao

Thư mục `brand-assets/`:

- `brand-family.png` / `brand-family.svg`: tổng thể bộ nhận diện trên nền sáng, tối và ở kích thước nhỏ.
- `go-brand-family-20261006.zip`: toàn bộ 71 tệp bàn giao.
- `exports/<brand>/`: biểu tượng và logo có chữ; bản màu, đen và trắng; SVG và PNG trong suốt; favicon 32/64/180px.
- `source/`: định nghĩa nét SVG, màu và công cụ xuất lại.
- `README.md`: hướng dẫn sử dụng; `OFL-Outfit.txt`: giấy phép font.

Tệp SVG logo có chữ dùng được mà không cần cài font. Các tài nguyên nhận diện trên web đều nằm tại `public/brand` và `public/fonts` của ứng dụng.

## Triển khai

| Ứng dụng | Địa chỉ | Runtime |
| --- | --- | --- |
| GoTravel | https://gotravel.trungcaodev.io.vn | PM2 24, cổng 3000, `.next-brand-family-20261006` |
| GoID | https://auth.trungcaodev.io.vn | PM2 27, cổng 3335, `dist-goid-brand-family-20261006` |
| GoPay | https://pay.trungcaodev.io.vn | PM2 35, cổng 3336 |

GoTravel và GoID đã build production, chuyển runtime và restart. GoPay đã restart để phục vụ các tài nguyên mới theo allowlist. Các tài nguyên static của bản trước được giữ để hỗ trợ tab trình duyệt đang mở.

GoTicket nằm tại `/home/DoANLienNganh/GoTicket/front-end`; đã gắn logo ở `src/components/Navigator`, `src/layout/Main/Footer` và `index.html`, đồng thời bỏ nhãn VEXE cạnh logo cũ. GoTicket hiện chưa có tiến trình chạy và chưa có `node_modules`; đợt này chưa build hoặc triển khai GoTicket. Việc nối backend GoTicket vào GoID/GoPay vẫn cần đợt tích hợp nghiệp vụ riêng.

## Kiểm tra

- GoTravel production build thành công: `BVOLghkISZZqcvmm4JfXD`.
- GoID TypeScript và Vite production build thành công.
- GoPay `node --check` và kiểm thử handoff hiện có: 1/1 đạt; xác thực origin, cookie và quyền sở hữu đơn tiếp tục hoạt động.
- SVG xuất được đọc bằng XML parser; đã xem bảng logo ở kích thước nhỏ và ảnh chụp giao diện desktop/mobile.
- Trình duyệt kiểm tra chuyển form đăng ký, quên/đặt lại mật khẩu, kiểm tra mật khẩu ngắn và reduced motion. Phản hồi gửi email được giả lập; không gửi email hoặc đăng ký tài khoản mới trong phép kiểm tra giao diện này.
- Trên tên miền thật: GoTravel trả HTTP 200; nút đăng nhập mở GoID; đăng nhập bằng tài khoản host kiểm thử trả HTTP 200; trở về GoTravel và đọc phiên trả 200; cookie có HttpOnly/Secure; đăng xuất thu hồi phiên, lần đọc tiếp theo trả 401.
- GoPay trang chủ trả HTTP 200, font 800/500 đúng, liên kết quay về đúng tên miền GoTravel và không tràn ngang ở màn hình 390px. Đợt này không thực hiện giao dịch ngân hàng mới.
- Logo/font không trả lỗi HTTP; không có lỗi JavaScript mới trong các luồng đã kiểm tra. Các tệp sửa đã qua `git diff --check`.

Bằng chứng: `GO_BRAND_FAMILY_UI_CHECK_2026-10-06.json`, `GO_BRAND_FAMILY_LIVE_CHECK_2026-10-06.json`, `GOID_FAMILY_*.png`, `GO_FAMILY_GOTRAVEL_*.png` và `GO_FAMILY_GOPAY_*.png`.

## Điểm cần theo dõi

1. Trang GoTravel vẫn có cảnh báo React hydration #418 đã xuất hiện trước đợt thiết kế này. So sánh trước đó được ghi tại `BRANDING_HYDRATION_BASELINE_2026-10-06.json`. Đợt này không sửa lỗi hydration.
2. Thời gian 17,1 giây trong phép kiểm tra gồm đăng nhập và tải lại trang GoTravel. Đây không phải thời gian xử lý API đăng nhập riêng và không chứng minh đã sửa vấn đề đăng nhập chậm.
3. Runtime PM2 đã cập nhật, nhưng `dump.pm2` thuộc `nhan` và phiên làm việc hiện tại không có quyền ghi. Chủ PM2 hoặc root cần lưu snapshot để giữ runtime mới sau reboot:

```bash
sudo -u nhan env PM2_HOME=/home/nhan/.pm2 /home/nhan/.nodejs-22/bin/node /home/nhan/.nodejs/lib/node_modules/pm2/bin/pm2 save
```

Backup trước đợt này nằm tại `/home/trungcao/.local/state/gotravel-deployments/brand-family-20261006`. Đợt này chưa commit/push; các thay đổi nghiệp vụ có sẵn trong workspace được giữ nguyên.
