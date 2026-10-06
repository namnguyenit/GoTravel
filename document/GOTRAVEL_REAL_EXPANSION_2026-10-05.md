# Bổ sung dữ liệu thật GoTravel — 05/10/2026

## Kết quả

Đợt **gotravel-real-expansion-2026-10-05-v2** đã commit lúc 2026-10-05T15:46:08.057Z. Kiểm tra sau nhập: **passed**.

| Dữ liệu | Trước | Bổ sung | Sau |
| --- | ---: | ---: | ---: |
| Nơi lưu trú/hạng phòng STAY | 370 | 66 | 436 |
| Trải nghiệm EXP | 92 | 70 | 162 |
| Dịch vụ SVC | 122 | 9 | 131 |
| Tổng listing ACTIVE | 584 | 145 | 729 |
| Cụm dịch vụ ACTIVE | 63 | 7 | 70 |

- Bổ sung dữ liệu của **16 cơ sở thật**, **64 địa điểm tham quan thật** và **6 chương trình trải nghiệm do cơ sở công bố**.
- Đợt mới có dữ liệu tại **31 tỉnh/thành**; toàn bộ catalog tiếp tục có đủ STAY, EXP và SVC ở **34 tỉnh/thành**.
- Dùng lại bộ **50 host giả lập** đã có; đợt này phân công cho **38 tài khoản**. Không tạo thêm tài khoản trùng.
- **301 ảnh riêng** được dùng trong các bản ghi mới. Tất cả ảnh giao diện của đợt này dùng Cloudinary thuộc cloud **p1kxfhlw**.
- Tạo **145 cấu hình lịch**, **20,384 dòng lịch** cho 91 ngày, từ 2026-10-05.

## Phân biệt thông tin thật và dữ liệu kiểm thử

Tên cơ sở, vị trí và ảnh được đối chiếu nguồn công khai. Hạng phòng/dịch vụ lấy từ trang cơ sở, hoặc cổng thông tin đơn vị quản lý; tọa độ được đối chiếu POI có đúng tên hoặc bản đồ của cơ sở. Tên tỉnh cũ được quy về 34 tỉnh/thành. Địa chỉ vẫn giữ khu vực/cách viết nguồn cung cấp để nhận diện được cơ sở.

**Host, giá bán và tồn phòng/lịch đặt trên GoTravel là dữ liệu kiểm thử.** Những trường chưa được nguồn công bố, như diện tích, sức chứa đặt, điều kiện phục vụ, được ghi rõ cần xác nhận. Mỗi mô tả nhập có thông báo này; chưa có xác nhận hợp tác hoặc nhận đặt chỗ của cơ sở thật.

Địa điểm tham quan được nhập thành hoạt động EXP do host giả lập tổ chức để thử hệ thống. Đây là địa điểm có thật, không phải xác nhận có tour/vé thật đang bán trên GoTravel. Không tạo đánh giá của khách hàng: rating=0, totalReviews=0, không có review mới.

## Cơ sở mới

| Cơ sở và trang nguồn | Tỉnh hiện hành | Listing nhập |
| --- | --- | ---: |
| [Khách sạn Sài Gòn Vĩnh Long](https://saigonvinhlonghotel.vn/) | Vĩnh Long | 6 |
| [Diamond Stars Bến Tre](https://diamondstarbentre.com/) | Vĩnh Long | 7 |
| [Konklor Bungalow Garden Hotel](https://konklorhotel.vn/) | Quảng Ngãi | 3 |
| [Habana Hotel Thái Nguyên](https://habanahotel.com.vn/) | Thái Nguyên | 5 |
| [Khách sạn Cửu Long](https://dongxuyenhotel.vn/) | An Giang | 4 |
| [Khách sạn Long Xuyên](https://dongxuyenhotel.vn/) | An Giang | 3 |
| [Khách sạn Đông Xuyên](https://dongxuyenhotel.vn/) | An Giang | 3 |
| [Khách sạn Sài Gòn Rạch Giá](https://saigonrachgiahotel.vn/vn/home) | An Giang | 5 |
| [Khách sạn Phú Cường Cà Mau](https://phucuonghotel.com/) | Cà Mau | 7 |
| [Ninh Kiều Riverside Hotel](https://www.ninhkieuriversidehotel.vn/) | Cần Thơ | 11 |
| [Mekong Riverside Boutique Resort & Spa](https://mekongriversideresort.vn/) | Đồng Tháp | 9 |
| [Coco Riverside Lodge](https://www.cocoriversidelodge.com/) | Vĩnh Long | 3 |
| [Khách sạn Sài Gòn Ban Mê](https://saigonbanmehotel.com.vn/en/) | Đắk Lắk | 5 |
| [Ba Be Lake View Homestay](https://babelakeview-homestay.com/) | Thái Nguyên | 1 |
| [Khách sạn Sao Mai Cao Lãnh](https://dongthaptourist.com/nha-hang-khach-san/khach-san-sao-mai/) | Đồng Tháp | 2 |
| [Lila Inn & Tours](https://lilainn.tours/) | Tuyên Quang | 7 |

Các khách sạn Cửu Long, Long Xuyên và Đông Xuyên được tách đúng theo nhóm phòng CL/LX/DX mà đơn vị công bố, dùng tọa độ riêng; không gộp mọi phòng vào một khách sạn. [Đồi A1](https://bqldt.svhttdl.dienbien.gov.vn/portal/pages/2022-1-17/Di-tich-Doi-A1-duoc-cong-nhan-la-diem-du-lich-cua-hjkyc3brzqc2.aspx) được đối chiếu nguồn Ban Quản lý di tích Điện Biên và ảnh Commons ghi rõ đồi A1.

## Ảnh và lọc trùng

1. Geoapify/Firecrawl dùng để tìm ứng viên và đọc nguồn; kết quả tìm kiếm không tự động trở thành listing. Đã thu thập 1.070 ứng viên lưu trú, nhưng chỉ nhập các cơ sở có nguồn/ảnh đủ kiểm tra.
2. Ảnh hạng phòng/dịch vụ phải có liên kết hoặc nội dung trang cơ sở gắn đúng hạng mục. Không lấy ảnh khách sạn khác để lấp phòng thiếu ảnh.
3. Metadata Commons phải mô tả đúng địa điểm; bỏ ảnh điều hướng Wikipedia, logo, bản đồ, hình minh họa và ảnh gắn nhãn sai. Có kiểm tra trực quan qua bảng ảnh.
4. Kiểm tra định dạng ảnh tĩnh, kích thước tối thiểu 360 px ở cạnh ngắn, giới hạn dung lượng/pixel và nguồn HTTPS trong danh sách host đã xét.
5. So sánh SHA-256 và dHash, loại ảnh có cùng nội dung hoặc gần trùng (khoảng cách dHash ≤4), đối chiếu cả **1.506 URL ảnh đang hoạt động trước đợt mới**.
6. Tải bytes lên Cloudinary, tối ưu WebP, tải lại đường dẫn giao ảnh để kiểm tra HTTP, kích thước và checksum. Database chỉ lưu link Cloudinary đã xác minh.
7. Giấy phép/tác giả/URL Commons và trang cơ sở được lưu trong provenance; ảnh Commons có ghi tác giả và giấy phép trong mô tả EXP. Ảnh website cơ sở giữ bản quyền bên công bố, việc chuyển hosting không chuyển quyền sở hữu ảnh.

Có **50 lượt ảnh bị loại do trùng/gần trùng**. 8 ảnh nguồn bị loại do kích thước/khả năng tải không đạt; có ảnh poster/collage từ nhà cung cấp, không giả nâng độ phân giải để qua kiểm tra. Một số ảnh đã tải trong quá trình nghiên cứu bị loại sau kiểm tra trực quan; chúng không được gắn vào catalog.

Bỏ 11 mục chưa có ảnh riêng đạt yêu cầu; danh sách ở [skipped.json](real-expansion-2026-10-05/skipped.json). Ví dụ: một hạng phòng Ninh Kiều dùng lại ảnh; 6 hạng phòng Sao Mai có ảnh nguồn quá nhỏ; một số địa điểm chỉ còn ảnh đã dùng ở dữ liệu cũ. Không nhập nguồn Mira có nội dung spam chèn vào trang, trang Nam Cường dẫn nhầm cơ sở, hoặc ảnh spa Pexels.

## Phân bố theo tỉnh/thành

Các cột dùng thứ tự **STAY / EXP / SVC**. Số lượng được tăng ở các tỉnh thiếu, đặc biệt Vĩnh Long (lưu trú 3→15), An Giang (4→19), Thái Nguyên (4→10), Đồng Tháp (5→13) và Tuyên Quang (3→5). **Số lượng giữa các tỉnh chưa bằng nhau**; không tạo cơ sở hoặc ảnh giả để làm bằng số. Cao Bằng, Hà Tĩnh và Nghệ An không có mục mới vượt kiểm tra trong đợt này.

| Tỉnh/thành | Trước | Bổ sung | Sau |
| --- | --- | --- | --- |
| An Giang | 4/1/2 | +15/+4/+0 | 19/5/2 |
| Bắc Ninh | 9/3/5 | +0/+2/+0 | 9/5/5 |
| Cà Mau | 7/1/2 | +6/+3/+1 | 13/4/3 |
| Cần Thơ | 6/1/2 | +10/+3/+0 | 16/4/2 |
| Cao Bằng | 9/3/2 | +0/+0/+0 | 9/3/2 |
| Đắk Lắk | 6/4/2 | +4/+1/+1 | 10/5/3 |
| Đà Nẵng | 36/4/11 | +0/+3/+0 | 36/7/11 |
| Điện Biên | 5/1/3 | +0/+1/+0 | 5/2/3 |
| Đồng Nai | 4/4/1 | +0/+1/+0 | 4/5/1 |
| Đồng Tháp | 5/2/1 | +8/+2/+3 | 13/4/4 |
| Gia Lai | 11/2/5 | +0/+1/+0 | 11/3/5 |
| Hải Phòng | 5/1/2 | +0/+2/+0 | 5/3/2 |
| Hà Nội | 9/6/1 | +0/+3/+0 | 9/9/1 |
| Hà Tĩnh | 9/1/4 | +0/+0/+0 | 9/1/4 |
| Hồ Chí Minh | 16/6/4 | +0/+3/+0 | 16/9/4 |
| Huế | 7/6/2 | +0/+3/+0 | 7/9/2 |
| Hưng Yên | 5/1/1 | +0/+3/+0 | 5/4/1 |
| Khánh Hòa | 29/2/11 | +0/+2/+0 | 29/4/11 |
| Lai Châu | 5/1/2 | +0/+2/+0 | 5/3/2 |
| Lâm Đồng | 13/6/5 | +0/+1/+0 | 13/7/5 |
| Lạng Sơn | 5/1/1 | +0/+1/+0 | 5/2/1 |
| Lào Cai | 8/3/1 | +0/+3/+0 | 8/6/1 |
| Nghệ An | 56/1/20 | +0/+0/+0 | 56/1/20 |
| Ninh Bình | 7/5/4 | +0/+2/+0 | 7/7/4 |
| Phú Thọ | 7/4/1 | +0/+1/+0 | 7/5/1 |
| Quảng Ngãi | 4/1/3 | +3/+4/+0 | 7/5/3 |
| Quảng Ninh | 30/3/8 | +0/+2/+0 | 30/5/8 |
| Quảng Trị | 17/4/5 | +0/+2/+0 | 17/6/5 |
| Sơn La | 14/1/3 | +0/+1/+0 | 14/2/3 |
| Tây Ninh | 6/2/1 | +0/+1/+0 | 6/3/1 |
| Thái Nguyên | 4/2/1 | +6/+1/+0 | 10/3/1 |
| Thanh Hóa | 6/2/3 | +0/+4/+0 | 6/6/3 |
| Tuyên Quang | 3/3/2 | +2/+7/+0 | 5/10/2 |
| Vĩnh Long | 3/4/1 | +12/+1/+4 | 15/5/5 |

## Kiểm tra sau nhập

- 18/18 yêu cầu API trả HTTP 200, qua Gateway nội bộ và https://gostay.nonnet123.io.vn: tìm kiếm, chi tiết và lịch khả dụng mẫu cho cả STAY/EXP/SVC. Kết quả tìm kiếm chứa các listing mới.
- Tất cả 145 listing mới có chủ sở hữu host đã duyệt; cụm dịch vụ thuộc enterprise đã duyệt; dịch vụ con và parent có cùng host.
- Tất cả 152 bản ghi catalog mới có provenance.
- Ảnh mới không dùng lại URL/nội dung đã gắn ở các bản ghi hoạt động trước đợt này; không có cùng checksum ảnh giữa hai bản ghi mới.
- Số lượng cấu hình/lịch đúng theo kế hoạch; không tạo review giả.
- Đối chiếu checksum và số dòng của dữ liệu cũ: listings, complexes, landmarks, reviews, provenance, inventory_configs, inventory_calendars, inventory_locks, orders, order_items đều giữ nguyên.
- Chạy lại entrypoint trả already_completed, không upload/seed trùng.

## File phục vụ kiểm tra và chạy lại

- [Danh sách listing](real-expansion-2026-10-05/listings.csv): ID, tên, tỉnh, host, trang nguồn và thumbnail Cloudinary.
- [Danh sách ảnh](real-expansion-2026-10-05/photographs.csv): nguồn ảnh, link Cloudinary, checksum, giấy phép/tác giả.
- [Kết quả kiểm tra](real-expansion-2026-10-05/verification.json), [receipt và checksum dữ liệu cũ](real-expansion-2026-10-05/receipt.json), [phân bố](real-expansion-2026-10-05/coverage.json).
- Bộ seeder: api-tester/e2e-seeder/real-expansion/. Kế hoạch plan.json được đóng băng bằng checksum; không sửa kế hoạch của đợt đã commit. Một đợt bổ sung khác cần batchId và namespace mới.
- Backup trước nhập nằm trong real-expansion/backups/, quyền 0700/0600 và được bỏ qua bởi Git. File này chứa dữ liệu cũ, không đưa vào báo cáo công khai.

```bash
cd /home/trungcao/DoANLienNganh-devserver
/home/nhan/.nodejs-22/bin/node api-tester/e2e-seeder/real-expansion/index.js --verify
/home/nhan/.nodejs-22/bin/node api-tester/e2e-seeder/real-expansion/index.js --apply
```

Import dùng hai transaction riêng cho Catalog và Booking, có advisory lock theo batch, backup và journal. Nếu dừng sau khi commit lịch mà chưa commit catalog, journal cho phép chạy lại đúng kế hoạch để hoàn tất; không sửa tồn kho cũ.
