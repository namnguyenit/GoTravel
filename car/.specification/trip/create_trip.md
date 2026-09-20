### 4.1. Tạo chuyến xe mới (Create Trip)

#### 4.1.1. Mô tả
Cho phép Chủ nhà xe (Operator) lên lịch trình vận hành cho một chuyến xe cụ thể của nhà xe mình, phục vụ hành khách đặt vé và di chuyển. 

Khi tạo chuyến, nhà xe tiến hành gán một **Tuyến đường (`Route`)** đã thiết lập với một **Xe khách (`Car`)** cụ thể, xác định thời gian khởi hành (`departureTime`), thời gian đến dự kiến (`arrivalTime`) và thiết lập giá vé cơ bản cho mỗi ghế ngồi (`pricePerSeat`).

Hệ thống tự động thực hiện các kiểm tra nghiệp vụ nghiêm ngặt về tính hợp lệ của tài nguyên, đảm bảo xe khách không bị giao thoa trùng lịch chạy với các chuyến khác và tuyến đường/xe đang ở trạng thái sẵn sàng hoạt động.

#### 4.1.2. Tác nhân
- Chủ nhà xe (Operator / Host)

#### 4.1.3. Tiền điều kiện
- Tác nhân đã đăng nhập thành công vào hệ thống.
- Tác nhân đã được Quản trị viên (Admin) phê duyệt trở thành Nhà xe chính thức (có bản ghi tồn tại trong bảng `operators` liên kết với `user_id`).
- Nhà xe đã có ít nhất một Tuyến đường đang hoạt động (`status = ACTIVE`).
- Nhà xe đã có ít nhất một Xe khách đang hoạt động (`status = ACTIVE`).
- Tác nhân đang ở màn hình Quản lý Chuyến xe (Trip Management).

#### 4.1.4. Hậu điều kiện
- Bản ghi Chuyến xe (`Trip`) mới được tạo thành công trong bảng `trips` của cơ sở dữ liệu với trạng thái ban đầu là `SCHEDULED`.
- Chuyến xe được liên kết chính xác với `operator_id`, `route_id` và `car_id`.
- Chuyến xe xuất hiện trên danh sách quản lý chuyến của nhà xe và sẵn sàng hiển thị trên hệ thống tìm kiếm cho hành khách đặt vé.

#### 4.1.5. Quy tắc nghiệp vụ

- **1. Quyền hạn truy cập (Chỉ dành cho Nhà xe - Operator)**:
  - Chức năng này **chỉ có Nhà xe chính thức mới được phép thực hiện**.
  - Hệ thống sử dụng `user_id` từ Token người dùng để tra cứu bản ghi trong bảng `operators`:
    - Nếu tìm thấy, lấy chính xác **`Operator.id`** làm định danh sở hữu (`operator_id`).
    - Nếu không tìm thấy (tài khoản người dùng thông thường `USER` hoặc chưa được Admin phê duyệt), hệ thống chặn truy cập và phản hồi mã lỗi `403 Forbidden`.

- **2. Ràng buộc về Tuyến đường (`Route`)**:
  - Tuyến đường được chọn phải tồn tại trong hệ thống và **thuộc quyền sở hữu của chính nhà xe** (`route.operator_id === operator.id`). Tuyệt đối không được gán tuyến của nhà xe khác.
  - Tuyến đường **BẮT BUỘC phải ở trạng thái đang hoạt động (`status = ACTIVE`)**:
    - Nếu tuyến đường đang bị tạm khóa / ngừng khai thác (`status = INACTIVE`), hệ thống từ chối tạo chuyến và báo lỗi `400 Bad Request`: *"Tuyến đường này hiện đang tạm ngừng khai thác (INACTIVE), không thể lên lịch chuyến xe mới."*

- **3. Ràng buộc về Xe khách (`Car`)**:
  - Xe khách được chọn phải tồn tại và **thuộc quyền sở hữu của chính nhà xe** (`car.operator_id === operator.id`). Tuyệt đối không được gán xe của nhà xe khác.
  - Xe khách **BẮT BUỘC phải ở trạng thái sẵn sàng hoạt động (`status = ACTIVE`)**:
    - Nếu xe khách đang bảo dưỡng / sửa chữa (`status = MAINTENANCE`), hệ thống báo lỗi `400 Bad Request`: *"Xe khách này đang trong trạng thái bảo trì/hỏng hóc, không thể gán cho chuyến đi."*
    - Nếu xe khách đang bị tạm khóa (`status = INACTIVE`), hệ thống báo lỗi `400 Bad Request`: *"Xe khách này hiện đang tạm khóa, không thể gán cho chuyến đi."*

- **4. Ràng buộc về Thời gian chạy (`departureTime` & `arrivalTime`)**:
  - **Thời gian xuất bến (`departureTime`)**:
    - Phải là một mốc thời gian trong tương lai (lớn hơn thời điểm hiện tại `now()`). Không được tạo chuyến cho các khung giờ đã trôi qua trong quá khứ.
  - **Thời gian đến dự kiến (`arrivalTime`)**:
    - Phải lớn hơn thời gian xuất bến (`arrivalTime > departureTime`).
    - Thời lượng di chuyển tối thiểu giữa lúc đi và lúc đến phải hợp lý (ví dụ: chênh lệch tối thiểu $\ge 15$ phút).

- **5. Ràng buộc Chống trùng lịch chạy xe (Car Schedule Overlap Prevention)**:
  - **Nguyên tắc vật lý**: Một chiếc xe (`Car`) không thể cùng một lúc có mặt và vận hành trên hai chuyến đi khác nhau.
  - Hệ thống kiểm tra trong cơ sở dữ liệu đối với chiếc xe được chọn (`carId`):
    - Không được tồn tại bất kỳ chuyến xe nào khác của xe này (ở trạng thái `SCHEDULED` hoặc `DEPARTED`) có khung giờ di chuyển **giao thoa trực tiếp** với khoảng thời gian của chuyến xe mới:
      $$\text{Chuyến cũ.departureTime} < \text{Chuyến mới.arrivalTime} \quad \text{VÀ} \quad \text{Chuyến cũ.arrivalTime} > \text{Chuyến mới.departureTime}$$
    - Hệ thống chỉ kiểm tra việc không bị chồng lấn thời gian thực tế chạy xe, không bắt buộc khoảng đệm thời gian nghỉ/quay đầu.
    - Nếu phát hiện trùng lịch, hệ thống từ chối tạo chuyến và phản hồi mã lỗi `409 Conflict`: *"Xe khách này đã có lịch chạy cho chuyến đi khác trong khoảng thời gian từ [Thời gian bắt đầu] đến [Thời gian kết thúc]. Vui lòng chọn xe khác hoặc đổi khung giờ."*

- **6. Giá vé cơ bản trên mỗi ghế (`pricePerSeat`)**:
  - Bắt buộc nhập, phải là số nguyên dương $> 0$ (VNĐ).
  - Ngưỡng tối thiểu hợp lý cho một vé xe khách: $\ge 10.000$ VNĐ.

- **7. Trạng thái ban đầu của Chuyến xe (`status`)**:
  - Mặc định khi tạo thành công, chuyến xe luôn có trạng thái `SCHEDULED` (Sắp chạy / Sẵn sàng khởi hành).

#### 4.1.6. Luồng chính
1. Tác nhân nhấn vào mục **"Quản lý Chuyến xe"** trên menu điều hướng của nhà xe.
2. Tác nhân nhấn nút hành động **"+ Tạo chuyến xe mới"**.
3. Hệ thống hiển thị Form **"Tạo chuyến xe mới"** với các trường thông tin:
   - Danh sách chọn Tuyến đường (Hệ thống tự động lọc chỉ hiển thị các tuyến `ACTIVE` của nhà xe).
   - Danh sách chọn Xe khách (Hệ thống tự động lọc chỉ hiển thị các xe `ACTIVE` của nhà xe).
   - Ô chọn Thời gian xuất bến (`departureTime`).
   - Ô chọn Thời gian đến dự kiến (`arrivalTime`).
   - Ô nhập Giá vé cơ bản trên mỗi ghế (`pricePerSeat`).
4. Tác nhân chọn Tuyến đường và Xe khách mong muốn.
5. Tác nhân chọn Ngày & Giờ xuất bến, Ngày & Giờ đến dự kiến.
6. Tác nhân nhập Giá vé trên mỗi ghế (Ví dụ: `250.000` VNĐ).
7. Tác nhân nhấn nút **"Lên lịch chuyến xe"** (hoặc **"Lưu chuyến xe"**).
8. Hệ thống kiểm tra tính hợp lệ của dữ liệu theo Quy tắc nghiệp vụ:
   - Xác thực quyền Nhà xe của tác nhân (`Operator.id`).
   - Kiểm tra Tuyến đường thuộc nhà xe và đang `ACTIVE`.
   - Kiểm tra Xe khách thuộc nhà xe và đang `ACTIVE`.
   - Kiểm tra `departureTime > now()` và `arrivalTime > departureTime`.
   - Kiểm tra xe khách không bị giao thoa trùng lịch chạy với chuyến nào khác.
   - Kiểm tra giá vé hợp lệ ($> 0$).
9. Hệ thống lưu bản ghi Chuyến xe mới vào bảng `trips` với trạng thái `SCHEDULED`.
10. Hệ thống hiển thị thông báo thành công: *"Lên lịch chuyến xe mới thành công!"*.
11. Hệ thống đóng Form và điều hướng tác nhân về màn hình Danh sách chuyến xe, hiển thị chuyến vừa tạo lên đầu bảng.

#### 4.1.7. Luồng phát sinh

- **Luồng 8.a: Người dùng không phải là Nhà xe (`Operator`)**:
  - Tại bước 8, nếu tài khoản chưa được duyệt làm nhà xe, hệ thống báo lỗi `403 Forbidden`: *"Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt."*
- **Luồng 8.b: Tuyến đường không tồn tại hoặc không thuộc sở hữu**:
  - Hệ thống báo lỗi `404 Not Found`: *"Không tìm thấy tuyến đường được chọn hoặc tuyến đường không thuộc quyền quản lý của nhà xe."*
- **Luồng 8.c: Tuyến đường đang bị khóa (`INACTIVE`)**:
  - Hệ thống báo lỗi `400 Bad Request`: *"Tuyến đường này hiện đang tạm ngừng khai thác (INACTIVE), không thể lên lịch chuyến xe mới."*
- **Luồng 8.d: Xe khách không tồn tại hoặc không thuộc sở hữu**:
  - Hệ thống báo lỗi `404 Not Found`: *"Không tìm thấy xe khách được chọn hoặc xe không thuộc quyền quản lý của nhà xe."*
- **Luồng 8.e: Xe khách đang bảo dưỡng hoặc bị khóa**:
  - Nếu xe đang `MAINTENANCE` hoặc `INACTIVE`, hệ thống báo lỗi `400 Bad Request`: *"Xe khách này hiện không sẵn sàng hoạt động (đang bảo trì hoặc bị khóa)."*
- **Luồng 8.f: Thời gian xuất bến trong quá khứ**:
  - Nếu `departureTime <= now()`, hệ thống báo lỗi `400 Bad Request`: *"Thời gian xuất bến phải là thời điểm trong tương lai."*
- **Luồng 8.g: Thời gian đến trước hoặc bằng thời gian đi**:
  - Nếu `arrivalTime <= departureTime`, hệ thống báo lỗi `400 Bad Request`: *"Thời gian đến dự kiến phải sau thời gian xuất bến."*
- **Luồng 8.h: Xe bị trùng lịch chạy (Giao thoa khung giờ)**:
  - Nếu xe đã có chuyến khác chạy trùng giờ, hệ thống báo lỗi `409 Conflict`: *"Xe khách [Biển số xe] đã có lịch vận hành trong khoảng thời gian này. Vui lòng chọn xe khác hoặc điều chỉnh khung giờ."*
- **Luồng 8.i: Giá vé không hợp lệ**:
  - Nếu `pricePerSeat <= 0`, hệ thống báo lỗi `400 Bad Request`: *"Giá vé cơ bản trên mỗi ghế phải lớn hơn 0 VNĐ."*
- **Luồng 7.a: Tác nhân hủy thao tác**:
  - Tại Form tạo chuyến, tác nhân nhấn nút **"Hủy"** hoặc nút **"Đóng"**.
  - Hệ thống hủy bỏ thao tác và không lưu dữ liệu.

#### 4.1.8. Giao diện minh họa
- **Hình 1: Màn hình Danh sách Chuyến xe & Nút tạo chuyến**
  - Màn hình hiển thị bảng các chuyến xe đã lên lịch, ở góc trên bên phải có nút màu xanh nổi bật **"+ Tạo chuyến xe mới"**.
- **Hình 2: Form Lên lịch Chuyến xe mới**
  - Khối 1: *Chọn lộ trình & phương tiện*: Dropdown Tuyến đường (kèm hiển thị tóm tắt: "Hồ Chí Minh ➔ Đà Lạt - 5 trạm dừng"), Dropdown Xe khách (kèm hiển thị: "Xe Limousine VIP - 29B-123.45 - 34 chỗ").
  - Khối 2: *Lịch trình vận hành*: Bộ chọn Ngày & Giờ khởi hành, Bộ chọn Ngày & Giờ đến nơi. Hệ thống hiển thị dòng tính toán tự động: *"Tổng thời gian chạy dự kiến: 6 giờ 30 phút"*.
  - Khối 3: *Giá vé*: Ô nhập số tiền vé cơ bản (VNĐ) kèm định dạng hiển thị tự động hàng nghìn (VD: `250,000 đ`).
  - Nút bấm: Nút xám **"Hủy bỏ"** và Nút xanh **"Lên lịch chuyến xe"**.
- **Hình 3: Cảnh báo Trùng lịch chạy xe (Conflict Warning)**
  - Nếu chọn xe bị trùng giờ, hệ thống hiển thị thông báo cảnh báo màu đỏ ngay dưới ô thời gian: *"Cảnh báo: Xe 29B-123.45 đang có chuyến chạy tuyến Hà Nội ➔ Hải Phòng từ 08:00 đến 10:30 cùng ngày. Vui lòng đổi xe khác!"*.
