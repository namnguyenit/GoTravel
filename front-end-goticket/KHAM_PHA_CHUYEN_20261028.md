# Khám phá chuyến xe — 28/10/2026

## Hành vi

- Bấm **Khám phá** ở desktop hoặc mobile để vào `/search`.
- Chưa tìm tuyến: hiển thị tất cả chuyến sắp tới còn mở bán, không bắt chọn điểm đi và điểm đến.
- Mặc định xếp giờ khởi hành sớm trước, có phân trang và sắp xếp theo giá. Chế độ này hiển thị cả ngày khởi hành/ngày đến trên thẻ vì danh sách có thể gồm nhiều ngày.
- Nếu trình duyệt đã cho phép vị trí: lấy vị trí hiện tại để xác định thành phố, ưu tiên chuyến từ đó đi mọi nơi.
- Nếu chưa cấp quyền: vẫn hiển thị tất cả; người dùng có thể bấm **Dùng vị trí của tôi** để cấp quyền bằng hộp thoại của trình duyệt.
- Thành phố không có chuyến khớp bộ lọc: tự trả lại danh sách tất cả theo cùng bộ lọc và thông báo rõ. Không có vị trí hoặc định vị lỗi cũng không chặn danh sách.
- **Xem tất cả chuyến** bỏ ưu tiên vị trí. Tìm tuyến cụ thể qua form vẫn có điểm đi/đến/ngày như trước; định vị không ghi đè tiêu chí đã tìm.
- Bộ lọc giờ khi chưa chọn ngày áp dụng theo giờ Việt Nam trên mọi ngày sắp tới, không âm thầm chỉ lọc hôm nay.

## Điều kiện mở bán

Dùng cùng nguồn dữ liệu công khai hiện có: chuyến ON_SALE, nhà xe/xe đang hoạt động, Catalog cho phép bán, Inventory đã đồng bộ. Giữ thời hạn đóng đặt chỗ hiện có của hệ thống và lấy tình trạng ghế từ Inventory; không lộ danh sách đội xe nội bộ hoặc lấy ghế giả khi service lỗi.

## API

Giữ endpoint công khai `GET /api/v1/trips/search`:

- `?discover=true`: tất cả chuyến sắp tới, không bắt buộc tuyến hoặc ngày.
- `?discover=true&preferredOrigin=Đà Nẵng`: ưu tiên điểm xuất phát này, tự quay về tất cả khi không có kết quả.
- Có thể thêm ngày, loại xe, giá, khoảng giờ, thứ tự sắp xếp và phân trang như tìm kiếm hiện có.
- Không có `discover=true`: vẫn yêu cầu điểm đi, điểm đến và ngày, giữ tương thích luồng tìm tuyến cũ.

Response thêm `data.discovery = { origin?, nearby, fallback }` để frontend hiển thị đúng ngữ cảnh. Sắp xếp thêm ID làm thứ tự phụ để các chuyến cùng giờ/giá không bị lặp qua trang.

## Vị trí và dữ liệu

Trình duyệt dùng GPS hiện tại sau khi có quyền, gọi trực tiếp [BigDataCloud client reverse geocoding](https://www.bigdatacloud.com/docs/free-api/free-reverse-geocode-to-city-api) theo [chính sách của nhà cung cấp](https://www.bigdatacloud.com/docs/article/why-is-reverse-geocoding-api-free). Giao diện thông báo việc gửi tọa độ để xác định thành phố. Không gửi cookie đăng nhập sang nhà cung cấp.

Không lưu tọa độ vào localStorage, sessionStorage hoặc database GoTicket. Chỉ gửi tên điểm xuất phát đã xác định cho API chuyến xe. Nếu bị từ chối vị trí, không tự dùng IP để đoán thành phố. Không cần API key mới.

## Phát hành và kiểm tra hẹp

- Thay GoCar và frontend GoTicket; không đổi database, Pay hoặc Cart.
- Backend TypeScript và frontend build; không chạy test suite.
- Đã kiểm tra API tất cả/ưu tiên thành phố/không có chuyến thì quay về tất cả; bộ lọc buổi sáng theo giờ Việt Nam.
- Kiểm tra trình duyệt dùng phản hồi geocoding giả lập cục bộ, không gửi tọa độ thử nghiệm tới nhà cung cấp. Đã kiểm tra không gọi định vị trước quyền, thao tác nút dùng vị trí, tự ưu tiên khi đã có quyền và nút xem tất cả.
- Ảnh desktop/mobile, kết quả nằm ở `.data/goticket-journey-audit/20261028-discover-trips/`. Backup ở `.release-backups/discover-trips-20261028/`.
