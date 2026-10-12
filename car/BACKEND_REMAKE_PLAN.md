# Kế hoạch remake backend GoCar bằng các service dùng chung

**Trạng thái (11/10/2026): đã bổ sung code vận hành backend V1, chưa xác nhận hoàn thiện bằng kiểm thử.** Đợt bổ sung này có manifest/no-show, hoàn thành chuyến → đơn → điều kiện review, giá theo hạng ghế và snapshot mở bán, quote có ID/version/hash và claim một lần, retry publication, chặn/mở ghế, quyền nhân viên theo chuyến, chốt ca riêng, notification outbox/QR vé xe, nội dung offer của vendor, báo cáo vận hành và credential nội bộ theo caller/receiver. Theo yêu cầu của chủ dự án, **không chạy test/build, không gửi email hoặc gọi provider, không migrate/restart hệ thống đang phục vụ** trong đợt này. Kết quả test trước đây không xác nhận các thay đổi mới. GoCar frontend/backend vẫn giữ tắt.

Đổi vé V1 là quy trình hỗ trợ cho **toàn đơn**, cùng nhà xe/phương thức/số hành khách: đơn thay thế phải có thanh toán online hoặc biên nhận CASH trước, sau đó hủy/hoàn đơn cũ; lưu tiền cũ, tiền mới và chênh lệch. **Cập nhật đợt completion:** đã bổ sung source đổi/hủy từng item và GoPay credit/delta/refund ledger, cùng net settlement. Assisted full-order exchange bên trên là nhánh tương thích cũ. Source/API/migration thực tế xem `BACKEND_COMPLETION_PLAN.md` mục 21; chưa build/test/migrate nên chưa tuyên bố sẵn sàng chạy. Hoàn ngân hàng vẫn là tác vụ bên ngoài rồi ghi chứng từ. Cổng phát hành còn cần kiểm thử code mới, migration cô lập, regression GoTravel, provider sandbox, backup/rollback và canary. API/runbook bổ sung nằm trong `BACKEND_OPERATIONS.md`.

**Phạm vi:** backend xe khách; frontend và payment portal làm sau khi hợp đồng backend ổn định.

## Tóm tắt: tận dụng service nào và phải sửa gì?

| Service | Tận dụng phần đang có | Phải mở rộng cho GoCar | Cách giữ an toàn cho GoTravel |
|---|---|---|---|
| CatalogandListing | Listing, ảnh, thông tin nhà cung cấp, tìm kiếm/đánh giá | Thêm offer TRANSPORT gắn nhà xe/tuyến; giá chỉ để hiển thị, không chốt tiền vé | Luồng STAY/EXP/SVC giữ nguyên; TRANSPORT không gọi khởi tạo lịch tồn kho 90 ngày |
| BookingandInventory | Hạ tầng giữ chỗ, hạn giữ, xác nhận/nhả và API nội bộ | Thêm module tồn kho ghế theo tripId + seatId, reserve nhiều ghế atomically, worker hết hạn và đối soát | Bảng InventoryCalendar và thuật toán tồn số lượng của GoTravel không đổi; thêm test expiry cho lock cũ |
| CartandOrder | Order, lịch sử mua, payment summary cho GoPay, dispute/audit | Thêm orderKind TRANSPORT, mỗi ghế một order item, quote tin cậy từ GoCar, checkout riêng, tiền mặt/biên nhận, phát vé qua GoCar | Không trộn giỏ hàng hoặc thay thuật toán tính giá GoTravel; giữ API/DTO cũ qua adapter và regression test |
| GoPay/PaymentandWallet | VNPAY/SePay, webhook, giao dịch và đường tích hợp Cart đang dùng | Hiểu loại order và nhà xe trong payment summary, phí/settlement, nhãn thanh toán và refund đúng trạng thái | Không đổi contract GoTravel đang gọi; thêm trường tùy chọn/version và kiểm thử thanh toán GoTravel |
| GoCar | Operator, xe, tuyến, chuyến hiện có | Hoàn thiện sơ đồ ghế, điểm đón/trả, giá/quote, nhân viên, vé/QR, check-in, hủy chuyến; gọi các service trên | GoCar không tự giữ một bản tồn ghế hay đơn thanh toán thứ hai |

**Luồng chung:** GoCar báo giá → Cart tạo đơn → Inventory giữ ghế 15 phút → GoPay xác thực tiền online (hoặc Cart ghi biên nhận CASH) → Inventory chốt ghế SOLD → GoCar phát hành vé. Các bước qua nhiều database dùng idempotency, outbox, retry và đối soát; không dựa vào một transaction chung giả định.

## 1. Quyết định kiến trúc

GoCar là service **vận hành vận tải**, còn các service dùng chung xử lý khám phá sản phẩm, giữ tài nguyên, đơn hàng và tiền. Không tạo thêm một hệ thống booking và tồn ghế có quyền ghi độc lập trong GoCar.

| Dữ liệu/quyết định | Nguồn sự thật | Ranh giới |
|---|---|---|
| Tài khoản, duyệt nhà xe, vai trò TICKET_VENDOR | GoID/Identity | GoCar chỉ lưu hồ sơ vận hành và quyền nhân viên theo nhà xe; không duyệt nhà xe lần hai. |
| Nhà xe, xe, sơ đồ ghế mẫu, tuyến, điểm đón/trả, lịch chạy, chuyến, biểu giá, nhân viên, manifest, check-in | GoCar | Có thể lưu cache số ghế và trạng thái vé để đọc; cache không quyết định ghế còn bán được. |
| Bài giới thiệu nhà xe/tuyến, ảnh, phân loại, review, khả năng xuất hiện trong tìm kiếm | CatalogandListing | Một listing TRANSPORT gắn với một tuyến/offer ổn định, không tạo listing cho mỗi chuyến/ghế. Giá hiển thị là giá từ, không phải báo giá checkout. |
| Ghế thực tế của từng chuyến, chặn ghế, hold có hạn, SOLD, nhả ghế | BookingandInventory | Module transport riêng với khóa (tripId, seatId); không nhét ghế vào lịch listing/ngày/timeSlot hiện có. |
| Đơn thương mại, người mua, từng ghế/hành khách, trạng thái thanh toán và cấp vé, hủy/đổi, biên nhận tiền mặt, khiếu nại | CartandOrder | Một order cho một chuyến và một lần giữ ghế; GoCar chỉ phát hành vé/QR như kết quả fulfillment, khóa theo orderId + orderItemId. |
| Giao dịch online, xác thực webhook, hoàn tiền online, ví/settlement | GoPay/PaymentandWallet | Tiền mặt do nhà xe giữ, Cart lưu biên nhận và đối soát; không tạo giao dịch GoPay giả. |
| JWT/route, ảnh/email, gợi ý địa danh | Gateway, media/communication, search | Dùng lại có mở rộng quyền/mẫu; dịch vụ tìm kiếm không quyết định tồn ghế. |

**Bất biến:** một ghế của một chuyến chỉ có một owner ghi trạng thái bán: Inventory. Một đơn chỉ có một owner ghi trạng thái thương mại: Cart. Một giao dịch online chỉ có một owner ghi trạng thái tiền: GoPay. Vé/QR trong GoCar là chứng từ lên xe, phải tham chiếu order item đã trả tiền/ghi nhận tiền mặt; không có lệnh công khai “tự xác nhận vé”.

Hệ quả công sức: đây là thay đổi xuyên **GoCar + Catalog + Inventory + Cart + GoPay**, không phải chỉ sửa GoCar. Đổi lại có một luồng order/hold/payment dùng lâu dài cho các loại sản phẩm. Giữ chung service không có nghĩa ép mọi loại sản phẩm dùng chung bảng tồn kho hoặc chung thuật toán tính giá.

## 2. Hiện trạng code và lỗ hổng cần xử lý

- GoCar hiện có operator, car, route, trip trên NestJS/Prisma nhưng chưa có booking/check-in hoàn chỉnh. Schema Ticket unique theo (tripId, seatNumber) nên vé hủy khó bán lại; tiền đang dùng Float; xe chỉ có totalSeats. Hủy chuyến hiện sửa Ticket cục bộ mà không điều phối hoàn tiền. Các controller còn nhận userId từ body/query và kiểm role dạng chuỗi, phải sửa trước khi mở API bán vé.
- Catalog chỉ có STAY/EXP/SVC; PriceUnit chưa có PER_SEAT; thuộc tính listing, quyền HOST/ENTERPRISE và lúc tạo listing đều đang giả định GoTravel. Nếu thêm TRANSPORT trực tiếp vào đường tạo cũ, Catalog sẽ gọi Inventory.initializeInventory để sinh lịch 90 ngày sai mô hình. Review hiện kiểm giao dịch theo listing; cần giữ điều kiện verified purchase với đơn TRANSPORT.
- Inventory có InventoryCalendar theo listing + ngày + timeSlot, availableQuantity và lock theo orderId. batchLock đặt hạn 15 phút nhưng chưa thấy worker tự giải phóng lock quá hạn; chỉ dựa vào GoPay expiry là thiếu vì đơn có thể chưa tạo payment request. confirm/cancel hiện thao tác lock số lượng; cancel có thể nhả cả lock đã CONFIRMED, nên không dùng nguyên API đó để huỷ vé sau trả tiền.
- Cart OrderItem bắt buộc listingId, ngày bắt đầu/kết thúc, lấy giá lại từ Catalog.basePrice. Order.userId hiện bắt buộc; khách vãng lai mua CASH cần mô hình buyer khác. confirmPayment gọi Inventory và gửi email khi đang xử lý transaction cục bộ; các đường cancel/fail có chỗ nuốt lỗi Inventory. Đây là rủi ro lệch order/tồn kho ngay cả với GoTravel và phải được bảo vệ bằng retry/đối soát.
- GoPay đã lấy payment summary và báo kết quả qua Cart, nên **giữ đường tích hợp GoPay ↔ Cart**. Cần thêm loại đơn và loại bên nhận tiền, sửa nội dung GoTravel hardcode và kiểm tra payout/fee. VNPAY refund hiện không tự hoàn; không được thông báo hoàn tiền thành công khi chỉ mới lập yêu cầu.
- payment_portal hiện chỉ hiểu order GoTravel và origin GoTravel. Backend phải trả summary đủ cho vé xe, nhưng portal là mốc frontend riêng. Không tuyên bố luồng online hoàn thành chỉ vì Cart có order.
- Gateway/GoID đã có TICKET_VENDOR, song Catalog/media/Cart chưa cấp đúng quyền vendor và owner scope. Không cấp quyền HOST rộng cho vendor để đi đường tắt.

## 3. Mô hình nghiệp vụ đích

### 3.1 Nguồn cung trong GoCar

- Operator map 1:1 tới user được GoID duyệt TICKET_VENDOR; xác minh quyền còn hiệu lực khi thao tác nhạy cảm. OperatorStaff là user GoID được gán vào operator, vai trò SELL_CASH, CHECK_IN, MANAGE_TRIP, CLOSE_SHIFT theo điểm bán/chuyến; có revoke và audit. Không dùng chung tài khoản chủ nhà xe.
- Vehicle có seat template ổn định: mã ghế, tầng, hạng, vị trí, trạng thái sử dụng. Số ghế kiểm tra khớp seat template. Trip chụp snapshot xe/tuyến/giờ/giá/ghế khi mở bán; sửa mẫu xe không âm thầm đổi ghế của chuyến đã bán.
- RouteStop/TripStop có thứ tự và giờ dự kiến; điểm đón phải nằm trước điểm trả trong cùng chuyến. V1 một ghế chiếm **toàn chuyến** dù hành khách xuống sớm. Chưa tái bán theo chặng; việc đó cần thuật toán overlap mới.
- GoCar là nguồn tính giá và điều kiện bán: giá theo chuyến/hạng ghế, phụ thu/giảm giá hợp lệ, thời gian đặt cuối, chính sách hủy phiên bản, thuế/phí nếu có. Dùng integer VND/Decimal, không Float. Quote có quoteId, tripId, seatIds, từng giá, tổng tiền, currency, expiry, policyVersion và hash/phiên bản dữ liệu. Cart chỉ nhận quote từ backend GoCar qua kênh nội bộ, không tin amount của browser. Checkout phải xác minh quote còn hiệu lực và chưa bị thay đổi giá/chuyến.
- Trip có trạng thái DRAFT → PUBLISHING → ON_SALE → STOP_SALE → DEPARTED → COMPLETED; CANCELLED là luồng điều phối riêng. Không cho mở bán trước khi Inventory đã tạo tất cả trip seats và Catalog có offer hợp lệ. Lỗi đồng bộ giữ chuyến ở PUBLISHING, worker retry/reconcile. Không xóa cứng chuyến/xe/tuyến đã phát sinh đơn/vé.
- Cấm hai chuyến cùng dùng một xe khi lịch chạy chồng lấn bằng transaction/DB constraint hoặc khóa tương đương; kiểm tra ứng dụng đơn thuần không đủ khi hai request cùng lúc.

### 3.2 Offer trong Catalog

- Thêm loại TRANSPORT và attribute typed chứa operatorRef, routeRef, điểm đầu/cuối, nhãn/ảnh, mô tả tiện ích, giá “từ”. Catalog sở hữu việc xuất bản và moderation; GoCar sở hữu sự thật vận hành và cập nhật projection khi tuyến/nhà xe đổi. Một tuyến có một offer public ổn định, các chuyến thuộc offer đó.
- Tách transport creation/upsert khỏi đường host listing STAY/EXP/SVC: chỉ GoCar service credential được đồng bộ offer, vendor có quyền chỉnh phần nội dung được phép qua API có ownership. Không chạy initializeInventory 90 ngày cho TRANSPORT. Không dùng Catalog.basePrice để chốt tiền vé.
- Search kết hợp Catalog offer với GoCar trip search; khi xem/đặt, GoCar kiểm trip đang bán và Inventory trả số ghế thực. Offer inactive thì ẩn khám phá/ngăn checkout mới, nhưng không hủy các đơn/vé đã bán. Nếu projection Catalog chậm, không làm sai giá hoặc tồn kho.
- Review TRANSPORT cần order item tương ứng offer và trạng thái đã đi/hoàn thành theo GoCar; không cho review từ order chờ thanh toán. Giữ toàn bộ rule và API review STAY/EXP/SVC như cũ.

### 3.3 Inventory ghế riêng trong BookingandInventory

- Thêm transport inventory module/tables, không biến ghế thành timeSlot. TripSeatResource unique (tripId, seatId), giữ snapshot seatCode/class, trạng thái AVAILABLE/HELD/SOLD/BLOCKED, holdId, orderId, expiresAt, version. SeatHold chứa holdId, tripId, buyerRef/actorRef, orderId khi gắn đơn, item snapshot và hạn 15 phút.
- Reserve nhiều ghế trong **một transaction Inventory**; khóa theo thứ tự seatId cố định hoặc compare-and-set có constraint DB để chống deadlock/oversell. Trả 409 kèm mã ghế xung đột, không giữ một phần. Hold idempotent theo command key; chỉ một order được gắn vào hold, không gia hạn vô hạn.
- Inventory phát hành hold với expiresAt từ server; Cart dùng chính deadline đó cho order và GoPay request. Chặn bắt đầu thanh toán sát hạn (ngưỡng cấu hình, thí dụ còn dưới 2 phút) để giảm trường hợp tiền đến sau khi ghế đã nhả.
- Worker quét hold quá hạn kể cả khi chưa tạo payment, cập nhật có điều kiện và nhả ghế đúng một lần; confirm SOLD/expire/release cùng khóa hàng và điều kiện trạng thái. Job restart được, có retry, không dùng clock của trình duyệt. Hold hết hạn không thể “confirm” hồi sinh.
- API nội bộ tách reserve, bindOrder, confirmSale, expire/releaseUnpaid, cancelSoldAfterTicketVoided, block/unblock và lookup/reconcile. cancelSold phải có reason, actor/correlation, và bằng chứng order/ticket đã được vô hiệu hóa; không dùng cancelLock chung để nhả vé đã bán. Block không được đổi SOLD/HELD thành AVAILABLE. Trip cancellation chặn hold mới ngay, rồi xử lý từng order.
- Inventory lưu orderId làm correlation, không chứa chính sách tiền/đơn. GoCar không có bảng TripSeat saleable thứ hai; nếu cần seat map cache phải ghi rõ là projection có độ trễ và không dùng để nhận đặt chỗ.

### 3.4 Đơn đa loại trong CartandOrder

- Giữ các API, DTO, logic checkout STAY/EXP/SVC hiện tại; thêm nhánh use case TRANSPORT riêng trong cùng service. Order có orderKind, providerType/providerRef, paymentMethod, paymentState, fulfillmentState, cancellation/refundState; giữ tương thích OrderStatus bên ngoài trong thời gian chuyển đổi. OrderItem vẫn có listingId là transport offer ID, thêm productRef (tripId + seatId), passenger/contact/pickup/dropoff snapshot, quoteVersion, policyVersion; **mỗi ghế là một item quantity=1** để sau này hoàn/đổi từng vé. Cột ngày cũ có thể lưu ngày khởi hành cho tương thích, nhưng không đại diện khoảng tồn kho.
- V1 một transport order cho **một chuyến**, có thể có nhiều ghế; không trộn vé xe với phòng/trải nghiệm trong một cart/checkout. API transport checkout riêng vẫn tạo vào cùng Order/OrderItem và tái dùng payment summary, order history, dispute, audit. Tránh thay đổi thuật toán giỏ GoTravel trước khi có test.
- Checkout: Cart lấy quote tin cậy GoCar → tạo order/idempotency record ở trạng thái chuẩn bị → reserve Inventory cho order đó → ghi holdId/deadline/price snapshot → PAYMENT_PENDING. Gọi remote ngoài DB transaction; nếu ghi order thất bại sau reserve, có compensation và sweeper tìm orphan hold. Order chưa reserve thành công không lộ là payable. Retry cùng idempotency key trả cùng order, không giữ ghế lần hai.
- Payment summary GoPay lấy từ Cart, gồm orderKind, orderId, payer, total immutable, currency, expiry, beneficiary/providerRef typed, phương thức được phép và status. Cart không nhận price hoặc provider từ body checkout. GoPay vẫn xác thực order qua endpoint hiện có; mapping response giữ trường legacy cho GoTravel và thêm trường tùy chọn cho GoCar.
- GoPay báo thành công: Cart kiểm eventId/paymentId duy nhất, order, amount, currency, deadline và trạng thái; gọi Inventory confirmSale có điều kiện. Nếu SOLD thành công, Cart đặt fulfillment pending và phát lệnh idempotent cho GoCar phát hành ticket/QR; chỉ khi GoCar xác nhận ticket mới public order CONFIRMED. Nếu GoCar tạm chết, ghế đã SOLD được giữ, worker retry và cảnh báo paid-but-unissued. Nếu Inventory đã hết hạn/ghế đã bán khác, ghi PAID_REVIEW/REFUND_PENDING, không cấp vé và không trả trạng thái thành công giả.
- Event trùng/đến sai thứ tự không đổi kết quả đã chốt. Thất bại thanh toán hoặc order hết hạn gọi releaseUnpaid; nếu Inventory không sẵn sàng, giữ pending compensation và retry, không nuốt lỗi rồi coi như đã nhả. Có reconciliation định kỳ Cart ↔ Inventory ↔ GoPay ↔ GoCar.
- Ticket trong GoCar unique theo (orderId, orderItemId), chứa trip/seat/passenger/pickup/dropoff snapshot và token check-in có thể thu hồi. Vé hủy vẫn giữ lịch sử, nên không đặt unique vĩnh viễn trên (tripId, seatCode) ở bảng vé. Cart là nguồn trạng thái thương mại; GoCar có read model cho manifest/check-in và endpoint kiểm ticket hiện còn hiệu lực.

## 4. Luồng nghiệp vụ phải đúng

### 4.1 Khách mua online

1. Khách chọn chuyến/ghế và điểm đón/trả; GoCar trả quote có hạn từ dữ liệu server. Cart xác thực user từ JWT, offer/trip và quote, tạo order; Inventory giữ chính các trip seats đó 15 phút.
2. Cart trả orderId, hold expiry và payment state. GoPay tạo payment request dựa trên payment summary của Cart; browser không tự gửi amount. Payment expiry không được vượt hold expiry.
3. Provider callback được GoPay xác thực; GoPay thông báo Cart bằng internal auth + idempotency/retry. Cart kiểm tiền, confirmSale tại Inventory rồi yêu cầu GoCar issue ticket. Email được gửi qua outbox sau khi ticket đã có.
4. Nếu callback tới trễ, kể cả provider paidAt trước deadline nhưng ghế đã được bán lại do event đến muộn, đưa vào review/hoàn; không bán trùng hoặc tự thu hồi vé của người khác. Payment request hết hạn không chứng minh provider không thu tiền: phải đối soát.
5. Lấy vé/lịch sử từ Cart + GoCar theo owner; mất email không làm mất vé. QR/check-in chỉ hợp lệ khi order/ticket còn hiệu lực.

### 4.2 Nhân viên nhà xe thu tiền mặt

1. Nhân viên đăng nhập GoID, GoCar kiểm assignment SELL_CASH và chuyến thuộc nhà xe. Có thể lập order cho khách vãng lai với tên/số liên hệ; userId nullable chỉ khi orderKind=TRANSPORT, paymentMethod=CASH, actor là nhân viên hợp lệ. CHECK constraint/validation bảo vệ các loại đơn GoTravel.
2. Cart tạo cash order và giữ ghế qua Inventory trước khi thu. Nhân viên nhập số tiền thực thu; server chỉ chấp nhận đủ số tiền order và idempotency key. Sau khi nhân viên xác nhận **đã nhận tiền vật lý**, Cart ghi journal CashReceipt bất biến: receiptNo, amount, currency, actor, operator, shift, point of sale, timestamp, orderId. Không có GoPay payment request.
3. Cart confirmSale ở Inventory và issue ticket qua GoCar như online. Vì tiền vật lý không thể rollback, nếu Inventory/GoCar lỗi sau khi nhận tiền, giữ trạng thái CASH_RECEIVED_PENDING_RECONCILIATION, biên nhận còn nguyên, khóa cấp vé và cảnh báo hoàn/giải quyết; không xóa dấu vết hoặc tự giả trạng thái CONFIRMED. Chỉ cho nhân viên in vé khi ticket phát hành thành công.
4. Ca thu tiền có open/close, tổng biên nhận, tiền kiểm đếm, chênh lệch và người xác nhận. Nhà xe giữ tiền mặt; báo cáo tách tiền nhà xe giữ, khoản hoa hồng phải trả nền tảng và tiền GoPay giữ. Hoàn CASH do nhân viên có quyền ghi chứng từ/duyệt theo ngưỡng; không đánh dấu hoàn trước khi có bằng chứng khách đã nhận tiền. Không hỗ trợ bán khi mất mạng ở V1.

### 4.3 Hủy, đổi, check-in và chuyến bị hủy

- Chính sách mặc định có version/snapshot theo order: khách hủy trước khởi hành từ 24 giờ hoàn 100%; 6 đến dưới 24 giờ phí 10%; dưới 6 giờ chuyển hỗ trợ. Nhà xe hủy chuyến: hoàn 100% hoặc đổi chuyến khi khách đồng ý. Phí nền tảng/bên chịu phí cấu hình theo hợp đồng. Không hardcode policy vào controller.
- Hủy trước khi trả tiền: Cart cancel order, Inventory releaseUnpaid. Hủy sau thanh toán: Cart xác định quyền/mức hoàn, yêu cầu GoCar vô hiệu hóa ticket, Inventory cancelSold, mở refund case; các bước có outbox/idempotency/retry. Nếu bước nào lỗi, giữ trạng thái trung gian và chặn bán lại cho đến khi ticket đã vô hiệu. Chỉ hiển thị REFUNDED khi GoPay xác nhận hoàn thật hoặc CASH có chứng từ hoàn.
- Hoàn VNPAY hiện cần xử lý riêng; giai đoạn chưa có provider refund API thực thì REFUND_PENDING/MANUAL_ACTION_REQUIRED, không gửi email “đã hoàn”. Phải quyết định phương thức hoàn cho SePay/chuyển khoản và settlement cho vendor trước go-live.
- Đổi ghế/chuyến giữ tài nguyên mới trước, tính chênh lệch, điều phối thanh toán/hoàn, rồi vô hiệu vé cũ và nhả ghế cũ. Nếu lỗi, giữ vé cũ còn hiệu lực hoặc trạng thái cần xử lý, không tạo hai vé active cho cùng nghĩa vụ. V1 có thể giới hạn đổi ở hỗ trợ thủ công nhưng schema/trạng thái phải dự phòng.
- GoCar check-in theo ticket active, đúng trip/operator, staff được phân công, chưa check-in; ghi actor, điểm, thời gian, kết quả idempotent. Không cho self-cancel bình thường sau check-in/khởi hành. No-show chỉ đánh dấu sau ngưỡng cấu hình.
- Hủy chuyến: GoCar STOP_SALE và Inventory block new holds trước; xác định order bị ảnh hưởng trong Cart; xử lý mỗi đơn hoàn/đổi, vô hiệu ticket, thông báo, audit. Không chỉ đổi cột Trip/Ticket. Chuyến đã DEPARTED/COMPLETED cần quy trình admin ngoại lệ.

## 5. Hợp đồng tích hợp và quyền

| Hợp đồng | Producer → Consumer | Điều kiện |
|---|---|---|
| TransportOfferChanged / upsert offer | GoCar → Catalog | Stable operator/routeRef, version, idempotency; catalog từ chối vendor chưa có quyền, không sinh lịch GoTravel. |
| PublishTrip / seat snapshot | GoCar → Inventory | Trip/seat IDs ổn định, seat map và giá snapshot, chỉ mở bán khi Inventory ack đủ và Catalog offer active. |
| GetTransportQuote | Cart → GoCar | Internal auth, kiểm trip, seat, stop, policy, price; quote ký/phiên bản và expiry; không dùng giá Catalog. |
| Reserve/Confirm/Release/CancelSold | Cart → Inventory | Order/hold IDs, idempotency, CAS trạng thái, trả lỗi có thể retry; không truyền quyền bán ghế từ browser. |
| PaymentSummary/PaymentResult | GoPay ↔ Cart | GoPay lấy dữ liệu order tin cậy; result có event ID, provider transaction ID, amount/currency; Cart dedupe và trả ack sau khi lưu bền vững. |
| Issue/VoidTicket | Cart → GoCar | orderId + orderItemId unique, command ID, actor/reason, retry; response có ticket IDs; không issue nếu chưa SOLD và có bằng chứng payment/CASH. |
| CashSale / StaffAuthorization | GoCar → Cart | GoCar xác thực assignment; Cart lưu actor/operator/shift và kiểm lại ràng buộc qua scoped internal credential, không để browser gọi API cash internal. |

Internal API có service identity theo audience/scope, allowlist mạng, timeout, bounded retry, correlation ID và audit. Shared INTERNAL_SERVICE_TOKEN hiện có chỉ là nền để chuyển tiếp, không đủ làm phân quyền chi tiết lâu dài. Gateway chỉ công bố public/customer/vendor/staff/admin route thích hợp; GoCar/Cart vẫn kiểm JWT, owner và staff assignment tại service. Bỏ fallback userId từ body/query và kiểm role bằng includes. TICKET_VENDOR không được mặc nhiên quản lý listing GoTravel hay order nhà xe khác.

GoPay không cần thêm nhánh callback trực tiếp sang GoCar: Cart đã là trung tâm order. Tuy nhiên phải mở rộng payment summary, beneficiary/settlement theo providerType=TRANSPORT, phí/hoa hồng, hiển thị nội dung thanh toán, URL trả về/origin khi portal làm sau. Không dùng hostId GoTravel như operatorId một cách ngầm định. Media thêm quyền upload TICKET_VENDOR có owner scope và email vé xe riêng; gửi email qua outbox sau commit. Search/location chỉ là đọc, không tham gia xác nhận ghế.

## 6. Cấu trúc triển khai backend

Giữ công nghệ mỗi service đang dùng: GoCar NestJS/Prisma; Catalog, Inventory, Cart, GoPay Spring Boot/JPA. Không đổi framework để giống GoTicket. Theo skill nội bộ car/.skill/clean-architecture_and_DDD-module-skill.md, module GoCar thêm các lớp domain → application/ports → infrastructure/adapters → presentation; domain không import HTTP/Prisma. Các service Java chia module/use case tương ứng, tránh gom transport vào OrderService/InventoryInternalService hiện tại bằng nhiều if/else.

- GoCar: operator/staff, vehicle/seat-template, route/stop, trip/pricing/quote, ticket/boarding, integration/catalog-inventory-cart, outbox/reconciliation. Bỏ quyền duyệt OperatorApplication cục bộ sau khi đối chiếu GoID; giữ dữ liệu lịch sử.
- Catalog: transport-offer module, transport attributes/price display, vendor ownership/moderation, review eligibility adapter. Các nhánh STAY/EXP/SVC và initializeInventory cũ không đổi hành vi.
- Inventory: transport-seat aggregate/repository/lock worker, internal API riêng; bổ sung worker quét lock GoTravel quá hạn và reconciliation trước khi dùng chung để tránh lỗ hổng tồn sẵn.
- Cart: transport-checkout, transport-order-item, cash-ledger/shift, fulfillment saga, refund/cancellation, outbox/inbox/reconciliation; legacy GoTravel checkout có adapter giữ hợp đồng. Không kéo GoCar entity trực tiếp vào JPA Cart.
- GoPay: order-type aware summary/settlement/labels, callback retry/idempotency, refund trạng thái đúng. GoTravel payment flow giữ contract cũ.
- Gateway/GoID/media: role, scope, route, ticket email. Portal/frontend chỉ có contract tài liệu trong mốc này.

Mỗi service có migration versioned theo **expand → backfill → switch → contract**. Không dùng db push hoặc DDL thay đổi cột/enum cũ trực tiếp trên production. Tiền Float cũ chỉ đổi sau kiểm đếm và quy tắc làm tròn; dữ liệu đã bán giữ snapshot lịch sử. Mọi thay đổi enum lưu DB phải kiểm kiểu lưu chuỗi/ordinal và migration tương ứng trước rollout.

## 7. Thứ tự triển khai để GoTravel không hỏng

| Mốc | Công việc và điều kiện ra |
|---|---|
| 0. Baseline | Ghi lại schema/API và số liệu order, lock, payment, listing hiện tại; backup, migration dry run; chạy smoke/regression GoTravel gồm listing → hold → checkout → GoPay callback → email/hủy/refund. Chốt contract version giữa service. |
| 1. Vá nền chung | Inventory có expiry worker GoTravel, idempotent release, cảnh báo orphan lock; Cart bỏ nuốt lỗi, bổ sung outbox/inbox và đối soát; GoPay phân biệt refund requested/paid. Thay đổi nội bộ có test GoTravel trước khi mở transport. |
| 2. Nguồn cung GoCar | GoID/ownership, xe-sơ đồ ghế, tuyến-stop, trip-price-quote, staff; migration Decimal/constraint. Chưa bán online. Kiểm overlap lịch xe, quyền vendor và thay đổi chuyến đã có khách. |
| 3. Catalog + Inventory transport | TRANSPORT offer tách luồng init, transport seat resource, hold/expiry/confirm/cancel; publish trip saga. Bật feature flag ở nội bộ. Test tranh ghế, restart worker, projection chậm; GoTravel regression vẫn xanh. |
| 4. Cart transport order | Typed item/order, quote adapter, checkout riêng, one order/hold, order history, saga, ticket issuance từ GoCar. Chạy luồng giả thanh toán nội bộ và cash pilot; không mở cổng khách trước khi đối soát được. |
| 5. GoPay và CASH thật | Payment summary typed, beneficiary/fee/settlement, callback, online refund trạng thái đúng; cash receipt/shift và nhân viên. Test end-to-end provider sandbox và thu tiền mặt có chứng từ. Chỉ mở online khi portal được nối ở đợt frontend sau hoặc có điểm truy cập thanh toán hợp lệ đã xác minh. |
| 6. Vận hành | Check-in, hủy/đổi/hủy chuyến, hỗ trợ/refund, báo cáo tài chính, reconciliation, dashboard/alert, tài liệu OpenAPI và runbook xử lý lệch. Canary một nhà xe/chuyến, sau đó mở rộng theo feature flag. |
| 7. Dọn tương thích | Chỉ bỏ đường code cũ khi số liệu/hợp đồng đã ổn; backup và kế hoạch rollback đã diễn tập. Không xoá API/bảng GoTravel vì GoCar đã chạy. |

Rollout theo feature flag loại sản phẩm và operator, với contract/API version mới. Mỗi mốc chạy GoTravel smoke + contract tests và so sánh số liệu live; nếu lỗi, tắt **GoCar checkout mới** nhưng giữ worker hoàn tất đơn đã nhận, callback và đối soát. Rollback code không được bỏ dở payment đã thu hay hold đang sống. Không canary bằng cách ghi song song hai owner cho cùng ghế.

## 8. Test, giám sát và điều kiện hoàn thành

**Test nghiệp vụ bắt buộc:** 100 request giữ cùng ghế chỉ một hold thắng; đặt nhiều ghế atomically; hold hết hạn khi chưa tạo payment; callback thành công trùng/đến muộn/đảo thứ tự; worker restart; remote reserve thành công nhưng Cart rollback; Cart timeout sau Inventory confirm; GoCar issue ticket timeout nhưng retry không phát hai vé; tiền online thu rồi không còn ghế; cash receipt đã ghi nhưng issue lỗi; hai lần bấm thu CASH chỉ một biên nhận; nhân viên không thuộc nhà xe; khách vãng lai và buyer GoTravel không bị lẫn; hủy vé đã trả tiền và bán lại chỉ sau void; hủy chuyến nhiều order; check-in lặp; quote đổi giá; Catalog offer tắt; Inventory/GoPay tạm ngừng; payout/fee theo vendor; regression GoTravel STAY/EXP/SVC đầy đủ.

**Đối soát/alert:** hold quá hạn chưa nhả, order chờ nhưng không có hold, SOLD không có order trả tiền, paid order chưa có vé, vé active không có SOLD, cash receipt lệch ca, payment provider paid nhưng Cart chưa ack, refund pending quá SLA, ticket duplicate, Catalog offer/trip publish lệch, GoTravel lock/order lệch. Dashboard tách GoTravel/GoCar để thấy hồi quy. Runbook chỉ rõ trường hợp nào tự retry, trường hợp nào cần người xử lý và chứng từ.

**Backend được coi là xong khi:** contract liên service đã chạy thực tế với một chuyến nhiều ghế; online và CASH đều có chứng từ/order/ticket/ghế khớp; hủy/hoàn không báo sai; race/expiry/retry có test; người vận hành xem được lệch và sửa có audit; GoTravel regression pass trên bản build/migration mới. Portal GoCar và giao diện khách là việc sau backend, nhưng online end-to-end chỉ được công bố hoàn chỉnh sau khi portal có luồng vào/ra và kiểm owner thực sự.

## 9. Quyết định nghiệp vụ mặc định

1. Bán vé **xe khách** trước; tàu là bài toán khác.
2. Giữ ghế 15 phút, một hold gắn tối đa một order, một order thuộc một chuyến; cấu hình thời hạn có version.
3. Ghế chiếm toàn chuyến ở V1, chưa tái bán theo từng đoạn.
4. Hủy ≥24 giờ: hoàn 100%; 6–<24 giờ: phí 10%; <6 giờ: hỗ trợ xử lý. Nhà xe hủy: hoàn 100% hoặc đổi khi khách đồng ý. Snapshot chính sách tại lúc mua; công bố rõ phí/đơn vị chịu phí.
5. Nhà xe được bán **tiền mặt tại quầy** qua nhân viên đăng nhập, phân quyền, biên nhận và chốt ca; không bán khi mất mạng. Khách vãng lai được hỗ trợ theo điều kiện ở mục 4.
6. Không trộn giỏ GoTravel và GoCar ở đợt đầu. Order/Inventory/Catalog vẫn là service chung; từng loại sản phẩm dùng adapter và dữ liệu chuyên biệt.
7. GoPay giữ đường Cart order hiện có; chỉ mở rộng summary/settlement theo loại order. Không tạo payment intent GoCar song song hoặc callback trực tiếp GoCar.

## 10. Nguồn đối chiếu trong repo

- GoCar: car/prisma/schema.prisma; car/src/operator, car/src/car, car/src/route, car/src/trip; car/.skill/clean-architecture_and_DDD-module-skill.md.
- Catalog: CatalogandListing/src/main/java/com/Listing/CatalogandListing/enums/ListingCategory.java, PriceUnit.java; service tạo listing và kiểm quyền host; request/attribute của listing.
- Inventory: BookingandInventory/src/main/java/com/Gostay/BookingandInventory/service/InventoryInternalService.java; entity InventoryCalendar, InventoryLock; repository InventoryLockRepository.
- Cart: CartandOrder/src/main/java/com/GoTravel/CartandOrder/entity/Order.java, OrderItem.java; service/OrderService.java; internal payment summary/callback controllers.
- GoPay: PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/service/PaymentService.java; OrderClient; refund; payment portal.
- Tham chiếu GoTicket đã clone tại /home/trungcao/GoTicket-reference, commit 1e0c123a433db7e0a581774994f405756e8b01ea. Dùng để đối chiếu vai trò/luồng vận tải, không nhập nguyên source.

