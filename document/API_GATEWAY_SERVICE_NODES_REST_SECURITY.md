# Gateway: node service, tài nguyên REST và chính sách bảo mật

Ngày cập nhật: **04/10/2026**. Giao diện: `http://localhost:5555/admin/gateway` trên server, hoặc `http://100.100.181.60:5555/admin/gateway` qua Tailscale.

## 1. Cách dùng giao diện

1. Đăng nhập bằng tài khoản SSO có `ROLE_ADMIN`.
2. Phía trên là sơ đồ **API Gateway → các node service**. Mỗi node có tên, URL backend, số route và trạng thái kết nối TCP.
3. Bấm node để lọc API của service đó. Bấm Gateway để trở lại tất cả node.
4. Mở nhóm service để xem từng tài nguyên. Mỗi hàng thể hiện **HTTP method → URL Gateway → URL backend**, xác thực và các giới hạn đang bật.
5. Bấm hàng hoặc **Thiết lập** để sửa. **Chép** sao chép URL Gateway/backend. Có thể chuyển sang **Bảng API** để đối chiếu nhiều route.
6. Lọc thêm theo method, trạng thái, xác thực và từ khóa. Thay đổi được lưu trên SQLite và có hiệu lực sau khi lưu thành công.

“Kết nối TCP” chỉ xác nhận cổng backend đang tiếp nhận kết nối; không xác nhận mọi chức năng nghiệp vụ của service.

## 2. Tạo tài nguyên REST

Chọn node → **Tài nguyên REST** → nhập tên, đường dẫn tài nguyên ở Gateway/backend và kiểu định danh → chọn các thao tác backend đã hỗ trợ.

Ví dụ: tài nguyên **đơn vé**, Gateway `/api/v1/tickets/orders`, backend `/api/orders`, định danh `id` kiểu số:

| Thao tác | Method | Gateway | Backend |
| --- | --- | --- | --- |
| Danh sách | GET | `/api/v1/tickets/orders` | `/api/orders` |
| Chi tiết | GET | `/api/v1/tickets/orders/:id` | `/api/orders/:id` |
| Tạo mới | POST | `/api/v1/tickets/orders` | `/api/orders` |
| Thay toàn bộ | PUT | `/api/v1/tickets/orders/:id` | `/api/orders/:id` |
| Cập nhật một phần | PATCH | `/api/v1/tickets/orders/:id` | `/api/orders/:id` |
| Xóa | DELETE | `/api/v1/tickets/orders/:id` | `/api/orders/:id` |

Ngữ nghĩa các phương thức được đối chiếu với [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) và [RFC 5789 về PATCH](https://www.rfc-editor.org/rfc/rfc5789.html). Các mã 200/201/204 hiển thị trong trình tạo là gợi ý về response thường dùng; **backend quyết định response thực tế**.

### Mặc định của trình tạo

- Mỗi thao tác là một endpoint `exact` với method riêng, hỗ trợ kiểu ID `uuid`, `number` hoặc một đoạn đường dẫn.
- Tất cả thao tác yêu cầu JWT. Có thể chọn GET công khai; thao tác ghi luôn cần JWT.
- Quyền vai trò được khai báo chung. Backend vẫn kiểm tra quyền truy cập từng đơn/tài nguyên và schema dữ liệu nghiệp vụ.
- Body giới hạn 1 MiB. Thao tác ghi chỉ cho body có `Content-Type: application/json`.
- Đọc: 180 request/phút; ghi: 30 request/phút; có thể chỉnh hai giá trị và khóa tính hạn mức.
- Có thể dùng chung quota cho hai nhóm đọc/ghi của tài nguyên trong cùng service. Nhóm tự sinh có dấu nhận diện từ URI tài nguyên để giảm trùng tên.
- Nếu backend service chưa được cấu hình hoặc đang tắt, các route được lưu ở trạng thái tắt để chuẩn bị triển khai.

Trước khi lưu, màn hình hiển thị tất cả URL sẽ tạo, phương thức, quyền, body và rate limit. Endpoint đã có cùng path/method được báo trùng để chọn bỏ hoặc chỉnh route hiện có.

**Lưu toàn bộ endpoint** dùng một transaction SQLite. Chỉ một endpoint sai/chồng lấn cũng làm cả lần tạo bị từ chối. Không có trạng thái tạo được một phần. Backend vẫn kiểm tra version nên một cửa sổ khác vừa thêm API cũng không bị ghi đè.

Trình tạo định nghĩa luồng proxy. Nó không tạo controller, bảng dữ liệu hoặc logic nghiệp vụ trong service. Với các API cũ dạng namespace, UI ghi rõ **Namespace + phần path còn lại**; có thể tạo endpoint cụ thể hoặc chỉnh lại định nghĩa khi backend đã có hợp đồng API tương ứng.

## 3. Rate limit

Mở route → **Xác thực & giới hạn**:

| Trường | Ý nghĩa |
| --- | --- |
| Bật giới hạn | Bật/tắt quota của route. |
| Số request | 1–100000 request trong cửa sổ. |
| Cửa sổ | 1–86400 giây. |
| IP nguồn | Giới hạn theo IP; IPv6 được chuẩn hóa bởi `ipKeyGenerator`. Áp dụng trước xác thực, tính cả yêu cầu bị từ chối ở các bước sau. |
| Tài khoản | Giới hạn theo subject JWT đã xác minh; thay IP không tạo quota mới cho cùng tài khoản. |
| IP + tài khoản | Mỗi cặp IP/subject có quota riêng. |
| Nhóm dùng chung | Cùng service và cùng mã nhóm sử dụng chung bộ đếm; để trống là quota riêng từng route. |
| Áp dụng cho cả nhóm | Sao chép **chỉ cấu hình rate limit** tới mọi route cùng service/nhóm trong một lần lưu. Body, IP, MIME và quyền của các route khác vẫn giữ cấu hình riêng. |

Các route dùng chung nhóm phải có cùng khóa, limit và cửa sổ. Nếu không chọn áp dụng cho nhóm, đổi riêng một route làm nhóm lệch chính sách sẽ bị từ chối. Route public chỉ được dùng khóa IP, vì không có tài khoản đã xác minh.

Có các mẫu nhanh: API đọc 120/phút, API ghi 30/phút, nhạy cảm 5/15 phút. Vượt quota trả **429**, kèm `Retry-After` và các header `RateLimit-*`.

Tại **Chính sách**, có thể bật thêm quota IP chung cho `/api/v1/`. Quota chung và quota route được áp dụng đồng thời. API quản trị và health được tách khỏi quota chung để admin có thể sửa một cấu hình quá chặt. Luồng đăng nhập còn có giới hạn riêng của SSO.

### Phạm vi bộ đếm

- Bộ đếm nằm trong RAM của từng tiến trình Gateway; không lưu từng request vào SQLite.
- Đổi cấu hình không liên quan không xóa bộ đếm. Đổi limit/cửa sổ/khóa/nhóm tạo phạm vi bộ đếm theo chính sách mới.
- Restart làm mất bộ đếm. Chạy nhiều replica cần kho dùng chung như Redis.
- Hạn mức theo tài khoản được tính sau khi xác minh JWT và quyền route; không lấy `x-user-id` do client gửi. Giới hạn chung theo IP hữu ích để hạn chế yêu cầu không xác thực hoặc bị từ chối trước bước quota tài khoản.

## 4. Bảo vệ request theo route

| Cấu hình | Hành vi thực thi |
| --- | --- |
| Chỉ HTTPS | HTTP trả 403. `req.secure` dùng kết nối/proxy được tin cậy theo `TRUST_PROXY`. Localhost/Tailscale HTTP cũng bị từ chối nếu bật. |
| Body tối đa | Nhập KiB, 0 nghĩa là không đặt giới hạn riêng. Tối đa 50 MiB. Vượt mức trả 413. |
| Content-Type | Áp dụng khi request có body. Chỉ cho MIME được khai báo; hỗ trợ `image/*` và `application/*+json`. MIME không hợp lệ trả 415. |
| IP/CIDR được phép | Hỗ trợ IPv4/IPv6 và CIDR. Danh sách rỗng không giới hạn IP. |
| IP/CIDR bị chặn | Ưu tiên danh sách chặn, kể cả IP đồng thời thuộc danh sách cho phép. Trả 403. |
| Origin riêng | Kiểm tra Origin/Referer khi có. Không mở rộng CORS/CSRF chung và không thay thế JWT. Client API không có origin vẫn đi qua xác thực/quyền. |

Màn hình hiển thị IP và HTTP/HTTPS của kết nối quản trị hiện tại để tham khảo khi đặt CIDR. IP của người dùng khác có thể khác; phải cấu hình proxy tin cậy đúng để IP phản ánh nguồn truy cập thật.

### Bảo đảm với body có giới hạn

Gateway kiểm tra Content-Length và đọc body trong giới hạn **trước khi mở request tới backend**. Request chunked vượt mức cũng bị chặn; không gửi một phần thao tác ghi rồi mới trả 413.

Body hợp lệ được chuyển tiếp nguyên byte, cập nhật Content-Length và bỏ Transfer-Encoding khi cần. Giới hạn là kích thước body nhận được; backend vẫn cần giới hạn giải nén, parse JSON, số phần multipart và kích thước dữ liệu nghiệp vụ của mình.

Để tránh buffer không giới hạn, Gateway giữ ngân sách 64 MiB body đang xử lý và tối đa 32 lượt buffer đồng thời; hết ngân sách trả 503. Request không có body không chiếm lượt buffer. Nhận body quá thời gian `min(timeout route, 30 giây)` trả 408. Request hủy/lỗi được giải phóng bộ nhớ.

### Ví dụ cấu hình JSON

```json
{
  "rateLimit": {
    "enabled": true,
    "limit": 30,
    "windowMs": 60000,
    "key": "user",
    "group": "ticket-orders-write"
  },
  "security": {
    "requireHttps": true,
    "maxBodyBytes": 1048576,
    "allowedContentTypes": ["application/json"],
    "allowedIps": [],
    "blockedIps": ["203.0.113.10"],
    "allowedOrigins": ["https://gostay.nonnet123.io.vn"]
  }
}
```

Các giá trị IP/domain trong ví dụ chỉ là minh họa.

## 5. Bảo vệ phản hồi và phiên

**Chính sách → Bảo vệ chung cho API** thêm:

- Bật `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` và `Referrer-Policy: no-referrer`.
- `HSTS max-age`: 0 là tắt; chỉ phát trên HTTPS. Bật sau khi HTTPS của domain đã ổn định.
- Bỏ `X-Powered-By` của Express.
- Proxy không để backend ghi đè các header phản hồi thuộc chính sách chung. Giao diện quản trị vẫn có CSP/anti-frame riêng.
- Response 429 vẫn mang CORS của origin đã được phép, để frontend đọc được thông báo giới hạn.

Các cơ chế JWT RS256/issuer/audience, cookie HttpOnly, CSRF, kiểm tra quyền admin hiện tại, lọc header nội bộ và chặn namespace internal/actuator tiếp tục được áp dụng. Không cho cấu hình custom header ghi đè header danh tính, xác thực, cookie, CORS hoặc header bảo mật chung.

Các lớp bảo vệ được đối chiếu với [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html). Phân quyền trên tài nguyên và xác minh webhook thanh toán vẫn là trách nhiệm của service.

## 6. API quản trị bổ sung

### Tạo nhiều route

`POST /api/v1/gateway-admin/routes/batch`:

```json
{ "version": 1, "items": ["các object route đầy đủ"] }
```

`items` thực tế là mảng object, không phải chuỗi như phần giữ chỗ ở ví dụ. Mỗi lần 1–20 route, kiểm tra toàn bộ và lưu một version/audit. 400 nếu không hợp lệ; 409 nếu version đã thay đổi.

### Đổi hạn mức của một nhóm

`POST /routes` hoặc `PUT /routes/:id` trong base quản trị có thể gửi thêm `applyRateLimitToGroup: true` cạnh `version` và `item`. Item phải có nhóm hợp lệ. Cập nhật cả nhóm diễn ra trong cùng transaction và kiểm tra đầy đủ quyền/schema.

### Chính sách chung

`settings.trafficPolicy`:

```json
{
  "securityHeaders": true,
  "hstsMaxAgeSeconds": 0,
  "rateLimit": { "enabled": false, "limit": 600, "windowMs": 60000 }
}
```

`GET /overview` bổ sung `requestContext: {ip, secure}`. `POST /preview` bổ sung rate limit và security của route đã khớp; preview vẫn không gửi request nghiệp vụ.

## 7. Dữ liệu cũ và vận hành

- Giữ nguyên database, ID, route, service và các chính sách đã lưu. Không nhập lại seed và không tạo API minh họa trên production.
- Route cũ chưa có trường mới được đọc với quota key IP, không nhóm, không giới hạn body/MIME/IP/HTTPS riêng. Không tự bật giới hạn mới cho các route cũ.
- Mặc định policy chung bật header bảo mật; quota chung và HSTS tắt để nhóm cấu hình theo môi trường.
- Route mới trên UI dùng JWT, rate limit IP 120/phút và body 1 MiB. Có thể chỉnh đầy đủ trước khi lưu.
- Cửa sổ UI cũ bỏ qua trường mới khi sửa route sẽ giữ security và khóa/nhóm quota hiện có, để không âm thầm xóa bảo vệ. Mở lại trang để sử dụng giao diện mới.
- Các node service mới vẫn chịu allowlist upstream host. `TRUST_PROXY`, bind host/port, đường dẫn DB, khóa và bí mật vẫn quản lý ở môi trường triển khai.
- Thay chính sách có audit/version, đồng bộ SSE, chống ghi đè và khôi phục như bản SQLite trước.
- `pm2 save` vẫn vướng quyền tệp của `nhan`; đây là vấn đề tự khởi động sau reboot, không cản việc lưu route realtime đang chạy.

Hướng dẫn backup và kiến trúc SQLite đầy đủ: [API_GATEWAY_DYNAMIC_SQLITE.md](API_GATEWAY_DYNAMIC_SQLITE.md).

## 8. Kiểm chứng

- **24/24 test tự động đạt**, dùng database/server/mock SSO tách biệt với production.
- Bao gồm: batch REST atomic và conflict, cả sáu method, quota tài khoản/IP+tài khoản/nhóm, sửa hạn mức cả nhóm, HTTPS, CIDR và ưu tiên deny, IPv4 mapped IPv6, origin, MIME, Content-Length/chunked/body nguyên byte, quota chung, CORS trên 429, HSTS và tương thích client cũ. Các kiểm thử JWT/CSRF/header nội bộ/SQLite/SSE/rollback trước đây tiếp tục đạt.
- Chromium: sơ đồ 9 node, giữ 69 route ban đầu, tạo 6 endpoint, cookie/CSRF với mọi method, lưu body limit và quota nhóm thực thi thật, realtime giữ bản nháp, conflict, đổi node target, rollback, chuyển bảng/node và mobile 390px không tràn trang/không lỗi JS.
- Kiểm thử tạo/sửa REST và bảo mật thực hiện trên fixture. Không tạo đơn/vé hoặc giao dịch thanh toán trên hệ thống thật.
- `npm audit` còn 5 mục high tổng (3 trong dependency production), cùng chuỗi advisory `braces` qua `micromatch/http-proxy-middleware` và `chokidar/nodemon`. Không dùng glob/pathFilter lấy từ client cho routing, nhưng vẫn cần theo dõi bản vá upstream; chưa thể coi dependency đã sạch.

## 9. Kết quả triển khai thực tế

Đã triển khai trên `devserver` và restart riêng `gostay-gateway` bằng PM2, dùng Node 22.14.0. Các process khác vẫn online và giữ nguyên PID.

| Kiểm tra | Kết quả |
| --- | --- |
| SQLite thực tế | Version 1, 69 route, 9 service; `quick_check` trả `ok`; thời gian/version cấu hình không đổi. |
| Backup trước triển khai | Snapshot qua SQLite backup API, `quick_check` trả `ok`, đủ 69 route và 9 service. |
| `/health` | 200; có nosniff, DENY, no-referrer; không có X-Powered-By. |
| `/admin/gateway` | 200 trên localhost và IP Tailscale server; xác nhận HTML mới có node service và nút đổi kiểu hiển thị. |
| `/api/v1/gateway-admin/config` không đăng nhập | 401. |
| `/api/v1/auth/session` không đăng nhập | 401. |
| Catalog landmarks và search `limit=3` | 200. |
| `/api/v1/internal/email` | 404. |
| Frontend `127.0.0.1:3000` | 200. |
| `https://gostay.nonnet123.io.vn/` | 200 khi kiểm tra bằng curl. Một lượt bằng Python urllib trả 403; chưa xác định quy tắc phía ingress gây khác biệt. |

Backup: `/home/trungcao/.local/share/gotravel-gateway/backups/gateway-before-service-nodes-2026-10-04.sqlite`, nằm ngoài Git.

Kiểm tra Tailscale thực hiện từ server; kết nối/ACL của máy cá nhân vẫn quyết định truy cập từ máy đó. Chưa dùng tài khoản admin thật trên production; toàn bộ thao tác ghi, phiên cookie/CSRF và sáu method được kiểm thử bằng trình duyệt trên fixture tách biệt. Không sửa chính sách đang lưu để phục vụ thử nghiệm.

Khả năng tự khởi động đúng cấu hình sau reboot chưa được xác nhận: tệp dump của daemon PM2 vẫn thuộc `nhan`, lần `pm2 save` trước bị EACCES. Chủ daemon/root cần xử lý quyền và lưu lại process list; bản đang chạy và lưu cấu hình SQLite realtime vẫn hoạt động.


## 10. Cỡ chữ và khả năng đọc

Đã chỉnh chữ theo phản hồi ảnh chụp giao diện: nội dung, tên node và URL ánh xạ 15px; nhãn phụ/method/chính sách 13–14,5px; tiêu đề khu vực khoảng 26–28px trên desktop. Bản 16px trước đó được giảm nhẹ theo phản hồi để bố cục gọn hơn. Dùng thang cỡ chữ rem thống nhất, màu mô tả đậm hơn và màu method/trạng thái dễ đọc hơn.

Sidebar, ô node, cột method, nút thao tác và khoảng cách hàng được điều chỉnh theo cỡ chữ mới. Tên service dài được xuống dòng; màn hình hẹp chuyển bố cục ánh xạ thành từng phần, tab cấu hình cuộn ngang thay vì thu chữ nhỏ. Nội dung ô nhập dùng độ đậm bình thường để phân biệt với nhãn.

Đã kiểm tra bằng Chromium trên fixture ở 2560, 1920, 1366, 960 và 390px: không tràn ngang trang, bảng cấu hình mobile không tràn, không có lỗi JavaScript. Chỉ cập nhật CSS; tệp static có hiệu lực khi tải lại trang.

Lượt tinh chỉnh giảm cỡ chữ kiểm tra lại trên desktop 1920px và mobile 390px: URL/tên node 15px, không tràn ngang, không có lỗi JavaScript; giảm nhẹ padding node và hàng ánh xạ.
