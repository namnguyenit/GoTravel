# Seed GoTravel bổ sung

Batch: `gotravel-expansion-2026-10-04-v1`.

## Phạm vi

- 100 địa danh thực, có tên, tọa độ, nguồn ảnh và đường dẫn Google Maps.
- 500 dịch vụ seed: 220 STAY, 140 EXP, 140 SVC; đủ 9 dịch vụ con.
- 30 tổ hợp seed thuộc các tài khoản seed có quyền ENTERPRISE.
- 1.500 đánh giá giả lập, 3 người dùng seed khác nhau cho mỗi dịch vụ.
- 500 cấu hình tồn kho và 96.460 dòng lịch trong 91 ngày liên tiếp, bắt đầu từ ngày tạo plan theo múi giờ Việt Nam.

Các dịch vụ, giá, phòng, tiện nghi, vị trí nhà cung cấp, lịch và đánh giá là dữ liệu kiểm thử. Không phải nội dung xác nhận hoạt động hay giao dịch thực của khách sạn/nhà cung cấp. Các địa danh dùng nguồn dữ kiện công khai; Google Maps là liên kết tra cứu, không phải dữ liệu Places đã xác thực. Không sao chép/rehost ảnh hay đánh giá từ Google Maps.

## Dữ liệu và ảnh

`destinations.json` lưu nguồn dữ kiện và thông tin tác giả/giấy phép ảnh. `province-audit.json` lưu đối chiếu tỉnh thành. `plan.json` là nội dung nhập thực tế. `receipt.json` ghi số lượng trước/sau và checksum plan. `verification.json` ghi kết quả kiểm tra database/API. `image-audit.json` ghi tải, kiểm tra và lỗi ảnh.

Ảnh Wikimedia chỉ nhận CC BY, CC BY-SA, CC0 hoặc Public domain. Giữ credit, link nguồn, link giấy phép trong mô tả địa danh và trải nghiệm sử dụng ảnh. Biến thể WebP giữ giấy phép nguồn. Ảnh minh họa theo từng nhóm lưu trú/dịch vụ dùng các pool đã chuyển Cloudinary từ seeder cũ. Không cần 500 file ảnh trùng lặp cho 500 bản ghi.

Helper `image-store.js` tải ảnh HTTPS từ danh sách host cố định, giới hạn dung lượng/độ phân giải, từ chối ảnh động và định dạng không được hỗ trợ, upload bằng ID SHA256 rồi tải CDN để kiểm tra checksum và giải mã. Chờ đúng `Retry-After` khi nguồn trả HTTP 429. Chỉ chạy một tiến trình cập nhật manifest cùng lúc.

## Chạy lại

Chạy từ `api-tester/e2e-seeder`, với Node 22 và các dependency đã cài:

```bash
npm run test:auth-client
npm run seed:images
npm run seed:prepare
npm run seed:validate
npm run seed:add
npm run seed:verify
```

`seed:add` chỉ INSERT các ID xác định từ batch, không sửa/xóa dữ liệu có trước. Chạy lại khi đủ 500 listing của batch đã tồn tại sẽ bỏ qua nhập, không reset tồn kho hoặc đánh giá. Nếu batch chỉ nhập một phần hoặc có tồn kho mồ côi, công cụ dừng để đối soát journal; không tự ghi đè.

Không chạy `wipe.js` hoặc chế độ wipe của `run.js` cho batch bổ sung này. `seed:prepare` tạo lại nội dung và ngày bắt đầu; sau khi nhập nên giữ nguyên plan đã áp dụng. `receipt.json` có SHA256 của plan để đối chiếu.

Trải nghiệm có 3 suất dài 3 giờ mỗi ngày để chứa các chương trình 90–180 phút; dịch vụ con có 3 suất dài 2 giờ. Lưu trú dùng `ALL_DAY`.

## Cơ chế nhập

1. Kiểm tra schema plan, URL Cloudinary thuộc cloud đang cấu hình, trạng thái kiểm chứng ảnh, ID không trùng và metadata nguồn gốc seed.
2. Đọc lại tài khoản seed còn hoạt động và quyền: tổ hợp cần ENTERPRISE; listing cần HOST hoặc ENTERPRISE; reviewer cần USER.
3. Mở transaction và advisory lock ở Catalog/Booking; journal riêng ở `.image-migration/expansion/` được gitignore.
4. INSERT địa danh, tổ hợp, dịch vụ và đánh giá trong transaction Catalog; tạo geometry SRID 4326 và các trường tìm kiếm qua trigger sẵn có.
5. INSERT cấu hình/lịch Booking, kiểm tra đủ 96.460 dòng rồi COMMIT Booking.
6. COMMIT Catalog sau Booking, để listing mới có lịch khi xuất hiện trong tìm kiếm. Nếu Catalog chưa commit và Booking đã commit, chỉ bù trừ inventory của batch khi xác nhận không có listing được công bố và không có lock.
7. Ghi receipt và kiểm tra lại các nhóm API qua Gateway.

Hai database không có transaction phân tán: mất kết nối đúng lúc COMMIT có thể cần đối soát journal. Công cụ ưu tiên dừng, giữ lịch/giao dịch đang có; không xóa dữ liệu khi chưa xác định được kết quả commit. Đánh giá được nhập như fixture bằng công cụ bảo trì; không tắt kiểm tra quyền hoặc điều kiện giao dịch của API review, không tạo đơn thanh toán giả.

## Ẩn batch

```bash
npm run seed:hide
```

Lệnh chỉ ẩn listing/tổ hợp theo danh sách ID của batch đã xác minh checksum, giữ địa danh, tồn kho, đánh giá và lịch sử để không làm hỏng tham chiếu của đơn hàng. Không xóa ảnh Cloudinary dùng chung. Hết TTL tìm kiếm tối đa 60 giây, listing ẩn sẽ không còn trong kết quả mới.

## Cấu hình

Credential Cloudinary đọc từ `cloudinary-service/.env` hoặc `MEDIA_ENV_FILE`. Credential DB đọc nội bộ từ `database.yaml` của từng service; không ghi giá trị vào manifest/report. Gateway mặc định `http://127.0.0.1:5555`, có thể đổi bằng `SEED_GATEWAY_URL`.

Nguồn:

- https://vi.wikipedia.org/w/api.php — dữ kiện tên, vị trí, tọa độ và ảnh gốc.
- https://commons.wikimedia.org/w/api.php — tác giả và giấy phép ảnh.
- https://xaydungchinhsach.chinhphu.vn/quoc-hoi-thong-qua-nghi-quyet-sap-xep-don-vi-hanh-chinh-cap-tinh-119250612101356465.htm — đối chiếu tên tỉnh sau sáp nhập.
- https://developers.google.com/maps/documentation/places/web-service/policies — giới hạn lưu nội dung Places.

## Nội dung hiển thị và nguồn ảnh — 05/10/2026

`presentation.js` loại nhãn `[Mẫu]` và đoạn mở đầu DỮ LIỆU MẪU khỏi nội dung xuất bản; `generate-plan.js` áp dụng bước này trước khi ghi plan. Tên thật như Rừng dừa Bảy Mẫu và Đền Mẫu Âu Cơ được giữ nguyên. Đánh giá vẫn xác định là giả lập. Nguồn gốc dịch vụ/đánh giá nằm trong `plan.recordOrigins`, tài liệu và bảng `seed_record_provenance` trong database triển khai. Không thêm trường không được hỗ trợ vào JSON attributes của service.

`clean-presentation.js` mặc định chỉ xem trước, `--apply` cập nhật đúng ID của batch, so sánh giá trị cũ, transaction rollback khi có sửa đồng thời, lưu backup riêng và cập nhật checksum receipt/journal. Chạy lại không tạo thay đổi. Đây là công cụ bảo trì batch đã nhập, không thay thế full seed.

`enforce-image-origin.js` cài 9 CHECK constraint cho các trường thumbnail/gallery/attributes/review/suggestion của Catalog. Tên cloud lấy từ manifest và được đối chiếu với env media. Chỉ chấp nhận ảnh HTTPS `res.cloudinary.com/<cloud>/image/upload/`; dữ liệu trống được phép cho trường không có ảnh. Các constraint được validate trên dữ liệu có sẵn và thử từ chối ảnh ngoài bằng savepoint rollback. Chính sách lưu bền trong PostgreSQL và có hiệu lực cho cả API và INSERT/UPDATE trực tiếp. Chạy công cụ này sau khi dựng database mới; không tự đổi cloud khi dữ liệu còn thuộc cloud cũ.

```bash
node expansion/clean-presentation.js
node expansion/enforce-image-origin.js
```

Các constraint hiện được cài bằng công cụ bảo trì, chưa thuộc lịch sử Flyway. Backup/restore đầy đủ schema PostgreSQL sẽ giữ chúng; một database mới chỉ chạy Flyway cần chạy thêm lệnh trên. Khi đổi Cloudinary cloud phải chuyển dữ liệu, xác minh ảnh và cập nhật chính sách trong cùng đợt bảo trì; không xóa constraint để cho phép hotlink.
