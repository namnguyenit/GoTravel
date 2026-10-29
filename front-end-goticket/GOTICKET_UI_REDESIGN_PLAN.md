# KẾ HOẠCH ĐỒNG BỘ GIAO DIỆN TOÀN BỘ GOTICKET

> Cập nhật nhận diện 29/10/2026: logo và màu thương hiệu GoTicket theo [bộ Go family đã áp dụng](GOTICKET_BRAND_SYNC_20261029.md). Các chỉ dẫn về màu san hô GoTravel trong kế hoạch cũ bên dưới không còn là màu thương hiệu hiện hành của GoTicket.
## CHUẨN THIẾT KẾ: PANORAMIC GLASS CAPSULE & ORGANIC GLASSMORPHISM

> **Tài liệu Single Source of Truth (SSOT)** bàn giao cho quá trình hoàn thiện và nâng cấp giao diện toàn diện hệ thống `front-end-goticket`.  
> **Ngôn ngữ thiết kế chủ đạo:** `Panoramic Glass Capsule & Organic Glassmorphism` (Kính mờ Sinh thái Hữu cơ & Viên nang Toàn cảnh Bay bổng) kết hợp phong cách tạp chí du lịch cao cấp (`Editorial Travel`).  
> **Phạm vi cam kết:** **Chỉ thay đổi Presentation / UI / UX / Styling**, tuyệt đối bảo toàn 100% nghiệp vụ logic, API endpoints, DTO contracts, JWT/SSO cookies/returnTo, quyền hạn role/capabilities và active route paths.

---

## 0. Cách dùng tài liệu này

Bất kỳ model hay lập trình viên nào triển khai phải tuân thủ nghiêm ngặt quy trình:

1. **Đọc toàn bộ file kế hoạch này** để nắm rõ tinh thần thiết kế và chi tiết yêu cầu kính mờ cho từng trang.
2. **Tham chiếu chuẩn trực quan sống**:
   - `src/pages/HomePage.tsx`: Mẫu chuẩn trực quan cao nhất về bố cục toàn cảnh và thanh lệnh viên nang.
   - `src/index.css`: Bảng định nghĩa Design Tokens, Glass utility classes (`.glass-capsule-dock`, `.glass-capsule`, `.input-pill-island`, `.glow-coral`).
   - `src/shared/presentation/components/`: Thư viện component dùng chung.
3. **Thực thi theo từng Phase và từng Trang**:
   - Xem mã nguồn của trang và các component liên quan trước khi sửa.
   - Áp dụng đúng cấu trúc kính mờ (**Glass Surfaces, Floating Capsules, Backdrop Blurs, Refraction Borders**).
   - Sau khi hoàn thành trang hoặc phase nào, cập nhật trực tiếp trạng thái `[ ]` thành `[x]` trong file này.
4. **Kiểm thử liên tục**: Sau mỗi phase, chạy lệnh `npm run build` xác thực 0 lỗi TypeScript, kiểm tra giao diện trên cả Desktop (1440px) và Mobile (390px).

### Thứ tự ưu tiên tham chiếu
1. **Source đang chạy của HomePage**: Chuẩn cảm quan sống động thực tế cao nhất.
2. **Kế hoạch này (`GOTICKET_UI_REDESIGN_PLAN.md`)**: Yêu cầu chi tiết hiệu ứng kính và viên nang cho từng trang.
3. `FRONTEND_GOTICKET_PLAN.md`: Ranh giới kiến trúc và tích hợp hệ thống.
4. `API_REFERENCE.md`, `DTO_REFERENCE.md`: Hợp đồng dữ liệu bắt buộc giữ nguyên 100%.

---

## 1. Kết quả kiểm kê & Quyết định thiết kế cốt lõi

### 1.1. Hiện trạng & Vấn đề cần giải quyết triệt để
- **Sự thiếu vắng Glassmorphism trên các trang con**: Trước đây, các trang con (Tìm kiếm, Chi tiết chuyến, Đặt vé, Đơn hàng, Quản trị nhà xe, Admin) bị đóng khung bởi các khối hộp chữ nhật nền trắng đặc (`bg-white`), viền thô xám, tạo cảm giác như một phần mềm kế toán/SaaS khô cứng, đánh mất hoàn toàn DNA của phong cách **Panoramic Glass Capsule** đã tạo dựng tại trang chủ.
- **Trải nghiệm rời rạc**: Trang chủ dùng hiệu ứng kính mờ khí động học, đổ bóng san hô rực rỡ và phông chữ Serif lãng mạn; trong khi các trang quản trị và tài khoản khách lại thiếu chiều sâu quang học (optical depth) và thiếu sự kết nối thị giác.
- **Mục tiêu nâng cấp**: Đồng bộ hóa toàn diện ngôn ngữ **Panoramic Glass Capsule & Organic Glassmorphism** trên **toàn bộ 35+ trang** (cả Customer, Operator, Staff và Admin), biến mọi điểm chạm thành các khối kính bán trong suốt cao cấp, mềm mại, thanh thoát nhưng vẫn đảm bảo độ tương phản đọc dữ liệu hoàn hảo (WCAG AA).

---

### 1.2. Triết lý Thiết kế "Panoramic Glass Capsule & Organic Glassmorphism"

```
[ Lớp 0: Ambient Canvas ]       Nền canvas ấm #FAF9F6 kết hợp đốm sáng khúc xạ quang học mềm mại
          ↓
[ Lớp 1: Glass Surfaces ]       Thẻ nội dung, Bảng, Form bán trong suốt (bg-white/80, backdrop-blur-md, border-white/70)
          ↓
[ Lớp 2: Panoramic Capsules ]   Thanh tìm kiếm, Bộ lọc, Status Tabs, Header dock dạng viên nang nổi (rounded-full / rounded-3xl)
          ↓
[ Lớp 3: Tiêu điểm & Glow ]     Nút CTA San hô Coral (#FF385C -> #E61E4F) viền phát sáng neon rực rỡ (glow-coral)
          ↓
[ Lớp 4: Lớp nổi & Overlays ]   Modal/Drawer kính mờ (backdrop-blur-xl), góc bo 28px tròn trịa, thanh hành động nổi cố định
```

#### 4 Nguyên tắc cốt lõi:
1. **Khí động học Viên nang (Aerodynamic Capsule Silhouette)**:
   - Thay thế toàn bộ các thanh công cụ, ô tìm kiếm, bộ lọc trạng thái và thanh hành động đáy từ góc vuông thành hình viên nang tròn trịa (`rounded-full` hoặc bo lớn `rounded-3xl` / `rounded-[28px]`).
   - Các trường dữ liệu là các "hòn đảo độc lập" (`pill islands`) nổi bồng bềnh trên mặt kính.
2. **Kính mờ Đa tầng (Multi-layered Frosted Glassmorphism)**:
   - Bề mặt kính sử dụng độ mờ quang học tự nhiên (`backdrop-filter: blur(16px)` đến `blur(28px)`).
   - Nền kính bán trong suốt (`rgba(255, 255, 255, 0.72)` đến `rgba(255, 255, 255, 0.88)`).
   - Viền kính phản quang ánh sáng (`border: 1px solid rgba(255, 255, 255, 0.8)` hoặc `border: 1px solid rgba(229, 231, 235, 0.6)`).
   - Bóng đổ trôi nổi thanh thoát (`box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08)`).
3. **Màu sắc Du lịch Sang trọng & San hô Phát sáng (Coral Glow Accent)**:
   - Điểm nhấn thương hiệu là Đỏ San hô (`#FF385C` - GoStay Coral) với dải chuyển màu mượt mà sang `#E61E4F`.
   - Hiệu ứng phát sáng neon (`glow-coral`) tạo lực hút thị giác mãnh liệt cho các hành động mua vé, thanh toán, duyệt đơn, và quét QR.
4. **Nghệ thuật Chữ Tương phản (Editorial Travel Typography)**:
   - `Playfair Display`: Dành riêng cho các tiêu đề chính mang tính cảm xúc, tiêu đề chặng hành trình, tên nhà xe danh giá.
   - `Plus Jakarta Sans`: Toàn bộ các thông số kỹ thuật, bảng dữ liệu, form nhập liệu, vé, mã QR với `tabular-nums` căn chỉnh số tiền và thời gian thẳng tắp.

---

## 2. Những điều tuyệt đối không được làm hỏng

Đây là đợt hoàn thiện và nâng cấp giao diện toàn diện, không can thiệp logic backend:

- Không đổi URL route trong `App.tsx`.
- Không đổi endpoint, HTTP method, DTO, envelope response hoặc cách xác thực.
- Không lưu JWT vào localStorage/sessionStorage.
- Không sửa luồng SSO và `returnTo`.
- Không bỏ guard theo role/capability.
- Không tự tạo dữ liệu, KPI, trạng thái, chính sách, hotline hoặc cam kết giả.
- Không tự xác nhận thanh toán, hoàn tiền, check-in, nhận tiền mặt hay đối soát ở client.
- Không làm mất idempotency key khi retry checkout/operation.
- Không làm mất countdown giữ ghế và xử lý hết hạn.
- Không thay đổi polling ghế, operation progress hoặc payment return thành dữ liệu giả.
- Không coi seat `HELD/SOLD/BLOCKED` là có thể chọn chỉ để giao diện đẹp.
- Không thay `decimal string` tiền tệ bằng phép tính `number` thiếu an toàn.
- Không bỏ error/loading/empty/permission state.
- Không xóa file hoặc component cũ trước khi chứng minh không còn import.
- Không sửa các service backend trong phạm vi kế hoạch này.

---

## 3. Hệ thống Token & Tiện ích Glassmorphism

### 3.1. Color Tokens & Glass Tokens chuẩn trong `src/index.css`

| Token | Giá trị CSS | Ý nghĩa & Vùng áp dụng |
|---|---:|---|
| `--gt-canvas` | `#FAF9F6` | Nền canvas ngọc trai ấm áp |
| `--gt-surface-glass` | `rgba(255, 255, 255, 0.80)` | Nền thẻ kính tiêu chuẩn (`backdrop-blur-md`) |
| `--gt-surface-glass-heavy` | `rgba(255, 255, 255, 0.90)` | Nền thẻ kính chứa nhiều dữ liệu / table (`backdrop-blur-lg`) |
| `--gt-capsule-glass` | `rgba(255, 255, 255, 0.88)` | Nền thanh lệnh viên nang khí động học (`backdrop-blur-xl`) |
| `--gt-border-glass` | `rgba(255, 255, 255, 0.82)` | Viền kính phản quang tán xạ ánh sáng |
| `--gt-border-glass-subtle` | `rgba(229, 231, 235, 0.65)` | Viền kính chia phân vùng nhẹ |
| `--gt-ink` | `#111827` | Chữ tiêu đề than đen sắc sảo |
| `--gt-text` | `#374151` | Nội dung chữ thông thường |
| `--gt-muted` | `#6B7280` | Nhãn phụ, thông tin thứ cấp |
| `--gt-coral` | `#FF385C` | San hô GoStay chủ đạo |
| `--gt-coral-hover` | `#E61E4F` | Trạng thái hover/active |
| `--gt-coral-soft` | `#FFF0F2` | Nền kính tinted hồng san hô nhạt |
| `--gt-coral-glow` | `0 12px 28px -6px rgba(255,56,92,0.45)` | Đổ bóng phát sáng neon rực rỡ |
| `--gt-success` | `#176B47` | Trạng thái Thành công / Check-in OK / Đã xác nhận |
| `--gt-success-glass` | `rgba(236, 253, 243, 0.85)` | Nền kính thông báo thành công |
| `--gt-warning` | `#875800` | Trạng thái Chờ xử lý / Cảnh báo giữ chỗ |
| `--gt-warning-glass` | `rgba(255, 248, 230, 0.85)` | Nền kính cảnh báo |
| `--gt-danger` | `#B42318` | Trạng thái Hủy / Lỗi / Thao tác xóa |
| `--gt-danger-glass` | `rgba(254, 242, 242, 0.85)` | Nền kính lỗi / hủy |

### 3.2. Tiện ích CSS Kính Mờ & Viên Nang
- `.glass-capsule-dock`: `backdrop-filter: blur(28px); background: rgba(255, 255, 255, 0.78); border: 1.5px solid rgba(255, 255, 255, 0.85); box-shadow: 0 30px 60px -15px rgba(15, 23, 42, 0.12);`
- `.glass-capsule`: `backdrop-filter: blur(20px); background: rgba(255, 255, 255, 0.88); border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 9999px;`
- `.glass-surface`: `backdrop-filter: blur(16px); background: rgba(255, 255, 255, 0.82); border: 1px solid rgba(255, 255, 255, 0.75); border-radius: 24px; box-shadow: 0 16px 36px -10px rgba(15, 23, 42, 0.06);`
- `.glow-coral`: `box-shadow: 0 12px 28px -6px rgba(255, 56, 92, 0.45), 0 8px 12px -6px rgba(255, 56, 92, 0.25);`
- `.glow-coral-sm`: `box-shadow: 0 4px 14px -2px rgba(255, 56, 92, 0.32);`

---

## 4. Bộ component nền chuẩn hóa Panoramic Glass Capsule

Mọi giao diện phải sử dụng thống nhất các component nền đã tích hợp chuẩn Glassmorphism:

### 4.1. Khung hiển thị & Bề mặt Kính (Surfaces & Containers)
- [ ] `SurfaceCard`: Cập nhật hỗ trợ các variant kính chuyên biệt:
  - `variant="glass"`: Nền kính mờ bán trong suốt `bg-white/80 backdrop-blur-md border border-white/70 shadow-sm`.
  - `variant="glass-elevated"`: Nền kính mờ cao cấp `bg-white/85 backdrop-blur-xl border border-white/80 shadow-xl`.
  - `variant="glass-capsule"`: Viên nang kính mềm mại `rounded-full bg-white/90 backdrop-blur-lg border border-white/80`.
  - `variant="default"`: Nền thẻ tiêu chuẩn với viền mềm.
- [ ] `GlassCapsuleBar`: Thanh chứa điều khiển dạng viên nang nổi bồng bềnh (`floating capsule bar`) dùng cho filter, search thu nhỏ, thanh tóm tắt giá vé.
- [ ] `GlassDock`: Thanh neo cố định ở chân trang hoặc đỉnh trang với viền phát sáng và hiệu ứng khúc xạ quang học.
- [ ] `CustomerPageContainer` & `PortalPageContainer`: Nền trang với lớp đốm sáng khúc xạ (ambient subtle gradient background).

### 4.2. Thẻ dữ liệu & Trạng thái Kính (Data Display & Badges)
- [ ] `MetricCard`: Nâng cấp giao diện kính mờ với icon pod san hô rực rỡ, số liệu `tabular-nums` nổi bật.
- [ ] `StatusBadge`: Nâng cấp sang dạng chip viên nang kính (`rounded-full backdrop-blur-sm border px-3 py-1 font-medium`).
- [ ] `TicketStubCard`: Thẻ vé dạng Boarding Pass với bề mặt kính, đường răng cưa laser dập lỗ và thông tin chuyến rõ nét.
- [ ] `InlineAlert`: Hộp thông báo kính mờ (info, warning, error, success) kèm icon tròn đồng bộ.

### 4.3. Thành phần Form & Lệnh điều khiển
- [ ] `Input` / `Select` / `Combobox`: Thừa hưởng phong cách `input-pill-island` bo tròn mềm mại `rounded-full` hoặc `rounded-2xl`, viền kính nhẹ, focus ring san hô `focus:ring-coral/40`.
- [ ] `Button`: Variant `default` san hô gradient (`#FF385C` -> `#E61E4F`) kèm viền phát sáng `glow-coral`; variant `outline` với viền kính mờ `border-white/80 hover:bg-white/60`.
- [ ] `ConfirmDialog` & `FormDialog`: Dialog chuẩn kính mờ với lớp phủ `backdrop-blur-md bg-black/25`, khung nội dung `rounded-[28px] bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl`.

---

## 5. Đồng bộ Shell toàn hệ thống theo phong cách Glass Capsule

### 5.1. Customer Shell
**Files**: `src/layouts/CustomerLayout.tsx`, `src/shared/presentation/components/Navbar.tsx`, `src/shared/presentation/components/Footer.tsx`.

Yêu cầu chi tiết:
- [ ] **Navbar Kính Mờ (Floating Frosted Glass Navbar)**:
  - Nền kính mờ nổi bật `backdrop-blur-xl bg-white/80 border-b border-white/60 shadow-sm sticky top-0 z-50`.
  - Logo `GoTicket.` tối giản với dấu chấm tròn San hô `#FF385C`.
  - Nút chuyển menu dạng viên nang mềm mại, hover đổi màu san hô êm ái.
  - Avatar tài khoản: Dạng capsule tròn trịa với icon caret nhỏ gọn, dropdown xổ xuống dạng popover kính bo góc 28px (`rounded-[28px] backdrop-blur-xl bg-white/95 border border-white/80 shadow-2xl`).
- [ ] **Nền trang (Canvas)**: Giữ vững màu ngọc trai ấm `--gt-canvas: #FAF9F6`, thêm các đốm sáng ambient ánh hồng san hô mờ ở phần nền giúp hiệu ứng kính nổi bật.
- [ ] **Footer**: Chân trang hiện đại, chia 4 cột, divider kính mỏng nhẹ, loại bỏ hoàn toàn các mảng xanh cũ.

### 5.2. Operator Shell
**File**: `src/layouts/OperatorLayout.tsx`.

Yêu cầu chi tiết:
- [ ] **Topbar Kính Mờ (Frosted Topbar Capsule)**: Nền kính `backdrop-blur-lg bg-white/80 border-b border-gray-200/60`, huy hiệu nhà xe dạng chip viên nang kính, liên kết về kênh khách hàng dạng button viên thuốc san hô.
- [ ] **Sidebar Kính Tinh Tế (Glass Sidebar Dock)**:
  - Khung sidebar bề mặt kính đục nhẹ `bg-white/85 backdrop-blur-xl border-r border-white/70 shadow-sm`.
  - Các mục menu (Dashboard, Đội xe, Tuyến đường, Chuyến xe, Bán vé, Nhân sự, Báo cáo) khi active hiển thị dạng viên nang `rounded-full bg-coral-soft text-coral font-semibold shadow-sm border border-coral/20`.
- [ ] **Mobile Drawer**: Bề mặt kính `backdrop-blur-2xl bg-white/95`, nút đóng tròn trịa, animation trượt êm ái.

### 5.3. Staff Shell
**File**: `src/layouts/StaffLayout.tsx`.

Yêu cầu chi tiết:
- [ ] Cùng ngôn ngữ kính mờ với Operator nhưng gắn huy hiệu viên nang màu lục bảo `Nhân viên vận hành`.
- [ ] Tích hợp thanh trạng thái ca làm việc (Shift Indicator) dạng viên nang kính nhỏ gọn trên Topbar.
- [ ] Phân quyền capability tự động ẩn hiện các tab menu, không làm vỡ bố cục kính.

### 5.4. Admin Shell
**File**: `src/layouts/AdminLayout.tsx`.

Yêu cầu chi tiết:
- [ ] Topbar quản trị viên cao cấp với huy hiệu viên nang kính màu than đen huyền bí `Quản trị hệ thống GoTicket`.
- [ ] Menu điều hành trực quan chia nhóm rõ ràng (Tổng quan, Nhà xe, Hồ sơ duyệt, Đơn hàng, Vận hành 7 modes).
- [ ] Thẻ thông báo hệ thống và breadcrumb dạng viên nang kính thu nhỏ.

---

## 6. Kế hoạch chi tiết từng trang Khách hàng (Customer Pages)

### 6.1. Trang chủ `/`
**File**: `src/pages/HomePage.tsx`.
- [x] **Hero Banner Toàn Cảnh**: Bức tranh cung đường đèo hùng vĩ Việt Nam làm phông nền chính.
- [x] **Thanh lệnh Panoramic Glass Capsule**:
  - Dock ngoài kính mờ cong lượn sóng (`backdrop-blur-28px bg-white/44 border-1.5 border-white/85 shadow-2xl`).
  - Các trường Điểm đi, Điểm đến, Ngày đi thiết kế dạng các viên thuốc con độc lập (`input-pill-island h-14 rounded-full bg-white/95`).
  - Nút đảo chiều `⇄` tròn nhô cao tại tâm sóng đối xứng.
  - Nút "Tìm chuyến xe" hình viên thuốc San hô rực rỡ phát sáng `glow-coral`.
- [x] **Destination Cards**: Các thẻ điểm đến bo góc lớn `rounded-3xl` với nhãn giá kính mờ bay nổi (`backdrop-blur-md bg-white/85 border border-white/70`).

---

### 6.2. Trang Tìm kiếm & Danh sách Chuyến xe `/search`
**Files**: `CustomerTripSearchPage.tsx`, `TripSearchForm.tsx`, `LocationCombobox.tsx`, `DatePickerPopover.tsx`, `CustomerTripFilterSidebar.tsx`, `CustomerTripCard.tsx`, `CustomerTripDetailModal.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Thanh tìm kiếm Compact Glass Capsule**:
  - Đặt ở đầu trang như một thanh lệnh viên nang thu nhỏ (`h-14 rounded-full bg-white/85 backdrop-blur-xl border border-white/80 shadow-lg`).
  - Tích hợp ô đổi chiều và chọn ngày nhanh chóng mà không chiếm quá nhiều diện tích dọc.
- [ ] **Sidebar Bộ lọc Dạng Đảo Kính (Frosted Glass Filter Island)**:
  - Khung bao sidebar là thẻ kính `rounded-3xl bg-white/80 backdrop-blur-md border border-white/70 p-6 shadow-md`.
  - Bộ lọc khung giờ (Sáng / Trưa / Chiều / Tối) và loại xe (Limousine / Giường nằm) thiết kế dạng các chip viên nang nổi (`rounded-full px-4 py-2 text-xs font-semibold hover:border-coral/40`). Khi active: phủ nền hồng san hô `bg-coral-soft text-coral border-coral/30`.
- [ ] **Thẻ Chuyến Xe Boarding Pass Kính Mờ (Trip Card)**:
  - Thiết kế dạng thẻ vé cao cấp: bo góc `rounded-3xl bg-white/85 backdrop-blur-md border border-white/75 shadow-md hover:shadow-xl hover:border-coral/30 transition-all duration-200`.
  - Dải kết nối lộ trình: Biểu tượng xe chạy trên dải timeline san hô thanh mảnh.
  - Nhãn loại xe & số ghế trống: Thiết kế dạng chip viên nang nhỏ xinh.
  - Giá vé: Typography to bản đậm nét với font số `tabular-nums`.
  - Nút "Chọn chuyến": Dạng viên thuốc San hô căng tràn năng lượng, phát sáng `glow-coral-sm`.
- [ ] **Modal Chi Tiết Chuyến Xe**: Dialog kính mờ 2 cột, tab thông tin lộ trình, điểm đón trả và chính sách hoàn hủy dạng pill tabs.

---

### 6.3. Chi tiết chuyến & Sơ đồ Ghế ngồi `/trips/:tripId`
**Files**: `TripDetailPage.tsx`, `SeatMap.tsx`, `PassengerForm.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Header Chuyến Đi Dạng Capsule Toàn Cảnh**: Thẻ kính bo tròn `rounded-3xl bg-white/85 backdrop-blur-lg border border-white/75 p-6 shadow-md`, thể hiện tên nhà xe, biển số, loại xe và lộ trình dạng timeline editorial.
- [ ] **Khoang Xe Kính Tương Tác (Vehicle Cabin Deck)**:
  - Khung mô phỏng khoang xe Limousine sang trọng với 4 góc bo tròn mềm mại `rounded-[32px] bg-white/80 backdrop-blur-md border-2 border-white/80 p-8 shadow-inner`.
  - Ghế ngồi công thái học:
    - *Ghế trống*: Bo cong viền xám mảnh, nền trắng tinh khôi, hover phát sáng hồng san hô.
    - *Ghế đã giữ/bán*: Màu xám mờ khóa an toàn, có gạch chéo tinh tế.
    - *Ghế đang chọn*: Đỏ san hô rực rỡ `#FF385C`, biểu tượng ghế sáng bừng, hiệu ứng `glow-coral-sm`.
  - **Hộp chú thích ghế (Seat Legend Capsule)**: Dạng thanh viên nang kính nằm ngang bên dưới sơ đồ ghế.
- [ ] **Thanh Tóm Tắt Giá Vé Đáy Màn Hình (Bottom Panoramic Glass Capsule Summary Dock)**:
  - Thanh dock cố định nổi bồng bềnh ở cạnh đáy màn hình (`fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-4xl h-16 rounded-full bg-white/90 backdrop-blur-2xl border border-white/85 shadow-2xl px-6 flex items-center justify-between z-40`).
  - Hiển thị danh sách ghế chọn dạng badge viên thuốc nhỏ, tổng số tiền dạng `MoneyText` to bản, và nút "Tiếp tục" san hô phát sáng.
- [ ] **Passenger Form**: Mỗi hành khách là một card kính nhỏ `rounded-2xl bg-white/80 backdrop-blur-sm border border-white/70 p-4`, các ô input bo tròn mềm mại.

---

### 6.4. Trang Đặt vé & Thanh toán `/checkout/:orderId`
**File**: `CheckoutPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Thanh Đếm Ngược Giữ Chỗ Viên Nang (Countdown Capsule Banner)**:
  - Dạng viên thuốc nổi `rounded-full bg-white/90 backdrop-blur-lg border border-coral/30 px-6 py-3 shadow-md mx-auto flex items-center gap-3`.
  - Đồng hồ đếm ngược số to bản đổi sang màu cam/đỏ cảnh báo khi dưới 2 phút.
- [ ] **Thẻ Vé Tóm Tắt (Boarding Pass Ticket Stub)**:
  - Card kính `rounded-3xl bg-white/85 backdrop-blur-md border border-white/75 p-6 shadow-lg`.
  - Đường dập lỗ bán nguyệt hai bên thân vé mô phỏng cuống vé máy bay thật.
- [ ] **Phương Thức Thanh Toán Dạng Viên Thuốc / Card Kính**:
  - Lựa chọn GoPay / VNPAY hiển thị dạng các thẻ kính bo góc `rounded-2xl`, khi active viền san hô phát sáng và có tick tròn xác nhận.
- [ ] **Nút Xác Nhận Thanh Toán**: Nút lớn dạng viên nang san hô phát sáng `glow-coral`, hiển thị trạng thái pending vô hiệu hóa double-click an toàn.

---

### 6.5. Kết quả thanh toán `/payment/return`
**File**: `PaymentReturnPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Thẻ Biên Nhận Kính Toàn Cảnh (Frosted Receipt Capsule Card)**:
  - Khung thẻ trung tâm kích thước lớn `max-w-xl mx-auto rounded-[32px] bg-white/85 backdrop-blur-xl border border-white/80 p-8 shadow-2xl text-center`.
  - Biểu tượng Thành công (Checkmark tròn) màu xanh ngọc bích phát sáng nhẹ.
  - Mã đơn hàng & mã vé dạng chip viên nang kính nằm ở vị trí trung tâm có nút sao chép nhanh.
  - Phân vùng tóm tắt hành trình và tiền tệ ngăn cách bởi đường nét đứt mờ.
  - Cặp nút hành động "Xem vé của tôi" (Coral Glow Pill) và "Về trang chủ" (Glass Outline Pill).

---

### 6.6. Vé của tôi `/account/tickets`
**File**: `CustomerTicketsPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Thanh Lọc Trạng Thái Viên Nang (Status Filter Capsule Tabs)**:
  - Thanh dock viên nang `rounded-full bg-white/80 backdrop-blur-lg border border-white/75 p-1.5 shadow-md inline-flex gap-1`.
  - Các tab (Tất cả, Đã xác nhận, Chờ thanh toán, Đã hủy) chuyển đổi mượt mà với nền san hô hồng `bg-coral-soft text-coral` khi active.
- [ ] **Danh Sách Thẻ Vé Boarding Pass Kính Mờ**:
  - Mỗi đơn hàng là một thẻ vé kính sang trọng `rounded-3xl bg-white/85 backdrop-blur-md border border-white/75 p-6 shadow-md hover:shadow-xl transition-all`.
  - Thông tin tuyến xe, giờ khởi hành, biển số xe và vị trí ghế hiển thị kiểu chữ Editorial du lịch.
  - Nút "Xem vé & QR" dạng viên nang san hô nổi bật.

---

### 6.7. Chi tiết đơn & Vé điện tử QR `/account/orders/:orderId`
**Files**: `CustomerOrderDetailPage.tsx`, `QrCodeView.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Hộp Trưng Bày Mã QR Kính Mờ (Frosted QR Display Pod)**:
  - Khung QR trung tâm dạng thẻ kính `rounded-3xl bg-white/90 backdrop-blur-lg border border-white/80 p-8 shadow-xl flex flex-col items-center`.
  - Khung mã QR nền trắng tinh khôi bo tròn nhẹ `rounded-2xl border p-4 shadow-sm` đảm bảo độ tương phản 100% cho mọi máy quét.
  - Huy hiệu trạng thái vé dạng viên nang kính màu xanh ngọc bích bay phía trên.
- [ ] **Bản Đồ Lộ Trình & Điểm Đón Trả**: Timeline kính mờ với các điểm dừng biểu thị dạng hạt ngọc tròn.
- [ ] **Thanh Lệnh Tương Tác Kính (Action Capsule Dock)**: Các nút Đổi vé, Sửa thông tin, Hủy vé, In vé, Gửi Email bố trí trong thanh viên nang kính thanh thoát.

---

### 6.8. Đổi vé `/account/orders/:orderId/items/:itemId/exchange`
**File**: `ExchangeTicketPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Thanh Tiến Trình Viên Nang 3 Bước (Step Capsule Indicator)**: Thanh dock viên nang `rounded-full bg-white/85 backdrop-blur-lg border border-white/75 px-6 py-3 shadow-md mb-8` hiển thị 3 bước: 1. Chọn chuyến mới -> 2. Chọn ghế -> 3. Xác nhận chênh lệch.
- [ ] **Thẻ So Sánh Kính Song Song (Side-by-Side Glass Comparison)**: Bên trái vé hiện tại, bên phải vé dự kiến đổi với các giá trị chênh lệch hiển thị bằng `MoneyText` màu xanh/đỏ rõ ràng.
- [ ] **Thanh Lệnh Chốt Đổi Vé Cố Định**: Thanh dock đáy màn hình hiển thị số tiền thanh toán thêm hoặc hoàn trả kèm nút xác nhận phát sáng san hô.

---

### 6.9. Sửa thông tin vé `/account/orders/:orderId/items/:itemId/amend`
**File**: `AmendTicketPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Thẻ Điều Chỉnh Thông Tin Kính Mờ**: Thẻ kính bo góc `rounded-3xl bg-white/85 backdrop-blur-md border border-white/75 p-6 shadow-lg`.
- [ ] **Capsule Revision Badge**: Huy hiệu hiển thị lần sửa đổi thứ N dạng viên thuốc nhỏ xinh.
- [ ] **So Sánh Trước & Sau (Before/After Capsules)**: Các ô thông tin cũ và mới hiển thị dạng viên nang song song giúp hành khách đối chiếu tức thì trước khi lưu.

---

### 6.10. Tiến trình nghiệp vụ `/account/operations/:operationId`
**File**: `OperationProgressPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Khung Theo Dõi Saga Kính Mờ (Saga Tracker Glass Card)**: Khung thẻ trung tâm `max-w-2xl mx-auto rounded-[32px] bg-white/85 backdrop-blur-xl border border-white/80 p-8 shadow-2xl`.
- [ ] **Timeline Nghiệp Vụ Viên Nang**: Các mốc xử lý (Khởi tạo, Khóa vé, Thanh toán, Phát hành vé mới) biểu thị dạng các nút tròn kính liên kết bởi đường truyền phát sáng.
- [ ] **Technical Details Pod**: Khung chi tiết kỹ thuật thu gọn dạng kính mờ tinh tế, không làm rối mắt người dùng phổ thông.

---

### 6.11. Khiếu nại hành khách `/account/disputes`
**File**: `CustomerDisputesPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Layout Kính Đôi (Dual Glass Layout)**: Bên trái là Form gửi khiếu nại dạng thẻ kính `rounded-3xl bg-white/80 backdrop-blur-md p-6`, bên phải là Lịch sử khiếu nại dạng danh sách thẻ vé kính.
- [ ] **Thẻ Tóm Tắt Trạng Thái Khiếu Nại**: Sử dụng các badge viên nang kính phân biệt Đang thụ lý, Đã hoàn tiền, Đã giải quyết.

---

### 6.12. Hồ sơ cá nhân `/account/profile`, `/profile`
**File**: `ProfilePage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Header Danh Tính Kính Mờ (Identity Glass Capsule Banner)**: Thẻ kính lớn với vòng tròn Avatar phát sáng, tên người dùng kiểu chữ Playfair Display sang trọng, cùng các huy hiệu vai trò dạng chip viên nang.
- [ ] **Không Gian Làm Việc (Workspace Switcher Capsules)**: Thẻ chuyển nhanh sang Cổng Nhà xe hoặc Cổng Quản trị thiết kế dạng các card kính tương tác viền san hô.
- [ ] **Sticky Glass Save Bar**: Thanh lưu thay đổi trôi nổi cố định góc dưới khi form có dữ liệu chỉnh sửa.

---

### 6.13. Đăng ký đối tác nhà xe `/become-operator`, `/operator/register`
**File**: `OperatorRegisterPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Hero Khởi Nghiệp Kính Mờ**: Thẻ giới thiệu lợi ích hợp tác thiết kế theo phong cách tạp chí du lịch với phông nền mây trời hùng vĩ.
- [ ] **Vùng Tải Lên Giấy Tờ (Document Dropzone Capsule)**: Khung upload CCCD và Giấy phép kinh doanh bo cong `rounded-3xl bg-white/70 backdrop-blur-md border-2 border-dashed border-coral/30 p-8 text-center hover:bg-white/90 transition-all`.
- [ ] **Thẻ Tiến Trình Xét Duyệt**: Card kính thông báo tình trạng xét duyệt KYC từ ban quản trị GoTicket.

---

### 6.14. Chuyển hướng SSO `/login`, `/register`
**Files**: `LoginPage.tsx`, `RegisterPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Thẻ Chuyển Tiếp Kính Mờ Trôi Nổi (Floating SSO Transition Card)**:
  - Khung thẻ `max-w-md mx-auto rounded-[32px] bg-white/85 backdrop-blur-2xl border border-white/80 p-8 shadow-2xl text-center`.
  - Logo `GoTicket.` phát sáng nhẹ kèm thanh loading tiến trình dạng viên nang san hô chạy mượt mà.
  - Dòng thông điệp "Đang kết nối an toàn với GoTravel ID..." thanh thoát.

---

## 7. Kế hoạch chi tiết từng trang Cổng Nhà xe (Operator Portal Pages)

### 7.1. Bảng điều khiển nhà xe `/operator`, `/operator/dashboard`
**File**: `OperatorDashboardPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Header Chào Mừng Kính Mờ**: Thẻ kính bo tròn `rounded-3xl bg-white/85 backdrop-blur-md border border-white/75 p-6 shadow-md` thể hiện tên nhà xe, ngày hiện tại và trạng thái kết nối.
- [ ] **Dải Thẻ KPI Viên Nang Kính (Frosted Glass KPI Pods)**: 4 thẻ MetricCard kính mờ (Tổng xe hoạt động, Tuyến đang chạy, Chuyến hôm nay, Doanh thu ước tính) với icon pod san hô rực rỡ và số liệu `tabular-nums`.
- [ ] **Thanh Lệnh Nhanh Viên Nang (Quick Action Capsule Bar)**: Các nút tắt tạo chuyến mới, mở ca bán vé, xem báo cáo thiết kế dạng viên nang nổi bồng bềnh.

---

### 7.2. Quản lý Đội xe `/operator/cars`
**Files**: `OperatorCarListPage.tsx`, `CarKpiCards.tsx`, `AddCarModal.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Thanh Lọc Đội Xe Viên Nang (Car Filter Capsule Dock)**: Tích hợp ô tìm biển số, dropdown loại xe và nút "Thêm xe mới" (Coral Glow Pill) trong cùng một thanh viên nang kính nổi `rounded-full bg-white/85 backdrop-blur-lg border border-white/80 p-2 shadow-md`.
- [ ] **Bảng Đội Xe Kính Mờ (Glass Car Data Table)**:
  - Thẻ bao toàn bảng `rounded-3xl bg-white/85 backdrop-blur-md border border-white/75 shadow-md overflow-hidden`.
  - Biển số xe hiển thị trong chip viên nang kim loại phong cách xe khách thực thụ.
  - Trạng thái hoạt động hiển thị bằng `StatusBadge` viên nang kính màu xanh ngọc / hổ phách.
- [ ] **Modal Thêm Xe Mới**: Dialog kính mờ `rounded-[28px] bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl` với các trường nhập liệu dạng viên thuốc.

---

### 7.3. Cấu hình sơ đồ ghế xe `/operator/cars/:carId/seats`
**File**: `OperatorSeatLayoutPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Bàn Thiết Kế Khoang Xe Kính (Interactive Seat Layout Deck)**:
  - Khung bao xe bo góc `rounded-[32px] bg-white/80 backdrop-blur-md border-2 border-white/85 p-8 shadow-inner` mô phỏng sơ đồ thực tế tầng 1 / tầng 2.
  - Bộ chuyển tầng xe dạng viên nang đôi (`Tầng dưới` / `Tầng trên`) nổi giữa màn hình.
  - Các ô ghế tương tác: Thêm ghế, xóa ghế, đổi hạng ghế (VIP / Standard) với phản hồi màu sắc tức thì.
- [ ] **Thanh Lưu Cấu Hình Nổi Cố Định (Sticky Glass Save Bar)**: Thanh dock viên nang kính cố định đáy hiển thị tổng số ghế đã định hình và nút "Lưu sơ đồ ghế" phát sáng san hô.

---

### 7.4. Điểm đón trả `/operator/stops`
**File**: `OperatorStopsPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Khung Tạo Điểm Dừng Kính Mờ**: Thẻ kính 5 cột bên trái nhập tên điểm, tỉnh/thành, địa chỉ chi tiết với các trường `input-pill-island`.
- [ ] **Danh Sách Điểm Đón Trả Dạng Thẻ Kính (Stop Glass Cards)**: 7 cột bên phải hiển thị danh sách điểm dừng; mỗi điểm là một thẻ kính `rounded-2xl bg-white/80 backdrop-blur-sm border border-white/70 p-4 shadow-sm hover:shadow-md transition-all`.

---

### 7.5. Tuyến đường vận chuyển `/operator/routes`
**Files**: `OperatorRouteListPage.tsx`, `RouteCard.tsx`, `CreateRouteModal.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Thẻ Tuyến Đường Dải Ruy Băng Kính (Route Ribbon Glass Card)**:
  - Khung thẻ `rounded-3xl bg-white/85 backdrop-blur-md border border-white/75 p-6 shadow-md hover:shadow-xl transition-all`.
  - Điểm khởi hành và điểm đến nối liền bởi dải ruy băng lộ trình san hô uốn lượn có các điểm dừng nhỏ xinh gắn kèm.
  - Nút bật/tắt kích hoạt tuyến dạng switch viên nang kính sang trọng.
- [ ] **Modal Tạo Tuyến Đa Bước (Create Route Wizard)**: Dialog kính mờ với các bước sắp xếp thứ tự điểm đón trả trực quan.

---

### 7.6. Danh sách chuyến xe `/operator/trips`
**Files**: `OperatorTripListPage.tsx`, `TripCard.tsx`, `TripKpiCards.tsx`, `CreateTripModal.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Thanh Chọn Ngày & Lọc Chuyến Dạng Capsule (Date & Trip Capsule Dock)**: Lịch chọn ngày dạng viên nang ngang cho phép chuyển nhanh Hôm nay / Ngày mai / Tuần này.
- [ ] **Thẻ Chuyến Xe Vận Hành (Operator Trip Card)**:
  - Bo góc `rounded-3xl bg-white/85 backdrop-blur-md border border-white/75 p-6 shadow-md`.
  - Thước đo tỷ lệ lấp đầy ghế (Occupancy Progress Bar) dạng viên nang màu san hô / ngọc bích.
  - Cụm nút quản trị (Mở bán, Khóa chuyến, Quản lý ghế) bố trí thẳng hàng trong menu capsule gọn gàng.

---

### 7.7. Trung tâm quản lý chuyến xe `/operator/trips/:tripId/manage`
**File**: `OperatorTripManagePage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Header Chỉ Huy Chuyến Kính Mờ (Trip Command Glass Capsule)**: Thẻ kính lớn thể hiện mã chuyến, biển số xe, tài xế, lộ trình và trạng thái vòng đời.
- [ ] **Thanh Tab Chức Năng Viên Nang (Navigation Pill Tabs)**: Nhóm tab (Tổng quan, Điểm dừng & giờ đón, Bảng giá theo hạng ghế, Quản lý sơ đồ ghế, Khóa/Hủy chuyến) nằm trong thanh viên nang trôi nổi.
- [ ] **Bảng Khóa/Mở Ghế Nhanh**: Click trực tiếp trên sơ đồ ghế kính mờ để khóa ghế kỹ thuật hoặc nhả ghế ra bán lẻ.

---

### 7.8. Đơn hàng nhà xe `/operator/orders`
**File**: `OperatorOrdersPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Bảng Đơn Hàng Kính Mờ Toàn Cảnh (Glass Orders DataTable)**:
  - Thẻ bao `rounded-3xl bg-white/85 backdrop-blur-md border border-white/75 shadow-md overflow-hidden`.
  - Hàng bảng có hiệu ứng hover kính sáng bóng nhẹ.
  - Cột số tiền căn phải với font số `MoneyText tabular-nums` rõ ràng.
- [ ] **Drawer Chi Tiết Đơn Hàng Kính Mờ (Detail Glass Drawer)**: Trượt từ cạnh phải với nền kính `backdrop-blur-2xl bg-white/95`, hiển thị danh sách cuống vé của khách và lịch sử thanh toán.

---

### 7.9. Quầy bán vé nhà xe `/operator/counter`
**File**: `OperatorCounterPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Giao Diện Bán Vé Tốc Độ Cao Kính Kép (Dual-Pane Fast Counter)**:
  - *Cánh trái*: Chọn chuyến và Sơ đồ ghế tương tác kính mờ với tốc độ phản hồi tức thì.
  - *Cánh phải*: Thẻ tóm tắt thông tin khách và Hộp xác nhận thu tiền mặt (CASH) dạng thẻ kính bo góc `rounded-3xl bg-white/90 backdrop-blur-xl border border-white/80 p-6 shadow-xl`.
- [ ] **Nút Thu Tiền Mặt Phát Sáng San Hô**: Nút lớn dạng viên nang san hô phát sáng `glow-coral` hiển thị rõ số tiền phải thu và xác nhận in vé.

---

### 7.10. Quản lý ca tiền mặt `/operator/shifts`
**File**: `OperatorShiftsPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Thẻ Ca Tiền Mặt Đang Hoạt Động (Active Shift Glass Pod)**: Thẻ kính nổi bật `rounded-3xl bg-white/85 backdrop-blur-md border-2 border-emerald-500/30 p-6 shadow-lg` hiển thị tên nhân viên mở ca, giờ mở ca, tổng tiền mặt thu được và nút "Kết ca & Đối soát".
- [ ] **Bảng Biên Nhận Tiền Mặt (Cash Receipts Ledger)**: Bảng kính mờ ghi nhận từng giao dịch thu/chi trong ca.

---

### 7.11. Quản lý nhân viên nhà xe `/operator/staff`
**File**: `OperatorStaffPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Thẻ Nhân Viên & Phân Quyền Kính Mờ (Staff Glass Cards)**:
  - Mỗi nhân viên là một thẻ kính `rounded-3xl bg-white/85 backdrop-blur-md border border-white/75 p-6 shadow-md`.
  - Danh sách quyền hạn (Bán vé quầy, Soát vé QR, Quản lý chuyến) hiển thị bằng các chip viên nang kính màu xanh ngọc bích.
- [ ] **Modal Thêm / Phân Quyền Nhân Viên**: Dialog kính mờ với các checkbox card phân quyền trực quan.

---

### 7.12. Báo cáo & Doanh thu `/operator/reports`
**File**: `OperatorReportsPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Thanh Lọc Khoảng Thời Gian Viên Nang**: Chọn ngày từ ngày... đến ngày... trong một thanh dock viên nang kính.
- [ ] **Dải Thẻ KPI Tài Chính Kính Mờ**: Doanh thu ròng, Tiền vé online, Tiền vé tiền mặt, Phí hoàn vé hiển thị trên các thẻ `MetricCard` kính mờ sang trọng.
- [ ] **Thẻ Yêu Cầu Rút Tiền (Payout Withdrawal Glass Card)**: Thẻ kính hiển thị số dư sẵn sàng rút và nút "Yêu cầu thanh toán" dạng viên nang san hô phát sáng.

---

### 7.13. Hồ sơ thương hiệu nhà xe `/operator/profile`
**File**: `OperatorProfilePage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Banner Thương Hiệu Kính Mờ**: Khung trưng bày Logo nhà xe, Tên thương hiệu hiển thị công khai trên ứng dụng GoTicket.
- [ ] **Khung Pháp Nhân & Giấy Phép Kính Mờ**: Các thông tin pháp lý được chứng thực (Verified Badges dạng viên nang kính xanh lá).
- [ ] **Sticky Save Bar**: Thanh lưu thay đổi trôi nổi cố định đáy.

---

### 7.14. Soạn thảo ưu đãi & nội dung `/operator/offers/:listingId`
**File**: `OperatorOfferContentPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Khung Soạn Thảo & Preview Song Song Kính Mờ**: Cánh trái là form nhập tiêu đề, mô tả hành trình; cánh phải là thẻ xem trước (Live Preview Card) dạng vé du lịch sang trọng chuẩn phong cách GoStay.

---

## 8. Kế hoạch chi tiết từng trang Cổng Nhân viên (Staff Portal Pages)

### 8.1. Soát vé & Quét QR `/staff/check-in`
**File**: `StaffCheckInPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Khung Quét Camera Kính Toàn Cảnh (Panoramic Glass Camera Scanner Capsule)**:
  - Khung ngắm camera bo góc siêu lớn `rounded-[32px] bg-black/85 backdrop-blur-xl border-2 border-white/80 p-4 shadow-2xl relative overflow-hidden max-w-lg mx-auto`.
  - 4 góc kính phản quang quang học định vị mã vé, tia laser quét san hô (`scanning beam`) chuyển động mượt mà.
  - Nút bật/tắt camera dạng viên nang kính nổi ngay trên khung ngắm.
- [ ] **Thanh Nhập Mã Vé Thủ Công Viên Nang (Manual Input Capsule Bar)**: Dưới camera là ô nhập mã vé 6 ký tự dạng viên nang kính `rounded-full bg-white/90 backdrop-blur-md border border-white/80 h-14 px-6 flex items-center gap-3 shadow-lg`.
- [ ] **Thẻ Kết Quả Soát Vé Kính Mờ (Check-in Result Glass Pod)**:
  - Thành công: Thẻ kính màu lục bảo phát sáng `bg-emerald-500/10 backdrop-blur-md border-emerald-500/40 text-emerald-900` với thông tin tên khách, số ghế, lộ trình to bản.
  - Vé trùng / Không hợp lệ: Thẻ kính màu đỏ/vàng cảnh báo rõ ràng.
- [ ] **Bảng Danh Sách Khách Lên Xe (Manifest Table)**: Bảng kính mờ phía dưới ghi nhận trạng thái Đã lên xe / Chưa đến của từng ghế.

---

### 8.2. Các trang nhân viên dùng chung (Staff Shared Pages)
**Routes**: `/staff`, `/staff/trips`, `/staff/counter`, `/staff/shifts`, `/staff/orders`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] Đồng bộ toàn bộ chuẩn **Panoramic Glass Capsule** như phía Operator nhưng ẩn các nút chức năng quản trị cấp cao không thuộc quyền hạn của nhân viên.
- [ ] Gắn nhãn nhận diện ca trực và tên nhà xe dạng chip viên nang kính trên đầu mỗi trang.

---

## 9. Kế hoạch chi tiết từng trang Cổng Quản trị (Admin Portal Pages)

### 9.1. Tổng quan vận tải `/admin`
**File**: `AdminTransportOverviewPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Header Điều Hành Quốc Gia Kính Mờ**: Thẻ kính toàn cảnh `rounded-3xl bg-white/85 backdrop-blur-md border border-white/75 p-8 shadow-md` thể hiện toàn cảnh mạng lưới xe khách GoTicket.
- [ ] **Ma Trận KPI Kính Mờ (Admin Metric Glass Grid)**: Các thẻ kính hiển thị số lượng Nhà xe hoạt động, Hồ sơ chờ duyệt, Đơn hàng toàn sàn hôm nay, Tổng giá trị đối soát.
- [ ] **Thẻ Điều Hướng Module Nhanh Dạng Kính**: Các khối dẫn nhanh tới Duyệt nhà xe, Đối soát tài chính, Xử lý hủy chuyến khẩn cấp.

---

### 9.2. Danh sách nhà xe toàn sàn `/admin/operators`
**Files**: `AdminOperatorListPage.tsx`, `AdminUserDetailModal.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Thanh Lọc Nhà Xe Viên Nang**: Ô tìm kiếm mã số thuế, tên nhà xe và dropdown trạng thái trong thanh capsule nổi `rounded-full bg-white/85 backdrop-blur-lg border border-white/80 p-2 shadow-md`.
- [ ] **Bảng Nhà Xe Kính Mờ**: Bảng dữ liệu kính mờ cao cấp với các nút hành động Khóa / Mở khóa nhà xe qua `ConfirmDialog` kính mờ.

---

### 9.3. Duyệt hồ sơ đăng ký đối tác `/admin/applications`
**Files**: `AdminOperatorApplicationsPage.tsx`, `AdminApplicationDetailModal.tsx`, `AdminRejectApplicationModal.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Bảng Hồ Sơ Đăng Ký Kính Mờ**: Thẻ bao kính `rounded-3xl bg-white/85 backdrop-blur-md border border-white/75 shadow-md`.
- [ ] **Modal Soi Giấy Tờ Song Song (KYC Document Inspector Glass Modal)**:
  - Khung modal kính mờ cực lớn `max-w-5xl rounded-[32px] bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl p-8`.
  - Cánh trái: Trình xem ảnh CCCD / Giấy phép kinh doanh chất lượng cao trên nền kính mờ có nút zoom.
  - Cánh phải: Thông tin pháp nhân và cụm nút "Duyệt hồ sơ" (Coral Glow Pill) / "Từ chối" (Destructive Glass Pill).

---

### 9.4. Đơn hàng toàn sàn `/admin/orders`
**File**: `AdminOrdersPage.tsx`.

Yêu cầu chi tiết Glass & Capsule:
- [ ] **Bảng Giao Dịch Toàn Sàn Kính Mờ**: Bảng kính mờ với bộ lọc đa nhà xe, tiền tệ hiển thị định dạng chuẩn `tabular-nums`.
- [ ] **Hộp Thoại Hủy Đơn Cưỡng Chế (Force Cancel Dialog)**: Dialog kính mờ cảnh báo mức độ nghiêm trọng với nút xác nhận hủy màu đỏ san hô thẫm.

---

### 9.5. Trung tâm vận hành Admin (7 Modes) `/admin/operations`
**File**: `AdminOperationsPage.tsx`.

Yêu cầu chi tiết Glass & Capsule cho từng chế độ:
- [ ] **Chế độ Offers (Mở bán & Ưu đãi)**: Thẻ kính duyệt danh sách chuyến xe được đẩy lên trang tìm kiếm khách hàng.
- [ ] **Chế độ Refunds (Hoàn tiền hành khách)**: Bảng kính đối soát hoàn tiền tự động và hoàn tiền thủ công qua ca tiền mặt.
- [ ] **Chế độ Cancellations (Hủy chuyến khẩn cấp & Đổi chuyến trợ giúp)**: Khung theo dõi Saga hủy chuyến dạng timeline kính mờ thời gian thực, loại bỏ hoàn toàn các khung JSON thô.
- [ ] **Chế độ Reconciliation (Đối soát giao dịch)**: Bảng kính phân tích các đơn hàng lệch số liệu giữa cổng thanh toán và nhà xe.
- [ ] **Chế độ Payouts (Chi trả doanh thu nhà xe)**: Bảng kính duyệt chi doanh thu cho nhà xe kèm form đính kèm bằng chứng chuyển khoản ngân hàng.
- [ ] **Chế độ Accounts (Phân quyền tài khoản)**: Bảng kính cấp phát vai trò Quản trị viên / Nhà xe / Nhân viên với các chip viên nang.
- [ ] **Chế độ Policies (Cấu hình chính sách & Hoa hồng)**: Form kính điều chỉnh tỷ lệ hoa hồng sàn có nhật ký kiểm toán (Audit Trail) minh bạch.

---

## 10. Modal và Component cần nâng cấp Glass & Capsule

Đảm bảo tất cả các modal, dialog và popover sau đây đều sở hữu:
1. Nền mờ kính xung quanh: `backdrop-blur-md bg-black/25`.
2. Khung nội dung kính: `rounded-[28px] bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl`.
3. Thanh nút hành động chân modal dạng viên nang nổi bồng bềnh (`floating capsule footer`).

### Danh mục:
- [ ] `CustomerTripDetailModal.tsx`
- [ ] `DatePickerPopover.tsx`
- [ ] `LocationCombobox.tsx`
- [ ] `AddCarModal.tsx`
- [ ] `CreateRouteModal.tsx`
- [ ] `ConfirmToggleRouteModal.tsx`
- [ ] `CreateTripModal.tsx`
- [ ] `TripRouteDetailModal.tsx`
- [ ] `ConfirmUpdateTripStatusModal.tsx`
- [ ] `AdminApplicationDetailModal.tsx`
- [ ] `AdminRejectApplicationModal.tsx`
- [ ] `AdminUserDetailModal.tsx`
- [ ] `ConfirmDialog.tsx` & `FormDialog.tsx`

---

## 11. Lộ trình triển khai & Danh mục kiểm tra nâng cấp Glass

### Giai đoạn G0: Củng cố Nền tảng Tokens & Utility CSS
- [x] Thêm các utility `.glass-capsule-dock`, `.glass-capsule`, `.input-pill-island`, `.glow-coral` vào `src/index.css`.
- [ ] Bổ sung các class token kính mờ tiện ích: `.glass-surface-card`, `.glass-capsule-bar`, `.glass-dock-floating`.
- [ ] Nâng cấp `SurfaceCard.tsx` để hỗ trợ prop `variant="glass"`, `variant="glass-elevated"`, `variant="glass-capsule"`.

### Giai đoạn G1: Đồng bộ Shells Kính Mờ Toàn Hệ Thống
- [ ] Nâng cấp `Navbar.tsx` sang chuẩn Frosted Glass Navbar (`backdrop-blur-xl bg-white/80 border-b border-white/60`).
- [ ] Nâng cấp `CustomerLayout.tsx` với lớp nền khúc xạ ambient và footer kính hiện đại.
- [ ] Nâng cấp `OperatorLayout.tsx` với Topbar kính mờ và Sidebar dock viên nang nổi.
- [ ] Nâng cấp `StaffLayout.tsx` và `AdminLayout.tsx` theo chuẩn Topbar & Sidebar kính mờ.

### Giai đoạn G2: Nâng cấp Kính Mờ Khách Hàng (Customer Discovery)
- [ ] Nâng cấp `/search`: Thanh lệnh Compact Glass Capsule, Filter Sidebar đảo kính, Trip Card Boarding Pass kính mờ.
- [ ] Nâng cấp `/trips/:tripId`: Route Header Capsule, Khoang xe tương tác kính mờ, Floating Glass Summary Dock chân trang.

### Giai đoạn G3: Nâng cấp Kính Mờ Đặt Vé & Tài Khoản Khách (Customer Account)
- [ ] Nâng cấp `/checkout/:orderId`: Countdown capsule banner, TicketStubCard đục lỗ laser, Payment card kính.
- [ ] Nâng cấp `/payment/return`: Receipt capsule card kính mờ trung tâm.
- [ ] Nâng cấp `/account/tickets`: Tab filter capsule dock, danh sách Boarding Pass kính mờ.
- [ ] Nâng cấp `/account/orders/:orderId`: Hộp trưng bày QR kính mờ, Action capsule dock.
- [ ] Nâng cấp Exchange, Amend, OperationProgress, Disputes, Profile sang chuẩn thẻ kính và viên nang.

### Giai đoạn G4: Nâng cấp Kính Mờ Cổng Nhà Xe (Operator Portal)
- [ ] Nâng cấp Dashboard: KPI capsules, Quick action dock.
- [ ] Nâng cấp Đội xe (`/operator/cars`): Thanh filter capsule, Car table kính mờ, AddCarModal kính.
- [ ] Nâng cấp Sơ đồ ghế (`/operator/cars/:carId/seats`): Khoang xe kính mờ, Sticky glass save bar.
- [ ] Nâng cấp Điểm đón trả & Tuyến đường (`/operator/stops`, `/operator/routes`): Dải ruy băng lộ trình kính, wizard modal kính.
- [ ] Nâng cấp Chuyến xe & Trung tâm chuyến (`/operator/trips`, `/operator/trips/:tripId/manage`): Trip cards kính, Sơ đồ ghế quản trị kính.
- [ ] Nâng cấp Đơn hàng, Quầy bán vé, Ca tiền mặt, Nhân sự, Báo cáo, Profile sang chuẩn kính mờ.

### Giai đoạn G5: Nâng cấp Kính Mờ Cổng Nhân Viên (Staff Portal)
- [ ] Nâng cấp Soát vé (`/staff/check-in`): **Panoramic Glass Camera Scanner Capsule**, Manual input capsule, Manifest table kính.
- [ ] Đồng bộ các trang shared của Staff theo chuẩn kính mờ.

### Giai đoạn G6: Nâng cấp Kính Mờ Cổng Quản Trị (Admin Portal)
- [ ] Nâng cấp Tổng quan (`/admin`): Ma trận KPI kính mờ.
- [ ] Nâng cấp Nhà xe & Hồ sơ duyệt (`/admin/operators`, `/admin/applications`): KYC document inspector glass modal.
- [ ] Nâng cấp Đơn hàng & Trung tâm vận hành 7 modes (`/admin/operations`): Bảng kính mờ, timeline saga kính.

### Giai đoạn G7: Kiểm thử Sản phẩm & Xuất Bản
- [ ] Chạy `npm run build` xác thực 0 lỗi TypeScript và bundle thành công.
- [ ] Tải lại dịch vụ PM2 `gocar-frontend` trên cổng 3334.
- [ ] Kiểm tra thực tế trên trình duyệt Desktop (1440px) và Mobile (390px) tại địa chỉ `https://gocar.nonnet123.io.vn`.

---

## 12. Ma trận Route để đối chiếu toàn vẹn (Zero Route Drop)

### Customer (14 routes)
- [x] `/` (HomePage)
- [ ] `/search` (CustomerTripSearchPage)
- [ ] `/trips/:tripId` (TripDetailPage)
- [ ] `/checkout/:orderId` (CheckoutPage)
- [ ] `/payment/return` (PaymentReturnPage)
- [ ] `/login` (LoginPage)
- [ ] `/register` (RegisterPage)
- [ ] `/account/tickets` (CustomerTicketsPage)
- [ ] `/account/orders/:orderId` (CustomerOrderDetailPage)
- [ ] `/account/orders/:orderId/items/:itemId/exchange` (ExchangeTicketPage)
- [ ] `/account/orders/:orderId/items/:itemId/amend` (AmendTicketPage)
- [ ] `/account/operations/:operationId` (OperationProgressPage)
- [ ] `/account/profile` / `/profile` (ProfilePage)
- [ ] `/account/disputes` (CustomerDisputesPage)
- [ ] `/become-operator` / `/operator/register` (OperatorRegisterPage)

### Operator (13 routes)
- [ ] `/operator` / `/operator/dashboard` (OperatorDashboardPage)
- [ ] `/operator/cars` (OperatorCarListPage)
- [ ] `/operator/cars/:carId/seats` (OperatorSeatLayoutPage)
- [ ] `/operator/stops` (OperatorStopsPage)
- [ ] `/operator/routes` (OperatorRouteListPage)
- [ ] `/operator/trips` (OperatorTripListPage)
- [ ] `/operator/trips/:tripId/manage` (OperatorTripManagePage)
- [ ] `/operator/orders` (OperatorOrdersPage)
- [ ] `/operator/counter` (OperatorCounterPage)
- [ ] `/operator/shifts` (OperatorShiftsPage)
- [ ] `/operator/staff` (OperatorStaffPage)
- [ ] `/operator/reports` (OperatorReportsPage)
- [ ] `/operator/profile` (OperatorProfilePage)
- [ ] `/operator/offers/:listingId` (OperatorOfferContentPage)

### Staff (6 routes)
- [ ] `/staff` (OperatorDashboardPage trong shell Staff)
- [ ] `/staff/trips` (OperatorTripListPage trong shell Staff)
- [ ] `/staff/check-in` (StaffCheckInPage)
- [ ] `/staff/counter` (OperatorCounterPage trong shell Staff)
- [ ] `/staff/shifts` (OperatorShiftsPage trong shell Staff)
- [ ] `/staff/orders` (OperatorOrdersPage trong shell Staff)

### Admin (12 routes)
- [ ] `/admin` (AdminTransportOverviewPage)
- [ ] `/admin/operators` (AdminOperatorListPage)
- [ ] `/admin/applications` / `/admin/operator-applications` (AdminOperatorApplicationsPage)
- [ ] `/admin/orders` (AdminOrdersPage)
- [ ] `/admin/offers` (AdminOperationsPage mode Offers)
- [ ] `/admin/refunds` (AdminOperationsPage mode Refunds)
- [ ] `/admin/cancellations` (AdminOperationsPage mode Cancellations)
- [ ] `/admin/reconciliation` (AdminOperationsPage mode Reconciliation)
- [ ] `/admin/payouts` (AdminOperationsPage mode Payouts)
- [ ] `/admin/accounts` (AdminOperationsPage mode Accounts)
- [ ] `/admin/policies` (AdminOperationsPage mode Policies)

---

## 13. Definition of Done cho Kế hoạch Nâng cấp Glassmorphism

Toàn bộ công việc chỉ được coi là hoàn tất khi:

1. **Hiệu ứng Kính Mờ & Viên Nang Hiện Diện Rõ Nét**: Toàn bộ các trang từ Khách hàng, Nhà xe, Nhân viên đến Quản trị viên đều sở hữu các khối kính mờ bán trong suốt (`backdrop-blur-md` đến `backdrop-blur-xl`), viền kính phản quang `border-white/80`, và các thanh lệnh viên nang khí động học (`rounded-full` / `rounded-[28px]`).
2. **Loại Bỏ Hoàn Toàn Hộp Trắng Thô Cứng**: Không còn các khối hộp chữ nhật nền trắng đặc thô thiển như phần mềm SaaS lỗi thời.
3. **Điểm Nhấn San Hô Phát Sáng Rực Rỡ**: Các nút hành động chính, nút chọn ghế, nút tìm kiếm, nút thanh toán và quét QR đều có hiệu ứng phát sáng `glow-coral` sang trọng.
4. **Bảo Toàn Nghiệp Vụ 100%**: Zero lỗi runtime, zero gián đoạn API/DTO, zero thay đổi route/auth.
5. **Độ Tương Phản & Trải Nghiệm Mượt Mà**: Đạt chuẩn WCAG AA cho toàn bộ văn bản và dữ liệu số trên nền kính.
6. **Kiểm Thử Xuyên Suốt**: `npm run build` thành công rực rỡ và chạy hoàn hảo trên cả Desktop lẫn Mobile.
