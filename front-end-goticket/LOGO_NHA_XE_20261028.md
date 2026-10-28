# Logo nhà xe — 28/10/2026

Đã triển khai lên Identity, GoCar và GoTicket frontend. Giữ giao diện hiện tại; thay ô nhập URL logo bằng chọn ảnh từ thiết bị.

## Người dùng và nhà xe

- Đăng ký nhà xe tại `/become-operator` hoặc `/operator/register` bắt buộc có logo JPG, PNG hoặc WebP, tối đa 5MB. Có xem trước, tên file và thông báo lỗi.
- Logo là ảnh công khai; giấy tờ KYC vẫn dùng luồng tài liệu riêng tư hiện có.
- Hồ sơ cũ đang chờ duyệt nhưng thiếu logo được mở lại để bổ sung. Giữ giấy tờ đã nộp; admin chưa thể duyệt cho đến khi có logo.
- Nhà xe đã được duyệt tiếp tục hoạt động; bổ sung/thay logo tại `/operator/profile`. Khi lưu hồ sơ phải có logo. Không nhập URL tùy ý, không xóa trắng logo.
- Hiện logo ở hồ sơ, thông tin xét duyệt, thẻ kết quả chuyến, cửa sổ chi tiết và trang chi tiết chuyến. Nhà xe cũ chưa có ảnh hiện ký tự tên thay thế.
- Logo mới áp dụng cho cả chuyến đã mở bán; không viết lại snapshot ghế, giá, lộ trình hoặc vé cũ.

## Luồng API và dữ liệu

1. `POST /api/v1/me/ticket-vendor-application`: multipart thông tin pháp nhân, hai ảnh giấy tờ và `logoImage` bắt buộc.
2. `PUT /api/v1/me/ticket-vendor-application`: gửi lại hồ sơ; `logoImage` có thể bỏ nếu đã có logo. Backend kiểm tra loại, kích thước và chữ ký định dạng ảnh.
3. Identity gọi Media bằng token nội bộ để tải ảnh công khai vào `transport/{userId}/operator-logos`. URL được lưu ở database Identity, bảng `ticket_vendor_profiles.logo_url`.
4. Admin duyệt qua `PUT /api/v1/admin/ticket-vendors/{userId}/approval`; hồ sơ thiếu logo bị từ chối. Identity truyền logo sang endpoint provision nội bộ GoCar và chỉ cấp quyền sau khi đồng bộ thành công.
5. GoCar lưu logo ở `operators.logo_url`. Đổi logo trong hồ sơ: frontend upload qua `POST /api/v1/media/upload`, folder `operator-logos`, rồi `PATCH /api/v1/operators/me/profile` với URL kết quả. Backend giới hạn ảnh Cloudinary thuộc thư mục của chính người thao tác, xác minh ảnh còn truy cập được. Không nhận URL ảnh bên ngoài thay thế.
6. API tìm kiếm `/api/v1/trips/search` trả `operator.logoUrl`; chi tiết chuyến `/api/v1/trips/{id}` trả logo qua dữ liệu nhà xe. Ưu tiên logo hiện tại thay vì ảnh trong snapshot cũ.

Ảnh lưu ở Cloudinary thông qua Media service sẵn có; database lưu URL. Logo trong hồ sơ KYC ghi nhận ảnh lúc nộp, còn logo công khai hiện tại lấy từ GoCar khi nhà xe cập nhật thương hiệu.

## Triển khai

- Migration cộng thêm cột, không xóa dữ liệu: `deploy/sql/goticket-operator-logo.sql`.
- Runner: Node 22 chạy `deploy/migrate-goticket-operator-logo.mjs`, trước khi thay JAR Identity.
- GoCar cần `OPERATOR_LOGO_CLOUD_NAME` khớp Cloudinary của Media service; đã cấu hình local. Không ghi token/secret trong tài liệu này.
- Đã build bỏ qua test suite, thay artifact và restart `gostay-identity`, `gocar-service`, `gocar-frontend`. Không restart các service nghiệp vụ khác.
- Backup source và artifact trước thay đổi tại `.release-backups/operator-logo-20261028/`.

## Kiểm tra giới hạn bằng tài khoản demo

- Upload/lưu hồ sơ nhà xe thành công qua Media thật; URL trả về trong kết quả tìm chuyến và chi tiết chuyến đã mở bán.
- Đăng ký thiếu logo: HTTP 400, không tạo hồ sơ. Duyệt hồ sơ thiếu logo: HTTP 400.
- Hồ sơ demo cũ thiếu logo: bổ sung ảnh thành công, giữ giấy tờ sẵn có; duyệt thành công, URL Identity và GoCar khớp nhau.
- File sai loại bị chặn ở giao diện; xem trước và bố cục desktop/mobile được kiểm tra, không tràn ngang.
- Chỉ thay dữ liệu demo: một nhà xe demo bổ sung logo và một hồ sơ demo đang chờ được bổ sung logo/duyệt. Không tự đặt logo giả cho nhà xe thật.
- Bằng chứng local: `.data/goticket-journey-audit/20261028-operator-logo/`. Không chạy bộ kiểm thử toàn dự án.
