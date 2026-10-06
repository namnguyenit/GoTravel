# Bổ sung dữ liệu thật — đợt v2, 05/10/2026

Đã nhập và kiểm tra: **145 listing (66 STAY, 70 EXP, 9 SVC), 7 complexes, 301 ảnh Cloudinary được dùng**. Thêm dữ liệu từ 16 cơ sở và 64 địa điểm tham quan, phân công cho 38 trong bộ 50 host giả lập đã có.

Báo cáo: [GOTRAVEL_REAL_EXPANSION_2026-10-05.md](../../../document/GOTRAVEL_REAL_EXPANSION_2026-10-05.md).

## Chạy lại

```bash
cd /home/trungcao/DoANLienNganh-devserver
/home/nhan/.nodejs-22/bin/node api-tester/e2e-seeder/real-expansion/index.js --verify
/home/nhan/.nodejs-22/bin/node api-tester/e2e-seeder/real-expansion/index.js --apply
```

Đợt đã commit trả `already_completed`, không seed/upload/tạo tài khoản trùng. `--verify` kiểm tra DB và API đang chạy. Nguồn, phân bổ ảnh và `plan.json` của đợt đã commit được đóng băng bằng checksum; dữ liệu mở rộng sau này cần batchId và namespace khác.

## Dữ liệu

- `centres.json`, `geo-accommodations.json`, `geo-attractions.json`: kết quả tìm ứng viên, không phải danh sách nhập. Tên thành phố trùng được đối chiếu lại tỉnh và tọa độ.
- `page-index*.json`, `source-searches.json`, `fetch-pages.js`: nguồn đã xét, tải trang HTTPS công khai, kiểm tra địa chỉ mạng/redirect/kích thước. HTML thô ở `.cache/`, không commit.
- `official-establishments.json`, `collect-establishments.js`: cơ sở, hạng phòng, dịch vụ và ảnh gắn đúng mục trên trang đơn vị công bố. POI phải đúng tên/vị trí, không dùng tọa độ trung tâm thành phố để giả làm địa chỉ cơ sở.
- `real-attractions.json`, `collect-attractions.js`, `review-attractions.js`: tên/vị trí địa điểm, Commons author/license, loại ảnh điều hướng/khác địa điểm. Đồi A1 có nguồn riêng từ Ban Quản lý di tích và Geoapify; dữ liệu nghiên cứu được giữ trong `commons-dienbien.json`, `geo-a1.json`.
- `prepare-image-baseline.js`: dấu ảnh của 1.506 URL đang dùng trước nhập; kết hợp SHA-256 và dHash để tránh dùng lại ảnh.
- `upload-images.js`: tải ảnh đúng nguồn vào Cloudinary, kiểm tra giao ảnh sau tải; một writer giữ lock của manifest chung. Chạy bị ngắt giữ checkpoint; lock chỉ được thu hồi nếu PID cũ không còn chạy.
- `image-review-sheets.js`, `review-publisher-photos.js`: bảng ảnh để kiểm tra trực quan, loại logo/bản đồ/ảnh gắn nhãn sai, chọn ảnh đại diện và phân biệt private room/dorm của Lila theo trang công bố.
- `plan.json`, `build-plan.js`, `stable-id.js`: kế hoạch mới với ID ổn định riêng, không dùng namespace của đợt cũ.
- `apply-plan.js`, `receipt.json`: nhập thêm trong Catalog/Booking, validate host, advisory lock, journal khi commit hai DB, bảo toàn dữ liệu cũ.
- `verification.json`, `verify.js`: kết quả kiểm tra số dòng, ownership, provenance, ảnh, lịch và 18 yêu cầu API qua Gateway/tên miền công khai.
- `write-report.js`: báo cáo Markdown và CSV nguồn/ảnh, không xuất backup hoặc thông tin đăng nhập.

## Điều kiện nhập

Ảnh phải được trang cơ sở gắn đúng hạng mục hoặc được metadata Commons xác định đúng địa điểm; không bổ sung ảnh khách sạn khác để lấp chỗ thiếu. Ảnh tĩnh JPEG/PNG/WebP, cạnh ngắn ít nhất 360 px; bỏ lỗi tải, logo, bản đồ và ảnh không chứng minh được đối tượng. Ảnh trùng/gần trùng với catalog đang hoạt động hoặc giữa các bản ghi mới bị loại. Ảnh đã upload nhưng bị loại trong kiểm tra trực quan không được gắn vào DB.

Mỗi nguồn Commons giữ giấy phép và tác giả theo từng ảnh. Ảnh từ website cơ sở giữ bản quyền bên công bố; chuyển ảnh sang Cloudinary không chuyển quyền sở hữu.

Host, giá, sức chứa đặt và lịch là dữ liệu kiểm thử, ghi rõ trong mô tả. Thông số chưa được công bố cần xác nhận, không giả thành thông tin đã được cơ sở chứng thực. Không tạo review/rating của khách thật.

## Bảo toàn và phục hồi

Backup trong `backups/` dùng quyền thư mục 0700, file 0600 và bị Git bỏ qua. Checksum trước/sau bao gồm catalog cũ, reviews, provenance, toàn bộ lịch/cấu hình tồn kho cũ, locks, orders và order_items. Đợt mới chỉ INSERT vào ID thuộc namespace riêng; không UPDATE/DELETE bản ghi cũ.

Nếu journal ở `inventory_committed_catalog_pending`, chạy lại `index.js --apply` với đúng checksum kế hoạch để hoàn tất Catalog; các lịch đã tạo không được ghi đè. Việc phục hồi sau khi có đơn đặt mới cần đối chiếu đơn và locks trước khi thao tác, giữ snapshot đơn và tồn kho.

Số lượng giữa 34 tỉnh/thành còn chênh lệch. Đợt v2 ưu tiên tỉnh có ít lưu trú, không tạo cơ sở/ảnh giả để đủ số; chi tiết trước/sau ở báo cáo.
