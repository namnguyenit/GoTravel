# Cân bằng dịch vụ GoTravel — 09/10/2026

## Kết quả đã triển khai

Đã áp dụng vào database của bản đang chạy tại `/home/trungcao/DoANLienNganh-devserver`. Batch `gotravel-tourism-balance-2026-10-09-v3` hoàn thành lúc `2026-10-09T08:36:04.288Z`. Website: [GoTravel](https://gotravel.trungcaodev.io.vn/).

Đã bổ sung **17 complex thật, 170 dịch vụ con và 220 ảnh Cloudinary khác nhau**; ẩn 340 listing và 27 complex Mường Thanh dư thừa. Các mục đã có đơn được giữ lại. Không xóa dữ liệu lịch sử.

| Nhóm | Trước | Sau | Tỷ trọng sau |
|---|---:|---:|---:|
| Lưu trú | 437 | 171 | 30.5% |
| Trải nghiệm | 162 | 244 | 43.5% |
| Dịch vụ tiện ích | 132 | 146 | 26.0% |
| Tổng listing đang hoạt động | 731 | 561 | 100% |

**Mường Thanh:** 330/437 lưu trú (75,5%) → **58/171 (33,9%)**. Dịch vụ tiện ích Mường Thanh giảm từ 113 xuống 45. Toàn catalog còn 60 complex hoạt động; trước đó có 70 complex nhưng toàn bộ là khách sạn và không có trải nghiệm bên trong. Hiện có thêm 17 tổ hợp du lịch/công viên thực sự và 82 trải nghiệm con mới.

## Complex mới và dịch vụ bên trong

Bản ghi cha có `complexes.id`; mỗi dịch vụ con có `listings.complex_id` và dùng cùng host doanh nghiệp với complex. Dịch vụ chụp ảnh/trang điểm lưu động dùng host cá nhân và không bị gán vào một khu du lịch không liên quan.

| Complex | Tỉnh/thành hiện hành | Phòng | Trải nghiệm | Tiện ích |
|---|---|---:|---:|---:|
| [VinWonders Nha Trang](https://gotravel.trungcaodev.io.vn/complex/68f46632-6258-5329-9bc2-3022ca694a4f/detail) | Khánh Hòa | 0 | 9 | 9 |
| [VinWonders Phú Quốc](https://gotravel.trungcaodev.io.vn/complex/d8d2c8b9-536f-53fb-a7b9-ce425a87392c/detail) | An Giang | 0 | 11 | 8 |
| [VinWonders Nam Hội An](https://gotravel.trungcaodev.io.vn/complex/a2f8c758-57d0-5859-a3a5-6a5162dcb8b8/detail) | Đà Nẵng | 0 | 8 | 8 |
| [VinWonders Cửa Hội](https://gotravel.trungcaodev.io.vn/complex/d562f206-a45e-5f26-94cb-012a595f46fb/detail) | Nghệ An | 0 | 5 | 3 |
| [Vinpearl Safari Phú Quốc](https://gotravel.trungcaodev.io.vn/complex/33e8d9c0-782f-50b7-88df-e165ae451420/detail) | An Giang | 0 | 9 | 2 |
| [Grand World Phú Quốc](https://gotravel.trungcaodev.io.vn/complex/4d46edd3-c287-526b-98a7-c81df0138954/detail) | An Giang | 0 | 8 | 0 |
| [VinWonders Vũ Yên](https://gotravel.trungcaodev.io.vn/complex/b5505d5f-3f13-5d1a-99f7-b22d3363f160/detail) | Hải Phòng | 0 | 3 | 2 |
| [VinWonders Wave Park & Water Park](https://gotravel.trungcaodev.io.vn/complex/46ff9109-211b-5bcb-ad14-3ced8a9925b8/detail) | Hưng Yên | 0 | 3 | 3 |
| [Vinpearl Horse Academy Vũ Yên](https://gotravel.trungcaodev.io.vn/complex/18fee95f-83d2-5664-ba15-2cde065a448e/detail) | Hải Phòng | 0 | 5 | 6 |
| [Sun World Bà Nà Hills](https://gotravel.trungcaodev.io.vn/complex/15d4fa60-780b-5315-94e0-9439bb8b4785/detail) | Đà Nẵng | 0 | 9 | 7 |
| [Sun World Hạ Long](https://gotravel.trungcaodev.io.vn/complex/91fe8777-836f-5098-aab3-d481695d6ee2/detail) | Quảng Ninh | 0 | 6 | 0 |
| [Sun World Hòn Thơm](https://gotravel.trungcaodev.io.vn/complex/f4a56a31-f90f-5d2a-a28f-d6866628dc23/detail) | An Giang | 0 | 1 | 3 |
| [Sun World Hà Nam](https://gotravel.trungcaodev.io.vn/complex/311f20c9-7d6a-5474-9433-0ce7f51d5897/detail) | Ninh Bình | 0 | 2 | 0 |
| [Sun World Fansipan Legend](https://gotravel.trungcaodev.io.vn/complex/d98e4781-6930-5bde-ad53-10a6187e90b9/detail) | Lào Cai | 0 | 1 | 0 |
| [Sun World Núi Bà Đen](https://gotravel.trungcaodev.io.vn/complex/e63695bd-f100-54ca-90a6-d0a6582f46e4/detail) | Tây Ninh | 0 | 1 | 0 |
| [Công viên suối khoáng nóng Núi Thần Tài](https://gotravel.trungcaodev.io.vn/complex/433e963b-0ed3-54a9-9e4d-cc7668850088/detail) | Đà Nẵng | 6 | 1 | 9 |
| [Suối khoáng nóng I-Resort Nha Trang](https://gotravel.trungcaodev.io.vn/complex/f36cadae-3337-5d60-b82e-5b11ba3e0870/detail) | Khánh Hòa | 0 | 0 | 11 |

### Các nhóm đã bổ sung

- **Vui chơi và trải nghiệm:** công viên nước, trò chơi, show/parade, tham quan safari, khu văn hóa, cáp treo, tham quan công trình, học và chăm sóc ngựa. Có ghi rõ các hạng mục được bao gồm trong vé vào cổng/phân khu; không xác nhận vé lẻ hoặc nhân bản giá vé thật.
- **Tiện ích trong khu:** nhà hàng, cà phê, buffet, tiệc/gala, tắm khoáng, onsen, tắm bùn, massage, chụp ảnh.
- **Tiện ích theo địa điểm thỏa thuận:** chụp ảnh cưới/gia đình/cặp đôi/chân dung/cầu hôn, trang điểm cô dâu/khách dự tiệc/chụp ảnh, làm tóc. Tọa độ Hội An cho nhà cung cấp lưu động được mô tả là mốc khu vực, không giả làm cửa hàng.
- **Lưu trú tại Núi Thần Tài:** Superior Double, Superior Twin, Deluxe Double, Deluxe Triple, Senior Deluxe Double, VIP SPA. Lưu diện tích, loại/số giường và sức chứa theo nguồn; Triple có giường queen + giường đơn. VIP SPA là tên phòng, không nhập nhầm thành dịch vụ spa.
- **Khách sạn cũ:** giữ các hạng phòng và tiện ích đã xác minh; chỉ ẩn phần Mường Thanh dư thừa. Không gắn phòng không có nguồn vào Sun World/VinWonders.

### Các loại dịch vụ tiện ích

| Loại | Trước | Thêm mới | Ẩn dư thừa | Sau |
|---|---:|---:|---:|---:|
| `CATERING` | 0 | 1 | 0 | 1 |
| `HAIR_STYLING` | 0 | 1 | 0 | 1 |
| `MAKEUP` | 0 | 5 | 0 | 5 |
| `MASSAGE` | 0 | 1 | 0 | 1 |
| `PHOTOGRAPHY` | 0 | 6 | 0 | 6 |
| `PREPARED_MEALS` | 85 | 52 | 47 | 90 |
| `SPA` | 46 | 14 | 21 | 39 |
| `TRAINING` | 1 | 2 | 0 | 3 |

## Cách giảm Mường Thanh và bảo toàn dữ liệu

- Chỉ tác động các bản ghi đã được provenance xác định là seed; không đụng bản ghi do người dùng thực tạo.
- Giữ một complex Mường Thanh đại diện tại mỗi tỉnh có nguồn, với hai hạng phòng và dịch vụ ăn uống/spa nếu có. Giữ thêm mọi listing có đơn hoặc lock đang giữ. Có **6 listing Mường Thanh đã được đơn hàng tham chiếu** được bảo vệ.
- Đổi trạng thái phần dư sang `HIDDEN`; complex chỉ bị ẩn khi không còn dịch vụ con hoạt động.
- Kiểm tra fingerprint từng bản ghi và tham chiếu đơn ngay trước apply. Không DELETE, không thay giá/ảnh/thuộc tính của bản ghi cũ, không viết lại inventory cũ, không viết lại đơn hàng hoặc đánh giá.
- Backup Catalog được lưu trong thư mục riêng bị Git ignore, quyền thư mục 0700 và file 0600. So sánh checksum xác nhận dữ liệu ngoài phạm vi thay đổi được bảo toàn và các trường của bản ghi được ẩn, ngoài status/updated_at, không đổi.
- Dùng lại **19 trong 50 host kiểm thử hiện có**: 17 doanh nghiệp cho các complex và 2 cá nhân cho nhà cung cấp lưu động. Không tạo thêm tài khoản trùng.

## Ảnh và nguồn

- Đã kiểm kê **1.702 URL ảnh** đang dùng trước đợt nhập; lấy SHA-256/dHash để tránh tái sử dụng ảnh.
- Đã stage 232 ảnh, kiểm tra trực quan từng bảng ảnh và dùng **220 ảnh** cho 187 bản ghi mới (170 listing + 17 complex).
- 220 ảnh mới không chia sẻ hash giữa các bản ghi mới và không trùng/gần trùng với ảnh đang hoạt động trước đó theo SHA-256 và ngưỡng dHash Hamming ≤ 4. Kiểm tra hash là bộ lọc hỗ trợ, cùng đối chiếu chủ thể và hạng mục trên trang nguồn.
- Catalog đang hoạt động dùng **996 URL ảnh khác nhau, 0 URL ảnh ngoài Cloudinary**. Chỉ tính thumbnail/gallery của listing và complex; không tính logo, font, avatar hoặc bản ghi đã ẩn.
- Loại ảnh phối cảnh, ảnh menu, ảnh hồ bơi gắn vào massage và ảnh giường không khớp phòng. Chọn ảnh giường Triple/Senior làm ảnh chính. Hai cover phối cảnh được thay bằng ảnh chụp hạng mục thực tế trong chính khu đó, không mượn ảnh khu khác.
- Phân loại lại ảnh portfolio gia đình/cặp đôi theo chủ thể; loại hai mục show bị lặp trong Grand World.
- Có 18 lượt ảnh nguồn lỗi 404/độ phân giải thấp và các ảnh bị từ chối do trùng; chỉ dùng phương án khác nếu vẫn đúng hạng mục. **9 hạng mục không được nhập** do thiếu ảnh phù hợp/ảnh đã dùng làm cover/show bị trùng.
- Giữ nguồn ảnh, credit, checksum, URL Cloudinary và thời điểm xác minh trong provenance và CSV. Nguồn phát hành giữ bản quyền; việc lưu Cloudinary không tự tạo quyền sử dụng thương mại.

### Nguồn chính đã đối chiếu

- [VinWonders Nha Trang](https://vinwonders.com/vi/vinwonders-nha-trang/)
- [VinWonders Phú Quốc](https://vinwonders.com/vi/vinwonders-phu-quoc/)
- [VinWonders Nam Hội An](https://vinwonders.com/vi/vinwonders-nam-hoi-an/)
- [VinWonders Cửa Hội](https://vinwonders.com/vi/vinwonders-cua-hoi/)
- [Vinpearl Safari Phú Quốc](https://vinwonders.com/vi/vinpearl-safari-phu-quoc/)
- [Grand World Phú Quốc](https://vinwonders.com/vi/grand-world-phu-quoc/)
- [VinWonders Vũ Yên](https://vinwonders.com/vi/vinwonders-vu-yen/)
- [VinWonders Wave Park & Water Park](https://vinwonders.com/vi/vinwonders-wave-park-water-park/)
- [Vinpearl Horse Academy Vũ Yên](https://vinwonders.com/vi/vinpearl-horse-academy/)
- [Sun World Bà Nà Hills](https://sunworld.vn/vi/banahills/gioi-thieu)
- [Sun World Hạ Long](https://sunworld.vn/vi/ha-long/gioi-thieu)
- [Sun World Hòn Thơm](https://sunworld.vn/vi/hon-thom/gioi-thieu)
- [Sun World Hà Nam](https://sunworld.vn/vi/ha-nam/gioi-thieu)
- [Sun World Fansipan Legend](https://sunworld.vn/vi/fansipan/gioi-thieu)
- [Sun World Núi Bà Đen](https://sunworld.vn/vi/ba-den/gioi-thieu)
- [Công viên suối khoáng nóng Núi Thần Tài](https://nuithantai.vn/)
- [Suối khoáng nóng I-Resort Nha Trang](https://www.i-resort.vn/)
- [Hoi An Photographer](https://hoianphotographer.com/)
- [Makeup Hoi An](https://makeuphoian.com/)

Vị trí lấy từ trang cơ sở, đường dẫn bản đồ được cơ sở liên kết và POI khớp tên/vị trí. Loại các kết quả Geoapify trùng tên/sai vị trí. Sun World Hạ Long có nguồn tọa độ Apple Maps; Núi Thần Tài/I-Resort có link Google Maps của chính cơ sở. Không dùng Google Maps Grounding khi tài khoản không được cấp quyền.

### Hạng mục đã bỏ qua

- VinWonders Phú Quốc — VŨ ĐIỆU CUỒNG XOAY
- VinWonders Nam Hội An — Show diễn 3D mapping - Lược Việt Sử ký
- VinWonders Nam Hội An — Nhạc nước
- VinWonders Cửa Hội — Công viên giải trí "Hội chợ Phù hoa"
- Grand World Phú Quốc — Tinh Hoa Việt Nam
- Grand World Phú Quốc — Sắc màu Venice
- VinWonders Wave Park & Water Park — Vũ điệu nhiệt đới
- Sun World Hà Nam — Công Viên Sun World Ha Nam
- Sun World Núi Bà Đen — QUAN ÂM NAM HẢI

## Kiểm tra sau nhập

| Kiểm tra | Kết quả |
|---|---|
| Chi tiết listing qua Catalog/Gateway | 170/170 trả HTTP 200, attributes đúng loại |
| Complex/detail và toàn bộ dịch vụ con qua tên miền public | 17/17 đúng số lượng, đúng parent/owner, HTTP 200 |
| Tìm kiếm STAY/EXP/SVC | Tìm thấy toàn bộ bản ghi mới; các bản ghi đã ẩn không còn trong kết quả |
| Bộ lọc 8 subtype SVC qua public GoTravel | Đúng nhóm, có kết quả, HTTP 200 |
| Inventory mới | 30.394 dòng lịch, từ 09/10/2026 đến 07/01/2027; API kiểm tra cả STAY/EXP/SVC thành công |
| Coverage 34 tỉnh/thành | Mỗi tỉnh có đủ STAY/EXP/SVC; tối thiểu 2 lưu trú, 1 trải nghiệm, 1 tiện ích |
| Ảnh | Cloudinary xác minh giao ảnh; 17 cover kiểm tra HTTP 200; không có URL ngoài Cloudinary trong catalog hoạt động |
| Bảo toàn dữ liệu cũ | Checksum đạt; order/order_items, review, landmark và inventory cũ không bị seed sửa |
| Trình duyệt public | 7 trang (Núi Thần Tài, Bà Nà, STAY, EXP, SVC, tab Dịch vụ, tab Trải nghiệm) HTTP 200; 0 lỗi JavaScript, 0 ảnh lỗi trong vùng nhìn thấy |
| Chạy lại apply | Trả already_completed, không tạo dữ liệu trùng |

Tab Dịch vụ hiển thị đủ 8 nhóm có dữ liệu. Phép kiểm tra ảnh carousel chỉ tính phần thực sự trong màn hình; ảnh ngoài màn hình dùng lazy loading.

Đã xóa đúng cache gợi ý catalog sau commit (1 key có sẵn); không flush Redis/phiên đăng nhập và không cần restart service để đọc dữ liệu mới. Coverage giữ đủ nhóm, **không phải cam kết số lượng cơ sở bằng nhau tuyệt đối ở 34 tỉnh**; mật độ nguồn thật khác nhau giữa các địa phương.

## Phạm vi xác minh và dữ liệu kiểm thử

Tên cơ sở, hạng mục, vị trí, ảnh và thông tin phòng được lấy từ nguồn công khai. Các cơ sở chưa được xác nhận là đối tác GoTravel. **Host, giá, lịch, thời lượng đặt và số chỗ trên GoTravel là kiểm thử**, được ghi rõ trong mô tả/provenance. Không nhập đánh giá giả, không gán rating giả; listing mới có rating/review bằng 0. Không thực hiện giao dịch thanh toán hoặc đặt chỗ thực tại các cơ sở trong đợt này.

Quan sát UI hiện có: một số card vẫn hiển thị `0,0` và nhãn mặc định “Dịch vụ được khách yêu thích” dù listing mới chưa có đánh giá. Đây là cách hiển thị hiện có; database của đợt này không tạo số liệu review/rating hoặc xác nhận độ phổ biến để hỗ trợ nhãn đó.

## Tệp triển khai và bằng chứng

- [README và lệnh kiểm tra](../api-tester/e2e-seeder/tourism-balance/README.md)
- [Kế hoạch và checksum](../api-tester/e2e-seeder/tourism-balance/plan.json)
- [Biên nhận apply](../api-tester/e2e-seeder/tourism-balance/receipt.json)
- [Kết quả kiểm tra](../api-tester/e2e-seeder/tourism-balance/verification.json)
- [Kiểm kê trước](../api-tester/e2e-seeder/tourism-balance/audit-before.json) / [sau](../api-tester/e2e-seeder/tourism-balance/audit-after.json)
- [Nguồn/ảnh từng bản ghi](../api-tester/e2e-seeder/tourism-balance/source-images.csv)
- [Coverage 34 tỉnh/thành](../api-tester/e2e-seeder/tourism-balance/province-counts.csv)

Các thay đổi đợt này tập trung vào seed, cấu hình host ảnh được phép và manifest Cloudinary. Giao diện GoID đang có thay đổi riêng trong workspace không thuộc đợt này.
