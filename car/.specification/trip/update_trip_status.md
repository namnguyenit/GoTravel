### 4.3. Cập nhật trạng thái chuyến xe (Update Trip Status)

#### 4.3.1. Mô tả
Cho phép Chủ nhà xe (Operator) cập nhật trạng thái vận hành của một chuyến xe cụ thể theo tiến trình vòng đời thực tế:
- Xuất bến (`DEPARTED`): Khi xe bắt đầu rời bến xuất phát.
- Hoàn thành (`COMPLETED`): Khi xe đã đến bến cuối an toàn.
- Hủy chuyến (`CANCELLED`): Khi nhà xe chủ động hủy chuyến trước giờ chạy vì lý do khách quan (thời tiết, sự cố kỹ thuật).

Use case này áp dụng chặt chẽ **Máy trạng thái Chuyến xe (State Machine)**, trong đó ràng buộc quan trọng nhất là: **Chuyến xe một khi đã xuất bến (`DEPARTED`) hoặc đã hoàn thành (`COMPLETED`) thì TUYỆT ĐỐI KHÔNG ĐƯỢC HỦY (`CANCELLED`)**.

#### 4.3.2. Tác nhân
- Chủ nhà xe (Operator / Host)

#### 4.3.3. Tiền điều kiện
- Tác nhân đã đăng nhập thành công vào hệ thống.
- Tác nhân đã được Quản trị viên (Admin) phê duyệt trở thành Nhà xe chính thức (có bản ghi tồn tại trong bảng `operators` liên kết với `user_id`).
- Chuyến xe cần thao tác tồn tại trong hệ thống và thuộc quyền sở hữu của chính nhà xe đang đăng nhập.
- Tác nhân đang ở màn hình Quản lý Chuyến xe hoặc Chi tiết Chuyến xe.

#### 4.3.4. Hậu điều kiện
- Trường `status` của chuyến xe trong bảng `trips` được cập nhật sang trạng thái mới (`DEPARTED`, `COMPLETED`, hoặc `CANCELLED`).
- Trường `updatedAt` được ghi nhận theo thời gian thực hiện.
- Nếu chuyến bị Hủy (`CANCELLED`): Toàn bộ vé đã đặt (`BOOKED` / `PAID`) thuộc chuyến đó tự động chuyển sang trạng thái `CANCELLED` để phục vụ quy trình hoàn tiền cho hành khách.
- Giao diện danh sách chuyến xe được cập nhật ngay lập tức với nhãn trạng thái mới.

#### 4.3.5. Quy tắc nghiệp vụ (Business Rules)

- **1. Quyền hạn truy cập (Chỉ dành cho Nhà xe - Operator)**:
  - Chức năng này **chỉ có Nhà xe chính thức sở hữu chuyến xe đó** mới được phép thực hiện (`trip.operator_id === operator.id`).
  - Nếu tài khoản chưa phải Nhà xe: Báo lỗi `403 Forbidden`.
  - Nếu chuyến xe không tồn tại hoặc thuộc nhà xe khác: Báo lỗi `404 Not Found` (hoặc `403 Forbidden`).

- **2. Bảng chuyển đổi trạng thái hợp lệ (State Machine)**:
  - **Từ `SCHEDULED` (Sắp chạy)**:
    - ➔ Được phép chuyển sang `DEPARTED` (Khi xe xuất bến).
    - ➔ Được phép chuyển sang `CANCELLED` (Hủy chuyến trước giờ chạy).
    - ❌ Không được phép chuyển trực tiếp sang `COMPLETED` (Chưa xuất bến thì không thể đánh dấu đã hoàn thành).
  - **Từ `DEPARTED` (Đã xuất bến / Đang chạy)**:
    - ➔ Được phép chuyển sang `COMPLETED` (Khi xe đến bến đích).
    - 🚫 **CHẶN TUYỆT ĐỐI KHÔNG ĐƯỢC CHUYỂN SANG `CANCELLED`**:
      - Xe đã đón khách và đang lăn bánh trên đường, không thể hủy chuyến như chưa từng xuất bến.
      - Nếu nhà xe gửi yêu cầu chuyển sang `CANCELLED`, hệ thống từ chối và báo lỗi `400 Bad Request`:
        *"Chuyến xe đã xuất bến và đang trong hành trình di chuyển, không thể hủy chuyến."*
    - ❌ Không được phép quay lại `SCHEDULED` (Xe đã chạy không thể đảo ngược về sắp chạy).
  - **Từ `COMPLETED` (Đã hoàn thành)**:
    - Là trạng thái kết thúc (Terminal State).
    - ❌ Không được phép chuyển sang bất kỳ trạng thái nào khác (`SCHEDULED`, `DEPARTED`, `CANCELLED`).
    - Nếu gửi yêu cầu thay đổi: Báo lỗi `400 Bad Request`: *"Chuyến xe đã hoàn thành hành trình, không thể thay đổi trạng thái."*
  - **Từ `CANCELLED` (Đã hủy)**:
    - Là trạng thái kết thúc (Terminal State).
    - ❌ Không được phép mở lại chuyến xe đã hủy (`SCHEDULED`, `DEPARTED`, `COMPLETED`).
    - Nếu gửi yêu cầu thay đổi: Báo lỗi `400 Bad Request`: *"Chuyến xe này đã bị hủy, không thể thay đổi trạng thái."*

- **3. Kiểm tra trạng thái hiện tại (State Idempotency)**:
  - Nếu trạng thái gửi lên trùng khớp với trạng thái hiện tại của chuyến xe:
    - Hệ thống từ chối và phản hồi lỗi `400 Bad Request`: *"Chuyến xe hiện đã ở trạng thái [Tên trạng thái] trước đó."*

- **4. Ràng buộc khi Hủy chuyến (`SCHEDULED` ➔ `CANCELLED`)**:
  - Việc hủy chuyến và cập nhật trạng thái các vé liên quan phải được thực thi trong một **Database Transaction** an toàn:
    - Cập nhật `Trip.status = CANCELLED`.
    - Tự động chuyển tất cả các vé xe (`Ticket`) có `trip_id = trip.id` và trạng thái `BOOKED` hoặc `PAID` sang `CANCELLED`.

#### 4.3.6. Luồng chính

##### Trường hợp A: Cập nhật Xuất bến (`SCHEDULED` ➔ `DEPARTED`)
1. Tác nhân vào màn hình Danh sách Chuyến xe.
2. Tại chuyến xe `SCHEDULED` đến giờ chạy, tác nhân nhấn nút **"Xuất bến"** (hoặc chọn trong menu thao tác).
3. Hệ thống hiển thị hộp thoại xác nhận: *"Xác nhận xe [Biển số xe] bắt đầu xuất bến chuyến [Điểm đi ➔ Điểm đến] lúc [Giờ chạy]?"*.
4. Tác nhân nhấn **"Xác nhận xuất bến"**.
5. Hệ thống gửi yêu cầu `PATCH /api/v1/trips/:id/status` với body `{"status": "DEPARTED"}`.
6. Hệ thống kiểm tra quyền sở hữu và chuyển đổi trạng thái hợp lệ.
7. Hệ thống cập nhật `status = DEPARTED` trong cơ sở dữ liệu.
8. Hệ thống thông báo: *"Chuyến xe đã xuất bến thành công!"*.
9. Giao diện đổi nhãn chuyến xe thành *"Đang chạy"* (Badge vàng hổ phách).

##### Trường hợp B: Cập nhật Hoàn thành (`DEPARTED` ➔ `COMPLETED`)
1. Tại chuyến xe đang `DEPARTED` khi đã tới bến đích, tác nhân nhấn nút **"Hoàn thành chuyến"**.
2. Hệ thống hiển thị hộp thoại xác nhận: *"Xác nhận chuyến xe [Điểm đi ➔ Điểm đến] đã hoàn tất hành trình an toàn?"*.
3. Tác nhân nhấn **"Xác nhận hoàn thành"**.
4. Hệ thống gửi yêu cầu `PATCH /api/v1/trips/:id/status` với body `{"status": "COMPLETED"}`.
5. Hệ thống cập nhật `status = COMPLETED` và giải phóng trạng thái hoạt động cho chuyến.
6. Hệ thống thông báo: *"Chuyến xe đã hoàn thành hành trình!"*.
7. Giao diện đổi nhãn chuyến xe thành *"Hoàn thành"* (Badge xanh lá).

##### Trường hợp C: Hủy chuyến xe (`SCHEDULED` ➔ `CANCELLED`)
1. Tại chuyến xe `SCHEDULED` chưa xuất bến, tác nhân nhấn nút **"Hủy chuyến"**.
2. Hệ thống hiển thị cảnh báo đỏ nổi bật:
   > *"Cảnh báo: Bạn có chắc chắn muốn hủy chuyến xe [Điểm đi ➔ Điểm đến] khởi hành lúc [Giờ chạy]? Toàn bộ vé đã đặt thuộc chuyến này sẽ bị hủy bỏ."*
3. Tác nhân nhấn **"Đồng ý hủy chuyến"**.
4. Hệ thống gửi yêu cầu `PATCH /api/v1/trips/:id/status` với body `{"status": "CANCELLED"}`.
5. Hệ thống cập nhật `Trip.status = CANCELLED` và hủy các vé liên quan trong transaction.
6. Hệ thống thông báo: *"Đã hủy chuyến xe thành công."*.
7. Giao diện đổi nhãn chuyến xe thành *"Đã hủy"* (Badge xám/đỏ).

#### 4.3.7. Luồng phát sinh
- **Luồng 6.a: Người dùng không phải là Nhà xe (`Operator`)**:
  - Hệ thống báo lỗi: *"Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator)."* (HTTP 403 Forbidden).
- **Luồng 6.b: Chuyến xe không tồn tại hoặc không thuộc quyền sở hữu**:
  - Hệ thống báo lỗi: *"Không tìm thấy chuyến xe yêu cầu hoặc bạn không có quyền thao tác trên chuyến xe này."* (HTTP 404 Not Found).
- **Luồng 6.c: Cố gắng hủy chuyến xe đã xuất bến (`DEPARTED` ➔ `CANCELLED`)**:
  - Hệ thống chặn xử lý và báo lỗi: *"Chuyến xe đã xuất bến và đang trong hành trình di chuyển, không thể hủy chuyến."* (HTTP 400 Bad Request).
- **Luồng 6.d: Cố gắng thay đổi chuyến xe đã hoàn thành hoặc đã hủy**:
  - Hệ thống báo lỗi `400 Bad Request` tương ứng vì trạng thái đã đóng.
- **Luồng 6.e: Trùng trạng thái hiện tại**:
  - Hệ thống báo lỗi `400 Bad Request`: *"Chuyến xe hiện đã ở trạng thái [Tên trạng thái] trước đó."*

#### 4.3.8. Giao diện minh họa
- **Hình 1: Các nút hành động theo ngữ cảnh trạng thái**
  - Chuyến `SCHEDULED`: Hiển thị nút xanh **"Xuất bến"** và nút đỏ **"Hủy chuyến"**.
  - Chuyến `DEPARTED`: Ẩn nút "Hủy chuyến", chỉ hiển thị nút xanh lá **"Hoàn thành chuyến"**.
  - Chuyến `COMPLETED` / `CANCELLED`: Không hiển thị các nút đổi trạng thái (trạng thái đóng).
- **Hình 2: Modal xác nhận cảnh báo khi Hủy chuyến**
  - Popup cảnh báo màu đỏ nhắc nhở rõ về tác động hủy vé của khách hàng.
