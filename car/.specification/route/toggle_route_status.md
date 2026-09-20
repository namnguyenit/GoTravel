### 3.3. Khóa / Mở khóa tuyến đường của Nhà xe (Toggle Route Status)

#### 3.3.1. Mô tả
Cho phép Chủ nhà xe (Operator) chủ động tạm dừng khai thác (Khóa tuyến - `INACTIVE`) hoặc kích hoạt khai thác trở lại (Mở khóa - `ACTIVE`) một tuyến đường thuộc quyền sở hữu của nhà xe mình. 

Thay vì xóa vĩnh viễn (Hard Delete), việc chuyển đổi trạng thái tuyến giúp nhà xe linh hoạt tạm dừng các tuyến xe theo mùa du lịch, sửa chữa lộ trình hoặc tạm ngưng kinh doanh, đồng thời **bảo toàn 100% dữ liệu lịch sử các chuyến xe và vé đã bán trong quá khứ**.

#### 3.3.2. Tác nhân
- Chủ nhà xe (Operator / Host)

#### 3.3.3. Tiền điều kiện
- Tác nhân đã đăng nhập thành công vào hệ thống.
- Tác nhân đã được Quản trị viên (Admin) phê duyệt trở thành Nhà xe chính thức (có bản ghi tồn tại trong bảng `operators` liên kết với `user_id`).
- Tuyến đường cần thao tác tồn tại trong hệ thống và thuộc quyền sở hữu của chính nhà xe đang đăng nhập.
- Tác nhân đang ở màn hình Quản lý Tuyến đường (Route Management).

#### 3.3.4. Hậu điều kiện
- Trường `status` của tuyến đường trong bảng `routes` được cập nhật thành `INACTIVE` (khi Khóa) hoặc `ACTIVE` (khi Mở khóa).
- Khi tuyến ở trạng thái `INACTIVE`: Hệ thống lập tức ngăn chặn việc tạo chuyến xe (`Trip`) mới trên tuyến này và ẩn tuyến khỏi kết quả tìm kiếm của hành khách.
- Khi tuyến ở trạng thái `ACTIVE`: Tuyến sẵn sàng để tạo chuyến xe mới và xuất hiện lại trong kết quả tìm kiếm của hành khách.
- Toàn bộ dữ liệu tuyến, điểm dừng (`RouteStop`), chuyến đi (`Trip`) cũ và vé xe (`Ticket`) liên quan được giữ nguyên vẹn.

#### 3.3.5. Quy tắc nghiệp vụ

- **1. Triết lý thiết kế: Khóa tuyến (Soft-Status) thay vì Xóa cứng (Hard Delete)**:
  - **Bảo toàn dữ liệu lịch sử & kế toán**: Mỗi tuyến đường (`Route`) gắn liền với các chuyến xe (`Trip`) đã chạy và các vé xe (`Ticket`) đã thanh toán của hành khách. Nếu thực hiện xóa cứng (Delete):
    - Sẽ gây lỗi ràng buộc khóa ngoại (Foreign Key Constraint Violation) do bảng `trips` và `tickets` đang tham chiếu đến `Route` / `RouteStop`.
    - Hoặc nếu dùng xóa lan truyền (Cascade Delete), toàn bộ lịch sử chuyến xe, doanh thu, hóa đơn, lịch sử di chuyển của khách hàng sẽ bị xóa mất, vi phạm nghiêm trọng tính toàn vẹn dữ liệu kế toán và đối soát.
  - **Tái sử dụng lộ trình (Tuyến theo mùa / Tạm nghỉ)**: Các nhà xe thường có những tuyến đường chỉ chạy vào mùa vụ (ví dụ: mùa hè, mùa lễ hội) hoặc tạm nghỉ để bảo trì. Cơ chế Khóa cho phép nhà xe "Kích hoạt lại" bất cứ lúc nào với một cú click chuột mà không cần phải nhập lại hàng loạt thông tin điểm đón/trả từ đầu.

- **2. Định nghĩa các trạng thái Tuyến đường (`RouteStatus`)**:
  - `ACTIVE` (Đang hoạt động):
    - Trạng thái mặc định ngay sau khi tạo mới tuyến đường.
    - Tuyến hiển thị bình thường trong danh sách tuyến của nhà xe.
    - Cho phép nhà xe lựa chọn tuyến này khi tạo Chuyến xe mới (`CreateTrip`).
    - Hiển thị trên hệ thống tìm kiếm chuyến đi của hành khách.
  - `INACTIVE` (Tạm khóa / Ngừng khai thác):
    - Tuyến vẫn xuất hiện trong màn hình quản lý của nhà xe kèm nhãn hiển thị trực quan (Badge màu xám hoặc đỏ: *"Đã khóa"* / *"Tạm ngừng"*).
    - **Không cho phép tạo chuyến mới**: Khi nhà xe chọn tuyến để tạo chuyến đi (`POST /trips`), hệ thống sẽ từ chối nếu tuyến đang `INACTIVE`.
    - **Ẩn khỏi hành khách**: Hành khách tìm kiếm chuyến đi trên ứng dụng sẽ không thấy các tuyến này.

- **3. Ràng buộc đối với các Chuyến xe đã lên lịch (`SCHEDULED Trips`)**:
  - Khi nhà xe thực hiện **Khóa tuyến (`ACTIVE` ➔ `INACTIVE`)**:
    - **Nguyên tắc an toàn vận hành**: Các chuyến xe thuộc tuyến này đã được tạo trước đó và đang ở trạng thái chuẩn bị chạy (`SCHEDULED`) **vẫn tiếp tục được diễn ra bình thường** cho đến khi hoàn tất hành trình (`COMPLETED`), nhằm đảm bảo quyền lợi cho những hành khách đã đặt chỗ/mua vé từ trước.
    - Hệ thống chỉ ngăn chặn việc **lên lịch các chuyến xe mới phát sinh** sau thời điểm khóa.

- **4. Quyền hạn truy cập & Phân quyền**:
  - Chỉ tài khoản Nhà xe chính thức sở hữu tuyến đường đó (`route.operator_id === current_operator.id`) mới có quyền thay đổi trạng thái của tuyến.
  - Nếu tài khoản chưa phải Nhà xe: Trả về mã lỗi `403 Forbidden`.
  - Nếu tuyến đường không tồn tại hoặc thuộc quyền sở hữu của nhà xe khác: Trả về mã lỗi `404 Not Found` (hoặc `403 Forbidden`).

- **5. Tính lũy thừa / Kiểm tra trạng thái hiện tại (State Validation)**:
  - Nếu tuyến đường đang `INACTIVE` mà nhà xe gửi yêu cầu Khóa tiếp ➔ Hệ thống trả về lỗi `400 Bad Request` thông báo: *"Tuyến đường này hiện đã bị khóa trước đó."*
  - Nếu tuyến đường đang `ACTIVE` mà nhà xe gửi yêu cầu Kích hoạt tiếp ➔ Hệ thống trả về lỗi `400 Bad Request` thông báo: *"Tuyến đường này hiện đang hoạt động."*

#### 3.3.6. Luồng chính

##### Trường hợp A: Khóa tuyến đường (`ACTIVE` ➔ `INACTIVE`)
1. Tác nhân truy cập màn hình Danh sách tuyến đường của nhà xe.
2. Tác nhân tìm tuyến đường đang hoạt động (`ACTIVE`) muốn tạm dừng khai thác.
3. Tác nhân nhấn vào nút chuyển đổi trạng thái (Toggle Switch) hoặc chọn hành động **"Khóa tuyến"**.
4. Hệ thống hiển thị hộp thoại xác nhận:
   > *"Bạn có chắc chắn muốn tạm khóa tuyến đường [Điểm đi ➔ Điểm đến]? Tuyến đường này sẽ không thể dùng để tạo thêm chuyến đi mới cho đến khi được mở khóa trở lại."*
5. Tác nhân nhấn nút xác nhận **"Đồng ý khóa"**.
6. Hệ thống gửi yêu cầu cập nhật trạng thái tuyến lên máy chủ.
7. Máy chủ kiểm tra quyền sở hữu của nhà xe và trạng thái hiện tại của tuyến.
8. Máy chủ cập nhật trường `status = INACTIVE` và `updatedAt = now()` trong cơ sở dữ liệu.
9. Máy chủ trả về thông báo thành công: *"Đã khóa tuyến đường thành công."*
10. Giao diện cập nhật ngay lập tức: Nút Toggle chuyển sang trạng thái Tắt (Off), nhãn trạng thái của tuyến chuyển thành *"Tạm ngừng"* (Badge xám/đỏ).

##### Trường hợp B: Mở khóa tuyến đường (`INACTIVE` ➔ `ACTIVE`)
1. Tác nhân truy cập màn hình Danh sách tuyến đường, bật bộ lọc trạng thái để xem các tuyến *"Đã khóa"*.
2. Tác nhân nhấn vào nút chuyển đổi trạng thái (Toggle Switch) hoặc chọn hành động **"Mở khóa tuyến"** (hoặc **"Kích hoạt lại"**).
3. Hệ thống hiển thị thông báo xác nhận ngắn: *"Kích hoạt lại tuyến đường [Điểm đi ➔ Điểm đến] để tiếp tục lên lịch chuyến xe?"*.
4. Tác nhân nhấn **"Kích hoạt"**.
5. Máy chủ cập nhật trường `status = ACTIVE` và `updatedAt = now()`.
6. Máy chủ phản hồi thành công: *"Đã kích hoạt lại tuyến đường thành công."*
7. Giao diện cập nhật: Tuyến chuyển sang nhãn *"Đang hoạt động"* (Badge xanh lá). Tuyến sẵn sàng để tạo chuyến đi mới.

#### 3.3.7. Luồng phát sinh
- **Luồng 7.a: Người dùng không phải là Nhà xe (`Operator`)**:
  - Máy chủ chặn yêu cầu và báo lỗi: *"Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator)."* (HTTP 403 Forbidden).
- **Luồng 7.b: Tuyến đường không tồn tại hoặc không thuộc sở hữu của nhà xe**:
  - Máy chủ phản hồi: *"Không tìm thấy tuyến đường yêu cầu hoặc bạn không có quyền thao tác trên tuyến đường này."* (HTTP 404 Not Found).
- **Luồng 7.c: Tuyến đường đã ở trạng thái yêu cầu**:
  - Nhà xe gửi trạng thái trùng với trạng thái hiện tại của tuyến, máy chủ phản hồi lỗi `400 Bad Request` kèm thông báo tương ứng.

#### 3.3.8. Giao diện minh họa
- **Hình 1: Danh sách tuyến đường với Cột Trạng thái**
  - Trong bảng quản lý tuyến đường, bổ sung cột **Trạng thái**:
    - Tuyến đang chạy: Hiển thị Badge xanh lá *"Đang hoạt động"* kèm nút gạt Switch đang Bật (Xanh).
    - Tuyến tạm dừng: Hiển thị Badge xám *"Tạm ngừng"* kèm nút gạt Switch đang Tắt (Xám).
- **Hình 2: Modal xác nhận Khóa tuyến**
  - Popup cảnh báo màu vàng hiển thị nội dung nhắc nhở nhà xe về việc khóa tuyến sẽ không thể tạo chuyến mới, kèm 2 nút: **"Hủy bỏ"** và **"Khóa tuyến"**.
- **Hình 3: Bộ lọc trạng thái trên thanh công cụ**
  - Phía trên bảng danh sách bổ sung thêm Tabs hoặc Dropdown lọc theo trạng thái: **"Tất cả"**, **"Đang hoạt động"**, **"Đã khóa"**.
