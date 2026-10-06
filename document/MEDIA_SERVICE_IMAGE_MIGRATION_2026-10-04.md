# Kiểm tra và chuyển ảnh sang Cloudinary — 04/10/2026

Cập nhật kết quả kiểm tra: **22:54 04/10/2026 (UTC+7)**. Checkout triển khai: `devserver`, `/home/trungcao/DoANLienNganh-devserver`.

## Kết quả

- Service media đang online. Env Cloudinary đã đủ và xác thực được; cloud name `p1kxfhlw`. API key và secret được đọc từ env, không ghi vào báo cáo hoặc Git.
- Đã chuyển **187 URL nguồn hợp lệ / 187 asset** sang Cloudinary, kiểm tra delivery HTTP 200, giải mã ảnh, kích thước và checksum SHA-256 sau upload.
- Đã thay **3.185 tham chiếu ảnh trong 695 bản ghi Catalog**. Hiện không còn URL Unsplash/Wikimedia trong các trường ảnh Catalog được kiểm kê.
- Dữ liệu seeder hiện có **545 tham chiếu / 177 URL riêng biệt**, toàn bộ dùng Cloudinary. Đã đổi 10 URL ảnh fallback frontend, gồm 9 ảnh trang chủ và 1 avatar mặc định admin.
- **9 URL nguồn trả 404** nằm trong các pool phụ trợ. Chúng không nằm trong database ban đầu hay dữ liệu seeder đang dùng; đã loại khỏi pool để không quay lại khi lấy ảnh mới.
- Website localhost và `https://gostay.nonnet123.io.vn/` đều HTTP 200. HTML trang chủ hiện không chứa URL Unsplash/Wikimedia.

## Service và env

Env tại worktree là symlink tới `/home/DoANLienNganh/cloudinary-service/.env`. Cấu hình mới được nạp sau restart `gostay-media`. Media bind `127.0.0.1:5001`; frontend chạy tại `127.0.0.1:3000`; Gateway cổng `5555`.

Đã upload PNG thử 32×32 qua `POST /api/v1/media/upload`, dùng token nội bộ hợp lệ. Service trả `200 UPLOAD_SINGLE_SUCCESS`, tạo WebP, tải lại ảnh HTTP 200 và giải mã đúng kích thước. Đã xóa đúng asset thử qua DELETE, HTTP 200. POST không có xác thực bị chặn 401 tại service và Gateway. Kiểm tra này không sử dụng phiên người dùng thật trên trình duyệt.

## Phạm vi ảnh trong database

| Trường | Số tham chiếu đã đổi |
| --- | ---: |
| `complexes.gallery_urls` | 180 |
| `complexes.thumbnail_url` | 50 |
| `landmarks.gallery_urls` | 450 |
| `landmarks.thumbnail_url` | 125 |
| `listings.attributes` | 1860 |
| `listings.thumbnail_url` | 520 |

| Bảng | Bản ghi giữ nguyên |
| --- | ---: |
| listings | 520 |
| landmarks | 125 |
| complexes | 50 |

Database có 162 URL ảnh riêng biệt trước và sau migration. 187 asset bao gồm ảnh đang dùng trong DB, pool seeder hiện tại, pool phụ trợ hợp lệ và fallback frontend. Tất cả 162 URL ảnh nguồn trong DB đã tải được và giải mã được trong lần audit; không có ảnh DB trả 404.

Identity có 32 hồ sơ với trường `avartar_url` trống và không có ảnh giấy tờ host để chuyển. Không điền avatar giả cho tài khoản, không chuyển giấy tờ riêng tư sang public. Bảng reviews có 670 bản ghi nhưng trường ảnh đang rỗng.

## Quy trình đã thực hiện

1. Kiểm kê nguồn ảnh trong database, exports của `vietnam-data.js`, các script seeder và frontend.
2. GET ảnh nguồn thực tế, kiểm tra Content-Type, giới hạn tải 32 MiB, giới hạn giải mã 60 triệu pixel và SHA-256. File cache chỉ được tái sử dụng khi hash khớp audit.
3. Chuyển ảnh tĩnh JPEG/PNG/WebP/AVIF sang WebP chất lượng 85, tự xoay theo EXIF; giới hạn cạnh dài 2.560 px, không phóng lớn hay crop ảnh. Giữ bản ảnh nguồn/hash trong manifest để truy vết.
4. Lưu trong `admin-uploads/seeder/<SHA-256 của ảnh WebP>`. Public ID xác định theo nội dung và `overwrite: false` để retry không ghi đè asset khác. Cloudinary hỗ trợ cơ chế này trong [tài liệu upload chính thức](https://cloudinary.com/documentation/upload_images).
5. Tải lại secure URL, kiểm tra HTTP 200, format WebP, kích thước và hash byte chính xác. Chỉ asset `verified` mới được dùng cho bước database.
6. Lưu backup trước khi cập nhật. Transaction thay các trường thumbnail/gallery/JSON attributes; giữ thứ tự và các phần dữ liệu khác. So sánh giá trị cũ trước UPDATE để tránh đè thay đổi đồng thời. Có advisory lock, timeout và rollback khi xung đột.
7. Đọc lại toàn bộ 695 bản ghi và so sánh các trường đã đổi với bản ánh xạ dự kiến. Chạy lại dry-run cho kết quả 0 tham chiếu cần đổi / 0 bản ghi — migration không lặp lại ghi dữ liệu.
8. Kiểm tra Redis của Search, chỉ xem các prefix cache ảnh liên quan và chỉ xóa nếu giá trị vẫn chứa nguồn ảnh cũ. Tại thời điểm kiểm tra Redis không có key; không thực hiện FLUSHDB/FLUSHALL.
9. Build frontend ở thư mục riêng; TypeScript/build thành công, đủ 45 trang. Giữ các static hash cũ cho tab trình duyệt đang mở, thay build và restart frontend. Lưu build cũ để khôi phục.

Tổng dung lượng các ảnh nguồn trong manifest: **277.15 MiB**; ảnh WebP đã lưu: **43.99 MiB**. Có 8 ảnh nguồn lớn hơn giới hạn upload thông thường 10 MiB; đã xử lý trước upload. Một avatar nguồn là AVIF do `auto=format` của Unsplash; đã chuyển WebP và xác minh thành công.

## Ảnh nguồn lỗi

Các URL sau trả HTTP 404 khi audit, không có tham chiếu trong database ban đầu:

- `https://images.unsplash.com/photo-1562914399-bfb17f539e6a?w=1200`
- `https://images.unsplash.com/photo-1620864388481-98782a64c4c2?w=1200`
- `https://images.unsplash.com/photo-1583417646549-b3a62002b80a?w=1200`
- `https://images.unsplash.com/photo-1621644023249-14a0fc8423f5?w=1200`
- `https://images.unsplash.com/photo-1572948624128-4ce68832a8a7?w=1200`
- `https://images.unsplash.com/photo-1602728806416-4b46ef25c71d?w=1200`
- `https://images.unsplash.com/photo-1601004185799-798835f8fc32?w=1200`
- `https://images.unsplash.com/photo-1533050487297-09b45013190a?w=1200`
- `https://images.unsplash.com/photo-1583569704400-988c564cd2bd?w=1200`

Vị trí tham chiếu trước khi sửa và cách xử lý nằm trong [broken-images.csv](media-migration-2026-10-04/broken-images.csv). Các pool phụ trợ được bổ sung từ ảnh Cloudinary đang có trong dữ liệu địa danh; fallback Wikipedia dùng pool LANDMARK, không gán một URL 404 sang một ảnh bất kỳ trong database.

## Các sửa đổi seeder

- `vietnam-data.js` và script tạo landmark thử đã đổi URL sang Cloudinary.
- `image-store.js` quản lý upload public, kiểm tra format/dung lượng/hash, retry có giới hạn và manifest. Không dùng cho ảnh giấy tờ.
- Hai script lấy ảnh từ Wikipedia lưu ảnh mới sang Cloudinary trước khi ghi dữ liệu seeder; nếu upload lỗi thì không ghi đè file dữ liệu.
- Sửa lỗi `fetch-wiki-images.js` trước đây có thể cắt mất các định nghĩa phía sau mảng địa danh khi ghi lại file. Nay chỉ thay đúng block landmark và ghi file bằng rename.
- `buildListingImages` lấy 5 URL khác nhau bằng thao tác hữu hạn; nếu không đủ ảnh thì báo lỗi thay vì vòng lặp không kết thúc. Kiểm tra pool STAY/EXP/SVC hiện tại đều đạt.
- Không chạy `run.js`, `wipe.js`, hoặc tạo lại user/listing/order/payment để chuyển ảnh.

## Lỗi Gateway phát hiện và đã sửa

Luồng lấy địa điểm theo tỉnh từng bị Gateway trả 400 với “Hà Nội” do bộ kiểm tra path chặn dấu cách sau decode. Backend trả đúng 200. Đã cho phép dấu cách ở giữa segment; vẫn chặn control character, dấu phân cách mã hóa, `%` lồng nhau, traversal, namespace nội bộ và giá trị có khoảng trắng đầu/cuối. Tham số chuyển tiếp vẫn được `encodeURIComponent`.

Thêm kiểm tra tên tỉnh tiếng Việt và các đường dẫn nguy hiểm. Toàn bộ **26/26 bài kiểm tra Gateway đạt**. Một kiểm tra UI cũ còn tìm chữ “Gateway Studio” đã được cập nhật theo tiêu đề “Quản trị Gateway” hiện tại; không thay giao diện.

## Kiểm tra sau triển khai

| Kiểm tra | Kết quả |
| --- | --- |
| Database so với backup/ánh xạ | 695 bản ghi khớp; số bản ghi không đổi |
| Seeder exports | 545 tham chiếu Cloudinary; không chạy seed |
| CDN | 187 asset được tải lại, giải mã và hash khớp |
| Frontend build | Thành công, TypeScript đạt, 45 trang |
| Gateway tests | 26/26 đạt |
| `/api/v1/recommendations/home/hero-landmarks` | HTTP 200; 6 tham chiếu Cloudinary; 0 nguồn ngoài |
| `/api/v1/recommendations/complexes?limit=6` | HTTP 200; 30 tham chiếu Cloudinary; 0 nguồn ngoài |
| `/api/v1/recommendations/provinces/H%C3%A0%20N%E1%BB%99i/destinations` | HTTP 200; 10 tham chiếu Cloudinary; 0 nguồn ngoài |
| `http://127.0.0.1:3000/` | HTTP 200; 0 URL nguồn ngoài trong HTML |
| `https://gostay.nonnet123.io.vn/` | HTTP 200; 0 URL nguồn ngoài trong HTML |

## Backup và khôi phục

Backup chưa đưa vào Git, nằm trong thư mục được ignore:

```text
/home/trungcao/DoANLienNganh-devserver/api-tester/e2e-seeder/.image-migration/database-backup-1791128461328.json
/home/trungcao/DoANLienNganh-devserver/api-tester/e2e-seeder/.image-migration/source-backup
/home/trungcao/DoANLienNganh-devserver/api-tester/e2e-seeder/.image-migration/frontend-old-build
```

Khôi phục các trường ảnh database bằng công cụ có kiểm tra giá trị hiện tại:

```bash
cd /home/trungcao/DoANLienNganh-devserver/api-tester/e2e-seeder
node migrate-image-database.js --restore .image-migration/database-backup-1791128461328.json
```

Lệnh restore chỉ sửa các trường đã migration, không xóa bản ghi. Nếu nhóm đã sửa các trường đó sau migration, công cụ dừng và rollback transaction để tránh ghi đè. Khôi phục database cần đi kèm xử lý cache và bản nguồn/build tương ứng. Không xóa asset Cloudinary khi còn được tham chiếu.

## File thống kê và công cụ

- [Bảng ánh xạ nguồn → Cloudinary](media-migration-2026-10-04/image-mapping.csv).
- [Danh sách ảnh lỗi](media-migration-2026-10-04/broken-images.csv).
- [Kết quả kiểm tra nguồn trước migration](media-migration-2026-10-04/checks-before.json).
- [Kiểm tra API](media-migration-2026-10-04/api-verification.json), [frontend](media-migration-2026-10-04/frontend-verification.json), [database](media-migration-2026-10-04/database-verification.json).
- Manifest tái sử dụng: `api-tester/e2e-seeder/cloudinary-images.json`.

Các lệnh bảo trì:

```bash
cd /home/trungcao/DoANLienNganh-devserver/api-tester/e2e-seeder
npm run images:plan
npm run images:upload -- --audit ../../document/media-migration-2026-10-04/checks-before.json
npm run images:apply
```

`images:plan` chỉ đọc database và ghi plan/backup; `images:upload` dùng audit nguồn và manifest để tiếp tục upload/kiểm tra; `images:apply` cập nhật database khi tất cả URL cần dùng đã được xác minh. Credentials được đọc từ env của media; không đưa secret vào command hoặc JSON manifest.

## Các giới hạn và vấn đề seeder còn lại

- Tile bản đồ OpenStreetMap và QR thanh toán VietQR là dữ liệu sinh động từ dịch vụ chuyên dụng, nằm ngoài ảnh Catalog/seeder và chưa chuyển sang Cloudinary.
- Audit xác nhận HTTP, format và khả năng giải mã; không xác minh toàn bộ ảnh có đúng địa danh/hotel hoặc điều kiện sử dụng nguồn. Manifest giữ URL gốc và checksum; chuyển nơi lưu trữ không thay đổi nguồn gốc ảnh.
- Upload qua phiên người dùng thật và toàn bộ flow seeder chưa được chạy: `api-client.js` còn chờ Bearer token trong response login, chưa xử lý cookie HttpOnly/CSRF của Gateway mới.
- Luồng xin quyền host trong seeder dùng buffer chuỗi giả làm JPEG. Không phù hợp kiểm tra upload giấy tờ; cần dữ liệu ảnh fixture hợp lệ và sửa riêng luồng kiểm thử này.
- Full seed có nhánh gọi hard wipe. Migration ảnh không dùng nhánh này.
- Build còn cảnh báo framework về tên middleware cũ và Edge Runtime; build/TypeScript vẫn thành công. Không thay framework hoặc giao diện trong đợt chuyển ảnh.
