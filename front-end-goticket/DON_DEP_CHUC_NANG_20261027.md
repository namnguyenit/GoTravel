# Dọn chức năng thừa và thao tác không hợp lệ trong GoTicket

Ngày thực hiện: 27/10/2026. Domain: `https://gocar.nonnet123.io.vn`.

## Đã gỡ

- [x] Bốn mục chính sách ở Footer chỉ là `span` có con trỏ bấm, không có trang hoặc handler. Thay nhóm này bằng hai đường dẫn thật: tra cứu vé và gửi yêu cầu hỗ trợ.
- [x] Đường dẫn gắn nhãn “Cổng quyết toán GoPay” nhưng mở trang thanh toán chung. Đường dẫn quyết toán hiện đi đến báo cáo nhà xe `/operator/reports`.
- [x] Hotline và giờ trực hardcode chưa có nguồn cấu hình nghiệp vụ.
- [x] Thẻ Phú Quốc dẫn sang tìm tuyến Rạch Giá–Hà Tiên, không khớp điểm đến được quảng bá.
- [x] Các mức giá tham khảo hardcode trên thẻ gợi ý; khách xem giá từ kết quả tìm chuyến thực tế.
- [x] Component OperatorGuard cũ không được import bởi ứng dụng và logic đăng ký nhà xe cũ chỉ ném lỗi. Giữ guard đang được App sử dụng và luồng KYC hiện tại.
- [x] Các kiểu dữ liệu/phương thức trạng thái hồ sơ nhà xe cũ chỉ được component đã bỏ sử dụng.

## Đã sửa để giữ chức năng cần thiết

- [x] Đồng bộ quyền trang `/staff/shifts`, menu nhân viên và màn hình ca: `SELL_CASH`, `CASH_VIEW`, `CLOSE_SHIFT`. Quyền thao tác mở/chốt ca vẫn được kiểm tra riêng.
- [x] Chỉ hiện nút Gửi lại Email cho đơn CONFIRMED/COMPLETED có email, theo đúng điều kiện backend. Handler chặn bấm lặp và trạng thái không hợp lệ. Thông báo chỉ xác nhận đã tiếp nhận yêu cầu, không tuyên bố email đã đến khách.
- [x] Đơn chưa phát hành/đã hủy hoặc hoàn dùng nhãn “In thông tin đơn”; giữ “In vé điện tử” cho đơn đủ trạng thái phát hành.
- [x] Dùng ngày Việt Nam thống nhất cho tìm chuyến, lịch chọn ngày và bộ lọc báo cáo. Không lấy ngày UTC hoặc ngày của múi giờ máy khách làm ngày vận hành.
- [x] Thẻ gợi ý tuyến dùng Link thật, điều hướng đúng điểm đi/đến/ngày và hỗ trợ bàn phím/mở tab mới.

## Phạm vi đã rà soát

Đăng nhập lại qua SSO bằng tài khoản demo thật trước khi đọc trang. Không giả JWT hoặc thay response HTTP.

| Vai trò | Số đường dẫn chính đã mở |
|---|---:|
| Khách | 7 |
| Nhà xe | 11 |
| Nhân viên | 5 |
| Admin | 11 |
| Tổng | 34 |

- Các lượt tải sau đăng nhập không ghi nhận exception JavaScript hoặc API 5xx. Các liên kết trang thu thập được đều khớp route có trong App.
- Khách chưa có hồ sơ nhà xe nhận 404 ở API đọc hồ sơ; form đăng ký vẫn hiện bình thường. Đây là trạng thái chưa đăng ký, không phải lý do xóa KYC.
- Nhân viên không có CHECK_IN thấy chặn quyền khi mở trực tiếp trang soát vé; giữ chức năng cho người được phân quyền.
- Kiểm tra sau triển khai: Footer desktop/mobile; thẻ gợi ý điều hướng đúng; đơn REFUNDED không còn nút gửi lại email; lịch vẫn chọn ngày Việt Nam khi trình duyệt dùng America/Los_Angeles; nút thêm xe ở dashboard vẫn mở modal; trang ca nhân viên và quyết toán Admin vẫn mở được.
- Chưa gửi email thử. Kiểm tra hiển thị nút email trên đơn đủ điều kiện chưa được xác nhận bằng lượt tự động vì trang dữ liệu chọn không trả ứng viên đáp ứng bộ lọc của kịch bản; điều kiện hiển thị đã đối chiếu trực tiếp với backend.
- Không thực hiện giao dịch thanh toán/hoàn tiền, đóng ca, tạo xe hoặc đổi quyền trong lượt rà soát này. Không chạy lại toàn bộ bộ test của dự án.

Việc tải được 34 trang không chứng nhận mọi nút, mọi dữ liệu và mọi tổ hợp nghiệp vụ đều không còn lỗi. Các chức năng lõi có backend hỗ trợ được giữ; chỉ gỡ những phần đã xác nhận không có tác dụng, sai đích hoặc là mã cũ không được sử dụng.

## Triển khai

- [x] Build TypeScript/Vite đạt.
- [x] Cài build mới và restart PM2 `gocar-frontend`.
- Bản trước thay đổi và mã nguồn đối chiếu: `.release-backups/goticket-feature-cleanup-20261027/`.
- Nhật ký/ảnh riêng: `.data/goticket-journey-audit/20261027-feature-cleanup/`, được Git bỏ qua.
