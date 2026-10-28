# Kế hoạch seed demo GoTicket đầy đủ — 4 vai trò

**Ngày lập và kiểm tra server: 18/10/2026.**

**Đồng hồ đã đối chiếu:** `2026-10-18 14:22:00 UTC` = `18/10/2026 21:22:00 Asia/Ho_Chi_Minh`.

**Trạng thái cập nhật 19/10/2026:** runner FULL đã triển khai và đã ghi dữ liệu trên server, phiên `20261019-b2c857`. Đọc [README cách chạy](README.md) trước khi dùng. Các checkbox chưa tích phản ánh phần chưa thực hiện, không phải đã hoàn thành ngầm.

### Kết quả triển khai hiện tại

- Đã tạo 244 tài khoản mới: 200 User, 12 Vendor, 32 Staff. Dùng 1 Admin hiện có trong Auth, không đổi mật khẩu/quyền/profile.
- Dữ liệu nền: 60 xe, 48 tuyến, 600 chuyến (100 đúng ngày **19/10/2026**), 2.000 đơn, 3.200 dòng vé, 2.704 vé, 40 ca, 80 phiếu hỗ trợ và 120 operation. Các API scenario có thêm record/trạng thái được báo riêng.
- **37/50 kịch bản đã thực hiện qua API**, 1 tình huống hết hạn biểu diễn bằng snapshot, 12 thao tác Admin đang chờ access token hợp lệ của Admin hiện có. Dữ liệu để Admin thao tác trên UI đã có; không tạo JWT hay lấy mật khẩu Admin.
- Runner dùng JavaScript ES modules (không cần build TypeScript), có package-lock riêng, SQLite manifest, resume, refresh-live và báo cáo theo role.
- MOCK chỉ được mở cho UUID khách seed và đơn transport thuộc chính họ; không đổi cờ MOCK chung. Portal hiện tại chưa được đổi UI để thêm nút MOCK; scenario gọi backend API.
- Email demo được SKIPPED; đã build/restart Cart và GoPay với phần hỗ trợ seed. Không chạy unit/integration/E2E/browser test.
- Các cảnh báo `ITEM_OPERATION_PENDING` có thể xuất hiện vì cố ý để lại operation chờ hoàn. Xử lý hoàn trên Admin để kết thúc; báo cáo ghi rõ số lượng, không che cảnh báo.
- Exception pack và gửi email thật có giới hạn chưa triển khai. CLI từ chối `--include-exceptions` thay vì báo thành công giả.
- Hướng dẫn/tài khoản/QR theo phiên nằm trong `.data/goticket-demo/runs/20261019-b2c857/`, được Git bỏ qua. `summary.json` là số thực tế theo thời điểm xuất báo cáo.

**Mục tiêu:** chạy một lệnh để có bộ dữ liệu demo lớn, hợp lệ và dùng được trên giao diện **User, Vendor, Staff, Admin**; có chuyến theo ngày chạy seed, lịch sử đặt vé, tiền mặt, đổi/hủy, hoàn tiền, khiếu nại, quyết toán và báo cáo.

## 0. Chốt yêu cầu và phạm vi

- [x] Đối chiếu ngày hiện tại trên server là **18/10/2026**, theo múi giờ Việt Nam.
- [x] Xác định bốn vai trò và các màn đang tồn tại trong `front-end-goticket/src/App.tsx`.
- [x] Đối chiếu giới hạn giữ ghế, cửa sổ check-in, quyền Staff và ràng buộc không trùng lịch xe.
- [x] Triển khai runner và dữ liệu mới theo tài liệu này.
- [ ] Hoàn tất dữ liệu và kịch bản cho cả bốn vai trò.
- [x] Chạy seed khi có yêu cầu triển khai; báo số lượng thực tế và phần chưa hoàn tất.

Tài liệu này phục vụ viết seed. Không gộp việc dựng seed với thay đổi giao diện hoặc đổi chính sách kinh doanh. Nếu cần sửa nhỏ để hỗ trợ email demo, phải ghi rõ file, mục đích và phạm vi trước khi thực hiện.

## 1. Quy tắc ngày giờ — yêu cầu bắt buộc

### 1.1. Lấy ngày thực tế mỗi lần chạy

Runner phải lấy thời điểm hiện tại từ đồng hồ server, chuyển sang `Asia/Ho_Chi_Minh`, rồi sinh dữ liệu từ mốc đó.

Các giá trị cần lưu trong manifest:

```text
runId
startedAtUtc
startedAtVietnam
calendarDateVietnam
calendarGeneratedAt
readyAt
timezone = Asia/Ho_Chi_Minh
seedVersion
randomSeed
```

Không hardcode ngày 18 hoặc bất kỳ ngày tháng nào trong code seed. Ngày 18/10/2026 là mốc kiểm tra của bản kế hoạch này. Chạy ngày 19 thì bộ chuyến mới phải tính theo ngày 19; chạy tháng sau phải tính theo tháng sau.

Trước khi ghi dữ liệu:

1. In ngày giờ server theo UTC và Việt Nam.
2. Xác nhận database đích và cách lưu timestamp của từng adapter.
3. So sánh thời điểm PostgreSQL với server; dừng kèm chẩn đoán nếu có sai lệch đáng kể, thay vì tạo một bộ lịch sai ngày.
4. Dùng một kế hoạch thời gian thống nhất giữa sáu database.

### 1.2. Cửa sổ lịch và ví dụ đúng ngày 18

| Nhóm lịch | Số chuyến mục tiêu | Nếu chạy ngày 18/10/2026 |
|---|---:|---|
| Quá khứ D-7 đến D-1 | 100 | 11/10 đến 17/10 |
| Hôm nay D | 100 | **18/10/2026** |
| Sắp tới D+1 đến D+14 | 400 | 19/10 đến 01/11 |
| **Tổng** | **600** | Tất cả tính lại theo ngày thực tế của mỗi lượt chạy |

Nếu chạy ngày 19/10: hôm nay chuyển thành 19/10; lịch quá khứ và lịch sắp tới dịch tương ứng. `D+14` là khoảng tương lai 14 ngày, không phải mặc định lấy ngày 14 làm ngày hiện tại.

### 1.3. Chuyến hôm nay phải còn thao tác được

Có hai nhóm cùng tồn tại trong ngày:

- Chuyến đã tới/qua giờ: dữ liệu lịch sử hoặc đang hành trình, trạng thái bán phù hợp.
- Chuyến phía trước: còn đủ thời gian tạo quote, giữ ghế, thanh toán và check-in.

Yêu cầu của bộ lập lịch:

- Tính lại `now` trước khi công bố các chuyến dùng để đặt ngay.
- Chuyến dùng để đặt mới nên cách thời điểm READY ít nhất 30 phút; source hiện chặn quote/hold mới trong 15 phút cuối trước giờ đi.
- Khi còn nhiều thời gian trong ngày, ưu tiên ít nhất 2 chuyến đặt được cho mỗi nhà xe hoạt động.
- Khi chạy muộn như **21:22 ngày 18/10**, ưu tiên các chuyến còn hợp lệ trong tối 18/10; đồng thời chuẩn bị các chuyến đầu ngày 19/10.
- Sát nửa đêm, nếu không thể thỏa điều kiện thời gian trong ngày, báo rõ số chuyến hôm nay còn đặt được và chỉ ra chuyến sớm nhất của ngày mai.
- Nếu lượt seed đi qua nửa đêm: kiểm tra lại trước READY; bổ sung/replan phần chuyến mới chưa có booking khi cần. Các chuyến/đơn đã có lịch sử không được dời giờ để ép khớp ngày mới.
- Các hold chờ thanh toán được tạo ở cuối lượt. `expiresAt` tính từ lúc thực sự tạo hold, để còn thời gian thao tác sau khi seed xong.

### 1.4. Lịch xe và thời gian nghiệp vụ

- Một xe không có hai chuyến chồng thời gian; tính cả chuyến qua nửa đêm.
- Kiểm tra toàn bộ lịch của xe, bao gồm các trạng thái DRAFT/PUBLISHING/STOP_SALE còn chịu exclusion constraint.
- Bố trí buffer vận hành và tuyến đi/về hợp lý; không chỉ kiểm tra ngày bằng nhau.
- Dùng lịch theo ngày Việt Nam khi phân nhóm hôm nay/quá khứ/tương lai.
- Lưu timestamp theo đúng kiểu dữ liệu và hợp đồng đang dùng của Prisma/JDBC, tránh lệch 7 giờ giữa các service.

## 2. Quy mô chính thức của một phiên demo FULL

### 2.1. Tài khoản theo mục đích sử dụng

| Nhóm | Số tài khoản | Phân bố |
|---|---:|---|
| User / khách hàng | **200** | Khách sạch, có đơn online, tiền mặt, đổi/hủy, lịch sử và hỗ trợ |
| Vendor / người đăng ký nhà xe | **12** | 8 được duyệt và hoạt động, 1 được duyệt nhưng nhà xe đình chỉ, 2 chờ duyệt, 1 bị từ chối |
| Staff | **32** | 4 nhân viên cho mỗi nhà xe hoạt động; một assignment mẫu đã ngừng hiệu lực |
| Admin | **1 có sẵn** | Dùng tài khoản ADMIN hiện có trong Auth cho toàn bộ nghiệp vụ, không tạo thêm |
| **Tổng tài khoản tham gia demo** | **245** | 244 tài khoản seed mới và 1 Admin có sẵn; không phải tổng dòng users_roles |

**Phân biệt role kỹ thuật:**

- Các hồ sơ Vendor PENDING/REJECTED vẫn dùng quyền USER phù hợp, chưa được cấp `TICKET_VENDOR`.
- Có **9 tài khoản nhà xe đã APPROVED**; trạng thái đình chỉ của V09 nằm ở nghiệp vụ nhà xe.
- Staff có role STAFF và phải có assignment/capability hợp lệ để làm việc.
- Một tài khoản có thể mang thêm USER bên cạnh quyền khác. Không dùng tổng số dòng `users_roles` để suy ra số người dùng. Bộ seed tạo 244 tài khoản mới; 1 Admin được dùng lại từ Auth.
- Dùng duy nhất Admin có sẵn trong Auth. Không tạo Admin mới, không đổi mật khẩu, quyền, trạng thái hoặc profile của tài khoản này; không đánh dấu tài khoản này là dữ liệu thuộc seed và không xóa khi dọn dữ liệu demo.

### 2.2. Khối lượng dữ liệu vận hành

| Dữ liệu | Số lượng mục tiêu |
|---|---:|
| Nhà xe vận hành | 9: 8 ACTIVE, 1 SUSPENDED |
| Xe | **60** |
| Xe giường nằm | 20 xe × 36 ghế |
| Xe limousine | 20 xe × 22 ghế |
| Xe ghế ngồi | 20 xe × 40 ghế |
| Mẫu ghế | **1.960** |
| Tuyến | **48**: 40 ACTIVE, 4 INACTIVE, 4 đã archive |
| Điểm đón/trả của nhà xe | **120** |
| Trạm trên các tuyến | Khoảng **160–200** theo lộ trình |
| Nội dung Catalog | **48** |
| Chuyến | **600** |
| Công suất ghế lý thuyết của 600 chuyến | **20.320** theo phân bổ loại xe bên dưới |
| Ghế đã khởi tạo tại Inventory | Khoảng 19.000–20.320; chỉ khởi tạo cho các chuyến tới đúng bước công bố |
| Đơn | **2.000** |
| Dòng vé/hành khách | **3.200** |
| Vé đã phát hành | Khoảng 2.700, tùy lịch sử đổi/hủy và các kịch bản API |
| Ca tiền mặt | **40**: 12 mở, 28 đóng |
| Phiếu hỗ trợ | **80** |
| Operation đổi/hủy từng vé | Ít nhất **120** |
| Payout | Đủ theo các đơn online tương ứng; tối thiểu 20 REQUESTED và 40 PAID trong lịch sử mẫu |

Công suất lý thuyết: 200 chuyến giường nằm × 36 + 160 chuyến limousine × 22 + 240 chuyến ghế ngồi × 40 = 20.320.

Chuyến DRAFT chưa tới bước tạo Inventory có thể chưa có bảng tồn ghế. Không tạo ghế chỉ để đạt một con số rồi làm sai luồng công bố.

### 2.3. Cơ cấu 2.000 đơn

| Trạng thái mục tiêu | ONLINE | CASH | Tổng |
|---|---:|---:|---:|
| CONFIRMED | 630 | 270 | 900 |
| COMPLETED | 420 | 180 | 600 |
| CANCELLED | 177 | 73 | 250 |
| REFUNDED | 105 | 45 | 150 |
| REFUND_PENDING | 28 | 12 | 40 |
| PAYMENT_PENDING | 40 | 0 | 40 |
| CASH_PENDING | 0 | 20 | 20 |
| **Tổng** | **1.400** | **600** | **2.000** |

Cơ cấu số ghế/đơn:

| Loại đơn | Số đơn | Tổng dòng vé |
|---|---:|---:|
| 1 hành khách | 1.200 | 1.200 |
| 2 hành khách | 600 | 1.200 |
| 4 hành khách | 200 | 800 |
| **Tổng** | **2.000** | **3.200** |

Đây là mục tiêu ở thời điểm báo cáo READY. Các nhóm chờ tiền/giữ chỗ và tiến trình nền sẽ thay đổi tự nhiên theo thời gian; báo cáo phải ghi mốc chụp số liệu và số lượng thực tế.

## 3. Quy ước dữ liệu, tài khoản và phiên chạy

### 3.1. Định danh

- Mỗi phiên mới có `runId` và slug ngắn, ví dụ `1018a`.
- Tên hiển thị, mã đơn, reference chứng từ có dấu DEMO.
- Tài khoản ví dụ: `gtd_1018a_user_001`, `gtd_1018a_vendor_01`, `gtd_1018a_staff_v01_01`.
- ID dữ liệu bulk sinh xác định theo namespace + runId + loại + số thứ tự.
- ID do API cấp được ghi lại từ response; không tự ép ID mà endpoint không hỗ trợ.
- Tên đăng nhập, biển số và reference phải tránh unique conflict với mọi dữ liệu có sẵn.
- Mật khẩu demo lấy từ cấu hình dành cho demo, băm đúng định dạng Identity. Tránh băm lặp hàng trăm lần cho cùng nhóm mật khẩu demo nếu không cần.
- Dữ liệu liên hệ là dữ liệu mẫu; email mặc định dùng domain dành cho ví dụ, có cơ chế skip rõ ràng.

### 3.2. Manifest và báo cáo

Dự kiến lưu ngoài source versioned:

```text
.data/goticket-demo/
  manifest.sqlite
  runs/<runId>/
    plan.json
    progress.json
    summary.json
    DEMO_GUIDE.md
    accounts.csv
    scenario-links.json
    evidence/
  current.json
```

`manifest.sqlite` là kho theo dõi seed riêng, không dùng chung file SQLite cấu hình Gateway. Nó lưu lượt chạy, phase, record ownership, scenario và các ID API đã trả về.

Các artifact có thông tin đăng nhập demo phải được giữ quyền truy cập phù hợp và loại khỏi Git.

### 3.3. Chạy lại

- `full`: tạo phiên demo mới, độc lập về account demo mới/fleet/trip/đơn/tiền; vẫn dùng chung Admin hiện có trong Auth.
- `resume <runId>`: tiếp tục đúng phase còn thiếu của một lượt gián đoạn, chống tạo trùng.
- `refresh-live <runId>`: bổ sung các tình huống còn hạn ngắn bằng request mới, giữ lịch sử cũ.
- Phiên mới dùng fleet ID/biển số riêng nên không va lịch của xe phiên trước.
- Không reset toàn bộ database và không ghi đè sổ tiền/chứng từ đã tồn tại.
- Các thao tác dọn/đóng phiên cũ phải theo record ownership và điều kiện nghiệp vụ; không mặc định xóa các bảng tiền bất biến.

## 4. Role USER — 200 tài khoản và các luồng cụ thể

### 4.1. Chia nhóm User

| Nhóm | Số lượng | Chuẩn bị dữ liệu |
|---|---:|---|
| U001–U020 | 20 | Tài khoản sạch để người demo tự tìm chuyến/đặt từ đầu |
| U021–U080 | 60 | Lịch sử đặt online, đơn chờ tiền, đơn đã xác nhận |
| U081–U110 | 30 | Đơn mua tại quầy, biên nhận và vé CASH |
| U111–U140 | 30 | Đổi vé, hủy từng vé, khoản bù/hoàn và revision |
| U141–U160 | 20 | Hành trình hoàn thành, đã check-in, no-show |
| U161–U180 | 20 | Có phiếu hỗ trợ và phản hồi admin |
| U181–U200 | 20 | Phạm vi dữ liệu; 14 tài khoản hoạt động, 4 khóa, 2 đánh dấu xóa |
| **Tổng** | **200** | 194 tài khoản hoạt động, 6 trường hợp trạng thái tài khoản đặc biệt |

Các nhóm có lịch sử có thể chứa nhiều loại đơn; phân nhóm là mục đích trình diễn chính. 20 tài khoản sạch phải giữ đúng trạng thái chưa có booking sau khi runner hoàn tất.

### 4.2. Ma trận chức năng User

| Chức năng / màn | Dữ liệu cần sẵn | Điểm vào | Tiêu chí dùng được |
|---|---|---|---|
| SSO, đăng xuất, đổi tài khoản | User hoạt động và các role khác | `/login`, navbar | Đăng nhập đúng tài khoản, logout không tự bật lại phiên |
| Hồ sơ cá nhân | Hồ sơ cho 194 user hoạt động | `/account/profile` | Xem/sửa thông tin được phép |
| Chọn tỉnh, tìm chuyến | Ít nhất 12 cặp điểm đi/đến, nhiều ngày/giờ/giá | `/search` | Hôm nay có dữ liệu nếu còn giờ; ngày mai luôn có chuyến hợp lệ |
| Lọc và sắp xếp | Nhiều loại xe, giá, giờ, nhà xe | `/search` | Các lựa chọn tạo kết quả khác nhau hợp lý |
| Sơ đồ ghế | Ghế AVAILABLE/HELD/SOLD/BLOCKED | `/trips/:tripId` | Hiển thị đúng và còn ghế thật để đặt |
| Đặt 1 người | Ghế trống của chuyến hợp lệ | Chi tiết chuyến → checkout | Tạo đúng hold, order và item |
| Đặt nhóm | Cụm 2/4 ghế trống cùng chuyến | Chi tiết chuyến → checkout | Giữ được cả tập ghế, đủ người đi và giá |
| Thanh toán mô phỏng | Mock-enabled và order còn hạn | `/checkout/:orderId` → portal | Payment, ghế, vé, đơn và ledger khớp nhau |
| Bỏ thanh toán / hết hạn | 40 order online còn hạn lúc READY | Checkout / vé của tôi | Hết TTL thì tiến trình nền xử lý đúng |
| Xem vé / QR | Vé ACTIVE và CHECKED_IN hợp lệ | `/account/tickets`, order detail | Mỗi vé có QR/revision đúng khóa ký hiện tại |
| Sửa thông tin vé | Vé chưa hết điều kiện, revision đúng | `.../items/:itemId/amend` | Command, revision và dữ liệu GoCar/Cart đồng bộ |
| Đổi ngang giá | Cặp chuyến cùng nhà xe, ghế trống | `.../items/:itemId/exchange` | Chốt chỗ mới và cập nhật vé đúng |
| Đổi đắt hơn | Vé và chuyến thay thế có chênh lệch dương | Trang đổi vé | Khoản bù đi đúng phương thức/operation |
| Đổi rẻ hơn | Có credit hoàn sau phí | Trang đổi vé | Tạo đúng nghĩa vụ hoàn; chưa ghi “đã hoàn” trước chứng từ |
| Hủy một vé | Đơn nhiều vé đủ điều kiện | Order detail | Chỉ vé được chọn đổi trạng thái; vé còn lại sử dụng được |
| Hủy đơn chưa trả tiền | Hold còn hạn | Checkout/order detail | Nhả đúng ghế, không phát vé hoặc phát sinh hoàn giả |
| Theo dõi khoản hoàn | REFUND_PENDING và REFUNDED | Order detail / operation progress | Phân biệt khoản phải hoàn và khoản đã xác nhận hoàn |
| Gửi / xem hỗ trợ | 80 phiếu phân bố ở nhóm U161–U180 | `/account/disputes` | Gửi đúng order của mình, đọc được phản hồi |
| Gửi lại email vé | Vé hợp lệ và email demo được xử lý theo mode | Order detail | Có event, SKIPPED/DELIVERED/FAILED được ghi trung thực |
| Phạm vi tài khoản | Đơn của nhiều user khác nhau | Vé/order detail | Mỗi user chỉ truy cập dữ liệu được cấp quyền |

### 4.3. Các tình huống User cần tìm được ngay

Báo cáo phải chỉ ít nhất các account/order/trip sau bằng link hoặc ID:

- Một user sạch, một chuyến hôm nay còn ghế.
- Một user có đơn online còn ít nhất 10 phút giữ chỗ lúc xuất báo cáo.
- Một user có đơn nhiều vé đủ điều kiện sửa/đổi/hủy.
- Một vé có chuyến nằm trong cửa sổ check-in hiện tại.
- Một user có hoàn tiền chờ admin.
- Một user có phiếu OPEN, một phiếu IN_REVIEW và một phiếu đã phản hồi.
- Một tài khoản khóa và một tài khoản đánh dấu xóa, ghi rõ đây là trường hợp từ chối truy cập dự kiến.

## 5. Role VENDOR — 12 tài khoản, 9 nhà xe vận hành

### 5.1. Phân bổ chính xác nhà xe, xe, tuyến, chuyến và Staff

| Vendor | Trạng thái | Xe | Tuyến | Quá khứ | Hôm nay | Sắp tới | Tổng chuyến | Staff |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| V01 | APPROVED / ACTIVE | 7 | 6 | 12 | 13 | 50 | 75 | 4 |
| V02 | APPROVED / ACTIVE | 7 | 6 | 12 | 13 | 50 | 75 | 4 |
| V03 | APPROVED / ACTIVE | 7 | 6 | 12 | 13 | 50 | 75 | 4 |
| V04 | APPROVED / ACTIVE | 7 | 6 | 12 | 13 | 50 | 75 | 4 |
| V05 | APPROVED / ACTIVE | 7 | 5 | 13 | 12 | 50 | 75 | 4 |
| V06 | APPROVED / ACTIVE | 7 | 5 | 13 | 12 | 50 | 75 | 4 |
| V07 | APPROVED / ACTIVE | 7 | 5 | 13 | 12 | 50 | 75 | 4 |
| V08 | APPROVED / ACTIVE | 7 | 5 | 13 | 12 | 50 | 75 | 4 |
| V09 | APPROVED / SUSPENDED | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| V10 | PENDING | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| V11 | PENDING | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| V12 | REJECTED | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Tổng** | | **60** | **48** | **100** | **100** | **400** | **600** | **32** |

Định hướng tuyến theo vùng và cặp đi/về có thật về mặt địa lý; tên doanh nghiệp gắn Demo để phân biệt dữ liệu mẫu. Hành trình dài/ngắn phải khớp thời lượng lập lịch.

Bốn tuyến archive là tuyến phụ của V01–V04, có chuyến quá khứ để xem lịch sử. Bốn tuyến INACTIVE thuộc V09. Mỗi V01–V08 còn 5 tuyến ACTIVE.

### 5.2. Nội dung Catalog

| Trạng thái listing | Số lượng | Mục đích |
|---|---:|---|
| ACTIVE | 32 | Tìm và đặt chuyến công khai |
| PENDING | 4 | Admin duyệt và tiếp tục công bố |
| HIDDEN | 8 | 4 tuyến hiện bị ẩn nội dung và 4 tuyến của nhà xe đình chỉ |
| DELETED | 4 | Lịch sử tuyến archive |
| **Tổng** | **48** | Lọc `category = TRANSPORT` |

Chuyến dùng để đặt ngay phải gắn listing ACTIVE và nhà xe ACTIVE. Các listing PENDING/HIDDEN có chuyến nháp/công bố chưa xong hoặc lịch sử phù hợp, không lẫn vào nhóm “đặt được”.

### 5.3. Ma trận chức năng Vendor

| Chức năng / màn | Số lượng / dữ liệu cần | Điểm vào | Kết quả phải dùng được |
|---|---|---|---|
| Dashboard | Mỗi nhà xe hoạt động có 75 chuyến và các đơn theo lịch | `/operator` | Chỉ số có dữ liệu và phân biệt hôm nay/lịch sử |
| Hồ sơ nhà xe | 8 hồ sơ hoạt động đủ thông tin/ảnh | `/operator/profile` | Xem/sửa phần thông tin được phép |
| Tạo/sửa xe | 60 xe; có xe trống để thao tác | `/operator/cars` | Không sửa phá mẫu ghế đã được ràng buộc bởi vé/chuyến |
| Sơ đồ ghế | 1.960 seat templates, nhiều hạng | `/operator/cars/:carId/seats` | Xem được sơ đồ và quy tắc cập nhật |
| Điểm đón/trả | 120 điểm và nhiều trạm trên tuyến | `/operator/stops` | Tạo/sửa/ngừng dùng điểm theo điều kiện |
| Tuyến đường | 40 ACTIVE, 4 INACTIVE, 4 archive | `/operator/routes` | Tạo/sửa/thứ tự trạm/khóa/archive có dữ liệu minh họa |
| Xóa tuyến có lịch sử | 4 tuyến đã archive, có chuyến quá khứ | Tuyến và lịch sử chuyến | Tuyến mất khỏi danh mục lập mới, lịch sử còn tham chiếu |
| Lịch trình hôm nay | 12–13 chuyến mỗi nhà xe hoạt động | `/operator/trips` | Mặc định đúng ngày server Việt Nam |
| Tạo chuyến mới | Có xe và khoảng trống thật trong lịch | Trang chuyến | Tạo hôm nay/ngày mai theo thời điểm chạy |
| Công bố chuyến | Có DRAFT/PUBLISHING và Catalog hợp lệ | Trang chuyến | Catalog/Inventory/version khớp khi ON_SALE |
| Giá/hạng ghế | STANDARD/VIP và mức giá khác nhau | Trang quản lý chuyến | Có giá theo class, báo giá lấy từ server |
| Chặn/mở ghế | Ghế AVAILABLE dành riêng cho kịch bản | Trang quản lý chuyến | Không chặn vào ghế đã bán/đang giữ |
| Danh sách khách | Có vé ACTIVE/CHECKED_IN/NO_SHOW | Trang quản lý chuyến | Hiện đúng chuyến, ghế và hành khách |
| Đơn nhà xe | Cả ONLINE/CASH, nhiều trạng thái | `/operator/orders` | Tìm/lọc/phân trang đúng phạm vi |
| Bán tại quầy | Owner có quyền và ca phù hợp | `/operator/counter` | Tạo đơn, thu tiền, phát vé theo luồng |
| Ca tiền mặt | Phân bố 40 ca ở các nhà xe | `/operator/shifts` | Xem thu/hoàn/kiểm đếm/hoa hồng đúng ca |
| Nhân viên | 4 người mỗi nhà xe hoạt động | `/operator/staff` | Mời/phân công/giới hạn chuyến/ngừng assignment |
| Nội dung bán vé | 48 listings theo trạng thái | `/operator/offers/:listingId` | Sửa nội dung được phép; trạng thái Catalog vẫn được tôn trọng |
| Báo cáo | Đơn quá khứ và dòng tiền theo ngày | `/operator/reports` | Có dữ liệu nhiều ngày, không lẫn nhà xe khác |
| Yêu cầu rút tiền | Payout của đơn đủ điều kiện | Báo cáo/quyết toán liên quan | Chỉ REQUESTED khi đủ điều kiện backend |
| Hủy chuyến | Chuyến demo riêng có nhiều đơn/vé | Trang quản lý chuyến | Có tiến trình nhả chỗ, hủy vé, hoàn tiền tương ứng |
| KYC pending/rejected | V10–V12 | Trang đăng ký/theo dõi hồ sơ | Hiện đúng tình trạng, chưa có quyền vận hành như nhà xe approved |
| Đình chỉ | V09 | Đăng nhập Vendor và màn admin | Không nhận bán mới khi nhà xe SUSPENDED |

## 6. Role STAFF — 32 tài khoản với quyền thật trong backend

### 6.1. Nhóm quyền cho mỗi nhà xe V01–V08

| Staff mỗi Vendor | Số người toàn bộ | SELL_CASH | CHECK_IN | MANAGE_TRIP | CLOSE_SHIFT | Phạm vi mặc định |
|---|---:|---|---|---|---|---|
| S01 — bán vé/thu ngân | 8 | Có | Không | Không | Có | Các chuyến được phép trong nhà xe |
| S02 — soát vé | 8 | Không | Có | Không | Không | Một nhóm chuyến chỉ định, gồm chuyến gần giờ demo |
| S03 — điều phối | 8 | Không | Không | Có | Không | Nhóm chuyến quản lý được giao |
| S04 — nhân viên tổng hợp | 8 | Có | Có | Có | Có | Toàn nhà xe |
| **Tổng** | **32** | | | | | |

- Capabilities thực tế của backend là `SELL_CASH`, `CHECK_IN`, `MANAGE_TRIP`, `CLOSE_SHIFT`; không tự đặt thêm cờ quyền chưa tồn tại.
- Đóng ca áp dụng theo quyền và ca của actor trong luồng hiện có, không mặc định cho nhân viên đóng ca người khác.
- Assignment của `V08/S03` được đặt inactive để có một trường hợp thu hồi phân công; 31 assignment còn lại active.
- Role STAFF vẫn không đủ nếu assignment inactive, sai operator hoặc ngoài danh sách chuyến.
- Các quyền xem tài chính dẫn xuất phải lấy từ scope backend, không cấp toàn bộ cho mọi Staff để lấp giao diện.

### 6.2. Ca tiền mặt

- **12 ca đang mở**, mỗi actor tối đa một ca theo ràng buộc hiện tại.
- **28 ca đã đóng**: 22 ca khớp kiểm đếm, 6 ca có chênh lệch có chủ đích.
- Chỉ staff có SELL_CASH mới mang ca thu tiền.
- Có staff hợp lệ chưa mở ca để người trình diễn tự thực hiện từ bước mở ca.
- Các ca có refund/topup phải có đủ biên nhận, nguồn tiền và điều chỉnh hoa hồng.
- Settlement đã đồng bộ chỉ được đánh dấu khi có bản ghi đúng ở GoPay.

### 6.3. Ma trận chức năng Staff

| Chức năng / màn | Tài khoản / dữ liệu dành sẵn | Kết quả phải dùng được |
|---|---|---|
| Chuyến được giao `/staff/trips` | S02/S03 có tripIds cụ thể | Chỉ thấy đúng phạm vi; hôm nay lấy ngày server |
| Bán vé `/staff/counter` | S01/S04 và các ghế trống | Tạo giữ chỗ CASH và đơn đúng nhà xe |
| Thu tiền/phát vé | Đơn CASH_PENDING trong ca đúng actor | Ghi biên nhận một lần, chốt ghế/phát vé đúng |
| Đơn nhóm tại quầy | Cụm 2/4 ghế có thể giữ | Đúng hành khách, ghế, tiền và từng vé |
| Mở ca `/staff/shifts` | Staff đủ quyền chưa có ca | Mở được theo chuyến/nhà xe hợp lệ |
| Đóng ca | Một ca khớp, một ca lệch có dữ liệu | Đúng số thu/hoàn/kiểm đếm/variance |
| Thu bù khi đổi vé | Operation CASH có topup | Đúng actor, ca, khoản phải thu và reference |
| Hoàn tiền mặt | Operation đủ điều kiện refund | Gắn ca đang mở hợp lệ; có chứng từ và nguồn tiền |
| Check-in `/staff/check-in` | Vé còn ACTIVE trong cửa sổ thời gian | QR/token/revision/ghế/đơn đều khớp |
| Quét lại vé đã lên | Vé CHECKED_IN | Không sinh thêm lượt lên xe hoặc hiệu lực mới |
| QR cũ | Vé sau đổi/sửa có revision mới | QR cũ không đại diện cho vé hiện tại |
| Vé đã hủy | Vé VOID | Bị từ chối theo nghiệp vụ |
| Khách no-show | Vé/lịch sử thuộc ngưỡng thời gian hiện tại | Hiển thị đúng và không dùng no-show như vé còn lên xe được |
| Quản lý chuyến `/staff/trips/:tripId/manage` | S03/S04 có MANAGE_TRIP | Thao tác trong scope, không vượt sang nhà xe khác |
| Đơn được giao `/staff/orders` | ONLINE/CASH trong và ngoài phạm vi | Danh sách/chi tiết đúng quyền |
| Assignment ngừng hiệu lực | V08/S03 | Bị từ chối có chủ đích, ghi rõ trong hướng dẫn demo |

### 6.4. Chọn vé check-in theo thời điểm READY

Code hiện cho check-in từ 4 giờ trước khởi hành tới ngưỡng sau giờ đi theo `GOCAR_NO_SHOW_MINUTES` (mặc định 120 phút). Fixture phải lấy cấu hình hiện tại, không mặc định mọi vé đều quét được ở mọi giờ.

Báo cáo chỉ ra ít nhất:

- 8 chuyến, mỗi nhà xe hoạt động một chuyến trong cửa sổ check-in hiện tại khi bố trí được.
- 16 vé ACTIVE có thể quét ở thời điểm READY.
- 8 vé CHECKED_IN để xem lịch sử/chống quét lặp.
- 8 vé VOID hoặc QR revision cũ để minh họa từ chối đúng.

## 7. Role ADMIN — dùng 1 tài khoản hiện có trong Auth

### 7.1. Tài khoản và phân nhóm thao tác

Không sinh thêm Admin. Một tài khoản ADMIN hiện có thực hiện đủ các nhóm nghiệp vụ:

| Tài khoản | Nhóm thao tác demo | Dữ liệu chính |
|---|---|---|
| Admin có sẵn | Tài khoản, hồ sơ nhà xe, kiểm duyệt nội dung | 244 tài khoản seed mới, V10/V11 pending, V12 rejected, listings pending/hidden |
| Cùng tài khoản trên | Hoàn tiền, quyết toán, ca tiền mặt, hoa hồng | 40 đơn chờ hoàn, operation refund, payout, 40 ca |
| Cùng tài khoản trên | Đơn vé, khiếu nại, hủy chuyến, đối soát, outbox | 2.000 đơn, 80 phiếu, chuyến hủy, sự kiện email |

Runner nhận định danh Admin hiện có qua cấu hình và xác nhận tài khoản đang hoạt động, có quyền ADMIN. Nếu thiếu hoặc không hợp lệ thì báo cần cấu hình; tuyệt đối không tự tạo hay tự cấp thêm quyền. Khi cần thực hiện scenario API, dùng phiên đăng nhập/SSO hợp lệ của tài khoản đó, không tạo token bỏ qua Auth. Không lưu mật khẩu/token Admin vào accounts.csv, manifest, log hoặc báo cáo demo.

Danh sách tài khoản xuất ra phân biệt 244 tài khoản demo mới và tham chiếu Admin có sẵn. Các thao tác quản trị chỉ nhằm vào dữ liệu demo thuộc phiên, không thay đổi tài khoản Admin đang dùng.

### 7.2. Phân bố 80 phiếu hỗ trợ

| Trạng thái | Số lượng |
|---|---:|
| OPEN | 48 |
| IN_REVIEW | 16 |
| RESOLVED | 10 |
| REJECTED | 6 |
| **Tổng** | **80** |

Mỗi order tối đa một phiếu active. Phiếu gắn đúng khách sở hữu đơn; lý do, mô tả và phản hồi phải có nội dung cụ thể theo tình huống, không lặp một câu cho toàn bộ 80 phiếu.

### 7.3. Ma trận chức năng Admin

| Màn / chức năng | Số lượng / dữ liệu chuẩn bị | Kết quả demo |
|---|---|---|
| `/admin` — tổng quan | Toàn bộ số liệu seed đã tổng hợp | Số đếm từ server, phân biệt đơn/chuyến/cảnh báo |
| `/admin/accounts` | 244 account demo mới và trạng thái đặc biệt | Tìm/xem/khóa/mở/cấp quyền được phép; không đụng admin thật |
| `/admin/applications` | 2 pending, 1 rejected, 9 approved | Xem giấy tờ mẫu; duyệt/từ chối đúng luồng Identity → GoCar |
| `/admin/operators` | 8 active, 1 suspended | Đình chỉ/kích hoạt có dữ liệu vận hành để minh họa |
| `/admin/offers` | 32 ACTIVE, 4 PENDING, 8 HIDDEN, 4 DELETED | Duyệt/ẩn đúng listing TRANSPORT |
| `/admin/orders` | 2.000 đơn và mọi nhóm trạng thái nêu ở mục 2 | Tìm/lọc/phân trang, xem vé thuộc đơn |
| `/admin/refunds` — phiếu khách | 80 phiếu | Tiếp nhận, phản hồi, giải quyết/từ chối; không biến đóng phiếu thành chuyển tiền |
| `/admin/refunds` — toàn đơn | 40 đơn REFUND_PENDING, phân biệt nguồn phát sinh | Đúng nghĩa vụ, đúng chứng từ, điều kiện backend |
| `/admin/refunds` — từng vé | Operation chờ hoàn, thu bù và bỏ đổi | Chọn đúng refundDue/topup và bước còn được xử lý |
| `/admin/cancellations` | Chuyến demo có đơn chưa trả/đã trả và nhiều vé | Tra summary đúng rồi hủy, xem tiến độ qua Cart/GoCar |
| `/admin/reconciliation` | Baseline dữ liệu khớp, có lịch sử RESOLVED; pack ngoại lệ riêng | Quét lại/ghi chú có ý nghĩa; cảnh báo đóng theo kết quả thật |
| Outbox email | Lịch sử SKIPPED/DELIVERED nếu thực gửi, pending/failed có kiểm soát | Gửi lại chỉ ở điều kiện đúng; không tạo hàng nghìn email lỗi |
| `/admin/payouts` | Có ít nhất 20 REQUESTED, 40 PAID và các trạng thái khác hợp lệ | Prepare số phải chi mới nhất, ghi chứng từ demo |
| Hoa hồng tiền mặt | Ca đã đóng và các khoản điều chỉnh | Xem gross/refund/commission/outstanding đúng |
| `/admin/policies` | Đọc cấu hình hiện tại | Thấy policy; seed không đổi hoa hồng toàn hệ sinh thái |

### 7.4. Khoản chờ xử lý trong bộ mặc định

40 REFUND_PENDING và 64 phiếu OPEN/IN_REVIEW là công việc vận hành có chủ đích để demo admin. Đây không phải lỗi thiếu liên kết dữ liệu.

Các khoản refund mới phát sinh được đặt thời điểm hợp lý để không tự tạo REFUND_STUCK do gán lịch sử quá 24 giờ ngoài ý muốn. Baseline mong muốn không có finding OPEN do seed hỏng.

## 8. 120 nghiệp vụ đổi/hủy và số liệu tài chính

### 8.1. Phân bổ mục tiêu

| Tình huống | Số operation |
|---|---:|
| Đổi ngang giá | 20 |
| Đổi đắt hơn, thu bù ONLINE | 20 |
| Đổi đắt hơn, thu bù CASH | 10 |
| Đổi rẻ hơn, đã hoàn phần chênh | 15 |
| Đổi rẻ hơn, còn chờ hoàn | 10 |
| Hủy từng vé đã hoàn | 20 |
| Hủy từng vé còn chờ hoàn | 10 |
| Bỏ đổi trước khi thu bù | 5 |
| Bỏ đổi sau thu bù, đã trả lại khoản bù | 5 |
| Bỏ đổi sau thu bù, còn chờ trả khoản bù | 5 |
| **Tổng** | **120** |

Các operation là tập con/lịch sử của 2.000 đơn, không phải thêm 120 đơn ngoài tổng. Các khoản hoàn từng vé có thể tồn tại trên đơn vẫn CONFIRMED vì những vé khác còn hiệu lực.

### 8.2. Ràng buộc tài chính

- `orders.total_amount` giữ ý nghĩa tiền gốc; giá hiện tại đọc từ item/projection.
- Snapshot phí theo chính sách backend và phiên bản chốt của đơn.
- ONLINE có payment request/transaction mô phỏng phù hợp; CASH có receipt/shift phù hợp.
- Thu bù dùng operation ID đúng như hợp đồng GoPay hiện tại.
- Ledger, revision, nguồn tiền, refund allocation và commission phải khớp.
- Payout REQUESTED/PAID chỉ thuộc đơn và dòng tiền đủ điều kiện quyết toán.
- Bằng chứng mẫu có reference riêng theo runId, file/URL truy cập được và gắn DEMO.
- Ghi chứng từ demo không được mô tả là lệnh chuyển tiền ngân hàng đã thực hiện ngoài môi trường mô phỏng.
- Không sửa commission config dùng chung chỉ để tạo mức phí mong muốn cho seed.

## 9. Chia cách tạo dữ liệu và xử lý email

### 9.1. Bulk snapshot cho khối lượng lớn

Phần lớn lịch sử được sinh bằng factory nhất quán rồi ghi qua adapter database theo từng service. Dùng cho biểu đồ, phân trang, lịch sử và các tình huống đã kết thúc.

Bộ snapshot phải có đủ mọi phần ghế/vé/tiền/chứng từ theo tình huống, không chỉ đổi cột status. Báo cáo ghi rõ đây là dữ liệu lịch sử mô phỏng.

### 9.2. 50 kịch bản đại diện qua API

Các kịch bản dưới chạy bằng API hợp lệ trong tiến trình seed, dùng tài khoản/quyền demo. Chúng là công việc tạo dữ liệu demo; không kéo theo chạy unit/integration/E2E suite của toàn dự án.

#### User — 14 kịch bản

| ID | Nội dung |
|---|---|
| U-01 | Đăng nhập và cập nhật hồ sơ user demo |
| U-02 | Tìm chuyến đúng ngày, tỉnh, bộ lọc và sắp xếp |
| U-03 | Xem ghế có đủ trạng thái và lấy quote |
| U-04 | Đặt một ghế online |
| U-05 | Đặt nhóm 2/4 người |
| U-06 | Hoàn tất thanh toán MOCK và lấy vé |
| U-07 | Bỏ đơn đang chờ tiền theo luồng hủy hợp lệ |
| U-08 | Theo dõi tình huống giữ chỗ hết hạn; TTL thật hoặc snapshot lịch sử, ghi rõ loại |
| U-09 | Đổi ngang giá |
| U-10 | Đổi đắt hơn và thanh toán khoản bù |
| U-11 | Đổi rẻ hơn và theo dõi nghĩa vụ hoàn |
| U-12 | Sửa thông tin/revision và yêu cầu gửi lại vé |
| U-13 | Hủy một vé trong đơn nhiều vé |
| U-14 | Gửi phiếu hỗ trợ và xem trạng thái |

#### Vendor — 12 kịch bản

| ID | Nội dung |
|---|---|
| V-01 | Tạo xe và mẫu ghế hợp lệ |
| V-02 | Sửa thông tin/trạng thái một xe đủ điều kiện |
| V-03 | Tạo/sửa/ngừng dùng điểm đón trả |
| V-04 | Tạo/sửa tuyến và thứ tự trạm |
| V-05 | Archive tuyến có lịch sử theo luồng hiện có |
| V-06 | Tạo chuyến hôm nay hoặc ngày mai dựa theo giờ chạy thật |
| V-07 | Công bố chuyến qua Catalog và Inventory |
| V-08 | Dừng/mở lại bán khi đủ điều kiện |
| V-09 | Giá theo hạng và chặn/mở ghế trống |
| V-10 | Phân công/cập nhật/ngừng assignment staff demo |
| V-11 | Xem đơn, báo cáo và ca thuộc nhà xe |
| V-12 | Yêu cầu rút khoản payout đủ điều kiện |

#### Staff — 12 kịch bản

| ID | Nội dung |
|---|---|
| S-01 | Đọc chuyến trong phạm vi được giao |
| S-02 | Mở ca thu tiền |
| S-03 | Tạo đơn CASH một vé |
| S-04 | Tạo đơn CASH nhiều vé |
| S-05 | Thu đúng tiền và nhận vé |
| S-06 | Ghi hoàn tiền mặt ở operation/ca hợp lệ |
| S-07 | Ghi khoản bù tiền mặt |
| S-08 | Đóng ca kiểm đếm khớp |
| S-09 | Đóng ca có chênh lệch có chủ đích |
| S-10 | Check-in vé hợp lệ trong cửa sổ giờ thật |
| S-11 | Minh họa quét lại / QR revision cũ bị xử lý đúng |
| S-12 | Xem danh sách khách, boarding và no-show lịch sử |

#### Admin — 12 kịch bản

| ID | Nội dung |
|---|---|
| A-01 | Xem tổng quan và số đếm theo nhóm |
| A-02 | Duyệt một hồ sơ demo qua Identity → GoCar |
| A-03 | Từ chối hồ sơ demo khác với lý do |
| A-04 | Duyệt/ẩn nội dung TRANSPORT |
| A-05 | Đình chỉ/kích hoạt đúng nhà xe được chọn làm scenario |
| A-06 | Tra cứu/phân trang đơn và mở chi tiết |
| A-07 | Tiếp nhận và xử lý phiếu hỗ trợ |
| A-08 | Đối chiếu PAID_REVIEW rồi xử lý hoàn theo bằng chứng MOCK nếu đủ điều kiện |
| A-09 | Xử lý refund của operation và theo dõi bỏ đổi có khoản bù |
| A-10 | Hủy một chuyến demo có các loại đơn liên quan |
| A-11 | Chuẩn bị khoản chi, ghi chứng từ payout/hoa hồng demo hợp lệ |
| A-12 | Quét đối soát, ghi chú và xử lý event email theo trạng thái |

**Tổng: 14 + 12 + 12 + 12 = 50 kịch bản.** Một kịch bản có thể gồm nhiều API call. Runner cần phân biệt kết quả “đã thực hiện”, “đang chờ”, “được chuẩn bị bằng snapshot” và “không hoàn tất”.

Các kịch bản được tính trong quota tổng hoặc fixture đặc biệt được liệt kê riêng trong summary. Sau những kịch bản làm thay đổi KYC/trạng thái, cần bảo đảm vẫn còn đủ tài khoản/đối tượng sẵn sàng cho người demo thao tác tiếp; có thể chuẩn bị bản pending bổ sung và ghi rõ số lượng thực tế.

### 9.3. Email demo

- Domain email mẫu phải có cách xử lý rõ trong transport worker.
- Email không gửi thật được lưu SKIPPED với lý do DEMO; không giả DELIVERED.
- Muốn gửi thật cần mailbox demo được cấu hình, giới hạn số thông báo đại diện.
- Chứng từ/ảnh/tài liệu demo phải truy cập được, có nhãn Demo; ưu tiên asset có sẵn hoặc được quản lý trong bộ demo.
- Luồng API tạo vé sẽ tự enqueue email. Vì vậy cơ chế email demo phải sẵn sàng trước khi chạy 50 kịch bản, tránh làm đầy hàng đợi bằng email lỗi.

## 10. Gói ngoại lệ tùy chọn

Bộ FULL mặc định tập trung dữ liệu hợp lệ và công việc vận hành đúng. Gói `exceptions` bổ sung các tình huống có nhãn/ID rõ ràng, ví dụ:

- Đã thu tiền nhưng cần kiểm tra khả năng phát vé.
- Nghiệp vụ còn chờ khoản bù.
- Hồ sơ hoàn lâu hơn ngưỡng để minh họa REFUND_STUCK.
- Event email FAILED có lý do demo.
- Ca tiền mặt có chênh lệch.
- Phiếu hỗ trợ cần admin xử lý.

Không tắt Inventory/GoPay/GoTravel chung để dựng sự cố. Nếu chỉ dựng snapshot trạng thái ngoại lệ, phải ghi rõ nó là fixture; không tuyên bố đã gây lỗi mạng thật. Mỗi ngoại lệ có lý do, kết quả dự kiến và cách kết thúc đúng nghiệp vụ.

## 11. Thứ tự ghi dữ liệu, tính nhất quán và bảo vệ hệ đang chạy

### 11.1. Ánh xạ database

| Adapter | Database | Trách nhiệm |
|---|---|---|
| Identity writer | `auth_db` | Account/role/profile/KYC demo |
| GoCar writer | `car` | Operator/staff/fleet/route/trip/ticket/revision/audit |
| Catalog writer | `cataloglisting` | Listing TRANSPORT và nội dung |
| Inventory writer | `bookinginventory` | Trip inventory, seat/hold/item operation |
| Cart writer | `cartorder` | Order/item/cash/proof/dispute/operation/outbox |
| GoPay writer | `paymentwallet` | Payment, item ledger, refund, settlement và payout |

### 11.2. Trình tự bắt buộc

1. Acquire seed lock và ghi manifest RUNNING.
2. Kiểm tra schema/cấu hình/capability cần dùng; không tự chạy migration nghiệp vụ chung trong lệnh seed.
3. Sinh toàn bộ đồ thị ID, quota, lịch xe và lịch tiền trong bộ nhớ/artifact kế hoạch.
4. Tạo danh tính và dữ liệu nền demo; các phần chưa sẵn sàng để ở trạng thái chưa công bố phù hợp.
5. Chuẩn bị các phần Inventory/GoCar/GoPay lịch sử theo cùng plan.
6. Ghi order và item cùng chứng từ liên quan trong transaction cục bộ hợp lệ; hạn chế để worker thấy một order đã xác nhận trong khi phần ghế/vé/tiền chưa được chuẩn bị.
7. Công bố những chuyến đã đủ điều kiện; giữ các trường hợp pending/hidden đúng mục đích.
8. Chạy các kịch bản API đại diện và lưu ID response.
9. Tạo/refresh các tình huống ngắn hạn, kiểm tra lại đồng hồ và hạn hold.
10. Tổng hợp dữ liệu thực tế, các sai lệch, tình huống còn chờ và xuất report READY hoặc PARTIAL/FAILED.

Sáu database không có một transaction nguyên tử chung. Manifest, idempotency, thứ tự ghi, trạng thái công bố và khả năng resume là yêu cầu cốt lõi; không giả định `BEGIN` ở Cart sẽ rollback các database khác.

### 11.3. Các điều kiện seed tự kiểm tra

Đây là kiểm tra tính nhất quán của dữ liệu seed, không phải yêu cầu chạy bộ test toàn hệ thống:

- Đủ 244 account seed mới theo nhóm và đúng quyền/trạng thái; Admin là tham chiếu tới 1 tài khoản có sẵn hợp lệ, không thuộc tập dữ liệu seed được sửa/xóa.
- Đủ xe/ghế/tuyến; 600 lịch không vi phạm ràng buộc trùng xe.
- Listing/nhà xe/chuyến/Inventory cùng cho phép bán ở các chuyến được quảng bá là đặt ngay.
- Ghế HELD có đúng hold, order và expiresAt.
- Vé ACTIVE thuộc đúng item/trip/seat, ghế SOLD theo luồng hợp lệ.
- Vé VOID và đơn đã hủy/hoàn không giữ chỗ bán sai; chỗ có thể được bán cho order mới theo lịch sử đúng.
- QR ký bằng key hiện tại; hash/revision/token_generation phù hợp.
- Tiền online, biên nhận CASH, khoản bù, hoàn, balance và commission khớp.
- Không có hai operation active trái unique constraint trên cùng item/ticket.
- Payout đủ điều kiện và không tính trừ lặp từ base gốc.
- Các snapshot hỗ trợ/đối soát/outbox phân biệt đúng loại; không đánh dấu thành công giả.
- Các cảnh báo ngoài dự kiến phải được ghi vào report; không xóa/force-resolve để làm summary trông sạch.
- Kiểm tra namespace, số lượng và tác động để xác nhận không thay đổi dữ liệu GoTravel hoặc dữ liệu ngoài phiên.

## 12. Cấu trúc triển khai dự kiến

```text
deploy/
  seed-goticket-demo.sh           # Một điểm vào; gọi runner mới khi triển khai
  seeds/goticket/
    SEED_DEMO_FULL_PLAN.md        # Tài liệu này
    README.md                    # Cách chạy, yêu cầu và đọc report
    runner/
      cli.ts
      config.ts
      run-manifest.ts
      ownership.ts
      clock.ts
      quotas.ts
      schedule-planner.ts
      id-factory.ts
      adapters/
        identity.ts
        car.ts
        catalog.ts
        inventory.ts
        cart.ts
        payment.ts
      factories/
        accounts.ts
        operators.ts
        fleet.ts
        routes.ts
        trips.ts
        orders.ts
        tickets.ts
        cash.ts
        item-operations.ts
        refunds.ts
        payouts.ts
        support.ts
        notifications.ts
      scenarios/
        user.ts
        vendor.ts
        staff.ts
        admin.ts
      checks/
        time.ts
        ownership.ts
        inventory.ts
        money.ts
        cross-service.ts
      reports/
        summary.ts
        demo-guide.ts
```

Công nghệ triển khai Node.js/JavaScript ES modules với adapter database và HTTP rõ ràng (cấu trúc .ts ở sơ đồ trên là thiết kế ban đầu; source thực tế dùng .mjs). Dependencies được khai báo cho runner, không dựa vào import nội bộ ngẫu nhiên từ node_modules của một service khác. Giữ script cũ có cách tương thích trong quá trình chuyển đổi.

## 13. Checklist triển khai có thể bàn giao cho model khác

### P0 — Nền tảng runner và định danh

- [x] Tạo CLI, cấu hình profile FULL và runId.
- [x] Tạo đồng hồ Việt Nam, in ngày thật và lưu thời điểm từng giai đoạn.
- [x] Khóa một lượt seed, manifest và record ownership.
- [x] Khai báo quota chính xác theo các bảng ở mục 2.
- [x] Kết nối riêng sáu database, đọc cấu hình an toàn, không in secret.
- [x] Resume theo phase/ID đã có, không thực hiện lại mù các thao tác tiền.

**Đầu ra:** lập được plan theo ngày chạy và có thể tiếp tục một lượt gián đoạn.

### P1 — Bốn nhóm tài khoản

- [x] Sinh 200 User theo các cohort.
- [x] Sinh 12 account hồ sơ Vendor, 9 approved/2 pending/1 rejected.
- [x] Sinh 32 Staff; cấu hình tham chiếu tới 1 Admin hiện có trong Auth, không tạo Admin mới.
- [x] Tạo profile/giấy tờ/ảnh mẫu truy cập được.
- [ ] Kiểm tra role kỹ thuật thực tế, trạng thái tài khoản và điều hướng SSO.
- [x] Xuất accounts theo role và mục đích trình diễn.

**Đầu ra:** đủ 244 account seed mới và 1 Admin có sẵn để demo; pending Vendor chưa có quyền vận hành sai.

### P2 — Nhà xe, nhân viên, xe và tuyến

- [x] Tạo 9 operators với trạng thái đúng.
- [x] Tạo 60 xe, 1.960 templates và loại ghế.
- [x] Tạo 120 điểm đón/trả, 48 tuyến và route_stops.
- [x] Tạo 32 assignment theo matrix; một inactive.
- [x] Chuẩn bị lịch sử cho 4 tuyến archive.
- [x] Tạo 48 listings đúng các nhóm trạng thái.

**Đầu ra:** dữ liệu Vendor/Staff dùng được trước bước đặt vé.

### P3 — Lịch ngày chạy và Inventory

- [x] Lập 100 chuyến quá khứ, 100 hôm nay, 400 sắp tới.
- [x] Phân bổ 75 chuyến mỗi nhà xe ACTIVE theo bảng Vendor.
- [x] Kiểm tra trùng lịch xe và buffer hành trình.
- [x] Chuẩn bị DRAFT/PUBLISHING/STOP_SALE và các chuyến có thể đặt ngay.
- [x] Khởi tạo Inventory đúng bước công bố, version và sale_enabled.
- [x] Chọn chuyến/ghế cho đặt nhóm, check-in, đổi/hủy và hủy chuyến.

**Đầu ra:** mở ngày hôm nay trên giao diện thấy đúng lịch; có đường dẫn đến chuyến còn đủ điều kiện.

### P4 — Đơn, vé, tiền và ca

- [x] Sinh 2.000 order, 3.200 item theo matrix ONLINE/CASH và trạng thái.
- [x] Tạo lịch sử hold/seat/ticket đầy đủ cho từng nhóm.
- [x] Ký QR/revision bằng khóa môi trường hiện tại.
- [x] Tạo payment/receipt/ledger theo phương thức.
- [x] Tạo 40 ca với thu/hoàn/kiểm đếm/hoa hồng khớp.
- [x] Chuẩn bị payout đủ trạng thái và điều kiện.

**Đầu ra:** lịch sử hiển thị phong phú, không có finding ngoài dự kiến vì thiếu dữ liệu.

### P5 — Đổi/hủy, hoàn, hỗ trợ và outbox

- [x] Tạo ít nhất 120 operation theo phân bổ.
- [x] Tạo proof, money events, fund lots và allocation tương ứng.
- [x] Tạo 80 phiếu hỗ trợ đúng trạng thái/sở hữu.
- [ ] Tạo tiến trình hủy chuyến và đổi theo cặp đơn nếu dùng trong demo.
- [ ] Hoàn thiện cơ chế email demo SKIPPED/gửi thật giới hạn.
- [x] Chuẩn bị history/outbox/reconciliation theo nghiệp vụ.

**Đầu ra:** Admin có công việc thật để thao tác; UI không đầy cảnh báo do seed thiếu liên kết.

### P6 — 50 kịch bản qua API

- [ ] Hoàn tất 14 kịch bản User qua API: đã thực hiện 13; U-08 biểu diễn hết hạn bằng snapshot, không chờ 15 phút trong runner.
- [x] Hoàn tất 12 kịch bản Vendor.
- [x] Hoàn tất 12 kịch bản Staff.
- [ ] Thực hiện 12 kịch bản Admin qua API: handler đã code, đang chờ phiên Admin có sẵn hợp lệ; dữ liệu UI đã chuẩn bị.
- [x] Mỗi bước lưu response ID, trạng thái, điều kiện chờ và lỗi.
- [x] Không báo DONE cho bước chưa hoàn tất; snapshot được ghi rõ là snapshot.
- [x] Giữ các tài khoản sạch và đủ fixture pending để người demo còn thao tác tiếp.

**Đầu ra:** các luồng đại diện đã tạo dữ liệu qua đường API thực của hệ thống.

### P7 — Hoàn thiện báo cáo, chạy lại và bàn giao

- [x] Kiểm tra lại ngày/giờ và các hold trước READY.
- [x] Kiểm tra tính nhất quán các record do seed sở hữu.
- [x] Tổng hợp expected/actual và chênh lệch thay vì chỉ in “seed thành công”.
- [x] Xuất DEMO_GUIDE cho từng role với account/link/order/trip/case cụ thể.
- [x] Hoàn thiện resume và refresh-live.
- [x] Ghi cách phân biệt fixture bình thường, scenario đang chờ và exception pack.
- [x] Cập nhật README cách chạy và giới hạn hiện tại.

**Đầu ra:** một lệnh tạo phiên demo, có tài khoản và chỉ dẫn để trình diễn ngay.

## 14. Lệnh dự kiến và báo cáo cuối

FULL/resume/refresh-live đã triển khai theo README. `--include-exceptions` trong kế hoạch dưới đây chưa hỗ trợ và bị từ chối rõ ràng:

```bash
./deploy/seed-goticket-demo.sh --profile full
./deploy/seed-goticket-demo.sh --resume <runId>
./deploy/seed-goticket-demo.sh --refresh-live <runId>
./deploy/seed-goticket-demo.sh --profile full --include-exceptions
```

Report bắt buộc có:

1. Ngày giờ bắt đầu/READY theo Việt Nam, runId và version.
2. Số lượng dự kiến/thực tế cho từng loại dữ liệu và bốn nhóm tài khoản.
3. Ngày đang được chọn trong hướng dẫn; link chuyến hôm nay/ngày mai hợp lệ.
4. Danh sách account theo User/Vendor/Staff/Admin và chức năng trình diễn.
5. Nhóm User sạch, người có pending, người đổi/hủy, người hỗ trợ.
6. Vendor và Staff thuộc đúng nhau, capability/trip scope rõ ràng.
7. Đơn chờ thanh toán còn bao lâu; cách refresh khi đã hết hạn.
8. Vé check-in được ở lúc READY, vé đã quét và vé bị từ chối dự kiến.
9. Phiếu hỗ trợ, khoản refund, payout và chuyến hủy để Admin mở.
10. Số scenario đã thực hiện/đang chờ/thất bại/snapshot.
11. Các cảnh báo đối soát ngoài dự kiến và nơi xem chi tiết.
12. Danh sách file artifact và cách resume.

## 15. Điều kiện coi bộ seed đã hoàn thành

- [ ] Chạy tại ngày thực tế nào thì tạo lịch cho đúng ngày đó theo Việt Nam.
- [ ] Có đủ dữ liệu và đường đi sử dụng cho cả 4 role, không chỉ trang User.
- [ ] Đạt các quota lớn hoặc báo rõ chênh lệch có lý do.
- [ ] Có các chuyến đặt được, vé check-in đúng cửa sổ và tình huống giữ chỗ còn hạn tại READY.
- [ ] Dữ liệu ghế/vé/tiền/đơn/chứng từ khớp giữa sáu database.
- [ ] Chạy lại/resume không tạo lặp tiền, trùng ghế, trùng lịch hoặc phá lịch sử.
- [ ] Dữ liệu ngoài namespace và hệ GoTravel được giữ nguyên.
- [ ] Email/chuyển tiền demo được ghi nhận trung thực, có kiểm soát.
- [ ] Người trình diễn mở DEMO_GUIDE là biết đăng nhập ai, mở màn nào, thao tác trên bản ghi nào.

## 16. Tài liệu/source tham chiếu

- [Kiến trúc và database hiện tại](../../../README_GOTICKET.md).
- [Seed hiện tại](../../../deploy/seed-goticket-demo.sh) và các file 01–07 trong thư mục này.
- [Các route frontend](../../../front-end-goticket/src/App.tsx).
- [Schema GoCar](../../../car/prisma/schema.prisma).
- [Quyền Staff](../../../car/src/staff/domain/staff.repository.ts).
- [Luồng Cart transport](../../../CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport).
- [Inventory transport](../../../BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport).
- [GoPay ledger và quyết toán](../../../PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/transport).
- [Nhật ký sửa Admin/đối soát](../../../front-end-goticket/ADMIN_BUSINESS_FIX_LOG.md).
