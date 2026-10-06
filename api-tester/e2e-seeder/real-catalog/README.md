# Danh mục cơ sở thật và tài khoản host kiểm thử

Batch: `gotravel-real-venues-virtual-hosts-2026-10-05-v1`.

Đã nhập: 50 tài khoản giả lập, 584 dịch vụ, 63 khu tổ hợp. Có 370 hạng phòng,
92 hoạt động tham quan/trải nghiệm và 122 dịch vụ ăn uống/spa. Dữ liệu mới có cả
ba nhóm tại 34 tỉnh/thành. Số lượng giữa các tỉnh chưa bằng nhau; chưa có đủ
nguồn để xác minh và cân bằng đến từng xã/phường.

## Chạy lại khi yêu cầu đã hoàn thành

Từ thư mục gốc worktree đang chạy (dùng Node.js 22 cho toàn bộ pipeline; trên server có `/home/nhan/.nodejs-22/bin/node`):

```bash
node api-tester/e2e-seeder/real-catalog/index.js
```

Lệnh kiểm tra dấu vết batch trong database và trả `already_completed`.
Không tạo lại tài khoản, tải ảnh hay thay đổi tồn kho. Giữ nguyên dữ liệu mà
người dùng có thể đã sửa sau đợt seed.

## Tài khoản

- 25 tài khoản `seed_host_001` đến `seed_host_025`: `USER`, `HOST`.
- 25 tài khoản `seed_enterprise_001` đến `seed_enterprise_025`: `USER`, `ENTERPRISE`.
- Email thuộc miền kiểm thử `seed.gotravel.invalid`.
- Hồ sơ `APPROVED` phục vụ kiểm thử; được đánh dấu `FICTIONAL_TEST_OPERATOR`
  trong bảng `Identity.seed_host_provenance`.
- Tên công ty/đại diện là tên giả lập GoTravel Seed. Không dùng người thật,
  mã số thuế, CCCD, giấy phép hay tài khoản ngân hàng giả để nhận diện cơ sở.
- `hosts.json` là danh sách công khai, không chứa mật khẩu.
- Mật khẩu ngẫu nhiên riêng từng tài khoản nằm ở `.private/host-credentials.json`.
  Thư mục có quyền `0700`, file `0600`, được Git ignore. Mật khẩu được băm BCrypt
  cost 12, truyền cho helper qua stdin; không nằm trong tham số dòng lệnh.

Khu tổ hợp chỉ thuộc host doanh nghiệp theo quyền của API hiện có. Các phòng và
dịch vụ con thuộc cùng host với khu tổ hợp. Mekong Pottery Homestay và các hoạt
động tham quan độc lập dùng host cá nhân. Các cơ sở chia sẻ host kiểm thử;
không khẳng định những host này là người sở hữu/vận hành thật.

## Thông tin thật và thông tin kiểm thử

Thông tin thật được lấy từ trang cơ sở và dữ liệu địa lý công khai: tên cơ sở,
địa chỉ, tọa độ đối chiếu, hạng phòng, diện tích/tiện nghi nếu nguồn công bố,
các nhà hàng/spa được cơ sở liệt kê, các tour công bố và ảnh gắn với từng mục.

Giá, sức chứa đặt, số lượng tồn kho, lịch và các cấu hình phòng chưa được nguồn
công bố là dữ liệu kiểm thử. Mô tả từng bản ghi ghi rõ điều này. Có 33 hạng phòng
chưa có diện tích công bố; dùng `25 m²` để đáp ứng field bắt buộc của API, kèm
ghi chú riêng rằng diện tích này chưa xác minh. Giờ nhận/trả phòng, số phòng
ngủ/giường/phòng tắm và các chính sách mặc định phải được cơ sở xác nhận khi
chuyển sang hoạt động thực tế.

Trong 92 mục EXP, 89 là địa điểm thật với hoạt động do host giả lập tổ chức để
kiểm thử; chưa xác minh hợp đồng tour/bán vé. Ba mục còn lại dựa trên tour do
Mekong Pottery Homestay công bố, nhưng GoTravel vẫn dùng host và tồn kho giả lập.
Không nhập đánh giá khách hàng giả: `totalReviews = 0`, `averageRating = 0`.

## Ảnh

`verified-image-allocations.json` lưu phân bổ ảnh. `../cloudinary-images.json`
lưu manifest nguồn → public ID Cloudinary và checksum sau tối ưu. 1.395 file ảnh riêng được sử dụng trong danh mục mới; không dùng cùng checksum ảnh cho hai
listing/khu tổ hợp mới khác nhau. Ảnh thuộc cùng một cơ sở có thể có phong cách,
kiến trúc và nội thất giống nhau.

Quy trình tải chỉ cho phép HTTPS tới các hostname đã xét trong
`approved-image-hosts.json`, giới hạn dung lượng/pixel, không theo redirect tùy
ý. Kiểm tra SHA-256, dHash để loại ảnh giống/gần giống; đổi WebP tối đa 2.560 px,
giữ watermark/credit. Mỗi lần upload phải tải được bản Cloudinary và đối chiếu
checksum/kích thước trước khi được dùng. Với Wikimedia, có thể dùng lại bản
Cloudinary đã xác minh của đúng cùng file nguồn; không thay bằng ảnh ngẫu nhiên.

Đã loại ảnh bản đồ, ảnh quá nhỏ, ảnh sai hạng phòng, poster và hai dịch vụ spa
chỉ có ảnh minh họa/phối cảnh chưa xác minh. Lỗi tải nguồn được ghi riêng và
không được chuyển thành link ảnh lỗi trên website. Thuật toán ảnh gần giống
không đảm bảo phát hiện mọi kiểu crop/biến đổi; việc xác minh cơ sở dựa trên
nguồn xuất bản, không phải khảo sát tại chỗ.

Ảnh Wikimedia giữ thông tin tác giả/giấy phép và credit trong mô tả EXP.
Ảnh từ trang cơ sở vẫn thuộc bản quyền nhà xuất bản. Hosting Cloudinary không
tự tạo quyền sử dụng thương mại; cần chốt quyền sử dụng với cơ sở trước khi
đưa danh mục này vào kinh doanh thật.

## Quy trình batch này

1. `research.js`, `collect-official.js`, `collect-supplemental.js`,
   `collect-attractions.js`: lưu các nguồn đã kiểm tra. Các trang bổ sung được
   Firecrawl tải vào `.cache/supplemental`; không tạo cơ sở từ tên tưởng tượng.
2. `create-hosts.js`: tạo 50 tài khoản trong một transaction Identity. Chạy lại
   giữ mật khẩu/hồ sơ có sẵn. Nếu đã có tài khoản nhưng mất registry mật khẩu,
   dừng và yêu cầu khôi phục registry, tránh ghi file mật khẩu không đăng nhập được.
3. `upload-official-images.js`: một writer duy nhất có `.upload.lock`, ba worker,
   kiểm tra trùng ảnh và hoàn tất Cloudinary trước khi ghi catalog. Có giới hạn
   850 nhóm mục và 1.500 ảnh để phát hiện nguồn mở rộng ngoài dự kiến.
4. `build-plan.js`: tạo plan gồm nguồn, host, listing, parent và inventory.
   Checksum các file nguồn phải giữ nguyên đến lúc apply.
5. `protected-data.js --capture`: ghi fingerprint transaction history và tồn kho
   cũ, chỉ được chụp trước apply, không được ghi đè để làm một phép kiểm tra thất
   bại thành thành công.
6. `apply-plan.js --apply`: backup rồi nhập Catalog/Inventory dưới advisory lock.
   Chỉ ẩn seed cũ, không xóa bản ghi/đơn hàng/tồn kho/locks. Lịch mới 91 ngày;
   hạng phòng có quantity 2/ngày, EXP/SVC có 6 suất ở 09:00 và 14:00. Đây là tồn
   kho giả lập, không phải tồn kho của đối tác thật.
7. `cleanup-legacy-discovery.js --apply`: ẩn 20 khu tổ hợp cũ còn sót và 59 địa
   danh dùng ảnh stock chưa xác minh; tất cả đã có backup trước khi thay đổi.
8. `verify.js`: đối chiếu fingerprint cũ, ownership, role, parent, ảnh, nguồn,
   calendar và API tìm kiếm/chi tiết/lịch trống. Chỉ dùng fingerprint để kiểm
   tra chính đợt migration; sau khi có hoạt động người dùng thật, biến động đơn
   hàng/tồn kho hợp lệ sẽ khiến phép đối chiếu baseline cũ khác đi.

`presentation-patch.json` ghi một chỉnh sửa văn bản sau import: tên hạng phòng đọc được và ghi chú diện tích kiểm thử bằng ngôn ngữ thông thường. `plan.json` giữ nguyên snapshot lúc apply.

Các bước apply đã hoàn thành. Không chạy lại trình seed giả lập cũ hoặc trình
cân bằng cũ để lấp số lượng: chúng có thể tạo lại các dịch vụ dùng ảnh stock.
Một đợt dữ liệu mới cần plan/batch được xét riêng. Không sửa source/plan của batch
đã commit rồi coi `ON CONFLICT DO NOTHING` là cơ chế cập nhật dữ liệu đã có.

## Khôi phục và journal

Backup `backups/before-real-catalog.json` được giữ riêng (`0700`/`0600`), không
đưa vào Git. Phục hồi status của các ID đã ẩn từ backup, thay vì xóa lịch sử.
Nếu rollback batch mới, ẩn các ID trong plan; không xóa inventory/records có
thể đã phát sinh đơn hàng. `.private/transaction-baseline.json` chỉ chứa các
fingerprint, không phải backup để khôi phục.

Hai database không có distributed transaction. Booking commit trước Catalog;
`receipt.json` ghi `inventory_committed_catalog_pending` nếu cần đối chiếu.
Nếu gián đoạn giữa hai commit, kiểm tra các ID của batch và journal trước khi
tiếp tục; không xóa/reset inventory không rõ quyền sở hữu. Batch hiện đã có
trạng thái `committed` và kiểm tra sau import đã qua.

## Kết quả và giới hạn

Xem `document/GOTRAVEL_REAL_CATALOG_2026-10-05.md` và
`document/real-catalog-2026-10-05/` ở thư mục gốc dự án. Dữ liệu đầy đủ theo tỉnh
nằm trong `province-coverage.csv`; không suy diễn số lượng này thành dữ liệu
bằng nhau hay đã phủ mọi xã/phường. Firecrawl dùng được; Google Maps Grounding
Lite hiện nhận lỗi permission khi thực hiện tìm kiếm.
