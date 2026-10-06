# Tích hợp VNPAY Sandbox cho GoTravel

**Cập nhật mới nhất:** đã bật Sandbox và xác minh giao dịch NCB qua IPN thật: payment `COMPLETED`, đơn `CONFIRMED`, giữ chỗ đã xác nhận; callback lặp không tạo thêm doanh thu. Xem [báo cáo xác nhận IPN](VNPAY_IPN_CONFIRMED_TEST_2026-10-06.md) và [hướng dẫn IPN/QR](VNPAY_SANDBOX_LIVE_TEST_2026-10-06.md).

## Cấu hình cần điền

File runtime Java đã tạo, nằm ngoài Git:

`/home/trungcao/DoANLienNganh-devserver/PaymentandWallet/.secrets/vnpay-local.yaml`

Mở file này và thay ba trường:

```yaml
vnpay:
  enabled: true
  tmn-code: "MA_TMN_CODE_8_KY_TU_CUA_BAN"
  hash-secret: "HASH_SECRET_SANDBOX_CUA_BAN"
  payment-url: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
  return-url: "https://pay.trungcaodev.io.vn/vnpay/return"
  ipn-url: "https://pay.trungcaodev.io.vn/api/v1/payments/vnpay/ipn"
  frontend-url: "https://gotravel.trungcaodev.io.vn"
  locale: "vn"
  order-type: "other"
  timeout-minutes: 15
payment:
  mock-enabled: false
```

`tmn-code` và `hash-secret` do VNPAY cấp cho merchant sandbox. Mã merchant thực tế có 8 ký tự; đoạn minh họa ở trên phải thay bằng mã của bạn. Đăng ký tại [VNPAY Sandbox](https://sandbox.vnpayment.vn/devreg/). Giữ secret ở backend; không điền vào frontend, Gateway Studio hoặc Git. File mẫu không chứa thông tin merchant ở `PaymentandWallet/vnpay-local.yaml.example`. Các biến môi trường tương ứng được định nghĩa trong `src/main/resources/vnpay.yaml`; ưu tiên dùng file runtime đã tạo để phù hợp cách chạy hiện tại.

`application.yaml` import cấu hình VNPAY mặc định và file ngoài classpath. `deploy/start-java-service.sh payment` đặt `GOTRAVEL_PAYMENT_CONFIG` đúng đường dẫn trên, nên không phải rebuild JAR mỗi lần đổi secret. Ban đầu `enabled: false` và yêu cầu mới trả `503 / VNPAY_NOT_CONFIGURED`; sau khi bạn điền merchant, đã đổi `enabled: true` và xác minh tạo phiên Sandbox hoạt động.

Sau khi lưu file, restart `gostay-payment` trên PM2 daemon của `nhan`. Cấu hình được đọc khi Java khởi động. Nếu dùng tài khoản `nhan`, chạy:

```bash
PM2_HOME=/home/nhan/.pm2 /home/nhan/.nodejs-22/bin/node   /home/nhan/.nodejs/lib/node_modules/pm2/bin/pm2 restart gostay-payment
```

Người dùng `trungcao` có thể dùng PM2 RPC như các lần triển khai trước; không chạy một daemon PM2 mới vào thư mục khác.

## Các URL cần khai báo

| Mục | Giá trị |
| --- | --- |
| Website merchant | `https://gotravel.trungcaodev.io.vn` |
| URL cổng Sandbox | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` |
| Return URL | `https://pay.trungcaodev.io.vn/vnpay/return` |
| IPN URL | `https://pay.trungcaodev.io.vn/api/v1/payments/vnpay/ipn` |

Khai báo IPN URL với VNPAY theo thông tin merchant được cấp. `ipn-url` trong Java dùng để ghi rõ địa chỉ đăng ký; giao thức tạo URL thanh toán chỉ gửi `vnp_ReturnUrl`, không có tham số IPN tùy ý. Theo [tài liệu VNPAY](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html), IPN gọi bằng GET, cần HTTPS; Return URL chỉ kiểm tra và hiển thị kết quả, không cập nhật thanh toán.

Cloudflare Published application `pay.trungcaodev.io.vn` phải trỏ **`http://127.0.0.1:3336`**, bao gồm cả `/vnpay/return` và `/api/v1/payments/vnpay/ipn`. Không đặt Cloudflare Access login hoặc challenge tương tác trên callback IPN. URL IPN phải truy cập được từ server VNPAY mà không có cookie đăng nhập. Service Java vẫn chỉ bind loopback cổng 8085; không publish trực tiếp backend. Không cần miền mới. Miền `api.trungcaodev.io.vn` đang lỗi tunnel nên hai callback hiện đi qua miền pay đã hoạt động.

## Luồng hệ thống đã tích hợp

1. Checkout GoTravel mở phiên handoff của Payment Portal như trước; phiên được gắn với tài khoản và đơn hàng.
2. Portal gọi `POST /api/v1/payments/create` qua Gateway, cần phiên SSO và CSRF token.
3. Java lấy thông tin đơn hàng bằng token nội bộ từ CartandOrder, kiểm tra chủ sở hữu, tổng tiền, VND, trạng thái và thời hạn giữ chỗ. Giá/host do client gửi không được dùng để xác định thanh toán.
4. Java lưu `PaymentRequest` và một `VnpayPaymentAttempt`, tạo URL đã ký. Mỗi attempt có reference riêng; request lặp trong lúc attempt còn chờ dùng lại URL đó. Hủy giao dịch có thể tạo attempt mới trong cùng thời hạn giữ chỗ, không gia hạn reservation.
5. Portal chuyển tới VNPAY. HMAC-SHA512, thứ tự tham số, URL encoding và đơn vị tiền được kiểm tra ở backend. Thời gian định dạng theo `Asia/Ho_Chi_Minh`.
6. VNPAY Return URL mở trang kết quả riêng, không cần phiên handoff còn sống. Trang gọi API xác minh callback trên server; kết quả chờ IPN không được hiển thị thành đơn đã xác nhận.
7. IPN qua Portal → Gateway → `GET /api/v1/public/payments/vnpay/ipn` của Java. Gateway chỉ mở đúng hai endpoint GET callback; các API thanh toán khác vẫn cần JWT.
8. Java kiểm tra chữ ký, merchant, reference, số tiền và kết quả; khóa hàng thanh toán để chặn IPN đồng thời. Ghi nhận transaction/payout và notification trong cùng transaction trước khi phản hồi VNPAY. IPN lặp không ghi thêm doanh thu.
9. Worker đọc notification đã commit, gọi CartandOrder bằng token nội bộ, gửi lại nếu tạm mất kết nối. CartandOrder xác nhận giữ chỗ trước, rồi mới cập nhật đơn và gửi vé; thông báo lặp không gửi vé lần nữa. Khi đơn không còn nhận giữ chỗ, thanh toán chuyển `PAID_REVIEW` để hỗ trợ đối soát.

## API và dữ liệu

| Endpoint ngoài Gateway | Xác thực | Chức năng |
| --- | --- | --- |
| `POST /api/v1/payments/create` | JWT/SSO + CSRF | Tạo/tái sử dụng attempt; trả `provider`, `paymentUrl`, số tiền và hạn thanh toán |
| `GET /api/v1/payments/{id}` | JWT, kiểm tra chủ sở hữu | Theo dõi thanh toán |
| `GET /api/v1/payments/order/{orderId}` | JWT, kiểm tra chủ sở hữu | Tra cứu theo đơn |
| `GET /api/v1/payments/vnpay/ipn` | Chữ ký VNPAY | Ghi kết quả backend; không cần cookie/JWT |
| `GET /api/v1/payments/vnpay/return` | Chữ ký VNPAY | Đọc kết quả đã lưu; không ghi trạng thái |

Backend trả IPN JSON `RspCode` / `Message`, HTTP 200: `00` đã ghi nhận, `02` đã xử lý, `01` không tìm thấy reference, `04` sai tiền, `97` sai chữ ký/merchant, `99` xử lý chưa commit hoặc dữ liệu không hợp lệ. Tham số query lặp bị từ chối. Không lưu full callback URL/chữ ký vào application log.

Schema thêm `payment_requests.provider`, bảng `vnpay_payment_attempts` và `payment_order_notifications`. `payment_transactions` tiếp tục lưu ledger; VNPAY transaction reference được lưu ở attempt với unique constraint. Bản ghi cũ được giữ; chỉ request chưa trả tiền được chuyển khi mở thanh toán mới. `PAID_REVIEW` lưu giao dịch đã nhận nhưng cần đối soát (đơn hủy/hết giữ chỗ, kết quả nghi ngờ); không tạo thêm đặt chỗ hoặc tự trả host.

## Phần đã thay đổi và giới hạn

- Payment Portal dùng VNPAY thay QR SePay/nút mô phỏng. API mock-pay mặc định bị chặn; với payment VNPAY luôn bị chặn dù bật cờ mock cho legacy.
- Route webhook SePay cũ tắt trong Gateway. Code đọc lịch sử và ledger cũ được giữ để không mất dữ liệu.
- Trang GoTravel `/payment?orderId=...` chuyển vào portal thay giao diện QR cũ. Cùng helper handoff với checkout.
- Return URL kiểm tra DB; browser không tự xác nhận paid. Có thể kiểm tra lại nếu IPN/notification đến sau.
- Không thực hiện hoàn tiền giả cho payment VNPAY. API refund hiện trả `VNPAY_REFUND_REQUIRED` vì phạm vi này là tích hợp PAY. Muốn hoàn tiền VNPAY cần triển khai thêm API refund/querydr và quy trình đối soát; thao tác hủy/hoàn của đơn đã trả tiền cần phần đó.
- Các test tự động chữ ký/state/concurrency dùng merchant test độc lập và database H2 trong RAM. Sau khi bạn điền merchant và cập nhật IPN, đã thử NCB Sandbox thành công và xác nhận luồng Order/Inventory trên bản chạy; chưa thử Production hoặc hoàn tiền VNPAY.

## Kiểm tra sau khi bạn cấu hình

1. Điền mã merchant, secret, `enabled: true`, restart Java.
2. Mở đơn mới còn giữ chỗ trên GoTravel → Thanh toán → VNPAY Sandbox.
3. Dùng thông tin ngân hàng test do VNPAY cung cấp cho môi trường Sandbox.
4. Kiểm tra Return URL, IPN `RspCode: 00`, payment `COMPLETED`, notification đã gửi, đơn `CONFIRMED`, và vé.
5. Kiểm tra hủy tại VNPAY, giao dịch thất bại, chữ ký/amount bị sửa, callback lặp, backend tạm ngắt và giao dịch về sau khi đơn hết hạn. Các case tương ứng đã có test tự động.

Tham khảo thêm [tài liệu/Java demo chính thức](https://sandbox.vnpayment.vn/apis/downloads/) và [bảng mã lỗi VNPAY](https://sandbox.vnpayment.vn/apis/docs/bang-ma-loi/). Demo được tải vào `/tmp/gotravel-vnpay-reference` để đối chiếu; code tích hợp trong dự án dùng Java crypto và các dependency Spring hiện có.

## Kết quả triển khai ngày 06/10/2026

Bản chạy được cập nhật tại `/home/trungcao/DoANLienNganh-devserver`. Đã restart `gostay-booking`, `gostay-cart`, `gostay-payment`, `gostay-gateway`, `gostay-payment-portal` và `gostay-frontend`; cả sáu process đang online và các endpoint được kiểm tra đã đáp ứng. GoTravel dùng build `.next-vnpay-sandbox-20261006`, Build ID `SwRfKVd7OK_4SUpczz3-M`. Gateway SQLite đã lên phiên bản 6, có hai route GET callback VNPAY và webhook SePay đã tắt.

Đã sao lưu PostgreSQL thanh toán và SQLite Gateway trước triển khai tại `/home/trungcao/.local/state/gotravel-deployments/vnpay-20261006-144659`. Java đã tạo hai bảng mới và cột `payment_requests.provider`; không xóa dữ liệu giao dịch cũ.

| Kiểm tra | Kết quả |
| --- | --- |
| Java Payment: chữ ký, IPN/Return, transaction đồng thời, notification và cấu hình | 20/20 đạt |
| Java Order: xác nhận lặp, hết hạn/hủy đơn, lỗi inventory | 4/4 đạt |
| Java Booking: giữ chỗ hết hạn/đã giải phóng, xác nhận lặp | 2/2 đạt |
| Gateway: routing, quyền quản trị và bảo mật callback | 28/28 đạt |
| Portal: handoff, quyền truy cập và callback công khai | 1/1 đạt |
| Build GoTravel | Thành công |
| Return page qua miền pay, không cần phiên đăng nhập | HTTP 200 |
| IPN chữ ký giả / query lặp qua miền pay | HTTP 200, `RspCode` lần lượt `97` / `99` |
| POST vào callback GET; API mock của portal; webhook SePay cũ | HTTP 404 |
| Tạo thanh toán khi merchant chưa cấu hình, với phiên SSO hợp lệ | HTTP 503, `VNPAY_NOT_CONFIGURED` |
| Gọi mock-pay ở Java với phiên SSO hợp lệ | HTTP 403, `MOCK_PAYMENT_DISABLED` |
| Trình duyệt GoTravel và Return page | Giao diện VNPAY hoạt động, không còn QR SePay/nút mô phỏng |

Các bài Java ở trên là bộ kiểm thử liên quan trực tiếp đến thay đổi thanh toán; không phải toàn bộ bộ kiểm thử Java của dự án. Không tạo đơn hay thanh toán thật trong bước xác minh live. Chi tiết có trong `VNPAY_SANDBOX_VERIFICATION_2026-10-06.json`.

Ở lần triển khai ban đầu, VNPAY **tắt có chủ đích** để chờ thông tin merchant. Đã có lần kiểm tra tiếp sau khi điền merchant và bật cấu hình; xem báo cáo thử thực tế phía trên. Tích hợp PAY đã triển khai; hoàn tiền VNPAY cần API refund riêng như giới hạn nêu trên.

### Lưu cấu hình PM2 để giữ build sau reboot

Runtime đã dùng build mới, nhưng file `/home/nhan/.pm2/dump.pm2` thuộc tài khoản `nhan` và `trungcao` không có quyền ghi. Chủ daemon cần lưu danh sách process hiện tại để frontend tiếp tục chọn build mới sau khi PM2 resurrect/reboot. Với `nhan`, chạy:

```bash
PM2_HOME=/home/nhan/.pm2 /home/nhan/.nodejs-22/bin/node /home/nhan/.nodejs/lib/node_modules/pm2/bin/pm2 save
```

Hoặc với root:

```bash
sudo -u nhan env PM2_HOME=/home/nhan/.pm2 /home/nhan/.nodejs-22/bin/node /home/nhan/.nodejs/lib/node_modules/pm2/bin/pm2 save
```
