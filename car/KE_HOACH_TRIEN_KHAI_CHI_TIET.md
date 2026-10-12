> **Cập nhật tiến độ 11/10/2026:** Source A/B/C1–C6/D và các lỗi audit đã được triển khai qua GoCar, Inventory, Cart, GoPay, Catalog và Communication. Tài liệu này là đề xuất trước triển khai; tên bảng/file giả định ở dưới không phải schema authoritative. Theo dõi source/checklist/migration thực tế trong [BACKEND_COMPLETION_PLAN.md](BACKEND_COMPLETION_PLAN.md), mục 20–21; API trong [BACKEND_OPERATIONS.md](BACKEND_OPERATIONS.md). Chưa build/test/generate/migrate, GoCar vẫn tắt.

# BẢN ĐỆ TRÌNH KẾ HOẠCH TRIỂN KHAI CHI TIẾT BACKEND GOCAR (BẢN HOÀN THIỆN ĐẦY ĐỦ)
## (Kế hoạch hành động theo BACKEND_COMPLETION_PLAN.md)

- **Ngày cập nhật:** 11/10/2026
- **Trạng thái:** BẢN HOÀN THIỆN ĐÃ TIẾP THU TOÀN DIỆN CẢ 2 ĐỢT GÓP Ý CHUYÊN SÂU — CHỜ LỆNH TRIỂN KHAI CHÍNH THỨC
- **Checkout gốc của hệ sinh thái:** `/home/DoANLienNganh` (thư mục GoCar: `/home/DoANLienNganh/car`)
- **Phạm vi tác động:** Toàn bộ backend hệ sinh thái (`car`, `CartandOrder`, `BookingandInventory`, `CatalogandListing`, `PaymentandWallet`, `Identity`, `cloudinary-service`, `APIGateway`).
- **Cam kết kỷ luật:** Tuyệt đối KHÔNG tự ý chỉnh sửa mã nguồn nghiệp vụ, KHÔNG chạy test/build sinh email/provider, KHÔNG migrate database live, KHÔNG commit/push Git trước khi được chủ dự án phê duyệt và yêu cầu chính thức.

---

## 1. MỤC TIÊU & RANH GIỚI BẤT BIẾN CỦA HỆ SINH THÁI

### 1.1. Mục tiêu cốt lõi
Remake toàn diện backend GoCar thành một hệ sinh thái vận tải hành khách liên tỉnh hoàn chỉnh, giải quyết trọn vẹn nghiệp vụ cho 4 nhóm đối tượng: **Hành khách (Customer)**, **Chủ nhà xe (Operator Owner / Ticket Vendor)**, **Nhân viên nhà xe (Operator Staff: Thu ngân / Lơ xe / Điều hành)** và **Quản trị viên (Admin)**.

Hệ thống tận dụng nghiệp vụ xe khách tham chiếu từ `GoTicket`, nhưng **khắc phục triệt để các sai lầm và thiết kế yếu kém của GoTicket**:
1. **Không cho phép tự ý cập nhật ghế trực tiếp trên bảng vé**: Mọi thay đổi ghế phải qua cơ chế khóa và giải phóng nguyên tử tại Inventory (`BookingandInventory`).
2. **Không xác nhận vé khi chưa có bằng chứng thanh toán**: Phải có giao dịch online được xác thực qua GoPay hoặc biên nhận tiền mặt `CashReceipt` thực tế qua ca làm việc.
3. **Không hard-delete dữ liệu lịch sử**: Chuyến, xe, điểm dừng, vé đã hủy đều phải giữ nguyên vẹn dấu vết kiểm toán (Audit Trail) phục vụ đối soát, khiếu nại và hoàn tiền.
4. **Không tính doanh thu dựa trên số booking ảo**: Phân tách rõ ràng giữa tổng giá trị đặt chỗ (`booked_amount`), tiền online thực nhận, tiền mặt qua biên nhận, và tiền hoàn trả thực tế.
5. **Một ghế chiếm toàn bộ chuyến xe (V1)**, thời gian giữ chỗ (Hold) 15 phút nghiêm ngặt, tự động giải phóng bởi worker nền.

---

### 1.2. Ranh giới dữ liệu & Phân định trách nhiệm (Ownership Boundaries)

| Dịch vụ | Công nghệ | Trách nhiệm duy nhất (Source of Truth) | Những điều TUYỆT ĐỐI KHÔNG làm tại đây |
|---|---|---|---|
| **`Identity`** | Spring Boot / PostgreSQL | Quản lý tài khoản duy nhất (`users.id` UUID), thông tin đăng nhập, vai trò hệ thống (`USER`, `TICKET_VENDOR`, `HOST`, `ADMIN`), và phê duyệt đơn đăng ký nhà xe (KYC). | Không lưu hồ sơ vận hành xe, không quản lý chuyến/vé xe, không mở role `HOST` cho nhà xe. |
| **`car` (GoCar)** | NestJS / Prisma / PostgreSQL | **Trung tâm vận hành vận tải:** Quản lý nhà xe (`Operator`), xe (`Car`), sơ đồ ghế mẫu (`SeatTemplate`), danh mục điểm dừng (`OperatorStop`), tuyến (`Route`), chuyến (`Trip`), phân công nhân viên (`OperatorStaff`), đóng băng snapshot mở bán (`saleSnapshot`), phát hành vé (`IssuedTicket`), mã QR token, check-in, manifest. | Không tự giữ bản tồn kho ghế thứ hai có quyền ghi; không tự nhận tiền; không tự quản lý đơn hàng thương mại. |
| **`CatalogandListing`** | Spring Boot / PostgreSQL | Bài đăng giới thiệu tuyến xe category `TRANSPORT`, hình ảnh, nội dung tiện ích, kiểm duyệt bài đăng (moderation). | Không tạo listing cho từng chuyến lẻ; không chạy khởi tạo lịch 90 ngày cho vé xe; không chốt giá thanh toán từ `basePrice`. |
| **`BookingandInventory`** | Spring Boot / PostgreSQL | **Nguồn sự thật duy nhất về ghế bán được:** Trạng thái ghế `(tripId, seatId)` gồm `AVAILABLE`, `HELD`, `SOLD`, `BLOCKED`. Xử lý giữ chỗ nguyên tử (Atomic Hold 15 phút), giải phóng khi hết hạn, xác nhận bán (`confirmSale`), hủy vé đã bán (`cancelSold`). | Không can thiệp chính sách giá, tiền tệ hay đơn hàng. Không cho phép nhả ghế khi chưa có bằng chứng vé đã bị VOID. |
| **`CartandOrder`** | Spring Boot / PostgreSQL | **Nguồn sự thật duy nhất về giao dịch thương mại:** Đơn hàng `GOCAR_TICKET`, từng ghế là một `OrderItem`, báo giá tin cậy từ GoCar (`quoteHash`), sổ ca tiền mặt (`CashShift`) và biên nhận (`CashReceipt`), điều phối đổi vé / hủy chuyến / hoàn tiền, outbox email gửi vé kèm QR. | Không tự ý can thiệp trạng thái ghế mà không qua Inventory; không tự tạo chứng từ hoàn tiền ngân hàng ảo; không truy vấn trực tiếp DB của Payment. |
| **`PaymentandWallet` (GoPay)** | Spring Boot / PostgreSQL | Xử lý thanh toán trực tuyến (VNPAY, SePay, ví), xác thực chữ ký webhook, ghi nhận bằng chứng hoàn tiền thực tế (`transport_manual_refunds`), cung cấp hợp đồng báo cáo tiền thực thu nội bộ. | Trình duyệt không gửi amount được tin cậy; không nhận tiền mặt (tiền mặt do Cart quản lý); không tạo thêm sổ trùng dữ liệu. |
| **`cloudinary-service`** | Express / Node.js | Quản lý media phạm vi `transport/<userId>` và dịch vụ gửi mail đính kèm QR vé xe nội bộ. | Không tự phát hành vé, chỉ nhận lệnh gửi từ outbox của Cart. |
| **`APIGateway`** | Express / Node.js | Reverse proxy, chặn truy cập bên ngoài vào toàn bộ prefix `/api/v1/internal/*`, loại bỏ các headers giả mạo (`x-internal-*`, `x-user-*`). | Không can thiệp logic nghiệp vụ bên trong các service. |

> **Quy ước định danh cốt lõi:**
> - `operatorId`: UUID của bản ghi trong bảng `operators` của GoCar.
> - `operatorUserId`: UUID của tài khoản chủ nhà xe trong `Identity` (`users.id`), đồng thời là `hostId` trong bảng `orders` của Cart.
> - Tuyệt đối không dùng lẫn lộn hai ID này trong bất kỳ logic nào.

---

## 2. KẾ HOẠCH HÀNH ĐỘNG CHI TIẾT THEO TỪNG GIAI ĐOẠN

---

### GIAI ĐOẠN 1: BẢNG RÀ SOÁT & XỬ LÝ TOÀN DIỆN TỒN ĐỌNG NHÓM A (A-R1 ĐẾN A-R21)

Không đánh dấu hoàn thành Nhóm A khi chưa rà soát và giải quyết toàn bộ 21 điểm sau:

| Mã | Phân loại | Hiện trạng kỹ thuật | Giải pháp kỹ thuật khi triển khai |
|---|---|---|---|
| **A-R1** | Rà soát DTO | API đổi trạng thái nhưng `inventorySyncVersion <> inventorySyncedVersion` vẫn trả response thành công mà không báo pending. | Bổ sung trường `inventorySyncPending: boolean` vào response chuyến để client/vận hành nhận biết tiến trình nền đang chạy. |
| **A-R2** | Khóa & Downstream Versioning | Transaction Prisma (timeout 15s) giữ khóa qua HTTP (5s) tới Inventory; nếu bỏ khóa thì request cũ đến muộn có nguy cơ ghi đè bật lại bán. | **Triển khai đồng bộ cả hai phía (GoCar & BookingandInventory):** (1) Phía Inventory: Migration thêm cột version lưu trạng thái bán của trip; update version & saleEnabled trong cùng transaction; version mới hơn áp dụng trạng thái, cùng version cùng trạng thái trả idempotent success, version cũ hơn bỏ qua không đổi trạng thái, cùng version khác trạng thái trả 409 Conflict. (2) Phía GoCar: Giữ khóa hàng trip `FOR UPDATE` ngắn để serialize giữa request và worker (quản lý timeout 5s HTTP / 15s DB); gọi Inventory kèm version; chỉ ghi nhận `inventorySyncedVersion` khi Inventory xác nhận đúng intent/version tương ứng; timeout/mất ACK thì replay được. |
| **A-R3** | Xác thực mở bán | `prepareTrip` khi tái sử dụng trạng thái `PUBLISHING` hoặc `STOP_SALE` chưa kiểm tra lại xe/tuyến/tài khoản. | Bắt buộc kiểm tra `route.status === 'ACTIVE'`, `car.status === 'ACTIVE'` và tài khoản chủ nhà xe không bị đình chỉ trước mọi lần mở bán hoặc resume. |
| **A-R4** | Audit Trail | `markTripStopSale` hiện ghi nhận `actorId` là `operatorUserId` (chủ xe) dù staff là người thao tác. | Tiếp nhận tham số `actorId` thực tế của staff từ token và ghi đúng vào bảng `transport_audit`. |
| **A-R5** | Thống nhất API | Endpoint legacy `PATCH /trips/:id/status` còn inject integrations dù đã bỏ call downstream. | Thống nhất toàn bộ flow, response, idempotency và audit của route legacy sang cơ chế lifecycle mới. |
| **A-R6** | Nghiệp vụ hoàn thành | Worker hoàn tất chuyến (`pendingCompletions`) có nguy cơ bỏ qua các đơn còn đang đổi/hủy dở. | Chặn đồng bộ COMPLETED với Cart và không cho phép đánh giá (review) nếu đơn hàng còn các amendment, cancellation hoặc exchange chưa đạt trạng thái terminal. |
| **A-R7** | Outbox Email | Job lease trong `transport_notification_outbox` có nguy cơ bị worker khác ghi đè khi hết hạn lease; Message-ID không đảm bảo exactly-once. | Sử dụng optimistic locking trên `lease_version` và `leased_until`; bảo đảm idempotent ack. |
| **A-R8** | Resend API | API resend vé trả `ticketEmailSent=false` khi vừa requeue; lỗi FAILED có nguy cơ bypass buyer scope. | Chuẩn hóa response resend; bảo đảm admin retry và buyer resend tuân thủ chặt chẽ quyền sở hữu của buyer. |
| **A-R9** | Notification Revision | Đổi vé/hoàn tiền có nguy cơ dùng lại `unique(order_id, kind)` làm ghi đè email `TICKET` đang gửi. | Tạo `event_id` / `revision_id` riêng cho từng thông báo thay đổi; thông báo hoàn tiền chỉ enqueue SAU KHI có chứng từ (`refund evidence`). |
| **A-R10** | **TÍNH GIÁ SÀN & BACKFILL CHÍNH XÁC** | Công thức backfill giá sàn sai nếu luôn lấy `min(basePrice, classPrices)` (ví dụ base 200k, tất cả hạng active override 300k thì giá sàn phải là 300k). | **Công thức chuẩn xác:** $\min_{\text{ghế active}} (\text{giá override của hạng ghế nếu có, hoặc basePrice nếu hạng đó không có override})$. Phân biệt rạch ròi: `SeatTemplate.active` (ghế vật lý hoạt động trên xe) KHÔNG phải trạng thái `BLOCKED` (ghế tạm khóa trên chuyến cụ thể). |
| **A-R11** | Lọc Tuyến Catalog | Query `findActiveTransportRouteIds` lấy tất cả listing ACTIVE mà chưa lọc chủ xe bị khóa/mất duyệt. | Bổ sung điều kiện kiểm tra chủ sở hữu còn hiệu lực; thống nhất chính sách đình chỉ với D3 để không bỏ rơi luồng đã thanh toán. |
| **A-R12** | Fallback Catalog | Fallback khi Catalog unavailable có nguy cơ quảng cáo ghế stale. | Xử lý lỗi Feign/HTTP chặt chẽ; fail-closed khi không xác minh được trạng thái offer thay vì âm thầm cho bán. |
| **A-R13** | Thống nhất Snapshot | Search đang map xe/tuyến từ master data live, trong khi detail đọc từ `saleSnapshot`. | Bắt buộc search đọc projection từ snapshot đã công bố của chuyến; khi B3/B4 cho sửa master data, search không được quảng cáo thông tin lệch vé. |
| **A-R14** | Public Projection | `publicDetail` chưa chiếu đủ thông tin thương mại xe/nhà xe từ snapshot. | Bổ sung projection thương mại từ snapshot (tên xe, tiện ích, tên nhà xe); tuyệt đối không lộ `operatorUserId` hay signing token. |
| **A-R15** | Độ chính xác tiền tệ | `class_prices` lưu chuỗi nguyên VND nhưng search dùng Number float. | Chuẩn hóa toàn bộ số tiền VND sang chuỗi nguyên / BigInt / Decimal(18,0); không bao giờ tin amount từ trình duyệt. |
| **A-R16** | Routing & UUID | Route static `GET /trips/search` có nguy cơ bị route dynamic `GET /trips/:tripId` bắt nhầm; thiếu UUID validation. | Đặt `trips/search` đứng trước trong routing table; thêm `ParseUUIDPipe` cho toàn bộ các route động `tripId`, `carId`, `routeId`. |
| **A-R17** | **LỖI NGHIÊM TRỌNG ĐỔI VÉ** | `TransportExchangeService.java` update `COMPLETED`/`REFUND_PENDING` chỉ `WHERE old_order_id=?`, ghi đè mất `REPLACEMENT_CANCELLED`/`EXCEPTION_RESOLVED`. | **Tách rời transaction ngắn + Conditional Update + Worker Retry** (Chi tiết tại Mục 2.1 dưới đây). |
| **A-R18** | Thứ tự khóa | Nguy cơ đảo ngược khóa (Lock Inversion) giữa hủy đơn thông thường và hủy chuyến/đổi vé. | Chuẩn hóa thứ tự khóa cho toàn bộ hệ thống: **Advisory Lock `74100101` -> Sắp xếp khóa 2 Order rows theo UUID (`findByIdForUpdate`) -> Khóa Exchange Case row**. |
| **A-R19** | Hủy chuyến liên dịch vụ | Intent hủy chuyến từ GoCar sang Cart chưa bảo đảm tính nguyên tử hai chiều. | Ghi nhận exception rõ ràng; không tự ý kết luận exchange thành công; giữ quyền hoàn tiền thực tế cho khách nếu cả 2 chuyến bị void. |
| **A-R20** | **TẬN DỤNG POLICY SNAPSHOT ĐANG CÓ** | Assisted exchange đang hardcode điều kiện khởi hành > 6 giờ; không tạo thêm snapshot thứ hai. | **Tận dụng các trường snapshot đã có sẵn trong Order:** `transport_policy_version`, `transport_full_refund_hours`, `transport_partial_refund_hours`, `transport_partial_fee_rate` (tạo từ `CancellationPolicy.snapshot()`). Điều kiện đổi vé dùng `transport_partial_refund_hours` đã đóng băng trên đơn cũ (fallback 6h nếu null). Không sửa ngược policy của đơn đã bán; browser không quyết định phí/tiền. |
| **A-R21** | Tên ràng buộc SQL | Ràng buộc drop constraint trong migration cần kiểm tra khớp với schema thực tế. | Rà soát tên constraint migration trên môi trường DB thực tế, bảo đảm không lỗi cú pháp khi chạy sau này. |

---

### 2.1. Thiết kế Khắc phục Lỗi Đổi vé (A-R17) — Tách Transaction & Phục hồi Đa bước

**Quy trình 4 bước chuẩn hóa:**
```
[Bước 1: Transaction ngắn (Cart DB)]
  - Lấy advisory lock 74100101
  - Khóa Order rows (theo thứ tự UUID tăng dần)
  - Khóa dòng transport_exchange_cases
  - Validate trạng thái: chỉ xử lý nếu status IN ('PROCESSING', 'REFUND_PENDING')
  - Ghi nhận progress / intent
[COMMIT TRANSACTION - Giải phóng DB Lock]
         │
         ▼
[Bước 2: Gọi Downstream ngoài Transaction]
  - Cart gọi GoCar void vé cũ (idempotent qua orderId)
  - Cart gọi Inventory nhả ghế cũ (cancelSold idempotent)
         │
         ▼
[Bước 3: Transaction ngắn ghi nhận kết quả (Cart DB)]
  - Conditional State Transition:
    UPDATE transport_exchange_cases 
    SET status = 'REFUND_PENDING', last_error = NULL, updated_at = NOW() 
    WHERE old_order_id = ? 
      AND status NOT IN ('REPLACEMENT_CANCELLED', 'EXCEPTION_RESOLVED', 'COMPLETED');
[COMMIT TRANSACTION]
         │
         ▼
[Bước 4: Worker nền & Reconcile an toàn]
  - Worker reconcile() quét các case 'PROCESSING' / 'REFUND_PENDING' quá hạn để retry.
  - Khối catch-block của worker ghi nhận last_error TUYỆT ĐỐI KHÔNG ghi đè nếu status hiện tại đã là terminal:
    UPDATE transport_exchange_cases 
    SET last_error = ?, updated_at = NOW() 
    WHERE old_order_id = ? 
      AND status NOT IN ('COMPLETED', 'REPLACEMENT_CANCELLED', 'EXCEPTION_RESOLVED');
```

---

### GIAI ĐOẠN 2: QUẢN TRỊ NHÀ XE TOÀN DIỆN (NHÓM B)

Áp dụng chặt chẽ kiến trúc **Clean Architecture & Domain-Driven Design (DDD)** theo 4 layer:
`presentation` -> `application` (use cases & ports) -> `domain` (entities & repository interfaces) <- `infrastructure` (Prisma repositories & HTTP adapters).

#### B1. Quản lý Xe khách Toàn diện (Vehicle Management)
- **Mô hình Domain:** `Vehicle` (`id`, `operatorId`, `name`, `licensePlate`, `type`: `SLEEPER/LIMOUSINE/SEAT`, `status`: `ACTIVE/MAINTENANCE/INACTIVE`, `totalSeats`).
- **Các API triển khai:**
  - `GET /cars/:carId`: Xem chi tiết xe kèm sơ đồ ghế (Owner-only).
  - `PATCH /cars/:carId`: Sửa tên xe, biển số, loại xe.
    - *Ràng buộc:* Biển số xe duy nhất toàn sàn (`409 Conflict` nếu trùng).
    - *Bảo vệ chuyến đã công bố:* Nếu xe đang được gán vào chuyến ở bất kỳ trạng thái nào trong nhóm `PUBLISHING`, `ON_SALE`, `STOP_SALE`, `DEPARTED`: **nghiêm cấm sửa đổi loại xe, tổng số ghế hoặc nhận diện xe (tên/biển số)**.
  - `PATCH /cars/:carId/status`: Chuyển trạng thái xe (`ACTIVE`, `MAINTENANCE`, `INACTIVE`) kèm lý do `reason`.
    - *Bảo vệ an toàn:* Nếu chuyển sang `MAINTENANCE` hoặc `INACTIVE` mà xe có chuyến tương lai đã mở bán/có vé: trả về `409 Conflict` kèm danh sách chuyến cần xử lý; bắt buộc điều phối dừng bán/đổi chuyến an toàn trước, **tuyệt đối không tự động xóa/void vé**.
- **Cơ chế khóa phối hợp (Coordinated Locking):** Khi tạo/sửa chuyến xe (`Trip`) và khi cập nhật trạng thái xe (`Car`), transaction phải **khóa dòng `Car` trước (`FOR UPDATE`) rồi mới khóa dòng `Trip`**, loại bỏ hoàn toàn race condition khi 2 request chạy đồng thời.
- **Ranh giới Snapshot vs Master:** Chuyến đã mở bán hiển thị tên xe, loại xe, ghế từ `saleSnapshot`. Master car chỉ dùng cho việc xếp lịch các chuyến mới.

#### B2. Danh mục Điểm dừng của Nhà xe (Operator Stops Catalog)
- **Mô hình Database & Migration:** Bảng `operator_stops`: `id` (UUID), `operator_id` (FK `operators`), `name`, `address`, `province`, `active` (boolean), `created_at`, `updated_at`.
- **Các API triển khai:**
  - `POST /operators/me/stops`: Tạo điểm dừng mới.
  - `GET /operators/me/stops`: Danh sách điểm dừng có phân trang, lọc theo tỉnh/thành (`province`), từ khóa (`keyword`), trạng thái `active`.
  - `GET /operators/me/stops/:stopId`: Xem chi tiết.
  - `PATCH /operators/me/stops/:stopId`: Sửa tên, địa chỉ, tỉnh/thành.
  - `POST /operators/me/stops/:stopId/archive`: Đánh dấu ngừng dùng (`active = false`).
- **Quy tắc bảo vệ lịch sử:** Điểm dừng archive không được chọn vào tuyến mới, nhưng các tuyến/chuyến cũ và vé đã bán vẫn giữ nguyên vẹn thông tin nhờ snapshot.

#### B3. Chỉnh sửa Tuyến xe An toàn (Route Editing & Revision)
- **Các API triển khai:** `PATCH /routes/:routeId`: Cập nhật điểm khởi hành, điểm đến và danh sách trạm dừng (`RouteStop` có `order`, `pickupAllowed`, `dropoffAllowed`).
- **Ràng buộc nghiệp vụ:**
  - Validate: Điểm đi khác điểm đến; thứ tự tăng dần; trạm đón trước trạm trả; tất cả trạm thuộc cùng nhà xe.
  - **Quy tắc an toàn V1:** Tuyến xe chỉ được sửa khi **chưa có chuyến nào đã công bố (`saleSnapshot != null`)**. Nếu đã có chuyến công bố, trả về `409 Conflict` yêu cầu tạo tuyến mới (Route Revision) để bảo vệ vé cũ.

#### B4. Quản lý Chuyến xe Nháp (DRAFT Trip Management)
- **Các API triển khai:**
  - `GET /trips/:tripId/manage`: API tra cứu chi tiết chuyến cho Vendor/Staff quản lý (tách biệt với public detail).
  - `PATCH /trips/:tripId/draft`: Chỉnh sửa `carId`, `routeId`, `departureTime`, `arrivalTime`, `priceVnd`.
  - `POST /trips/:tripId/archive-draft`: Hủy chuyến nháp an toàn (`CANCELLED`, không gọi Inventory vì chưa cấp phát ghế).
- **Ràng buộc kỹ thuật:**
  - Chỉ cho phép sửa khi `status = 'DRAFT'` và `saleSnapshot IS NULL`.
  - Khóa hàng và kiểm tra ràng buộc PostgreSQL chống trùng lịch xe chạy: **`trips_car_schedule_no_overlap`** (xử lý lỗi DB trả về `409 Conflict`).
  - Khi đổi xe hoặc tuyến: **không âm thầm xóa cấu hình nháp** mà thông báo rõ ràng trong response những dữ liệu bị reset (bảng giá hạng ghế, danh sách trạm override).
  - Cập nhật lại `searchPriceVnd` và ghi `transport_audit`.

#### B5. Thiết kế Định danh Điểm dừng, API Chuyến & Đóng băng Snapshot (Stop IDs & Snapshot Freeze)
- **Nguyên tắc định danh Stop ID:**
  - `RouteStop.id` tiếp tục là **khóa định danh duy nhất của điểm đón/trả** xuyên suốt hệ sinh thái (`pickupStopId`, `dropoffStopId` trong Quote, OrderItem, IssuedTicket).
  - Bảng ghi đè chuyến `trip_stops`: liên kết bằng composite key `(trip_id, route_stop_id)`, lưu `order`, `scheduled_at`, `pickup_allowed`, `dropoff_allowed`.
- **API `PUT /trips/:tripId/stops` cho chuyến DRAFT:**
  - Tiếp nhận danh sách điểm đón/trả: `[{ routeStopId, order, scheduledAt, pickupAllowed, dropoffAllowed }]`.
  - **Validation nghiêm ngặt:**
    1. Toàn bộ `routeStopId` phải thuộc tuyến xe (`Route`) và nhà xe sở hữu chuyến.
    2. Thứ tự `order` phải duy nhất và tăng dần liên tục.
    3. `scheduledAt` phải tăng dần theo thứ tự trạm và nằm hoàn toàn trong khoảng `departureTime <= scheduledAt <= arrivalTime`.
    4. Phải có ít nhất một trạm `pickupAllowed = true` và ít nhất một trạm `dropoffAllowed = true`, trạm đón nằm trước trạm trả.
- **Đóng băng Snapshot (`saleSnapshot.stops`):**
  - Khi chuyến sang `PUBLISHING`, toàn bộ danh sách điểm dừng được đóng băng vào `saleSnapshot.stops`.
- **Xử lý Tương thích ngược Snapshot cũ (Fallback Rule):**
  - Snapshot cũ thiếu `pickupAllowed`/`dropoffAllowed`: Áp dụng fallback nghiệp vụ:
    * Trạm đầu tiên (`order == minOrder`): `pickupAllowed = true, dropoffAllowed = false`.
    * Trạm cuối cùng (`order == maxOrder`): `pickupAllowed = false, dropoffAllowed = true`.
    * Các trạm trung gian: `pickupAllowed = true, dropoffAllowed = true`.
  - Thiếu `address` hoặc `scheduledAt`: fallback về `null`. Quy tắc này đảm bảo các vé cũ và chuyến cũ vẫn chọn được trạm bình thường mà không bị crash hay từ chối sai lệch.

#### B6. Quản lý & Ma trận Phân quyền Nhân viên (Staff Permission Matrix)
- **Các API triển khai:**
  - `GET /operators/me/staff`: Chủ nhà xe xem toàn bộ danh sách nhân viên và quyền.
  - `GET /operators/staff/me/assignments`: Nhân viên tra cứu quyền active của mình.
  - `GET /operators/staff/me/trips`: Nhân viên xem danh sách các chuyến trong phạm vi được giao.
  - `GET /api/v1/internal/car/staff/read-scope`: Endpoint nội bộ cho Cart tra cứu phạm vi đọc của staff (`allowedTripIds` hoặc `allTrips = true`).
- **Ma trận phân quyền nghiêm ngặt:**
  - Tách bạch quyền đọc (`ORDER_VIEW`, `REPORT_VIEW`, `CASH_VIEW`) khỏi quyền ghi (`SELL_CASH`, `CHECK_IN`, `MANAGE_TRIP`, `CLOSE_SHIFT`).
  - Quyền có hiệu lực live từ DB, không chỉ dựa vào JWT.

---

### GIAI ĐOẠN 3: ĐƠN HÀNG VẬN TẢI & CA TIỀN MẶT PHÍA CART (NHÓM C)

Toàn bộ nghiệp vụ thương mại thuộc sở hữu của `CartandOrder`.

#### C1. Danh sách & Chi tiết Đơn hàng Vận tải cho Nhà xe & Nhân viên
- **Các API triển khai:** `GET /api/v1/orders/transport/vendor` và `GET /api/v1/orders/transport/vendor/{orderId}`.
- **Quy tắc an toàn:**
  - Lọc cứng `orderKind = 'GOCAR_TICKET'`, `hostId = ownerUserId`.
  - Áp dụng phạm vi chuyến của nhân viên (`allowedTripIds`) **trực tiếp vào mệnh đề WHERE trước khi COUNT và phân trang** để không làm rò rỉ dữ liệu hoặc sai lệch tổng số đơn.
  - Mặc định che giấu `transportCheckInToken` (mã QR check-in) trên danh sách và manifest; mã check-in chỉ hiển thị cho chính khách hàng.
  - Hỗ trợ đầy đủ đơn vé tiền mặt cho khách vãng lai (`userId = NULL`).

#### C2. Tra cứu Ca thu tiền mặt & Ma trận Quyền đọc Ca (Cash Shifts & Receipts)
- **Các API triển khai:**
  - `GET /api/v1/orders/transport/cash/shifts/mine`: Thu ngân chỉ xem ca của chính mình.
  - `GET /api/v1/orders/transport/cash/shifts/{shiftId}`: Xem chi tiết ca.
  - `GET /api/v1/orders/transport/cash/shifts/{shiftId}/receipts`: Xem biên nhận trong ca.
  - `GET /api/v1/orders/transport/cash/vendor/shifts`: Quản lý xem các ca thuộc nhà xe.
- **Ràng buộc ma trận quyền tài chính nghiêm ngặt:**
  - **`allTrips = true` chỉ là phạm vi chuyến, KHÔNG đồng nghĩa được xem toàn bộ tài chính!**
  - Điều kiện để xem ca/biên nhận: **Bắt buộc có quyền `CASH_VIEW` (hoặc role Owner) VÀ nằm trong phạm vi operator/trip được phép**.
  - Nhân viên chỉ có quyền `CHECK_IN` (kể cả trên mọi chuyến `allTrips=true`) **tuyệt đối không được xem ca và biên nhận tiền mặt**.
  - Đối với ca chứa vé của nhiều chuyến xe khác nhau: API chi tiết ca bắt buộc **lọc bỏ hoặc ẩn tổng tiền của các chuyến xe nằm ngoài scope của nhân viên**, tránh rò rỉ doanh số của các chuyến khác trong nhà xe.
  - Ca đã đóng và biên nhận `CashReceipt` là bất biến (`immutable`), không cho phép sửa/xóa.

#### C3. Điều phối Sửa thông tin Hành khách / Điểm đón trả (Amendment Coordinator)
Xây dựng đầy đủ cơ chế bảo đảm tính nhất quán hai chiều giữa Cart và GoCar với xác thực payload hash và ticket revision:
1. **Khởi tạo Command tại Cart:**
   - Cart nhận yêu cầu `{orderItemId, passengerName?, pickupStopId?, dropoffStopId?, reason}` kèm `commandId` (UUID) và `expectedRevision`.
   - Tính toán `payloadHash = sha256(normalizedPayload)`. Khóa dòng Order (`FOR UPDATE`).
   - Validate: Order `CONFIRMED`, đúng owner/staff scope, trước deadline chính sách, chuyến chưa hủy/xuất bến, không đổi ghế/giá.
   - Ghi nhận `transport_order_amendments` ở trạng thái `PENDING` lưu `commandId`, `orderItemId`, `expectedRevision`, `payloadHash`.
2. **Gửi Command Proof sang GoCar (Tránh Deadlock HTTP):**
   - Cart tạo internal token / signed command proof và gọi `PUT /api/v1/internal/car/transport/tickets/amend` sang GoCar (payload kèm `commandId`, `orderId`, `orderItemId`, `expectedRevision`, `payloadHash`, nội dung sửa).
   - **GoCar xác thực proof ngay trên payload nhận được trước khi lấy khóa DB**, tuyệt đối không gọi ngược lại Cart qua HTTP khi đang giữ khóa Trip/Ticket (loại bỏ hoàn toàn nguy cơ deadlock cross-service HTTP).
3. **Thứ tự khóa thống nhất & Lưu kết quả Idempotency tại GoCar:**
   - GoCar thực hiện khóa: **Khóa dòng Trip (`FOR UPDATE`) -> Khóa dòng IssuedTicket (`FOR UPDATE`)**.
   - **Kiểm tra Replay & Khớp Payload trước tiên:** GoCar tra cứu bảng `transport_ticket_amendments` theo `command_id`:
     * Nếu cùng `command_id` nhưng khác `ticket_id` hoặc khác `payload_hash`: **Từ chối ngay (409 Conflict / 400 Bad Request)**; tuyệt đối không trả lại kết quả cũ.
     * Nếu cùng `command_id` và khớp `payload_hash`: **Trả lại kết quả đã lưu ngay lập tức**, kể cả khi vé sau đó đã chuyển sang `CHECKED_IN`! Quy tắc này ngăn chặn triệt để lỗi báo FAILED sai khi worker replay sau sự cố mất ACK mạng.
   - **Xử lý Command mới:**
     * Kiểm tra phiên bản vé: Bắt buộc `expectedRevision` khớp với `revision` hiện tại của vé (`IssuedTicket.revision`). Nếu lệch revision, trả về `409 Conflict`.
     * Kiểm tra trạng thái vé: Bắt buộc `status === 'ACTIVE'`. Nếu vé đã `CHECKED_IN`, `NO_SHOW`, `VOID`: từ chối với `409 Conflict`.
     * Đối chiếu trạm mới với `saleSnapshot.stops`.
     * Trong **cùng một transaction**: Cập nhật `IssuedTicket` (tăng `revision = revision + 1`, đổi tên/trạm), lưu kết quả vào `transport_ticket_amendments` (`command_id`, `ticket_id`, `revision`, `payload_hash`, `result`, `applied_at`) và ghi `transport_audit`.
4. **Cập nhật Cart & Phục hồi ACK:**
   - Cart nhận ACK thành công: Cập nhật OrderItem projection theo `revision` mới. **ACK cũ không được phép ghi đè projection của amendment có revision cao hơn**.
   - Chuyển `transport_order_amendments` sang `COMPLETED`, enqueue notification revision mới.
   - Worker nền xử lý mất ACK / retry với các trạng thái đọc được: `PENDING`, `COMPLETED`, `CONFLICT`, `ATTENTION_REQUIRED`.
   - Giữ nguyên QR token vì token được dẫn xuất từ `ticketToken(ticketId, orderItemId)` (không chứa tên khách).

---

### GIAI ĐOẠN 4: HỒ SƠ THƯƠNG MẠI & BÁO CÁO (NHÓM D)

#### D3. Hồ sơ Thương mại & Cơ chế Phân quyền khi Đình chỉ Nhà xe (Commercial Profile & Safe Suspension)
- **Mô hình Database & Migration:** Bảng `operator_profiles`: `operator_id`, `display_name`, `logo_url`, `contact_phone`, `contact_address`, `description`, `operational_status` (`ACTIVE`, `SUSPENDED`).
- **Tách biệt Đình chỉ Vận hành vs Khóa Tài khoản Bảo mật:**
  - **Đình chỉ vận hành (`SUSPENDED` GoCar):** Dừng mở bán các chuyến mới, ẩn offer khỏi Catalog, **nhưng nhân viên và khách hàng vẫn được phép check-in lên xe và xử lý hoàn tiền cho các chuyến đã bán vé thành công**.
  - **Sửa đổi logic trong `StaffService`:** Tách biệt kiểm tra tài khoản Identity với kiểm tra trạng thái vận hành của nhà xe. Khi nhà xe bị đình chỉ vận hành, staff vẫn được phép thực hiện `CHECK_IN` và hỗ trợ khách hàng cho các vé cũ.
  - **Khóa tài khoản bảo mật (`Identity account locked`):** Toàn bộ quyền của chủ nhà xe và staff bị chặn; khi đó hệ thống mở luồng Fallback cho Quản trị viên (Admin / Platform Support) tiếp quản xử lý hoàn tiền và hỗ trợ hành khách.
- **Dừng bán bền vững:** Lệnh đình chỉ nhà xe kích hoạt dừng bán (`STOP_SALE`) và ẩn listing với cơ chế outbox retry bền vững nếu Catalog tạm gián đoạn.

#### D4. Báo cáo Vận tải với Hợp đồng Tiền Online GoPay (Transport Operations Reports)
- **Ánh xạ từ Schema thực tế của Payment (Không giả định tên bảng):**
  - Nguồn dữ liệu thanh toán online được ánh xạ từ các entity/bảng thực tế của `PaymentandWallet`:
    * Bảng `payment_requests` / `payment_transactions` / `vnpay_payment_attempts` (cho các giao dịch thanh toán online đã được provider xác nhận).
    * Bảng `transport_manual_refunds` (chứng từ hoàn tiền ngân hàng thực tế: `amount`, `reference`, `evidence_url`, `recorded_at`).
    * Bảng `transport_cash_settlements` và `transport_cash_refund_adjustments` (quyết toán tiền mặt).
- **Hợp đồng Báo cáo Nội bộ:**
  - Cart **tuyệt đối không truy vấn trực tiếp DB của Payment**.
  - Gọi qua Feign client nội bộ: `GET /api/v1/internal/payments/transport/report?operatorUserId=...&from=...&to=...`.
- **Phân tách rạch ròi 4 mốc thời gian để tránh đếm trùng:**
  1. Ngày tạo đơn hàng (`order.created_at`).
  2. Ngày thanh toán thực tế thành công (`payment.paid_at`).
  3. Ngày hoàn tiền thực tế (`refund.recorded_at`).
  4. Ngày xe khởi hành (`trip.departure_time`).
- **Các chỉ số tài chính độc lập:**
  - `booked_amount`: Tổng giá trị vé được đặt thành công.
  - `online_collected`: Tiền online thực nhận xác nhận từ GoPay.
  - `cash_collected`: Tiền mặt thực thu ghi nhận từ biên nhận ca `CashReceipt`.
  - `refunds_pending`: Tiền hoàn đang chờ xử lý.
  - `refunds_evidenced`: Tiền hoàn đã có chứng từ ngân hàng/phiếu chi.
  - `net_collections`: Số tiền thực thu ròng còn lại (`(online_collected + cash_collected) - refunds_evidenced`).
  - Hiển thị cờ `stale / asOf` nếu dữ liệu từ GoPay chưa đồng bộ xong.

---

### GIAI ĐOẠN 5: TỔNG HỢP MIGRATIONS ĐẦY ĐỦ, TÀI LIỆU & BÀN GIAO (NHÓM E)

#### E1. Danh mục Toàn bộ Migrations Additive (Không dùng prisma db push)
1. **Migrations tại GoCar (`car`):**
   - Bảng `operator_stops`: Danh mục bến bãi của nhà xe.
   - Bảng `trip_stops`: Override trạm theo chuyến kèm scheduled time, pickup/dropoff allowed.
   - Bảng `operator_profiles`: Hồ sơ thương mại tách biệt KYC Identity.
   - Thêm cột `revision` (integer, default 1) trong bảng `issued_tickets`.
   - Bảng `transport_ticket_amendments`: Lưu vết `command_id`, `ticket_id`, `revision`, `payload_hash`, `result`, `applied_at` phục vụ idempotency và replay của amendment.
   - Mở rộng cột phân quyền đọc cho staff trong bảng `operator_staff` (quyền đọc tài chính `can_view_cash`, quyền đọc đơn `can_view_orders`).
2. **Migrations tại Inventory (`BookingandInventory`):**
   - Thêm cột `sync_version` (integer, default 0) trong bảng `transport_trip_inventory` để lưu version trạng thái bán đã áp dụng cho từng chuyến, hỗ trợ atomic compare-and-set và chống request cũ đến muộn.
3. **Migrations tại Cart (`CartandOrder`):**
   - Bảng `transport_order_amendments`: Quản lý yêu cầu command sửa tên/trạm đón trả (lưu `command_id`, `order_item_id`, `expected_revision`, `payload_hash`, `status`, `error_reason`).
   - Bổ sung cột `lease_version` (integer, default 0) trong `transport_notification_outbox` phục vụ optimistic locking.
   - Bổ sung cột `event_id` / `revision_id` trong outbox để tránh ghi đè email revision mới.
   - Thêm trường `transport_exchange_hours` (hoặc cấu hình dùng `transport_partial_refund_hours` từ snapshot hiện tại) thay vì hardcode 6 giờ.
4. **Migrations tại Payment (`PaymentandWallet`):**
   - Rà soát khớp nối với các bảng đã có: `transport_manual_refunds`, `transport_cash_settlements`, `transport_cash_refund_adjustments`.
5. **Cập nhật tài liệu:** `BACKEND_OPERATIONS.md` và `README.md`.

#### E2. Rà soát Mã nguồn & Dependency Injection
- Đăng ký đầy đủ các module NestJS và Spring Beans.
- Cập nhật tiến độ từng mục trong `BACKEND_COMPLETION_PLAN.md`.

---

## 3. MỐC MỞ RỘNG C4–C6 (ĐỔI GHẾ / HOÀN TỪNG PHẦN / SỔ CÁI GOPAY)

Tuân thủ nghiêm ngặt quy định của plan gốc: **Không tự ý thu hẹp mục tiêu và không tuyên bố backend hoàn thiện toàn bộ khi chưa hoàn thành C4–C6**.

Checklist phần mã nguồn đã được thực hiện; các tiêu chí dưới vẫn cần kiểm chứng E3–E5:
- [x] **C4. (Đã có source, chưa kiểm chứng)** Đổi ghế/chuyến với tiền chênh lệch được chứng minh**: Cần thiết kế giữ chỗ thay thế song song (`HELD`) và giải phóng ghế cũ (`cancelSold`) qua Inventory có idempotency; không đổi trực tiếp seatId trên bảng vé.
- [x] **C5. (Đã có source, chưa kiểm chứng)** Hủy/đổi một phần vé trong đơn nhiều ghế**: Cần cơ chế hoàn tiền và quản lý trạng thái theo từng `OrderItem`, không hoàn 2 lần, không hủy toàn bộ đơn khi chỉ hoàn 1 vé.
- [x] **C6. (Đã có source, chưa kiểm chứng)** Sổ cái chênh lệch đổi vé trong GoPay**: Cần sổ cái ghi nhận chuyển giao tín dụng (`transfer credit / net charge / refund`) bất biến trong Payment.

*Trong thời gian triển khai B, C1–C3, D: Cơ chế Assisted Full-Order Exchange hiện tại tiếp tục phục vụ vận hành V1 cho đến khi bước vào mốc C4–C6.*

---

## 4. KẾT LUẬN & ĐÁNH GIÁ MỨC ĐỘ HOÀN THIỆN

Kế hoạch trên đã xác định hướng triển khai rõ ràng cho toàn bộ hệ sinh thái backend GoCar. Khả năng chạy đúng và tương thích an toàn với GoTravel sẽ được theo dõi, đánh giá qua từng file/mục cụ thể, và phụ thuộc vào kết quả compile, kiểm thử cô lập và kiểm chứng migration ở giai đoạn kiểm thử sau theo quy định của chủ dự án.

**Source đã triển khai, chưa xác nhận backend sẵn sàng chạy. Bước tiếp theo là các gate kiểm chứng trong kế hoạch chính, khi chủ dự án yêu cầu test/deploy.**
