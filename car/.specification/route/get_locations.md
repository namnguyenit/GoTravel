### 3.4. Lấy danh sách địa điểm phục vụ tìm kiếm tuyến xe (Get Route Locations)

#### 3.4.1. Mô tả
Cung cấp danh sách tất cả các địa điểm (tỉnh/thành phố, điểm đón, điểm trả) xuất hiện trong các tuyến đường đang hoạt động (`status = 'ACTIVE'`) của toàn bộ hệ thống GoStay. Dữ liệu được gộp chung từ cả điểm xuất phát (`origin`) và điểm đến (`destination`), loại bỏ các giá trị trùng lặp (Set) và sắp xếp theo thứ tự bảng chữ cái tiếng Việt. 

API này phục vụ cho phía giao diện khách hàng (Frontend) để đổ dữ liệu đồng bộ vào cả 2 dropdown **"Điểm xuất phát"** và **"Điểm đến"** trên thanh tìm kiếm chuyến xe, cho phép khách hàng tự do chọn điểm đi hoặc điểm đến theo thứ tự tùy ý mà không cần gọi API lọc phụ thuộc nhiều lần.

#### 3.4.2. Tác nhân
- Khách vãng lai / Người dùng chưa đăng nhập (Guest / Anonymous User)
- Khách hàng đã đăng nhập (Customer / User)
- Mọi người dùng truy cập trang chủ / trang tìm kiếm chuyến xe của GoStay

#### 3.4.3. Tiền điều kiện
- Khách hàng truy cập vào trang chủ hoặc trang Tìm kiếm chuyến xe của GoStay.

#### 3.4.4. Hậu điều kiện
- Trả về danh sách chuỗi tên địa điểm duy nhất (Unique Locations) đã được sắp xếp tăng dần theo tiếng Việt.
- Không làm thay đổi bất kỳ dữ liệu nào trong cơ sở dữ liệu.

#### 3.4.5. Quy tắc nghiệp vụ
- **Quyền truy cập (Public API)**:
  - Đây là API công khai, **không yêu cầu xác thực** Bearer Token JWT (`auth: false` tại API Gateway). Bất kỳ ai truy cập website đều có thể gọi để xem danh sách các địa điểm có xe phục vụ.
- **Phạm vi dữ liệu (Chỉ lấy từ các Tuyến đường đang hoạt động)**:
  - Chỉ quét và lấy dữ liệu từ các bản ghi `Route` có trạng thái hoạt động: `status = 'ACTIVE'`.
  - Tuyệt đối không lấy dữ liệu từ các tuyến đang bị khóa hoặc tạm ngừng hoạt động (`status = 'INACTIVE'`).
- **Xử lý tập hợp & Loại bỏ trùng lặp (Distinct / Set)**:
  - Gom toàn bộ giá trị `origin` (điểm xuất phát) và `destination` (điểm đến) của các tuyến thỏa mãn điều kiện.
  - Loại bỏ các giá trị `null`, `undefined` hoặc chuỗi chỉ chứa khoảng trắng rỗng.
  - Chuẩn hóa chuỗi bằng cách `trim()` các khoảng trắng thừa ở hai đầu.
  - Sử dụng cơ chế tập hợp (Set) để đảm bảo mỗi địa điểm chỉ xuất hiện duy nhất một lần.
- **Sắp xếp hiển thị (Alphabetical Sorting)**:
  - Danh sách địa điểm được sắp xếp theo bảng chữ cái tiếng Việt (hỗ trợ đầy đủ các ký tự có dấu như: Ă, Â, Đ, Ê, Ô, Ơ, Ư...) bằng cơ chế `localeCompare(..., 'vi')`.

#### 3.4.6. Luồng chính
1. Khách hàng truy cập vào Trang chủ hoặc màn hình Tìm kiếm vé xe của GoStay.
2. Giao diện (Frontend) tự động gửi yêu cầu `GET /api/v1/routes/locations` lên hệ thống.
3. Hệ thống kiểm tra trong cơ sở dữ liệu tất cả các tuyến đường có trạng thái `ACTIVE`.
4. Hệ thống trích xuất danh sách `origin` và `destination`, gộp lại và loại bỏ các phần tử trùng lặp.
5. Hệ thống sắp xếp danh sách tên địa điểm theo thứ tự A-Z tiếng Việt.
6. Hệ thống phản hồi danh sách `locations` với mã `200 OK`.
7. Giao diện nhận dữ liệu và đồng thời nạp mảng `locations` vào 2 dropdown:
   - Dropdown 1: **"Điểm xuất phát"**
   - Dropdown 2: **"Điểm đến"**
8. Khách hàng có thể mở dropdown, gõ tìm kiếm hoặc chọn địa điểm ở ô bất kỳ một cách dễ dàng, thuận tiện.

#### 3.4.7. Luồng phát sinh
- **Luồng 3.a: Hệ thống chưa có tuyến đường nào hoạt động**:
  - Nếu hệ thống mới khởi tạo hoặc tất cả tuyến đều đang ở trạng thái `INACTIVE`, hệ thống phản hồi danh sách mảng rỗng: `"locations": []` kèm thông báo thành công (HTTP 200 OK).
  - Giao diện hiển thị dropdown với placeholder: *"Hiện chưa có tuyến xe nào hoạt động"*.

#### 3.4.8. Giao diện minh họa
- **Hình 1: Thanh tìm kiếm chuyến xe trên Trang chủ GoStay**
  - Dropdown **"Điểm xuất phát"**: Khách bấm vào xổ ra danh sách: `["Bình Định", "Đà Nẵng", "Hà Nội", "Hải Phòng", "Nha Trang", "Sa Pa"]`.
  - Dropdown **"Điểm đến"**: Khách bấm vào xổ ra danh sách tương tự: `["Bình Định", "Đà Nẵng", "Hà Nội", "Hải Phòng", "Nha Trang", "Sa Pa"]`.
  - Khách hàng có thể chọn "Hà Nội" ở Điểm đi, "Đà Nẵng" ở Điểm đến, chọn ngày và bấm nút **"Tìm chuyến xe"**.
