# Lý do yêu cầu và xác nhận hoàn tiền qua cổng thanh toán

Ngày triển khai: **26/10/2026**. Phạm vi: các hồ sơ hoàn từng vé và hoàn khoản bù khi bỏ đổi vé của GoTicket.

## Thay đổi ở khách

- Khi hủy/hoàn vé phải chọn lý do: thay đổi kế hoạch, đặt nhầm, lý do cá nhân hoặc Khác.
- Chọn Khác phải nhập ít nhất 5 ký tự; phần mô tả tối đa 1.000 ký tự. Các lựa chọn còn lại được nhập thêm thông tin nếu muốn.
- Backend kiểm tra và lưu lý do cùng thao tác hủy. Lý do hiển thị trên tiến trình của khách và hồ sơ xử lý ở Admin.
- Số được hoàn vẫn do backend tính từ giá vé và chính sách đã chốt. Lý do không tự tăng số tiền và khách không tự nhập một khoản được xem là nghĩa vụ hoàn.
- Hồ sơ cũ không có lý do được hiển thị rõ là yêu cầu cũ chưa lưu lý do; không tự đặt lời giải thích thay khách.

## Thay đổi ở Admin

- Đơn hiển thị riêng tổng chờ hoàn từng vé, số hồ sơ và nghĩa vụ hoàn toàn đơn.
- Những đơn còn vé hoạt động hoặc đổi vé giảm giá vẫn xuất hiện ở nhóm cần xử lý/hoàn tiền khi có operation đang chờ hoàn, dù trạng thái đơn còn CONFIRMED.
- Nếu đơn có đúng một hồ sơ, có thể mở nút **Hoàn qua GoPay** ngay từ chi tiết đơn hoặc danh sách đơn chờ hoàn.
- Với nhiều hồ sơ, mở tab xử lý từng vé để xác nhận đúng khoản của từng vé.
- Hộp xác nhận kiểm tra nguồn thu gốc, số phải hoàn và khả năng hỗ trợ của cổng. Không cần nhập mã chuyển khoản thủ công khi dùng luồng tự động.
- Khi cổng còn xử lý, giao diện tiếp tục hiển thị chờ hoàn. Chỉ kết quả thành công đã đối chiếu đủ số tiền mới cập nhật vé thành đã hoàn.
- Luồng ghi chứng từ đã hoàn vẫn dành cho xử lý thủ công phù hợp. Backend chặn dùng nó đồng thời với một lệnh hoàn tự động chưa rõ kết quả, hoặc khi một phần đã được cổng hoàn.

### Hai đơn đã được đối chiếu theo ảnh người dùng

| Giá trị đơn | Hồ sơ chờ hoàn | Tổng phải hoàn theo chính sách đã chốt |
|---:|---:|---:|
| 200.000 đồng | 1 | 180.000 đồng |
| 570.000 đồng | 2 | 513.000 đồng |

Đây là dữ liệu đọc từ các operation, đã trừ phí hủy. Không dùng con số nghĩa vụ hoàn toàn đơn bằng 0 để phủ nhận khoản hoàn từng vé. Không gửi lệnh hoàn cho hai đơn này trong quá trình kiểm tra của agent.

## API

### Phía khách

`POST /api/v1/orders/transport/{orderId}/items/{itemId}/cancel`

Ví dụ body:

```json
{
  "operationId": "UUID dùng lại khi gửi lại cùng yêu cầu",
  "reasonCode": "OTHER",
  "reasonText": "Tôi cần thay đổi lịch trình vì lý do cá nhân."
}
```

Các mã được nhận: `CHANGE_OF_PLANS`, `WRONG_BOOKING`, `PERSONAL_REASON`, `OTHER`. Yêu cầu mới thiếu lý do bị từ chối. Trường hợp nhà xe hủy cả chuyến vẫn đi qua luồng nội bộ riêng và lưu mã lý do nhà xe hủy.

### Phía Admin

- `GET /api/v1/orders/transport/admin/item-operations/{id}/automatic-refund`: kiểm tra điều kiện hoặc xem trạng thái; không gửi lệnh chi tiền.
- `POST /api/v1/orders/transport/admin/item-operations/{id}/automatic-refund`: xác nhận hoàn, body `{"amount":"180000"}`. Số tiền phải bằng nghĩa vụ đã chốt của operation; thiếu quyền Admin hoặc số tiền sai bị từ chối.
- Các API tra cứu đơn bổ sung `transportPendingItemRefundDue`, `transportPendingItemRefundCount`, `transportPendingItemRefundOperationId`.
- API operation bổ sung lý do; tiến trình khách có `reasonCode`, `reasonText`.

### Cart gọi GoPay qua đường nội bộ

- `GET /api/v1/internal/payments/transport/item-operations/{id}/provider-refund`.
- `POST /api/v1/internal/payments/transport/item-operations/{id}/provider-refund` với người duyệt và số tiền đã chốt.

Các đường nội bộ dùng xác thực service; frontend không gọi trực tiếp và không có API token cổng thanh toán trong bundle.

## Xử lý theo nguồn thanh toán

### VNPAY

- Dùng API `refund`; hoàn toàn phần dùng loại 02, hoàn một phần dùng loại 03. Có phí hủy thì số hoàn có thể là một phần của khoản thu gốc.
- Dùng mã giao dịch, merchant và thời điểm khởi tạo thanh toán gốc đã lưu, không dùng mã đơn thay cho `vnp_TxnRef`.
- Ký request theo hợp đồng merchant Web API. Kiểm tra chữ ký response, merchant, mã gốc, số tiền, loại giao dịch và trạng thái cuối.
- Mã phản hồi 00 với trạng thái còn chờ 05/06 không được đánh dấu đã hoàn. Khi có mã hoàn, tiếp tục truy vấn kết quả.
- Nếu timeout mà chưa có mã hoàn để xác minh, không tự gửi lại một lệnh có thể đã chi tiền; giữ hồ sơ chờ đối soát trên merchant.
- Hệ thống hiện đang cấu hình **VNPAY sandbox**. Luồng real/sandbox phải tương ứng merchant và tài khoản của môi trường đó.
- Khi chuyển production, cần đặt `vnpay.refund-api-url` theo URL API trong hợp đồng merchant và `vnpay.refund-ip-address` theo cấu hình máy chủ; không suy đoán endpoint production từ URL trang thanh toán. URL chỉ nhận HTTPS trên các host VNPAY được cho phép, không chuyển tiếp sang host tùy ý.

Tài liệu chính thức: [VNPAY querydr và refund](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html).

### SePay

Đã có adapter API v2 hoàn theo giao dịch và tra cứu trạng thái, dùng cùng khóa idempotency khi đối soát/gửi lại một yêu cầu chưa rõ kết quả. Chỉ trạng thái `succeeded` mới được ghi nhận hoàn thành.

Theo tài liệu hiện tại, hoàn tiền SePay áp dụng cho **VietinBank doanh nghiệp đã được mở quyền**. Không phải chỉ có webhook hoặc API đọc giao dịch là đã có quyền chi hoàn. Cần cấu hình:

- `sepay.refund-enabled=true` sau khi tài khoản được mở quyền.
- `sepay.api-token` có quyền tương ứng.
- `sepay.refund-bank-account-id`: UUID tài khoản ngân hàng trong API v2.

Nếu chưa cấu hình, giao diện báo không đủ điều kiện và giữ luồng đối soát/thủ công. Không tự bật hay gọi chi tiền SePay khi chưa có các điều kiện đó.

Nguồn chính thức: [Hoàn theo giao dịch](https://developer.sepay.vn/vi/sepay-api/v2/hoan-tien/hoan-tien-giao-dich), [Tra cứu hoàn tiền](https://developer.sepay.vn/vi/sepay-api/v2/hoan-tien/chi-tiet), [Chống trùng và đối soát](https://developer.sepay.vn/vi/sepay-api/v2/hoan-tien/chong-trung-va-doi-soat).

### MOCK và tiền mặt

- Chỉ giao dịch gốc có provider MOCK mới được hoàn mô phỏng. Không biến giao dịch ngân hàng thật thành MOCK khi cổng từ chối.
- MOCK ghi kết quả vào đúng sổ tiền và cập nhật vé nhưng không chuyển tiền ngân hàng; giao diện ghi rõ mô phỏng.
- Vé thu tiền mặt không tự động hoàn qua một giao dịch online không tồn tại; vẫn dùng hoàn tại quầy/ca tiền mặt hoặc xác nhận chuyển khoản đã thực hiện theo nghiệp vụ cũ.

## Lưu dữ liệu và chống trùng

Database CartandOrder:

- `transport_item_operation_reasons`: lý do, người yêu cầu và thời điểm.
- `transport_automatic_refund_requests`: phê duyệt, số tiền và trạng thái tiếp tục xử lý sau restart.

Database PaymentandWallet:

- `transport_operation_refund_sources`: nguồn tiền gốc/khoản bù được phân bổ để hoàn.
- `transport_provider_refund_jobs`: nghĩa vụ hoàn đã được phê duyệt.
- `transport_provider_refund_legs`: từng giao dịch nguồn, khóa chống trùng, request/response và kết quả cổng.

Tiền được kiểm tra ở cả Cart và GoPay. Khóa theo đơn và lease theo nguồn chặn xử lý đồng thời. Số hoàn và các khoản đang giữ chỗ hoàn không được vượt khoản thu gốc. Kết quả cổng thành công được dùng làm chứng cứ để chạy tiếp quy trình ghi sổ/đồng bộ vé đã có; không sửa trực tiếp cột trạng thái để giả thành công.

Worker Cart tiếp tục các yêu cầu đã duyệt còn chờ. Không rollback phiên bản trong lúc có yêu cầu đang gửi/đối soát mà chưa kiểm tra các bảng trên.

Migration cộng thêm, chạy bằng `node deploy/migrate-goticket-refund-api.mjs`; không chạy lại migration tạo schema ban đầu. Script SQL nằm trong `deploy/sql/goticket-refunds-cart.sql` và `deploy/sql/goticket-refunds-pay.sql`.

## Kiểm tra và giới hạn

- [x] Build frontend, CartandOrder và PaymentandWallet.
- [x] Năm kiểm tra hợp đồng VNPAY: chờ ngân hàng, sai số tiền, sai chữ ký, thành công đã xác minh, timeout không gửi lại lệnh. Dùng response có kiểm soát để kiểm tra adapter, không phải giao dịch ngân hàng thật.
- [x] Luồng giao diện khách nhập lý do → Admin xác nhận → hoàn MOCK đúng số tiền → khách thấy REFUNDED.
- [x] Kiểm tra chống xác nhận sai số tiền, sai quyền và bấm lại không hoàn lần hai.
- [x] Kiểm tra chỉ đọc điều kiện/số tiền VNPAY cho đơn trong ảnh; trả đúng VNPAY sandbox và số phải hoàn 180.000 đồng.
- [x] Đơn CONFIRMED có khoản hoàn từng vé vẫn được truy vấn thấy trong cả REFUNDS và ATTENTION trước phân trang.
- [x] Kiểm tra giao diện xác nhận trên máy tính và hiển thị lý do trên viewport điện thoại 390px.

Bằng chứng dữ liệu sau kiểm tra MOCK 200.000 đồng: đúng **1** nguồn hoàn thành, **1** sự kiện REFUND và **1** chứng từ, dù đã gửi lại xác nhận. Hai đơn trong ảnh có **0** provider refund job do quá trình kiểm tra tạo ra; không gửi lệnh chi tiền cho chúng. Dữ liệu/ảnh kiểm tra nằm trong thư mục riêng `.data/goticket-journey-audit/20261026-automatic-refunds/`, được Git bỏ qua.

Đã build và restart `gostay-payment`, `gostay-cart`, `gocar-frontend`. Bản trước thay đổi nằm tại `.release-backups/goticket-automatic-refund-20261026/`.

Hồ sơ cũ có nhiều nguồn thu nhưng thiếu phân bổ được chuyển sang đối soát thay vì tự đoán nguồn để chi tiền. Một phần nguồn đã hoàn nhưng nguồn khác thất bại phải đối soát từng nguồn; không cho hoàn thủ công lại toàn bộ.

Quyền merchant/ngân hàng vẫn do nhà cung cấp quyết định. Có adapter và nút gọi API không đồng nghĩa mọi tài khoản đều được cổng cho hoàn. Không kiểm tra bằng chuyển tiền ngân hàng thật trong đợt này.

## Bổ sung khi VNPAY trả mã 94 trong quá trình tra cứu

Đã ghi nhận một yêu cầu hoàn 180.000 đồng có mã gốc `15715563`, mã hoàn `15715594`. Sau khi giãn truy vấn, VNPAY trả phản hồi querydr có chữ ký hợp lệ, loại giao dịch 03, số tiền 18.000.000 đơn vị API (= 180.000 đồng), trạng thái 05. Đây là **đang xử lý**, chưa phải hoàn thành.

Lỗi thông báo trước đó: phản hồi ngắn `{vnp_ResponseCode: "94", vnp_Message: "Request is duplicated"}` không có chữ ký bị gán chung thành sai chữ ký. Bản sửa phân biệt phản hồi lỗi không chữ ký với một phản hồi thành công chưa xác thực. Phản hồi thành công vẫn bắt buộc xác thực chữ ký và đối chiếu giao dịch/số tiền.

- GoPay lưu `next_attempt_at` và chỉ truy vấn VNPAY khi đến hạn, mặc định tối thiểu 300 giây giữa các lần; worker Cart không đồng nghĩa gọi sang VNPAY mỗi 15 giây.
- `transport.refunds.vnpay-poll-seconds` cấu hình khoảng chờ trong giới hạn 300–3.600 giây. Đây là nhịp truy vấn của ứng dụng, không phải cam kết thời gian hoàn của VNPAY.
- Bảng `transport_provider_refund_observations` giữ từng phản hồi, loại SUBMIT/POLL, kết quả kiểm tra chữ ký và thời điểm ghi nhận. Phản hồi lỗi lần sau không xóa lịch sử phản hồi trước.
- Không gửi lại lệnh refund đã có `submitted_at`. Khi đã có mã hoàn, các lượt tiếp tục dùng querydr để đọc trạng thái.
- Migration bổ sung: `deploy/migrate-goticket-refund-observations.mjs`. Script migration hoàn tiền chính cũng đã bao gồm phần bổ sung này cho lần cài đặt sau.

Mã 94 có thể là yêu cầu trùng trong khoảng giới hạn truy vấn. Trạng thái 05 có nghĩa VNPAY đang xử lý giao dịch hoàn. [Đặc tả VNPAY](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html).

Kiểm tra bản sửa truy vấn VNPAY:

- 8 kiểm tra adapter đạt, gồm lỗi 94 không chữ ký, phản hồi thành công không chữ ký bị chặn và querydr hợp lệ dùng đủ vị trí checksum của hai trường khuyến mại tùy chọn.
- Sau triển khai, worker đã tự ghi thêm một phản hồi POLL: code 00, trạng thái 05, chữ ký hợp lệ; `next_attempt_at` cách lần truy vấn kế tiếp khoảng 5 phút.
- Giao diện Admin đã hiển thị đúng đang xử lý 180.000 đồng, mã gốc 15715563 và mã hoàn 15715594, không còn báo nhầm sai chữ ký cho hồ sơ này.
- Sổ tiền chưa có sự kiện REFUND cho hồ sơ vì VNPAY chưa trả trạng thái thành công. Không gửi lại lệnh chi hoàn và không sửa trạng thái thành đã hoàn.
- Bản build PaymentandWallet đã cài và restart `gostay-payment`. Bản trước sửa ở `.release-backups/goticket-vnpay-refund-fix-20261026/`; bằng chứng riêng ở `.data/goticket-journey-audit/20261026-vnpay-refund-fix/`.

## Bổ sung: nhiều vé cùng một giao dịch VNPAY

Một lần thanh toán có thể mua nhiều vé, nhưng mỗi yêu cầu hủy vé có operation riêng. Chỉ khóa theo operation/leg không ngăn được hai operation cùng gửi lệnh hoàn trên một giao dịch VNPAY gốc. Phản hồi 94 không có mã hoàn có thể khiến yêu cầu sau không còn đủ thông tin để tự tra cứu an toàn.

Đã sửa `ProviderRefundService`:

- Khóa hàng `payment_requests` trước khi nhận xử lý leg để tuần tự hóa các thao tác trên cùng khoản thu gốc.
- Đọc lại leg trong transaction; không dùng snapshot PREPARED cũ để quyết định gửi refund lần đầu.
- Ghi payload và dấu `submitted_at` cùng transaction nhận xử lý, trước khi gọi cổng.
- Nếu giao dịch gốc đã có khoản hoàn SENDING/PENDING, yêu cầu mới được giữ ở hàng đợi, chưa đánh dấu gửi và chưa gọi refund. Yêu cầu đã gửi vẫn được querydr để lấy kết quả cuối.
- Khoảng chờ VNPAY được dùng chung giữa các leg đã gửi trên cùng giao dịch gốc, kể cả khoảng chờ sau khi leg trước vừa có kết quả cuối. Khi hết khoảng chờ và khoản trước đã kết thúc, worker mới gửi khoản tiếp theo.
- Không thay đổi khoản tiền phải hoàn, không tạo lại yêu cầu hoàn 180.000 đồng đang xử lý.

Ba kiểm tra tập trung bổ sung xác nhận: khoản trước đang chờ thì không tạo payload mới; leg đã gửi được đọc lại thì không gửi lần đầu lần nữa; khoản trước đã xong nhưng chưa hết khoảng chờ thì vé tiếp theo vẫn chờ. Cùng 8 kiểm tra adapter, tổng 11 kiểm tra đạt. Đây là kiểm tra kiểm soát gọi cổng, không chứng minh VNPAY đã hoàn tiền.

Nguồn chính thức về giới hạn querydr trong 5 phút: [Bảng mã lỗi VNPAY](https://sandbox.vnpayment.vn/apis/docs/bang-ma-loi/). Không coi 5 phút là thời hạn VNPAY phải hoàn tất khoản hoàn.

## Kiểm tra mới bằng thẻ NCB sandbox thực tế lúc 21:35 ngày 26/10/2026

Đã đi qua giao diện đang chạy, không thay response HTTP và không dùng thanh toán MOCK:

1. Tài khoản khách demo đặt ghế A03 trên chuyến demo ngày 28/10, giá 200.000 đồng.
2. Checkout GoTicket → portal GoPay → VNPAY sandbox → thẻ NCB test được VNPAY công bố → OTP test. Vé chuyển CONFIRMED sau thanh toán.
3. Khách hủy vé, chọn lý do Khác và nhập mô tả DEMO. Vì còn hơn 1.440 phút trước khởi hành, nghĩa vụ hoàn là 200.000 đồng.
4. Admin mở đúng hồ sơ, kiểm tra cổng VNPAY/SANDBOX và số tiền, ấn Xác nhận hoàn tiền một lần trên bản Pay đã build/restart có hàng đợi theo giao dịch gốc.
5. VNPAY trả `vnp_ResponseCode=00`, `vnp_TransactionType=02`, `vnp_TransactionStatus=05`, chữ ký hợp lệ, mã hoàn mới `15715618` cho giao dịch gốc `15715616`. Hệ thống giữ PENDING, hẹn tra cứu sau 5 phút.

| Hồ sơ | Mã GD thu gốc | Mã hoàn VNPAY | Số hoàn | Kết quả đã quan sát |
|---|---|---|---:|---|
| Khách đã thao tác trước đó | 15715563 | 15715594 | 180.000 đồng | querydr có chữ ký hợp lệ, mã 00, trạng thái 05 |
| Demo NCB hoàn toàn phần | 15715616 | 15715618 | 200.000 đồng | refund có chữ ký hợp lệ, mã 00, trạng thái 05 |

Merchant đang cấu hình: **G8S6QAIQ**. Đơn demo mới: `2c5e9027-a88b-4dfb-b965-3fa93a83dfac`. Operation demo: `6df8f3bc-73db-4b54-a0d6-192dadeeb579`.

Điểm chưa hoàn tất: chưa có phản hồi VNPAY xác nhận trạng thái hoàn thành cho cả hai mã hoàn. Không được đánh dấu kiểm tra hoàn ngân hàng đầu-cuối đã đạt. Kết quả quan sát chứng minh cổng đã nhận và tạo giao dịch hoàn cho cả hoàn một phần/toàn phần; không chứng minh ngân hàng đã trả tiền hay merchant portal đã cập nhật danh sách.

Sau khi được cung cấp mã merchant và mã hoàn để tra cứu, người dùng đã xác nhận trên merchant portal: **Có giao dịch, đang chờ xử lý**. Kết quả này phù hợp với phản hồi API có chữ ký hợp lệ, trạng thái 05. Ảnh trước đó hiển thị danh sách trống không còn đủ căn cứ để kết luận cổng chưa tạo giao dịch. Không khẳng định có nút duyệt hay cần chờ đến ngày nào khi chưa có bằng chứng từ merchant/VNPAY.

Nếu cần làm việc với kỹ thuật VNPAY, cung cấp bảng mã giao dịch ở trên và phản hồi đã xác minh: code 00/state 05, thời điểm gửi 20:44:51 và 21:35:27 ngày 26/10/2026 (giờ Việt Nam). Yêu cầu họ kiểm tra hồ sơ refund sandbox của merchant G8S6QAIQ, nơi hiển thị trên merchant portal và cách môi trường này trả trạng thái cuối. Không gửi hash secret, cookie hoặc token đăng nhập. [Trang liên hệ kỹ thuật chính thức](https://sandbox.vnpayment.vn/apis/contact/).

Sau khi VNPAY trả trạng thái thành công đúng mã hoàn, worker có sẵn sẽ xác minh chữ ký/nguồn/số tiền rồi ghi chứng từ và đồng bộ vé. Không yêu cầu khách/Admin tạo lệnh hoàn mới cho các mã đã tồn tại.

Bằng chứng riêng: `.data/goticket-journey-audit/20261026-vnpay-full-journey/`. Thư mục có cookie/URL giao dịch ký số nên được Git bỏ qua và không đính kèm công khai. Bản Pay trước bổ sung hàng đợi ở `.release-backups/goticket-refund-source-queue-20261026/`. Không sửa frontend ở lần bổ sung này.

## Giả lập kết quả đã duyệt để kiểm thử — 26/10/2026

Đã bổ sung theo yêu cầu của người dùng. Đây là kết quả mô phỏng của GoPay, không giả chữ ký hay sửa phản hồi VNPAY thành `00`.

### Cách sử dụng

Admin → Khiếu nại & Hoàn tiền → hồ sơ hoàn từng vé → **Hoàn qua GoPay** → **Hoàn mô phỏng** → **Xác nhận hoàn mô phỏng**.

Ứng dụng ghi đúng số phải hoàn theo chính sách, chạy tiếp luồng chứng từ/ghi sổ/đồng bộ vé như khi nhận kết quả thành công. Chứng từ có `refund_method=SIMULATED`, tham chiếu `AUTO-SANDBOX-SIM-REFUND-{operationId}`. Trang tiến trình của khách hiển thị **Đã hoàn tiền mô phỏng**.

### API và điều kiện

- Admin: `POST /api/v1/orders/transport/admin/item-operations/{id}/automatic-refund/simulate`, body `{"amount":"200000"}`.
- Cart gọi GoPay nội bộ: `POST /api/v1/internal/payments/transport/item-operations/{id}/provider-refund/simulate`, kèm actor và amount; giữ xác thực service.
- API status hiện có bổ sung `simulated` và `simulationEligible`; API tiến trình khách bổ sung `refundSimulated`.
- Máy chủ phải bật `vnpay.sandbox-refund-simulation-enabled=true`. Mặc định code là false; hiện đã bật trong cấu hình riêng của server test.
- Cả cấu hình hiện tại và URL thanh toán gốc đã lưu trong `vnpay_payment_attempts` phải là sandbox. Giao dịch gốc phải VNPAY/COMPLETED, có attempt SUCCEEDED, mã phản hồi và trạng thái thanh toán gốc 00, đúng merchant. Không chỉ dựa vào cấu hình hiện tại để nhận diện một giao dịch lịch sử.
- Chỉ Admin được gọi; số tiền phải bằng nghĩa vụ hoàn. Không chấp nhận mô phỏng một khoản đã có phần hoàn thành qua cổng. Lệnh đang giữ lease phải kết thúc trước khi xác nhận mô phỏng.

### Dữ liệu và worker

- GoPay lưu bằng chứng riêng tại `transport_provider_refund_simulations`: operation, người xác nhận, số tiền, môi trường SANDBOX, snapshot trạng thái thật trước mô phỏng và thời điểm.
- Giữ nguyên `provider_ref`, `response_json` và trạng thái thật trong `transport_provider_refund_legs`; không sửa trạng thái 05 của VNPAY.
- Cart lưu `execution_mode=SIMULATION` trong hàng đợi trước khi xử lý. Worker phục hồi chỉ gọi đường mô phỏng cho hồ sơ đó, tránh gửi refund thật do retry.
- Sau mô phỏng, GoPay trả SUCCEEDED kèm `simulated=true`; Cart ghi chứng từ SIMULATED, hoàn tất sự kiện REFUND và cập nhật đơn/vé. Xác nhận lại trả kết quả cũ; không tạo khoản hoàn thứ hai.
- Những khoản đã mô phỏng tiếp tục trả kết quả đã lưu ngay cả khi sau này tắt cờ, để không tái gửi lệnh chi qua cổng. Tắt cờ và restart Pay sẽ chặn tạo mô phỏng mới.
- Migration cộng thêm: `node deploy/migrate-goticket-refund-simulation.mjs`; migration hoàn tiền chính cũng đã chứa phần này.

### Kết quả đã kiểm tra trên ứng dụng đang chạy

- Đơn demo `2c5e9027-a88b-4dfb-b965-3fa93a83dfac`, operation `6df8f3bc-73db-4b54-a0d6-192dadeeb579`: mô phỏng 200.000 đồng → Cart COMPLETED, đơn REFUNDED, khách thấy dấu mô phỏng.
- Sau một lần xác nhận và một lần gửi lại: đúng **1** simulation audit, **1** chứng từ SIMULATED, **1** sự kiện REFUND.
- Giao dịch VNPAY `15715618` vẫn giữ phản hồi thật trạng thái 05/PENDING. Không có provider observation mới sau lúc mô phỏng được ghi nhận trong lần kiểm tra.
- Hồ sơ 180.000 đồng, mã hoàn VNPAY `15715594`, vẫn PENDING và chưa mô phỏng; để người dùng tự thử nút mới.
- API từ chối khách tự xác nhận (403) và số tiền sai (409). Kiểm tra giao diện Admin/khách trên desktop và điện thoại đã đạt.
- Build Pay, Cart, frontend đạt. 15 kiểm tra tập trung adapter/nhận xử lý đạt, gồm chặn mô phỏng mặc định, nguồn production lịch sử và cấu hình production hiện tại. Không chạy toàn bộ bộ test dự án.

Đã cài build và restart `gostay-payment`, `gostay-cart`, `gocar-frontend`. Bằng chứng riêng ở `.data/goticket-journey-audit/20261026-sandbox-refund-simulation/`; bản trước thay đổi ở `.release-backups/goticket-sandbox-refund-simulation-20261026/`.
