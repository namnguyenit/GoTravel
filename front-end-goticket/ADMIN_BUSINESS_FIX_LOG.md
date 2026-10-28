# Rà soát và sửa nghiệp vụ admin GoTicket — 18/10/2026

## Nguyên nhân danh sách “cần xử lý” có nhiều đơn

- API admin dùng chung trước đây bỏ qua `orderKind` mà frontend gửi; có thể lẫn đơn GoTravel.
- Frontend mở nhóm tất cả, nhưng menu ghi “Đơn hàng cần xử lý”. KPI và bộ lọc chỉ tính trên một trang dữ liệu.
- Một chuyến có nhiều đơn; mỗi lần đặt / giữ ghế có thể tạo một đơn. Đơn đã hết hạn / hủy vẫn là lịch sử hợp lệ. Không xóa dữ liệu để giảm số đếm.

## Những thay đổi đã thực hiện

### Đơn vé

- [x] API mới cố định phạm vi `GOCAR_TICKET`, phân nhóm, tìm kiếm và phân trang tại backend.
- [x] Mặc định nhóm cần xử lý: `PAID_REVIEW`, `REFUND_PENDING`; các đơn đồng bộ phát vé / thu tiền mặt / hủy vé bị chậm quá 5 phút dựa trên `updatedAt`.
- [x] Nhóm chờ thanh toán, đang đồng bộ, đã xác nhận/hoàn tất, hủy, đã hoàn tiền và tất cả được tách riêng.
- [x] KPI lấy số đếm của toàn nhóm, không dùng số dòng trang hiện tại. Tìm kiếm tra mã đơn/UUID/tên/email trong toàn bộ lịch sử GoTicket.
- [x] Bỏ nút force-cancel dùng API GoTravel: backend vốn không chấp nhận đơn GoTicket qua đường này. Hủy vé/chuyến phải đi qua quy trình ghế, vé, tiền tương ứng.

### Khách gửi hỗ trợ

- [x] Danh sách chỉ lấy phiếu khách đã gửi, thuộc đơn GoTicket; mặc định OPEN/IN_REVIEW, có tùy chọn xem lịch sử.
- [x] Có tiếp nhận, phản hồi, giải quyết, từ chối; bắt buộc phản hồi và không xử lý lại phiếu đã đóng.
- [x] Tạo phiếu được mở cho các trạng thái cần hỗ trợ sau thu tiền/đang hoàn/đã hoàn, ngoài CONFIRMED/COMPLETED.
- [x] Khóa đơn khi tạo / giải quyết phiếu để tránh tạo hai phiếu đang mở hoặc ghi đè kết quả đồng thời.
- [x] Đóng phiếu không chuyển tiền, không hủy vé. Chỉ có thể đóng dưới kết quả REFUNDED khi đơn thực sự REFUNDED.
- [x] Trang hỗ trợ của khách cũng lọc GoTicket, không lẫn phiếu GoTravel.

### Hoàn tiền và nghiệp vụ từng vé

- [x] Tách khỏi phiếu khách: hoàn tiền có thể phát sinh từ khách hủy, nhà xe hủy chuyến, đổi vé hoặc thu tiền mà phát vé thất bại.
- [x] Hoàn toàn đơn chỉ hiển thị đơn cần rà soát đã thu tiền hoặc REFUND_PENDING với nghĩa vụ hoàn dương.
- [x] Dùng `transportRefundDue` thực tế; không mặc định hoàn bằng `totalAmount`.
- [x] PAID_REVIEW chỉ được đối chiếu/mở hoàn khi backend xác nhận tiền, ghế và vé đủ điều kiện.
- [x] Hoàn từng vé chỉ ở trạng thái REFUND_PENDING / ABORT_REFUND_PENDING. Bỏ đổi vé dùng số tiền `topup` phải trả lại, không lấy `refundDue` của phương án đổi đã bỏ.
- [x] Admin gửi phương thức BANK_TRANSFER và không gắn ca tiền mặt cũ. Hoàn tiền mặt tại quầy vẫn đi qua nhân viên có ca đang mở và quyền tương ứng.
- [x] Đúng số tiền VND nguyên, mã giao dịch, chứng từ HTTPS; không thay đổi trạng thái “đã hoàn” chỉ bằng bấm nút không có bằng chứng.
- [x] Chặn xác nhận hoàn toàn đơn khi còn nghiệp vụ từng vé chưa kết thúc; kiểm tra lại nghĩa vụ hoàn trong giao dịch khóa đơn.
- [x] Tiền trong DTO kế hoạch nghiệp vụ từng vé được gửi dạng chuỗi để giữ độ chính xác khi đi qua JavaScript.
- [x] Nút bỏ nghiệp vụ chỉ ở các bước chưa chốt; các bước đã chốt phải xử lý tiếp hoặc đối soát.

### Các phân hệ admin còn lại

- [x] Catalog lọc category=TRANSPORT trước phân trang; không lấy 100 nội dung chung rồi lọc trên trình duyệt. Không duyệt lại nội dung đã DELETED.
- [x] Payout lọc providerType=TRANSPORT trước phân trang. Chỉ mở ghi chứng từ chi ở REQUESTED.
- [x] Thêm bước chuẩn bị/đối chiếu payout: backend tính lại khoản phải chi sau các nghiệp vụ vé, trước khi admin nhập chứng từ. Backend vẫn xác minh số tiền khi lưu.
- [x] Chứng từ chi trả / nộp hoa hồng cần mã tham chiếu và liên kết HTTPS. Đây là ghi nhận tiền đã chuyển, không thực hiện chuyển khoản ngân hàng.
- [x] Hủy chuyến cần tra thông tin thật trước: tuyến, nhà xe, xe, giờ đi/đến, trạng thái và yêu cầu hủy đã có. Xác nhận hủy toàn chuyến trước khi gửi.
- [x] Bỏ nút admin đánh dấu xuất bến thủ công; lịch chạy theo thời gian. Can thiệp hoàn thành chỉ hiện khi đã tới giờ đến và backend còn cho phép.
- [x] Đối soát dùng `issueCode` thực tế; ngoại lệ đổi vé đọc đúng `old_order_id` / `new_order_id`; email đọc đúng id, trạng thái và lỗi.
- [x] Chỉ gửi lại email FAILED; backend trả lỗi xung đột nếu trạng thái đã đổi, thay vì báo thành công giả.
- [x] Hàng đợi đối soát / thông báo / nghiệp vụ có giới hạn lượt tải, UI không khẳng định mọi thứ đã đồng bộ chỉ vì một danh sách rỗng.
- [x] Tổng quan dùng số đếm thực; không cộng đơn chưa thanh toán/hủy thành doanh thu. Không biến lỗi API thành con số 0 như dữ liệu thật.
- [x] Giữ thông tin pagination cạnh data của API danh sách nhà xe; trước đây HTTP adapter đã làm mất trường này.
- [x] Duyệt KYC phân trang, lấy tổng từng trạng thái từ server thay vì giới hạn 100 hồ sơ mỗi nhóm rồi coi là tổng.
- [x] Kích hoạt nhà xe INACTIVE xử lý đúng như nhãn nút. Kích hoạt không tự mở lại những chuyến đã ngừng bán.
- [x] Tài khoản dùng chung hệ sinh thái được ghi rõ phạm vi. Không thao tác tài khoản đã xóa / tự khóa hoặc tự thu hồi quyền qua UI này. Nhà xe cấp qua KYC; nhân viên do nhà xe mời và phân công.
- [x] Hoa hồng dùng chung GoTravel / GoTicket được thông báo rõ trước khi lưu, không giả định chỉ ảnh hưởng vé xe.
- [x] Tách trạng thái giữa các màn admin, bỏ kết quả tải đã cũ, chặn gửi thao tác lặp; không làm mất chứng từ / ghi chú khi gửi thất bại.

## API mới / bổ sung chính

- GET `/api/v1/orders/transport/admin/orders?view=ATTENTION&page=0&size=20&search=...`
- GET `/api/v1/orders/transport/admin/summary`
- GET `/api/v1/orders/transport/admin/disputes?active=true&page=0&size=20`
- PUT `/api/v1/orders/transport/admin/disputes/{id}/resolve`
- GET `/api/v1/trips/{tripId}/admin-summary` (ADMIN)
- POST `/api/v1/payouts/transport/{payoutId}/prepare` (ADMIN, đối chiếu khoản đã REQUESTED; không chuyển tiền)
- Bộ lọc tùy chọn `category` ở Catalog admin, `providerType` ở payouts/all, `orderKind` ở orders/admin và orders/disputes.
- Các API cũ giữ mặc định khi không truyền bộ lọc mới, để các client GoTravel hiện có tiếp tục sử dụng.

## Build / triển khai

- [x] Build production frontend (TypeScript + Vite).
- [x] Build GoCar NestJS.
- [x] Đóng gói CartandOrder, CatalogandListing, PaymentandWallet với `-Dmaven.test.skip=true` (không biên dịch/chạy test).
- [x] Cài jar mới và restart ba service Java cùng GoCar qua PM2.
- [x] Thay bản frontend production và restart sau build cuối.
- [x] Xác nhận log hoàn tất khởi động và port của các process đã restart (GoCar 3333, frontend 3334, Catalog 8082, Cart 8084, Payment 8085).

Không chạy unit/integration/E2E test, trình duyệt tự động, giao dịch thử, gọi API nghiệp vụ hay thay tài khoản để kiểm thử. Build và trạng thái process không thay thế xác nhận nghiệp vụ đầu-cuối. Không thêm migration DB trong đợt sửa admin này; không xóa các đơn/vé lịch sử.

Artifact trước thay được lưu riêng tại `/tmp/goticket-admin-release-544ltd15` để có thể khôi phục khi cần; đây là thư mục tạm trên server, không phải bản sao lưu lâu dài.


## Bổ sung: cảnh báo Inventory xuất hiện liên tục

Phát hiện từ dữ liệu vận hành ngày 18/10/2026:

- Có 10 cảnh báo đang mở thuộc 9 đơn: 8 đơn CANCELLED thiếu hold; một đơn mẫu REFUNDED có cả INVENTORY_UNAVAILABLE và GOPAY_UNAVAILABLE.
- Inventory vẫn trả lời được các đơn có hold. Với hold không tồn tại, endpoint trả BAD_REQUEST (400), trong khi đối soát chỉ nhận diện NOT_FOUND (404). Vì vậy thiếu hold của đơn đã hủy bị phân loại thành không truy vấn được service.
- Cảnh báo cũ trước đây chỉ được đóng khi toàn bộ nguồn dữ liệu của lượt đối soát đều thành công. Một nguồn chưa xác minh được làm cảnh báo đã hết ở nguồn khác bị giữ lại.

Đã sửa:

- [x] Endpoint tra hold trả 404 nếu không có bản ghi; exception handler Inventory giữ đúng mã HTTP của ResponseStatusException.
- [x] Cart cũng giữ mã HTTP/lý do của ResponseStatusException, thay vì biến lỗi điều kiện nghiệp vụ thành thông báo 500 chung.
- [x] Phân biệt missing/conflict của ghế từng vé với lỗi không truy vấn được Inventory.
- [x] Đóng cảnh báo độc lập theo nguồn đã đối chiếu được. Chỉ giữ lại kết luận chưa thể kiểm chứng khi chính nguồn tương ứng bị lỗi.
- [x] Phản hồi rỗng/không thành công không được coi là nguồn đã hồi phục.
- [x] Bổ sung mã đơn, trạng thái đơn trong dữ liệu cảnh báo; UI gọi đúng là số cảnh báo và hiển thị “Cần đối chiếu” thay cho trạng thái OPEN màu xanh dễ nhầm.
- [x] Bổ sung lịch sử hold CANCELLED cho đúng fixture GCT-DEMO-0004. Đã đối chiếu đơn/vé/payment đều REFUNDED trước khi bổ sung; không chạy lại toàn bộ seed. Nguồn seed 04/05 cũng được sửa đồng bộ.
- [x] Build lại frontend, CartandOrder, BookingandInventory; Java dùng -Dmaven.test.skip=true.

Việc xác nhận cảnh báo hồi phục dựa trên lượt đối soát nền đang chạy bình thường và truy vấn chỉ đọc bảng cảnh báo; không tạo booking/thanh toán hay gọi API nghiệp vụ để thử.

Kết quả triển khai bổ sung lúc 16:14 ngày 18/10/2026 (Asia/Ho_Chi_Minh):

- Inventory, Cart và frontend đã restart với bản mới, log xác nhận khởi động thành công.
- Lượt đối soát nền sau khởi động đã tự chuyển các cảnh báo cũ sang RESOLVED.
- Truy vấn chỉ đọc bảng transport_reconciliation_findings cho thấy không còn cảnh báo OPEN; 9 INVENTORY_UNAVAILABLE và các GOPAY_UNAVAILABLE trước đó đều ở RESOLVED.
- Không xóa / force-resolve bản ghi cảnh báo bằng SQL, không chạy bộ test hoặc gọi API đặt vé/thanh toán thử.

## 19/10/2026 — Quyết toán và hoa hồng

- Trang quyết toán dùng màn riêng `AdminPayoutsPage`: tách chi trả online và thu hoa hồng tiền mặt; lọc nhà xe/trạng thái, phân trang trên server, hiển thị tên nhà xe và thông tin tài chính theo từng dòng.
- Mặc định online hiển thị REQUESTED (đã yêu cầu rút). PENDING ghi rõ chưa yêu cầu rút; không cấp cho Admin thao tác vượt luồng này. Đối chiếu net qua prepare trước khi mở ghi chứng từ.
- Tiền mặt có danh sách ca đóng, hoa hồng sau hoàn, số đã nộp/còn thiếu và nút chọn đúng ca. Bỏ yêu cầu nhập UUID/số tiền thủ công trên trang đang dùng. Giữ cơ chế chứng từ một lần/ca của backend.
- Hoa hồng GoTicket dùng `GET/PUT /api/v1/payouts/transport/commission`, lưu `commission_configs.id=TRANSPORT`. Getter transport và payout mới đọc cấu hình này; trước khi có bản ghi thì dùng cấu hình mặc định transport hiện hành. `DEFAULT` của GoTravel giữ nguyên.
- Ô nhập dùng đơn vị phần trăm (5 nghĩa là 5%), lý do bắt buộc, áp dụng cho khoản thanh toán/ca mới. Các tỷ lệ đã chốt không bị ghi lại.
- Thêm `GET /api/v1/payouts/transport/cash-settlements` phân trang/lọc operator. Các phép tính theo ca dùng cùng công thức với bước ghi chứng từ; tổng cash chỉ gom các ca đã gửi đối soát.
- `/api/v1/payouts/all` bổ sung lọc status/hostId; request cũ không thêm bộ lọc vẫn giữ đường đọc cũ. Không phát sinh lệnh chuyển tiền hoặc ghi chứng từ tự động trong lần sửa này.
- Xác minh bằng build frontend và package GoPay với `-Dmaven.test.skip=true`; không chạy test suite/browser/API giao dịch.
