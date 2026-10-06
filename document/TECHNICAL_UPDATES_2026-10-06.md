# Cập nhật kỹ thuật GoTravel, GoID, GoPay — 06/10/2026

Tài liệu tổng hợp các thay đổi được đưa lên nhánh `devserver` trong đợt này. README gốc giới thiệu sản phẩm, có liên kết GoTravel/GoID/GoPay, hình giao diện, kiến trúc và hướng dẫn phát triển. README cùng ảnh giới thiệu được đồng bộ sang `main`, nhánh mặc định của repository.

## 1. GoID và cấu hình tên miền

- Thêm bộ chọn URL nền tảng tại frontend và GoID: miền mới dùng `gotravel/auth/pay.trungcaodev.io.vn`; miền cũ vẫn dùng `gostay/auth/pay.nonnet123.io.vn`.
- Truy cập công khai hoặc qua IP từ xa không dẫn người dùng về `localhost` của thiết bị. GoID kiểm tra danh sách origin được phép, bỏ URL chứa username/password hoặc host giả dạng.
- Gateway hỗ trợ nhiều domain cookie. Khi proxy thay Host thành localhost, chỉ Origin trình duyệt đã được xác thực mới được dùng để chọn domain; không lấy từ host đầu vào tùy ý.
- Giữ cookie HttpOnly, kiểm tra JWT, kiểm tra quyền và CSRF. GoID dùng câu **“Một tài khoản. Mọi hành trình.”**, bên dưới **“GoTravel · GoTicket”**.

## 2. VNPAY trong PaymentandWallet

### Yêu cầu thanh toán và callback

- Thêm `VnpayConfig`, `VnpaySigner`, `VnpayService`, callback controller và DTO kết quả Return.
- Ký dữ liệu chuẩn hóa bằng HMAC-SHA512; chuẩn hóa số tiền, thời gian theo `Asia/Ho_Chi_Minh`, thời hạn thanh toán và mã tham chiếu riêng cho mỗi attempt.
- Thêm entity/repository `VnpayPaymentAttempt` để lưu phiên giao dịch, URL đã ký, hạn, response code, transaction status và kết quả xử lý.
- Xác minh chữ ký và merchant trước khi tìm/ghi database. Sau đó kiểm tra reference, số tiền và các trường callback; thông báo lặp được nhận diện.
- **IPN** mới ghi nhận kết quả thanh toán. **Return** đọc kết quả đã xác minh, không tự đánh dấu đơn thành công theo tham số trình duyệt.
- Mock payment mặc định tắt. Các payment cũ chưa trả tiền có thể chuyển sang VNPAY; giao dịch lịch sử đã hoàn tất được giữ nguyên.
- Callback IPN chỉ có ngoại lệ GeoIP cho đúng `GET /api/v1/payments/vnpay/ipn`; không mở ngoại lệ cho method/path khác. Log GeoIP ghi path thay vì query có chữ ký.

### Tính nhất quán và đối soát

- Khóa bản ghi payment khi xử lý callback để tránh các IPN đồng thời ghi trùng kết quả.
- Thêm `PaymentOrderNotification` và worker đọc notification chưa giao từ database; lỗi tạm thời được thử lại.
- Giao dịch đã nhận tiền nhưng đơn/giữ chỗ không còn hợp lệ chuyển `PAID_REVIEW`; không xác nhận đơn hoặc thanh toán tiếp như một giao dịch bình thường.
- Scheduler hết hạn phối hợp với trạng thái payment và notification. Điều kiện xác nhận tồn chỗ và đơn được kiểm tra độc lập ở backend tương ứng.
- `VNPAY_TMN_CODE`/`VNPAY_HASH_SECRET` hoặc `.secrets/vnpay-local.yaml` là cấu hình riêng; repository cung cấp mẫu rỗng và hướng dẫn Return/IPN.

## 3. BookingandInventory và CartandOrder

- Dùng pessimistic write lock khi cập nhật đơn và inventory lock.
- Từ chối xác nhận giữ chỗ đã nhả hoặc đã hết hạn; xử lý xác nhận lặp trên giữ chỗ đã xác nhận theo điều kiện nghiệp vụ.
- Bổ sung thời hạn giữ chỗ trong dữ liệu tóm tắt đơn dành cho thanh toán.
- API lịch sử đơn hỗ trợ `statuses`, `search`, `page`, `size`, luôn ràng buộc theo tài khoản đã xác thực.
- Tìm mã đơn, UUID và tên dịch vụ; escape wildcard để `%`/`_` được tìm như ký tự nhập. Giới hạn kích thước trang, dùng thời gian và UUID cho thứ tự ổn định.

## 4. GoPay và đơn nhiều sản phẩm

- Loại bỏ việc lấy `items[0].listingTitle` làm toàn bộ thông tin đơn trong handoff.
- GoPay đọc lại đơn của người dùng qua `GET /api/v1/orders/{orderId}` và dựng đầy đủ `items[]`.
- Hiển thị tên/ảnh, ngày sử dụng, khung giờ, số lượng, đơn giá và thành tiền; thêm mã đơn, ngày đặt, trạng thái, hạn thanh toán và thông tin liên hệ khách hàng.
- Số tiền trả về từ payment phải khớp tổng tiền đơn, kể cả lần kiểm tra lại và lần bấm thanh toán. Chỉ chuyển tới URL HTTPS VNPAY được cho phép khi payment còn `PENDING`.
- Dữ liệu động dựng bằng `textContent`; ảnh HTTPS Cloudinary được kiểm tra nguồn và có phương án thay thế khi lỗi.
- Logo VNPAY chính thức lưu tại GoPay; bỏ biểu tượng thẻ chung và các đoạn hướng dẫn dài. CSP chỉ bổ sung nguồn ảnh Cloudinary, không mở inline script/style.

## 5. Lịch sử mua hàng, QR và email vé

- Trang lịch sử có các ô chữ nhật riêng cho từng đơn, mã đơn, danh sách tên sản phẩm, số sản phẩm, ngày đặt, trạng thái và tổng tiền.
- Bấm ô mở đúng chi tiết; giữ các liên kết `?orderId=` từ GoPay/email. Quay lại giữ bộ lọc, từ khóa và trang; vùng cuộn về đầu khi đổi nội dung.
- Chi tiết hiển thị tất cả sản phẩm và đơn giá. QR chỉ xuất hiện với đơn đã xác nhận/hoàn tất.
- Thay QR giả bằng `qrcode.react`; giá trị là `orderNumber`, thiếu thì dùng UUID của đơn.
- Email tạo PNG QR cục bộ bằng `qrcode`, đính kèm CID. Đã bỏ việc gửi mã đơn sang QuickChart.
- Nạp `.env` cho SMTP; giữ trạng thái gửi vé, người nhận, số lần thử và nút gửi lại. Việc gửi thực tế cần cấu hình SMTP hợp lệ.

## 6. Nhận diện và triển khai

- Bộ logo GoTravel/GoTicket/GoID/GoPay dùng hình G và các biến thể SVG/PNG, wordmark, favicon, phiên bản sáng/tối.
- Frontend, GoID và GoPay phục vụ font Outfit từ tài nguyên cục bộ. Đính kèm SIL Open Font License trong `brand-assets/OFL-Outfit.txt`.
- Build Next.js có thể chọn thư mục qua `NEXT_BUILD_DIR`; triển khai giữ tài nguyên build cũ cho các tab còn mở.
- Script Java chọn cấu hình payment riêng; Identity dùng compiler profile đầy đủ để giảm độ trễ BCrypt/JIT trên server.
- Loại `node_modules` dạng symlink khỏi Git; build, dependency, SQLite runtime, `.env`, `.secrets` và keystore tiếp tục nằm ngoài dữ liệu phát hành.
- Script provisioning database bỏ mật khẩu mặc định. Yêu cầu ba biến mật khẩu trước khi tạo database hoặc sinh cấu hình; không thay mật khẩu database đang chạy trong đợt Git này.

## 7. Kiểm tra trước khi commit

| Bộ kiểm tra | Kết quả |
| --- | --- |
| Gateway — routing, cấu hình, bảo mật, cookie domain | 29/29 đạt |
| Chọn domain/redirect + handoff GoPay | 4/4 đạt; Node 22 dùng `--experimental-strip-types` cho import TypeScript |
| PaymentandWallet — VNPAY, callback, scheduler và application context | 21/21 đạt |
| PaymentInventoryConfirmationTest | 2/2 đạt |
| OrderPaymentConfirmationTest | 4/4 đạt |
| Script database thiếu mật khẩu | Dừng trước thao tác database |
| Build GoTravel / GoID trong các đợt giao diện vừa hoàn tất | Thành công; GoID đã triển khai câu nhận diện mới |

Tổng cộng **60 test** trong các bộ được chạy đợt này. Đây không phải toàn bộ test của mọi module. Bộ `OrderServiceTest` cũ có hai kỳ vọng về quyền đánh giá đã được ghi nhận không khớp chính sách cho đơn `CONFIRMED`; đợt này kiểm tra bộ xác nhận thanh toán liên quan, chưa sửa các test/chính sách đánh giá đó.

Các báo cáo trình duyệt/API trước commit xác nhận đơn hai mục, lịch sử 102 đơn, phân trang sau 100 đơn, QR quét đúng mã, giữ bộ lọc, cookie và quyền sở hữu. Đơn live kiểm thử hai lượt dịch vụ, số lượng 1 và 2, tổng 6.000đ đã được hủy sau khi kiểm tra; giỏ hàng có sẵn được giữ nguyên. Lần kiểm tra giao diện này không thanh toán ngân hàng hoặc gửi email thật.

## 8. Trạng thái vận hành cần lưu ý

- VNPAY hiện là Sandbox. QR được cổng VNPAY tạo; việc hoàn tất thanh toán QR bằng ứng dụng Sandbox chưa được xác minh. Luồng NCB Sandbox và IPN xác nhận được mô tả trong báo cáo VNPAY.
- SMTP chưa được cấu hình đầy đủ trên server tại lần kiểm tra email; vé vẫn cần SMTP hợp lệ để gửi thực tế.
- Snapshot PM2 của tài khoản `nhan` còn cũ. Chủ PM2/root cần lưu runtime hiện tại trước khi reboot; cập nhật Git không thay thế thao tác này.
- GoTicket đang chuẩn bị tích hợp; GoCar chưa thuộc phạm vi hoàn thiện hiện tại.
- Kiểm tra phát hành rà tệp được Git theo dõi và tệp mới, so sánh các bí mật runtime đã biết và kiểm tra dấu hiệu private key/token/URL thanh toán đã ký. Kiểm tra này không phải cam kết xóa bí mật khỏi lịch sử Git cũ.

## Tài liệu liên quan

- [VNPAY Sandbox](VNPAY_SANDBOX_SETUP_2026-10-06.md)
- [Xác nhận IPN thực tế](VNPAY_IPN_CONFIRMED_TEST_2026-10-06.md)
- [Lịch sử đơn, QR và SMTP](ORDER_HISTORY_QR_EMAIL_2026-10-06.md)
- [GoPay nhiều sản phẩm](CHECKOUT_ECOSYSTEM_2026-10-06.md)
- [Bộ nhận diện](GO_BRAND_FAMILY_2026-10-06.md)
- [Tên miền mới](CLOUDFLARE_NEW_DOMAIN_SETUP_2026-10-06.md)
