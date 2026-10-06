# Kết quả seed cơ sở thật, ảnh riêng và 50 tài khoản host

Ngày kiểm tra: 05/10/2026. Worktree triển khai: `/home/trungcao/DoANLienNganh-devserver`.
Batch: `gotravel-real-venues-virtual-hosts-2026-10-05-v1`.

## 1. Kết quả database

| Hạng mục | Số lượng |
|---|---:|
| Host cá nhân giả lập | 25 |
| Host doanh nghiệp giả lập | 25 |
| Khách sạn/homestay thật làm nguồn | 64 |
| Khu tổ hợp thuộc host doanh nghiệp | 63 |
| Hạng phòng/lưu trú STAY | 370 |
| Tham quan/trải nghiệm EXP | 92 |
| Ăn uống/spa SVC | 122 |
| Tổng listing mới | 584 |
| Ảnh riêng trong danh mục listing/khu tổ hợp mới | 1.395 |
| Cấu hình tồn kho mới | 584 |
| Dòng lịch mới cho 91 ngày | 72.618 |

Cả 34 tỉnh/thành đều có STAY, EXP và SVC. SVC gồm 79 mục ăn uống và 43 mục spa.
Tất cả 50 host đều được gán dịch vụ. Các cơ sở chia sẻ tài khoản host giả lập
để kiểm thử, không gán tên/giấy tờ của người sở hữu thật vào tài khoản.

### Tài khoản và quyền

- `seed_host_001`–`seed_host_025`: `USER` và `HOST`.
- `seed_enterprise_001`–`seed_enterprise_025`: `USER` và `ENTERPRISE`.
- Tên hiển thị/công ty là GoTravel Seed; email dùng `seed.gotravel.invalid`.
- Hồ sơ APPROVED dùng để thử luồng host; bảng `seed_host_provenance` ghi rõ
  `FICTIONAL_TEST_OPERATOR`. Không tạo CCCD, mã số thuế, giấy phép hay tài khoản
  ngân hàng giả.
- Khu tổ hợp chỉ thuộc host doanh nghiệp. Phòng/dịch vụ trong khu tổ hợp thuộc
  cùng host. Homestay và các hoạt động tham quan độc lập dùng host cá nhân.
- Mật khẩu ngẫu nhiên khác nhau, BCrypt cost 12. File mật khẩu chỉ nằm tại
  `api-tester/e2e-seeder/real-catalog/.private/host-credentials.json`, quyền 0600
  trong thư mục 0700 và đã được Git ignore. `hosts.json` không chứa mật khẩu.

## 2. Phân biệt dữ liệu nguồn với dữ liệu kiểm thử

Tên cơ sở, địa chỉ, tọa độ, tên hạng phòng, diện tích/tiện nghi đã công bố và
ảnh được lấy từ trang cơ sở hoặc nguồn địa lý công khai có dấu vết kiểm tra.
Nguồn đại diện: [booking Mường Thanh](https://booking.muongthanh.com/) và [Mekong Pottery Homestay](https://mekongpotteryhomestay.com/cuisine/). Danh sách từng cơ sở nằm trong CSV nguồn.

Tọa độ được lấy từ bản đồ riêng của cơ sở hoặc đối chiếu bản ghi đúng khách sạn;
không lấy tọa độ meta chung của hệ thống khách sạn cho mọi chi nhánh.

Giá và tồn kho trên GoTravel là dữ liệu kiểm thử; chưa phải thông tin đặt phòng
của đối tác. Mỗi mô tả đều ghi rõ host giả lập và giới hạn này. Hạng phòng có hai
suất/ngày; EXP/SVC có sáu suất ở 09:00 và 14:00, trong 91 ngày từ 05/10/2026.
Các số lượng này không đại diện cho số phòng/suất thật của cơ sở.

Có 33 hạng phòng chưa có diện tích được nguồn công bố. Field bắt buộc được đặt
25 m² để kiểm thử và ghi chú riêng trong mô tả rằng diện tích này chưa xác minh.
Các mặc định về giường, phòng tắm, sức chứa, giờ nhận/trả phòng, chính sách và
thời lượng cần được cơ sở xác nhận nếu chuyển sang kinh doanh thật.

Trong 92 mục EXP, 89 là địa điểm thật với hoạt động tham quan do host giả lập
đứng tên để thử hệ thống; chưa xác minh hợp đồng tour/bán vé. Ba mục dựa trên
tour được Mekong Pottery Homestay công bố, nhưng host và lịch GoTravel vẫn là
kiểm thử. Không nhập review giả: toàn bộ listing mới có 0 review và rating 0.

## 3. Ảnh và dữ liệu cũ

Các URL ảnh của catalog nằm trong Cloudinary cloud `p1kxfhlw`. 1.395 ảnh được
chọn cho listing/khu tổ hợp mới không dùng chung checksum giữa hai bản ghi
khác nhau. Một ảnh thumbnail có thể đồng thời nằm trong gallery của chính bản
ghi đó. Nội thất/kiến trúc tương tự ở các hạng phòng thật vẫn có thể nhìn giống
nhau; không phải mọi nét giống nhau đều là ảnh bị dùng lại.

Quy trình kiểm tra nguồn HTTPS đã xét, dung lượng, độ phân giải, ảnh tĩnh,
SHA-256 và dHash; loại 194 trường hợp ảnh trùng/gần trùng trong staging. Ảnh
được tối ưu WebP, giữ watermark, rồi tải lại từ Cloudinary và đối chiếu checksum
trước khi nhập database. Với Wikimedia bị rate limit, chỉ dùng lại bản sở hữu
đã xác minh của đúng cùng file nguồn, hoặc tải lại có giãn cách.

Đã bỏ 21 nhóm mục không đủ ảnh riêng/phù hợp, gồm hạng phòng bị gắn ảnh spa,
ảnh marketing và hai mục spa chỉ có ảnh minh họa/phối cảnh. 44 lỗi ảnh nguồn
còn trong nhật ký staging (ảnh nhỏ, URL nguồn hỏng/cũ); các URL này không nằm
trong ảnh đang dùng của danh mục mới.

- Ẩn 5.644 listing giả lập cũ và toàn bộ 306 khu tổ hợp giả lập cũ.
- Ẩn một địa danh có ảnh bản đồ thay vì ảnh địa điểm, và 59 địa danh dùng ảnh
  stock chưa xác minh. Còn 168 địa danh ACTIVE có nguồn ảnh Wikimedia.
- Giữ các bản ghi cũ và backup để đối chiếu; không xóa lịch sử đơn hàng.

Ảnh thuộc trang cơ sở vẫn giữ bản quyền nhà xuất bản. Cloudinary cung cấp
hosting, không tự tạo quyền sử dụng thương mại. Cần chốt quyền dùng ảnh và
quan hệ hợp tác trước khi vận hành kinh doanh thật. Với ảnh Wikimedia, credit,
giấy phép và thông tin chuyển WebP được lưu theo nguồn.

Cloudinary tại lần kiểm tra sau upload: khoảng 335 MB storage, 1.611 tài nguyên
trong toàn tài khoản, 3,77/25 credits. Đây là số liệu toàn cloud, gồm cả tài
nguyên cũ; không phải số ảnh riêng của batch mới.

## 4. Những phép kiểm tra đã qua

- Database: đúng host/quyền, cùng chủ sở hữu giữa parent và dịch vụ con, đủ
  cấu hình và lịch, đủ ba nhóm ở 34 tỉnh, ảnh thuộc cloud và đã xác minh.
- So sánh fingerprint trước/sau: đơn hàng, order items, locks, toàn bộ 5.644
  inventory config cũ và 1.053.914 dòng lịch/quantity cũ không thay đổi.
- 16 phép kiểm tra Gateway: tìm kiếm cả ba nhóm, chi tiết/lịch của các bản ghi
  đại diện, danh sách khu tổ hợp. Tìm kiếm trả đúng 370/92/122 bản ghi mới.
- Host cá nhân đại diện xem được 10 dịch vụ của mình. Host doanh nghiệp đại
  diện xem được 14 dịch vụ và ba khu tổ hợp của mình.
- Đăng nhập và lấy session qua `https://gostay.nonnet123.io.vn/` thành công,
  cookie HttpOnly và Secure.
- Build frontend bằng webpack hoàn tất, TypeScript qua và đủ 45 static pages.
  Các trang home/lưu trú/trải nghiệm/dịch vụ/khu tổ hợp được kiểm tra HTTP và
  ảnh trong HTML. Không kiểm tra checkout/thanh toán bằng giao dịch mới.

Một lỗi HTTP cũ được phát hiện: host cá nhân gọi API khu tổ hợp bị chặn quyền
đúng, nhưng service trả `400 Access Denied` thay vì HTTP 403. Host doanh nghiệp
được phép nhận 200. Cần sửa mapping exception để status code đúng; đây không
phải trường hợp cấp quyền quản lý khu tổ hợp cho host cá nhân.

Frontend mới đã được triển khai và restart `gostay-frontend`. Trang chủ và
chi tiết lưu trú/trải nghiệm/dịch vụ/khu tổ hợp qua tên miền công khai đều
trả 200; ảnh nội dung trong HTML của năm trang đại diện đều thuộc Cloudinary
`p1kxfhlw`. Đã bỏ danh mục fallback giả trong frontend và rating 4.8 hardcode
của banner. Đây là kiểm tra HTTP/HTML, không thay cho kiểm thử mọi thao tác
trong trình duyệt.

## 5. Độ phủ và phần chưa hoàn tất

Chưa cân bằng số lượng giữa các tỉnh, chưa chuẩn hóa/đủ dữ liệu đến từng xã.
Nguồn khách sạn Mường Thanh dồi dào ở Nghệ An/Quảng Ninh/Đà Nẵng, trong khi một
số tỉnh mới có một cơ sở được xác minh. Không tạo thêm cơ sở hay dùng ảnh ngẫu
nhiên để làm bằng số lượng. Danh mục này đã phủ ba nhóm trên 34 tỉnh; bảng dưới
là số lượng thực tế, không phải xác nhận đã đạt phân bố đồng đều.

| Tỉnh/thành | STAY | EXP | SVC | Khu tổ hợp |
|---|---:|---:|---:|---:|
| An Giang | 4 | 1 | 2 | 1 |
| Bắc Ninh | 9 | 3 | 5 | 2 |
| Cà Mau | 7 | 1 | 2 | 1 |
| Cao Bằng | 9 | 3 | 2 | 1 |
| Cần Thơ | 6 | 1 | 2 | 1 |
| Đà Nẵng | 36 | 4 | 11 | 5 |
| Đắk Lắk | 6 | 4 | 2 | 1 |
| Điện Biên | 5 | 1 | 3 | 1 |
| Đồng Nai | 4 | 4 | 1 | 1 |
| Đồng Tháp | 5 | 2 | 1 | 1 |
| Gia Lai | 11 | 2 | 5 | 2 |
| Hà Nội | 9 | 6 | 1 | 1 |
| Hà Tĩnh | 9 | 1 | 4 | 2 |
| Hải Phòng | 5 | 1 | 2 | 1 |
| Hồ Chí Minh | 16 | 6 | 4 | 3 |
| Huế | 7 | 6 | 2 | 1 |
| Hưng Yên | 5 | 1 | 1 | 1 |
| Khánh Hòa | 29 | 2 | 11 | 4 |
| Lai Châu | 5 | 1 | 2 | 1 |
| Lạng Sơn | 5 | 1 | 1 | 1 |
| Lào Cai | 8 | 3 | 1 | 1 |
| Lâm Đồng | 13 | 6 | 5 | 2 |
| Nghệ An | 56 | 1 | 20 | 10 |
| Ninh Bình | 7 | 5 | 4 | 2 |
| Phú Thọ | 7 | 4 | 1 | 1 |
| Quảng Ngãi | 4 | 1 | 3 | 1 |
| Quảng Ninh | 30 | 3 | 8 | 5 |
| Quảng Trị | 17 | 4 | 5 | 3 |
| Sơn La | 14 | 1 | 3 | 2 |
| Tây Ninh | 6 | 2 | 1 | 1 |
| Thái Nguyên | 4 | 2 | 1 | 1 |
| Thanh Hóa | 6 | 2 | 3 | 1 |
| Tuyên Quang | 3 | 3 | 2 | 1 |
| Vĩnh Long | 3 | 4 | 1 | 0 |

## 6. Công cụ tìm dữ liệu

- Firecrawl đã kết nối và thực sự đọc được trang cơ sở. Đã dùng để thu thập
  các trang hạng phòng, nhà hàng, spa và tour.
- Google Maps Grounding Lite: initialize và tools/list được, nhưng thực thi
  tìm kiếm nhận `The caller does not have permission`. Hiện chưa dùng được
  để tìm địa điểm. Cần kiểm tra API/quyền và API-key restrictions của project
  Google Cloud; chưa có bằng chứng đủ để kết luận chính xác tùy chọn nào sai.
- Không lấy/copy ảnh hay review Google Maps vào bộ seed này. Nguồn ảnh là trang
  cơ sở và Wikimedia có ghi nhận metadata/giấy phép.

[Hướng dẫn Maps MCP của Google](https://developers.google.com/maps/architecture/grounding-with-maps-mcp).

## 7. File để kiểm tra và chạy lại

- `document/real-catalog-2026-10-05/establishments.csv`: 64 cơ sở và link nguồn.
- `document/real-catalog-2026-10-05/province-coverage.csv`: số lượng theo tỉnh.
- `document/real-catalog-2026-10-05/verification.json`: kiểm tra DB/Gateway.
- `host-management-verification.json`: kiểm tra quyền và đăng nhập thực tế.
- `frontend-production-verification.json`: các trang công khai sau triển khai.
- `api-tester/e2e-seeder/real-catalog/README.md`: quy trình, journal, backup.

Chạy `node api-tester/e2e-seeder/real-catalog/index.js` để kiểm tra batch đã
hoàn thành. Lệnh đã trả `already_completed`; không tạo thêm tài khoản/ảnh và
không reset tồn kho khi lặp yêu cầu. Đừng chạy lại trình seed giả lập/cân bằng
cũ để lấp dữ liệu: chúng có thể đưa các bản ghi stock quay lại.

Backup trước thay đổi: `real-catalog/backups/before-real-catalog.json` (riêng tư,
không đưa vào Git). Booking và Catalog không có distributed transaction;
journal hiện đã là `committed` và đã đối chiếu sau import. Hướng khôi phục nằm
trong README; không xóa inventory hoặc bản ghi đã có giao dịch.
