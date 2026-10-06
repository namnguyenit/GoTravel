# Nội dung hiển thị và nguồn ảnh — 05/10/2026

## Kết quả

- Bỏ nhãn `[Mẫu]` trong 500 dịch vụ và 30 tổ hợp, thay mô tả dài mở đầu bằng “DỮ LIỆU MẪU” bằng thông tin tiện nghi/lịch trình/gói dịch vụ. Các chuỗi mẫu trong attributes và 1.500 bình luận cũng đã xử lý.
- Giữ tên đúng “Rừng dừa Bảy Mẫu”, “Đền Mẫu Âu Cơ” và từ có ý nghĩa như “mẫu vật địa chất”.
- Metadata nguồn gốc riêng trong `seed_record_provenance` (2.130 bản ghi), `plan.recordOrigins` và tài liệu. Đánh giá seed vẫn xác định là giả lập; không biến thành đánh giá khách hàng thật.
- Quét Catalog, Identity, Booking, Cart/Order và Payment: **6.565 tham chiếu ảnh / 262 URL riêng biệt**, tất cả dùng cloud `p1kxfhlw`. Các trường avatar/giấy tờ của Identity hiện trống; đơn hàng chưa có ảnh snapshot.
- Tải lại **287 asset trong manifest**, HTTP 200, giải mã và kiểm tra kích thước, định dạng và SHA-256: **0 lỗi**. 25 asset còn lại là pool dự phòng/avatar/fallback frontend, không phải ảnh DB bị thiếu.
- Không cần upload lại ảnh nội dung đã có trên Cloudinary. Đã bỏ avatar mặc định GitHub khỏi header; tài khoản chưa có avatar dùng chữ cái tên. Avatar header chỉ nhận URL Cloudinary của platform.
- Cài 9 CHECK constraint tại database Catalog để thumbnail/gallery/attributes/review/suggestion không lưu URL ngoài cloud này. Kiểm tra 6 trường hợp ảnh ngoài/khác cloud/path traversal bị từ chối; mỗi probe rollback, không tạo dữ liệu giả.
- Bản build frontend mới đã triển khai và restart; website public và localhost đều HTTP 200. Trang chủ và trang Bungalow trong ảnh người dùng không có nhãn seed, không có `<img>` trỏ host ảnh ngoài.

## Phạm vi ảnh và dịch vụ ngoài

Ảnh nội dung địa danh/lưu trú/trải nghiệm/dịch vụ/tổ hợp, pool seeder và ảnh dự phòng hiện dùng Cloudinary. URL nguồn Wikimedia/Google Maps trong mô tả là liên kết tham khảo và credit giấy phép, không phải src ảnh.

Bản đồ Google Maps trong iframe, tile OpenStreetMap của bộ chọn tọa độ và QR VietQR ở màn hình payout vẫn là tích hợp ngoài; chúng không phải ảnh nội dung du lịch đã migration. Không tuyên bố toàn bộ website hết mọi kết nối bên thứ ba. QR thuộc luồng thanh toán đang phát triển; đợt này không thay cơ chế thanh toán. Favicon và biểu tượng giao diện được phục vụ từ hệ thống hoặc SVG trong code.

## Kiểm tra

- 11 nhóm dịch vụ: detail/reviews/availability/search qua Gateway đạt.
- 3 kiểm tra presentation đạt: tên địa danh/ngữ nghĩa, chạy lại ổn định, bảo toàn ảnh/giá/tồn kho/credit.
- So sánh 169.278 bản ghi Catalog/Booking trước và sau, bỏ qua đúng trường chủ động sửa: 0 thay đổi ngoài phạm vi.
- Xóa có điều kiện 3 cache chứa nội dung cũ; không FLUSH Redis.
- Build Webpack và TypeScript thành công. Build Turbopack trong thư mục tạm không nhận symlink node_modules ngoài root; đã dùng Webpack theo CLI của Next. Cảnh báo middleware/Edge Runtime có trước không cản build.

## Công cụ và khôi phục

`api-tester/e2e-seeder/expansion/presentation.js`, `clean-presentation.js`, `enforce-image-origin.js`. Generator, validator, verifier, công cụ ẩn batch đã đồng bộ để không phụ thuộc nhãn public; kiểm tra checksum và ID của batch vẫn giữ.

Backup riêng, được Git ignore: `api-tester/e2e-seeder/.image-migration/presentation/backup-*.json` và `frontend-before/`. Khi khôi phục cần so sánh giá trị hiện tại với plan đã áp dụng để không ghi đè sửa mới của nhóm; giữ metadata nguồn gốc. Không xóa asset đang được dùng.

Chính sách image-origin được cài bằng công cụ bảo trì, chưa nằm trong lịch sử Flyway; một database mới chỉ chạy Flyway cần chạy `node expansion/enforce-image-origin.js` sau khi chuyển ảnh. Backup schema đầy đủ PostgreSQL giữ CHECK constraint và hàm. Đổi cloud cần migration dữ liệu và chính sách cùng nhau.

## Bằng chứng

- [Danh sách tham chiếu ảnh](image-presentation-audit-2026-10-05/image-references.csv).
- [Kiểm tra CDN](image-presentation-audit-2026-10-05/cloudinary-verification.json).
- [Kiểm tra website/API](image-presentation-audit-2026-10-05/live-verification.json).
- [Chính sách ảnh](image-presentation-audit-2026-10-05/image-origin-policy.json).
- [Bảo toàn dữ liệu](image-presentation-audit-2026-10-05/preservation.json).

Các số lượng trên là thời điểm hoàn tất đợt bỏ nhãn và audit ảnh, trước đợt seed cân bằng theo tỉnh tiếp theo.
