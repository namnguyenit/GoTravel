# GoTicket — seed demo đầy đủ cho 4 vai trò

Triển khai ngày **19/10/2026**. Mỗi lượt tự lấy ngày giờ server theo `Asia/Ho_Chi_Minh`; không cố định ngày 18/19 trong dữ liệu.

## Chạy từ thư mục dự án

```bash
cd /home/DoANLienNganh
./deploy/seed-goticket-demo.sh --profile full
```

Runner cần Node.js >=22.13, các service và sáu database đã migrate. Trên máy mới, cài dependencies trước:

```bash
npm ci --prefix deploy/seeds/goticket/runner --ignore-scripts
```

**Một lượt FULL mới tạo bộ tài khoản/xe/chuyến/đơn riêng.** Muốn tiếp tục lượt bị ngắt, dùng đúng runId, không chạy FULL lần nữa:

```bash
./deploy/seed-goticket-demo.sh --resume 20261019-b2c857
```

Lệnh tạo một nhóm đơn giữ chỗ mới, còn TTL để demo; không hồi sinh giữ chỗ hết hạn hoặc dời giờ lịch sử:

```bash
./deploy/seed-goticket-demo.sh --refresh-live 20261019-b2c857
```

Nếu phiên cũ không còn chuyến đủ giờ, chạy FULL để sinh lịch mới theo hôm đó. `--snapshots-only` bỏ qua việc tạo thêm dữ liệu qua API, vẫn ghi rõ nguồn snapshot trong báo cáo.

## Dữ liệu một phiên

| Nhóm | Số lượng nền |
|---|---:|
| User mới | 200: 194 hoạt động, 4 khóa, 2 đánh dấu xóa |
| Vendor mới | 12: 9 duyệt, 2 chờ, 1 từ chối |
| Staff mới | 32; 31 assignment hoạt động, 1 đã thu hồi |
| Admin | **1 tài khoản có sẵn trong Auth; không tạo thêm** |
| Nhà xe | 8 hoạt động, 1 đình chỉ |
| Xe / mẫu ghế | 60 / 1.960 |
| Tuyến / điểm đón trả / trạm tuyến | 48 / 120 / 192 |
| Chuyến | 600: 100 quá khứ, 100 hôm nay, 400 trong 14 ngày tới |
| Inventory | 592 chuyến được khởi tạo, 20.000 ghế theo phân bổ hiện tại |
| Đơn / dòng vé | 2.000 / 3.200 |
| Vé phát hành | 2.704, gồm cả vé lịch sử/đã hủy |
| Ca tiền mặt | 40: 12 mở, 28 đóng; 6 ca có chênh lệch cố ý |
| Hỗ trợ / đổi-hủy từng vé | 80 / 120 |

Các kịch bản API có thể tạo thêm xe/tuyến/chuyến/đơn/ca hoặc đổi trạng thái. Báo cáo phân biệt số nền, số thực tế và record API. Số pending giảm theo TTL thật; không xem bảng số lượng trên là bộ đếm cố định sau khi người dùng/worker thao tác.

### Tài khoản theo vai trò

Tên dạng `gtd_<slug>_user_001`, `gtd_<slug>_vendor_001`, `gtd_<slug>_staff_001`.

- U001–020: khách sạch để tự đặt từ đầu.
- U021–080: online; U081–110: tiền mặt.
- U111–140: hoàn/hủy; U141–160: lịch sử; U161–180: hỗ trợ.
- U195–198 khóa; U199–200 đánh dấu xóa.
- V01–08 hoạt động, mỗi nhà xe 4 nhân viên; V09 đình chỉ; V10–11 pending; V12 rejected. Vendor chưa duyệt không được cấp `TICKET_VENDOR`.
- Mỗi nhóm Staff 4 người lần lượt: bán/đóng ca, check-in có scope, điều phối có scope, đầy đủ quyền. V08/S03 inactive.
- Admin dùng tài khoản đang có; runner không đổi mật khẩu, role, profile hoặc trạng thái của Admin.

Mật khẩu demo mặc định: `GoTicket@123`; có thể đặt `SEED_DEMO_PASSWORD` trước khi tạo phiên. Danh sách chính xác nằm trong `accounts.csv` của phiên, không đưa file này lên Git.

## Báo cáo và tiếp tục công việc

```text
.data/goticket-demo/current.json
.data/goticket-demo/manifest.sqlite
.data/goticket-demo/runs/<runId>/
  plan.json
  progress.json
  accounts.csv
  DEMO_GUIDE.md
  summary.json
  scenarios.json
  api-state.json
  scenario-links.json
  check-in.json
  refresh-live.json       # sau khi chạy refresh
```

- `DEMO_GUIDE.md`: tài khoản, chức năng, URL đơn/chuyến, cách trình diễn từng role.
- `summary.json`: số lượng thật, ngày giờ, lỗi nhất quán, trạng thái kịch bản.
- `api-state.json`: checkpoint từng thao tác; resume bỏ qua bước đã thực hiện.
- `check-in.json`: vé/token và nhân viên đúng nhà xe trong cửa sổ check-in lúc xuất báo cáo.
- `refresh-live.json`: các đơn/TTL mới nhất sau refresh; ưu tiên dùng nhóm này để trình diễn giữ chỗ.
- `READY`: dữ liệu nhất quán và không có scenario lỗi/chờ; `READY_WITH_PENDING_SCENARIOS`: dữ liệu sẵn sàng nhưng còn bước cần phiên Admin/worker; `PARTIAL`: có lỗi thực tế, đọc chi tiết trước khi dùng luồng bị lỗi.

Không chạy unit/integration/E2E/browser test trong lệnh seed. Runner có kiểm tra quota, ownership ghế/vé, funding lots, schema và đồng hồ để tránh ghi dữ liệu seed sai. Đây không phải xác nhận toàn bộ ứng dụng đã qua kiểm thử.

### Các thao tác Admin qua API

Nếu không truyền phiên Admin, 12 scenario Admin được ghi **PENDING**, dữ liệu để thao tác trên UI vẫn có đầy đủ. Seed không đọc mật khẩu Admin, không tạo JWT giả và không tự cấp quyền.

Có thể cấp một access token còn hạn của **Admin hiện có** qua biến môi trường `SEED_ADMIN_ACCESS_TOKEN` khi chạy `--resume`. Token chỉ dùng trong bộ nhớ, không ghi artifact/log. Nếu Auth có nhiều Admin, chọn tài khoản bằng `SEED_ADMIN_ID` khi tạo phiên. Bước duyệt KYC/hủy chuyến/chi trả sẽ thay đổi các fixture demo tương ứng; không dùng token của tài khoản khác để lách điều kiện.

## Thanh toán, email và dữ liệu dùng chung

- Tiền seed là **MOCK/DEMO**, không gọi ngân hàng để chuyển tiền thật. Chứng từ mẫu ghi rõ DEMO.
- GoPay vẫn giữ cờ MOCK chung như cấu hình đang có. `deploy/start-java-service.sh` truyền đường dẫn allowlist UUID khách demo; chỉ khách trong file đó và đơn `GOCAR_TICKET`/`GOCAR_EXCHANGE` của chính họ được mô phỏng qua API. Đơn GoTravel không được mở quyền này.
- Allowlist `.data/goticket-demo/mock-users.txt` chỉ chứa UUID, cho service Java quyền đọc. Các file tài khoản, QR và manifest vẫn riêng tư và được Git bỏ qua.
- Runner không sửa giao diện portal. Portal hiện có có thể chỉ hiển thị VNPAY; các scenario seed thanh toán mô phỏng qua API backend, không tuyên bố đã demo tương tác portal trong trình duyệt.
- Email `gtd_…@example.test` được outbox ghi `SKIPPED`, không giả `DELIVERED` và không gửi hàng nghìn email mẫu. Không đổi xử lý email thật.
- Sổ tiền theo item chỉ phân bổ cho nhánh phù hợp. Lịch sử hoàn toàn đơn dùng chứng từ hoàn toàn đơn, không gắn thêm account item làm GoPay chặn coordinator cũ.
- Không đổi hoa hồng chung: lấy rate/version transport từ GoPay đang chạy.
- Không xóa/truncate dữ liệu ngoài phiên; không sửa/xóa các money event, payout proof, receipt/refund proof bất biến.
- Record staging chỉ mở bán sau khi đã ghi đủ ghế/vé/tiền/đơn. Các thao tác tiền thật không được gọi từ runner.
- Mỗi FULL mới thêm lịch sử riêng. Hiện **không có lệnh xóa toàn bộ phiên**; giữ các chứng từ bất biến. Exception pack tùy chọn chưa triển khai, CLI từ chối thay vì tạo lỗi giả trong hệ đang chạy.

## Cấu trúc runner

`runner/src/core.mjs` (kết nối/manifest/ghi batch), `plan.mjs` (tài khoản/xe/lịch), `orders.mjs` (đơn/tiền/ca), `operations.mjs` (đổi-hủy), `http.mjs` (Auth/API), `scenarios.mjs` (50 kịch bản/refresh), `checks.mjs`, `report.mjs`, `cli.mjs`.

Dùng JavaScript ES modules, dependencies được khai báo riêng và khóa trong package-lock.json. Không dùng node_modules của service khác. Kết nối đọc cấu hình từng service hoặc biến `SEED_<AUTH|CAR|CATALOG|INVENTORY|CART|PAY>_DATABASE_URL`; không in password/secret ra log.

[Chi tiết kế hoạch và checklist](SEED_DEMO_FULL_PLAN.md) · [Kiến trúc/database](../../../README_GOTICKET.md).

## Bộ seed nhỏ cũ

Bảy SQL 01–07 được giữ để tham khảo. Chạy rõ ràng bằng:

```bash
./deploy/seed-goticket-demo.sh --profile legacy
```

Bộ cũ dùng UUID cố định và upsert, có thể dời ngày dữ liệu cũ; không chạy nó để refresh phiên FULL. Runner FULL mặc định không gọi các SQL cũ.
