# Vấn đề quyền sửa mã nguồn cổng SSO

## Hiện trạng (03/10/2026)

`auth_front-end/src/App.tsx` và `auth_front-end/src/services/auth.service.ts` thuộc tài khoản `nhan`. ACL của hai tệp và thư mục `auth_front-end/src/services` chỉ cho tài khoản `trungcao` quyền đọc. Vì vậy phiên làm việc này không thể đồng bộ bản sửa SSO trực tiếp vào hai tệp trong thư mục dùng chung.

Điều này ảnh hưởng bản sửa bảo mật cookie: cổng SSO cũ vẫn đọc JWT từ phản hồi đăng nhập và ghi cookie bằng JavaScript, trong khi Gateway mới chỉ trả trạng thái phiên và phát cookie `HttpOnly`. Nếu chỉ cập nhật Gateway mà chưa cập nhật cổng SSO, đăng nhập qua cổng SSO sẽ lỗi.

Bản sửa của hai tệp đã được chuẩn bị, kiểm tra TypeScript và đưa vào commit Git qua vùng staging. Do giới hạn ACL, bản sao trong thư mục làm việc trên máy chủ vẫn là phiên bản cũ; `git status` có thể hiện hai tệp này là thay đổi sau commit. **Chưa khởi động lại Gateway hoặc cổng SSO trên máy chủ cho tới khi hai tệp cục bộ được đồng bộ.**

Các tệp `.env` cục bộ của Gateway/media/search đang giữ token nội bộ cũ. Khi triển khai, cần tạo token ngẫu nhiên mới và cấu hình cùng một giá trị cho các dịch vụ gọi nội bộ, cấu hình `CSRF_SECRET` riêng cho Gateway, rồi khởi động lại các dịch vụ theo một đợt phối hợp. Không dùng lại token cũ trong lịch sử Git.

## Nhờ Nhân hỗ trợ

Nhân có thể cấp quyền ghi có phạm vi hẹp từ thư mục gốc dự án:

```bash
setfacl -m u:trungcao:rwx auth_front-end/src auth_front-end/src/services
setfacl -m u:trungcao:rw auth_front-end/src/App.tsx auth_front-end/src/services/auth.service.ts
```

Sau khi cấp quyền, kiểm tra `git diff` trên hai tệp để tránh ghi đè công việc đang làm. Nếu bản sửa SSO đã có trong Git nhưng thư mục dùng chung còn nội dung cũ, có thể đồng bộ hai tệp từ commit mới sau khi đã kiểm tra thay đổi cục bộ:

```bash
git restore --source=HEAD -- auth_front-end/src/App.tsx auth_front-end/src/services/auth.service.ts
```

Kiểm tra lại cổng SSO: đăng nhập phát cookie `access_token` có `HttpOnly`, JavaScript chỉ nhận trạng thái phiên, các yêu cầu thay đổi dữ liệu gửi `X-CSRF-Token`, đăng xuất gọi `POST /api/v1/auth/logout`, và truy cập GoTravel từ cổng SSO vẫn dùng chung phiên.
