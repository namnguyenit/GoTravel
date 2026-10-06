# Rà soát chuyển hướng localhost và đường truy cập API

Ngày kiểm tra: 06/10/2026. Bản đang triển khai: `/home/trungcao/DoANLienNganh-devserver`.

## 1. Kết luận về đăng nhập

Phát hiện các fallback sai trong frontend GoTravel và SSO: hostname không nằm trong danh sách nhận diện bị coi là môi trường local. Nút đăng nhập sẽ dẫn về `http://localhost:3335`; phía SSO có thể quay về `http://localhost:3000`. Localhost trên trình duyệt là máy của người dùng, không phải máy chủ.

Trước bản sửa trong đợt này, kiểm tra trên chính `gotravel.trungcaodev.io.vn/help-center` và `gostay.nonnet123.io.vn/help-center` đã chuyển đúng SSO. Vì chưa có URL cụ thể của lần người dùng gặp lỗi, chưa thể kết luận chắc chắn lỗi xảy ra trên hostname nào hoặc do tab còn giữ mã JavaScript cũ. HTML công khai và HTML local có cùng danh sách script; Cloudflare trả `DYNAMIC`, HTML có `private, no-cache, no-store`. Không có bằng chứng CDN đang cache HTML cũ.

### Các sửa đổi đã triển khai

- `front_end/src/shared/platform-domains.ts`: chỉ hostname loopback rõ ràng mới dùng SSO/payment local. Hostname khác, alias và IP truy cập từ xa dùng các miền công khai mới. Giữ nguyên nhóm miền cũ. Chuẩn hóa chữ hoa/thường và dấu chấm cuối hostname.
- `front_end/src/config/env.ts`: fallback API trình duyệt đổi từ `http://localhost:3000/api` thành `/api`.
- `auth_front-end/src/platform-domains.ts`: fallback trang chủ trên hostname công khai là GoTravel công khai; SSO công khai từ chối cả redirect_uri về localhost/127.0.0.1/IPv6 loopback. Môi trường loopback vẫn dùng được URL local. Giữ allowlist origin để tránh open redirect.
- Nút đăng nhập ở menu, thao tác yêu cầu đăng nhập và checkout cùng dùng helper của nền tảng.

Khi vào GoTravel bằng IP/alias chưa được cấp cookie SSO, đăng nhập sẽ đưa về miền GoTravel chính thức. Không tự mở quyền redirect tới IP tùy ý; phiên SSO của tên miền công khai không dùng được trên IP.

## 2. Vì sao API riêng lỗi nhưng GoTravel vẫn gọi API được?

Hai đường truy cập khác nhau:

```text
Trình duyệt → https://gotravel.trungcaodev.io.vn/api/...
            → Next.js cổng 3000
            → http://localhost:5555/api/... trên máy chủ
            → Gateway → service

Trình duyệt → https://api.trungcaodev.io.vn/...
            → route DNS / Cloudflare Tunnel của hostname API
            → hiện trả lỗi 1033
```

Frontend cấu hình `NEXT_PUBLIC_API_URL=/api`, Next.js rewrite `/api/:path*` tới Gateway nội bộ. Auth frontend cũng proxy `/api` qua Vite; payment portal proxy API qua server của portal. Các luồng này không phụ thuộc việc DNS của miền API riêng có đúng hay không. API không bỏ qua xác thực: gọi session khi chưa đăng nhập trả 401; có phiên hợp lệ trả 200.

Kiểm tra thực tế: Gateway nội bộ `/health` trả 200; tunnel mới `/ready` trả 200 với 4 kết nối; API công khai `/health` trả HTTP 530, body `error code: 1033`. Đây là lỗi đường truy cập Cloudflare, không phải chứng cứ Gateway đã dừng. Cần kiểm tra bản ghi DNS `api` trỏ tới tunnel đang hoạt động, cùng tunnel với các hostname mới khác. Target dự kiến: `2ffdcc9d-8555-4fe5-9521-7fb605b42378.cfargotunnel.com`, bật Proxied. Suy đoán trỏ nhầm tunnel cần xác minh trên Dashboard; chưa có quyền quản trị DNS để chứng minh hoặc sửa bản ghi.

Nguồn giải thích lỗi: https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1033/

## 3. Rà soát các hệ thống còn lại

| Thành phần | Kết quả |
| --- | --- |
| GoTravel | Đã sửa fallback SSO/payment theo hostname và API trình duyệt; source redirect đăng nhập/checkout dùng chung helper. |
| SSO | Đã sửa trang chủ dự phòng và chặn localhost trong return URL từ miền công khai. API dùng `/api`. |
| Payment portal | API trình duyệt dùng `/api/v1`; URL quay lại lấy từ origin đã xác thực của phiên launch. Không phát hiện redirect localhost trong luồng công khai. Truy cập portal không có phiên handoff trả 404 theo thiết kế. Không tạo giao dịch thanh toán để kiểm thử. |
| Gateway Studio | API gọi theo origin hiện tại; localhost trong cấu hình target là địa chỉ backend nội bộ. Không phải redirect trình duyệt. |
| GoCar | Còn fallback localhost trong `car_front-end/src/layouts/Navbar.tsx` và `modules/auth/presentation/pages/LoginPage.tsx`, `RegisterPage.tsx`; nhận diện production chỉ bằng miền nonnet123. Chưa sửa/deploy theo yêu cầu trước đó tạm gác GoCar. Khi mở trên miền mới cần chuyển sang helper nhận diện miền và hoàn thiện return allowlist SSO dành cho GoCar. |
| GoTicket cũ | `GoTicket/vendor-front-end/public/js/app.js:73` còn fallback API trình duyệt `http://127.0.0.1:8000/api`. Helper API ở `public/js/api.js` và frontend chính/admin đã dùng `/api`. Chưa triển khai GoTicket production; cần sửa lời gọi cũ và cấu hình reverse proxy trước khi tích hợp. Laravel `APP_URL` fallback localhost cũng phải cấu hình đúng ở môi trường triển khai. |
| Backend | Các localhost dùng cho kết nối DB, Redis, service nội bộ hoặc bind loopback là hợp lệ; không thay thành domain công khai. |

## 4. Kiểm thử và triển khai

- Test domain routing: 3/3 qua; gồm alias, IP Tailscale, hostname có chữ hoa/dấu chấm, chống redirect công khai về loopback và chống open redirect.
- Build Next.js + TypeScript thành công. Build directory mới `.next-login-routing-20261006`; PM2 `gostay-frontend` đã chuyển sang build mới.
- Build SSO TypeScript + Vite thành công; asset mới `index-BRTSt_ks.js`; PM2 `auth-frontend` đã restart.
- Trình duyệt mobile trên trang chủ thật: sau khi xác nhận nút đã có React handler, bấm Đăng nhập chuyển tới `https://auth.trungcaodev.io.vn/?redirect_uri=https%3A%2F%2Fgotravel.trungcaodev.io.vn%2F`. Lần bấm tự động trước khi hydration hoàn tất không được tính là thành công. Một lượt headless trước đó ghi nhận React #418; cần theo dõi riêng thời gian hydration trang chủ, chưa khẳng định mọi lỗi giao diện đã hết.
- Trình duyệt desktop: mở menu tài khoản và bấm Đăng nhập trên `/help-center` của cả hai miền, tới đúng `auth.trungcaodev.io.vn` / `auth.nonnet123.io.vn` với return URL đúng miền.
- Trình duyệt: đăng nhập bằng tài khoản seed kiểm thử trên SSO mới, quay lại GoTravel, session 200; đăng xuất 200. Không ghi mật khẩu/token vào báo cáo.
- Giữ các asset cũ còn thiếu để tab cũ không gặp 404; không ghi đè asset của build mới khi giữ asset cũ.
- PM2 runtime đã cập nhật. File snapshot PM2 thuộc tài khoản `nhan`; cần chủ daemon lưu snapshot để build directory mới được phục hồi đúng sau reboot (chi tiết lệnh trong báo cáo cấu hình Cloudflare).

Kết quả endpoint và URL chuyển hướng có trong `LOGIN_DOMAIN_AUDIT_2026-10-06.json`.
