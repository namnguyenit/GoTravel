# Cân bằng dữ liệu GoTravel theo 34 tỉnh/thành — 05/10/2026

## Kết quả đã triển khai

Đã nhập thành công batch `gotravel-province-balance-2026-10-05-v1` vào database đang phục vụ website. Mỗi tỉnh/thành có **82 nơi lưu trú, 30 trải nghiệm, 54 dịch vụ và 9 tổ hợp** đang ACTIVE. Đã kiểm tra lại qua API Gateway cả 34 tỉnh/thành, không có lỗi HTTP, không trùng ID trong kết quả.

| Nội dung | Trước | Thêm | Sau |
| --- | ---: | ---: | ---: |
| Dịch vụ/listing | 1.020 | 4.624 | 5.644 |
| Tổ hợp/complex | 80 | 226 | 306 |
| Địa danh/landmark | 225 | 3 | 228 |
| Đánh giá | 2.170 | 13.872 | 16.042 |
| Cấu hình tồn kho | 800 | 4.844 | 5.644 |
| Dòng lịch tồn kho | 164.983 | 888.931 | 1.053.914 |

Số lượng STAY toàn hệ thống là 2.788, EXP là 1.020, SVC là 1.836. Có 13 loại hình lưu trú, mỗi tỉnh có 6 bản ghi cho mỗi loại, riêng căn hộ và villa có 8 bản ghi/loại. Có 9 loại SVC, mỗi tỉnh có 6 bản ghi/loại: catering, đầu bếp, làm tóc, trang điểm, massage, nhiếp ảnh, suất ăn chuẩn bị sẵn, spa, huấn luyện.

Địa danh thật không được nhân bản để ép số lượng bằng nhau. Ba tỉnh trước đó thiếu anchor là Hà Tĩnh, Lai Châu và Lạng Sơn được bổ sung trung tâm đô thị có tọa độ, nguồn và ảnh đã kiểm chứng. Mỗi tỉnh có ít nhất một anchor; số địa danh thật theo tỉnh vẫn khác nhau. Các loại dịch vụ, loại hình lưu trú và tổ hợp được cân bằng độc lập.

## Chuẩn hóa tỉnh/thành

Đã đổi 263 trường `province` của dữ liệu cũ về tên tỉnh/thành sau sắp xếp. Giữ ID, tên địa danh cụ thể, tọa độ, vị trí địa lý, giá, chủ sở hữu và quyền SSO. Ví dụ địa điểm tại Quảng Nam được nhóm về Đà Nẵng; Bình Định về Gia Lai; Kiên Giang về An Giang. Tên địa danh cụ thể vẫn giữ để tìm kiếm.

Ánh xạ theo [Nghị quyết sắp xếp cấp tỉnh trên Cổng Chính phủ](https://xaydungchinhsach.chinhphu.vn/quoc-hoi-thong-qua-nghi-quyet-sap-xep-don-vi-hanh-chinh-cap-tinh-119250612101356465.htm). File `balanced/provinces.js` chứa ánh xạ tên cũ/tên mới.

## Thống kê đủ 34 tỉnh/thành

| Tỉnh/thành | Lưu trú | Trải nghiệm | Dịch vụ | Tổ hợp | Địa danh thật |
| --- | ---: | ---: | ---: | ---: | ---: |
| An Giang | 82 | 30 | 54 | 9 | 8 |
| Bắc Ninh | 82 | 30 | 54 | 9 | 3 |
| Cà Mau | 82 | 30 | 54 | 9 | 1 |
| Cao Bằng | 82 | 30 | 54 | 9 | 3 |
| Cần Thơ | 82 | 30 | 54 | 9 | 3 |
| Đà Nẵng | 82 | 30 | 54 | 9 | 20 |
| Đắk Lắk | 82 | 30 | 54 | 9 | 9 |
| Điện Biên | 82 | 30 | 54 | 9 | 3 |
| Đồng Nai | 82 | 30 | 54 | 9 | 4 |
| Đồng Tháp | 82 | 30 | 54 | 9 | 2 |
| Gia Lai | 82 | 30 | 54 | 9 | 7 |
| Hà Nội | 82 | 30 | 54 | 9 | 21 |
| Hà Tĩnh | 82 | 30 | 54 | 9 | 1 |
| Hải Phòng | 82 | 30 | 54 | 9 | 2 |
| Hồ Chí Minh | 82 | 30 | 54 | 9 | 19 |
| Huế | 82 | 30 | 54 | 9 | 16 |
| Hưng Yên | 82 | 30 | 54 | 9 | 1 |
| Khánh Hòa | 82 | 30 | 54 | 9 | 10 |
| Lai Châu | 82 | 30 | 54 | 9 | 1 |
| Lạng Sơn | 82 | 30 | 54 | 9 | 1 |
| Lào Cai | 82 | 30 | 54 | 9 | 11 |
| Lâm Đồng | 82 | 30 | 54 | 9 | 18 |
| Nghệ An | 82 | 30 | 54 | 9 | 3 |
| Ninh Bình | 82 | 30 | 54 | 9 | 13 |
| Phú Thọ | 82 | 30 | 54 | 9 | 6 |
| Quảng Ngãi | 82 | 30 | 54 | 9 | 3 |
| Quảng Ninh | 82 | 30 | 54 | 9 | 12 |
| Quảng Trị | 82 | 30 | 54 | 9 | 7 |
| Sơn La | 82 | 30 | 54 | 9 | 3 |
| Tây Ninh | 82 | 30 | 54 | 9 | 2 |
| Thái Nguyên | 82 | 30 | 54 | 9 | 2 |
| Thanh Hóa | 82 | 30 | 54 | 9 | 4 |
| Tuyên Quang | 82 | 30 | 54 | 9 | 6 |
| Vĩnh Long | 82 | 30 | 54 | 9 | 3 |

[CSV thống kê](province-balance-2026-10-05/province-counts.csv). [Kết quả kiểm kê database](province-balance-2026-10-05/verification.json).

## Nội dung và quan hệ dữ liệu

- Listing mới có mô tả, giá, tọa độ, thumbnail, gallery, tiện nghi/chính sách hoặc lịch trình/điểm hẹn/phạm vi gói theo loại; nội dung không có nhãn `[Mẫu]`.
- Listing mới dùng tài khoản seed đang hoạt động và có quyền HOST/ENTERPRISE. Listing thuộc complex có cùng chủ sở hữu và tỉnh với complex. Mỗi complex mới có ít nhất 2 listing thật trong database, không chỉ có con số trang trí trên giao diện.
- Mỗi listing mới có 3 đánh giá giả lập từ 3 tài khoản USER khác nhau; tổng số review và điểm trung bình khớp database. Bình luận giữ nhãn `[Đánh giá giả lập]` và thông tin không phải đánh giá/giao dịch của khách hàng thật.
- Listing, complex và review là dữ liệu phát triển giả lập, không phải danh sách cơ sở kinh doanh/giá/đánh giá đã được xác thực. Nguồn gốc lưu riêng trong `seed_record_provenance`, plan và tài liệu. Không sao chép đánh giá Google Maps thành đánh giá khách hàng của GoTravel.
- Địa danh bổ sung dùng nguồn công khai và ảnh Commons có tác giả, giấy phép, liên kết credit. Ảnh phòng/dịch vụ là ảnh minh họa, được tái sử dụng trong pool; số listing không đồng nghĩa số ảnh duy nhất.

## Lịch còn chỗ và bảo toàn dữ liệu

Đã bổ sung cấu hình thiếu cho 220 listing cũ và 4.624 listing mới; có lịch đủ 91 ngày từ **05/10/2026 đến 03/01/2027**, theo từng khung giờ cấu hình. Kiểm tra không thiếu tổ hợp listing/ngày/khung giờ. Listing mới có số lượng khả dụng hôm nay.

Calendar chỉ INSERT các dòng còn thiếu với `ON CONFLICT DO NOTHING`. Không ghi đè quantity, trạng thái, version, cấu hình cũ hay khóa giữ chỗ. Một listing cũ đã hết chỗ hôm nay được giữ nguyên; API trả **5.643 listing còn chỗ**, thay vì 5.644. Đây là trạng thái tồn kho hợp lệ, không tăng số lượng để làm đẹp thống kê. Giữ nguyên 2 khóa tồn kho và các đơn/giao dịch hiện có; không tạo thanh toán giả.

Đã so sánh **169,280 bản ghi cũ** ở Catalog/Booking trước và sau, bỏ qua duy nhất `province/updated_at` ở đúng danh sách chủ động chuẩn hóa: **0 thay đổi ngoài phạm vi**. [Bằng chứng bảo toàn](province-balance-2026-10-05/preservation.json).

Booking và Catalog có transaction riêng, không phải transaction phân tán nguyên tử. Có advisory lock, kiểm tra trước commit và journal; Booking commit trước Catalog. Nếu commit bị gián đoạn giữa hai database, seeder dừng và yêu cầu kiểm kê các ID trong applied-plan trước khi chạy lại; không tự xóa lịch có thể đã được sử dụng.

## Ảnh và nhãn hiển thị

Sau đợt cân bằng, quét 5 database service cho thấy **35.672 tham chiếu ảnh / 265 URL ảnh riêng biệt**, tất cả thuộc `https://res.cloudinary.com/p1kxfhlw/image/upload/`. Manifest có **290 asset đã kiểm chứng, 0 lỗi**: 287 asset được tải lại/giải mã/so checksum trong đợt audit trước, 3 ảnh anchor mới được kiểm tra CDN sau upload. Không có URL ảnh DB ngoài cloud này hoặc ảnh chưa kiểm chứng trong manifest; 25 asset còn lại là pool dự phòng.

9 CHECK constraint ở Catalog tiếp tục chặn URL ảnh ngoài cloud, khác cloud và path traversal trong thumbnail, gallery, attributes, review và suggestion. Nhãn `[Mẫu]`/`DỮ LIỆU MẪU` trong nội dung đã bỏ ở đợt trước và không tái xuất hiện sau seed. Tên đúng như Rừng dừa Bảy Mẫu, Đền Mẫu Âu Cơ vẫn được giữ.

[Danh sách URL và số tham chiếu](province-balance-2026-10-05/image-urls.csv). [Bằng chứng CDN và audit ảnh](province-balance-2026-10-05/image-verification.json). [Báo cáo bỏ nhãn/nguồn ảnh trước đợt cân bằng](IMAGE_PRESENTATION_AUDIT_2026-10-05.md).

Phạm vi tự chủ là ảnh nội dung du lịch/lưu trú/trải nghiệm/dịch vụ/tổ hợp. Google Maps iframe, tile OpenStreetMap và QR ở luồng payout vẫn là tích hợp ngoài; URL Wikipedia/Commons/Google Maps trong mô tả là nguồn tham khảo/credit, không phải src ảnh du lịch. Không tuyên bố website không còn mọi kết nối bên thứ ba.

## Trang chủ và triển khai

Đã sửa chọn nhóm tỉnh theo số kết quả thực tế từ API: chỉ hiển thị nhóm có ít nhất 6 thẻ, giới hạn 12 thẻ/hàng dịch vụ. Không lặp lại ID để lấp chỗ trống. Complex cũng chỉ chọn nhóm đủ 6, tối đa 12.

Build Webpack/TypeScript thành công; đã thay bản production `.next` có backup và restart `gostay-frontend`. Đã xóa cache dữ liệu du lịch theo prefix, không FLUSH Redis. Localhost và [website public](https://gostay.nonnet123.io.vn/) đều HTTP 200; trang Bungalow trong ảnh người dùng cũng HTTP 200, bỏ nhãn seed, không có img nội dung trỏ host ngoài.

Kiểm tra HTML đang phục vụ: cả local và public có 12 hàng theo tỉnh gồm 3 complex, 3 STAY, 3 EXP, 3 SVC; mỗi hàng **7–12 thẻ**. API homepage vẫn giới hạn tập kết quả đầu (500 listing mỗi loại, 200 complex), nên nhóm hiển thị có thể ít hơn số lượng trong DB; kiểm tra theo từng tỉnh trả đủ 9 complex. Điều kiện ngày/khách/ẩn dịch vụ có thể giảm kết quả; nhóm không đủ sẽ được bỏ thay vì chèn bản ghi lặp.

[Kiểm tra API cả 34 tỉnh](province-balance-2026-10-05/api-verification.json). [Kiểm tra HTML các hàng](province-balance-2026-10-05/home-carousel-verification.json). [Kiểm tra website/detail](province-balance-2026-10-05/live-verification.json).

## Vấn đề còn ở dữ liệu cũ

**220 listing và 20 complex có host_id không tồn tại trong Identity**, thuộc 24 chủ sở hữu cũ không xác định. Các bản ghi này đã có trước đợt nhập; dữ liệu mới không dùng các chủ sở hữu đó và không gán con mới vào complex có chủ không hợp lệ. Không tự chuyển quyền sở hữu tài sản cũ sang tài khoản khác.

Các thẻ cũ vẫn xem/tìm kiếm được và có cấu hình lịch, nhưng thao tác quản lý của host hoặc luồng cần tra cứu chủ sở hữu có thể lỗi. Cần đối chiếu seed cũ và tài khoản đúng trước khi sửa host_id hoặc ẩn batch cũ. Đợt này xác nhận dữ liệu mới, API đọc/tìm kiếm/ảnh/lịch; không chứng nhận toàn bộ luồng đặt hàng/thanh toán hay tất cả dữ liệu cũ đã hợp lệ.

## Chạy lại và tránh trùng

Trong `api-tester/e2e-seeder`:

```bash
npm run seed:balance:plan
npm run seed:balance
npm run seed:balance:verify
```

Lập kế hoạch mặc định không ghi DB. Seeder tính thiếu hụt theo loại/tỉnh, lấy mức nhiều nhất hiện có làm chỉ tiêu và thêm phần thiếu; không wipe/reset, không xóa bớt để cân bằng. Nếu dữ liệu/lịch đã đủ thì bỏ qua.

Đã chạy lại thực tế sau khi hoàn tất: **`Already complete: no seed writes required`**, mọi số lượng bảng không đổi, không thêm listing/complex/review/calendar. [Bằng chứng chạy lại](province-balance-2026-10-05/idempotence.json). Lịch cuốn theo ngày hiện tại; khi cần nối thêm ngày tương lai, chỉ chèn ngày/slot còn thiếu.

Plan/journal, applied-plan, backup trường province và frontend nằm trong `.image-migration/balanced/`, được Git ignore. Giữ backup riêng để khôi phục có đối chiếu, không đưa credentials vào tài liệu. [Receipt](province-balance-2026-10-05/receipt.json).
