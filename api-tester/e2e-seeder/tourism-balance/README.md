# Cân bằng catalog GoTravel — 09/10/2026

Batch `gotravel-tourism-balance-2026-10-09-v3` đã nhập: **170 listing, 17 complex, 220 ảnh Cloudinary khác nhau**. Ẩn **340 listing và 27 complex Mường Thanh** dư thừa; bảo toàn đơn hàng và tồn kho cũ.

Catalog đang hoạt động: **171 STAY, 244 EXP, 146 SVC**. Mường Thanh chiếm **58/171 = 33,9%** lưu trú, giảm từ 330/437 = 75,5%. Các complex mới là khu du lịch/công viên có trải nghiệm và tiện ích gắn đúng khu, thay vì nhân bản phòng khách sạn.

Báo cáo và link xem dữ liệu: [GOTRAVEL_TOURISM_BALANCE_2026-10-09.md](../../../document/GOTRAVEL_TOURISM_BALANCE_2026-10-09.md).

## Kiểm tra hoặc chạy lại

```bash
cd /home/trungcao/DoANLienNganh-devserver
node api-tester/e2e-seeder/tourism-balance/verify.js
node api-tester/e2e-seeder/tourism-balance/apply-plan.js --apply
```

Lệnh apply với batch đã hoàn thành trả `already_completed`, không thêm tài khoản, upload hay nhập bản ghi trùng. Lệnh verify kiểm tra database, ownership, nguồn, ảnh, tồn kho, API chi tiết, tìm kiếm và complex qua Gateway/tên miền công khai. `audit.js --after` cập nhật thống kê catalog hiện tại.

Node đang dùng trên server: `/home/nhan/.nodejs-22/bin/node`. Cấu hình database đọc qua helper `../expansion/db.js`; Cloudinary dùng `cloudinary-service/.env`; Redis dùng `search-and-recommendation/.env`. Không ghi khóa hoặc mật khẩu vào artifact của batch.

## Dữ liệu và quy trình

1. `audit-before.json`, `active-image-baseline.json`: kiểm kê 731 listing/70 complex và 1.702 URL ảnh trước đợt nhập.
2. `page-index.json`, `fetch-pages.js`, `location-sources.json`, `geo-candidates*.json`, `horse-location.json`: nguồn ứng viên, trang cơ sở và bằng chứng vị trí. Kết quả POI sai tên/vị trí bị loại. HTML gốc và ảnh tạm nằm trong `.cache/`.
3. `collect.js`, `official-catalog.json`: 19 cơ sở/nhà cung cấp, 179 hạng mục nghiên cứu. Chỉ lấy hạng mục và ảnh được trang cơ sở công bố. Không tạo phòng cho công viên không có thông tin lưu trú; không chuyển gói lưu trú ngoài khu vào I-Resort.
4. `prepare-images.js`, `stage-images.js`: fingerprint SHA-256/dHash; tránh dùng lại ảnh cũ hoặc ảnh gần trùng với Hamming ≤ 4; kiểm tra ảnh tĩnh/cạnh ngắn ≥ 360px. Ảnh được tối ưu và xác minh giao ảnh qua helper chung `../image-store.js`, có lock manifest.
5. `review-images.js`, `supplement-room-photos.js`, `photo-review.json`: kiểm tra bảng ảnh bằng mắt, bỏ phối cảnh/menu/ảnh khác dịch vụ và hai show trùng; chọn ảnh giường cho phòng Triple/Senior; dùng ảnh thật trong khu làm cover thay phối cảnh; đối chiếu và sửa tên đại tượng Fansipan. Không dùng ảnh cơ sở khác để bù.
6. `build-plan.js`, `plan.json`: ID ổn định trong namespace riêng, owner hợp lệ, typed JSONB cho 3 nhóm/8 loại tiện ích mới, inventory kiểm thử 91 ngày. Chỉ lập kế hoạch ẩn các bản ghi seed Mường Thanh; giữ một complex đại diện và các phòng/tiện ích mỗi tỉnh có nguồn, bảo vệ listing đã có đơn và lock đang giữ.
7. `apply-plan.js`, `receipt.json`: kiểm tra checksum và chủ sở hữu; transaction Catalog/Booking; advisory lock; kiểm tra fingerprint trước khi ẩn; backup riêng quyền 0700/0600; checksum dữ liệu được bảo vệ; journal phục hồi khi hai database commit lần lượt. Trong giao dịch ngắn có SHARE lock order_items để tránh đơn mới tham chiếu bản ghi đang chuẩn bị ẩn. Chỉ đổi status/updated_at của các bản ghi cũ trong kế hoạch; không DELETE, không viết lại lịch cũ hoặc đơn hàng.
8. `clear-catalog-cache.js`: xóa đúng các namespace gợi ý catalog sau commit, không flush Redis hoặc phiên đăng nhập.
9. `verify.js`, `verification.json`, `browser-check.js`: bằng chứng DB/API; trình duyệt kiểm tra complex, listing STAY/EXP/SVC, ảnh nhìn thấy và lỗi JavaScript. Browser helper phụ thuộc Playwright của môi trường hiện tại tại `/tmp/gateway-browser-tools`, không phải điều kiện để apply dữ liệu.

Nguồn/plan/ảnh của batch có journal được đóng băng. Muốn bổ sung tiếp phải dùng batchId và namespace mới. Không chạy lại collect/build/stage để thay nội dung batch đã nhập.

## Phạm vi dữ liệu thật

Tên cơ sở, hạng mục, vị trí, thông tin phòng/giường và ảnh được đối chiếu nguồn công khai. Host là tài khoản kiểm thử đã được tạo trong đợt trước; giá, thời lượng đặt, số lượng và lịch là giả lập, được ghi rõ trong mô tả và provenance. Không tạo đánh giá/rating giả. Một hạng mục nằm trong vé vào cổng không được mô tả thành vé lẻ chính thức.

Ảnh từ website cơ sở giữ bản quyền của bên phát hành; chuyển lên Cloudinary không thay đổi quyền sử dụng. `plan.json`, `verified-image-allocations.json` và CSV ảnh giữ URL nguồn, credit và URL Cloudinary để truy vết.
