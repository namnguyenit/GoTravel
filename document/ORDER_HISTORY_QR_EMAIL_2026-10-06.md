# Lịch sử mua hàng, QR mã đơn và cấu hình email

Ngày 06/10/2026. Mã nguồn triển khai tại `/home/trungcao/DoANLienNganh-devserver`.

## Cấu hình email ở đâu?

**Tệp cần điền: `/home/trungcao/DoANLienNganh-devserver/cloudinary-service/.env`.** Dịch vụ `gostay-media` (PM2 33, cổng 5001) phục vụ cả ảnh và email. Các trường SMTP được đọc tại `cloudinary-service/src/configs/smtp.config.js`; tệp ví dụ là `cloudinary-service/.env.example`.

Hiện `.env` có cấu hình ảnh/token nội bộ nhưng chưa có các trường SMTP. Endpoint health đang trả `configured: false`.

Ví dụ dùng SMTP Gmail:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=dia-chi-gui@gmail.com
SMTP_PASS=mat-khau-ung-dung
SMTP_FROM_NAME=GoTravel
SMTP_FROM_EMAIL=dia-chi-gui@gmail.com
```

`SMTP_PASS` là mật khẩu ứng dụng Gmail. Tài khoản cần bật xác minh hai bước để tạo mật khẩu ứng dụng. [Hướng dẫn Google](https://support.google.com/accounts/answer/185833?hl=vi), [trang tạo mật khẩu ứng dụng](https://myaccount.google.com/apppasswords).

Có thể dùng nhà cung cấp SMTP khác bằng cách thay host, user, password và địa chỉ gửi. Nếu nhà cung cấp dùng cổng 587 thì đặt `SMTP_PORT=587`, `SMTP_SECURE=false` để dùng STARTTLS; cổng 465 dùng `SMTP_SECURE=true`. [Tài liệu Nodemailer](https://nodemailer.com/smtp).

Điền mật khẩu trực tiếp trong `.env`, giữ nguyên cấu hình Cloudinary và `INTERNAL_SERVICE_TOKEN` đang có. Caller Java hiện dùng token nội bộ chung cho email; không cần cấu hình thêm token email riêng để sử dụng luồng này.

Sau khi lưu, restart tiến trình **`gostay-media` / PM2 33** để nạp lại cấu hình. Việc cấu hình chỉ cần ở backend; không đưa SMTP user/password vào frontend, GoID hoặc GoPay.

Kiểm tra trạng thái cấu hình trên server:

```bash
curl http://127.0.0.1:5001/api/v1/communications/email/health
```

`configured: true` chỉ xác nhận đủ trường cấu hình. Cần kiểm tra kết nối/xác thực SMTP và gửi một vé thử đến địa chỉ do bạn chỉ định để xác nhận gửi thư thực tế. Đợt hiện tại chưa có SMTP credentials nên chưa gửi email thật.

## Email gửi vào lúc nào?

1. VNPAY xác nhận thanh toán; backend thanh toán thông báo cho CartandOrder.
2. CartandOrder xác nhận tồn chỗ và chuyển đơn sang `CONFIRMED`.
3. `OrderService.deliverTicketEmail` gửi yêu cầu qua `CommunicationClient` đến `POST /api/v1/communications/email/ticket`, kèm token nội bộ.
4. Dịch vụ email dựng nội dung, tạo QR PNG và gửi qua Nodemailer/SMTP.
5. CartandOrder ghi trạng thái gửi, người nhận và thời điểm gửi vào đơn.

Người nhận là **email đã nhập trong bước đặt hàng**, tại `order.customerInfo.email`. Nó có thể khác email tài khoản GoID. Vé chứa mã đơn, tên khách, dịch vụ, ngày đặt dịch vụ, số lượng, tổng tiền, QR và liên kết mở chi tiết đơn.

Khi SMTP chưa hoạt động, đơn vẫn được xác nhận thanh toán; trạng thái email là chưa gửi. Các đơn cũ chưa gửi có thể gửi lại bằng nút **Gửi lại email vé** trong chi tiết đơn sau khi cấu hình SMTP. Hiện không có tác vụ tự gửi lại hàng loạt mọi email đã thất bại.

## Giao diện mới

Địa chỉ: https://gotravel.trungcaodev.io.vn/orders/completed

Mục **Đơn hàng đã hoàn tất** trong menu nay mở trang **Lịch sử mua hàng**:

- Danh sách theo thời gian đặt mới nhất; mã đơn, dịch vụ, ngày đặt, trạng thái và tổng tiền.
- Phân trang 12 đơn/trang; xem được các đơn cũ sau 100 đơn đầu tiên.
- Bộ lọc Tất cả / Đã thanh toán / Chờ thanh toán / Đã hủy.
- Tìm mã đơn, UUID hoặc tên dịch vụ trên toàn bộ dữ liệu của tài khoản, không chỉ trang hiện tại.
- Bấm một đơn để mở chi tiết tại `?orderId=<UUID>`. Liên kết cũ từ email/GoPay vẫn mở thẳng đúng đơn.
- Quay lại giữ trang, bộ lọc và từ khóa. Khi mở chi tiết hoặc chuyển trang, khu vực cuộn của ứng dụng trở về đầu.
- Chi tiết giữ thông tin khách, dịch vụ, tổng tiền, email vé và khiếu nại; đơn chờ thanh toán có liên kết GoPay.
- Đơn chờ thanh toán/đã hủy không hiển thị QR vé.
- Có trạng thái tải, danh sách trống, tìm kiếm không có kết quả, phiên hết hạn và lỗi tải; không thay lỗi API bằng thông báo “chưa có đơn”.

## QR

Hình ô vuông được tạo bằng hash trước đây đã được thay bằng QR tiêu chuẩn:

- Giá trị quét: đúng mã đơn hiển thị, ưu tiên `orderNumber`; nếu thiếu thì dùng `orderId`.
- Web: SVG được mã hóa cục bộ bằng `qrcode.react`, viền trắng 4 module và mức sửa lỗi M.
- Email: PNG được mã hóa cục bộ bằng `qrcode`, đính kèm nội tuyến với CID. Đã bỏ URL QuickChart khỏi request Java; email không tải QR từ hệ thống ngoài.
- QR không chứa thông tin liên hệ hay token đăng nhập. QR là mã nhận diện đơn; đối soát/quyền sở hữu/trạng thái đơn vẫn được kiểm tra tại backend, việc quét không tự xác nhận check-in.

Tham khảo API thư viện: [qrcode.react](https://github.com/zpao/qrcode.react), [node-qrcode](https://github.com/soldair/node-qrcode).

## Backend và quyền truy cập

`GET /api/v1/orders` hỗ trợ `page`, `size`, `statuses` (phân cách bằng dấu phẩy) và `search`. Truy vấn luôn ràng buộc theo user ID đã xác thực tại Gateway, giới hạn tối đa 100 đơn/trang và dùng thứ tự thời gian + UUID để phân trang ổn định. `%`/`_` trong từ khóa được tìm như ký tự bình thường. Các API xem chi tiết/gửi lại email tiếp tục kiểm tra chủ đơn.

Ví dụ:

```text
GET /api/v1/orders?page=0&size=12
GET /api/v1/orders?page=0&size=12&statuses=CONFIRMED,COMPLETED
GET /api/v1/orders?page=0&size=12&search=khach-san
GET /api/v1/orders/<UUID>
POST /api/v1/orders/<UUID>/ticket-email/resend
```

## Kết quả kiểm tra

- Build Next.js/TypeScript production thành công.
- Backend CartandOrder đóng gói thành công; 4 test chống xác nhận thanh toán lặp, phục hồi đơn đã hủy/hết hạn và xử lý lỗi tồn chỗ đạt.
- API trên tên miền thật: tài khoản kiểm thử có 6 đơn, 1 đơn đã thanh toán; phân trang, lọc trạng thái, tìm mã đơn và ký tự `%` đúng; size 1000 bị giới hạn còn 100.
- Chặn tài khoản chưa đăng nhập (401). Tài khoản khác xem đơn trả 404, tìm mã đơn không trả dữ liệu; giả `X-User-Id` cũng không vượt quyền.
- Trình duyệt dùng 102 đơn giả lập để kiểm tra xem đơn ngoài giới hạn cũ 100, lọc/tìm kiếm, mở chi tiết, quay lại, gửi lại email thành công/thất bại và payload khiếu nại.
- Giải mã QR độc lập bằng jsQR: QR SVG trên web trả đúng mã đơn; PNG email trả đúng `orderNumber` và đúng UUID khi fallback; MIME chứa ảnh CID, URL QR bên ngoài bị bỏ qua.
- Desktop 1440px và mobile 390px đã kiểm tra; không tràn ngang và không có lỗi JavaScript trong phép kiểm tra giao diện.
- Sau triển khai trên tên miền thật: danh sách hiển thị 6 đơn của tài khoản kiểm thử, mở đúng chi tiết đơn đã thanh toán; QR được giải mã đúng mã đang hiển thị, mở đơn đưa vùng cuộn về đầu, quay lại giữ bộ lọc. Không thực hiện gửi SMTP trong phép kiểm tra này.

Đã restart GoTravel (PM2 24), CartandOrder (PM2 30) và media/email (PM2 33). GoTravel đang dùng production build `.next-order-history-mobile-20261006`, ID `MdQW5_EwyAVWE3WMQPdiL`; cả ba tiến trình online. Bố cục hàng trên điện thoại dùng hai cột, với tổng tiền ở hàng riêng để mã đơn dài không ép nhỏ tên dịch vụ. Các static asset cũ được giữ để hỗ trợ tab đang mở. Chủ PM2 vẫn cần lưu snapshot hiện tại để duy trì cấu hình build sau reboot, như đã ghi trong báo cáo triển khai trước.

Bằng chứng: `ORDER_HISTORY_UI_CHECK_2026-10-06.json`, `ORDER_HISTORY_API_CHECK_2026-10-06.json`, `ORDER_HISTORY_LIVE_CHECK_2026-10-06.json`, `ORDER_HISTORY_MOBILE_LAYOUT_CHECK_2026-10-06.json`, `ORDER_EMAIL_QR_CHECK_2026-10-06.json`; ảnh `ORDER_HISTORY_*.png`, `ORDER_DETAIL_*.png` và `ORDER_QR_LIVE_2026-10-06.png`.

Hai test review cũ trong `OrderServiceTest` kỳ vọng chỉ `COMPLETED`, trong khi logic có sẵn trước đợt này dùng `CONFIRMED` + `COMPLETED`, nên chúng đang thất bại do stubbing không khớp. Đã đối chiếu backup xác nhận logic đó không thay đổi trong đợt này. Không điều chỉnh chính sách review trong tác vụ lịch sử/QR.

Backup mã nguồn và JAR trước khi sửa: `/home/trungcao/.local/state/gotravel-deployments/order-history-20261006`. Chưa commit/push trong đợt này.
