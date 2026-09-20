### 3.1. Tạo tuyến đường mới (Create Route)

#### 3.1.1. Mô tả
Cho phép Chủ nhà xe (Operator) tạo một tuyến đường vận chuyển xe khách mới của nhà xe mình, bao gồm thông tin Điểm khởi hành (`origin`), Điểm đến (`destination`) và danh sách các Điểm đón/trả khách dọc đường (`RouteStop`) theo thứ tự hành trình. Tuyến đường sau khi tạo sẽ được dùng để lên lịch chạy cho các chuyến xe (`Trip`) và phục vụ hành khách lựa chọn điểm đón/trả khi đặt vé (`Ticket`).

#### 3.1.2. Tác nhân
- Chủ nhà xe (Operator / Host)

#### 3.1.3. Tiền điều kiện
- Tác nhân đã đăng nhập thành công vào hệ thống.
- Tác nhân đã được Quản trị viên (Admin) phê duyệt trở thành Nhà xe chính thức (có bản ghi tồn tại trong bảng `operators` liên kết với `user_id`).
- Tác nhân đang ở màn hình Quản lý Tuyến đường (Route Management).

#### 3.1.4. Hậu điều kiện
- Tuyến đường mới được tạo thành công trong bảng `routes` của cơ sở dữ liệu và liên kết chính xác với `operator_id` của nhà xe.
- Toàn bộ danh sách điểm dừng đón/trả được lưu thành công vào bảng `route_stops` theo đúng thứ tự `order`.
- Tuyến đường mới xuất hiện trong danh sách tuyến đường của nhà xe.

#### 3.1.5. Quy tắc nghiệp vụ
- **Quyền hạn truy cập (Chỉ dành cho Nhà xe - Operator)**: 
  - Chức năng này **chỉ có Nhà xe chính thức mới được phép thực hiện**.
  - Hệ thống sử dụng `user_id` từ Token người dùng để tra cứu bản ghi Nhà xe trong bảng `operators`:
    - Nếu tìm thấy, hệ thống lấy chính xác **`Operator.id`** (Khóa chính của bảng `operators`) để gán vào trường `operator_id` (Khóa ngoại) của bảng `routes`.
    - Nếu không tìm thấy (tài khoản người dùng thông thường `USER` hoặc chưa được phê duyệt làm nhà xe), hệ thống từ chối truy cập và phản hồi mã lỗi `403 Forbidden`.
- **Điểm khởi hành (`origin`) & Điểm đến (`destination`)**:
  - Bắt buộc nhập, độ dài từ 2 đến 100 ký tự (Ví dụ: "Hồ Chí Minh", "Đà Lạt", "Hà Nội", "Đà Nẵng").
  - `origin` và `destination` **không được trùng nhau** (hệ thống chặn không cho tạo tuyến có cùng điểm đi và điểm đến, ví dụ: "Hà Nội ➔ Hà Nội").
- **Danh sách Điểm dừng đón/trả (`RouteStop`)**:
  - Bắt buộc phải có **tối thiểu 2 điểm dừng** (tương ứng với ít nhất 1 điểm xuất phát đầu tuyến và 1 điểm trả khách cuối tuyến).
  - Tên điểm dừng (`name`): Bắt buộc nhập, độ dài từ 3 đến 100 ký tự (Ví dụ: "Bến xe Miền Đông Mới", "Trạm dừng chân Định Quán", "Bến xe liên tỉnh Đà Lạt").
  - Thứ tự điểm dừng (`order`):
    - Là số nguyên không âm bắt đầu từ `0` (0, 1, 2, 3...).
    - Thứ tự `order` trên cùng một tuyến đường phải là **duy nhất và liên tục** (`@@unique([routeId, order])`).
    - Điểm dừng đầu tiên (`order = 0`) là điểm đón xuất bến; điểm dừng cuối cùng (`order = N`) là điểm trả khách kết thúc hành trình.
- **Trạng thái ban đầu (`status`)**:
  - Mặc định khi tạo mới thành công, tuyến đường luôn được gán trạng thái `ACTIVE` (Đang hoạt động), sẵn sàng để nhà xe lên lịch các chuyến xe (`Trip`).
- **Tính toàn vẹn giao dịch (Database Transaction)**:
  - Việc tạo Tuyến đường (`Route`) và lưu toàn bộ danh sách Điểm dừng (`RouteStop`) bắt buộc phải thực thi trong cùng một Database Transaction. Nếu có bất kỳ lỗi nào xảy ra với một điểm dừng, toàn bộ quá trình tạo tuyến sẽ bị hủy bỏ (Rollback).

#### 3.1.6. Luồng chính
1. Tác nhân nhấn vào nút **"+ Tạo tuyến đường mới"** trên màn hình Quản lý tuyến đường.
2. Hệ thống hiển thị Form **"Tạo tuyến đường mới"**.
3. Tác nhân nhập các thông tin cơ bản:
   - Điểm khởi hành (`origin`).
   - Điểm đến (`destination`).
4. Tác nhân thêm danh sách các điểm đón/trả dọc tuyến:
   - Nhập tên điểm đón đầu tiên (`order = 0`).
   - Nhấn **"+ Thêm điểm dừng"** để bổ sung các trạm đón/trả dọc đường (`order = 1, 2...`).
   - Nhập tên điểm trả khách cuối cùng (`order = N`).
5. Tác nhân nhấn nút **"Lưu tuyến đường"**.
6. Hệ thống kiểm tra tính hợp lệ của dữ liệu theo Quy tắc nghiệp vụ:
   - Xác thực quyền Nhà xe của tác nhân và lấy `Operator.id`.
   - Kiểm tra `origin` khác `destination`.
   - Kiểm tra số lượng điểm dừng $\ge 2$, tính hợp lệ của tên và thứ tự `order`.
7. Hệ thống thực hiện lưu thông tin Tuyến đường (`Route`) và danh sách Điểm dừng (`RouteStop`) vào cơ sở dữ liệu trong cùng một transaction.
8. Hệ thống hiển thị thông báo thành công: *"Tạo tuyến đường thành công!"*.
9. Hệ thống đóng Form và điều hướng tác nhân về danh sách tuyến đường của nhà xe, hiển thị tuyến đường vừa tạo ở dòng đầu tiên.

#### 3.1.7. Luồng phát sinh
- **Luồng 6.a: Người dùng chưa phải là Nhà xe (`Operator`)**:
  - Tại bước 6, nếu tài khoản chưa được phê duyệt làm nhà xe (không tìm thấy trong bảng `operators`), hệ thống chặn xử lý và trả về lỗi: *"Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt."* (HTTP 403 Forbidden).
- **Luồng 6.b: Điểm đi trùng với Điểm đến**:
  - Tại bước 6, nếu `origin` trùng với `destination`, hệ thống báo lỗi: *"Điểm khởi hành và điểm đến không được trùng nhau."* (HTTP 400 Bad Request).
- **Luồng 6.c: Số lượng điểm dừng ít hơn 2**:
  - Tại bước 6, nếu danh sách điểm dừng có ít hơn 2 trạm, hệ thống báo lỗi: *"Tuyến đường phải có tối thiểu 2 điểm dừng (1 điểm đón đầu tuyến và 1 điểm trả cuối tuyến)."* (HTTP 400 Bad Request).
- **Luồng 6.d: Trùng thứ tự điểm dừng hoặc tên điểm dừng rỗng**:
  - Tại bước 6, nếu có điểm dừng bị bỏ trống tên hoặc thứ tự `order` bị trùng lặp, hệ thống báo lỗi chi tiết vào trường tương ứng (HTTP 400 Bad Request).
- **Luồng 5.a: Tác nhân hủy thao tác**:
  - Tại bước 3 hoặc 4, tác nhân nhấn nút **"Hủy"** hoặc nút **"Quay lại"**.
  - Hệ thống đóng Form mà không lưu bất kỳ dữ liệu nào.

#### 3.1.8. Giao diện minh họa
- **Hình 1: Màn hình Quản lý Tuyến đường của Nhà xe**
  - Màn hình hiển thị danh sách các tuyến hiện có của nhà xe, ở góc trên bên phải có nút hành động nổi bật màu xanh **"+ Tạo tuyến đường mới"**.
- **Hình 2: Form Tạo tuyến đường mới**
  - Phần trên: 2 ô nhập *Điểm khởi hành* (VD: "Hồ Chí Minh") và *Điểm đến* (VD: "Đà Lạt").
  - Phần dưới: Khu vực *Danh sách điểm đón/trả dọc tuyến* hiển thị dạng danh sách theo thứ tự số (0, 1, 2...) có nút di chuyển thứ tự lên/xuống, nút xóa dòng và nút bấm màu xám **"+ Thêm điểm dừng"**.
  - Cuối Form: 2 nút hành động **"Hủy"** và **"Lưu tuyến đường"**.
- **Hình 3: Kết quả sau khi Tạo tuyến thành công**
  - Màn hình quay về danh sách tuyến đường, hiển thị thông báo toast màu xanh *"Tạo tuyến đường thành công!"* và thẻ tuyến mới xuất hiện kèm đầy đủ lộ trình điểm đón/trả.
