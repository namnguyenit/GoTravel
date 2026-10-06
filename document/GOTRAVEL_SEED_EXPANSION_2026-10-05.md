# Kết quả bổ sung dữ liệu và ảnh GoTravel — 05/10/2026

## 1. Kết quả thực tế

Đã nhập trên database đang phục vụ hệ thống từ worktree `DoANLienNganh-devserver`. Batch `gotravel-expansion-2026-10-04-v1`. Đây là nhập bổ sung, không chạy wipe.

| Dữ liệu | Trước | Thêm | Sau |
|---|---:|---:|---:|
| Địa danh | 125 | 100 | 225 |
| Tổ hợp | 50 | 30 | 80 |
| Dịch vụ | 520 | 500 | 1020 |
| Đánh giá | 670 | 1500 | 2170 |
| Cấu hình tồn kho | 300 | 500 | 800 |
| Dòng lịch còn chỗ | 68523 | 96460 | 164983 |

Lịch mới có **91 ngày**, từ `2026-10-05` tới `2027-01-03`. STAY dùng `ALL_DAY`; EXP có 3 suất 3 giờ/ngày, đủ chứa chương trình 90–180 phút; SVC có 3 suất 2 giờ/ngày. Mỗi dịch vụ có 3 đánh giá từ 3 tài khoản seed khác nhau, điểm trung bình và số lượng được đối soát. Cả 30 tổ hợp có phòng trực thuộc, tối thiểu 2 phòng/tổ hợp.

### Các nhóm dịch vụ

| Nhóm | Số mục mới |
|---|---:|
| STAY | 220 |
| EXP | 140 |
| PHOTOGRAPHY | 16 |
| CHEF | 16 |
| MASSAGE | 16 |
| PREPARED_MEALS | 16 |
| TRAINING | 16 |
| MAKEUP | 15 |
| HAIR_STYLING | 15 |
| SPA | 15 |
| CATERING | 15 |

## 2. Dữ liệu thực và dữ liệu giả lập

**100 địa danh** là các địa điểm thực có tên, tọa độ, mô tả riêng, ảnh, nguồn tham chiếu và link Google Maps; phân bố ở **28 tỉnh/thành**. Tỉnh thành được đối chiếu với nội dung trang nguồn và tên sau sáp nhập năm 2025. Những khu bảo tồn trải nhiều tỉnh dùng khu vực tham quan chính được ghi nhận; tọa độ không thay thế xác nhận địa chỉ hành chính hoặc lối vào chính thức.

**500 dịch vụ, 30 tổ hợp, giá, tiện nghi, vị trí nhà cung cấp, lịch và 1.500 đánh giá là fixture phát triển.** Tên cơ sở có `[Mẫu]`, mô tả ghi rõ `DỮ LIỆU MẪU`, đánh giá có `[Đánh giá mẫu/giả lập]`. Không khẳng định khách sạn/nhà cung cấp đang kinh doanh thật hoặc có khách đã mua dịch vụ. Không tạo đơn hàng/thanh toán giả; không đổi điều kiện xác thực và kiểm tra giao dịch của API review.

Mô tả lưu trú gồm diện tích, số khách, phòng ngủ/giường/phòng tắm, tiện nghi, nhận/trả phòng và chính sách. Trải nghiệm có thời lượng, nhóm, ngôn ngữ, điểm hẹn, hành trình, bao gồm/không bao gồm. Dịch vụ con có cấu hình riêng và logistics. Mô tả dịch vụ dài ít nhất 1033 ký tự; nhận xét mẫu dài ít nhất 292 ký tự.

Không nhập Google Places API trong batch này. Link Google Maps là đường dẫn tra cứu được tạo từ tên và tọa độ nguồn; không tuyên bố được Google xác thực. Ảnh và đánh giá Google Maps không được sao chép sang Cloudinary. Xem [chính sách Google Places](https://developers.google.com/maps/documentation/places/web-service/policies).

Nguồn tên tỉnh sau sáp nhập: [Cổng thông tin Chính phủ](https://xaydungchinhsach.chinhphu.vn/quoc-hoi-thong-qua-nghi-quyet-sap-xep-don-vi-hanh-chinh-cap-tinh-119250612101356465.htm). Từng địa danh có URL trang dữ kiện trong CSV nguồn ảnh bên dưới.

## 3. Ảnh và Cloudinary

- Kiểm tra lại **187/187 ảnh cũ**: tải CDN, giải mã, kiểm tra kích thước/định dạng và SHA256 đều đạt.
- Bổ sung **100 ảnh địa danh mới**, mỗi địa danh có ảnh riêng trên Cloudinary; toàn bộ đã tải lại và kiểm chứng.
- Manifest hiện có **287 asset Cloudinary đã kiểm chứng**. Catalog dùng **6.565 tham chiếu ảnh / 262 URL khác nhau**; **0 URL ngoài Cloudinary, 0 URL chưa kiểm chứng**. Các asset còn lại nằm trong pool dự phòng/avatar/front end.
- Ảnh lưu trú/dịch vụ dùng pool phù hợp từng nhóm đã chuyển Cloudinary; 500 bản ghi sử dụng ảnh minh họa chung, không phải 500 bộ ảnh khách sạn thật.
- 9 URL Unsplash HTTP 404 được phát hiện trong lần kiểm tra nguồn cũ trước đó đã được loại khỏi pool dự phòng. Chúng có 0 tham chiếu trong seed/database tại thời điểm kiểm tra; không bị giữ lại trong dữ liệu hiện tại.
- Một lần tải nguồn Wikimedia trả HTTP 429; đã chờ đúng `Retry-After` 600 giây và tải lại thành công. Đây là giới hạn tạm thời, không phải ảnh hỏng còn tồn đọng.
- Ảnh mới chỉ nhận CC BY, CC BY-SA, CC0 hoặc Public domain. Lưu tác giả, nguồn, giấy phép và thông tin chuyển WebP; credit được đưa vào mô tả địa danh/trải nghiệm.

Media Service đang online tại `127.0.0.1:5001`, có env Cloudinary hợp lệ (cloud `p1kxfhlw`). Test upload qua API trả **200**, ảnh CDN trả **200** và giải mã được; xóa ảnh test trả **200**. Upload không xác thực qua service và Gateway đều bị từ chối **401**. Bí mật không được đưa vào báo cáo.

## 4. Đối soát và kiểm tra API

Đã đối chiếu hash của **70.188 bản ghi có trước** ở Catalog/Booking: **0 bị xóa, 0 bị sửa**. Công cụ chỉ ghi dữ liệu của batch mới. Không đổi quyền của tài khoản thật; sử dụng các tài khoản seed đã có. Tổ hợp thuộc tài khoản ENTERPRISE; phòng trực thuộc có cùng chủ sở hữu.

| Nhóm | Chi tiết | Đánh giá | Lịch còn chỗ | Tìm kiếm |
|---|---|---|---|---|
| STAY | Đạt | 3 đánh giá | 3 dòng / 3 ngày | 100 kết quả |
| EXP | Đạt | 3 đánh giá | 9 dòng / 3 ngày | 100 kết quả |
| PHOTOGRAPHY | Đạt | 3 đánh giá | 9 dòng / 3 ngày | 16 kết quả |
| CHEF | Đạt | 3 đánh giá | 9 dòng / 3 ngày | 16 kết quả |
| MASSAGE | Đạt | 3 đánh giá | 9 dòng / 3 ngày | 16 kết quả |
| PREPARED_MEALS | Đạt | 3 đánh giá | 9 dòng / 3 ngày | 16 kết quả |
| TRAINING | Đạt | 3 đánh giá | 9 dòng / 3 ngày | 16 kết quả |
| MAKEUP | Đạt | 3 đánh giá | 9 dòng / 3 ngày | 15 kết quả |
| HAIR_STYLING | Đạt | 3 đánh giá | 9 dòng / 3 ngày | 15 kết quả |
| SPA | Đạt | 3 đánh giá | 9 dòng / 3 ngày | 15 kết quả |
| CATERING | Đạt | 3 đánh giá | 9 dòng / 3 ngày | 15 kết quả |

Danh sách địa danh công khai có đủ 100 ID mới. Autocomplete tìm được **Thác Bản Giốc**. Kiểm tra database bao phủ toàn bộ 500 listing và JSON attributes, tổng 1.500 review/điểm trung bình, 500 cấu hình inventory, 96.460 dòng lịch, geometry SRID 4326 và các trường tìm kiếm đã normalize. Website công khai trả **HTTP 200**. Tìm kiếm không truyền ngày cũng trả được dịch vụ mới cho STAY, EXP và SVC sau khi qua ngày mới theo múi giờ Việt Nam.

## 5. Sửa tương thích seeder và đăng nhập

- `api-client.js` nhận cookie HttpOnly từ Gateway, giữ cookie trong bộ nhớ theo origin, gửi CSRF header cho thao tác ghi, chặn chuyển credential sang origin khác; không còn bắt buộc token xuất hiện trong JSON đăng nhập.
- Không gửi `X-User-Id` tự khai từ client. Fixture ảnh giấy tờ cũ vốn chỉ là chuỗi `fake-front-image`/`fake-back-image` được đổi sang PNG hợp lệ có chữ `TEST FIXTURE - NOT AN ID DOCUMENT`. Batch hiện tại không xin quyền bằng các giấy tờ mẫu này.
- Test cookie/CSRF, logout xóa session và chặn origin khác: **đạt**.
- Kiểm tra live phát hiện Gateway timeout đăng nhập. Identity có BCrypt cost 15 trong khi script deploy giới hạn JIT ở tier 1. Đã bật tier 4 riêng Identity, restart Identity và kiểm tra lại thành công: đăng nhập **5751 ms**, đọc hồ sơ và logout qua CSRF đều đạt; token không xuất hiện trong JSON đăng nhập. Không giảm cost BCrypt, không nới quyền hay bỏ CSRF. Đây là kết quả kiểm tra một phiên, không phải benchmark tải cao.

## 6. Công cụ, bằng chứng và chạy lại

- [Hướng dẫn công cụ seed](../api-tester/e2e-seeder/expansion/README.md)
- [Plan đầy đủ: mô tả, attributes, reviews và inventory](../api-tester/e2e-seeder/expansion/plan.json)
- [CSV 500 dịch vụ](gotravel-seed-2026-10-05/listings.csv)
- [100 địa danh, Google Maps và credit ảnh](gotravel-seed-2026-10-05/landmarks-and-photo-credits.csv)
- [9 nguồn ảnh cũ lỗi 404](gotravel-seed-2026-10-05/old-broken-image-sources.csv)
- [Receipt và số lượng trước/sau](gotravel-seed-2026-10-05/receipt.json)
- [Kiểm tra database và API](gotravel-seed-2026-10-05/verification.json)
- [Đối soát dữ liệu có trước](gotravel-seed-2026-10-05/existing-preservation.json)
- [Tìm kiếm mặc định không truyền ngày](gotravel-seed-2026-10-05/default-date-search.json)
- [Media API](gotravel-seed-2026-10-05/media-api-check.json)
- [Đăng nhập live](gotravel-seed-2026-10-05/auth-client-check.json)

Chạy từ `api-tester/e2e-seeder`:

```bash
npm run seed:validate
npm run seed:add
npm run seed:verify
```

`seed:add` bỏ qua nhập khi đủ 500 ID của batch đã tồn tại; không reset phòng/lịch hoặc ghi đè dữ liệu hiện có. Khi muốn ẩn batch khỏi tìm kiếm, dùng `npm run seed:hide`; giữ dữ liệu để không làm hỏng lịch sử đơn hàng. Không chạy chế độ wipe cũ.

Hai database dùng transaction riêng: inventory commit trước Catalog, có journal và kiểm tra trước bù trừ. Nếu mất kết nối đúng lúc COMMIT hoặc xuất hiện lock/giao dịch, công cụ dừng để đối soát, không tự xóa dữ liệu đang được dùng.

Plan SHA256 cuối: `05cd0f8e8c855fcf52c3544baaf50ff6d09b6681a1f29c08d7d22407145a7d86`.

## 7. Giới hạn cần nhớ

Dữ liệu đánh giá và nhà cung cấp chỉ phục vụ phát triển/demo. Muốn chuyển sang bán dịch vụ thật cần nhà cung cấp xác nhận nội dung, giá, giấy tờ và lịch vận hành. Không sử dụng nhận xét mẫu như đánh giá của khách thật. Dữ kiện địa danh và ảnh có nguồn, nhưng giờ mở cửa, giá vé và điều kiện tuyến không được xác minh theo thời gian thực trong batch này.
