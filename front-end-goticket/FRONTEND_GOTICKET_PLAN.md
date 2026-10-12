# Kế hoạch dựng lại frontend GoTicket — bàn giao cho model không có lịch sử chat

Ngày bàn giao: **12/10/2026**; inventory là snapshot source khi soạn tài liệu, không phải xác nhận runtime. Root hệ thống: `/home/DoANLienNganh`. Frontend mới: `/home/DoANLienNganh/front-end-goticket`. Tên hiển thị **GoTicket**; service vận tải vẫn tên **GoCar**, business kind vẫn `GOCAR_TICKET` / `GOCAR_EXCHANGE`. Không đổi discriminator/service name chỉ để đổi thương hiệu UI.

## 0. Cách đọc và quyền triển khai

Đây là **kế hoạch + thiết kế + inventory API**, chưa phải frontend mới đã code. Chủ dự án muốn bỏ giao diện/luồng frontend GoCar cũ để xây lại bằng React theo nghiệp vụ GoTicket, sử dụng backend đã remake trong hệ sinh thái. Đã đổi tên thư mục, package name/title và đường dẫn launcher/PM2 config; source UI cũ được giữ để tham khảo. Khi thực thi, thay từng module cũ bằng module mới, không xóa lịch sử Git/source backend.

Model tiếp theo phải đọc:

1. **File này từ đầu đến cuối:** ràng buộc, thiết kế từng trang, luồng và checklist.
2. [API_REFERENCE.md](API_REFERENCE.md): method/path browser/backend, signature query/header/body, authorization và file nguồn từng endpoint.
3. [DTO_REFERENCE.md](DTO_REFERENCE.md): validators/schema request/response thật, kể cả inline records.
4. [API_INVENTORY.json](API_INVENTORY.json): danh mục máy đọc được từ controller, dùng tra cứu/đối chiếu coverage.
5. [Kế hoạch backend](../car/BACKEND_COMPLETION_PLAN.md) mục 20–21 và [runbook](../car/BACKEND_OPERATIONS.md).
6. [.skill/clean-architecture-frontend-skill.md](.skill/clean-architecture-frontend-skill.md); skill thiết kế `/home/trungcao/.codex/skills/impeccable/SKILL.md` nếu môi trường có.

**Quyền hiện tại:** soạn kế hoạch và đổi tên frontend, chưa có yêu cầu bật PM2/tunnel, migrate DB, gọi ngân hàng/mail, commit/push. Trước đó chủ dự án yêu cầu code trước/test sau: backend chưa generate/build/test/migrate. Khi nhận lệnh code, có thể bắt đầu UI/adapter; đánh dấu riêng phụ thuộc backend/Gateway/portal còn cần nối. Không dùng dữ liệu giả để tuyên bố tích hợp thành công. Không sửa GoTravel frontend trong đợt này.

`[x]` = đúng phần mô tả đã làm; `[ ]` = còn phải thực hiện. Tiến độ frontend ở mục 16; không tích vì chỉ có màn hình tĩnh hoặc chỉ có DTO.

## 1. Sản phẩm, đối tượng và ranh giới

### 1.1. Mục tiêu

Một website đặt **vé xe khách**: tìm chuyến → chọn ghế/điểm đón trả/hành khách → checkout giữ ghế → GoPay → phát vé QR → lịch sử/đổi/hủy/đánh giá. Cùng ứng dụng có khu vực nhà xe, nhân viên và admin. Nghiệp vụ tham khảo GoTicket tại `/home/trungcao/GoTicket-reference`, nhưng contract thật là source hệ thống này; **không copy URL/model/state/API của GoTicket reference** sang adapter.

Backend responsibilities:

| Thành phần | Sự thật do nó quản lý | Frontend sử dụng |
|---|---|---|
| GoID/Identity + Gateway session | Account, roles, KYC, SSO HttpOnly cookie | Bootstrap session, profile, vendor application, approvals |
| GoCar `car` | Operator/vehicle/route/trip/stops/quotes/tickets/boarding | Search, seat map projection, vendor operations, check-in |
| BookingandInventory | AVAILABLE/HELD/SOLD/BLOCKED, hold ownership/expiry | **Không gọi internal API**; qua GoCar seat map và Cart checkout |
| Catalog | Approved TRANSPORT offer, content/reviews | Listing/reviews, offer content, admin moderation |
| Cart | Order/items, coordinator, cash proofs/shifts, notifications/reconciliation | Checkout/order history/item operations/cash/admin workflows |
| GoPay | Actual payments, immutable money ledger/refund obligations/payout | Payment handoff/status, payout/evidence/finance |
| Communication/Media | Mail consumer/assets | Không gọi email internal; chỉ upload media được cấp quyền |

### 1.2. Phạm vi V1 thực tế

- Xe khách; một ghế chiếm cả chuyến, **không bán lại theo chặng**, không tàu/máy bay.
- Checkout một trip, tối đa 10 passenger seats theo quote service; không trộn phòng/experience với vé xe, không dùng generic shopping cart checkout.
- ONLINE cho buyer; CASH chỉ nhà xe/nhân viên có SELL_CASH và ca mở. Buyer không thấy nút “đã đưa tiền mặt” để tự xác nhận.
- Đổi ghế/chuyến **cùng nhà xe** theo từng item, sử dụng credit và chỉ thu/hoàn chênh lệch. Không đổi operator, không tự cấp wallet credit.
- Giữ ghế 15 phút **sau khi Cart checkout/reserve thành công**. Click chọn ghế trên UI chỉ là lựa chọn local, chưa là hold.
- Payment verified ≠ ticket ready: phải chờ Inventory/GoCar fulfillment. Refund pending ≠ tiền đã về. Đình chỉ nhà xe không xóa vé đã bán.
- Không hứa round-trip order: nếu có tìm vé khứ hồi, phải hai order riêng; V1 ưu tiên one-way để tránh hứa contract chưa có.
- Không tự tính phí hủy cuối cùng, không giả rating/doanh số/khuyến mại/tiện ích khi backend không có dữ liệu.

## 2. Hướng thiết kế — đề xuất để triển khai

Thiết kế theo sản phẩm đặt vé thực tế: khách tìm/chọn vé nhanh; nhân viên thao tác chính xác. Khu khách ở chế độ **Operate** với một homepage giới thiệu ngắn; console nhà xe/admin là **Operate**. Hướng này là đề xuất trong plan, chưa có screenshot/comp được chủ dự án duyệt.

### 2.1. Nhận diện hài hòa hệ sinh thái

- GoTicket chủ đạo xanh `#1D5DA8` đang hiện diện trong SSO/GoCar, nối với GoTravel qua accent đỏ `#FF385C`. Đỏ chỉ CTA/phản hồi chọn lọc, không chia đôi toàn màn xanh/đỏ.
- Nền `#F6F7F8`, surface `#FFFFFF`, chữ chính `#23313D`, chữ phụ `#576574`, border `#D7E0E6`. Brand hover `#174C8B`. Success `#176B47`, warning `#875800`, error `#B42318`; status phải có text/icon, không chỉ màu. Kiểm contrast khi code, không coi giá trị hex là chứng nhận accessibility.
- Wordmark **GoTicket** chữ rõ, không tự đổi logo gia đình Go thành biểu tượng AI mới. `brand-assets/` có Go family assets: chỉ dùng đúng nhãn; nếu chưa có GoTicket export thì dùng text wordmark và ghi TODO asset, không dùng logo GoCar/GoTravel rồi gọi là GoTicket.
- Typography: tận dụng GoBrand/Outfit local từ `auth_front-end/public/fonts/` cho wordmark/heading nếu glyph tiếng Việt đầy đủ; body dùng stack `"Segoe UI", system-ui, Arial, sans-serif` để không rơi dấu. Nếu muốn một family mới phải có font local/giấy phép/Vietnamese glyph thật; không tải font động làm checkout nhảy layout.
- Type scale: page title 32/40 desktop, 26/34 mobile; section 22/30; body 16/24; table/meta 14/20; legal 12/18 tối thiểu. Giá dùng tabular numerals, 24–28px trên result card.
- Radius input/button 10px, card 14px, modal 18px. Spacing 4/8/12/16/24/32/48/64. Shadow chỉ floating bar/modal, table/detail ưu tiên border.
- Icon Lucide sẵn có: 18–20px control, 24px empty-state; không trộn emoji và nhiều style icon.

### 2.2. Ảnh và cảm giác “thật”

Homepage dùng **ảnh du lịch thật** như Ninh Bình/Hội An/biển từ asset đang có trong auth frontend nếu nguồn/giấy phép phù hợp; `auth_front-end/src/assets/*` chứa ảnh du lịch hiện dùng. Hero xe giường nằm/ảnh render cũ `src/assets/hero.png` không tái dùng. Listing/vehicle images chỉ dùng ảnh provider từ Catalog/Media; khi thiếu ảnh dùng block màu/typography, không giả ảnh nhà xe.

Hero không phủ nhiều badge giả. Headline đề xuất: “Chọn chuyến xe cho hành trình của bạn.” Subline một câu mô tả tìm/chọn ghế. Không đặt “100.000 khách”, “cam kết hoàn ngay”, “giá rẻ nhất” nếu thiếu bằng chứng. Asset credit/license giữ trong metadata/ASSET_SOURCES, bố cục credit UI theo yêu cầu bản quyền từng ảnh.

### 2.3. Motion có mục đích

- Homepage: ảnh reveal một lần 500–700 ms (opacity + translate 16px); search bar xuất hiện sau 80ms. Một transition scenic nhẹ hoặc một ảnh chất lượng, không carousel tự đổi làm xao nhãng nhập form.
- Hover result card: border/translateY(-2px) 160 ms; click “Chọn ghế” mở detail section 200–260 ms, height transition không làm nhảy vị trí đang đọc.
- Seat selection: scale 0.96→1 120 ms + selected ring; summary số ghế/tổng tạm tính cập nhật crossfade 140 ms. Không animate AVAILABLE thành SOLD bằng giả timer.
- Checkout stepper: crossfade 180 ms, focus heading mới; payment pending dùng indicator tĩnh/nhịp nhẹ, không confetti trước CONFIRMED.
- Thành công phát vé: một lần checkmark draw 350 ms; đổi vé QR mới có label revision, không animation che mã.
- Console: modal/drawer 180 ms, row mutation có inline pending; dashboard chart animation một lần ≤300 ms, không loop.
- `prefers-reduced-motion`: tắt transform/slide, giữ state/focus; pause khi tab hidden. Không scroll-jacking, cursor custom, glow/neon, background particle hoặc bus chạy liên tục.

### 2.4. Responsive / accessibility

Desktop container max 1200 px, gutter 24; tablet gutter 20; mobile gutter 16, min 320. Header 64 px desktop/56 mobile. Breakpoints định hướng 640/960/1280, kiểm thực tế 360/390/768/1280. Click/touch target tối thiểu 44 px; focus ring 3 px xanh; keyboard navigation/label/error association bắt buộc.

Dialog có focus trap/Escape/focus restore. Seat map là grid các button có accessible name “Ghế A01, tầng 1, trống, 250.000 đồng”; arrow/tab navigation, legend text. Timer cập nhật hiển thị mỗi giây nhưng không screen-reader announce mỗi giây; chỉ cảnh báo mốc 2 phút/hết hạn. QR có action copy/print cho người sở hữu, không hiển thị trong table staff.

### 2.5. Wireframe và kích thước bố cục để model dựng đúng

Các sơ đồ sau là thiết kế đề xuất, không phải screenshot sản phẩm đã duyệt. Dùng nội dung thật, giữ hierarchy ngay cả khi chưa có ảnh.

**Trang chủ desktop:**

```text
┌──────────────────────────── Header 64 px ────────────────────────────┐
│ GoTicket      Tìm chuyến       Vé của tôi       GoTravel    Tài khoản │
├─────────────────────────── Hero 440–520 px ──────────────────────────┤
│ Heading + mô tả 1 câu                 │  Ảnh du lịch thật             │
│ Tìm chuyến cho hành trình của bạn     │  object-fit: cover            │
│ [Điểm đi] [⇄] [Điểm đến] [Ngày] [Số người] [Tìm chuyến]               │
├─────────────────────────────────────────────────────────────────────┤
│ Điểm đến: 3–4 tile ảnh nhỏ + tên địa điểm + link tìm chuyến phù hợp   │
│ Cách đặt vé: Tìm chuyến → Chọn ghế → Thanh toán và nhận vé            │
│ Footer: thông tin/chính sách có thật, hỗ trợ và hệ sinh thái          │
└─────────────────────────────────────────────────────────────────────┘
```

Search form nền trắng, label phía trên input; error dưới đúng field, swap không submit form. Không đặt chữ trực tiếp lên vùng ảnh rối. Editorial tile không giả là chuyến đang bán. Mobile xếp: heading → ảnh cao 180 px → form dọc → CTA; bỏ sidebar.

**Kết quả tìm chuyến:**

```text
Header / search strip (đổi nơi đi, nơi đến, ngày)
┌─ Filter 240 px ─┬───────────────── Result area ──────────────────────┐
│ Giờ xuất bến   │ Kết quả + ngày đã chọn             Sắp xếp [v]      │
│ Loại xe        │ ┌──────────────────── Result row ────────────────┐ │
│ Khoảng giá     │ │ Nhà xe/loại xe │ Đi → Đến │ Từ ... [Chọn ghế]   │ │
│ Nhà xe(*)      │ │ Điểm đón/trả, thời gian thực theo response      │ │
│ Xóa bộ lọc     │ └────────────────────────────────────────────────┘ │
│ (*) cần API    │ Các hàng khác / thông báo empty / Retry            │
└────────────────┴───────────────────────────────────────────────────┘
                                      [Trước] [Trang ...] [Sau]
```

Row padding 20 px, gap 16 px; giá và CTA thẳng cột desktop. Mobile row xếp timeline trên, giá/CTA dưới; filters là sheet riêng có Áp dụng/Xóa. Filter đang chọn có chips removable. Giữ vị trí cuộn khi refetch cùng page; reset về vùng kết quả khi đổi query/page. Không tải trước chi tiết của toàn bộ list.

**Chi tiết chuyến/chọn ghế:**

```text
Breadcrumb + route + giờ + trạng thái bán
┌────────────────── Main column ────────────┬─ Summary 340 px ────────┐
│ Lịch trình / Điểm đón-trả / Chính sách     │ Chuyến đã chọn           │
│ [Tầng 1] [Tầng 2] [Tầng 3 nếu có]         │ Các ghế đang chọn        │
│          Đầu xe / lối đi                  │ Giá từng ghế             │
│ [ghế] [ghế]       [ghế] [ghế]             │ Tổng tạm tính            │
│ ... đúng row/column backend ...           │ Chưa giữ chỗ             │
│ Legend có chữ                            │ [Tiếp tục đặt vé]        │
│ Passenger card cho mỗi ghế: tên/đón/trả   │                          │
└───────────────────────────────────────────┴──────────────────────────┘
```

Summary sticky dưới header 16 px, không vượt footer; mobile sticky bottom bar “N ghế · Tổng tạm tính” + CTA, mở sheet để xem danh sách. Chừa bottom padding cho bar. Các field hành khách không biến mất khi chọn thêm ghế; keyed bằng seatId, bỏ ghế phải xác nhận nếu đã nhập nhiều dữ liệu. Giá hiển thị hiện tại vẫn có thể thay đổi khi quote server.

**Checkout/payment progress:**

```text
Header tối giản: GoTicket / trợ giúp / account
Stepper: Chọn ghế → Giữ chỗ → Thanh toán → Nhận vé
┌──────────── Passenger/contact summary ────┬─ Order summary ─────────┐
│ Mỗi vé: tên, ghế, điểm đón/trả, ngày giờ   │ Mã đơn / trạng thái      │
│ Liên hệ nhận vé                           │ Hết hạn vào ...          │
│ Thông tin chính sách trả từ server        │ Còn ... phút             │
│ Thay đổi lựa chọn (hủy unpaid trước)      │ Giá thực server          │
│ Thông báo xử lý/đã nhận tiền/chờ vé        │ [Thanh toán bằng GoPay]  │
└───────────────────────────────────────────┴──────────────────────────┘
```

Không đặt form số thẻ/ngân hàng trong GoTicket. Khi paid nhưng chưa phát vé thay CTA bằng trạng thái đang xử lý; khi CONFIRMED cho xem vé. Error tại handoff không xóa hold. Return/progress page có mã tham chiếu, trạng thái, lần cập nhật và nút xem đơn; không có nút “Tôi đã trả tiền” tự confirm.

**Vé của tôi/chi tiết vé:** list mỗi order là card có số đơn/ngày/trạng thái và từng item hiện tại. Detail contact/order timeline trên; mỗi ticket riêng có chuyến/ghế/đón-trả/tên/QR/action. Desktop QR bên phải mỗi ticket, mobile bên dưới. QR 180–220 px có quiet zone trắng đủ rộng; print không có navigation/footer/sidebar/CTA. Hủy và đổi là drawer/wizard riêng, mỗi lần một item; confirm hiển thị mã vé và khoản chênh lệch/hoàn, không dùng modal chung chỉ có “OK”.

**Console desktop và quầy:**

```text
┌ Sidebar 240 px ┬──────── Topbar 64 px: breadcrumb / scope / account ─┐
│ Tổng quan     │ Page title + mô tả               [Primary action]   │
│ Chuyến/xe     │ Filter bar + active filter chips                     │
│ ... theo quyền│ Table/card/list theo trang + pending/error rõ ràng   │
│               │ Pagination; detail mở drawer hoặc route riêng       │
└───────────────┴─────────────────────────────────────────────────────┘

Quầy thu tiền:
[Nhà xe · Ca đang mở · Nhân viên · Chuyến đang chọn]
┌──── Tìm chuyến/ghế (55%) ────┬── Khách/hoá đơn (45%) ────────────────┐
│ Ngày + trip selector         │ Tên / email / số điện thoại          │
│ Seat grid + legend           │ Mỗi ghế: tên, đón/trả                 │
│ Trạng thái server realtime   │ Tổng / trạng thái giữ chỗ             │
│                              │ [Giữ ghế] → [Xác nhận đã nhận tiền]   │
└──────────────────────────────┴───────────────────────────────────────┘
```

Admin dùng cùng console tokens. Table header sticky trong vùng scroll; 48 px row tối thiểu, số tiền căn phải; status icon+text. Drawer width 520–640 px desktop, full-screen mobile. Form cấu hình bước dài có sections và Save sticky, không auto-save trạng thái tài chính. Page có dữ liệu một phần hiển thị lỗi từng widget; lỗi finance không làm KPI bằng 0.

### 2.6. Hợp đồng component và tiêu chí đủ một trang

- SearchStrip nhận query draft, locations/status và onSubmit; không tự quyết định API quyền.
- SeatGrid nhận seat projection, selectedSeatIds và onSelect; không reserve hay đánh dấu SOLD. PassengerForm keyed theo seatId; StopPicker chỉ nhận snapshot stops hợp lệ.
- MoneyText nhận decimal string + currency; DateTimeText nhận ISO/explicit timezone, không tự đoán múi giờ. Countdown nhận expiresAt server, callback hết hạn chỉ trigger refetch.
- StatusBadge nhận typed server state và nhãn tiếng Việt; PermissionBoundary quyết định ẩn/disabled/403 từ session/capabilities nhưng không thay server authorization.
- ProofForm nhận due và exact request DTO; pending khóa submit, retry giữ reference và amount; không tự chuyển khoản. OperationTimeline đọc view backend; QR component không decode token để suy quyền.
- Table cần filter/loading/empty/error/pagination/row actions đúng quyền; không hiển thị action chưa có API như thể dùng được. Dirty form có cảnh báo rời trang; server error giữ input; success chỉ sau server acknowledge.
- Mỗi màn có route, title, quyền, request/response decoder, error recovery, mobile/keyboard, cache invalidation và trạng thái công việc. Màn tĩnh chỉ hoàn thành phần layout, không hoàn thành tích hợp.

## 3. Kiến trúc React và cấu trúc thư mục

Giữ React 19/TypeScript/Vite/Tailwind 4/React Router hiện có trong package; plan không yêu cầu cài lại hoặc tự chọn version mới. Query cache có thể thêm một thư viện khi bắt đầu code, nhưng không giả hiện đã có trong package. Dùng fetch qua transport port; validation theo DTO, form library không quyết định nghiệp vụ.

```text
front-end-goticket/
  FRONTEND_GOTICKET_PLAN.md   # file này + checklist cập nhật
  API_REFERENCE.md           # inventory source có method/signature/path
  DTO_REFERENCE.md           # snapshots validators/schema
  API_INVENTORY.json
  COPY_TO_MODEL.txt
  src/
    app/
      router.tsx             # route tree + lazy chunks
      providers.tsx          # session/query/error boundary
      layouts/               # CustomerShell, AccountShell, OperatorShell, StaffShell, AdminShell
      guards/                # SessionGuard, RoleGuard, CapabilityGuard (UX, server vẫn authoritative)
    shared/
      domain/                # money/date/ID/status types thuần TS
      application/port/      # HttpPort, SessionPort, ClockPort
      infrastructure/        # fetch/csrf, environment, storage, envelope adapters
      composition/           # shared instances và factories
      ui/                    # Button, Dialog, Drawer, FormField, Table, Pagination, StatusBadge
      lib/                   # formatVnd, VietnamDate, safeReturnPath
    modules/
      session/
      discovery/             # homepage/search/location filters
      booking/               # trip detail/seat selection/checkout
      tickets/               # order detail/QR/amend/cancel/exchange
      payments/              # GoPay launch/status adapter
      reviews/
      account/               # user profile/vendor KYC
      fleet/                 # cars + seat template
      routes/                # route + master stops
      trips/                 # drafts/stops/pricing/publication/lifecycle
      staff/
      counter/               # CASH checkout/receive/ticket printing
      cash-shifts/
      operator-profile/
      offers/
      reports/
      payouts/
      administration/        # moderation/support/refunds/reconciliation/notifications
    # mỗi module:
      domain/{entity,repository}/
      application/{port,service}/
      infrastructure/{http,storage}/
      composition/index.ts
      presentation/{pages,components,hooks}/
  public/{brand,fonts,images}/
```

Domain không biết React/fetch/cache. Application phụ thuộc domain và HttpPort/repository contracts; HTTP/envelope/CSRF/storage implementation ở infrastructure. Composition tạo service factory và shared instance theo skill local. UI không new service, không gọi fetch rải rác, không import raw adapter. Shared types **không là toàn bộ DTO monolith**; snapshot DTO cần map thành view models theo module.

Server state (trip/orders/operations) ở query cache/service; form state riêng; selectedSeats/draft ở booking store nhẹ. Search filters ở URL. Mỗi orderId/operationId/idempotency key giữ cho đúng một ý định; không regenerate key khi retry do timeout. Session change/operator scope change phải clear các query nhạy cảm và draft customer trước.

## 4. Routing và shell

### 4.1. Customer shell

Header: wordmark trái; “Tìm chuyến”, “Vé của tôi”, link hệ sinh thái GoTravel; phải có account/avatar hoặc “Đăng nhập GoID”. Không navigation điều hành lẫn vào customer mặc định. Footer: giúp đỡ/chính sách/link hệ sinh thái có nội dung thật; không tạo chat/hotline giả.

| UI route | Màn hình | Quyền |
|---|---|---|
| `/` | Homepage/search hero | Public |
| `/search?...` | Search results | Public |
| `/trips/:tripId` | Detail + seat selection | Public sau Gateway gap G1 |
| `/checkout/:orderId` | Hold + payment handoff | Buyer owner |
| `/payment/return` | Return bridge, read server status | Authenticated; không tin query paid |
| `/account/tickets` | Vé của tôi | Buyer |
| `/account/orders/:orderId` | Order + items/QR/refund timeline | Buyer owner |
| `/account/orders/:orderId/items/:itemId/exchange` | Exchange wizard | Buyer owner |
| `/account/operations/:operationId` | Durable operation progress | Authorized buyer/staff |
| `/account/profile` | Profile/avatar | Session + Identity roles |
| `/account/disputes` | Khiếu nại/list/new | Buyer |
| `/become-operator` | KYC request/status | USER; vendor xem status/profile |
| `/operators/:operatorId` | Commercial public operator profile | Public sau G1 |
| `/auth/return` | SSO session rehydrate + safe next | Không credential/token form |
| `/403`, `/404`, `*` | Forbidden/not found | Không redirect loop |

### 4.2. Operator/staff/admin shell

Operator sidebar desktop 240 px, compact rail 72 optional; top bar 64 px breadcrumb + scope/account. Content card không cần hero ảnh. Mobile sidebar drawer, tables chuyển cards hoặc scroll bảng có column priority; không ép table 12 cột trong 390 px. Sticky primary action khi form dài.

Vendor nav: Tổng quan, Chuyến xe, Tuyến/điểm dừng, Xe/sơ đồ ghế, Đơn/vé, Bán tại quầy, Ca thu tiền, Nhân viên, Offer/nội dung, Báo cáo, Thanh toán nhà xe, Hồ sơ.

Staff nav **chỉ hiện capability thực**: Chuyến được phân công, Check-in, Bán tại quầy, Ca của tôi, Đơn có quyền. MANAGE_TRIP/CLOSE_SHIFT thêm đúng tính năng; không suy “allTrips=true” là quyền finance.

Admin nav: Tổng quan transport, Nhà xe/KYC, Offer moderation, Đơn cần xử lý, Hoàn tiền/item operations, Hủy chuyến, Đổi vé hỗ trợ/ngoại lệ, Đối soát, Thông báo, Payout/CASH commission, Tài khoản/quyền (nếu trong phạm vi vận hành). Admin shell luôn ghi “GoTicket”; không dùng summary GoTravel toàn hệ thống làm transport KPIs.

### 4.3. Danh sách route console và yêu cầu quyền

| UI route | Màn hình/quyền |
|---|---|
| `/operator`, `/operator/cars`, `/operator/cars/new`, `/operator/cars/:id` | Owner TICKET_VENDOR; dashboard/fleet |
| `/operator/stops`, `/operator/stops/:id`, `/operator/routes`, `/operator/routes/new`, `/operator/routes/:id` | Owner; detail route cần read contract G6 hoặc list projection đủ dữ liệu |
| `/operator/trips`, `/operator/trips/new`, `/operator/trips/:id` | Owner; chi tiết manage, không public trip detail để chỉnh sửa |
| `/operator/orders`, `/operator/orders/:id` | Owner; vendor read API |
| `/operator/counter`, `/operator/cash-shifts`, `/operator/cash-shifts/:id` | Owner có quyền cash; đọc/ghi ca theo backend scope |
| `/operator/staff`, `/operator/profile`, `/operator/offers`, `/operator/reports`, `/operator/payouts` | Owner; G6/G9 cần cho read/bank/onboarding còn thiếu |
| `/staff`, `/staff/trips`, `/staff/trips/:id` | STAFF, active assignment; từng tab theo capability |
| `/staff/trips/:id/check-in` | CHECK_IN trên trip được phân công |
| `/staff/counter`, `/staff/orders/:id` | SELL_CASH và active scope; order detail dùng vendor scoped API |
| `/staff/shifts`, `/staff/shifts/:id` | Quyền đọc ca theo cash view; open/close theo scope/capability thực |
| `/admin` và A02–A15 ở §7 | ADMIN, policy/scope cụ thể do từng service enforce |

Guard route phải đợi bootstrap session; account nhiều roles có menu chuyển khu vực nhưng không tự redirect khách khỏi booking. Thiếu capability trả 403/CTA quay lại khu được phép. Refresh deep link phải hoạt động qua SPA fallback; không dựa vào navigation state để đọc order/car/trip detail sau reload.

## 5. Chi tiết từng màn khách và API sequence

### U01. Homepage `/`

Desktop: header → hero cao 440–520 px gồm ảnh thật ở 60% phải, heading trái và search panel ngang bên dưới heading; form luôn trong first viewport. Search form: điểm đi/đến dropdown combobox, swap, date, số hành khách(1–10), nút “Tìm chuyến”. Dưới hero: danh sách điểm đến ảnh nhỏ/lời mời tìm chuyến (nội dung editorial, không giả số chuyến/giá), đoạn hướng dẫn 3 bước, footer. Mobile: heading/ảnh thấp 180 px rồi stacked form; CTA full width, date/native friendly.

API: `GET /api/v1/routes/locations` lấy origin/destination danh mục; response mapper quyết định shape thật trong DTO/source. Không dùng GET `/operators` vì ADMIN-only. Có thể dùng Catalog landmarks cho nội dung du lịch, không suy landmark là route có chuyến. Search submit validate origin≠destination và ngày theo múi giờ Việt Nam, không nằm trong quá khứ, push URL. Số hành khách là UI filter/draft; **search API không có passengerCount** nên không gửi param giả.

States: loading location skeleton, fail → retry + manual type nếu backend cho exact string; empty → form dẫn nhập địa điểm, không fake API data. Acceptance: direct refresh URL, keyboard combobox/swap, mobile không overflow.

### U02. Search `/search`

Desktop: search strip sticky dưới header; left filters 240 px; results flex. Mỗi row card: brand/operator (chỉ field thật), type/vehicle, timeline đi→đến, route, price **“Từ …”**, availableSeats nếu server trả, CTA “Chọn ghế”. Không giả ảnh xe/rating/amenities. Card details tabs “Lịch trình”, “Điểm đón/trả”, “Chính sách”, “Đánh giá” chỉ tải khi mở hoặc page detail. Mobile: filters bottom sheet, sorting inline, row cards compact, footer CTA không che content.

API `GET /api/v1/trips/search`:
`origin,destination,departureDate` bắt buộc; `timeOfDay=morning|afternoon|evening`; `timeSlots` repeated values `06:00-12:00`; `type=SLEEPER|LIMOUSINE|SEAT`; `minPrice/maxPrice` integer strings ≤18 digits; `operatorId`; `sortBy=departureTime|pricePerSeat`, `sortOrder=asc|desc`, `page` **1-based**, `limit≤50`.

Response envelope `{success,code,message,data:{pagination,data:[...]}}`, không tự flatten `.data.data` trên mọi API. Dùng exact `priceVnd/fromPriceVnd` khi có. Filter có debounced inputs~300 ms, AbortController/sequence để response cũ không overwrite response mới, đặt lại page=1 khi đổi bộ lọc. Không có public operator list đầy đủ; nếu dropdown operator cần backend new read contract, không giả từ danh sách admin.

States: first load 6 hàng skeleton, refetch giữ list+indicator, empty theo filter+reset, service offline explicit, stale “Cập nhật ghế trước khi đặt”. Giá là quote estimate, số ghế có độ trễ. URL tìm chuyến không chứa thông tin cá nhân hoặc secret.

### U03. Trip detail + seat selection `/trips/:tripId`

Layout desktop: breadcrumb/header trip → two columns: left lịch trình/vehicle/stops/tabs và seat panel, right sticky summary 340 px. Mobile summary bottom sheet mở bằng “Đã chọn 2 ghế”, CTA 44 px. Không kéo payment lên trước khi biết giữ ghế thành công.

API parallel `GET /api/v1/trips/:id` và `/seats`; `/stops` optional khi thiếu trong detail, không gọi dư cả 3 nếu detail đã có dữ liệu. Backend detail/seatmap trả **raw object/raw array**, không ApiResponse. Detail gồm `id,operatorId,listingId,route,departureAt,arrivalAt,status,vehicle,operator,inventorySyncPending,saleEnabled,totalSeats,fromPriceVnd,stops,seatClasses`. Seatmap combines `id/code/level/seatClass/row/column` và `seatId/status` + `priceVnd`; không coi id seattemplate là orderItemId.

Seat grid theo row/column/level thật; tabs tầng 1/2/3 nếu có. Trường row/column absent legacy → dùng layout list/fallback có nhãn, **không tự phỏng đoán sơ đồ xe**. Legend Trống/Đang giữ/Đã bán/Bị chặn/Đang chọn; server BLOCKED disabled, never label it as customer booking. HELD không lộ người giữ. Local SELECTED distinct từ server HELD. Tối đa 10, unique seats. Đổi ghế trong cùng chuyến không được chọn lại ghế hiện tại.

Mỗi passenger card: seatcode/class/price, name, pickup dropdown/dropoff dropdown; chỉ pickupAllowed/dropoffAllowed, order pickup<dropoff. Dùng IDs route stop snapshot, **không master OperatorStop ID**. Scheduled time nếu unknown hiển thị “Theo lịch nhà xe”, không tính giờ giả. Tên/email/điện thoại liên hệ chung được điền từ profile nếu có, người đặt được sửa.

Polling seatmap 10–15s khi visible đang chọn; focus refetch. Nếu server báo ghế không còn hợp lệ → bỏ lựa chọn ghế đó và thông báo; không tự checkout. Hold chưa bắt đầu ở đây. Primary button “Tiếp tục đặt vé”: guest lưu minimal draft TTL sessionStorage (không QR/secret) và SSO; authenticated → U04.

States: 404 departed/stopped invalid → tìm chuyến khác; STOP_SALE detail có thể đọc nhưng disabled checkout; syncPending disable, retry read. Catalog unavailable cannot allow booking. Reviews `GET /api/v1/catalog/listings/{listingId}/reviews?page=0&size=10`; listing detail cho content policy/thumbnails nếu verified type TRANSPORT, không tính price from Catalog.

### U04. Checkout/hold `/checkout/:orderId`

Creation xảy ra từ U03 với stable `Idempotency-Key` (UUID), **POST `/api/v1/orders/transport/checkout`**. Không tự gửi `amount,hostId,buyerId,holdId,quoteHash`; Cart tự quote/claim/reserve.

```json
{
  "tripId": "UUID_CHUYEN",
  "fullName": "Nguyễn Văn An",
  "email": "an@example.test",
  "phone": "0901234567",
  "passengers": [
    {"seatId":"UUID_GHE","name":"Nguyễn Văn An","pickupStopId":"UUID_ROUTE_STOP_DON","dropoffStopId":"UUID_ROUTE_STOP_TRA"}
  ]
}
```

Response OrderResponse, nhận `orderId/expiresAt/status/items/totalAmount/currency`. Form max 255 name/email và phone 30, actual quote max 10. Nếu timeout: retry **cùng payload và key**, không tạo booking thứ hai. 409 conflicts → refresh seatmap, giữ thông tin form không chuyển seat âm thầm.

Layout left passenger/contact readonly summary sau checkout + option back change(do cancel old unpaid rồi booking mới); right fare/order/timer/final CTA. Timer tính từ expiresAt server, VN LocalDateTime source cần parse+07:00 đúng; không `new Date(no-offset)` theo timezone máy. Điều chỉnh clock skew bằng response clock server nếu có; không invent trường server Now. Hết hạn UI disable pay và read server state; không “kéo 15 phút” khi reload.

States: PENDING preparation, PAYMENT_PENDING ready, FULFILLMENT_PENDING paid await tickets, CONFIRMED ready, CANCELLED expired, PAID_REVIEW actual paid needs refund/reconcile. Status source không browser trusted.

“Thanh toán bằng GoPay” → POST launch portal (G3 còn phải mở rộng) rồi `location.assign(new URL(url,PAY_ORIGIN))`. Launch error vẫn giữ order, không create-payment loop. Không bắt đầu thanh toán sát deadline nếu server reject; hiện provider guard quyết định, UI cảnh báo khi còn 2 phút.

“Huỷ giữ chỗ” → POST `/api/v1/orders/transport/{orderId}/cancel-unpaid`; read until terminal. Không release Inventory hoặc delete order từ browser. Refresh order read `GET /api/v1/orders/{id}`; tab hidden pause poll. Poll khoảng 3–5 giây khi đang xử lý, max bounded backoff khi unavailable.

### U05. Payment return / operation progress

Return URL chỉ correlation(orderId/operationId), không assert `status=success` là paid. Sau GoPay/VNPAY quay lại `/payment/return` → session check → GET payment by order + order/operation states → route progress. Payment COMPLETED nhưng order FULFILLMENT_PENDING: “Đã nhận thanh toán, đang phát hành vé”, không show QR fake. Order CONFIRMED hiện vé. PAID_REVIEW: “Đã nhận tiền; cần xử lý đặt chỗ”, actions support/refund history, không “thanh toán thất bại” mà không giải thích khoản tiền đã nhận.

Operation `GET /api/v1/orders/transport/item-operations/{id}` 3–5s, statuses PREPARED/HELD/WAITING_FUNDS/COMMITTING/TICKET_COMMITTED/SETTLING/REFUND_PENDING/COMPLETED/ABORTING/ABORT_REFUND_PENDING/ABORTED. WAITING_FUNDS + topup>0 ONLINE: GoPay launch operationId, charge only delta. topup0 skip manual pay, wait worker. ABORTED có thể mở refund late payment sau callback → refetch history. Retry không mark success.

### U06. Vé của tôi `/account/tickets`

Tabs “Sắp đi / Đã đi / Đang xử lý / Hủy-hoàn”; list card mỗi order với current items, mixed trip after exchange phải display per item departure, không old parent trip. API GET `/api/v1/orders?statuses=...&search=...&page=0&size=20`, Spring **0-based**. API chung có GoTravel orders; hiện không có orderKind filter verified → xử lý G5: thêm filter/pagination phía server trước hoàn thiện ticket-only history, không client filter page và coi là complete history.

Each card order number,date,status,seat count,total original, summary current fares/refunds, view detail. NO_SHOW khác CHECKED_IN; REFUND_PENDING not“đã hoàn”. Empty logged in → “Bạn chưa có vé” search CTA. Session expired→SSO redirect safe, keep next path.

### U07. Order/ticket detail `/account/orders/:orderId`

Top orderstatus/timeline + contact + each item card: current trip/seat/stop/name, revision, fare, boarding, QR only ACTIVE buyer owner. Exact original charge `transportOriginalChargeVnd`, effective fare `transportActiveFareAmount`, per item`transportFareVnd/transportRefundedVnd`; không tính parent total bằng current items rồi ghi“đã thu”. Refunddue from operation server; original payment COMPLETED có thể còn valid sau partial refund.

API GET `/api/v1/orders/{id}`; resend POST `/{id}/ticket-email/resend` thông qua Cart → email outbox. Show ticketEmailSent/Attempts state, cooldown/429 respect, don't call Communication. QR renderer local PNG/canvas dùng `transportCheckInToken` opaque; không parse/mint token, không external QR URL, không store QR Code/localStorage/log analytics. In vé bằng CSS print route/detail, mask QR khi VOID/NO_SHOW/outside owner. Revoked old QR after exchange, after mutation invalidate order detail.

Actions per item ACTIVE before departure: sửa(name/stops), đổi, hủy. CHECKED_IN/NO_SHOW/VOID không action thương mại bị cấm; server 409 wins. Refund already owed display evidence/timeline theo API view không expose internal fund lots. Dispute CTA đã đặt thực, reviews CTA only completed+checked-in.

### U08. Sửa thông tin vé (drawer U07)

Fields passengerName ≤120, pickupStopId/dropoffStopId từ **current trip snapshot**. Load current stops/public detail có thể 404 sau đi; disable edit theo eligibility. Request POST `transport/{orderId}/items/{itemId}/amend` `{commandId,passengerName,pickupStopId,dropoffStopId}`. Stable UUID commandId cho one intent; retry cùng body. GET `.../amendments` tìm command để track status PENDING/ATTENTION/CONFLICT/COMPLETED. Không hiện “đã lưu” khi PENDING, không send expectedRevision from browser vì coordinator chốt.

Completion refetch order/stops, mail revision. 409 conflict load latest + explain, new intent new UUID; không retry CONFLICT forever. Change history list date/status only, audit actor text if authorized API provided.

### U09. Hủy vé / toàn đơn

Drawer: chọn one item→ POST `.../operation-preview` `{kind:"CANCEL"}` → oldAmount/fee/refundDue/policyVersion. Confirm CTA “Hủy vé này”, copy hoàn chưa chuyển. POST `.../cancel` `{operationId}` → U05operationprogress. Không gọi generic PUT`orders/{id}/cancel` cho transport paid. Full order cancel có existing cancellation-preview/cancel-paid nhưng preferred explicit item wizard cho multi-seat; full order contract retained là action“hủy toàn bộ”chỉ xác nhận mọi item và backend eligibility.

Unpaid cancel khác paid cancel. UI cannot submit refund proof/customer claim money returned. Hủy xong ẩn QR ngay theo state VOID; REFUND_PENDING timeline vẫn shown. Amount final always preview server, no hardcode “hoàn 100% trước 6 giờ”.

### U10. Đổi ghế/chuyến wizard

Route `/account/orders/:orderId/items/:itemId/exchange`. Bước 1: vé hiện tại/chính sách → bước 2: tìm chuyến cùng nhà xe → bước 3: ghế và điểm đón trả mới → bước 4: chênh lệch dự kiến → bước 5: tạo operation/thanh toán → bước 6: kết quả. Desktop content stepper left, summary right; mobile progress compact. Same-trip new seat allowed, old seat SOLD still hiển thị nhưng không cho chọn.

POST operation-preview `{kind:"EXCHANGE",tripId,seatId,pickupStopId,dropoffStopId}` returns oldAmount/newAmount/fee/topup/refundDue. Preview chưa hold, cảnh báo availability may change. POST exchange `{operationId,tripId,seatId,pickupStopId,dropoffStopId}` tạo hold 15 phút/recoverable delta flow. ONLINE topup positive payment **operationId, GOCAR_EXCHANGE**, no replacement new order; refund negative pending evidence. Abort only precommit API, after COMMITTING cannot promise old ticket unchanged, follow progress.

Success refetch same order/current item, QR revision new, original charge unchanged. Don't reuse old QR image cache. Same operator hidden new operator selection. Buyer cannot cash-topup even if API path public; staff counter handles CASH operation.

### U11. Reviews / complaints / profile / KYC

- Reviews drawer from used ticket: `POST /api/v1/catalog/reviews` `{listingId,rating:1..5,comment,images?}`; server checks purchase/checked-in/completed. Listing ID offer, không trip ID. Read review paginated. Chưa có sửa/xóa review public verified → không build fake edit buttons.
- Complaints `/account/disputes`: GET orders/disputes, POST orders/disputes using exact CreateOrderDisputeRequest (DTO_REFERENCE), show resolution from server; upload attachment supported only if DTO real. No un auth booking lookup by phone backend not provided.
- Profile `/account/profile`: GET/PUT `/api/v1/me` và `/api/v1/me/profile`; avatar multipart `/api/v1/me/avatar`. Session/Identity roles must allow; không tạo account table ởfrontend. Save form field actual DTO; optional bank for vendor **chưa có verified API**, không reuse HOST bank API.
- KYC `/become-operator`: GET `/api/v1/me/ticket-vendor-profile`; POST/PUT `/api/v1/me/ticket-vendor-application` multipart `companyName,companyAddress,representativeName,representativeIdNumber,taxCode?,contactPhone?,frontImage,backImage` theo DTO/validator. Identity là source approval. Pending readonly status/rejected reason resubmit; APPROVED refresh roles, sau đó phải chờ backend provision Operator idempotently theo G9; nguồn hiện tại chưa nối luồng này. Không hiển thị ảnh căn cước trong hồ sơ công khai.

## 6. Chi tiết nhà xe và nhân viên

Route prefix `/operator` cho TICKET_VENDOR, `/staff` cho STAFF+capability. Role claim USER có thể cùng TICKET_VENDOR; refresh roles sau approval; local boolean isOperator legacy không authoritative.

### O01. Tổng quan `/operator`

Header ngày/kỳ nhà xe. Cards chuyến hôm nay/vé confirmed/actual cash/online/refundpending khi API có chỉ số thật. Bảng chuyến sắp đi và attention. `GET /api/v1/trips?departureDate=...` vendor list kpi; `GET /api/v1/orders/transport/vendor/reports?from&to` actual report; staff chỉ `/api/v1/staff/me/trips`(G1). Khi một trong 3 nguồn lỗi hiển thị per widget unavailable/asOf, không thay bằng số 0 giả. Finance widget only permission allowed.

### O02. Xe `/operator/cars`, `/operator/cars/:id`

List filter keyword/type/status,page1limit; columns tên/biển số/type/seats/status/action. GETcars; POST cars exact CreateCarDto; GET/PATCH cars/:id; PATCH status `{status:ACTIVE|MAINTENANCE|INACTIVE}`. Form name/licensePlate/type allow actual fields. Không delete button vì không delete contract; historical cars archive bằng state. Active published trips lock mutation 409 hiện giải thích từ server.

Detail tabs: Thông tin / Sơ đồ ghế / Chuyến sử dụng(nếu query carId supported). Editor sơ đồ ghế có code duy nhất, level 1–3, seatClass, row 0–100 và column 0–10. PUT `/api/v1/cars/{id}/seats` body `{seats:[{code,level,seatClass,row?,column?}]}`. **DTO không có field active**; không gửi field này. Mỗi replacement từ 1 đến 100 ghế. Hỗ trợ import manual UI only nếu validate; don't invent bulk API. Replace ALL chú thích bản template không patch one, confirmed published snapshot không sửa. Delete UI seat draft only trong replacement body, no DELETE backend guess.

### O03. Master stops/tuyến `/operator/stops`, `/operator/routes`

Stops GET/POST `/api/v1/operators/me/stops`, GET/PATCH `/{stopId}`, PATCH `/{stopId}/archive`. Form name/address/province theo DTO, list active filters; soft archive, no DELETE. Detail được ID master dùng edit or khi DTO hỗ trợ.

Routes GET/POST `/api/v1/routes`, PATCH `/{id}`, PATCH `/{id}/status`. Form origin/destination + danh sách điểm dừng có thứ tự, tối thiểu 2. **CreateRouteDto hiện chỉ `{name,order}` mỗi stop**, UpdateRouteDto xem stopID/operatorStopId fields; không tự gửi operatorStopId vào create nếu DTO không có. Drag-and-drop có button move up/down keyboard; serialize order strictly increasing, no duplicate ID. Route detail GET single chưa verified → dùng row từ list hoặc xử lý G6 để thêm read contract, không giả GET/routes/:id.

Published/history route edit guard 409 not UI bug; plan create/new version if needed backend contract not invent. Không vì gọi PATCH được mà rewrite past ticket snapshot.

### O04. Chuyến `/operator/trips`, `/operator/trips/new`, `/operator/trips/:id`

List GET trips filters keyword/status/routeId/carId/departureDate/sortBy/sortOrder/page1limit; response `{kpi,pagination,data}`. Table ngày giờ/route/vehicle/base fromprice/sold held blocked remaining/status/sync badge; nếu thiếu aggregate thì hiển thị chưa có dữ liệu, không thay bằng số 0. New POST trips `{routeId,carId,departureTime,arrivalTime,pricePerSeat:number}`; ISO+07:00, arrival>departure, price safeinteger≥10000. This create legacy numeric contract **khác exact string classprices**, don't send priceVnd instead. Conflict car overlap→show choose other/time.

Detail GET`/api/v1/trips/{id}/manage` MANAGE_TRIP; sections Overview / Stops / Seats & pricing / Passengers / Publication/audit if exposed. Draft PATCH`/{id}/draft` exact DTO, route/time change xóa stop overrides server→reload. **Chưa có archive/delete trip route**; don't show permanent delete; nếu cần thì bổ sung contract backend theo G6. No generic PATCH status for publish/cancel, dedicated workflow below.

Draft stops PUT`/{id}/stops` `{stops:[{routeStopId,order,type:PICKUP|DROPOFF|BOTH,scheduledAt?,pickupAllowed?,dropoffAllowed?}]}`. full route ordered stops, times strictly inc in trip bounds; show unknown intermediate schedule honestly. Fare classprices PUT`/{id}/class-prices` `{classPrices:{VIP:"350000"}}` active classes only DRAFT; missing uses base. Seat block multi PUT`/{id}/seat-blocks` `{seatIds,blocked,reason}` only AVAILABLE/BLOCKED not HELD/SOLD.

Publish POST`/{id}/publish`: Catalog pending→PUBLISHING +progress, don't force ON_SALE; moderation approve->worker. Stop POST stop-sale, resume POST resume-sale with eligibility checks. State badge PUBLISHING/ON_SALE/STOP_SALE/DEPARTED/COMPLETED/CANCELLED; syncPending separate warning. Depart/complete PUT lifecycle `{status}` confirms timestamps. Cancel POST cancel `{reason}` →durable PROCESSING; read trip/manage and admin progress if role allowed, not one click SQL state.

### O05. Đơn/vé `/operator/orders`, `/operator/orders/:id`

GET `/api/v1/orders/transport/vendor` with operatorId/status/tripId/method/search/from/to/page0size; detail vendor path. Cards/table column current item trip/passenger/seat/contact/boarding/payment/order state. Scope-filtered staff detail not full order total: show“phạm vi được phân công”, never calculate full order with partial data. QR masked through list/manifest; intentional CASH counter document only.

Allowed actions use amend/item preview/exchange/cancel workflows như U08–U10 with staff capability and scope both trips. No staff access via buyer GET order endpoint fallback. Attention amendments GET vendor/amendments/attention, POST vendor/amendments/{commandId}/retry, prevent retry command revision changed. Order refund done proof admin/cash specific, not owner hack bank proof route.

### O06. Bán tại quầy `/operator/counter`, `/staff/counter`

Tablet optimized: top active cash shift, left trip select or+seatmap, right contact/passengers+bill, large“Giữ ghế” then“Đã nhận … tiền mặt”. Khách CASH không cần account; contact request required source exact. Need SELL_CASH +live assignment+open operator shift. GET staff assignments/trips or vendor list; POST `/api/v1/orders/transport/cash/checkout` with stable Idempotency-Key+TransportCheckoutRequest; order CASH_PENDING; POST `/cash/orders/{orderId}/receive` `{amount}` exact expected VND. Physical cash confirmation explicit dialog, no auto receive when submit booking.

CASH_RECEIVED_PENDING_RECONCILIATION: display actual receipt retained, prohibit second receipt, retry coordinator/admin attention. CONFIRMED fetch vendor item document printing QR through `/vendor/{orderId}/items/{itemId}/ticket-document`. Unpaid cancel cash path; paid cancel/item operation with due evidence. CASH exchange topup POST item operation/cash-topup actual delta/reference, negative cash refund same operator open shift+proof. Không tạo online payment cho operation CASH.

### O07. Ca tiền `/operator/cash-shifts`, `/staff/shifts`

Mine GET `/cash/shifts/me`; operator list GET `/cash/shifts?operatorId&page=0&size`; detail GET`/{shiftId}`. Open POST shifts `{tripId}` (trip for authorization, actual shift operator logic source); close POST shifts/close `{countedAmount}` ca hiện tại đang mở của người gọi, **không gửi shiftId chưa DTO**. Need CLOSE_SHIFT/cash view permission validated server.

Detail: opening/collector/status, original receipts, delta receipts, cash refund proofs, commission/payments, expected vs actual count/discrepancy; G7 nếu API projection chưa hiện all ledger records, backend extend read not query GoPay internal browser. Không sửa/delete existing receipt. Close exact calculation only server, UI count number explicit, discrepancy does not erase history. Negative outstanding/credit display as credit, not âm thầm ép về 0.

### O08. Staff `/operator/staff`, `/staff`

Owner GET`/api/v1/operators/me/staff`, assign PUT`/{userId}` `{canSellCash,canCheckIn,active,canManageTrip?,canCloseShift?,tripIds?}`. tripIds=[]allTrips semantics stated clearly, explicit confirm when allTrips; staff UUID validated. **No verified vendor user search/invitation endpoint** → initial UUID form, bổ sung lookup có scope theo G6 if wanted, don't call admin/users as vendor. No local create STAFF password.

Staff session → GET `/api/v1/staff/me/assignments` and`/trips` sau khi nối routing G1. UI permission table actual fields read source; selected trip caps, inactive assignment blocked. Revoked role 403 clear caches/disable mutations and refetch session, not trust persisted buttons. Owner staff reads not grant other operators.

### O09. Manifest/check-in `/staff/trips/:id/check-in`

Phone camera scanner panel + manual paste opaque QR + passenger search list. GET `/api/v1/trips/{id}/manifest` includes revision/current stops/boarding, no QR secrets. POST `/api/v1/tickets/check-in` `{token}` only assigned CHECK_IN; never handcrafted trip/passenger state write. Use browser camera only HTTPS/user permission; local decode, no image upload external QR service. Duplicate check-in result server idempotency state; revoked old QR rejected, show current detail not“thành công”fake.

Row ACTIVE/CHECKED_IN/NO_SHOW/VOID badges; no-show POST`/api/v1/trips/{tripId}/tickets/{ticketId}/no-show` cutoff server (config default 120 minutes, UI cannot hardcode as success), checked-in not convert. Lifecycle actions only MANAGE_TRIP/admin API. Poll manifest 10–15s visible, focus read, mutation invalidate. Offline **không check-in giả**; say need network, keep manual input but không lưu nội dung QR vào log.

### O10. Offer/profile/report/payout

- `/operator/profile`: GET/PATCH `/api/v1/operators/me/profile` actual fields displayName/logoUrl/contactPhone/contactAddress/description; Identity KYC riêng readonly link. Public operator page only commercial. Logos upload scoped Media; arbitrary secret ID document URL forbidden.
- `/operator/offers`: offers derive from manage Trip.offerListingId/route? Source current profile exact. PUT `/api/v1/catalog/transport/offers/{listingId}/content` `{title,description,thumbnailUrl?}` **gap Gateway G2**. Content edit ACTIVE->PENDING; server publish blocked until moderation. **No verified vendor list offers endpoint** → G6 cần scoped listing projection hoặc group known trip offers limited; không giả danh sách catalog đầy đủ or use HOST listings.
- `/operator/reports`: from/to≤366d; GET transport/vendor/reports; rows/trend only actual returned grouping, definitions booked≠collected, pending refund≠actual paid. CSV can be client export current authorized result with definition/asOf, not fake full export API. Finance unavailable widget explicit, don't mix all operator funds in trip scoped staff.
- `/operator/payouts`: GET `/api/v1/payouts/me?page=0&size...` shared all types: cần filter TRANSPORT phía server theo G5. Shows gross/topup/refund/net commission/net payable request status. POST `/api/v1/payouts/transport/{id}/withdraw` one payout; no generic bulk withdraw transport. Bank account set up vendor currently no API(G6), do not call host-bank-account. Withdraw request ≠bank transfer completed; only evidenced PAID server state.

## 7. Admin screens — đủ các bên, không chỉ buyer

Admin routes lazy, server ADMIN authoritative. Danh sách không lọc TRANSPORT phía client trên page chung mà gọi là totals đúng; cần xử lý G5 bên dưới.

| ID / UI route | Bố cục và dữ liệu | API / thao tác / edge state |
|---|---|---|
| A01 `/admin` | Period bar, transport KPIs, operational queues, top vendors/trend thật | GET orders/transport/admin/reports/overview?from&to; report per operatorUserId. Không dùng payout/admin/summary/catalog/admin/summary làm transport-only total |
| A02 `/admin/vendor-applications` | Table company/applicant/status/submitted; drawer legal fields và secure image có quyền | GET `/api/v1/admin/ticket-vendors?page&size&status`; PUT `/{accountId}/approval` exact ApprovalRequest; notes reject; approve → người dùng refresh roles → backend provision/sync Operator theo G9; luồng đồng bộ hiện chưa hoàn thành |
| A03 `/admin/operators` | List operators +commercial vs KYC status tách; detail Public/read+admin controls | GET `/api/v1/operators` ADMIN; PATCH`/{operatorId}/status` `{status,reason...}` exact DTO. Suspend warn stops new sales; don't delete historical paid tickets. Identity account ban khác GoCar SUSPENDED |
| A04 `/admin/offers` | Listing moderation queue TRANSPORT,type/status/title/vendor; detail+approval | GET catalog/admin/listings?status&keyword&page&size (filter type theo G5); PATCH`/{listingId}/status?status=...` state enum source; no fabricated body approval. Content page has provider data, don't show stay rooms |
| A05 `/admin/orders` | Filter transport status/method/operator/search/date, detail support drawer | Shared GET orders/admin (filter kind theo G5); buyer GET order not admin fallback. cần admin order detail có scope theo G6 nếu list thiếu projection cần thiết; don't fake support get Customer credentials |
| A06 `/admin/attention` | PAID_REVIEW/fulfillment/cash-reconcile queues, actual paid/hold/ticket status | GET orders/transport/admin/attention; reviewed paid open refund PUT admin/refunds/{orderId}/open-paid-review. Disable actual refund until owed/evidence |
| A07 `/admin/item-operations` | Tables state/delta/liability/error/attempts; expanded trusted plan admin view | GET admin/item-operations/attention; POST`/{id}/retry`, `/abort`, `/refund` actual proof. Normal GET item operation still owner staff scope; admin không được coi biết UUID là đủ quyền truy cập. Pending/abort refund not discardable |
| A08 `/admin/refunds` | Separate legacy full refund and item refund tabs; exact due/fee/source/method/evidence | Legacy PUT transport/admin/refunds/{orderId}/complete `{amount,reference,evidenceUrl}`; item POST transport/admin/item-operations/{id}/refund `{amount,reference,evidenceUrl,refundMethod,cashShiftId?}`. No automatic bank transfer; instruction operator already refunded→record proof |
| A09 `/admin/trip-cancellations` | Enter known trip ID/queue, reason, items/refunds counters, durable progress | POST `/api/v1/trips/{id}/admin-cancellation` `{reason}`, GET orders/transport/admin/trip-cancellations/{id}. No all-trip admin list yet(G6). Admin lifecycle PUT admin-lifecycle only DEPARTED/COMPLETED guarded |
| A10 `/admin/exchanges` | Legacy assisted case old/new order proof/state/difference, exceptions | POST transport/admin/exchanges `{oldOrderId,newOrderId,reason}` both funded whole orders; GET exchanges/{oldOrderId}, exceptions; POST resolve-exception `{note}`; doesn't replace item delta flow |
| A11 `/admin/reconciliation` | Findings list code/operator/order/actual vs projection, expand notes/timestamps | GET transport/admin/reconciliation?limit; PUT`/{orderId}/refresh`; POST`/{orderId}/{code}/notes` `{note}`. Manual note ≠ mark balanced/auto-transfer |
| A12 `/admin/notifications` | Outbox kind/event/state/attempts/error/next attempt, masked recipient | GET transport/admin/notifications; POST`/{eventId}/retry` only FAILED. Do not modify SENDING lease/Event-ID or resend via provider callback |
| A13 `/admin/settlements` | Transport payout table gross/commission/net, proof drawer; CASH summary by shift | GET payouts/all (filter type theo G5); PUT payouts/transport/{payoutId}/mark-paid `{amount,reference,evidenceUrl}`; GET transport/cash-summary?operatorId; PUT cash-settlements/{shiftId}/mark-paid exact CommissionPaidRequest; generic mark-paid/bulk transport forbidden |
| A14 `/admin/accounts` | Scoped admin user read/status/roles, audit purpose. Optional cross-product control clearly labelled | Identity admin/users/account status/role/revoke mapped in API_REFERENCE; do not expose HOST policy from ticket role; confirmed ban/change server. Secure ID docs not public Media |
| A15 `/admin/policies` | Hiện chính sách hủy/commission/config theo contract; readonly where absent | Commission GET/PUT payouts/admin/commission is shared system policy, warn scope—not GoTicket-only config. Cancellation config CRUD/tax/coupon/promotions API chưa có, record dependency don't fake persist localStorage |

Admin finance submission: date/amount/reference/evidence Preview before commit; disable pending double click; repeat with same proof must consistent, never reference uuid new automatically on retry. Local URL blob isn't server evidence URL; use permitted upload or external HTTPS actual proof, no image approval shortcut. Receipt immutable, editing form after paid creates new business intent only where API exists.

## 8. Cross-service contracts, error handling và state

### 8.1. Browser HTTP standard

Same origin `/api/v1` qua Vite/reverse proxy Gateway, hoặc configured API origin+CORS credentials. Always `credentials:'include'`. Session HttpOnly cookie không đọc/ghi JWT localStorage. Mutation gửi `X-CSRF-Token` from readable`csrf_token` cookie, decode once. FormData **không set Content-Type thủ công**. Gateway inject X-User-Id after JWT; browser **không gửi X-User-* / X-Internal-* / internal service secret**.

Transport ports loopback/internal, frontend must not fallback 3333/8084/8085 on 403/404. Gateway blocked `/api/v1/internal/**` giữ nguyên. Need strict env allowlisted origins for SSO/PAY return, no arbitrary redirect.

Role claims được normalize tại một adapter (`ROLE_ADMIN` → `ADMIN`, tương tự các role khác), giữ raw claims nếu cần debug không chứa PII. Không suy capability STAFF từ role chung: đọc assignments và permission từng chuyến. Logout/đổi account phải xóa cache private theo userId/operatorId.

### 8.2. Response adapters

- GoCar CRUD/search/manage/profile/stop thường `{success,code,message,data}`; public detail raw object, seatmap raw array; manifest raw object. Endpoint-specific decoder, giữ schema fields.
- Spring Cart/Payment/Catalog `ApiResponse.data`; Identity `ApiRequest.data`; paginations Spring `{content,totalElements,totalPages,number,size}` versus GoCar`pagination` versus Catalog`PaginationResponse`fields actual DTO.
- Không unwrap `.data` đệ quy: domain object hợp lệ có thể có field tên data. No assume HTTP 200 always business success if success=false. DTO_REFERENCE có schemas.
- VND string primary; view calculations BigInt/decimal exact, JSON BigInt serialize as string. Legacy numeric amount limited safe frontend validation and never client trusted payment source. Format vi-VN, max 18 digits, no fraction currency VND; not parseFloat larger amount.
- ngày Việt Nam filters local YYYY-MM-DD, timestamp with offset+07:00/Instant correct; no toISOString().slice(0,10) choosing ngày Việt Nam near midnight. New backend dates no offset legacy explicit zone parser. Session expiresAt unix seconds khác order expiresAt ISO string.

### 8.3. Errors

| Response | UX hành động |
|---|---|
| 400/422 validation | Field errors map DTO, preserve form, don't retry loop |
| 401 | Stop mutations, bootstrap/SSO once with safe next; don't redirect public search to auth unconditionally |
| 403 role/scope/CSRF/origin | Distinguish code; missing permission readonly/403; CSRF session refresh one attempt without new idempotency key; origin misconfig surface error for integration, no fetch direct backend |
| 404 | Không có tài nguyên: hiện 404. Trip public hết hạn/đã đi: CTA tìm chuyến khác. Sai UUID không được tạo state giả |
| 409 conflict | Refetch actual item/seat/revision, giải thích lựa chọn đã thay đổi; don't silently retry new seat/new charge |
| 429 | Respect Retry-After/cooldown, disable mail spam |
| 503/504/network | Retain stable key/command ID, show pending unknown outcome; read current server state before creating new intent |

Mutation never optimistically mark PAID/REFUNDED/checked-in/SOLD. Safe optimistic UX only local filters/selection, not inventory ownership. Poll only while visible pending, stop terminal, bounded backoff, abort unmount. No one global loop polling all APIs. Search query key contains filters; scoping keys include userid/operator/trip, session logout clear private cache.

### 8.4. State labels

Keep server enum unchanged, translate UI:
- Trip DRAFT “Nháp”; PUBLISHING “Đang chờ mở bán”; ON_SALE “Đang bán”; STOP_SALE “Ngừng bán”; DEPARTED “Đã xuất bến”; COMPLETED “Đã kết thúc”; CANCELLED “Đã hủy”. inventorySyncPending secondary “Chờ đồng bộ ghế”.
- Order PAYMENT_PENDING “Chờ thanh toán”; CASH_PENDING “Chờ nhận tiền mặt”; FULFILLMENT_PENDING “Đang phát vé”; CONFIRMED “Đã có vé”; CASH_RECEIVED_PENDING_RECONCILIATION “Đã thu tiền, cần đối soát”; PAID_REVIEW “Đã nhận tiền, cần xử lý”; REFUND_PENDING “Chờ hoàn tiền”; REFUNDED “Đã xác nhận hoàn”; CANCELLATION_PENDING “Đang hủy”; PENDING “Đang chuẩn bị”.
- Item ACTIVE/OPERATION_PENDING/REFUND_PENDING/REFUNDED/VOID/COMPLETED separate from boarding ACTIVE/CHECKED_IN/NO_SHOW/VOID; don't collapse all into paid boolean.
- Operation WAITING_FUNDS “Chờ trả chênh lệch”; COMMITTING “Đang chuyển vé”; REFUND_PENDING “Chờ hoàn chênh lệch”; ABORT_REFUND_PENDING “Đã dừng đổi, chờ hoàn khoản thu”; error≠terminal unless state terminal.

Unknown future state keep neutral badge+raw safe enum string, readonly actions and report adapter issue, don't default success.

## 9. SSO GoID và GoPay portal — cần sửa đúng nơi

### 9.1. SSO sequence

1. App bootstrap GET `/api/v1/auth/session`; guest 401 normal. Auth user fetch GET `/api/v1/me` for profile. Do not reconstruct privilege based email name.
2. Log in button opens `${SSO_ORIGIN}/?redirect_uri=${encodeURIComponent(GOTICKET_ORIGIN+'/auth/return?next=...')}&mode=login` theo auth actual query handler. App SSO hiện nhận `mode=register` cho đăng ký và `action=logout` cho logout; login là chế độ mặc định. Không tự tạo form mật khẩu riêng trong GoTicket.
3. `auth_front-end/src/platform-domains.ts.safeRedirect` hiện allow GoTravel/auth/pay và localhost 3000 **chưa GoTicket/3334**. G4: mở rộng allowlist bằng origin chính xác của domain mới, keep no arbitrary open redirect. Gateway allowed Origins cookie Domains config must support same family domains.
4. Return GET session, validate `next` relative internal path, restore booking draft minimum TTL and resume. No token in URL, no hacking Auth Cookie get Token legacy front service.
5. Approve vendor refresh role POST `/api/v1/auth/refresh-roles` cookie CSRF; refetch session/profile/capabilities; session stale roles real backend still reject until refresh.

### 9.2. GoPay handoff source hiện tại và dependency G3

`payment_portal/server.js` `/launch` allowlist chỉ GoTravel origins; resolves `GET /orders/{id}`, amount order.total; response remembers `gostayOrigin`. Nó **chưa hỗ trợ GoTicket origin và operation ID không phải order ID**. `public/app.js` còn return navigation/copy/channels GoTravel. Do not claim frontend GoTicket can redirect working today.

Cần mở rộng backend portal(server + UI adapter) trong giai đoạn tích hợp:
- Launch hợp lệ `{resourceKind:'GOCAR_TICKET'|'GOCAR_EXCHANGE',resourceId,returnPath?}` hoặc versioned contract tương đương. Existing GoTravel `{orderId}` giữ tương thích. Đây là **proposed contract, chưa có endpoint body này ở source hiện tại**.
- Server verify current buyer/session, for normal order trusted Cart read, for operation public scoped operation view and trusted payment creation reads backend Cart summary. Browser amount ignored; difference invoice from GoPay/Cart authoritative. No exposing Cart internal API cho JavaScript.
- Store opaque one-use/short lifetime handoff bound session/user/resource kind/resource id, return origin allowlist; direct `/pay` without launch shows 404 as existing. Return path white list GoTicket order/operation progress, no arbitrary URL.
- Existing PAYMENT create body `{orderId: orderId thật hoặc operationId}` backend GOCAR_EXCHANGE dispatch ready in source; validate portal can read context for op (GET generic order would 404). Payment read GET payments/order/resourceId verified buyer. Không tái sử dụng payment của order gốc thay cho payment chênh lệch.
- ONLINE button VNPAY existing; mock create+mock-pay backend flag isolation only. Simulated transaction vẫn ghi real **test database**money/order/ticket states qua actual GoPay callbacks; never local set paid.
- Provider return/IPN verified by GoPay; return browser does not charge confirm. Portal amount/resource ownership needs server read, no `amount`query trust.
- Existing GoTravel portal stays functional; no frontend GoTravel checkout re implementation. Portal SSO cookie family/coordinated origins/test regression before publish.

### 9.3. KYC và tạo nhà xe — dependency G9

Identity là nguồn hồ sơ pháp lý và duyệt TICKET_VENDOR. Tuy nhiên `car/src/operator/operator.module.ts` vẫn bind use case đăng ký/duyệt **local**. `ProcessOperatorApplicationUseCase` tạo Operator từ đơn local, không gọi Identity; `GetMyOperatorStatusUseCase` cũng đọc dữ liệu local. Vì vậy duyệt Identity chưa chứng minh đã có Operator, và approve local chưa chứng minh đã được cấp TICKET_VENDOR/KYC.

Luồng phải hoàn thiện ở backend: Identity approved → sự kiện hoặc lời gọi server đã xác thực → upsert Operator theo Identity userId với uniqueness/idempotency → trả trạng thái commercial profile. Retry không tạo hai nhà xe; account bị thu quyền/đình chỉ không được bán tiếp. Chọn cơ chế dựa trên hạ tầng hiện có, ghi contract thực sau khi triển khai. Browser chỉ đọc trạng thái và refresh cookie roles, **không tự cấp role/tạo Operator/approve hai lần**. Các endpoint operator-applications local có trong inventory để nhận diện legacy, không trở thành một hệ KYC thứ hai trên UI mới. Chưa có API provision được xác minh trong source; đây là dependency backend, không phải chỉ thay frontend.

## 10. Phát hiện gap/phụ thuộc từ source — model phải xử lý hoặc ghi pending

Các mục đây là required integration gates, không phải API đã tồn tại. Có thể code UI độc lập và read adapters nhưng không tích end-to-end cho đến khi contract nối đủ.

| ID | Chỗ cần đọc/sửa | Vấn đề và cách xử lý |
|---|---|---|
| G1 | `APIGateway/src/gateway/default-config.json`, registry/security schema và config runtime | Prefix trips/operator trong seed yêu cầu JWT dù GoCar detail/stops/seats/public profile có `@Public`. Thêm exact GET public, giữ mutation cần JWT. Chưa thấy route tickets/check-in và staff/me. Không mở mọi method trên trips thành public; runtime registry có thể khác seed. **Đặc biệt lưu ý:** Tuyệt đối không xóa database Gateway (`gateway-registry.sqlite`) để nạp lại route vì sẽ làm mất toàn bộ cấu hình, rate limit và routes đang phục vụ GoTravel. Cần cập nhật registry thông qua luồng quản trị có version (API `POST /api/v1/gateway-admin/routes/batch` hoặc script migration có versioning/revisions) để giữ trọn vẹn cấu hình hiện tại. |
| G2 | Gateway Catalog mapping; Catalog `TransportContentController` | Chưa thấy seed alias cho `/api/v1/catalog/transport/offers/.../content`. Cần authenticated mapping, guard ownership TICKET_VENDOR; không giả role HOST. |
| G3 | `payment_portal/server.js`, `public/app.js`; scoped Cart/GoPay reads | Portal chỉ cho GoTravel launch/return. OperationId không đọc được bằng GET order thông thường. Nối handoff order/operation theo §9.2, giữ body GoTravel cũ tương thích. Ledger backend có source chưa có nghĩa portal tích hợp xong. |
| G4 | `auth_front-end/src/platform-domains.ts`; Gateway origins/cookie config; env GoTicket | GoTicket/localhost:3334 chưa được SSO safeRedirect cho phép. Thêm origin chính xác sau khi chốt domain, không wildcard/open redirect/token URL. Thay source config khác áp dụng config live. |
| G5 | Cart paged orders; Catalog admin listings; Payment paged payouts | Chưa xác minh được server filter transport cho các danh sách dùng chung. Thêm filter theo discriminator thực của service, paginate/totals sau filter và authorization; request bỏ filter vẫn tương thích GoTravel. Không client-filter một page rồi coi là đủ lịch sử/tổng số. |
| G6 | GoCar read projections; Identity/vendor finance contracts cần thiết | Chưa có contract được xác minh cho public operator list, route detail, vendor offer list/staff lookup, admin all-trips/order detail đầy đủ và bank CRUD cho vendor. Không có archive/delete trip đã xác minh. Chỉ thêm tối thiểu cần cho màn đã chốt; tính năng phụ thiếu API ghi pending, không gọi ADMIN/HOST API thay quyền vendor. |
| G7 | Cart CashLedger/ShiftDetail/JdbcCashLedger; finance read projections | Rà soát shift detail đủ receipt gốc, thu chênh lệch, hoàn tiền mặt và commission sau item operations. Nếu response chỉ chứa receipt ban đầu thì mở rộng projection. Chỉ summary không đủ lịch sử movements; evidence/refund view phải đúng quyền, không gọi internal ledger từ browser. |
| G8 | Backend completion E3/E4/A-R21; migrations và generated models | Source chưa build/generate/migrate/kiểm chứng. Lỗi tĩnh cụ thể: `TransportOrderController.java` dùng List nhưng mới import UUID, thiếu `java.util.List`. Cần xác minh Prisma generation, Feign scanning, MapStruct signatures/hooks và SQL constraints trước tuyên bố API chạy. Đợt tài liệu này không sửa backend hoặc chạy test. |
| G9 | Identity `UserService.reviewTicketVendorApplication`; GoCar `operator.module.ts`, local application use cases/repositories | Identity approval chỉ cập nhật profile/role; GoCar local approve tạo Operator độc lập. Nối server provision/sync idempotent theo Identity userId với live authorization và uniqueness. Identity là nguồn KYC; không hai hệ approve, không browser tự tạo Operator. U11/A02 và onboarding nhà xe còn dependency này. |

Không dùng G6 để mở rộng tính năng không giới hạn: ưu tiên routes/scopes/payment adapter và read projections cần cho các trang đã chốt. Nếu API thiếu, mở checklist backend dependency và ghi exact file/contract; không ghi “hoàn thành UI” bằng placeholder button.

## 11. API mapping theo chức năng (browser paths)

API_REFERENCE là đầy đủ method/signature; bảng này là map nhanh. GoCar backend prefix không`/api/v1`; **browser Gateway có`/api/v1`**. Khi G1/G2 chưa được áp dụng, một số route ở bảng dưới chỉ là alias dự kiến, phải đọc note để không coi là runtime working.

| Module | Browser calls |
|---|---|
| session | GET auth/session, POST auth/logout/refresh-roles; đăng nhập tại SSO |
| discovery | GET routes/locations, GET trips/search |
| booking | GET trips/:id + seats/stops; POST orders/transport/checkout; GET orders/:id; POST transport/:id/cancel-unpaid |
| tickets | GET orders paged/detail; POST ticket-email/resend; item amend/history/preview/cancel/exchange; operation read/retry/abort |
| payment | POST {PAY_ORIGIN}/launch (G3); GET payments/order/:resourceId, GET payments/:id; POST payments/create by portal; mock isolated only |
| profile/KYC | GET/PUT me/profile + me; POST me/avatar; GET me/ticket-vendor-profile; POST/PUT me/ticket-vendor-application |
| fleet | GET/POST cars, GET/PATCH cars/:id, PATCH status, PUT cars/:id/seats |
| route/stops | GET/POST routes,PATCH route/status; operators/me/stops CRUD+PATCH archive |
| trips | GET/POST trips, GET manage/PATCH draft/PUT stops/class-prices/seat-blocks/lifecycle; POST publish/stop/resume/cancel |
| staff | GET operators/me/staff, PUT staff/:userId; GET staff/me/assignments/trips (G1) |
| boarding | GET trips/:id/manifest, POST tickets/check-in (G1), POST trip/ticket/no-show |
| counter/shifts | transport/cash/checkout/order receive/cancel, shifts mine/list/detail/open/close; item cash-topup/cash-refund + counter ticket document |
| offers/reviews | PUT catalog/transport/offers/:id/content (G2), GET catalog/listings/:id/reviews, POST catalog/reviews |
| vendor reports | GET orders/transport/vendor/reports, scoped orders list/detail |
| finance | GET payouts/me, POST payouts/transport/:id/withdraw; admin proof/cash summary/commission |
| admin | Identity vendor approval/accounts, operators status, catalog moderation, transport attention/refunds/item ops/exchanges/cancel/reconcile/notifications/reports |

## 12. Media và bảo vệ dữ liệu

Các route Node Media qua Gateway yêu cầu session/JWT, CSRF cho mutation. Contract lấy từ `cloudinary-service/src/routes/media.routes.js`, `middlewares/upload.middleware.js`, `controllers/media.controller.js` và `utils/mediaOwnership.js`:

| Method/path | Request | Response payload trong `data` |
|---|---|---|
| POST `/api/v1/media/upload` | FormData `file`, ảnh jpg/jpeg/png/webp ≤10 MiB; `folder` tùy chọn | `{url,publicId,resourceType,folder,ownerId}` |
| POST `/api/v1/media/upload/bulk` | FormData `files` lặp, tối đa 10 ảnh, mỗi ảnh ≤10 MiB; `folder` tùy chọn | `{url:[...],publicIds:[...],resourceTypes:[...],folder,ownerId}`; chú ý `url` là mảng |
| POST `/api/v1/media/upload/secure-documents` | FormData `files` lặp, tối đa 2 ảnh jpeg/png/webp, mỗi ảnh ≤10 MiB | `{urls,documentIds}`; **TICKET_VENDOR bị chặn secure upload này** |
| DELETE `/api/v1/media` | JSON `{publicId,resourceType?,deliveryType?}`; resourceType image/video/raw, deliveryType upload/private | Envelope xác nhận xóa; ownership server kiểm tra |

TICKET_VENDOR upload ảnh công khai trong namespace `transport/{userId}/{requestedFolder}` do server quyết định; chỉ xóa media thuộc phạm vi được cấp. Không gửi ownerId/userId giả. Không tự xóa ảnh cũ trước khi backend đã cập nhật bản ghi. KYC sử dụng multipart Identity `frontImage/backImage`, không dùng ảnh secure làm logo. Avatar qua Identity endpoint riêng. Chỉ lưu URL/publicId do server trả; blob URL chỉ để preview cục bộ, không làm evidence/thumbnail backend.

FormData không tự đặt Content-Type, vẫn gửi credentials/CSRF. 413 báo giới hạn dung lượng; preview dùng object URL phải revoke; ảnh có width/height để tránh nhảy layout. Giữ nguồn/giấy phép ảnh trong ASSET_SOURCES khi chọn asset thực.

Không đưa QR, liên hệ hành khách, ảnh căn cước vào analytics/log hoặc persistent cache. Draft tên/liên hệ nếu cần chỉ lưu sessionStorage có TTL và xóa sau checkout/logout; không lưu credentials nhà cung cấp payment. Staff chỉ nhận dữ liệu trong scope backend cấp. Camera chỉ xin quyền khi bấm quét; giải mã trên máy người dùng, không gửi video/QR tới dịch vụ bên ngoài.

## 13. Environment / rename / runtime

Đã đổi `car_front-end`→`front-end-goticket`, `package.json.name`, HTML title, paths in`car.sh` and`deploy/ecosystem.config.cjs`. PM2 process names`gocar-frontend`/`gocar-service` giữ để không duplicate process. **Không restart/save delete PM2 hoặc start frontend** trong đợt tài liệu này. Các Git paths deletion/addition normal after rename; source cũ vẫn trong new folder.

Env frontend đề xuất khi code (không ghi giá trị secret):

```dotenv
VITE_API_BASE_URL=/api/v1
VITE_SSO_ORIGIN=http://localhost:3335
VITE_PAY_ORIGIN=http://localhost:3336
VITE_GOTICKET_ORIGIN=http://localhost:3334
VITE_GOTRAVEL_ORIGIN=http://localhost:3000
VITE_APP_MODE=development
```

`VITE_*` là public bundled config, không JWT/internal keys/provider secrets. Production exact domains được chủ dự án tạo và map Cloudflare sau này; không tự đoán domain GoTicket theo các domain cũ. Reuse 3334, backend 3333 off; future dev bind `127.0.0.1`, allowedHosts allowlist strict, current old Vite host true source **chưa sửa** (planned runtime hardening before start). Routing SPA return needs fallback index.html, API never rewrite to HTML.

Tên backend/internal business kind unchanged; UI name GoTicket not new independent identity/payment stack. Do not create another new worktree running parallel or mix PM2 cwd old new. Dependencies node_modules moved with directory ignored git, do not commit dist/node_modules.

## 14. Performance / delivery details

Lazy chunks customer/operator/staff/admin; QR/camera/scanner/charts loaded when used. Hero one optimized image with width height+preloadonlyfirst; others lazy. No auth wait blocking public home page; session checks background while guarded routes wait. Debounce filters, paginated tables, chỉ virtualize khi có danh sách lớn thực sự; no async InfiniteScroll when page contract only.

Reusable component checklist: Location Combobox, TravelDatePicker, SearchStrip, Trip Result Row, Fare Summary, Seat Button/Seat Grid/Seat Legend, Passenger Form, Stop Picker, Hold Countdown, Payment Handoff Panel, Operation Timeline, Ticket Document/QR, Status Badge, Permission Boundary, Paged Table, Filter Bar, Proof Form, Shift Summary, Manifest Row, Empty State/Error State, Confirm Dialog, Toast for secondary actions.

Every page must own loading/empty/error/forbidden/partial/stale/success states; client error boundary gives retry/help without database error stack. Một route chỉ có placeholder/navigation chưa phải trang hoàn chỉnh. Title/meta for customer pages, private pages noindex where hosting supports. Copy Vietnamese UTF8 correct, no mixed English business state words where UI label available.

## 15. Kế hoạch kiểm chứng (để khi chủ dự án cho phép)

Hiện không chạy build/test/E2E/live calls. Khi được yêu cầu: verify bounded passes và các gate cụ thể, không loop broad optional tests. Draft UI with fixtures can help layout, **must clearly isolated preview**, not backend-success proof.

1. Typecheck/build frontend và backend generate/compile prerequisites (G8), no SMTP/bank network.
2. Isolated service DB migrations→API adapter contracts response errors/pagination/money/timezone.
3. Critical flows: seat selection un held vs checkout held; expired/late paid; duplicated stable checkout key; callback paid before issuance; mixed order after exchange; QR old revoked; partial refund/cash proof fenced; scoped staff changes/revocation; admin actual evidence.
4. SSO redirect cookie CSRF both GoTravel/GoTicket, allowed origins, no open redirect; GoPay normal/operation launch separate+legacy GoTravel regression.
5. Responsive/keyboard/camera permission/reduced motion/slow-network with desktop+mobile batch; fix real issues one batch, at most one confirmation pass per impeccable. No artifacts synthetic transaction mail to real people.
6. Do not open customer public until release gates passed; use approved private preview deployment only.

Acceptance examples (not mirror implementation tests): two people compete same Seat only one confirmed; reload held order doesn't extend timer; bank payment received after abort opens refund liability; same item exchange repeated doesn'tdoublecharge; wrong scope GET/proof not show QR/other operator finance; backend unavailability can't mark paid; original charge+delta−actual refund reconcile exact net.

## 16. Checklist triển khai và bàn giao tiếp tục

### P0 — chuẩn bị và bàn giao

- [x] P0.1 Đổi folder thành `front-end-goticket`, package/title và launcher paths; giữ source cũ.
- [x] P0.2 Viết thiết kế từng trang, API/DTO inventory và prompt cho model tiếp theo.
- [x] P0.3 Ghi G1–G9; phân biệt source hiện có, contract đề xuất và runtime chưa kiểm chứng.
- [x] P0.4 Đọc git status/source, chọn domain/brand asset thực (`src/assets/travel/*`), giữ toàn bộ thay đổi backend đang có.
- [x] P0.5 Thay router/auth adapter cũ; xây HttpPort, response decoder, money/date utilities (`MoneyVo`, `DateVo`, `HttpPort.ts`) và public env.

### P1 — shell, session và tìm chuyến

- [x] P1.1 Customer/Operator/Staff/Admin shells, shared tokens/components và responsive states (`CustomerLayout.tsx`, `OperatorLayout.tsx`, `StaffLayout.tsx`, `AdminLayout.tsx`).
- [x] P1.2 SSO bootstrap/return/logout, normalize roles, capability navigation và allowlist G4 (`auth_front-end/src/platform-domains.ts`, `APIGateway/src/gateway/default-config.json`, `Guards.tsx`).
- [x] P1.3 U01/U02: homepage (`HomePage.tsx`), locations, search với URL filters/pagination/error recovery (`CustomerTripSearchPage.tsx`, `TripSearchForm.tsx`).
- [x] P1.4 Chuẩn bị routes Gateway G1/G2 trong `APIGateway/src/gateway/default-config.json`.
- [x] P1.5 U03: trip detail, seat map, stops, giá và refresh dữ liệu thật (`TripDetailPage.tsx`, `SeatMap.tsx`, `PassengerForm.tsx`).
- [x] P1.6 Nối KYC Identity → Operator provisioning G9 bằng internal upsert theo `userId`; admin chỉ ghi APPROVED sau khi GoCar ACK, retry không tạo trùng operator. Form `/become-operator` và trang admin dùng API KYC Identity.

### P2 — đặt chỗ, thanh toán và vé

- [x] P2.1 U04: checkout stable key, hold server, hủy unpaid và khôi phục khi hết hạn/timeout (`CheckoutPage.tsx`, `BookingService`).
- [x] P2.2 G3: GoPay portal hỗ trợ cả `{orderId}` và `{operationId}`, xác thực phiên/ownership/số tiền qua server, giữ launch GoTravel tương thích và chặn truy cập `/pay` không có session.
- [x] P2.3 U05: có payment return và operation progress bền vững, polling theo trạng thái server, phân biệt thanh toán đã nhận với vé/operation đã hoàn tất.
- [x] P2.4 G5 + U06/U07: lịch sử lọc `GOCAR_TICKET` và phân trang tại Cart, chi tiết/QR thật, hủy từng item, in vé và gửi lại email qua outbox.
- [x] P2.5 U08/U09: sửa tên hành khách/điểm đón trả bằng commandId bền vững, xem lịch sử/revision, retry ATTENTION/CONFLICT; preview/hủy từng vé và theo dõi operation/refund (`AmendTicketPage.tsx`, `CustomerOrderDetailPage.tsx`).
- [x] P2.6 U10: đổi ghế/chuyến cùng nhà xe, preview delta, thanh toán chênh lệch bằng operationId, theo dõi durable recovery và chỉ dùng QR revision mới sau commit.
- [x] P2.7 U11: gửi review cho chuyến đã COMPLETED, tạo/xem dispute, profile/avatar và KYC Identity đúng scope; admin xem đủ giấy tờ KYC.

### P3 — nhà xe và nhân viên

- [x] P3.1 O01/O02: dashboard, cars/status và visual editor sơ đồ ghế tương tác (`OperatorDashboardPage.tsx`, `OperatorCarListPage.tsx`, `OperatorSeatLayoutPage.tsx`).
- [x] P3.2 O03: tạo/sửa/lưu trữ master stops, tạo/sửa/khóa tuyến theo DTO thực và giữ snapshot vé lịch sử (`OperatorStopsPage.tsx`, `OperatorRouteListPage.tsx`).
- [x] P3.3 O04: draft/manage/stops/class pricing/blocks/publish/stop/resume/lifecycle/cancel trip (`OperatorTripListPage.tsx`, `OperatorTripManagePage.tsx`).
- [x] P3.4 O05: vendor orders phân trang và chi tiết đúng scope (`OperatorOrdersPage.tsx`).
- [x] P3.5 O06: cash counter 2-step, chỉ xác nhận xuất vé khi đơn CONFIRMED/COMPLETED (`OperatorCounterPage.tsx`).
- [x] P3.6 O07 + G7: mở/đóng ca theo chuyến, counted amount và phạm vi nhân viên (`OperatorShiftsPage.tsx`).
- [x] P3.7 O08: staff assignments gửi boolean permissions (`canSellCash`, `canCheckIn`, `active`...) và AuthService đọc mảng assignments (`OperatorStaffPage.tsx`, `AuthService.ts`).
- [x] P3.8 O09: nhập token, camera QR decoder, hàng đợi tạm khi mất mạng, manifest và no-show (`StaffCheckInPage.tsx`).
- [x] P3.9 O10: commercial profile, offer content, vendor report và payout/withdraw vận tải (`OperatorProfilePage.tsx`, `OperatorOfferContentPage.tsx`, `OperatorReportsPage.tsx`).

### P4 — admin

- [x] P4.1 A01–A04: transport overview/report, Identity KYC + provisioning, operator suspension và Catalog moderation TRANSPORT.
- [x] P4.2 A05–A08: orders/attention, item operation retry/abort và hoàn tiền có chứng từ đúng endpoint.
- [x] P4.3 A09–A12: trip cancellation/lifecycle, legacy assisted exchange, reconciliation note và outbox retry.
- [x] P4.4 A13–A15: net payout proof, cash commission settlement, Identity accounts/roles và policy readonly khi chưa có API cấu hình.

### P5 — kiểm chứng và phát hành khi được yêu cầu

- [ ] P5.1 G8: **đã generate Prisma, compile/package production và áp dụng migration có backup ngày 12/10/2026**; còn test race/fault/regression và cập nhật test fixture Cart trước khi tích hoàn toàn.
- [ ] P5.2 Kiểm chứng các luồng quan trọng ở §15, accessibility/responsive và GoTravel regression.
- [x] P5.3 Cấu hình origin/SSO/GoPay production, Gateway live registry, SPA fallback và cổng runtime; smoke check HTTP đạt.
- [x] P5.4 Đã build và bật preview PM2 theo yêu cầu chủ dự án: backend `127.0.0.1:3333`, frontend `127.0.0.1:3334`; tunnel hiện hữu tiếp tục chạy.

Mỗi ô [x] phải ghi  file/API/nốiGdependency/status verification. Bàn giao mỗi lượt:

```text
Đã làm: P?.?, files...
API thực nối: methods/paths..., endpoint decoder...
Backend/Gateway/portal thay đổi: files, proposed/implemented/applied trạng thái...
Chưa xong: IDs và đúng hàm/file đang dở...
Chưa kiểm chứng: cụ thể gates...
Bước kế tiếp: một task đủ bắt đầu, giữ stable keys và working tree hiện tại...
```

## 17. Những lỗi model tiếp theo tuyệt đối phải tránh

1. Đổi UI brand thành GoTicket rồi đổi orderKind/Gateway service key để match name.
2. Copy API reference GoTicket external vào actual ecosystem adapter.
3. Treat seats selected as HELD, reset 15 min on refresh, mint payment/QR from browser.
4. Whole order paid cancel/refund cho one item, old parent trip after exchange, old QR reused.
5. Cash guest=unauthorized public cash checkout; staff allTrips=finance permission; TICKET_VENDOR=HOST.
6. Operation topup dùng old orderId/full new fare, GoPay launch assumptions with generic order read.
7. Shared all types paged list client filter called complete GoTicket history/admin finance.
8. Public backend@Public assumed Gateway public; fallback direct backend when routing missing.
9. Add Delete Trip/Route Detail/Offers List/Staff Invite/Bank/Coupon UI with invented backend URLs.
10. Mark REFUNDED/PAID by query/animation/optimistic button, fake proof/replay new reference.
11. Public QR in manifest/table/email images external, storing JWT localStorage, including internal keys in VITE env.
12. Claim completed/production ready before backend compile/migration/isolated critical flow gates.

## 18. Danh mục toàn bộ API source tham chiếu

Bên dưới là **compact inventory toàn bộ 260 khai báo controller đã thu thập**: GoCar + Cart/Identity/Catalog/GoPay liên quan + internal Inventory. Có endpoint GoTravel/host/callback/internal trong controller dùng chung; **không phải 260 API đều cho GoTicket frontend**. §5–7/11 chỉ API đúng phạm vi; API_REFERENCE/DTO_REFERENCE chứa signature/validators chi tiết, source được link. Inventory mới chưa runtime verified. Node Gateway/portal/Media thêm ở§9/12 và API_REFERENCE.

### car

| Method | Backend path | Browser alias / trạng thái | Handler |
|---|---|---|---|
| GET | `/` | `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp` | `getHello` |
| GET | `/api/v1/internal/car/staff/authorize` | `INTERNAL — trình duyệt không được gọi` | `authorize` |
| GET | `/api/v1/internal/car/staff/authorize-operator` | `INTERNAL — trình duyệt không được gọi` | `authorizeOperator` |
| GET | `/api/v1/internal/car/staff/read-scope` | `INTERNAL — trình duyệt không được gọi` | `getReadScope` |
| PUT | `/api/v1/internal/car/transport/item-operations/:id/abort` | `INTERNAL — trình duyệt không được gọi` | `abort` |
| PUT | `/api/v1/internal/car/transport/item-operations/:id/commit` | `INTERNAL — trình duyệt không được gọi` | `commit` |
| PUT | `/api/v1/internal/car/transport/item-operations/:id/prepare` | `INTERNAL — trình duyệt không được gọi` | `prepare` |
| GET | `/api/v1/internal/car/transport/orders/:orderId/tickets` | `INTERNAL — trình duyệt không được gọi` | `orderTickets` |
| POST | `/api/v1/internal/car/transport/quote` | `INTERNAL — trình duyệt không được gọi` | `quote` |
| POST | `/api/v1/internal/car/transport/quotes/:quoteId/claim` | `INTERNAL — trình duyệt không được gọi` | `claimQuote` |
| POST | `/api/v1/internal/car/transport/tickets` | `INTERNAL — trình duyệt không được gọi` | `issueTickets` |
| POST | `/api/v1/internal/car/transport/tickets/amend` | `INTERNAL — trình duyệt không được gọi` | `amendTicket` |
| POST | `/api/v1/internal/car/transport/tickets/void-order/:orderId` | `INTERNAL — trình duyệt không được gọi` | `voidTickets` |
| GET | `/api/v1/internal/car/transport/trips/:tripId/state` | `INTERNAL — trình duyệt không được gọi` | `tripState` |
| GET | `/cars` | `/api/v1/cars` | `getCars` |
| POST | `/cars` | `/api/v1/cars` | `addCar` |
| PUT | `/cars/:carId/seats` | `/api/v1/cars/:carId/seats` | `replaceSeatTemplate` |
| GET | `/cars/:id` | `/api/v1/cars/:id` | `getCarDetail` |
| PATCH | `/cars/:id` | `/api/v1/cars/:id` | `updateCar` |
| PATCH | `/cars/:id/status` | `/api/v1/cars/:id/status` | `updateCarStatus` |
| GET | `/me` | `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp` | `getMe` |
| GET | `/operator-applications` | `/api/v1/operator-applications` | `getApplications` |
| POST | `/operator-applications` | `/api/v1/operator-applications` | `requestOperator` |
| PATCH | `/operator-applications/:id/approve` | `/api/v1/operator-applications/:id/approve` | `approveApplication` |
| PATCH | `/operator-applications/:id/process` | `/api/v1/operator-applications/:id/process` | `processApplication` |
| PATCH | `/operator-applications/:id/reject` | `/api/v1/operator-applications/:id/reject` | `rejectApplication` |
| GET | `/operator-applications/me` | `/api/v1/operator-applications/me` | `getMyStatus` |
| GET | `/operators` | `/api/v1/operators` | `getOperators` |
| GET | `/operators/:operatorId/profile` | `/api/v1/operators/:operatorId/profile` | `getPublicProfile` |
| PATCH | `/operators/:operatorId/status` | `/api/v1/operators/:operatorId/status` | `updateOperatorStatus` |
| GET | `/operators/me/profile` | `/api/v1/operators/me/profile` | `getMyProfile` |
| PATCH | `/operators/me/profile` | `/api/v1/operators/me/profile` | `updateMyProfile` |
| GET | `/operators/me/staff` | `/api/v1/operators/me/staff` | `listStaff` |
| PUT | `/operators/me/staff/:userId` | `/api/v1/operators/me/staff/:userId` | `assign` |
| GET | `/operators/me/stops` | `/api/v1/operators/me/stops` | `findMany` |
| POST | `/operators/me/stops` | `/api/v1/operators/me/stops` | `create` |
| GET | `/operators/me/stops/:stopId` | `/api/v1/operators/me/stops/:stopId` | `findById` |
| PATCH | `/operators/me/stops/:stopId` | `/api/v1/operators/me/stops/:stopId` | `update` |
| PATCH | `/operators/me/stops/:stopId/archive` | `/api/v1/operators/me/stops/:stopId/archive` | `archive` |
| GET | `/routes` | `/api/v1/routes` | `getRoutes` |
| POST | `/routes` | `/api/v1/routes` | `createRoute` |
| PATCH | `/routes/:id` | `/api/v1/routes/:id` | `updateRoute` |
| PATCH | `/routes/:id/status` | `/api/v1/routes/:id/status` | `updateRouteStatus` |
| GET | `/routes/locations` | `/api/v1/routes/locations` | `getLocations` |
| GET | `/staff/me/assignments` | `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp` | `getAssignments` |
| GET | `/staff/me/trips` | `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp` | `getAssignedTrips` |
| POST | `/tickets/check-in` | `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp` | `checkIn` |
| GET | `/trips` | `/api/v1/trips` | `getTrips` |
| POST | `/trips` | `/api/v1/trips` | `createTrip` |
| PATCH | `/trips/:id/draft` | `/api/v1/trips/:id/draft` | `updateDraftTrip` |
| GET | `/trips/:id/manage` | `/api/v1/trips/:id/manage` | `getManageTripDetail` |
| PATCH | `/trips/:id/status` | `/api/v1/trips/:id/status` | `updateTripStatus` |
| PUT | `/trips/:id/stops` | `/api/v1/trips/:id/stops` | `setTripStops` |
| GET | `/trips/:tripId` | `/api/v1/trips/:tripId` | `detail` |
| POST | `/trips/:tripId/admin-cancellation` | `/api/v1/trips/:tripId/admin-cancellation` | `adminCancel` |
| PUT | `/trips/:tripId/admin-lifecycle` | `/api/v1/trips/:tripId/admin-lifecycle` | `adminLifecycle` |
| POST | `/trips/:tripId/cancel` | `/api/v1/trips/:tripId/cancel` | `cancelTrip` |
| PUT | `/trips/:tripId/class-prices` | `/api/v1/trips/:tripId/class-prices` | `pricing` |
| PUT | `/trips/:tripId/lifecycle` | `/api/v1/trips/:tripId/lifecycle` | `lifecycle` |
| GET | `/trips/:tripId/manifest` | `/api/v1/trips/:tripId/manifest` | `manifest` |
| POST | `/trips/:tripId/publish` | `/api/v1/trips/:tripId/publish` | `publish` |
| POST | `/trips/:tripId/resume-sale` | `/api/v1/trips/:tripId/resume-sale` | `resume` |
| PUT | `/trips/:tripId/seat-blocks` | `/api/v1/trips/:tripId/seat-blocks` | `blockSeats` |
| GET | `/trips/:tripId/seats` | `/api/v1/trips/:tripId/seats` | `seatMap` |
| POST | `/trips/:tripId/stop-sale` | `/api/v1/trips/:tripId/stop-sale` | `stopSale` |
| GET | `/trips/:tripId/stops` | `/api/v1/trips/:tripId/stops` | `stops` |
| POST | `/trips/:tripId/tickets/:ticketId/no-show` | `/api/v1/trips/:tripId/tickets/:ticketId/no-show` | `noShow` |
| GET | `/trips/search` | `/api/v1/trips/search` | `searchTrips` |

### cart

| Method | Backend path | Browser alias / trạng thái | Handler |
|---|---|---|---|
| GET | `/api/v1/internal/orders/transport/item-operations/{id}` | `INTERNAL — trình duyệt không được gọi` | `get` |
| GET | `/api/v1/internal/orders/transport/item-operations/{id}/cash-proof` | `INTERNAL — trình duyệt không được gọi` | `cash` |
| GET | `/api/v1/internal/orders/transport/item-operations/{id}/refund-proof` | `INTERNAL — trình duyệt không được gọi` | `refund` |
| GET | `/api/v1/internal/orders/transport/trips/{tripId}/cancellation` | `INTERNAL — trình duyệt không được gọi` | `progress` |
| PUT | `/api/v1/internal/orders/transport/trips/{tripId}/cancellation` | `INTERNAL — trình duyệt không được gọi` | `request` |
| PUT | `/api/v1/internal/orders/transport/trips/{tripId}/complete` | `INTERNAL — trình duyệt không được gọi` | `complete` |
| GET | `/api/v1/internal/orders/users/{userId}/listings/{listingId}/completed` | `INTERNAL — trình duyệt không được gọi` | `hasCompletedListingOrder` |
| PUT | `/api/v1/internal/orders/{orderId}/payment-failed` | `INTERNAL — trình duyệt không được gọi` | `handlePaymentFailed` |
| PUT | `/api/v1/internal/orders/{orderId}/payment-review` | `INTERNAL — trình duyệt không được gọi` | `handlePaymentReview` |
| PUT | `/api/v1/internal/orders/{orderId}/payment-success` | `INTERNAL — trình duyệt không được gọi` | `handlePaymentSuccess` |
| GET | `/api/v1/internal/orders/{orderId}/payment-summary` | `INTERNAL — trình duyệt không được gọi` | `getPaymentSummary` |
| GET | `/api/v1/internal/orders/{orderId}/transport-fulfillment` | `INTERNAL — trình duyệt không được gọi` | `getTransportFulfillment` |
| GET | `/api/v1/orders` | `/api/v1/orders` | `getUserOrders` |
| GET | `/api/v1/orders/admin` | `/api/v1/orders/admin` | `getAdminOrders` |
| GET | `/api/v1/orders/admin/disputes` | `/api/v1/orders/admin/disputes` | `getAdminDisputes` |
| PUT | `/api/v1/orders/admin/disputes/{disputeId}/resolve` | `/api/v1/orders/admin/disputes/:disputeId/resolve` | `resolveDispute` |
| GET | `/api/v1/orders/admin/summary` | `/api/v1/orders/admin/summary` | `getAdminSummary` |
| PUT | `/api/v1/orders/admin/{orderId}/force-cancel` | `/api/v1/orders/admin/:orderId/force-cancel` | `forceCancelOrder` |
| POST | `/api/v1/orders/book-now` | `/api/v1/orders/book-now` | `bookNow` |
| GET | `/api/v1/orders/check-purchased/{listingId}` | `/api/v1/orders/check-purchased/:listingId` | `checkPurchased` |
| POST | `/api/v1/orders/checkout-cart` | `/api/v1/orders/checkout-cart` | `checkoutCart` |
| GET | `/api/v1/orders/disputes` | `/api/v1/orders/disputes` | `getMyDisputes` |
| POST | `/api/v1/orders/disputes` | `/api/v1/orders/disputes` | `createDispute` |
| GET | `/api/v1/orders/host` | `/api/v1/orders/host` | `getHostOrders` |
| GET | `/api/v1/orders/transport/admin/attention` | `/api/v1/orders/transport/admin/attention` | `attention` |
| POST | `/api/v1/orders/transport/admin/exchanges` | `/api/v1/orders/transport/admin/exchanges` | `exchange` |
| GET | `/api/v1/orders/transport/admin/exchanges/exceptions` | `/api/v1/orders/transport/admin/exchanges/exceptions` | `exchangeExceptions` |
| GET | `/api/v1/orders/transport/admin/exchanges/{oldOrderId}` | `/api/v1/orders/transport/admin/exchanges/:oldOrderId` | `exchangeStatus` |
| POST | `/api/v1/orders/transport/admin/exchanges/{oldOrderId}/resolve-exception` | `/api/v1/orders/transport/admin/exchanges/:oldOrderId/resolve-exception` | `resolveExchange` |
| GET | `/api/v1/orders/transport/admin/item-operations/attention` | `/api/v1/orders/transport/admin/item-operations/attention` | `attention` |
| POST | `/api/v1/orders/transport/admin/item-operations/{id}/abort` | `/api/v1/orders/transport/admin/item-operations/:id/abort` | `adminAbort` |
| POST | `/api/v1/orders/transport/admin/item-operations/{id}/refund` | `/api/v1/orders/transport/admin/item-operations/:id/refund` | `refund` |
| POST | `/api/v1/orders/transport/admin/item-operations/{id}/retry` | `/api/v1/orders/transport/admin/item-operations/:id/retry` | `adminRetry` |
| GET | `/api/v1/orders/transport/admin/notifications` | `/api/v1/orders/transport/admin/notifications` | `notifications` |
| POST | `/api/v1/orders/transport/admin/notifications/{eventId}/retry` | `/api/v1/orders/transport/admin/notifications/:eventId/retry` | `retryNotification` |
| GET | `/api/v1/orders/transport/admin/reconciliation` | `/api/v1/orders/transport/admin/reconciliation` | `findings` |
| PUT | `/api/v1/orders/transport/admin/reconciliation/{orderId}/refresh` | `/api/v1/orders/transport/admin/reconciliation/:orderId/refresh` | `refresh` |
| POST | `/api/v1/orders/transport/admin/reconciliation/{orderId}/{code}/notes` | `/api/v1/orders/transport/admin/reconciliation/:orderId/:code/notes` | `addReconciliationNote` |
| PUT | `/api/v1/orders/transport/admin/refunds/{orderId}/complete` | `/api/v1/orders/transport/admin/refunds/:orderId/complete` | `complete` |
| PUT | `/api/v1/orders/transport/admin/refunds/{orderId}/open-paid-review` | `/api/v1/orders/transport/admin/refunds/:orderId/open-paid-review` | `openPaidReview` |
| GET | `/api/v1/orders/transport/admin/reports/overview` | `/api/v1/orders/transport/admin/reports/overview` | `overviewReport` |
| GET | `/api/v1/orders/transport/admin/reports/{operatorUserId}` | `/api/v1/orders/transport/admin/reports/:operatorUserId` | `report` |
| GET | `/api/v1/orders/transport/admin/trip-cancellations/{tripId}` | `/api/v1/orders/transport/admin/trip-cancellations/:tripId` | `tripCancellationStatus` |
| POST | `/api/v1/orders/transport/cash/checkout` | `/api/v1/orders/transport/cash/checkout` | `checkout` |
| POST | `/api/v1/orders/transport/cash/orders/{orderId}/cancel-paid` | `/api/v1/orders/transport/cash/orders/:orderId/cancel-paid` | `cancelPaid` |
| POST | `/api/v1/orders/transport/cash/orders/{orderId}/cancel-unpaid` | `/api/v1/orders/transport/cash/orders/:orderId/cancel-unpaid` | `cancelUnpaid` |
| POST | `/api/v1/orders/transport/cash/orders/{orderId}/receive` | `/api/v1/orders/transport/cash/orders/:orderId/receive` | `receive` |
| GET | `/api/v1/orders/transport/cash/shifts` | `/api/v1/orders/transport/cash/shifts` | `listShifts` |
| POST | `/api/v1/orders/transport/cash/shifts` | `/api/v1/orders/transport/cash/shifts` | `openShift` |
| POST | `/api/v1/orders/transport/cash/shifts/close` | `/api/v1/orders/transport/cash/shifts/close` | `closeShift` |
| GET | `/api/v1/orders/transport/cash/shifts/me` | `/api/v1/orders/transport/cash/shifts/me` | `getMyShifts` |
| GET | `/api/v1/orders/transport/cash/shifts/{shiftId}` | `/api/v1/orders/transport/cash/shifts/:shiftId` | `getShiftDetail` |
| POST | `/api/v1/orders/transport/checkout` | `/api/v1/orders/transport/checkout` | `checkout` |
| GET | `/api/v1/orders/transport/item-operations/{id}` | `/api/v1/orders/transport/item-operations/:id` | `get` |
| POST | `/api/v1/orders/transport/item-operations/{id}/abort` | `/api/v1/orders/transport/item-operations/:id/abort` | `abort` |
| POST | `/api/v1/orders/transport/item-operations/{id}/cash-refund` | `/api/v1/orders/transport/item-operations/:id/cash-refund` | `cashRefund` |
| POST | `/api/v1/orders/transport/item-operations/{id}/cash-topup` | `/api/v1/orders/transport/item-operations/:id/cash-topup` | `cash` |
| POST | `/api/v1/orders/transport/item-operations/{id}/retry` | `/api/v1/orders/transport/item-operations/:id/retry` | `retry` |
| GET | `/api/v1/orders/transport/vendor` | `/api/v1/orders/transport/vendor` | `listVendorOrders` |
| GET | `/api/v1/orders/transport/vendor/amendments/attention` | `/api/v1/orders/transport/vendor/amendments/attention` | `listAttentionAmendments` |
| POST | `/api/v1/orders/transport/vendor/amendments/{commandId}/retry` | `/api/v1/orders/transport/vendor/amendments/:commandId/retry` | `retryAmendment` |
| GET | `/api/v1/orders/transport/vendor/reports` | `/api/v1/orders/transport/vendor/reports` | `vendorReport` |
| GET | `/api/v1/orders/transport/vendor/{orderId}` | `/api/v1/orders/transport/vendor/:orderId` | `getVendorOrderDetail` |
| GET | `/api/v1/orders/transport/vendor/{orderId}/items/{itemId}/ticket-document` | `/api/v1/orders/transport/vendor/:orderId/items/:itemId/ticket-document` | `counterTicket` |
| POST | `/api/v1/orders/transport/{orderId}/cancel-paid` | `/api/v1/orders/transport/:orderId/cancel-paid` | `cancelPaid` |
| POST | `/api/v1/orders/transport/{orderId}/cancel-unpaid` | `/api/v1/orders/transport/:orderId/cancel-unpaid` | `cancelUnpaid` |
| GET | `/api/v1/orders/transport/{orderId}/cancellation-preview` | `/api/v1/orders/transport/:orderId/cancellation-preview` | `cancellationPreview` |
| POST | `/api/v1/orders/transport/{orderId}/items/{itemId}/amend` | `/api/v1/orders/transport/:orderId/items/:itemId/amend` | `amend` |
| GET | `/api/v1/orders/transport/{orderId}/items/{itemId}/amendments` | `/api/v1/orders/transport/:orderId/items/:itemId/amendments` | `listAmendments` |
| POST | `/api/v1/orders/transport/{orderId}/items/{itemId}/cancel` | `/api/v1/orders/transport/:orderId/items/:itemId/cancel` | `cancel` |
| POST | `/api/v1/orders/transport/{orderId}/items/{itemId}/exchange` | `/api/v1/orders/transport/:orderId/items/:itemId/exchange` | `exchange` |
| POST | `/api/v1/orders/transport/{orderId}/items/{itemId}/operation-preview` | `/api/v1/orders/transport/:orderId/items/:itemId/operation-preview` | `preview` |
| GET | `/api/v1/orders/{orderId}` | `/api/v1/orders/:orderId` | `getOrderDetails` |
| PUT | `/api/v1/orders/{orderId}/cancel` | `/api/v1/orders/:orderId/cancel` | `cancelOrder` |
| POST | `/api/v1/orders/{orderId}/ticket-email/resend` | `/api/v1/orders/:orderId/ticket-email/resend` | `resendTicketEmail` |

### catalog

| Method | Backend path | Browser alias / trạng thái | Handler |
|---|---|---|---|
| GET | `/api/v1/catalog/admin/landmark-suggestions` | `/api/v1/catalog/admin/landmark-suggestions` | `getLandmarkSuggestions` |
| PUT | `/api/v1/catalog/admin/landmark-suggestions/{suggestionId}/status` | `/api/v1/catalog/admin/landmark-suggestions/:suggestionId/status` | `updateSuggestionStatus` |
| GET | `/api/v1/catalog/admin/landmarks` | `/api/v1/catalog/admin/landmarks` | `getLandmarks` |
| POST | `/api/v1/catalog/admin/landmarks` | `/api/v1/catalog/admin/landmarks` | `createLandmark` |
| PUT | `/api/v1/catalog/admin/landmarks/{landmarkId}` | `/api/v1/catalog/admin/landmarks/:landmarkId` | `updateLandmark` |
| PATCH | `/api/v1/catalog/admin/landmarks/{landmarkId}/status` | `/api/v1/catalog/admin/landmarks/:landmarkId/status` | `changeLandmarkStatus` |
| GET | `/api/v1/catalog/admin/listings` | `/api/v1/catalog/admin/listings` | `getListings` |
| PATCH | `/api/v1/catalog/admin/listings/{listingId}/status` | `/api/v1/catalog/admin/listings/:listingId/status` | `changeListingStatus` |
| GET | `/api/v1/catalog/admin/summary` | `/api/v1/catalog/admin/summary` | `getSummary` |
| GET | `/api/v1/catalog/host/complexes` | `/api/v1/catalog/host/complexes` | `getMyComplexes` |
| POST | `/api/v1/catalog/host/complexes` | `/api/v1/catalog/host/complexes` | `createComplex` |
| DELETE | `/api/v1/catalog/host/complexes/{complexId}` | `/api/v1/catalog/host/complexes/:complexId` | `deleteComplex` |
| GET | `/api/v1/catalog/host/complexes/{complexId}` | `/api/v1/catalog/host/complexes/:complexId` | `getMyComplex` |
| PUT | `/api/v1/catalog/host/complexes/{complexId}` | `/api/v1/catalog/host/complexes/:complexId` | `updateComplex` |
| POST | `/api/v1/catalog/host/landmark-suggestions` | `/api/v1/catalog/host/landmark-suggestions` | `suggestLandmark` |
| GET | `/api/v1/catalog/host/listings` | `/api/v1/catalog/host/listings` | `getMyListings` |
| POST | `/api/v1/catalog/host/listings` | `/api/v1/catalog/host/listings` | `createListing` |
| DELETE | `/api/v1/catalog/host/listings/{listingId}` | `/api/v1/catalog/host/listings/:listingId` | `deleteListing` |
| PUT | `/api/v1/catalog/host/listings/{listingId}` | `/api/v1/catalog/host/listings/:listingId` | `updateListing` |
| GET | `/api/v1/catalog/listings/landmarks` | `/api/v1/catalog/listings/landmarks` | `getPublicLandmarks` |
| GET | `/api/v1/catalog/listings/{listingId}` | `/api/v1/catalog/listings/:listingId` | `getListingDetail` |
| GET | `/api/v1/catalog/listings/{listingId}/reviews` | `/api/v1/catalog/listings/:listingId/reviews` | `getListingReviews` |
| POST | `/api/v1/catalog/reviews` | `/api/v1/catalog/reviews` | `submitReview` |
| PUT | `/api/v1/catalog/transport/offers/{listingId}/content` | `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp` | `update` |
| GET | `/api/v1/internal/catalog/transport-offers/active-routes` | `INTERNAL — trình duyệt không được gọi` | `activeRoutes` |
| GET | `/api/v1/internal/catalog/transport-offers/routes/{routeId}` | `INTERNAL — trình duyệt không được gọi` | `get` |
| PUT | `/api/v1/internal/catalog/transport-offers/routes/{routeId}` | `INTERNAL — trình duyệt không được gọi` | `upsert` |

### identity

| Method | Backend path | Browser alias / trạng thái | Handler |
|---|---|---|---|
| GET | `/.well-known/jwks.json` | `CALLBACK — không gọi để giả lập thành công` | `keys` |
| POST | `/api/auth/forgot-password` | `/api/v1/auth/forgot-password` | `forgotPassword` |
| POST | `/api/auth/login` | `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp` | `authenticate` |
| POST | `/api/auth/refresh-roles` | `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp` | `refreshRoles` |
| POST | `/api/auth/reset-password` | `/api/v1/auth/reset-password` | `resetPassword` |
| GET | `/api/users` | `/api/v1/admin/users` | `getAllUser` |
| POST | `/api/users` | `/api/v1/auth/register` | `createUser` |
| PUT | `/api/users/accounts/{accountId}/status` | `/api/v1/admin/accounts/:accountId/status` | `updateBanAccountStatus` |
| GET | `/api/users/admin/summary` | `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp` | `getAdminSummary` |
| DELETE | `/api/users/admin/{id}` | `/api/v1/admin/users/:id` | `deleteAccount` |
| GET | `/api/users/admin/{id}` | `/api/v1/admin/users/:id` | `getUserById` |
| PATCH | `/api/users/admin/{id}` | `/api/v1/admin/users/:id` | `banAccount` |
| GET | `/api/users/enterprises` | `/api/v1/admin/enterprises/approved` | `getAllEnterprisePending` |
| GET | `/api/users/enterprises/all` | `/api/v1/admin/enterprises/all` | `getAllEnterprises` |
| GET | `/api/users/hosts` | `/api/v1/admin/hosts/approved` | `getAllHostPending` |
| GET | `/api/users/hosts/all` | `/api/v1/admin/hosts/all` | `getAllHosts` |
| GET | `/api/users/hosts/{accountId}` | `/api/v1/admin/hosts/:accountId` | `getHostDetail` |
| GET | `/api/users/internal/{userId}/status` | `INTERNAL — trình duyệt không được gọi` | `checkUserStatus` |
| GET | `/api/users/me` | `/api/v1/me` | `getMyInfo` |
| PUT | `/api/users/me` | `/api/v1/me` | `updateMyInfo` |
| POST | `/api/users/me/avatar` | `/api/v1/me/avatar` | `uploadAvatar` |
| GET | `/api/users/me/enterprise-bank-account` | `/api/v1/me/enterprise-bank-account` | `getMyEnterpriseBankAccount` |
| PUT | `/api/users/me/enterprise-bank-account` | `/api/v1/me/enterprise-bank-account` | `updateMyEnterpriseBankAccount` |
| GET | `/api/users/me/enterprise-profile` | `/api/v1/me/enterprise-profile` | `getMyEnterpriseProfile` |
| PUT | `/api/users/me/enterprise-profile` | `/api/v1/me/enterprise-profile` | `updateMyEnterpriseProfile` |
| GET | `/api/users/me/host-bank-account` | `/api/v1/me/host-bank-account` | `getMyHostBankAccount` |
| PUT | `/api/users/me/host-bank-account` | `/api/v1/me/host-bank-account` | `updateMyHostBankAccount` |
| GET | `/api/users/me/host-profile` | `/api/v1/me/host-profile` | `getMyHostProfile` |
| PUT | `/api/users/me/host-profile` | `/api/v1/me/host-profile` | `updateMyHostProfile` |
| GET | `/api/users/me/profile` | `/api/v1/me/profile` | `getMyProfile` |
| PUT | `/api/users/me/profile` | `/api/v1/me/profile` | `updateMyProfile` |
| POST | `/api/users/me/ticket-vendor-application` | `/api/v1/me/ticket-vendor-application` | `applyToTicketVendor` |
| PUT | `/api/users/me/ticket-vendor-application` | `/api/v1/me/ticket-vendor-application` | `updateTicketVendorApplication` |
| GET | `/api/users/me/ticket-vendor-profile` | `/api/v1/me/ticket-vendor-profile` | `getMyTicketVendorProfile` |
| GET | `/api/users/me/upgrade-applications` | `/api/v1/me/upgrade-applications` | `getMyUpgradeApplications` |
| POST | `/api/users/me/upgradetoenterprise` | `/api/v1/me/upgrade-enterprise` | `upgradeToEnterprise` |
| PUT | `/api/users/me/upgradetoenterprise` | `/api/v1/me/upgrade-enterprise` | `updateUpgradeToEnterprise` |
| DELETE | `/api/users/me/upgradetohost` | `/api/v1/me/upgrade-host` | `deleteProfileUpgradeToHost` |
| POST | `/api/users/me/upgradetohost` | `/api/v1/me/upgrade-host` | `upgradeToHost` |
| PUT | `/api/users/me/upgradetohost` | `/api/v1/me/upgrade-host` | `updateUpgradeToHost` |
| GET | `/api/users/ticket-vendors` | `/api/v1/admin/ticket-vendors` | `getTicketVendorApplications` |
| PUT | `/api/users/ticket-vendors/{accountId}/approval` | `/api/v1/admin/ticket-vendors/:accountId/approval` | `reviewTicketVendorApplication` |
| PUT | `/api/users/{accountId}/approvalstatus` | `/api/v1/admin/hosts/:accountId/approval` | `approvalHostStatus` |
| POST | `/api/users/{id}/revokerole` | `/api/v1/admin/users/:id/revokerole` | `revokeRole` |
| POST | `/api/users/{id}/successupgradetoenterprise` | `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp` | `successUpgradeToEnterprise` |
| POST | `/api/users/{id}/successupgradetohost` | `/api/v1/admin/hosts/:id/success` | `successUpgradeToHost` |
| POST | `/api/users/{id}/upgraderole` | `/api/v1/admin/users/:id/role` | `upgradeRole` |

### inventory

| Method | Backend path | Browser alias / trạng thái | Handler |
|---|---|---|---|
| PUT | `/api/v1/internal/inventory/transport/item-operations/{action}` | `INTERNAL — trình duyệt không được gọi` | `apply` |
| GET | `/api/v1/internal/inventory/transport/item-operations/{operationId}` | `INTERNAL — trình duyệt không được gọi` | `get` |
| PUT | `/api/v1/internal/inventory/transport/orders/{orderId}/cancel-sold` | `INTERNAL — trình duyệt không được gọi` | `cancelSold` |
| PUT | `/api/v1/internal/inventory/transport/orders/{orderId}/confirm` | `INTERNAL — trình duyệt không được gọi` | `confirm` |
| PUT | `/api/v1/internal/inventory/transport/orders/{orderId}/release-unpaid` | `INTERNAL — trình duyệt không được gọi` | `releaseUnpaid` |
| GET | `/api/v1/internal/inventory/transport/orders/{orderId}/status` | `INTERNAL — trình duyệt không được gọi` | `orderStatus` |
| GET | `/api/v1/internal/inventory/transport/orders/{orderId}/trips/{tripId}/seats/{seatId}` | `INTERNAL — trình duyệt không được gọi` | `seatOwnership` |
| PUT | `/api/v1/internal/inventory/transport/trips/{tripId}` | `INTERNAL — trình duyệt không được gọi` | `initialize` |
| POST | `/api/v1/internal/inventory/transport/trips/{tripId}/holds` | `INTERNAL — trình duyệt không được gọi` | `reserve` |
| PUT | `/api/v1/internal/inventory/transport/trips/{tripId}/sale-enabled` | `INTERNAL — trình duyệt không được gọi` | `setSaleEnabled` |
| PUT | `/api/v1/internal/inventory/transport/trips/{tripId}/seat-blocks` | `INTERNAL — trình duyệt không được gọi` | `changeSeatBlock` |
| GET | `/api/v1/internal/inventory/transport/trips/{tripId}/seats` | `INTERNAL — trình duyệt không được gọi` | `seats` |

### payment

| Method | Backend path | Browser alias / trạng thái | Handler |
|---|---|---|---|
| PUT | `/api/v1/internal/payments/order/{orderId}/refund` | `INTERNAL — trình duyệt không được gọi` | `refundOrder` |
| GET | `/api/v1/internal/payments/order/{orderId}/status` | `INTERNAL — trình duyệt không được gọi` | `getPaymentStatus` |
| PUT | `/api/v1/internal/payments/order/{orderId}/transport-manual-refund` | `INTERNAL — trình duyệt không được gọi` | `recordManualTransportRefund` |
| PUT | `/api/v1/internal/payments/transport/cash-refund-adjustments/{orderId}` | `INTERNAL — trình duyệt không được gọi` | `recordCashRefundAdjustment` |
| PUT | `/api/v1/internal/payments/transport/cash-settlements/{shiftId}` | `INTERNAL — trình duyệt không được gọi` | `recordCashSettlement` |
| GET | `/api/v1/internal/payments/transport/cash-summary` | `INTERNAL — trình duyệt không được gọi` | `cashSummary` |
| GET | `/api/v1/internal/payments/transport/commission` | `INTERNAL — trình duyệt không được gọi` | `transportCommission` |
| GET | `/api/v1/internal/payments/transport/funds-report` | `INTERNAL — trình duyệt không được gọi` | `report` |
| PUT | `/api/v1/internal/payments/transport/item-operations/{id}/{action}` | `INTERNAL — trình duyệt không được gọi` | `apply` |
| POST | `/api/v1/payments/create` | `/api/v1/payments/create` | `createPayment` |
| POST | `/api/v1/payments/create-mock` | `/api/v1/payments/create-mock` | `createMockPayment` |
| GET | `/api/v1/payments/history` | `/api/v1/payments/history` | `getPaymentHistory` |
| GET | `/api/v1/payments/order/{orderId}` | `/api/v1/payments/order/:orderId` | `getPaymentByOrder` |
| GET | `/api/v1/payments/{paymentId}` | `/api/v1/payments/:paymentId` | `getPayment` |
| POST | `/api/v1/payments/{paymentId}/mock-pay` | `/api/v1/payments/:paymentId/mock-pay` | `mockPaymentSuccess` |
| GET | `/api/v1/payouts/admin/commission` | `/api/v1/payouts/admin/commission` | `getCommissionConfig` |
| PUT | `/api/v1/payouts/admin/commission` | `/api/v1/payouts/admin/commission` | `updateCommissionConfig` |
| GET | `/api/v1/payouts/admin/revenue-report` | `/api/v1/payouts/admin/revenue-report` | `getRevenueReport` |
| GET | `/api/v1/payouts/admin/summary` | `/api/v1/payouts/admin/summary` | `getAdminSummary` |
| GET | `/api/v1/payouts/all` | `/api/v1/payouts/all` | `getAllPayouts` |
| PUT | `/api/v1/payouts/host/{hostId}/mark-paid` | `/api/v1/payouts/host/:hostId/mark-paid` | `markAllAsPaidByHost` |
| GET | `/api/v1/payouts/me` | `/api/v1/payouts/me` | `getMyPayouts` |
| PUT | `/api/v1/payouts/transport/cash-settlements/{shiftId}/mark-paid` | `/api/v1/payouts/transport/cash-settlements/:shiftId/mark-paid` | `markCashCommissionPaid` |
| GET | `/api/v1/payouts/transport/cash-summary` | `/api/v1/payouts/transport/cash-summary` | `cashSummary` |
| PUT | `/api/v1/payouts/transport/{payoutId}/mark-paid` | `/api/v1/payouts/transport/:payoutId/mark-paid` | `markTransportPaid` |
| POST | `/api/v1/payouts/transport/{payoutId}/withdraw` | `/api/v1/payouts/transport/:payoutId/withdraw` | `requestTransportWithdrawal` |
| POST | `/api/v1/payouts/withdraw` | `/api/v1/payouts/withdraw` | `requestWithdrawal` |
| PUT | `/api/v1/payouts/{payoutId}/mark-paid` | `/api/v1/payouts/:payoutId/mark-paid` | `markAsPaid` |
| POST | `/api/v1/public/payments/sepay-webhook` | `CALLBACK — không gọi để giả lập thành công` | `handleWebhook` |
| GET | `/api/v1/public/payments/vnpay/ipn` | `CALLBACK — không gọi để giả lập thành công` | `ipn` |
| GET | `/api/v1/public/payments/vnpay/return` | `CALLBACK — không gọi để giả lập thành công` | `result` |

