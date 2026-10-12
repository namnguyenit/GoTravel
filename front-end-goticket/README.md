# GoTicket frontend — kế hoạch dựng lại

Thư mục đã đổi từ `car_front-end` thành **`front-end-goticket`**. Frontend React đã triển khai và chạy bằng PM2 trên cổng `3334`; tiến độ và các kiểm thử còn lại nằm trong checklist P0–P5.

## SSO trên domain đang dùng

- GoCar: `https://gocar.nonnet123.io.vn` → SSO: `https://auth.nonnet123.io.vn` → quay lại đúng đường dẫn GoCar.
- GoStay và GoCar thuộc `nonnet123.io.vn` dùng chung cookie `access_token` HttpOnly và cookie CSRF do Gateway phát hành. Không đọc hoặc lưu JWT bằng JavaScript.
- `VITE_API_GATEWAY_URL` để trống: browser gọi `/api/v1` trên chính domain GoCar, Vite proxy chuyển tới Gateway `5555`. Không cấu hình API ở một họ domain khác với cookie của ứng dụng.
- Bộ chọn domain nằm ở `src/shared/infrastructure/platform-domains.ts`; đăng nhập trên navbar, trang `/login`, `/register` và các guard dùng chung AuthService.
- Khởi tạo phiên qua `/api/v1/auth/session` rồi `/api/v1/me`. Khi trở lại tab, frontend cập nhật phiên trong nền. Lỗi máy chủ được hiển thị cùng nút thử lại; `401` là chưa đăng nhập/hết phiên.
- Khi đổi allowlist ở `auth_front-end/src/platform-domains.ts`, phải build và restart `auth-frontend`; sửa source đơn thuần không cập nhật bản `dist` đang phục vụ.

## Đọc và bàn giao

1. [FRONTEND_GOTICKET_PLAN.md](FRONTEND_GOTICKET_PLAN.md): thiết kế, wireframe, từng màn khách/nhà xe/nhân viên/admin, flow gọi API, rủi ro G1–G9 và checklist P0–P5.
2. [API_REFERENCE.md](API_REFERENCE.md): inventory 260 khai báo controller thuộc GoCar và các service liên quan, kèm signature và source links; bổ sung Gateway/portal/Media. Bao gồm API internal/dùng chung, không phải tất cả đều gọi từ frontend.
3. [DTO_REFERENCE.md](DTO_REFERENCE.md): DTO/validation/record/schema thực; đọc đúng service, tránh nhầm DTO trùng tên.
4. [API_INVENTORY.json](API_INVENTORY.json): inventory máy đọc được cho nhóm controller đã thu thập.
5. [COPY_TO_MODEL.txt](COPY_TO_MODEL.txt): copy toàn bộ để giao cho model không có lịch sử chat nhưng có quyền đọc workspace.

## Phạm vi hiện tại

Các màn khách hàng, nhà xe, nhân viên và admin đã được nối service. Môi trường dùng thử được chủ dự án cho phép bật bằng PM2; chưa commit/push các thay đổi hiện tại.

Các service và migration đã triển khai trên môi trường hiện tại. P5 giữ các kiểm thử race/fault/regression chưa hoàn tất; build thành công không đồng nghĩa toàn bộ nghiệp vụ đã qua kiểm thử đầu-cuối.

## Khi bắt đầu code

Đọc plan đầy đủ, giữ GoCar front/back tắt cho tới khi có yêu cầu mở môi trường. Áp dụng Clean Architecture trong [.skill/clean-architecture-frontend-skill.md](.skill/clean-architecture-frontend-skill.md). Thiết kế dùng impeccable nếu skill có trong môi trường. Giữ GoTravel tương thích khi nối service chung. Không lưu JWT ở localStorage, không đưa internal secret vào VITE env, không tự xác nhận thanh toán/hoàn tiền.
