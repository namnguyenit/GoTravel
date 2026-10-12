# GoCar — kế hoạch hoàn thiện sau đối chiếu GoTicket

Ngày bắt đầu: 2026-10-11. Nguồn tham khảo: `/home/trungcao/GoTicket-reference`, commit `1e0c123`.

## Trạng thái hiện tại — đọc trước các ghi chú lịch sử

Cập nhật 11/10/2026 sau đợt sửa toàn hệ sinh thái. **A/B/C1–C6/D và F1–F7 đã có triển khai mã nguồn, migration, wiring và hợp đồng hai đầu.** `[x]` chỉ là hoàn thành phần source; chưa chứng minh chạy đúng. Không coi các kết quả kiểm thử cũ là bằng chứng cho thay đổi này.

**Còn để sau:** A-R21 kiểm chứng constraint trên DB riêng và E3–E5 (generate/compile, kiểm thử cô lập/GoTravel regression, cấu hình credential và migration/release). GoCar 3333/3334 tiếp tục tắt; không sửa frontend, không chạy build/test/provider, không migrate live, không commit/push.

Bàn giao chi tiết mã nguồn mới, state machine, money contracts và bước tiếp tục nằm ở **mục 21** cuối tài liệu. API/runbook trong [BACKEND_OPERATIONS.md](BACKEND_OPERATIONS.md). Phần hướng dẫn thiết kế 4–14 giữ để giải thích lý do nghiệp vụ; trạng thái hiện tại lấy từ checklist và mục 21, không từ các câu mô tả thời điểm trước triển khai.

## Phạm vi sửa code — đọc ngay nếu không có lịch sử chat

**Đây là kế hoạch cho backend của toàn hệ sinh thái GoCar, không phải chỉ sửa thư mục `car`.** File plan nằm trong `car` để theo dõi công việc; vị trí file không giới hạn phạm vi triển khai.

- Bắt đầu từ root `/home/DoANLienNganh`. Nếu IDE/cwd đang là `/home/DoANLienNganh/car`, chuyển lên root để đọc và sửa các service ngang cấp.
- Được triển khai source backend ở những service cần cho từng mục bên dưới, bao gồm migration và internal contracts. Không cần hỏi lại chỉ vì file nằm ngoài `car`.
- Mỗi mục cross-service chỉ được tích khi cả bên gọi, bên nhận, authorization, schema và worker/consumer liên quan đều đã có source. Chỉ thêm client/DTO trong GoCar chưa phải hoàn thành nghiệp vụ.
- Quyền sửa source này không bao gồm tự migrate database live, mở dịch vụ hoặc gọi ngân hàng/email. Các giới hạn code trước/test sau vẫn giữ như phần Quy ước.

| Mục | Thư mục bắt buộc đọc/sửa khi triển khai | Trách nhiệm cần nối |
|---|---|---|
| A1–A3 | `car`; kiểm hợp đồng `BookingandInventory` | Lifecycle/sale intent/worker GoCar gọi Inventory; chỉ sửa Inventory nếu contract cần thay đổi |
| A4 | `CartandOrder`, `cloudinary-service` khi mail contract đổi | Resend/outbox/QR transport; không làm email coordinator riêng trong GoCar |
| A5, D1–D2 | `car`, `CatalogandListing` | Public detail/search/quote + offer moderation/active routes |
| A6 | `CartandOrder`; đọc cancellation/ticket contract trong `car` | Exchange exception/refund/cancellation coordinator |
| B1–B5 | Chủ yếu `car`; `CartandOrder`/`cloudinary-service` nếu stop/ticket/mail DTO đổi | Quản trị xe/tuyến/chuyến/stops và snapshot tới các consumer |
| B6 | `car`; `CartandOrder` khi bổ sung read-scope client | Staff assignments/permissions và internal authorization |
| C1–C2 | `CartandOrder`, `car` | Vendor orders/cash shift reads; GoCar cung cấp scope, Cart truy vấn dữ liệu thương mại |
| C3 | `CartandOrder`, `car`; `cloudinary-service` nếu cần notification revision | Amendment coordinator + ticket apply/audit + mail sau ack |
| C4–C5 | `BookingandInventory`, `CartandOrder`, `car`, `PaymentandWallet`; mail consumer nếu contract đổi | Replacement reservations, item ticket/refund state, money allocation; phải hoàn thành cả chuỗi |
| C6 | `PaymentandWallet`, `CartandOrder`, `BookingandInventory`, `car` | Exchange credit/net payment/refund ledger + inventory/ticket coordinator |
| D3 | `car`, `CatalogandListing`; `Identity` chỉ khi contract account/KYC thực sự cần mở rộng | Commercial profile/suspension; tái dùng Identity, không viết auth mới |
| D4 | `CartandOrder`, `PaymentandWallet` nếu cần report funds contract, `car` cho scope/operator | Báo cáo transport, số tiền thực thu và quyền đọc |
| E1–E2 | Tất cả service đã đổi + tài liệu trong `car` | Danh sách migration/API/DI/internal credentials và source review |

Gateway chỉ cần sửa nếu cấu hình hiện tại chưa route được các endpoint mới; đọc cấu hình trước, không tự đổi auth chung hoặc mở đường internal ra public. Frontend ở mọi thư mục đều nằm ngoài đợt backend này.

## Quy ước và giới hạn

- `[x]` = đã có triển khai source, mới đọc sơ bộ; **không có nghĩa build/test đã đạt**.
- `[ ]` = chưa hoàn thành. Khi tiếp tục, đọc phần Bàn giao cuối tài liệu rồi làm mục chưa tích theo thứ tự.
- Chỉ backend: GoCar frontend/backend tiếp tục tắt, không migrate database đang phục vụ GoTravel, không gọi provider/email, không chạy test/build trong đợt này theo yêu cầu chủ dự án.
- Giữ thay đổi đã có trong working tree. Không commit/push khi chưa được yêu cầu.
- Inventory duy nhất quản lý ghế; Cart quản lý đơn; GoPay quản lý tiền; Identity quản lý tài khoản/KYC. Không mở quyền HOST cho TICKET_VENDOR.
- Xe khách, ghế chiếm cả chuyến, hold 15 phút. Không sao chép cơ chế xác nhận chưa thanh toán/xóa dữ liệu lịch sử của GoTicket.

## A. Sửa luồng hiện có — ưu tiên cao nhất

- [x] A1. Lifecycle: xác thực chuyển trạng thái trước khi tác động Inventory; không làm ngừng bán khi yêu cầu không hợp lệ.
- [x] A2. Stop-sale: cập nhật có khóa/điều kiện, không ghi đè DEPARTED/COMPLETED/CANCELLED; resume-sale kiểm tra hủy chuyến, thời hạn và moderation.
- [x] A3. Có cơ chế đồng bộ lại trạng thái bán Inventory khi lỗi hoặc tiến trình ngắt, xử lý race publish/stop/lifecycle.
- [x] A4. Email gửi lại vé GoCar dùng outbox transport/QR đúng origin, tránh mẫu GoTravel; giới hạn gửi lại và không requeue job đang gửi.
- [x] A5. Tìm kiếm/chi tiết/quote đối chiếu Catalog ACTIVE, thống nhất hiển thị giá theo hạng ghế, fail closed khi không xác minh được.
- [x] A6. Đổi vé gặp hủy chuyến thay thế: case có trạng thái ngoại lệ bền vững, giải phóng khóa hỗ trợ hủy/refund đúng; không tự tạo chứng cứ hoàn tiền.

## B. Quản trị nhà xe — cấu trúc theo module/layer

- [x] B1. Xe: chi tiết, sửa tên/biển số/loại, chuyển ACTIVE/MAINTENANCE/INACTIVE; khóa xe khi sửa, không sửa nhận diện chuyến đã công bố; không xóa lịch sử. (Đã viết source, chưa kiểm thử)
  - Files: `car/src/car/application/usecase/get-car-detail.usecase.ts`, `UpdateCarUseCase.ts`, `UpdateCarStatusUseCase.ts`, `car/src/car/presentation/controllers/CarController.ts`, `CarDto.ts`, `CarMapper.ts`, `car.module.ts`.
  - APIs: `GET /cars/:id`, `PATCH /cars/:id`, `PATCH /cars/:id/status`.
  - Rules: `SELECT ... FOR UPDATE` tránh race update; chặn sửa loại xe/biển số khi có chuyến PUBLISHED/IN_PROGRESS; cấm xóa xe đã có lịch sử.
- [x] B2. Điểm dừng: danh mục của nhà xe có địa chỉ/tỉnh/thành, tạo/list/detail/update/archive; điểm dùng trong tuyến/chuyến giữ snapshot lịch sử. (Đã viết source, chưa kiểm thử)
  - Files: `car/src/stop/domain/entity/operator-stop.entity.ts`, `car/src/stop/domain/repositories/IOperatorStopRepository.ts`, `car/src/stop/infrastructure/repositories/PrismaOperatorStopRepository.ts`, `car/src/stop/application/services/OperatorStopService.ts`, `car/src/stop/presentation/controllers/OperatorStopController.ts`, `stop.module.ts`.
  - Migration: `car/prisma/migrations/20261011050000_operator_stops/migration.sql`.
  - APIs: `POST/GET /operators/me/stops`, `GET/PATCH/DELETE /operators/me/stops/:id`.
  - Rules: Điểm dừng thuộc nhà xe; archive mềm `isActive=false`, giữ nguyên dữ liệu snapshot trong tuyến/chuyến cũ.
- [x] B3. Tuyến: sửa tuyến nháp/danh sách điểm đón trả có kiểm tra quyền và thứ tự; không sửa tuyến đã đóng snapshot mà làm đổi vé cũ. (Đã viết source, chưa kiểm thử)
  - Files: `car/src/route/application/usecase/update-route.usecase.ts`, `car/src/route/presentation/controllers/RouteController.ts`.
  - APIs: `PATCH /routes/:id`.
  - Rules: Chỉ cho phép sửa khi chưa có chuyến ACTIVE/PUBLISHED phụ thuộc hoặc chỉ cập nhật tên/mô tả; validate điểm dừng tồn tại và thứ tự strictly increasing.
- [x] B4. Chuyến DRAFT: detail/update/archive với xe/tuyến/thời gian/giá; giữ ràng buộc chống trùng lịch database; không cho sửa sau PUBLISHING. (Đã viết source, chưa kiểm thử)
  - Files: `car/src/trip/application/usecase/update-draft-trip.usecase.ts`, `GetManageTripDetailUseCase.ts`, `car/src/trip/presentation/controllers/TripController.ts`, `schema.prisma` (`stopOverrides`).
  - APIs: `GET /trips/:id/manage`, `PATCH /trips/:id/draft`.
  - Rules: Yêu cầu quyền MANAGE_TRIP, chỉ sửa khi status=DRAFT, kiểm tra trùng lịch xe (`btree_gist` constraint), reset classPrices khi đổi xe khác sơ đồ ghế.
- [x] B5. Điểm đón trả theo chuyến: scheduled time, pickup/dropoff/both, snapshot khi publish; checkout/check-in dùng snapshot đã công bố. (Đã viết source, chưa kiểm thử)
  - Files: `car/src/trip/application/usecase/set-trip-stops.usecase.ts`, `set-trip-stops.dto.ts`, `set-trip-stops.usecase.interface.ts`, `TripController.ts`, `transport.service.ts` (`quote`), `prisma-transport.repository.ts` (`toSnapshot`).
  - APIs: `PUT /trips/:id/stops`.
  - Rules: Chỉ sửa ở DRAFT; validate route stop IDs, thứ tự và thời gian đón/trả strictly increasing nằm trong [departure, arrival]; quote kiểm tra `pickupAllowed` & `dropoffAllowed`; snapshot giữ cố định tại thời điểm publish.
- [x] B6. Staff: đọc danh sách/quyền của nhà xe, nhân viên xem quyền và chuyến được phân công; không lộ QR và dữ liệu ngoài phạm vi. (Đã viết source, chưa kiểm thử)
  - Files: `car/src/staff/StaffController.ts`, `StaffMeController.ts`, `StaffInternalController.ts`, `CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/GoCarClient.java`.
  - APIs: `GET /operators/me/staff`, `GET /staff/me/assignments`, `GET /staff/me/trips`, `GET /api/v1/internal/car/staff/read-scope`.
  - Rules: Trả `{ ownerUserId, operatorId, allowedCapabilities, allowedTripIds, allTrips }`; staff không thể truy cập tài chính nếu thiếu `CASH_VIEW`; không trả QR token trong danh sách phân công.

## C. Đơn và vận hành Cart

- [x] C1. Vendor/staff list/detail đơn transport, lọc trip/status/method/search/date; scope owner hoặc trip được phân công, bao gồm khách tiền mặt không tài khoản; che boarding token khi không cần. (Đã viết source, chưa kiểm thử)
  - Files: `CartandOrder/.../OrderRepository.java` (`findTransportOrdersAllTrips`, `findTransportOrdersByTripIds`), `TransportOrderService.java` (`listVendorOrders`, `getVendorOrderDetail`), `TransportOrderController.java`.
  - APIs: `GET /api/v1/orders/transport/vendor`, `GET /api/v1/orders/transport/vendor/{orderId}`.
  - Rules: Kiểm tra `readScope`; `orderKind='GOCAR_TICKET'`; nhân viên chỉ xem chuyến được gán nếu `!allTrips`; luôn che `transportCheckInToken = null` trên các API vendor để chống lộ token lên xe.
- [x] C2. Tra cứu ca thu tiền/biên nhận: mine/list/detail có scope cashier/manager, không sửa receipt đã ghi. (Đã viết source, chưa kiểm thử)
  - Files: `CartandOrder/.../CashLedger.java`, `JdbcCashLedger.java`, `CashService.java`, `CashController.java`.
  - APIs: `GET /shifts/me`, `GET /shifts`, `GET /shifts/{shiftId}`.
  - Rules: `allTrips=true` KHÔNG cấp quyền xem tài chính nhà xe; chỉ vendor owner hoặc staff có năng lực `CASH_VIEW` (thuộc ca/đóng ca) mới được xem danh sách ca và biên nhận thu chi; receipt là append-only bất biến.
- [x] C3. Sửa điểm đón/trả và tên hành khách trước deadline/check-in: bản ghi yêu cầu bền vững + worker, kiểm tra snapshot, Cart/GoCar đồng bộ và audit; không cho browser sửa giá. (Đã viết source, chưa kiểm thử)
  - Files: `car/prisma/schema.prisma` (`TransportTicketAmendment`, `IssuedTicket.revision`), `PrismaTransportRepository.ts` (`amendTicket`), `TransportInternalController.ts`, `GoCarClient.java`, `CartandOrder/.../TransportAmendmentService.java`, `TransportOrderController.java`.
  - Migration: `car/prisma/migrations/20261011110000_ticket_amendments/migration.sql`, `CartandOrder/scripts/2026101106_transport_order_amendments.sql`.
  - APIs: `POST /api/v1/orders/transport/{orderId}/items/{itemId}/amend`, `GET /vendor/amendments/attention`, internal `POST /tickets/amend`.
  - Rules: Idempotency bằng canonical payload hash (`orderId:itemId:ticketId:name:pickup:dropoff`); replay cùng hash trả kết quả lưu trước; mismatch hash trả 409 Conflict; kiểm tra `expectedRevision` dưới khóa dòng; tăng revision; cấm đổi ghế hoặc thay đổi giá tiền; worker tự động quét và retry trạng thái PENDING.
- [x] C4. Đổi ghế/chuyến cùng nhà xe: giữ replacement song song, quote tin cậy, thu đúng chênh lệch, chuyển cùng ticket sang revision/generation mới, nhả ghế cũ sau ACK. Source Inventory/Cart/GoCar/GoPay đã nối; xem mục 21.
- [x] C5. Hủy/đổi riêng item trong đơn nhiều ghế: item state, money allocation, actual refund proof, aggregate/recovery và email theo item. Source đã nối; chưa kiểm thử.
- [x] C6. GoPay ledger bất biến: credit nguồn gốc, delta ONLINE/CASH, phí/hoàn, late payment liability và net settlement có chứng cứ. Không đánh dấu tiền đã hoàn khi chỉ có refundDue; chưa kiểm thử.

## D. API khách, thương hiệu, báo cáo

- [x] D1. Public trip detail/stops dùng snapshot + trạng thái bán + Catalog, không lộ thông tin nội bộ. (Đã viết source, chưa kiểm thử)
- [x] D2. Search giờ đi sáng/chiều/tối và khoảng giờ theo Asia/Ho_Chi_Minh; khoảng qua nửa đêm; min/max validation; giá lọc phù hợp giá bán. (Đã viết source, chưa kiểm thử)
- [x] D3. Operator profile public/vendor/admin, logo/contact; hồ sơ thương mại tách KYC Identity, đổi tên đồng bộ an toàn; đình chỉ nhà xe không xóa vé/đơn cũ. (Đã viết source, chưa kiểm thử)
  - Files: `car/prisma/schema.prisma` (`status`, `displayName`, `logoUrl`, `contactPhone`, `contactAddress`, `description`), `OperatorProfileService.ts`, `OperatorController.ts`, `OperatorModule.ts`.
  - Migration: `car/prisma/migrations/20261011120000_operator_commercial_profile/migration.sql`.
  - APIs: `GET /operators/:operatorId/profile`, `GET /operators/me/profile`, `PATCH /operators/me/profile`, `PATCH /operators/:operatorId/status`.
  - Rules: Tách bạch hồ sơ thương mại khỏi KYC pháp nhân của Identity; khi admin đình chỉ (`SUSPENDED`), chuyển các chuyến đang bán sang `STOP_SALE` (kèm tăng sync_version) để loại khỏi tìm kiếm, nhưng giữ nguyên vé đã bán và các quy trình check-in/hoàn tiền.
- [x] D4. Báo cáo nhà xe có scope, doanh số/tiền thu/refund/cash/discrepancy; admin tổng quan transport/xếp hạng/ngày tuần tháng. Không gọi booked_amount là tiền thực thu. (Đã viết source, chưa kiểm thử)
  - Files: `CartandOrder/.../TransportOperationsReportService.java`, `TransportAdminController.java`, `TransportOrderController.java`, `PaymentClient.java`, `PaymentandWallet/.../InternalPaymentController.java`.
  - APIs: `GET /api/v1/orders/transport/vendor/reports`, `GET /api/v1/orders/transport/admin/reports/overview`, internal `GET /api/v1/internal/payments/transport/cash-summary`.
  - Rules: Phân tách rõ ràng giữa tiền đặt chỗ (`booked_amount`), tiền mặt thực thu (`transport_cash_receipts`), hoàn tiền đã xác nhận (`refundsConfirmed`), hoàn tiền đang chờ (`refund_due`); lọc phạm vi theo `tripIds` nếu staff không có `allTrips`; tích hợp tóm tắt thanh quyết toán tiền mặt từ GoPay dưới dạng dữ liệu tham chiếu bất biến.

## E. Tài liệu và kiểm chứng sau

- [x] E1. Migration additive, thứ tự và hướng dẫn backfill; cập nhật BACKEND_OPERATIONS và README với API thực tế. (Đã tổng hợp toàn bộ script migration qua các service).
- [x] E2. Đọc rà soát contract/DI/security/source, đánh dấu từng mục đã triển khai kèm file. (Đã cập nhật chi tiết checklist và kiến trúc).
- [ ] E3. **Để sau:** generate Prisma/compile và sửa fixture bị đổi contract.
- [ ] E4. **Để sau:** test scope user/vendor/staff/admin, race, fault recovery, holds/refunds/exchange và GoTravel regression trên DB riêng đã migrate.
- [ ] E5. **Để sau:** cấu hình credential scoped + migrate có backup + E2E các service; chỉ mở GoCar sau khi các gate đạt.

## Tóm tắt bàn giao / tiếp tục

- Trạng thái sau audit: đã sửa lỗi phát hiện và bổ sung source C4–C6; tiến độ chính xác ở mục 20–21. Chưa compile/test/migrate.
- C4–C6 đã có source item operations. Assisted Full-Order Exchange được giữ tương thích, có guard không chạy đồng thời với item operations.
- Chưa compile/test/migrate live; ports 3333/3334 tiếp tục tắt; không commit/push.


# Hướng dẫn triển khai chi tiết cho model tiếp theo

## 1. Đọc mục này trước khi làm bất kỳ thay đổi nào

### 1.1. Mục tiêu của chủ dự án

Remake **backend GoCar** theo nghiệp vụ xe khách của GoTicket, tận dụng Catalog/Inventory/Cart/GoPay/Identity/Gateway của hệ sinh thái. Phải hoàn thành cả luồng khách, nhà xe, nhân viên và admin; không chỉ booking phía khách. Chủ dự án đã cho phép sửa backend và tự quyết các lựa chọn triển khai thông thường. Họ muốn làm code trước, test sau, tránh chạy test gây thông báo/email tới người khác. Đợt hiện tại đã sửa source toàn hệ sinh thái; các giới hạn runtime và kiểm chứng vẫn giữ.

Không coi frontend là dependency để hoàn thành backend. Không triển khai React, portal thanh toán, ảnh, animation hay auth frontend trong phạm vi này.

### 1.2. Vị trí và trạng thái công việc

| Nội dung | Trạng thái / vị trí |
|---|---|
| Checkout chính | `/home/DoANLienNganh`; thư mục GoCar `/home/DoANLienNganh/car` |
| Branch tại lúc bàn giao | `devserver` |
| Hai commit gần nhất | `cbcd344` và `6869cf5`; **không phải toàn bộ code mới nhất** |
| Working tree | Có nhiều file modified và untracked từ đợt trước + nhóm A/D1/D2 đợt này; chưa commit/push |
| Reference | `/home/trungcao/GoTicket-reference`, commit `1e0c123` |
| GoCar runtime | Trước đợt sửa, ports 3333/3334 không lắng nghe; không khởi động lại trong các đợt sửa này |
| Database live | Chưa áp dụng migration mới; không tự áp dụng khi tiếp tục |
| Kiểm chứng code mới | Chưa generate Prisma, compile, chạy test hay E2E |
| Nhóm B | B1–B6 đã có source/module/migration; chưa compile/test |
| Nhóm C/D3/D4 | C1–C6/D3/D4 đã có source, bao gồm item operations và money ledger; xem mục 21 |

Lệnh đọc trạng thái ban đầu, không chạy ứng dụng:

```bash
cd /home/DoANLienNganh
git -c safe.directory=/home/DoANLienNganh status --short
git -c safe.directory=/home/DoANLienNganh diff --stat
ss -ltnp 'sport = :3333 or sport = :3334'
```

`git diff --stat` không hiện nội dung file untracked: phải đọc cả `git status --short`. Không reset/clean/checkout đè các thay đổi có sẵn. Không in `.env`, token, process arguments chứa secrets. `rg` không có trong môi trường lúc trước, dùng `grep`/`find` nếu vẫn thiếu.

### 1.3. Các tài liệu và file cần đọc

1. Tài liệu này: tiến độ và bước tiếp tục.
2. `car/BACKEND_REMAKE_PLAN.md`: quyết định và kiến trúc ban đầu.
3. `car/BACKEND_OPERATIONS.md`: contracts vận hành đã có trước nhóm A mới; **chưa cập nhật đầy đủ đợt này**.
4. `car/README.md`: mô tả service/migration cũ; danh sách migration đang dừng ở 11 mục, chưa thêm 2 migration cuối.
5. `car/.skill/clean-architecture_and_DDD-module-skill.md`: kiến trúc local đã được đọc và áp dụng. Thông báo dùng skill nếu session mới yêu cầu.
6. `car/prisma/schema.prisma`, module wiring `car/src/app.module.ts`, `car/src/transport/transport.module.ts`.
7. Reference routes: `GoTicket-reference/back-end/routes/api.php`; kiểm chứng controller → service → repository, không lấy API_SPEC/UI làm bằng chứng đủ nghiệp vụ.

Kiến trúc: presentation → application port/use case → domain repository contract ← infrastructure. Controller không inject Prisma/Jdbc trực tiếp. Domain không import Nest/Prisma/Spring. Trong Java module cũ có dùng service/Jdbc theo convention có sẵn; phần mới lớn nên tách presentation/application/domain/infrastructure. Application không import presentation DTO hoặc concrete infrastructure.

## 2. Ranh giới dữ liệu bắt buộc giữ

| Service | Là chủ dữ liệu | Cần tận dụng khi làm tiếp |
|---|---|---|
| `car` NestJS/Prisma | Nhà xe vận hành, xe, tuyến, chuyến, sơ đồ ghế mẫu, quyền staff, issued ticket/check-in | B1–B6, trip detail, amendments ticket, profile thương mại |
| `CatalogandListing` Spring | Offer tuyến category TRANSPORT, nội dung/ảnh và moderation | Không tạo catalog riêng ở GoCar; listingId được quote/Cart kiểm tra |
| `BookingandInventory` Spring | Seat AVAILABLE/HELD/SOLD/BLOCKED, hold/confirm/release | Mọi đổi ghế/nhả ghế phải qua Inventory; không lấy bảng legacy Ticket làm số ghế |
| `CartandOrder` Spring | Commercial order/items, policy snapshot, cash ledger, refund/exchange coordinator, notification outbox | C1–C6, báo cáo bán hàng và thu tiền |
| `PaymentandWallet` GoPay | Tiền online, xác minh provider, settlement, bằng chứng hoàn tiền | Browser không gửi amount được tin cậy; không fake bank refund |
| `Identity` GoID | Account, roles, live account status, KYC và duyệt TICKET_VENDOR | Không tạo user/auth riêng, không sửa KYC từ GoCar |
| `cloudinary-service` | Media ownership và email transport/QR | TICKET_VENDOR uploads scope `transport/<userId>`; chỉ Cart gửi transport mail |
| Gateway | Routing/auth forwarding | Frontend API sau này đi Gateway; service-to-service đường internal giữ credential riêng |

Các ID phải phân biệt: `operatorId` là ID nhà xe trong GoCar; `operatorUserId` là tài khoản chủ nhà xe trong Identity, đang lưu ở hostId của order/listing transport. Không lấy operatorId làm userId hoặc hostId.

Legacy `car.Ticket` và enum BOOKED/PAID/CANCELLED vẫn còn; luồng mới dùng `IssuedTicket` + Cart/Inventory. Không thêm nghiệp vụ mới dựa trên bảng legacy, cũng không xóa bảng đang có FK khi chưa có kế hoạch migration.

## 3. Nghiệp vụ nền đã có trước đợt này

Đọc source thay vì dựng lại các phần sau:

- Publish DRAFT → PUBLISHING → ON_SALE, moderation Catalog, seat initialization Inventory, freeze `saleSnapshot`; background retry publication.
- Quote server: `quoteId`, `quoteVersion`, `quoteHash` SHA-256, expiry 2 phút; claim chỉ một order, không đồng nghĩa hold 2 phút.
- Hold Inventory 15 phút; cutoff checkout 15 phút trước departure; một ghế chiếm cả chuyến, chưa inventory theo từng chặng.
- ONLINE checkout Cart → GoPay → verified payment → SOLD Inventory → ticket issuance có signed boarding token.
- CASH: logged-in staff có SELL_CASH, open shift, exact amount receipt, durable reconciliation nếu thu tiền xong downstream lỗi; khách tiền mặt có thể không có userId.
- Manifest, CHECK_IN, NO_SHOW; mặc định cutoff no-show departure +120 phút, configurable `GOCAR_NO_SHOW_MINUTES`.
- Hoàn thành chuyến đồng bộ Cart; review transport cần COMPLETED + CHECKED_IN, NO_SHOW không được review.
- Hủy chuyến có durable coordinator; hủy vé VOID trước khi release SOLD; refund chỉ REFUNDED sau external evidence.
- Assisted exchange nguyên đơn: hai đơn cùng buyer/operator/method/passenger count, đơn thay thế phải CONFIRMED và trả đủ; hoàn đơn cũ toàn bộ. CASH phải có cả hai receipts.
- Cash commission/shift settlement có snapshot version/rate; không đổi rate ngược cho ca cũ.
- SMTP outbox TICKET/CANCELLED/REFUNDED/EXCHANGE, retry/lease/max10; at-least-once, có thể trùng mail khi crash sau SMTP accept.
- Scoped internal credential code có ở các service; cấu hình thật **chưa được đặt**.

Không dùng các test cũ làm bằng chứng code mới đạt. Trước các bổ sung gần đây có test cục bộ/DB isolated, nhưng không bao phủ schema/contracts hiện tại.

## 4. Nhóm A/D1/D2: đã viết gì và phải đọc lại gì

### 4.1. A1–A3: intent đồng bộ sale, lifecycle, stop/resume

File chính:

- `car/src/transport/domain/transport.repository.ts`: `pendingInventorySync`, `synchronizeInventory`.
- `car/src/transport/infrastructure/prisma-transport.repository.ts`: row lock trip, inventory version, prepare/publish/stop.
- `car/src/transport/application/transport.service.ts`: `synchronizeSale`, publish/stop/cancel.
- `car/src/transport/application/transport-operations.service.ts`: lifecycle và worker 30s.
- `car/src/trip/infrastructure/repository/prisma-trip.repository.ts`: legacy save status tăng inventorySyncVersion.
- `car/src/trip/application/usecase/update-trip-status.usecase.ts`: bỏ tắt Inventory trước khi save; worker sẽ xử lý intent.
- `car/src/transport/presentation/transport.controller.ts`: thêm POST `trips/:tripId/resume-sale`.

Cơ chế hiện tại:

1. Ghi state hợp lệ trong transaction và tăng `inventorySyncVersion`.
2. `synchronizeInventory` khóa trip, đọc state mới nhất; enabled chỉ khi ON_SALE, chưa departure và không có cancellation.
3. Gọi Inventory bên trong transaction giữ trip lock để serialize downstream writes giữa request/worker.
4. Ghi `inventorySyncedVersion` nếu downstream thành công; lỗi/rollback còn dirty intent để worker retry.
5. `pendingInventorySync` chỉ lấy trip có `offerListingId` và hai version khác nhau, limit50.
6. Publish: prepare + moderation + initialize seats → mark ON_SALE/increment → synchronize; stop/lifecycle/cancel commit intent trước sync.
7. Resume đi lại prepare; STOP_SALE có snapshot chuyển PUBLISHING, kiểm tra cancellation/departure/car/route rồi reuse snapshot.

Các điểm còn cần rà soát, **chưa được coi là đã giải quyết**:

- [x] A-R1. Sale/lifecycle responses có inventorySyncPending đọc được; public search/detail/quote kiểm trạng thái đồng bộ. (Source đã sửa; kiểm chứng ở E3/E4.)
- [x] A-R2. HTTP sync ngoài transaction, versioned exact ACK rồi CAS synced; khóa trong local mutation theo tài nguyên. (Source đã sửa; kiểm chứng ở E3/E4.)
- [x] A-R3. Prepare/publish/retry kiểm lại operator, xe, tuyến và live Identity trước mở bán. (Source đã sửa; kiểm chứng ở E3/E4.)
- [x] A-R4. Publish/stop giữ actor staff thật; worker SYSTEM, không ghi owner giả làm actor. (Source đã sửa; kiểm chứng ở E3/E4.)
- [x] A-R5. Legacy trip status delegating canonical lifecycle; không có đường chuyển trạng thái bypass workflow. (Source đã sửa; kiểm chứng ở E3/E4.)
- [x] A-R6. Completion chặn unresolved amendment/full exchange/item operation/refund; review cần checked-in/completed. (Source đã sửa; kiểm chứng ở E3/E4.)

### 4.2. A4: gửi lại vé qua transport outbox

Files: `CartandOrder/.../service/OrderService.java`, `.../controller/OrderController.java`, `.../transport/TransportNotificationService.java`, migration `2026101105_transport_completion.sql`.

- POST `/api/v1/orders/{orderId}/ticket-email/resend` vẫn dùng route chung.
- Nếu GOCAR_TICKET, `requestResend` kiểm tra buyer ownership, CONFIRMED/COMPLETED, email; enqueue/requeue TICKET outbox.
- PENDING/SENDING trả idempotently; job đã kết thúc chỉ requeue nếu `last_requested_at` cách ≥60s.
- GoTravel vẫn gọi email cũ; GoCar sử dụng `transport.frontend-base-url` và mail QR transport.
- `OrderService` có thêm constructor dependency `TransportNotificationService`; fixture/test cũ tạo constructor thủ công có thể cần sửa ở giai đoạn compile.

Cần đọc lại:

- [x] A-R7. Outbox claim/ack/failure có lease_version và deadline fence; SMTP at-least-once được ghi rõ. (Source đã sửa; kiểm chứng ở E3/E4.)
- [x] A-R8. Resend giữ buyer scope/cooldown và trạng thái mail, không ghi đè SENDING. (Source đã sửa; kiểm chứng ở E3/E4.)
- [x] A-R9. Notification event_key theo revision/operation; refund sau actual evidence ACK, AMENDMENT/TICKET có consumer tương ứng. (Source đã sửa; kiểm chứng ở E3/E4.)

### 4.3. A5/D1/D2: Catalog filter, detail, giờ và giá

Files:

- `CatalogandListing/.../repository/ListingRepository.java`: query `findActiveTransportRouteIds`.
- `CatalogandListing/.../transport/TransportOffer{Service,Controller}.java`: GET internal `/api/v1/internal/catalog/transport-offers/active-routes`.
- `car/src/transport/application/transport-integrations.port.ts` + HTTP adapter: `getOffer`, `activeOfferRoutes`.
- `car/src/transport/application/transport.service.ts`: `assertOfferActive`, `publicDetail`, `fromPrice`, quote/seatMap kiểm tra offer.
- `car/src/trip/.../search-trips*`, mapper và Prisma repository: activeRouteIds, departureRanges, searchPriceVnd.
- `car/src/trip/domain/value-object/vietnam-day.ts`: UTC bounds của ngày Việt Nam.

Contracts đã thêm:

| API | Hành vi |
|---|---|
| GET GoCar `/trips/:tripId` | Public ON_SALE/STOP_SALE tương lai + Catalog ACTIVE; chỉ projection public, có stops/class prices/saleEnabled |
| GET GoCar `/trips/:tripId/stops` | Public trả stops từ detail snapshot |
| GET GoCar `/trips/search` | Thêm `timeOfDay=morning/afternoon/evening`, `timeSlots=HH:mm-HH:mm[]`; minPrice≤maxPrice |
| Search morning | 05:00–12:00; afternoon12:00–18:00; evening18:00–00:00, khoảng cuối loại trừ |
| Slot qua nửa đêm | Trong ngày được tìm: [from,24h) OR [00h,to); không lấy departure của ngày kế tiếp |

`searchPriceVnd` mới để filter/sort giá thấp nhất; create trip đặt theo base, class-pricing cập nhật theo classes. Listing upsert dùng min giá seats của chuyến publish, **chưa tính min toàn bộ các chuyến đang bán của cùng tuyến**.

Cần đọc lại:

- [x] A-R10. Price floor dựa active seat classes/published snapshot; migration backfill min class prices. (Source đã sửa; kiểm chứng ở E3/E4.)
- [x] A-R11. Catalog/public search kiểm active owner/local suspension/live Identity; paid histories giữ riêng. (Source đã sửa; kiểm chứng ở E3/E4.)
- [x] A-R12. Enum/property/Feign path source đã đối chiếu; Catalog unavailable ngăn tạo checkout mới. (Source đã sửa; kiểm chứng ở E3/E4.)
- [x] A-R13. Public search/detail dùng saleSnapshot cho published data, không phản chiếu master edit vào vé cũ. (Source đã sửa; kiểm chứng ở E3/E4.)
- [x] A-R14. Public vehicle/commercial profile projection từ snapshot, legacy fallback, không lộ owner/token. (Source đã sửa; kiểm chứng ở E3/E4.)
- [x] A-R15. VND chính xác bằng decimal/string/BigInt; quote total giới hạn numeric18, public money mới trả chuỗi. (Source đã sửa; kiểm chứng ở E3/E4.)
- [x] A-R16. Public routes parse UUID, route static khai báo trước dynamic; me/profile không bị operatorId bắt nhầm. (Source đã sửa; kiểm chứng ở E3/E4.)

### 4.4. A6: ngoại lệ đổi vé khi replacement trip hủy

Files: `CartandOrder/.../transport/TransportExchangeService.java`, `TransportOrderService.java`, `TripCancellationService.java`, `TransportAdminController.java`, migration `2026101105_transport_completion.sql`.

- Trạng thái mới: REPLACEMENT_CANCELLED, EXCEPTION_RESOLVED.
- Advisory transaction lock `74100101` trong request exchange, request trip cancellation, mark old refund for exchange và resolve exception.
- Tạo exchange từ chối các trip đang cancellation; mark refund cũ kiểm tra replacement CONFIRMED và chưa có cancellation intent.
- Trip cancellation đánh dấu exchange exception liên quan đơn thay thế; worker chỉ xử lý PROCESSING/REFUND_PENDING.
- Ordinary cancel không bị active exchange chặn khi case là REPLACEMENT_CANCELLED/EXCEPTION_RESOLVED.
- GET `/api/v1/orders/transport/admin/exchanges/exceptions` list exception; POST `/.../exchanges/{oldOrderId}/resolve-exception` dùng `{note}`.
- Resolve yêu cầu replacement REFUNDED; old CONFIRMED/COMPLETED/REFUNDED; ghi resolved_by/note/time. Endpoint này không thực hiện bank transfer.

**Điểm nghiêm trọng cần sửa trước khi tiếp tục B:**

- [x] A-R17. Assisted exchange transitions có conditional states/serialized writes; không revive exception terminal. (Source đã sửa; kiểm chứng ở E3/E4.)
- [x] A-R18. Lock coordinator và rows theo thứ tự thống nhất, tránh inversion order/exchange. (Source đã sửa; kiểm chứng ở E3/E4.)
- [x] A-R19. Trip cancellation/exception retain refund obligations, recovery không tự tạo chứng cứ chuyển tiền. (Source đã sửa; kiểm chứng ở E3/E4.)
- [x] A-R20. Exchange cutoff dùng cancellation policy snapshot/default config; không hardcode thay vì policy. (Source đã sửa; kiểm chứng ở E3/E4.)
- [ ] A-R21. Kiểm tra tên constraint DROP trong migration trùng tên database thật (trên DB riêng ở giai đoạn sau); SQL chưa chạy.

A-R1–A-R20 xác nhận sửa source, không xác nhận build/race đã đạt. A-R21 còn mở vì không truy cập/migrate DB để kiểm constraint trong đợt này.

## 5. B1 — quản lý xe đầy đủ

### Files xuất phát

`car/src/car/{presentation,application,domain,infrastructure}`, `CarModule`, schema Car/SeatTemplate, `trip/.../create-trip.usecase.ts`, `prisma-trip.repository.ts`.

### Các bước

1. Tạo domain contracts `VehicleDetail`, `UpdateVehicleInput`, `VehicleRepository` operations hoặc mở rộng repository car hiện tại; không expose Prisma model.
2. Thêm use case GetVehicle/UpdateVehicle/ChangeVehicleStatus; controller chỉ map auth actor và DTO.
3. GET `/cars/:carId` owner-only; PATCH `/cars/:carId` cho name/licensePlate/type; PATCH `/cars/:carId/status` nhận ACTIVE/MAINTENANCE/INACTIVE + reason.
4. Khóa row car khi sửa; verify operator ownership từ token. Unique licensePlate trả409, wrong owner trả404/403 theo convention.
5. Vehicle status không được làm mất thông tin chuyến đã bán. Với chuyến active đã công bố, từ chối sửa nhận diện/seat capacity; điều phối thay xe là workflow riêng, không đổi carId lén.
6. Muốn ngừng xe có chuyến tương lai đã bán: trả conflict có thông tin chuyến cần xử lý, bắt buộc dừng bán/hủy/chuyển xe an toàn trước. Không tự xóa/void tất cả vé từ update xe.
7. Create/update trip cùng khóa car và kiểm tra trạng thái dưới transaction để không race với maintenance; giữ exclusion constraint schedule database.
8. Capacity/sơ đồ ghế giữ rule hiện tại cho đến khi có versioned template: không chỉ update totalSeats rồi để seatTemplates sai.
9. Archive dùng INACTIVE, không hard delete xe đã có lịch sử. Ghi audit actor/id/changed fields/reason.

### Khi được tích B1

Các API/read/write wired vào module, scope/row lock/status constraints/audit có source, public snapshot không bị sửa ngược. Liệt kê file/API vào bàn giao; test để sau.

## 6. B2/B3/B5 — stops, route và giờ đón/trả

### Thiết kế đề xuất để bắt đầu

- `OperatorStop`: danh mục owned by operator, id/name/address/province/active; optional latitude/longitude chỉ thêm nếu có nhu cầu thực tế.
- `RouteStop`: tham chiếu optional catalog stop ID và lưu thông tin copy name/address/province/order/pickupAllowed/dropoffAllowed; lưu copy để archive master không phá tuyến cũ.
- `TripStopOverride` hoặc model tương đương: tripId/routeStopId/order + scheduledAt hoặc offset; không lấy giờ từ browser khi checkout.
- `saleSnapshot.stops`: phải đóng đủ id/name/address/province/order/type/scheduledAt cùng trip/vehicle/seat data.
- Migration additive; stops cũ thiếu địa chỉ/giờ phải có fallback rõ (null), **không tự bịa dữ liệu**. Existing create route names/order tiếp tục chạy được.

### B2: danh mục nhà xe

1. Module stop theo bốn layer, DTO create/update/list và projected responses.
2. POST/GET `/operators/me/stops`, GET/PATCH `/operators/me/stops/:stopId`, POST `/.../:stopId/archive` (hoặc status PATCH nhất quán).
3. Filter keyword/province/active + pagination bounded; verify owner mọi read/write; archive không xóa FK.
4. Điểm archive không được chọn vào tuyến/chuyến mới, nhưng snapshot cũ và ticket đã bán còn đọc được.

### B3: chỉnh route

1. Thêm PATCH `/routes/:routeId` owner-only, hỗ trợ origin/destination và danh sách stop references/type/order.
2. Validate khác origin/destination, unique order/id, ít nhất hai stops, có pickup trước dropoff; mọi master stop thuộc cùng operator.
3. Không delete/recreate stop IDs của route đã được vé/quote tham chiếu. Nếu replacement list cần đổi IDs: dùng route revision/new route và archive version cũ.
4. Lựa chọn an toàn mốc đầu: chỉ sửa nội dung route khi chưa có chuyến đã freeze/publish; trả409 kèm lý do, tạo route mới cho thay đổi lớn. Không vô tình chặn route chỉ vì chuyến DRAFT nếu có thể sửa nháp nhất quán.
5. Nếu mở chỉnh master route cho future trips ở mốc sau: public search/detail/quote và historic tickets phải lấy revision/snapshot, không live master.

### B5: thời gian và loại stop theo chuyến

1. PUT `/trips/:tripId/stops` DRAFT-only có list stop IDs/type/time; MANAGE_TRIP scope.
2. Mọi stop phải thuộc route/nhà xe; unique order, time tăng theo thứ tự; time nằm trong hành trình dự kiến. Dùng ISO timestamps với offset hoặc convert VN ở boundary.
3. Publish freeze overrides; không sửa sau PUBLISHING. Quote validates pickupAllowed/dropoffAllowed và pickup.order < dropoff.order.
4. `TransportTrip`, `toSnapshot`, public detail, manifest, Cart quote/OrderItem snapshot và mail DTO phải cập nhật contract tương ứng.
5. Check-in chưa hỗ trợ quét GPS/từng stop: không tự tạo dependency mobile frontend. Nếu dùng pickup scheduledAt để cutoff thì phải version policy; không giữ hardcode departure cutoff mà quảng cáo pickup sau departure vẫn check-in được mãi.

### Khi được tích từng mục

B2: CRUD/archive catalog với scope; B3: safe route edit/revision; B5: DRAFT overrides + publish snapshot + consumers dùng đúng snapshot. Không tích B5 chỉ vì đã thêm schema.

## 7. B4 — sửa chuyến nháp

1. Thêm GET vendor `/trips/:tripId/manage` để tránh lẫn public `/trips/:tripId`, PATCH `/trips/:tripId/draft`, POST `/trips/:tripId/archive-draft` hoặc tận dụng cancel DRAFT đã có.
2. Input patch gồm carId/routeId/departureTime/arrivalTime/priceVnd; giữ API giá class riêng, không để Number float làm nguồn tiền.
3. Verify MANAGE_TRIP/owner, khóa trip rồi khóa resource theo thứ tự thống nhất; **chỉ status DRAFT và saleSnapshot null**.
4. Validate same operator, car/route ACTIVE, departure tương lai, arrival>departure, positive integerVND; validate stops/time sau đổi route/giờ.
5. Nếu đổi car: classPrices và overrides không còn phù hợp phải xóa/từ chối rõ ràng; không carry giá VIP của xe cũ sang class không tồn tại.
6. Check overlap advisory + exclusion constraint cuối cùng; error từ DB map409. Cập nhật searchPriceVnd và audit.
7. Archive DRAFT là CANCELLED, không gọi Inventory chưa initialized, không xóa lịch sử. PUBLISHING/ON_SALE phải dùng cancel coordinator, không route nháp.

## 8. B6 — staff và quyền đọc vận hành

Files: `car/src/staff/domain/staff.repository.ts`, `application/staff.service.ts`, `infrastructure/prisma-staff.repository.ts`, `http-staff-account.ts`, `presentation/staff.controller.ts`.

Đã có assign PUT, booleans SELL_CASH/CHECK_IN/MANAGE_TRIP/CLOSE_SHIFT và `tripIds`. Empty tripIds = tất cả chuyến trong nhà xe; active=false vô hiệu hóa. Owner luôn có quyền trong operator của họ.

1. GET `/operators/me/staff` owner-only, response userId/active/capabilities/tripIds; không document KYC/QR secrets.
2. GET `/staff/me/assignments` authenticated, trả own active assignments có owner vẫn active/APPROVED; GET `/staff/me/trips` bounded/date/status filter trong scope.
3. GET internal authorization read-scope cho Cart: actorId/operatorId → ownerUserId/allowed capabilities/allowed trip IDs/allTrips; receiver chỉ Cart. Không cho frontend gửi claimed permissions.
4. Chọn capability đọc ORDER_VIEW/REPORT_VIEW/CASH_VIEW riêng hoặc map rõ từ MANAGE_TRIP/SELL_CASH/CLOSE_SHIFT. Không dùng một boolean đọc để tự có quyền thu tiền/hủy vé.
5. Staff list/detail các chuyến CANCELLED cần đọc phục vụ refund/support; method `authorize` hiện loại CANCELLED khỏi allowed statuses nên phải tách **read scope** khỏi mutation permission.
6. Assign/revoke audit actual owner actor; tripIds validate same operator, duplicate normalize. Thay đổi scope có hiệu lực live, không chỉ token roles.

## 9. C1 — danh sách/chi tiết đơn nhà xe và staff

Files: `CartandOrder/.../repository/OrderRepository.java`, `entity/Order.java`, `dto/response/OrderResponse.java`, `transport/GoCarClient.java`, transport controller/service mới theo layers.

1. Tạo vendor read module, dự kiến GET `/api/v1/orders/transport/vendor` và `/vendor/{orderId}`; tên exact ghi lại khi code.
2. Không sửa `/orders/host` thành có TICKET_VENDOR đại trà. Luồng transport riêng chỉ `orderKind=GOCAR_TICKET` + `hostId=ownerUserId`.
3. Actor owner: chọn own operator; actor staff: server kiểm scope từ GoCar. User truyền operatorId để chọn assignment phải được server verify, không coi operatorId là proof.
4. Query filter tripId/status/paymentMethod/search/from/to, page size≤100; date VN; escape LIKE, query parameter binding; no cross-owner rows.
5. Staff giới hạn tripIds: apply vào **WHERE trước pagination/count**. Không query toàn operator rồi filter sau khiến total/data leak.
6. Detail trả khách/name/contact cần thiết, items/seat/stops/time/order/pay/refund status, các số tiền snapshot. Mặc định không trả `transportCheckInToken`; QR dành buyer, manifest không có secret.
7. CASH guest userId null vẫn xuất hiện cho operator đúng; không dùng generic `findByIdAndUserId` làm authorization vendor.
8. Canceled/refunded/completed orders vẫn đọc được; role mutation không mở rộng nhờ API đọc. Admin có route riêng.

## 10. C2 — đọc ca, biên nhận và tiền mặt

Files: `transport/cash/domain/CashLedger.java`, `application/CashService.java`, JDBC ledger adapter, `presentation/CashController.java`, migration cash trong `20261011_transport_orders.sql`.

1. Mở rộng domain read projections: shift status/opened/closed/cashier/operator/snapshot rate, receipt list; không trả update entity mutable.
2. GET `/api/v1/orders/transport/cash/shifts/mine`, GET `/shifts/{shiftId}`, GET `/shifts/{shiftId}/receipts`; vendor manager list operator shifts theo quyền riêng.
3. Cashier chỉ own shifts/receipts; CLOSE_SHIFT/manager đọc operator sau verify GoCar. Staff trip scoping phải phù hợp shift vốn thuộc operator, không mở toàn bộ khách của operator cho staff hạn chế chuyến.
4. Giá trị cần phân biệt: gross actual receipts, cash refund adjustments, expected cash, counted cash, variance, commissionDue/commissionPaid.
5. Receipt/closed shift không sửa/xóa. Late refund tạo adjustment kỳ sau hoặc ledger bổ sung, không rewrite số liệu ca đã đóng. Rate/version dùng snapshot cũ.

## 11. C3 — sửa hành khách/đón trả không đổi ghế/tiền

Đây là coordinator cross-service, không chỉ PUT table GoCar.

1. Define command `{orderItemId, passengerName?, pickupStopId?, dropoffStopId?, reason}`; actor buyer sở hữu online order hoặc staff scope cho cash; khóa order row.
2. Chỉ CONFIRMED trước policy deadline; target ticket ACTIVE, chưa CHECKED_IN/NO_SHOW/VOID; trip chưa cancellation/departed/completed. Đổi tên không được biến thành tự do chuyển vé nếu policy cấm.
3. Validate target stops against published trip snapshot/type/order, không route master có thể đã sửa. Không đổi seatId/tripId/amount bằng endpoint này.
4. Persist amendment command id + expected revision/old values + desired values + actor/time/status; unique idempotency key, reject same key different payload.
5. Cart giữ authoritative commercial intent; internal GoCar apply endpoint đọc lại order/amendment proof, khóa trip/ticket, compare expected revision và status, apply idempotently + audit. Không cho gọi apply chỉ bằng browser DTO có giá/actor tự khai.
6. Worker retry command; sync Cart item projection và notification sau ack. Khi pending, frontend cần nhìn thấy pending amendment; không trả success hoàn tất nếu chỉ ghi intent.
7. Race check-in/cancel: cùng ticket/trip locks và mutation revision; nếu check-in thắng, command conflict/attention và giữ dữ liệu hai bên nhất quán. Không hoàn nguyên tên mới dựa trên dữ liệu stale.
8. QR token hiện dựa ticket/item ID, không encode tên; chốt có giữ token khi sửa thông tin hay rotate. Nếu rotate cần version/revocation, old token phải vô hiệu thật, không chỉ gửi mail mới.
9. Notification revision/event ID riêng, không overwrite job TICKET SENDING; không gửi thông tin cá nhân qua public URL.

## 12. C4–C6 — nguyên tắc thiết kế đã triển khai trong source

C4–C6 đã có source hai đầu; đọc mục 21 để biết file và state machine thực tế. Các bước dưới là tiêu chí thiết kế. Assisted full-order exchange được giữ với mutual exclusion. Việc đổi vé cập nhật cùng ticket ID, lưu prior/result snapshot và rotate QR generation; không tạo hai active ticket cho một item.

### C4. Đổi ghế/chuyến với tiền chênh lệch được chứng minh

1. Đọc Inventory transport repository/service: hiện hold key theo order, cancelSold release nguyên order. Không thể reserve thêm ghế cho cùng order rồi update seatId trực tiếp.
2. Thiết kế operation/amendment ID riêng và reservation ownership để giữ old SOLD cùng replacement HELD; reserved seats chỉ belong một exchange operation.
3. Quote replacement server + policy snapshot; amount delta không tin browser, không gọi amount diff là proof đã trả.
4. Flow: reserve replacement → nếu delta>0 thu/verify online hoặc actual cash receipt delta → commit replacement inventory/ticket revision → void old ticket → release old seat → nếu delta<0 refund pending/evidence.
5. Khi deadline/payment thất bại: release replacement hold, giữ old ticket/seat; không void old trước khi replacement bảo đảm.
6. Ticket `orderItemId` hiện unique, không thể insert vé mới cùng item. Cần ticket revision/history hoặc mapping generation rõ, old token revoke; giữ unique active trip/seat, không phá audit.
7. Persist operation progress/outbox/idempotency; xử lý crash ở mỗi bước bằng replay/proof, không rollback tiền bằng việc xóa DB.
8. Same-trip đổi ghế và cross-trip đổi chuyến có rule khác; V1 giữ same operator; không hỗ trợ đổi operator khi chưa có settlement ledger.

### C5. Hủy/đổi một phần đơn nhiều ghế

1. Thêm item-level cancellation/refund state/amount/fee và allocation của payment gốc; tổng các hoàn tiền không vượt phần thực thu còn được hoàn.
2. Inventory internal cancel/release theo subset cần order ownership proof, atomic lock sorted seats, không giải phóng ghế của item khác.
3. GoCar void subset tickets idempotent; reject CHECKED_IN/NO_SHOW; Cart refund coordinator chỉ các items đã chọn, policy snapshotted.
4. Define aggregate order status cho active+cancelled+refundPending mixed items; tránh set nguyên order REFUNDED khi chỉ một vé đã hoàn.
5. Quyền review/completion/email/refund reporting theo item; payment callback duplicate không hồi sinh item VOID.
6. Giữ full-order API tương thích; GoTravel orderKind không đi qua transport item logic.

### C6. Trả chênh lệch khi đổi vé

1. GoPay cần immutable exchange credit/allocation ledger với operation ID unique. Không dùng generic wallet credit giả để đánh dấu tiền đã chuyển.
2. Credit đơn cũ, debit replacement, fee, delta top-up/refund phải đối chiếu nguồn tiền thực thu và provider/operator owner; event replay chỉ tạo một ledger effect.
3. ONLINE delta>0 tạo payment session trusted Cart amount, confirmed từ provider; delta<0 external refund evidence, ledger liability đến lúc hoàn thật.
4. CASH delta>0 thêm receipt delta; delta<0 actual refund adjustment/evidence; không tạo receipt bằng toàn bộ giá replacement nếu chỉ thu delta.
5. Settlement/commission reversal dựa snapshot/rate/original funds; báo cáo không double-count hai booking thành hai lần tiền thu.
6. Lock/retry/expiry/cancellation của replacement phải nối C4/C5; missing money service contract = chưa hoàn thành C6.

## 13. D3 — hồ sơ thương mại và đình chỉ nhà xe

Files: `car/src/operator`, `Identity/.../controller/UserController.java`, ticket-vendor profile DTO/service, Catalog TRANSPORT/media ownership.

1. KYC companyName/address/representative/ID documents/approval ở Identity; hiện hồ sơ APPROVED không sửa bằng submitTicketVendorApplication. Không sửa logic này để mở arbitrary KYC update.
2. Tạo public commercial profile GoCar: displayName/logoUrl/contactPhone/contactAddress/description + operator operational status ACTIVE/SUSPENDED.
3. GET public `/operators/:operatorId/profile`; GET/PATCH `/operators/me/profile`; admin detail/update/status qua `/operators/:operatorId/...` hoặc namespace admin rõ. Không trả ID documents, tax/representative ID, user personal contact nếu chưa được chủ operator công bố.
4. Logo HTTPS scoped media TICKET_VENDOR; kiểm ownership URL khi chốt media contract, không nhận arbitrary secure document URL làm logo.
5. Admin suspend operator phải durable stop-new-sale/holds tất cả affected trips; giữ tickets, paid fulfillment, refund và history/support có thể xử lý. Không chỉ gỡ role rồi bỏ tất cả workflow dang dở.
6. Public search/quote/Catalog kết hợp operator active/live Identity; vendor staff mutation kiểm owner vẫn approved/active. Các customer history/refund paths không bị khóa vì vendor suspended.
7. DisplayName thay đổi không viết ngược KYC; nếu muốn pháp nhân đổi, workflow Identity re-review riêng. Snapshot ticket giữ thương hiệu tại thời điểm bán, public profile có thể mới.

## 14. D4 — báo cáo transport cho vendor và admin

File nền `CartandOrder/.../transport/TransportOperationsReportService.java` hiện chỉ admin report(operatorUserId,from,to), booked sums/cash receipts/refund evidence/discrepancies.

1. Vendor report riêng reuse service sau verify ownership; staff report theo permission/read-scope, không trả toàn operator cho trip-scoped staff.
2. Admin transport overview totals + top vendors + grouped day/week/month; `orderKind=GOCAR_TICKET`, giới hạn khoảng≤366 ngày, timezone VN.
3. Tách chỉ số booked/order value, online funds provider verified, cash receipts actually received, refunds pending, refunds evidenced, net collections, commissions due/paid, open reconciliation. Không cộng all confirmed order amount rồi gắn nhãn bank revenue.
4. Date ghi nhận sale/order khác paid_at/refunded_at; DTO đặt tên và kỳ rõ. Báo cáo theo trip departure khác theo ngày thu tiền, không trộn.
5. Cross-service GoPay funds/settlements đọc qua internal report contract, không truy cập trực tiếp database Payment từ Cart; có stale/asOf/pending indicator nếu chưa sync.
6. Không dùng toàn-system `/orders/admin/summary` làm GoCar dashboard vì có cả GoTravel.
7. GoTicket vendor DashboardService có bug trả mảng 0; không sao chép. Admin reference có tổng vé/top vendors thực bằng query, nhưng tiền được suy ra booking confirmed nên cần sửa nghĩa chỉ số.

## 15. Migration và tương thích

Các migration mới **chưa được chạy**, E1 phải hợp nhất inventory/danh sách với README khi B/C/D thêm schema. Không dùng prisma db push.

Thứ tự source hiện tại (sau migration nền có sẵn của mỗi service):

1. GoCar `20261011040000_transport_backend`: operators unique, seat/ticket models, `btree_gist` + vehicle schedule exclusion.
2. GoCar `20261011050000_operator_stops`: bảng `operator_stops` danh mục trạm dừng của nhà xe.
3. GoCar `20261011050000_trip_cancellations`.
4. Catalog `scripts/20261011_transport_offers.sql`.
5. Inventory `scripts/20261011_transport_inventory.sql`.
6. Inventory `scripts/2026101102_transport_seat_blocks.sql`.
7. Inventory `scripts/2026101103_transport_inventory_versioning.sql`: `sync_version` và `last_sync_intent` trên bảng chuyến bán.
8. Cart `scripts/20261011_transport_orders.sql`.
9. Cart `scripts/2026101102_transport_trip_cancellations.sql`.
10. Cart `scripts/2026101103_transport_reconciliation.sql`.
11. Payment `scripts/20261011_transport_manual_refunds.sql`.
12. GoCar `20261011060000_transport_operations`: classPrices/saleSnapshot/publication retry/quote/audit/NO_SHOW/staff scopes.
13. Cart `scripts/2026101104_transport_operations.sql`: quote IDs/boarding state/notification/exchange amounts.
14. GoCar `20261011100000_transport_completion`: inventory sync versions + search_price_vnd.
15. Cart `scripts/2026101105_transport_completion.sql`: resend timestamp + exchange exception/resolve metadata.
16. GoCar `20261011110000_ticket_amendments`: `revision` trên `IssuedTicket` và bảng `transport_ticket_amendments` quản lý idempotency payload hash.
17. Cart `scripts/2026101106_transport_order_amendments.sql`: `transport_ticket_revision` trên `order_items` và bảng `transport_order_amendments`.
18. GoCar `20261011120000_operator_commercial_profile`: `status`, `displayName`, `logoUrl`, `contactPhone`, `contactAddress`, `description` trên bảng `Operator`.

Identity ticket-vendor migrations nằm ở vị trí convention riêng; kiểm tra source Identity, không đoán thư mục `Identity/scripts` (không tồn tại lúc kiểm tra).

Backfill cần kiểm: duplicate operators.user_id; active overlapping car schedules; active ticket duplicates; class min price của trips đã có; snapshot thiếu trường mới; cash guest null userId; external refund evidence legacy. Với migration ALTER ADD không IF NOT EXISTS, không rerun mù; cần schema migration journal/transaction của môi trường triển khai.

GoTravel protection: new fields nullable/default-compatible, new API paths transport, orderKind guard mọi workflow và report, role guard riêng, legacy internal token compatible tới khi cấu hình strict transport. Test regression/migrate/restart để giai đoạn sau, không làm ở lượt code.

## 16. Credential / cấu hình cần giữ khi bàn giao

- `GOCAR_ENABLED=false` tới release gates; đừng bật app để chứng minh source mới tồn tại.
- `TRANSPORT_INTERNAL_CALLERS`: JSON caller→secret của receiver; `TRANSPORT_INTERNAL_TOKENS`: JSON destination→secret của caller; mỗi receiver secret riêng≥32 chars; không ghi giá trị thật vào plan/git.
- `TRANSPORT_INTERNAL_AUTH_REQUIRED=true` là chế độ release sau cấu hình; code compatibility fallback hiện tồn tại, không tự xóa khiến GoTravel call cũ hỏng.
- GoCar outgoing destinations catalog/inventory/cart; Cart car/inventory/payment/communication; Identity status hiện dùng legacy internal token.
- Public routes có `@Public`; internal `@Internal`, AuthGuard Cart-only strict; scoped Java/communication middleware phải kiểm path/caller.
- `transport.frontend-base-url` phải trỏ GoCar origin trước email live; mặc địnhlocalhost3334 chỉ placeholder, frontend chưa triển khai.
- Mock provider chỉ isolated test mode; simulation không bank sandbox/refund proof.

## 17. Thứ tự thực hiện và cách tích checklist

1. **Ngay lượt tiếp theo:** đọc mục 21 và diff (kể cả untracked); source A–D/F đã triển khai. Không chạy lại các script chỉnh source trong /tmp. Chỉ bắt đầu E3–E5 khi chủ dự án yêu cầu kiểm chứng/triển khai.
2. B1 xe → B2 master stops → B3 route → B4 draft trip → B5 trip stops/snapshot → B6 staff reads. Có thể tách commits về sau, nhưng chưa có yêu cầu commit/push hiện tại.
3. C1 vendor orders → C2 shift reads → C3 amendments; nối contracts với B5/B6.
4. D3 operator profile/suspension → D4 reports; cập nhật A5 theo status mới.
5. C4–C6 sau thiết kế reservation/item-money ledger; không đánh dấu hoàn tất bằng flow full-order assisted hiện tại.
6. E1 docs/migrations + E2 đọc DI/contracts/security. E3–E5 tiếp tục để sau theo yêu cầu chủ dự án.

Mỗi mục hoàn thành source phải ghi:

```text
- [x] ID: đã viết source (chưa compile/test)
  Files: ...
  APIs/schema: ...
  Rules implemented: ...
  Remaining review/limitations: ...
  Next dependency: ...
```

Không tích khi chỉ thêm DTO/schema mà không wiring DI/implementation/authorization/consumer contract. Nếu đợt làm bị ngắt, ghi file đang sửa và hàm đang dở. Không copy reset repo/reference mới để làm mất tiến độ. Nếu phát hiện ô đã tích còn thiếu, thêm subtask hoặc bỏ tích với lý do rõ.

## 18. Kiểm chứng để sau — không chạy bây giờ

Khi chủ dự án yêu cầu kiểm chứng lại:

1. Generate Prisma + compile TS/Java/Node syntax, không connect live DB/provider. Sửa fixtures constructors và mới quoteId/version/hash/integrations interface.
2. DB riêng đã migrate: kiểm subset transport cần thiết, không repeat optional broad tests vô ích.
3. Authorization: wrong owner, revoked staff, trip-scope, cash guest, suspended vendor; không lộ QR qua staff reports/list.
4. Races: publish/stop/resume/lifecycle; create/update trip vs vehicle maintenance; quote claim vs cancellation; checkout vs reserve expiry; check-in vs cancel/amend/no-show; exchange replacement cancel vs refundmark.
5. Faults: downstream accepted rồi timeout/crash; intent/outbox lease recovery; email requeue vs sending; Cart unavailable completion; GoPay callback duplicate/late.
6. Money: no double receipt/refund/commission, partial allocation nếu C5 có; evidence-only REFUNDED; net exchange không double booked/revenue.
7. GoTravel regression trên cùng cấu trúc migrated nhưng DB riêng, legacy roles/paths/payments/email/reviews còn hoạt động.
8. Chỉ sau code + validation gates mới bàn migrate/release; không tự mở PM2 frontend/backend hay tunnel để test.

## 19. Kết luận bàn giao source tại 2026-10-11

- Source các mốc chính đã hoàn thành triển khai mã nguồn:
  + Nhóm A: source sửa concurrency/policy/sale sync/audit/price/catalog; A-R21 vẫn chờ DB riêng. Chưa có kết quả kiểm chứng concurrency.
  + Nhóm B (B1–B6): Quản lý xe, Danh mục điểm dừng nhà xe, Quản lý tuyến, Sửa chuyến DRAFT, Điểm đón trả theo chuyến, Quản lý nhân viên & Scope đọc.
  + Nhóm C (C1–C6): Quản lý đơn Vendor/Staff với masked tokens, Tra cứu ca thu tiền với kiểm soát CASH_VIEW, Quản lý sửa đổi vé bền vững với ticket revision & payload hash idempotency.
  + Nhóm D (D1–D4): Public trip details, Search lọc theo múi giờ VN, Hồ sơ thương mại & Đình chỉ an toàn nhà xe, Báo cáo vận hành vendor & admin.
  + Nhóm E (E1–E2): Tổng hợp toàn bộ migration đa service và cập nhật tài liệu kỹ thuật.
- C4–C6: đã có source item-level coordinator/reservations/revision và GoPay ledger/settlement; API mới không cần frontend để tồn tại. Chưa generate/compile/test/migrate.
- Chưa compile/test/migrate/live enable; chưa commit/push theo đúng yêu cầu chủ dự án (E3–E5 thực hiện sau).


## 20. Đợt sửa sau audit — triển khai toàn bộ backend

Theo yêu cầu chủ dự án: sửa source, bổ sung C4–C6; không chạy build/test/provider, không migrate/live-enable. `[x]` chỉ xác nhận source/contract đã nối và đọc rà soát; E3–E5 vẫn là gate trước deploy.

- [x] F1. Sửa enum sai, transaction xe, report SQL/aggregation, scope finance.
- [x] F2. Notification lease fencing + revision/event + AMENDMENT cả DB/Cart/Communication.
- [x] F3. Amendment serialized command/replay/recovery/attention + completion guards.
- [x] F4. Sale ack exact match/pending response; suspension/live Identity; vehicle/profile snapshot; stop validation.
- [x] F5. C5: subset inventory/ticket void, item cancellation/refund allocations, aggregate/recovery.
- [x] F6. C4/C6: operation reservation/replacement ticket history + immutable money allocation/top-up/refund + worker.
- [x] F7. Nối cancellation trip/completion/reconciliation/finance/email với item/exchange state; docs migrations/API/security.


## 21. Bàn giao thực tế sau khi bổ sung C4–C6

### 21.1. Đọc source theo trách nhiệm

| Service / source root | Files chính | Trách nhiệm |
|---|---|---|
| `car/src/transport` | `application/item-ticket.service.ts`, `domain/item-operation.ts`, `infrastructure/prisma-item-ticket.repository.ts`, `presentation/item-ticket.controller.ts` | Prepare/commit/abort ticket revision, history snapshot, revoke QR cũ, xác minh Cart plan + Inventory ownership |
| `BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport` | `domain/ItemInventoryPort.java`, `application/ItemInventoryService.java`, `infrastructure/JdbcItemInventory.java`, `presentation/ItemInventoryController.java` | Giữ replacement 15 phút song song old SOLD, subset release, tombstone abort, worker expiry độc lập |
| `CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment` | `domain/ItemOperationPlan.java`, `ItemOperationRepository.java`, `ItemOperationStore.java`; `application/ItemOperationService.java`, `ItemOperationIntegrations.java`; `infrastructure/JdbcItemOperationRepository.java`, `JdbcItemOperationStore.java`, `HttpItemOperationIntegrations.java`; `presentation/ItemOperationController.java`, `InternalItemOperationController.java` | Coordinator/saga, freeze quote/policy, exact delta, per-item state, proofs, retries, public safe view; raw JDBC ở adapter |
| `PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/transport` | `application/TransportItemMoneyService.java`, `TransportFundsReportService.java`, `TransportSettlementService.java`; `domain/ItemMoneyLedger.java`, `TransportFundsQuery.java`, `TransportSettlementPort.java`; `infrastructure/TransportMoneyRepository.java`, `JdbcTransportFundsQuery.java`, `JdbcTransportSettlement.java` | Source funds/credit ledger, actual top-up/refund, commission snapshots, cash source attribution, net payout evidence |
| Cart transport và các client | `TransportOrderService`, `TransportAmendmentService`, `TransportCompletionService`, `TripCancellationService`, `TransportReconciliationService`, `TransportNotificationService`, `cash/*`, `PaymentClient`, `GoCarClient`, `InternalOrderController`, `OrderMapper` | Nối luồng cũ với item operations, completion, refunds, cash shifts và notifications |
| GoPay integrations | `PaymentService`, `VnpayService`, `PaymentNotificationScheduler`, `HostPayoutService`, `HostPayoutController`, `OrderClient` | Dispatch GOCAR_EXCHANGE và delta callbacks; tách payout transport khỏi legacy bulk payout |
| Catalog/Communication/auth | `CatalogandListing/.../transport/*`, `cloudinary-service/src/utils/transportEmail.js`; scoped `InternalFeignConfig` / `TransportInternalAccess` / GoCar guard | Approved offers/live owner, AMENDMENT + revision TICKET QR, internal caller allowlist; giữ legacy GoTravel contract |

GoCar management adapters nằm ở `car/src/{car,route,trip,operator,stop}/infrastructure`; application phụ thuộc semantic ports. Không kéo Prisma/presentation DTO vào application. Thư mục `stop` là module mới và phải được giữ trong git khi commit sau này.

### 21.2. State machine và invariants

1. User gửi UUID `operationId` ổn định cho cancel/exchange. Replay cùng payload trả cùng operation; khác payload bị từ chối. Scope buyer hoặc SELL_CASH trên cả chuyến cũ/mới. Same operator, whole-trip inventory, không đổi nhà xe.
2. Cart khóa order, freeze `quoteId/quoteHash`, original charge/current fare/policy/old ticket revision, rồi lưu operation PREPARED **trước khi claim quote**. Không lấy giá browser, không bỏ mất claimed quote khi crash.
3. `PREPARED → HELD`: claim quote, Inventory replacement HELD (old seat SOLD), GoCar prepare ticket snapshot. `HELD → WAITING_FUNDS`: GoPay reserve original source credit. Deadline 15 phút; không gia hạn vô hạn.
4. Nếu delta>0: ONLINE trả payment summary dùng **operationId làm orderId**, `orderKind=GOCAR_EXCHANGE`, chỉ thu delta; CASH chỉ nhận immutable actual receipt ở open shift qua cash-topup. Không tạo online session cho CASH operation. Delta=0 không cần khoản thu mới.
5. `WAITING_FUNDS → COMMITTING → TICKET_COMMITTED → SETTLING`: xác minh actual funds → Inventory commit replacement → GoCar revise/rotate token → Inventory release old SOLD → GoPay commit ledger → Cart update current item fare/trip/seat/QR. Ticket ID/item ID/order ID giữ nguyên; revision/generation tăng, token cũ vô hiệu.
6. Delta<0/cancel có khoản hoàn: `REFUND_PENDING`, không coi là hoàn thành tiền. Ghi actual refund evidence tại Cart → GoPay xác minh/ghi ledger → Cart projection `COMPLETED`. Refund_total chỉ tăng sau GoPay ACK, replay không tăng hai lần.
7. Abort precommit: `ABORTING → ABORTED` hoặc `ABORT_REFUND_PENDING`. Hỏi GoCar trước; nếu đã COMMITTED do timeout thì recovery đi tiếp phía trước, không revive old ticket. Inventory abort missing operation tạo tombstone; late prepare không resurrect. Refund chỉ tiền top-up đã thực thu.
8. Callback paid sau ABORTED vẫn nhận diện actual funds và mở abort refund liability; không bỏ qua tiền thật chỉ vì hold hết hạn. Không có tự chuyển tiền ngân hàng, refund proof là chứng cứ tác vụ bên ngoài.
9. Parent order total giữ **original charge**; current fare nằm trên items và `transportActiveFareAmount`. Completion/check-in dùng current trip/seat/revision và actual SOLD ownership, không original hold. Completion chặn unresolved item/amend/exchange/refund; check-in recheck QR/revision dưới lock.
10. Trip cancellation forced fee=0 chỉ với cancellation intent thực trong GoCar; audit actor đọc từ intent. Không dùng browser flag để miễn phí. Admin có cancel/lifecycle riêng xử lý nhà xe suspended; paid tickets/history không bị xóa.
11. Legacy full-order exchange và item operations loại trừ nhau. Unresolved amendment được serialized dưới order lock; retry CONFLICT không mở command cũ khi revision khác/operation khác đang chạy. ATTENTION không tự biến thành thành công.
12. Sale intent version và exact ACK: không giữ DB transaction qua HTTP; ACK version+enabled phải đúng, mark synced bằng CAS. API có inventorySyncPending; public checkout/search fail closed khi sync đang chờ. Không overwrite newer lifecycle.

### 21.3. Money / cash / settlement

- Mỗi item account allocate từ actual original paid source; tổng allocations không vượt actual source. ONLINE source đúng user/operator/kind/amount/paidAt; CASH original source là immutable receipt, rate/version từ shift gốc.
- Immutable fund lots lưu original + top-up nguồn riêng, cash shift và commission snapshot; cancel/refund/fee dùng nguồn đã tồn tại, không giả credit wallet.
- Money events tiền VND integer; commission events và reversals giữ `numeric(24,6)`, chỉ round khi chốt net commission. Không round từng phần làm lệch tổng.
- Actual CASH refund cần SELL_CASH + open shift cùng operator; bank refund không ghi giảm cash drawer. Không sửa/delete receipt/proof cũ.
- Online top-up không tạo full standalone payout. Payout original chỉ rút sau terminal order và ledger settled; gross=original+actual topup−actual refund, commission theo snapshots; original basis lưu một lần, tránh net lại trên net.
- Payout transport withdraw/mark-paid API riêng. Mark paid phải exact net payable + reference/evidence/actor bất biến; generic/bulk payout không tự đánh dấu transport PAID. Legacy GoTravel payout giữ nhánh hiện có.
- Trường hợp **legacy transport payout đã PAID trong lúc order còn active**: item ledger reserve trả SOURCE_PAYOUT_ALREADY_PAID; phải đối soát lịch sử trước khi bật, không chi lại nguồn tiền đó.
- Public item View/Preview và new VND fields trả chuỗi chính xác. Shared legacy fields GoTravel vẫn giữ shape cũ. Frontend sau này không dùng Number để cộng tiền lớn.
- Vendor lists/reports che QR/tổng ngoài scope. Cash ticket-document là API có quyền rõ để in vé, không lấy QR từ manifest/list.

### 21.4. Notifications / reports / recovery

- Outbox lease_version fence ở claim/ACK/failure, event_key riêng command/operation. AMENDMENT được migration + Cart + Communication hỗ trợ. Exchange gửi TICKET revision mới kèm QR; không chỉ gửi text với QR cũ.
- SMTP at-least-once; crash sau gửi nhưng trước ACK có thể trùng mail. Message-ID không chứng minh exactly-once.
- Refund mail chỉ sau actual proof ACK; cancellation nêu nghĩa vụ pending. Số tiền format BigInt/decimal string, không Number.
- Worker Cart recovery mỗi 15s; Inventory expiry mỗi 15s; GoCar sale/publication/completion worker mỗi 30s. Scheduler không thay thế state persisted; multi-worker race xử lý bằng locks/CAS/idempotency.
- Attention/manual retry không được chỉnh state/amount bằng SQL. Runbook và API xem BACKEND_OPERATIONS.md. Funds report đọc GoPay contract, không join database khác.

### 21.5. Migration mới và thứ tự tương ứng

Sau migration nền và mục 15, bổ sung trên **database tương ứng từng service**:

1. Inventory: `scripts/2026101104_transport_item_operations.sql` (sau 1103 versioning).
2. Cart: `scripts/2026101107_transport_notification_revision.sql` → `2026101108_transport_amendment_recovery.sql` → `2026101109_transport_item_operations.sql` (sau 1106 amendments và cash trigger từ migration nền).
3. GoCar: `prisma/migrations/20261011130000_item_operations/migration.sql` (sau 11120000 profile); generate Prisma client sau schema update ở E3.
4. GoPay: `scripts/20261012_transport_item_money.sql` (sau `20261011_transport_manual_refunds.sql` và các bảng payout/payment nền).

Không chạy trong đợt này. `transport_item_operations` ở Cart và GoCar là **hai bảng ở hai DB riêng**, key/schema khác; không gom mọi SQL vào cùng DB/schema. SQL chứa ADD/CREATE/constraint không thể rerun mù. Hướng dẫn release phải dựa trên migration journal thực tế.

Preflight E3/E4: duplicate pending amendments trước partial unique index; exact constraint names A-R21; legacy PAID transport payouts; duplicate operators/active schedule/ticket constraints; source price floors/class prices; snapshot cũ thiếu fields; original amount/per-item departure backfill; VN timezone legacy timestamps và Instant mới; cash guest userId null; original refund evidence. Không bật worker trước khi schema receiver/caller tương ứng sẵn sàng.

### 21.6. Bước tiếp tục cho model không có lịch sử chat

1. Đọc tài liệu này và BACKEND_OPERATIONS, status cả modified/untracked. Không reset, clean, checkout đè source. Không tự commit/push, không đọc/in secret.
2. Source A–D/F đã có; **không lập lại từ đầu hoặc chạy lại script edit ở /tmp**. Nếu có issue cụ thể thì sửa đúng layer và cập nhật checklist.
3. Chủ dự án hiện yêu cầu code trước/test sau: chưa chạy E3/E4/E5. Static inspection chỉ gồm parser cú pháp TS/Node, imports/signature đọc source và diff whitespace; không tương đương typecheck/compile/business tests. Môi trường hiện chưa có Java/Javac; Java compile chưa xác nhận.
4. Khi được yêu cầu kiểm chứng: provision JDK theo pom, generate Prisma, compile TS/Java và cập nhật fixtures (quoteId/version/hash, FulfillmentItem.ticketRevision, internal scopes). Đặc biệt kiểm nested Feign interfaces được scan, MapStruct mappings và Prisma field references; hiện chưa có kết quả thực thi.
5. DB riêng của mỗi service → migrate có journal → kiểm race reserve/expiry/commit/abort/check-in/cancel; crash sau mỗi remote ACK; actual late payment/refund/payout/net commission; auth owner/staff/revoked/suspended. GoTravel regression trên schema migrated cô lập, không gửi SMTP/bank thật.
6. Chỉ sau E3/E4/A-R21 đạt mới chuẩn bị credential/runtime/release E5 và xin duyệt thời điểm tác động live nếu chưa có quyền đó. Không mở GoCar chỉ để chứng minh endpoint tồn tại.

**Phạm vi source đã hoàn thành theo checklist; mức sẵn sàng triển khai chưa được xác nhận.** Frontend/payment portal, tự chuyển khoản ngân hàng, tàu, bán ghế theo chặng và đổi nhà xe không thuộc đợt backend xe khách này.


### 21.7. Ghi nhận kiểm tra source cuối đợt

- Parser cú pháp TypeScript: 185 file source không gồm spec, không có parse diagnostic.
- Node syntax check: transportEmail.js và email.controller.js hợp lệ về cú pháp.
- Định dạng các file TypeScript backend đang sửa bằng cấu hình Prettier hiện có; không đổi frontend/spec.
- OrderMapper tắt builder strategy để AfterMapping setter hooks cho exact money fields có đích rõ; compile generated mapping để E3.
- Diff whitespace đã rà; ports 3333/3334 không có listener.
- **Không phải typecheck/build/test:** chưa generate Prisma/compile Java, chưa chạy SQL hay kiểm thử cross-service. E3/E4/E5/A-R21 vẫn mở.
