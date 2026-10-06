# Chuyển GoTravel sang tên miền mới

## Công cụ đã cài

- Tài khoản chạy: `trungcao`.
- Binary: `/home/trungcao/.local/bin/cloudflared`, phiên bản `2026.10.0`.
- Binary tải từ release chính thức `cloudflare/cloudflared`, đã xác minh SHA256 với digest của release.
- Lệnh chạy thuận tiện: `/home/trungcao/.local/bin/gotravel-tunnel`.
- Tunnel token lưu ngoài repository: `/home/trungcao/.config/gotravel-cloudflared/tunnel-token`, quyền file 600, thư mục 700.
- Tunnel hiện tại của `nhan` vẫn đang chạy. Tunnel mới chưa chạy vì người dùng sẽ cấu hình Dashboard và nhập token.

## Tạo tunnel trên Dashboard

1. Mở Cloudflare Dashboard → Networking → Tunnels → Create Tunnel (một số giao diện hiển thị trong Cloudflare One/Zero Trust); tạo tunnel Cloudflared.
2. Chọn môi trường Linux; lấy phần token trong lệnh kết nối mà Dashboard cung cấp.
3. Trên terminal của `trungcao`, chạy:

```bash
/home/trungcao/.local/bin/gotravel-tunnel
```

4. Dán riêng token vào lời nhắc. Nội dung nhập được ẩn; script chuyển token cho cloudflared bằng `--token-file`.
5. Kiểm tra connector Connected/Healthy trên Dashboard.
6. Tại tunnel này, chọn Routes → Add route → Published application (hoặc Public hostnames ở giao diện cũ) và nhập hostname cùng Service URL.

| Ứng dụng | Service URL trên Dashboard |
| --- | --- |
| GoTravel | `http://127.0.0.1:3000` |
| SSO đăng nhập | `http://127.0.0.1:3335` |
| API Gateway | `http://127.0.0.1:5555` |
| Trang thanh toán | `http://127.0.0.1:3336` |

Các cổng trên có listener tại thời điểm kiểm tra. Việc kiểm tra này không thay thế kiểm thử toàn bộ chức năng sau chuyển miền.

Lệnh chạy foreground; đóng terminal sẽ dừng tunnel. Có thể chạy trong phiên tmux để duy trì sau khi ngắt SSH. Muốn tự khởi động khi server reboot, cần thiết lập service riêng sau khi tunnel mới kết nối thành công.

Đổi token:

```bash
/home/trungcao/.local/bin/gotravel-tunnel --set-token
```

## Cấu hình ứng dụng cần đổi khi đã có tên miền mới

Dashboard chỉ xử lý tuyến truy cập. Hiện ứng dụng còn dùng tên miền cũ `nonnet123.io.vn`:

- Gateway: `allowedOrigins` và `cookieDomain` trong cấu hình đang hoạt động của Gateway Studio; không chỉ sửa file default vì cấu hình hiện được lưu trong SQLite.
- SSO: kiểm tra các origin/redirect được cho phép và domain cookie.
- Frontend: `AuthModalContext.tsx`, `MainLayoutClient.tsx` đang chọn origin SSO bằng tên miền cố định.
- Auth frontend: `App.tsx` đang dùng tên miền cũ làm trang quay lại mặc định.
- Thanh toán: `NEXT_PUBLIC_PAYMENT_PORTAL_URL` và `GOSTAY_BASE_URL`; kiểm tra fallback trong frontend/server.
- CSRF Gateway: origin mới phải nằm trong cấu hình được phép.
- Kiểm tra các biến API URL của frontend/auth frontend; rebuild frontend sau khi đổi biến được đưa vào bundle.

Sau khi đổi: kiểm thử đăng nhập, đăng xuất, chuyển hướng SSO, request ghi có CSRF, trang quản trị Gateway và luồng chuyển sang trang thanh toán. Cookie tên miền cũ không dùng được trên tên miền mới; người dùng cần đăng nhập lại.

Phần kiểm kê trên được ghi trước khi có tên miền mới. Cấu hình ứng dụng đã được cập nhật; xem kết quả triển khai bên dưới.

## Tài liệu chính thức

- https://developers.cloudflare.com/tunnel/get-started/
- https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/run-parameters/


## Cập nhật triển khai tên miền — 2026-10-06

Ứng dụng đã cấu hình hai nhóm tên miền:

| Thành phần | Tên miền mới | Tên miền cũ | Cổng nội bộ |
| --- | --- | --- | --- |
| GoTravel | https://gotrvel.trungcaodev.io.vn | https://gostay.nonnet123.io.vn | 3000 |
| SSO | https://sso.trungcaodev.io.vn | https://auth.nonnet123.io.vn | 3335 |
| API | https://api.trungcaodev.io.vn | Giữ các tuyến proxy đang dùng | 5555 |
| Thanh toán | https://pay.trungcaodev.io.vn | https://pay.nonnet123.io.vn | 3336 |

- `gotrvel` dùng đúng cách viết người dùng yêu cầu.
- Gateway SQLite cập nhật phiên bản 2 → 3; danh sách service và route giữ nguyên.
- Settings bổ sung `cookieDomains`, chọn cookie domain theo hostname công khai hoặc Origin đã xác thực khi proxy thay Host thành localhost. Không cấp cookie theo Origin tùy ý.
- Gateway Studio cho phép nhập nhiều domain cookie bằng dấu phẩy; console cũ bỏ qua trường mới vẫn giữ danh sách hiện có khi lưu chính sách.
- CORS/CSRF cho phép các origin chính xác của cả hai miền, không dùng wildcard.
- GoTravel chọn SSO và thanh toán theo hostname đang truy cập.
- SSO giữ redirect URL chỉ khi nằm trong danh sách origin được phép; mặc định quay về GoTravel cùng nhóm miền.
- Trang thanh toán lưu origin mở checkout vào session để trả về đúng miền. Không tạo giao dịch thật khi kiểm thử chuyển miền.
- API frontend vẫn dùng `/api` cùng origin và proxy tới Gateway nội bộ, không cần gọi chéo miền chỉ để đổi hostname.
- Cookie của hai miền độc lập; tài khoản/database chung. Đăng xuất ở một miền không xóa cookie của miền còn lại.

### Kiểm thử

- Gateway: 27/27 kiểm thử đạt, gồm chọn domain cookie, đường dẫn, CSRF và bảo mật route.
- Domain routing/redirect: 2/2 kiểm thử đạt.
- Payment handoff: 1/1 đạt, có kiểm tra origin GoTravel mới và link quay về.
- Build SSO + TypeScript thành công; GoTravel webpack + TypeScript + tạo trang thành công.
- Kiểm thử đăng nhập thực qua SSO proxy cho cả hai origin bằng tài khoản seed riêng: login/session/logout đều 200; cookie Domain chính xác, Secure + HttpOnly; logout thiếu CSRF trả 403.
- Preflight trên Gateway cho cả hai nhóm origin có ACAO chính xác; origin ngoài danh sách không có ACAO.

### Runtime và khôi phục

- Restart `gostay-gateway`, `auth-frontend`, `gostay-payment-portal`, `gostay-frontend` qua PM2 hiện có của `nhan`.
- GoTravel build mới chạy tại `front_end/.next-domain-staging`, Build ID `c9z_0u7ow3lYu7rE2JEHh`; PM2 frontend đặt `NEXT_BUILD_DIR=.next-domain-staging`.
- `.next` cũ được giữ nguyên để khôi phục. Các static asset cũ được giữ trong build mới để hạn chế lỗi trên tab chưa refresh.
- Khi build lần sau: dùng thư mục build mới riêng qua `NEXT_BUILD_DIR`, kiểm tra thành công rồi cập nhật cùng biến cho process PM2. Không ghi đè thư mục build đang được process phục vụ.
- Backup SQLite ở `/home/trungcao/.local/share/gotravel-gateway/backups/before-dual-domain-2026-10-06.sqlite` (ngoài Git, quyền 600).
- Các bản build SSO trước nằm trong `/home/trungcao/.local/state/gotravel-deployments/` (ngoài Git).

### Việc còn cần hoàn tất trên Cloudflare Dashboard

Tại thời điểm kiểm tra, `gotrvel`, `sso`, `pay` chưa phân giải DNS từ server; `api` có DNS nhưng trả HTTP 530 / Cloudflare 1033, chưa hoạt động qua tunnel mới. Cấu hình connector mới vẫn chỉ có catch-all, chưa có các hostname ánh xạ tới service. Người dùng cần thêm 4 Published application routes theo bảng trên, dùng Service URL `http://127.0.0.1:<cổng>`.

Chưa thể xác nhận trọn vẹn HTTPS/SSO qua các tên miền mới cho đến khi route/DNS được cấu hình. Không dừng tunnel cũ.


### Xác minh sau triển khai

GoTravel/SSO/Gateway/payment health và các asset JS/CSS đã thử đều trả 200 nội bộ. Luồng login ở SSO → session trên GoTravel frontend → logout qua frontend đều trả 200 cho cả hai miền. Bằng chứng không chứa token/mật khẩu tại `DUAL_DOMAIN_VERIFICATION_2026-10-06.json`.

Process list PM2 hiện online, nhưng snapshot `/home/nhan/.pm2/dump.pm2` thuộc `nhan` và tài khoản `trungcao` không có quyền ghi. Không lưu được trạng thái phục hồi reboot vào snapshot này trong phiên làm việc. Chủ tài khoản hoặc root có thể lưu danh sách process hiện tại sau khi kiểm tra bằng:

```bash
sudo -u nhan env PM2_HOME=/home/nhan/.pm2 /home/nhan/.nodejs-22/bin/node /home/nhan/.nodejs/lib/node_modules/pm2/bin/pm2 save
```

Cấu hình Gateway SQLite đã được lưu bền vững. Việc lưu PM2 ở trên đảm bảo các process dùng đúng worktree/bản build sau reboot.


## Cấu hình thực tế cuối đợt Cloudflare

Dashboard hiện dùng `gotravel.trungcaodev.io.vn` và `auth.trungcaodev.io.vn` (thay `gotrvel` / `sso` ghi ban đầu). Code, origin Gateway và redirect đã đồng bộ theo các tên thực tế này. Gateway settings hiện phiên bản 5. Frontend chạy build `csr-YQImvV9ashXR0Bi7Z` tại `.next-domain-cloudflare-20261006`. Bốn route và trạng thái kiểm tra mới nhất trong `CLOUDFLARE_PUBLIC_ROUTES_2026-10-06.md`.
