# Kết quả kiểm tra luồng sử dụng GoTicket

[Bổ sung lý do yêu cầu và hoàn qua API cổng thanh toán](HOAN_TIEN_QUA_CONG_20261026.md)

[Bổ sung sửa tầng ghế, camera và hoàn tiền ngày 26/10/2026](SUA_LOI_TANG_GHE_CAMERA_HOAN_TIEN_20261026.md)

Ngày thực hiện: **25/10/2026**, múi giờ `Asia/Ho_Chi_Minh`.

Trạng thái: các bản sửa bên dưới đã build, triển khai và kiểm tra lại trên domain đang phục vụ.

Domain kiểm tra: `https://gocar.nonnet123.io.vn`. Kiểm tra bằng Chromium/Playwright trên ứng dụng đang phục vụ, qua SSO, gateway và các service thật. Không thay response API bằng dữ liệu giả và không tự tạo JWT để bỏ qua đăng nhập.

Các giao dịch thử dùng tài khoản seed và dữ liệu ghi rõ **DEMO**. Thanh toán được xác nhận bằng API MOCK có sẵn dành cho tài khoản demo; chứng từ hoàn tiền/hoa hồng là chứng từ demo, **không phải chuyển tiền ngân hàng thật**.

## 1. Phạm vi đã thực hiện

- [x] Đăng nhập SSO với khách, nhà xe, nhân viên và Admin; kiểm tra trang đích theo quyền.
- [x] Đăng xuất, đồng bộ hai tab, rồi đăng nhập Admin trong cùng trình duyệt đã dùng tài khoản nhân viên.
- [x] Khách nộp hồ sơ nhà xe → Admin duyệt → phiên đang mở nhận quyền → vào trang nhà xe mà không cần đăng nhập lại.
- [x] Nhà xe tạo xe → lưu sơ đồ ghế → tạo và sửa tuyến/điểm dừng → tạo và mở bán chuyến.
- [x] Xóa tuyến theo cơ chế lưu trữ: tuyến không còn được dùng cho chuyến mới; chuyến nháp/lịch sử còn nguyên và không được xuất bản với tuyến đã xóa.
- [x] Khách chọn chuyến, ghế, thông tin hành khách, điểm đón/trả → checkout giữ chỗ → thanh toán MOCK → nhận vé.
- [x] Checkout đi sang portal GoPay thật; hủy đơn chưa thanh toán và kiểm tra trạng thái hủy.
- [x] Sửa thông tin hành khách; đổi vé ngang giá.
- [x] Đổi sang vé đắt hơn: yêu cầu bù 50.000 đồng → chuyển portal; hủy yêu cầu chưa trả tiền thì giữ vé cũ.
- [x] Đổi sang vé đắt hơn: trả MOCK 50.000 đồng → phát hành vé thay thế.
- [x] Đổi về vé rẻ hơn: phát hành vé thay thế → nghĩa vụ hoàn 50.000 đồng → Admin ghi chứng từ demo → tiến trình hoàn tất. Đơn vẫn CONFIRMED, còn đúng một vé ACTIVE, số tiền đã hoàn 50.000 đồng.
- [x] Hủy một vé trong đơn nhiều vé → chờ hoàn → Admin ghi chứng từ → trạng thái cập nhật.
- [x] Nhà xe hủy cả chuyến thử → worker xử lý các đơn còn lại → nhả ghế/hủy vé → nghĩa vụ hoàn → Admin ghi chứng từ → đơn REFUNDED.
- [x] Khách gửi phiếu hỗ trợ → Admin tiếp nhận/phản hồi → khách xem phản hồi → Admin đóng phiếu đã hoàn tiền → khách thấy kết quả.
- [x] Nhà xe mở ca → bán vé tiền mặt → ghi nhận thu → xuất vé → mở lại để in QR.
- [x] Nhân viên có quyền dùng QR thật của vé thử để check-in qua giao diện nhập mã. Mã QR không hợp lệ bị từ chối, giao diện hiển thị lỗi vé; không bị đăng xuất nhầm.
- [x] Nhân viên thu ngân không có CHECK_IN bị chặn rõ khi truy cập trực tiếp trang soát vé; giao diện không tiếp tục gọi manifest bị cấm.
- [x] Chọn ngày bán tại quầy để tìm đúng chuyến tương lai vừa tạo.
- [x] Theo dõi số thu trong ca → đóng ca đúng tiền → khoản quyết toán sang GoPay → Admin ghi nhận chứng từ hoa hồng demo.
- [x] Kiểm tra các điểm tìm kiếm/phân trang gặp trong luồng: đơn nhà xe theo số điện thoại, phiếu hỗ trợ, đơn Admin, hồ sơ hoàn và các danh sách quyết toán.
- [x] Build và triển khai các thành phần thay đổi; kiểm tra lại các lỗi đã tái hiện.

Đây là danh sách các kịch bản đã thực hiện, không phải chứng nhận rằng mọi tổ hợp dữ liệu, mọi nút trên mọi trang đều đã được thử.

## 2. Lỗi tìm được và cách sửa

### 2.1. Cập nhật phiên làm mất ghế/chuyến đang chọn

**Trước sửa:** trang bán tại quầy tự tải lại danh sách khi refresh session sau 30 giây hoặc khi quay lại tab. Chuyến có thể quay về mặc định và ghế đang chọn biến mất. Trang đặt vé công khai cũng có thể bị dựng lại lúc phiên đăng nhập tải xong.

**Sửa:** chỉ thay đối tượng phiên khi dữ liệu tài khoản/quyền thực sự đổi; lần xác định phiên ban đầu không tháo và dựng lại toàn bộ trang; trang chi tiết chuyến chờ phiên ban đầu ổn định trước khi cho thao tác. Khi thực sự đổi tài khoản/quyền thì vẫn xóa trạng thái trang cũ.

**Kiểm tra lại:** chọn chuyến không mặc định và một ghế, chờ qua 33 giây: chuyến và ghế giữ nguyên, không phát sinh lượt tải lại danh sách chuyến. Checkout rồi chuyển portal chạy được.

Tệp chính: `src/modules/auth/presentation/context/AuthContext.tsx`, `src/modules/trip/presentation/pages/TripDetailPage.tsx`.

### 2.2. Thiếu kiểm soát quyền chức năng của nhân viên

**Trước sửa:** thu ngân không có CHECK_IN vẫn mở được trang soát vé, nhận 403 khi gọi API rồi dễ thấy trạng thái giống danh sách hành khách rỗng.

**Sửa:** chặn từng trang theo capability MANAGE_TRIP, CHECK_IN, SELL_CASH, CLOSE_SHIFT; hiển thị thông báo chưa được phân quyền. Lỗi tải phân công/manifest được hiển thị rõ.

**Kiểm tra lại:** tài khoản không có quyền không gọi manifest; tài khoản được phân công CHECK_IN thực hiện check-in thành công. QR sai nhận thông báo “Vé không hợp lệ” từ backend (401 cho token vé không hợp lệ) và hiển thị tại trang soát vé, không bị điều hướng sang đăng nhập.

Tệp chính: `src/App.tsx`, `src/shared/presentation/guards/Guards.tsx`, `src/modules/staff/presentation/pages/StaffCheckInPage.tsx`.

### 2.3. In vé tiền mặt không có tài liệu vé/QR để dùng

**Sửa:** thêm tài liệu vé tiền mặt qua endpoint được bảo vệ `GET /api/v1/orders/transport/vendor/{orderId}/items/{itemId}/ticket-document`. Hiển thị hành khách, ghế, chuyến, phiên bản vé, QR và nút in tại kết quả bán vé và chi tiết đơn tiền mặt.

Không mở QR trong API danh sách đơn chung vốn đã che token. Quyền xem tài liệu vẫn do backend kiểm tra.

**Kiểm tra lại:** mở lại đơn tiền mặt, thấy QR; QR đó được dùng check-in thật. Có lưu ảnh và PDF bản in thử.

Tệp chính: `src/modules/operator/presentation/components/CashTicketDocuments.tsx`, `OperatorCounterPage.tsx`, `OperatorOrdersPage.tsx`.

### 2.4. Ca đang mở không hiển thị đúng số đã thu

**Nguyên nhân:** API đọc cột tổng kết chỉ được ghi lúc đóng ca, nên ca đang mở có giá trị rỗng.

**Sửa:** tính tổng ca đang mở từ sổ thu/hoàn/bù tiền; khi đóng ca dùng cùng phép tính. Ca đã đóng vẫn dùng số tổng kết được lưu. Không che lỗi tải ca thành trạng thái chưa mở ca. Số kiểm đếm chấp nhận từng đồng.

**Kiểm tra lại:** bán vé 290.000 đồng → API và giao diện ca cùng hiển thị 290.000 đồng → đóng ca 290.000 đồng, chênh lệch 0 → GoPay nhận quyết toán hoa hồng 14.500 đồng → ghi chứng từ demo, còn phải nộp 0.

Tệp chính: `CartandOrder/.../transport/cash/infrastructure/JdbcCashLedger.java`, `src/modules/operator/presentation/pages/OperatorShiftsPage.tsx`.

### 2.5. Tìm đơn nhà xe bằng số điện thoại không ra kết quả

**Sửa:** bổ sung điều kiện tìm trong số điện thoại, tên, email khách mua và mã UUID; giữ nguyên giới hạn nhà xe/quyền truy cập, lọc trước phân trang.

**Kiểm tra lại:** cùng số điện thoại của đơn tiền mặt vừa tạo: trước sửa 0 kết quả, sau sửa đúng 1 kết quả.

Tệp chính: `CartandOrder/.../transport/TransportOrderService.java`.

### 2.6. Hủy chuyến được tiếp nhận nhưng vé không bị hủy ở worker

**Đã tái hiện:** nhà xe hủy chuyến thử, API tiếp nhận nhưng tiến trình còn PROCESSING, có đơn chưa xử lý; vé khách vẫn ACTIVE. Log worker có `LazyInitializationException` khi đọc `Order.items` ngoài session Hibernate.

**Sửa:** thêm truy vấn tải đơn cùng items, dùng cho các lượt đọc snapshot trong phần nghiệp vụ vận tải, gồm worker hủy chuyến, đổi/hủy vé, thông báo, đối soát và tiền mặt. Giữ các truy vấn khóa `findByIdForUpdate`; không bọc chuỗi gọi nhiều service trong một transaction kéo dài và không thay toàn bộ cách đọc đơn GoTravel.

**Kiểm tra lại:** sau triển khai, chính tác vụ đang kẹt được worker xử lý tiếp: pendingOrders về 0, không còn lỗi cũ, nghĩa vụ hoàn được tạo. Sau chứng từ demo, đơn REFUNDED và trang khách cập nhật kết quả.

Tệp chính: `CartandOrder/.../repository/OrderRepository.java` và các service trong `CartandOrder/.../transport/`.

### 2.7. Trang tiến trình dừng theo dõi quá sớm khi còn chờ hoàn

**Trước sửa:** REFUND_PENDING bị xem là trạng thái kết thúc, nên trang khách đang mở không tự thấy Admin đã ghi nhận hoàn tiền; nội dung hủy vé có lúc bị mô tả thành đổi vé.

**Sửa:** tiếp tục theo dõi REFUND_PENDING/ABORT_REFUND_PENDING; chỉ dừng khi COMPLETED/ABORTED. Bổ sung cập nhật thủ công, phân biệt hủy/đổi và thể hiện bước hoàn tiền vẫn đang chờ.

**Kiểm tra lại:** giữ nguyên trang khách đang mở, Admin ghi chứng từ ở phiên khác; trang khách tự chuyển sang hoàn tất. Thử cả hoàn do hủy chuyến và hoàn chênh lệch đổi vé.

Tệp chính: `OperationProgressPage.tsx`, `CustomerOrderDetailPage.tsx`.

### 2.8. Quầy bán vé chỉ lấy 50 chuyến đầu, có thể bỏ sót ngày cần bán

**Sửa:** thêm ngày bán, mặc định ngày Việt Nam hiện tại; truy vấn theo ngày và ON_SALE. Nhân viên chỉ thấy chuyến được phân công phù hợp. Giữ lựa chọn còn hợp lệ, xóa ghế/điểm đón trả cũ nếu chuyến không còn hợp lệ; hiển thị lỗi tải thay vì giả danh sách rỗng.

**Kiểm tra lại:** chọn ngày 29/10/2026, chuyến thử vừa tạo xuất hiện tại quầy.

Tệp chính: `OperatorCounterPage.tsx`.

### 2.9. Báo cáo nhà xe lọc TRANSPORT sau khi đã cắt trang và không có phân trang

**Trước sửa:** chỉ lấy 50 khoản đầu của chủ dịch vụ rồi lọc vận tải ở frontend. Có thể mất bản ghi khi tài khoản có cả GoTravel và GoTicket; không xem được các khoản cũ hơn.

**Sửa:** `/api/v1/payouts/me` nhận bộ lọc `providerType` tùy chọn, lọc ở backend theo chính tài khoản đang đăng nhập trước phân trang. Không cho truyền chủ tài khoản khác. Request cũ không có bộ lọc vẫn giữ hành vi cũ. Frontend yêu cầu TRANSPORT, hiển thị phân trang và bỏ response cũ đến muộn.

**Kiểm tra lại:** giao diện nhà xe nhận 265 khoản vận tải chia 14 trang, chuyển được trang kế tiếp; API hai trang nhỏ trả hai bản ghi khác nhau và cùng chủ tài khoản. Endpoint `/me` không có bộ lọc vẫn trả 200.

Tệp chính: `PaymentandWallet/.../controller/HostPayoutController.java`, `OperatorReportsPage.tsx`.

## 3. Phân biệt kiểm tra giao diện và API bổ trợ

### Thao tác qua giao diện thật

- Đăng nhập, đăng xuất, chuyển vai trò và nhận quyền sau duyệt hồ sơ.
- Tạo xe/sơ đồ ghế/tuyến/chuyến; lưu trữ tuyến và thử xuất bản chuyến dùng tuyến cũ.
- Chọn ghế, checkout, đi sang portal, hủy đơn chưa thanh toán.
- Sửa hành khách, chọn chuyến/ghế thay thế, xác nhận đổi/hủy, theo dõi tiến trình.
- Bán vé tiền mặt, mở/in lại vé, check-in bằng mã, đóng ca.
- Gửi/tiếp nhận/trả lời/đóng phiếu hỗ trợ, ghi chứng từ demo hoàn tiền và hoa hồng.

### API bổ trợ có chủ đích

- Gọi API MOCK GoPay bằng phiên đăng nhập thật của tài khoản demo để xác nhận thanh toán gốc và khoản bù tiền. Sau đó chờ các service xử lý và kiểm tra đơn/vé thực tế.
- Đọc trạng thái đơn, tác vụ, ca, quyết toán để đối chiếu với giao diện và phát hiện trạng thái bị kẹt.
- Đọc API tài liệu vé được bảo vệ để lấy QR phục vụ lượt check-in thử.

## 4. Lượt mở các trang chính

Đã mở **33 đường dẫn chính** sau các bản sửa nghiệp vụ:

| Vai trò | Số trang | Phạm vi |
|---|---:|---|
| Khách | 6 | Trang chủ, tìm chuyến, vé, hồ sơ, hỗ trợ, đăng ký nhà xe |
| Nhà xe | 11 | Tổng quan, xe, điểm dừng, tuyến, chuyến, đơn, quầy, ca, nhân viên, báo cáo, hồ sơ |
| Nhân viên | 5 | Chuyến, đơn, quầy, ca, soát vé |
| Admin | 11 | Tổng quan, nhà xe, hồ sơ duyệt, đơn, nội dung, hoàn/hỗ trợ, hủy chuyến, đối soát, quyết toán, tài khoản, chính sách |

Kết quả các lượt mở cuối: không ghi nhận exception JavaScript và không có response API 5xx. Khách chưa nộp hồ sơ nhà xe nhận 404 hồ sơ là trạng thái chưa có hồ sơ, không phải lỗi hệ thống. Một số trang nhân viên hiển thị chặn quyền đúng theo capability của tài khoản được dùng.

Lượt mở trang chỉ chứng minh trang tải được và các request quan sát được chạy bình thường; không thay thế kiểm tra mọi thao tác của trang.

## 5. Triển khai và dữ liệu thử

- Đã build frontend bằng TypeScript/Vite và build JAR CartandOrder, PaymentandWallet bằng Maven; không chạy lại toàn bộ bộ test của repository.
- Đã cài bản build và restart PM2 các tiến trình tương ứng: `gocar-frontend`, `gostay-cart`, `gostay-payment`.
- Không cần migration database mới cho các sửa đổi trong đợt kiểm tra này.
- Có giữ bản build/JAR trước thay đổi tại `.release-backups/goticket-journeys-20261025/` để có thể quay lại.
- Tài khoản, cookie, QR, nhật ký từng bước, ảnh và PDF thử nằm trong thư mục riêng `.data/goticket-journey-audit/20261025/`, được Git bỏ qua. Không đưa dữ liệu phiên vào tài liệu này.
- Có tạo hồ sơ nhà xe và một số xe/tuyến/chuyến/đơn **DEMO** để kiểm tra. Một tuyến đã được lưu trữ, một chuyến thử đã hủy, một ca thử đã đóng; các lịch sử đó được giữ để kiểm tra nghiệp vụ.

## 6. Giới hạn cần biết

- Chưa thử chuyển/hoàn tiền ngân hàng thật. Chứng từ demo không chứng minh ngân hàng đã thực hiện giao dịch.
- Check-in được thử bằng nhập QR token qua giao diện; chưa dùng camera vật lý trên điện thoại.
- Chưa chờ đủ 15 phút để quan sát giữ ghế tự hết hạn trong lượt này; đã thử hủy checkout chưa thanh toán.
- Chưa thử đầy đủ mọi nhánh quản trị như khóa/mở tài khoản thật, mọi tình huống nội dung/khuyến mãi, hoặc mọi trường hợp mất mạng và đồng thời nhiều người tranh ghế.
- Chưa thực hiện kiểm tra tải lớn hoặc chứng nhận hệ thống không còn bất kỳ lỗi nào. Những lỗi được liệt kê ở trên đã có bước tái hiện và kiểm tra lại cụ thể.
