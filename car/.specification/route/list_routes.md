### 3.2. Xem danh sách tuyến đường của Nhà xe (View Route List)

#### 3.2.1. Mô tả
Cho phép Chủ nhà xe (Operator) xem danh sách tất cả các tuyến đường xe khách thuộc quyền quản lý của nhà xe mình, tìm kiếm theo Điểm đi (`origin`) hoặc Điểm đến (`destination`), sắp xếp và phân trang hiển thị dữ liệu. Mỗi tuyến đường hiển thị đầy đủ lộ trình bao gồm các điểm dừng đón/trả khách (`RouteStop`) theo thứ tự từ trạm xuất phát đến trạm kết thúc.

#### 3.2.2. Tác nhân
- Chủ nhà xe (Operator / Host)

#### 3.2.3. Tiền điều kiện
- Tác nhân đã đăng nhập thành công vào hệ thống.
- Tác nhân đã được Quản trị viên (Admin) phê duyệt trở thành Nhà xe chính thức (có bản ghi tồn tại trong bảng `operators` liên kết với `user_id`).
- Tác nhân đang ở màn hình Quản lý Tuyến đường (Route Management).

#### 3.2.4. Hậu điều kiện
- Hiển thị danh sách các tuyến đường của chính nhà xe đó, kèm theo danh sách các điểm dừng đón/trả đã sắp xếp theo thứ tự `order`.
- Không làm thay đổi dữ liệu tuyến đường trong cơ sở dữ liệu.

#### 3.2.5. Quy tắc nghiệp vụ
- **Quyền hạn truy cập (Chỉ dành cho Nhà xe - Operator)**:
  - Chức năng này **chỉ có Nhà xe chính thức mới được phép thực hiện** và **chỉ được xem danh sách các tuyến thuộc quyền sở hữu của chính nhà xe mình**.
  - Hệ thống sử dụng `user_id` từ Token người dùng để tra cứu bản ghi trong bảng `operators`:
    - Lấy chính xác **`Operator.id`** của nhà xe đang đăng nhập làm điều kiện lọc bắt buộc (`WHERE operator_id = operator.id`).
    - Nếu không tìm thấy bản ghi Nhà xe (tài khoản `USER` thông thường hoặc chưa được duyệt), hệ thống từ chối truy cập và báo lỗi `403 Forbidden`.
    - Tuyệt đối không cho phép xem tuyến đường của nhà xe khác qua API này.
- **Dữ liệu mỗi Tuyến đường**:
  - Thông tin tuyến: Mã tuyến (`id`), Điểm khởi hành (`origin`), Điểm đến (`destination`), Trạng thái hoạt động (`status`: `ACTIVE` - Đang hoạt động, `INACTIVE` - Tạm ngừng/Đã khóa), Ngày tạo (`createdAt`), Ngày cập nhật (`updatedAt`).
  - Danh sách điểm dừng (`RouteStop`): Tự động nạp danh sách các trạm dừng thuộc tuyến và sắp xếp theo thứ tự `order` tăng dần (`0, 1, 2...`).
  - Tổng số trạm dừng (`totalStops`): Số lượng điểm đón/trả trên tuyến.
- **Tìm kiếm & Bộ lọc (Search & Filter)**:
  - Cho phép tìm kiếm tương đối (không phân biệt hoa thường) theo Điểm khởi hành (`origin`) hoặc Điểm đến (`destination`).
  - Cho phép lọc theo Trạng thái tuyến đường (`status`: `ACTIVE` hoặc `INACTIVE`). Nếu không truyền, mặc định hiển thị toàn bộ các tuyến của nhà xe.
- **Sắp xếp (Sorting)**:
  - Mặc định sắp xếp theo ngày tạo mới nhất (`createdAt` giảm dần - tuyến mới tạo hiển thị lên đầu).
  - Cho phép sắp xếp theo Điểm đi (`origin`) hoặc Điểm đến (`destination`).
- **Phân trang (Pagination)**:
  - Số dòng hiển thị mặc định là 10 tuyến/trang (có thể tùy chọn 10, 20, 50 dòng/trang).
  - Trả về thông tin phân trang: tổng số tuyến (`total`), số trang (`totalPages`), trang hiện tại (`page`) và kích thước trang (`limit`).

#### 3.2.6. Luồng chính
1. Tác nhân nhấn vào mục **"Quản lý Tuyến đường"** (hoặc **"Danh sách tuyến"**) trên menu điều hướng của nhà xe.
2. Hệ thống kiểm tra quyền Nhà xe của tác nhân và lấy `Operator.id`.
3. Hệ thống truy vấn cơ sở dữ liệu lấy danh sách tuyến đường có `operator_id = operator.id` kèm theo các điểm dừng `RouteStop`.
4. Hệ thống hiển thị giao diện Danh sách tuyến đường bao gồm:
   - Thống kê tổng số tuyến đường của nhà xe.
   - Thanh công cụ (Ô tìm kiếm theo điểm đi/điểm đến, Bộ chọn sắp xếp, Nút "+ Tạo tuyến đường mới").
   - Danh sách các tuyến đường: Mỗi tuyến hiển thị Điểm đi ➔ Điểm đến, số lượng trạm dừng, sơ đồ tóm tắt các điểm đón/trả chính (Trạm bắt đầu ➔ Trạm kết thúc) và nút "Xem chi tiết trạm dừng".
   - Thanh điều hướng phân trang ở phía dưới.
5. Tác nhân có thể nhập từ khóa tìm kiếm hoặc chọn chuyển trang để xem danh sách mong muốn.
6. Hệ thống lọc và cập nhật danh sách tức thời.

#### 3.2.7. Luồng phát sinh
- **Luồng 2.a: Người dùng chưa phải là Nhà xe (`Operator`)**:
  - Tại bước 2, nếu tài khoản chưa được phê duyệt làm nhà xe, hệ thống chặn truy cập và phản hồi thông báo: *"Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt."* (HTTP 403 Forbidden).
- **Luồng 3.a: Không tìm thấy kết quả phù hợp**:
  - Nếu từ khóa tìm kiếm không khớp với tuyến nào của nhà xe, hệ thống hiển thị bảng trống kèm thông báo: *"Không tìm thấy tuyến đường phù hợp với điều kiện tìm kiếm."*
- **Luồng 3.b: Nhà xe chưa tạo tuyến đường nào**:
  - Nếu nhà xe mới được phê duyệt và chưa tạo tuyến nào, hệ thống hiển thị trạng thái rỗng (Empty State) kèm thông báo: *"Bạn chưa có tuyến đường nào. Hãy nhấn 'Tạo tuyến đường mới' để bắt đầu thiết lập lộ trình."*

#### 3.2.8. Giao diện minh họa
- **Hình 1: Màn hình Danh sách Tuyến đường tổng quan**
  - Giao diện dạng thẻ hoặc bảng hiển thị các tuyến: Cột lộ trình (VD: "Hồ Chí Minh ➔ Đà Lạt"), Cột số trạm dừng ("5 trạm"), Danh sách bến xuất phát - bến đích, Ngày tạo, Nút "+ Tạo tuyến đường mới" ở góc trên bên phải.
- **Hình 2: Thao tác Tìm kiếm tuyến đường**
  - Tác nhân gõ từ khóa "Đà Lạt" vào ô tìm kiếm, hệ thống hiển thị danh sách các tuyến có điểm đi hoặc điểm đến là Đà Lạt.
- **Hình 3: Trạng thái trống (Chưa có tuyến đường)**
  - Hiển thị hình minh họa bản đồ xe khách kèm nút kêu gọi hành động màu xanh **"+ Tạo tuyến đường đầu tiên"**.
