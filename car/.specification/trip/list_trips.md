### 4.2. Xem danh sách chuyến xe của Nhà xe (View Operator Trip List)

#### 4.2.1. Mô tả
Cho phép Chủ nhà xe (Operator) xem toàn bộ danh sách các chuyến xe khách do nhà xe mình quản lý, theo dõi trạng thái vận hành theo thời gian thực (Sắp chạy, Đang di chuyển, Hoàn thành, Đã hủy), kiểm tra tình trạng lấp đầy ghế ngồi (số vé đã đặt trên tổng số ghế), tìm kiếm theo lộ trình tuyến hoặc biển số xe, lọc theo trạng thái và ngày khởi hành, sắp xếp và phân trang hiển thị dữ liệu.

#### 4.2.2. Tác nhân
- Chủ nhà xe (Operator / Host)

#### 4.2.3. Tiền điều kiện
- Tác nhân đã đăng nhập thành công vào hệ thống.
- Tác nhân đã được Quản trị viên (Admin) phê duyệt trở thành Nhà xe chính thức (có bản ghi tồn tại trong bảng `operators` liên kết với `user_id`).
- Tác nhân đang ở màn hình Quản lý Chuyến xe (Trip Management).

#### 4.2.4. Hậu điều kiện
- Hiển thị danh sách các chuyến xe kèm dữ liệu chi tiết về Tuyến đường (`Route`), Xe khách (`Car`), Tỷ lệ đặt vé (`tickets`), trạng thái vận hành và cụm chỉ số thống kê KPI tổng quan.
- Không làm thay đổi bất kỳ dữ liệu nào trong cơ sở dữ liệu.

#### 4.2.5. Quy tắc nghiệp vụ

- **1. Quyền hạn truy cập (Chỉ dành cho Nhà xe - Operator)**:
  - Chức năng này **chỉ có Nhà xe chính thức mới được phép thực hiện** và **chỉ được xem danh sách các chuyến xe thuộc quyền quản lý của chính nhà xe mình**.
  - Hệ thống sử dụng `user_id` từ Token người dùng để tra cứu bản ghi trong bảng `operators`:
    - Lấy chính xác **`Operator.id`** của nhà xe đang đăng nhập làm điều kiện lọc bắt buộc (`WHERE operator_id = operator.id`).
    - Nếu không tìm thấy bản ghi Nhà xe (tài khoản `USER` thông thường hoặc chưa được duyệt), hệ thống từ chối truy cập và báo lỗi `403 Forbidden`.
    - Tuyệt đối không cho phép xem chuyến xe của nhà xe khác qua API này.

- **2. Báo cáo thống kê tổng quan (KPI Stats)**:
  - Hiển thị 5 chỉ số KPI nổi bật ở phía trên bảng danh sách giúp nhà xe nắm bắt nhanh tình hình hoạt động:
    - **Tổng số chuyến (`totalTrips`)**: Tổng số chuyến xe của nhà xe trong hệ thống.
    - **Sắp khởi hành (`scheduledTrips`)**: Số chuyến ở trạng thái `SCHEDULED`.
    - **Đang di chuyển (`departedTrips`)**: Số chuyến ở trạng thái `DEPARTED`.
    - **Đã hoàn thành (`completedTrips`)**: Số chuyến ở trạng thái `COMPLETED`.
    - **Đã hủy (`cancelledTrips`)**: Số chuyến ở trạng thái `CANCELLED`.

- **3. Dữ liệu chi tiết mỗi Chuyến xe**:
  - **Thông tin Chuyến**: Mã chuyến (`id`), Giờ xuất bến (`departureTime`), Giờ đến dự kiến (`arrivalTime`), Giá vé cơ bản (`pricePerSeat`), Trạng thái (`status`), Ngày tạo (`createdAt`).
  - **Thông tin Tuyến đường (`Route`)**:
    - Mã tuyến (`routeId`), Điểm khởi hành (`origin`), Điểm đến (`destination`).
  - **Thông tin Xe khách (`Car`)**:
    - Mã xe (`carId`), Tên xe (`name`), Biển số xe (`licensePlate`), Loại xe (`type`: `SLEEPER`, `LIMOUSINE`, `SEAT`), Tổng số ghế (`totalSeats`).
  - **Tình trạng vé / Ghế đã đặt (Occupancy)**:
    - **Số ghế đã đặt (`bookedSeats`)**: Đếm số vé trong bảng `tickets` thuộc chuyến đi này có trạng thái là `BOOKED` hoặc `PAID`.
    - **Số ghế còn trống (`availableSeats`)**: Tính toán bằng $\text{totalSeats} - \text{bookedSeats}$.
    - **Tỷ lệ lấp đầy (`occupancyRate`)**: Tỷ lệ phần trăm giữa số ghế đã đặt và tổng số ghế ($\frac{\text{bookedSeats}}{\text{totalSeats}} \times 100\%$).

- **4. Tìm kiếm & Bộ lọc (Search & Filter)**:
  - **Từ khóa (`keyword` / `search`)**: Cho phép tìm kiếm tương đối (không phân biệt hoa thường) theo Điểm đi (`origin`), Điểm đến (`destination`), Tên xe (`name`) hoặc Biển số xe (`licensePlate`).
  - **Trạng thái (`status`)**: Cho phép lọc theo từng trạng thái: `ALL` (Mặc định), `SCHEDULED`, `DEPARTED`, `COMPLETED`, `CANCELLED`.
  - **Tuyến đường (`routeId`)**: Cho phép lọc xem danh sách các chuyến chạy trên một tuyến cụ thể.
  - **Xe khách (`carId`)**: Cho phép lọc xem lịch vận hành của một xe cụ thể.
  - **Ngày xuất bến (`departureDate` hoặc `startDate`, `endDate`)**: Lọc các chuyến xuất bến trong ngày được chọn hoặc khoảng ngày.

- **5. Sắp xếp (Sorting)**:
  - Mặc định sắp xếp theo **Giờ xuất bến gần nhất** (`departureTime` tăng dần cho các chuyến sắp chạy, hoặc theo ngày tạo mới nhất `createdAt` giảm dần).
  - Cho phép tùy chọn sắp xếp theo:
    - Giờ xuất bến (`departureTime`): Sớm nhất ➔ Muộn nhất hoặc ngược lại.
    - Giá vé (`pricePerSeat`): Thấp nhất ➔ Cao nhất hoặc ngược lại.
    - Ngày tạo (`createdAt`): Mới nhất ➔ Cũ nhất.

- **6. Phân trang (Pagination)**:
  - Mặc định hiển thị 10 chuyến/trang (có thể chọn 10, 20, 50 dòng/trang).
  - Trả về thông tin phân trang chuẩn: `page`, `limit`, `total` (tổng số chuyến theo điều kiện lọc), `totalPages`.

- **7. Định dạng hiển thị Nhãn trạng thái (Status Badges)**:
  - `SCHEDULED`: Badge màu xanh dương (blue) kèm chữ *"Sắp chạy"*.
  - `DEPARTED`: Badge màu vàng hổ phách (amber) kèm chữ *"Đang chạy"*.
  - `COMPLETED`: Badge màu xanh lá (green) kèm chữ *"Hoàn thành"*.
  - `CANCELLED`: Badge màu đỏ / xám (red/gray) kèm chữ *"Đã hủy"*.

#### 4.2.6. Luồng chính
1. Tác nhân nhấn vào mục **"Quản lý Chuyến xe"** (hoặc **"Danh sách chuyến"**) trên menu điều hướng của nhà xe.
2. Hệ thống kiểm tra quyền Nhà xe của tác nhân và lấy `Operator.id`.
3. Hệ thống truy vấn cơ sở dữ liệu lấy các chỉ số KPI thống kê và danh sách chuyến xe thỏa mãn điều kiện lọc kèm dữ liệu liên kết Tuyến đường (`Route`), Xe khách (`Car`) và số vé đã đặt (`Ticket`).
4. Hệ thống hiển thị giao diện Quản lý Chuyến xe:
   - Cụm thẻ thống kê KPI tổng quan ở trên cùng.
   - Thanh công cụ (Ô tìm kiếm, Bộ lọc trạng thái, Bộ lọc ngày, Bộ chọn sắp xếp, Nút "+ Tạo chuyến xe mới").
   - Bảng danh sách chuyến xe hiển thị đầy đủ thông tin: Lộ trình (Điểm đi ➔ Điểm đến), Xe khách (Tên xe, Biển số, Loại xe), Khung giờ chạy (Giờ đi - Giờ đến), Giá vé, Tình trạng vé (VD: "28/34 ghế"), Nhãn trạng thái và các nút thao tác (Xem chi tiết, Cập nhật trạng thái).
   - Thanh điều hướng phân trang ở phía dưới bảng.
5. Tác nhân nhập từ khóa tìm kiếm, chọn bộ lọc trạng thái hoặc đổi trang để xem danh sách mong muốn.
6. Hệ thống cập nhật danh sách hiển thị và phân trang tức thời.

#### 4.2.7. Luồng phát sinh
- **Luồng 2.a: Người dùng chưa phải là Nhà xe (`Operator`)**:
  - Tại bước 2, nếu tài khoản chưa được duyệt làm nhà xe, hệ thống chặn truy cập và báo lỗi: *"Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt."* (HTTP 403 Forbidden).
- **Luồng 3.a: Không tìm thấy kết quả phù hợp**:
  - Nếu từ khóa hoặc bộ lọc không khớp với chuyến xe nào, hệ thống hiển thị bảng trống kèm thông báo: *"Không tìm thấy chuyến xe phù hợp với điều kiện tìm kiếm."*
- **Luồng 3.b: Nhà xe chưa có chuyến xe nào**:
  - Nếu nhà xe chưa từng tạo chuyến xe nào, hệ thống hiển thị trạng thái rỗng (Empty State) kèm thông báo: *"Bạn chưa có chuyến xe nào được lên lịch. Hãy nhấn 'Tạo chuyến xe mới' để bắt đầu thiết lập chuyến đi đầu tiên."*

#### 4.2.8. Giao diện minh họa
- **Hình 1: Màn hình Danh sách Chuyến xe tổng quan**
  - Hàng trên: 5 thẻ KPI (Tổng chuyến, Sắp chạy, Đang chạy, Hoàn thành, Đã hủy).
  - Hàng giữa: Thanh công cụ gồm ô tìm kiếm lộ trình/biển số, Dropdown lọc trạng thái ("Tất cả", "Sắp chạy", "Đang chạy"...), Bộ chọn ngày khởi hành, Nút xanh **"+ Tạo chuyến xe mới"**.
  - Phần thân: Bảng danh sách chuyến xe với các cột: Mã chuyến, Tuyến đường (Hà Nội ➔ Hải Phòng), Xe khách (Limousine VIP - 29B-123.45), Giờ chạy (08:00 - 10:30, 25/09/2026), Giá vé (250.000 đ), Vé đã bán (Thanh tiến trình màu xanh 28/34 chỗ), Trạng thái (Badge "Sắp chạy") và Cột Thao tác.
  - Phía dưới: Bộ phân trang (Trang 1/5, Chuyển trang).
- **Hình 2: Trạng thái trống (Chưa có chuyến xe)**
  - Hình minh họa xe buýt kèm nút kêu gọi hành động màu xanh **"+ Lên lịch chuyến xe đầu tiên"**.
