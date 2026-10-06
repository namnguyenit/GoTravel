# Kiểm tra merchant VNPAY Sandbox và kịch bản thanh toán

**Cập nhật mới nhất:** sau khi bạn đăng ký IPN, giao dịch mới đã xác nhận thành công payment, đơn và giữ chỗ. Xem [báo cáo xác nhận IPN](VNPAY_IPN_CONFIRMED_TEST_2026-10-06.md). Phần dưới giữ lại kết quả trước khi cấu hình IPN để đối chiếu.

## Kết quả thực tế ngày 06/10/2026

Đã kiểm tra file runtime Java, xác nhận TMN Code và Hash Secret được điền; đã đổi `vnpay.enabled` từ `false` sang `true` và restart `gostay-payment`. Không ghi merchant secret vào báo cáo hoặc Git.

Đã tạo hai đơn kiểm thử bằng tài khoản seed, sử dụng dịch vụ `Khách sạn Sài Gòn Vĩnh Long — Suite Room`, mỗi đơn 750.000đ. Thông tin khách được đánh dấu `VNPAY SANDBOX TEST` / `VNPAY SANDBOX CANCEL TEST`. Đây là giao dịch với cổng Sandbox, không đặt phòng với khách sạn ngoài hệ thống.

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| Java đọc cấu hình đã bật | Hoạt động; callback sai chữ ký trả lỗi xác minh, không còn lỗi chưa cấu hình |
| API tạo payment bằng phiên SSO + CSRF | HTTP 200, provider `VNPAY`, amount 750.000đ |
| VNPAY nhận URL đã ký | Chấp nhận và mở trang lựa chọn phương thức thanh toán |
| Phương thức QR | Có; VNPAY tạo QR đúng số tiền 750.000đ |
| Thanh toán bằng thẻ NCB test và OTP test | VNPAY trả `vnp_ResponseCode=00`, `vnp_TransactionStatus=00`, giao dịch `15696395` |
| Return URL về GoTravel | Đúng miền `pay.trungcaodev.io.vn`; backend xác minh callback thành công, HTTP 200 |
| IPN cho giao dịch thành công | Chưa có IPN hợp lệ được xử lý trong thời gian quan sát |
| Payment / Order | `PENDING` / `PAYMENT_PENDING` tại thời điểm kiểm tra |
| Kiểm tra DB | Attempt `CREATED`, chưa có transaction thanh toán và notification xác nhận đơn |
| Hủy thanh toán tại VNPAY | Return code `24`, transaction status `02`, backend xác minh và trả kết quả `FAILED` |
| Dọn đơn thử hủy | Đã hủy đơn chưa trả tiền qua API Order để trả lại lượt giữ chỗ |

Đơn kiểm thử giao dịch thành công: `701f5901-599a-4a38-9862-4fecd6824141`; payment `47f19b22-e8e9-4a1c-ac04-63eb1fd692c0`. Đơn có hạn giữ chỗ `2026-10-06 15:28:40` giờ Việt Nam. Sau thời hạn đó cần tạo đơn mới để thử xác nhận đầy đủ; IPN thành công đến muộn sẽ cần đối soát. Không cập nhật trạng thái paid thủ công từ Return URL.

**Kết luận:** merchant/key được VNPAY chấp nhận, QR và thanh toán NCB Sandbox hoạt động. Chưa thể kết luận toàn bộ luồng xác nhận đơn hoạt động đầy đủ vì chưa nhận/xử lý được IPN hợp lệ. Cần kiểm tra cấu hình IPN phía VNPAY và lịch sử gửi callback của merchant.

## Website URL không phải IPN URL

Việc đăng ký website `https://gotravel.trungcaodev.io.vn` là đúng. VNPAY cần một cấu hình IPN riêng để gửi thông báo server tới server.

| Trường | URL sử dụng |
| --- | --- |
| Website merchant | `https://gotravel.trungcaodev.io.vn` |
| Return URL | `https://pay.trungcaodev.io.vn/vnpay/return` |
| IPN URL | `https://pay.trungcaodev.io.vn/api/v1/payments/vnpay/ipn` |

1. Mở [trang IPN của VNPAY Sandbox SIT](https://sandbox.vnpayment.vn/vnpaygw-sit-testing/ipn), đăng nhập tài khoản Sandbox do VNPAY cấp. Trang này hiện yêu cầu tên đăng nhập và mật khẩu; TMN Code/Hash Secret trong Java không thay thế tài khoản đăng nhập.
2. Kiểm tra/cập nhật IPN cho đúng merchant bằng **URL đầy đủ** trong bảng, không dùng địa chỉ trang chủ làm IPN.
3. Nếu tài khoản không có quyền cấu hình, gửi TMN Code và IPN URL cho hỗ trợ tích hợp VNPAY qua kênh tài khoản được cấp; không công khai Hash Secret.
4. Xem lịch sử callback/giao dịch trên VNPAY để kiểm tra URL được gọi và HTTP/RspCode nhận được. Sau khi đăng ký đúng, thử một đơn mới còn hạn giữ chỗ.

Trường `ipn-url` trong YAML mô tả địa chỉ đăng ký; **lưu trường đó trong Java không tự đăng ký IPN với VNPAY**. Theo [tài liệu PAY chính thức](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html), merchant cần gửi IPN URL cho VNPAY khi thiết lập xong.

Đã xác minh cả hai địa chỉ sau đi tới callback Java và trả JSON `RspCode=97` khi gửi chữ ký giả:

- `https://pay.trungcaodev.io.vn/api/v1/payments/vnpay/ipn` — địa chỉ đang cấu hình và nên đăng ký.
- `https://gotravel.trungcaodev.io.vn/api/v1/payments/vnpay/ipn` — địa chỉ qua proxy `/api` của GoTravel, có thể dùng nếu chọn đăng ký trên cùng miền website; khi chọn địa chỉ này hãy cập nhật cả `ipn-url` trong YAML cho thống nhất.

Đây là phản hồi từ chối chữ ký giả, giúp xác nhận đường kết nối công khai đã tới backend; không phải một giao dịch IPN thành công. Không dùng `/`, `/vnpay/return` hoặc `localhost` làm IPN URL.

Trang VNPAY hiện hiển thị nhà cung cấp `https://vnshop.vn/`. Đây là thông tin do VNPAY hiển thị cho merchant, không lấy từ tên dịch vụ GoTravel. Kiểm tra thông tin website/tên hiển thị trong tài khoản Sandbox hoặc với VNPAY nếu muốn hiển thị thương hiệu GoTravel.

## Điều chỉnh Gateway trong lần kiểm tra này

Gateway đang giới hạn quốc gia `VN`. Kiểm thử request IPN mang GeoIP `SG` trước sửa bị HTTP 403. Đã bỏ kiểm tra quốc gia **chỉ cho đúng GET `/api/v1/payments/vnpay/ipn`** để máy chủ thanh toán từ khu vực khác có thể gửi notification. Chữ ký, merchant, reference và số tiền vẫn được Java kiểm tra. Các route trình duyệt/API khác, POST IPN và đường dẫn IPN con vẫn tuân theo chính sách quốc gia.

Đã chạy 7/7 kiểm thử bảo mật Gateway, restart Gateway và xác nhận live: IPN chữ ký giả với GeoIP `SG` tới Java, trả HTTP 200 / `RspCode=97`; API tìm kiếm cùng GeoIP vẫn bị HTTP 403. Log chặn quốc gia chỉ ghi path, không ghi query callback có chữ ký. Không tìm thấy log IPN thực tế bị GeoIP chặn trong phần log gần đây; điều chỉnh này xử lý một rủi ro triển khai, chưa chứng minh đây là nguyên nhân thiếu IPN của giao dịch đã thử.

## Kịch bản bạn tự kiểm tra trên website

### 1. Giao dịch thành công bằng NCB Sandbox

1. Mở `https://gotravel.trungcaodev.io.vn`, đăng nhập tài khoản của bạn.
2. Chọn một nơi lưu trú/dịch vụ đang còn chỗ, ngày trong tương lai, số lượng 1. Điền thông tin khách và email của bạn nếu muốn kiểm tra nhận vé.
3. Đặt dịch vụ → Payment Portal → bấm thanh toán VNPAY trong thời hạn giữ chỗ.
4. Trên VNPAY, chọn **Thẻ nội địa và tài khoản ngân hàng → NCB**.
5. Nhập thẻ test:

| Trường | Giá trị |
| --- | --- |
| Số thẻ | `9704198526191432198` |
| Tên chủ thẻ | `NGUYEN VAN A` |
| Ngày phát hành | `07/15` |
| OTP | `123456` |

6. Tiếp tục, đồng ý điều kiện nếu được hỏi, nhập OTP rồi bấm thanh toán.
7. Kiểm tra VNPAY quay lại miền `pay`. Sau IPN và worker xác nhận, trang kết quả phải hiện đơn đã xác nhận; payment `COMPLETED`, Order `CONFIRMED` và vé được tạo. Nếu trang tiếp tục báo đang chờ IPN, kiểm tra cấu hình/lịch sử IPN thay vì thanh toán lại cùng đơn.

Thông tin thẻ trên do [VNPAY công bố cho Sandbox](https://sandbox.vnpayment.vn/apis/vnpay-demo/), đã được dùng để thử giao dịch này. Không nhập thẻ ngân hàng thật vào kịch bản Sandbox.

### 2. Các tình huống cần thử

| Tình huống | Cách thử | Kết quả cần kiểm tra |
| --- | --- | --- |
| Hủy trên VNPAY | Tạo đơn mới → VNPAY → Hủy/Xác nhận hủy | Trang Return báo chưa hoàn tất; không xác nhận đơn/ghi doanh thu. Có thể thử lại khi còn hạn giữ chỗ |
| Không đủ số dư | Chọn NCB, dùng thẻ test `9704195798459170488`, cùng tên/ngày phát hành ở trên | Giao dịch thất bại; không tạo đơn đã thanh toán |
| Đóng tab Return | Thanh toán thành công, đóng tab trước khi xem kết quả | Khi IPN đã đăng ký đúng, đơn vẫn được xác nhận bằng notification server tới server |
| Tải lại trang kết quả | Reload Return sau khi thành công | Không tăng số giao dịch hoặc doanh thu, không gửi vé lặp do xử lý IPN lại |
| Hết hạn giữ chỗ | Đợi hết hạn của đơn rồi mở thanh toán | Không mở phiên thanh toán mới cho đơn hết hạn; tiền nhận muộn chuyển đối soát |
| IPN gửi lặp | Dùng chức năng kiểm tra/gửi lại callback của VNPAY nếu tài khoản có hỗ trợ | Lần đầu `RspCode=00`; đã xử lý trả `02`; chỉ một ghi nhận giao dịch/doanh thu |

Những kịch bản bảo mật và đồng thời đã có test tự động trong lần tích hợp trước. Lần này đã thử thực tế NCB thành công, hủy tại VNPAY, tạo QR và đường callback công khai; chưa thử scan QR hoàn tất bằng ứng dụng thanh toán.

## Muốn quét QR thì làm thế nào?

1. Tạo **đơn mới** trên GoTravel, mở Payment Portal và chọn thanh toán VNPAY.
2. Trên cổng VNPAY chọn **App Ngân hàng và Ví điện tử (VNPAYQR)**.
3. VNPAY sẽ tạo QR của giao dịch, hiển thị số tiền và thời gian hết hạn. QR đã hiển thị đúng trong lần kiểm tra này. Không dùng lại ảnh QR của giao dịch cũ.

### Quét trên Sandbox

Hiển thị QR đã được xác minh; **quét và hoàn tất thanh toán QR Sandbox bằng app ngân hàng thật chưa được xác minh**. [Hướng dẫn công khai của Sandbox](https://sandbox.vnpayment.vn/apis/vnpay-demo/) cung cấp các thẻ test; chưa tìm thấy hướng dẫn/app QR test được cấp công khai trong tài liệu đã đọc. Để thử thao tác quét QR đầy đủ, hỏi hỗ trợ tích hợp VNPAY về ứng dụng/ngân hàng thử nghiệm và quyền QR dành cho merchant Sandbox của bạn. Không dùng tài khoản ngân hàng thật để chuyển tiền vào một giao dịch Sandbox.

Để kiểm tra luồng hệ thống ngay bây giờ, dùng NCB test theo kịch bản trên; NCB và QR sử dụng cùng bộ kiểm tra chữ ký và callback của hệ thống.

### Quét với tiền thật

Cần merchant Production và bộ TMN Code/Hash Secret Production do VNPAY cấp, phương thức QR được kích hoạt, cùng Return/IPN đã đăng ký. URL cổng Production là `https://pay.vnpay.vn/paymentv2/vpcpay.html`; chưa đổi hệ thống sang Production trong lần này. Khi dùng Production, khách có thể chọn QR rồi quét bằng ứng dụng hỗ trợ VNPAY-QR theo [hướng dẫn của VNPAY](https://vnpay.vn/vnpay-qr).

## Cấu hình Java hiện tại

File runtime vẫn ở `PaymentandWallet/.secrets/vnpay-local.yaml`, `enabled: true`, cổng Sandbox. Không cần sửa secret thêm vì URL đã được VNPAY chấp nhận. Điều còn cần xác minh/cấu hình là notification IPN ở phía merchant VNPAY; sau khi thay IPN trong Java thì restart `gostay-payment`, còn thay URL trong tài khoản VNPAY cần lưu ở phía VNPAY.

Thông tin khách của các fixture dùng email `.invalid`, nên lần thử này không xác minh gửi email tới một hộp thư thật. Toàn bộ luồng xác nhận đơn/vé còn phụ thuộc IPN hợp lệ. Chi tiết máy đọc được nằm ở `VNPAY_SANDBOX_LIVE_TEST_2026-10-06.json`.
