### 4.4. Tìm kiếm chuyến xe cho Khách hàng (Search Trips for Customers)

#### 4.4.1. Mô tả
Cho phép Hành khách (bao gồm cả khách vãng lai chưa đăng nhập và người dùng đã có tài khoản) tìm kiếm các chuyến xe khách phù hợp với nhu cầu di chuyển của mình trên hệ thống GoStay.

Hành khách nhập Điểm khởi hành (`origin`), Điểm đến (`destination`) và Ngày đi (`departureDate`). Hệ thống tìm kiếm và hiển thị danh sách các chuyến xe còn vé, cho phép lọc nâng cao theo Loại xe (Giường nằm, Limousine, Ghế ngồi), Khung giờ xuất bến, Khoảng giá vé hoặc Nhà xe cụ thể, đồng thời hỗ trợ sắp xếp theo Giá vé hoặc Giờ khởi hành.

Mỗi chuyến xe hiển thị đầy đủ thông tin: Tên nhà xe, Loại xe, Biển số, Giá vé, Số ghế còn trống, Lộ trình chi tiết và Danh sách các trạm đón/trả khách dọc đường để hành khách chuẩn bị đặt vé.

#### 4.4.2. Tác nhân
- Khách hàng (Customer / Hành khách / Khách vãng lai)

#### 4.4.3. Tiền điều kiện
- Khách hàng truy cập vào Trang chủ hoặc Màn hình Tìm kiếm chuyến xe của hệ thống GoStay.
- Không yêu cầu khách hàng phải đăng nhập tài khoản (Public Access).

#### 4.4.4. Hậu điều kiện
- Hiển thị danh sách các chuyến xe thỏa mãn tiêu chí tìm kiếm kèm số ghế còn trống và lộ trình điểm đón/trả theo thời gian thực.
- Không làm thay đổi bất kỳ dữ liệu nào trong cơ sở dữ liệu.

#### 4.4.5. Quy tắc nghiệp vụ (Business Rules)

- **1. Quyền hạn truy cập công khai (Public Access - No Auth Required)**:
  - Đây là API mở cho cộng đồng (Public API), phục vụ khách vãng lai xem và tra cứu chuyến xe trên ứng dụng/website.
  - Không bắt buộc đính kèm Bearer JWT Token.
  - API Gateway cấu hình chuyển tiếp trực tiếp (`auth: false`).

- **2. Điều kiện hiển thị Chuyến xe hợp lệ (Valid Trip Filter Criteria)**:
  Hệ thống chỉ trả về những chuyến xe thỏa mãn **đồng thời** tất cả các điều kiện sau:
  - **Trạng thái Chuyến xe (`Trip.status`)**: Bắt buộc phải là **`SCHEDULED`** (Sắp chạy / Đang mở bán vé).
    - Tuyệt đối không hiển thị chuyến đã xuất bến (`DEPARTED`), đã hoàn thành (`COMPLETED`) hoặc đã hủy (`CANCELLED`).
  - **Thời gian khởi hành (`Trip.departureTime`)**: Phải là thời điểm trong tương lai (`departureTime > now()`). Những chuyến xe có giờ chạy đã trôi qua trong quá khứ sẽ tự động bị loại bỏ khỏi kết quả tìm kiếm.
  - **Trạng thái Tuyến đường (`Route.status`)**: Bắt buộc phải là **`ACTIVE`** (Đang hoạt động). Các chuyến thuộc tuyến đường đang bị tạm khóa (`INACTIVE`) sẽ không hiển thị.
  - **Trạng thái Xe khách (`Car.status`)**: Bắt buộc phải là **`ACTIVE`** (Đang hoạt động). Các chuyến có xe đang bảo dưỡng (`MAINTENANCE`) hoặc tạm khóa (`INACTIVE`) sẽ bị ẩn.

- **3. Tham số tìm kiếm chính (Core Search Parameters)**:
  - **Điểm khởi hành (`origin`)**: Bắt buộc nhập hoặc chọn, tìm kiếm tương đối không phân biệt hoa thường theo điểm xuất phát của tuyến đường (Ví dụ: "Hà Nội", "Hồ Chí Minh").
  - **Điểm đến (`destination`)**: Bắt buộc nhập hoặc chọn, tìm kiếm tương đối không phân biệt hoa thường theo điểm kết thúc của tuyến đường (Ví dụ: "Hải Phòng", "Đà Lạt").
  - **Ngày khởi hành (`departureDate`)**: Định dạng chuẩn `YYYY-MM-DD`. Hệ thống lọc tất cả các chuyến có giờ xuất bến nằm trong khoảng từ `00:00:00` đến `23:59:59` của ngày đó (theo múi giờ địa phương).

- **4. Bộ lọc nâng cao (Advanced Filters - Tùy chọn)**:
  - **Loại xe (`type`)**: Cho phép lọc theo `SLEEPER` (Xe giường nằm), `LIMOUSINE` (Xe Limousine VIP), `SEAT` (Xe ghế ngồi).
  - **Khoảng giá vé (`minPrice`, `maxPrice`)**: Lọc các chuyến có giá vé cơ bản nằm trong khoảng ngân sách mong muốn của khách hàng.
  - **Khung giờ xuất bến (`timeRange`)**:
    - Sáng sớm: `00:00 - 06:00`
    - Buổi sáng: `06:00 - 12:00`
    - Buổi chiều: `12:00 - 18:00`
    - Buổi tối: `18:00 - 24:00`
  - **Nhà xe (`operatorId`)**: Lọc các chuyến của một hãng xe cụ thể mà hành khách ưa chuộng.

- **5. Tính toán Tình trạng Ghế trống theo thời gian thực (Live Seat Availability)**:
  - Với mỗi chuyến xe trả về:
    - $\text{totalSeats}$: Tổng số ghế của chiếc xe được gán vào chuyến.
    - $\text{bookedSeats}$: Tổng số vé trong bảng `tickets` thuộc chuyến có trạng thái là `BOOKED` hoặc `PAID`.
    - $\text{availableSeats}$: Số ghế thực tế còn trống:
      $$\text{availableSeats} = \max(0, \text{totalSeats} - \text{bookedSeats})$$
  - Chuyến xe có $\text{availableSeats} = 0$ vẫn hiển thị nhưng gắn nhãn trạng thái *"Hết vé"* để khách hàng nắm bắt thông tin và cân nhắc chọn chuyến khác.

- **6. Sắp xếp kết quả (Sorting)**:
  - Mặc định: Sắp xếp theo **Giờ xuất bến sớm nhất** (`departureTime` tăng dần).
  - Khách hàng có thể chọn sắp xếp theo:
    - Giờ xuất bến: Sớm nhất ➔ Muộn nhất (`departureTime asc`) hoặc Muộn nhất ➔ Sớm nhất (`departureTime desc`).
    - Giá vé: Thấp ➔ Cao (`pricePerSeat asc`) hoặc Cao ➔ Thấp (`pricePerSeat desc`).

- **7. Phân trang (Pagination)**:
  - Hỗ trợ phân trang: `page` (mặc định 1), `limit` (mặc định 10 hoặc 20 chuyến/trang).
  - Trả về tổng số chuyến tìm được (`total`) và tổng số trang (`totalPages`).

#### 4.4.6. Luồng chính
1. Khách hàng truy cập vào Trang chủ GoStay.
2. Tại thanh tìm kiếm chuyến xe, khách hàng nhập/chọn:
   - Điểm khởi hành (VD: "Hồ Chí Minh").
   - Điểm đến (VD: "Đà Lạt").
   - Ngày đi (VD: "25/09/2026").
3. Khách hàng nhấn nút **"Tìm chuyến xe"**.
4. Ứng dụng gửi yêu cầu `GET /api/v1/trips/search?origin=Hồ Chí Minh&destination=Đà Lạt&departureDate=2026-09-25`.
5. Hệ thống Car Service tiếp nhận yêu cầu:
   - Kiểm tra định dạng tham số `departureDate`.
   - Truy vấn CSDL tìm các chuyến xe thỏa mãn: Điểm đi/Điểm đến khớp với Tuyến đường, ngày chạy khớp, chuyến có `status = SCHEDULED` và `departureTime > now()`, Tuyến và Xe đều đang `ACTIVE`.
   - Tính toán số ghế còn trống (`availableSeats`) cho từng chuyến xe.
   - Nạp thông tin Tên nhà xe (`Operator`), Loại xe (`Car`) và Danh sách trạm dừng (`RouteStop`).
6. Hệ thống phản hồi danh sách các chuyến xe thỏa mãn.
7. Giao diện hiển thị danh sách chuyến xe dạng thẻ (Card) trực quan:
   - Tên nhà xe & Logo.
   - Giờ xuất phát ➔ Giờ đến nơi (Tổng thời gian chạy).
   - Tên bến xuất phát ➔ Tên bến trả khách.
   - Loại xe & Số ghế còn trống (VD: "Còn 12 chỗ trống").
   - Giá vé (VD: "250.000 đ / vé").
   - Nút hành động **"Chọn chuyến"** (để chuyển sang bước Chọn ghế & Đặt vé).
8. Khách hàng có thể sử dụng bộ lọc bên trái (Loại xe, Khung giờ, Mức giá) để thu hẹp kết quả.
9. Hệ thống lọc và cập nhật kết quả tức thời trên màn hình.

#### 4.4.7. Luồng phát sinh
- **Luồng 5.a: Không tìm thấy chuyến xe nào**:
  - Nếu không có chuyến nào chạy trong ngày hoặc tuyến đường đó chưa có xe, hệ thống phản hồi mảng rỗng `data: []` kèm tổng `total: 0`.
  - Giao diện hiển thị màn hình trống thân thiện:
    *"Không tìm thấy chuyến xe nào từ [Điểm đi] đến [Điểm đến] vào ngày [Ngày đi]. Quý khách vui lòng chọn ngày khác hoặc tuyến đường lân cận."*
- **Luồng 5.b: Ngày đi trong quá khứ**:
  - Nếu khách hàng chọn ngày trước ngày hiện tại, hệ thống báo lỗi `400 Bad Request`:
    *"Ngày khởi hành không được ở trong quá khứ."*
- **Luồng 5.c: Thiếu thông tin điểm đi hoặc điểm đến**:
  - Nếu không cung cấp `origin` hoặc `destination`, hệ thống báo lỗi `400 Bad Request`:
    *"Vui lòng nhập đầy đủ Điểm khởi hành và Điểm đến."*

#### 4.4.8. Giao diện minh họa
- **Hình 1: Thanh tìm kiếm vé xe trên Trang chủ**
  - Khung tìm kiếm ngang gồm 3 trường nhập liệu: [Nơi xuất phát] ➔ [Nơi đến] ➔ [Ngày khởi hành] và Nút màu cam/xanh **"Tìm chuyến xe"**.
- **Hình 2: Màn hình Kết quả tìm kiếm chuyến xe**
  - Cột bên trái: Bộ lọc nâng cao (Khoảng giá với thanh trượt Slider, Checkbox Loại xe Limousine/Giường nằm, Checkbox Khung giờ Sáng/Chiều/Tối).
  - Cột bên phải: Danh sách các thẻ chuyến xe xếp theo giờ chạy. Mỗi thẻ hiển thị rõ: Giờ đi, Giờ đến, Giá vé, Số ghế trống, Nút **"Chọn chuyến"** và nút mở rộng **"Xem chi tiết lịch trình đón/trả"**.
