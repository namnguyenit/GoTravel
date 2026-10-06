# Các hostname cần mở qua Cloudflare

## GoTravel hiện tại

| Hostname | Service URL | Chức năng |
| --- | --- | --- |
| gotravel.trungcaodev.io.vn | http://127.0.0.1:3000 | GoTravel, trang host/enterprise và quản trị /admin |
| auth.trungcaodev.io.vn | http://127.0.0.1:3335 | Đăng nhập SSO |
| api.trungcaodev.io.vn | http://127.0.0.1:5555 | API Gateway và quản trị /admin/gateway |
| pay.trungcaodev.io.vn | http://127.0.0.1:3336 | Portal thanh toán |

Bốn hostname này là đủ cho GoTravel hiện tại. Trên Dashboard chọn service HTTP, giữ path trống và nhập URL đúng cổng ở trên.

Không cần hostname riêng cho CatalogandListing, BookingandInventory, CartandOrder, PaymentandWallet, Identity, media hoặc search: các API của chúng đi qua Gateway. Ảnh công khai được phục vụ từ Cloudinary.

## Tùy chọn / chưa triển khai

- GoCar: gocar.trungcaodev.io.vn → http://127.0.0.1:3334 nếu muốn mở giao diện GoCar đang chạy. Người dùng hiện chưa yêu cầu phát triển GoCar.
- GoTicket: chưa có frontend đang chạy trong danh sách PM2; chưa cần route production. Khi triển khai frontend, xác định cổng chạy trước khi thêm hostname.

## Trạng thái kiểm tra

Tunnel mới đã nhận cả bốn hostname. GoTravel, auth và payment health trả HTTPS 200. Login/session/logout qua proxy GoTravel mới và miền cũ đã đạt qua HTTPS. Sau build/restart, login qua auth mới → session trên GoTravel → logout đều trả 200; cookie đúng domain, Secure/HttpOnly, JWT không có trong JSON. API còn trả HTTP 530 / Cloudflare 1033 tại thời điểm kiểm tra, cần kiểm tra bản ghi DNS/tunnel trong Dashboard.

Đích CNAME cho tunnel mới đang chạy:

`2ffdcc9d-8555-4fe5-9521-7fb605b42378.cfargotunnel.com`

Giữ chế độ Proxied. Đối chiếu target của api với gotravel/pay đang hoạt động, không chỉ kiểm tra hostname đã có trong danh sách route. Bản ghi DNS và ingress tunnel là hai phần cấu hình riêng.

Hostname thực tế trên Dashboard là gotravel và auth. Các bản cấu hình ứng dụng đã được đồng bộ theo hai tên này, thay tên gotrvel/sso ghi trước đó. Tên miền nonnet123.io.vn vẫn được hỗ trợ.

Nguồn tham khảo:

- https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/dns/
- https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1033/


## Đợt restart hoàn tất

GoTravel, SSO frontend, Gateway, PaymentandWallet và payment portal đều online sau restart. Build GoTravel hiện là `csr-YQImvV9ashXR0Bi7Z` tại `.next-domain-cloudflare-20261006`; process PM2 frontend dùng `NEXT_BUILD_DIR` cùng giá trị. Gateway settings phiên bản 5.

Giữ các build trước để rollback; các static asset trước được giữ trong build mới. Snapshot PM2 của tài khoản nhan vẫn cần được chủ tài khoản/root lưu nếu muốn phục hồi đúng process/build sau reboot (lệnh trong CLOUDFLARE_NEW_DOMAIN_SETUP_2026-10-06.md).

Một yêu cầu login kiểm thử ngay trong đợt build/restart trả 502; lần kiểm tra sau khi hoàn tất trả 200 cho cả login/session/logout. Chưa kết luận độ ổn định dài hạn từ số lượt thử ngắn này. Bằng chứng cuối đợt trong `CLOUDFLARE_RESTART_VERIFICATION_2026-10-06.json`.
