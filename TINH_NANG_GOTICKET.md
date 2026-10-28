# Các tính năng đã triển khai của GoTicket

Tổng hợp theo mã nguồn hiện có, cập nhật ngày 21/10/2026. Danh sách gồm giao diện và nghiệp vụ backend; không phải biên bản kiểm thử.

## 1. Tài khoản và chức năng dùng chung

- Đăng ký tài khoản qua hệ thống GoID dùng chung.
- Đăng nhập một lần qua SSO.
- Đăng xuất tài khoản.
- Điều hướng vào khu vực phù hợp với vai trò tài khoản.
- Phân quyền truy cập cho khách hàng, nhà xe, nhân viên và Admin.
- Xem và cập nhật thông tin cá nhân.
- Đăng ký trở thành đối tác nhà xe.
- Gửi hồ sơ và giấy tờ xác minh nhà xe.
- Theo dõi kết quả xét duyệt hồ sơ nhà xe.

## 2. Khách hàng — User

### Tìm kiếm và xem chuyến xe

- Xem trang chủ GoTicket.
- Tìm chuyến xe theo điểm đi, điểm đến và ngày khởi hành.
- Chọn tỉnh, thành phố từ danh sách gợi ý.
- Nhập tên địa điểm để lọc và tìm nhanh.
- Hoán đổi điểm đi và điểm đến.
- Lọc chuyến theo loại xe.
- Lọc chuyến theo khung giờ khởi hành.
- Lọc chuyến theo khoảng giá vé.
- Sắp xếp kết quả tìm kiếm theo giờ chạy hoặc giá vé.
- Xem thông tin chi tiết chuyến xe và nhà xe.
- Xem giờ khởi hành, giờ đến và thời gian di chuyển.
- Xem lộ trình, các trạm dừng và điểm đón trả.
- Xem giá vé và sơ đồ ghế còn trống.

### Đặt vé và thanh toán

- Chọn một hoặc nhiều ghế trên cùng chuyến.
- Chọn điểm đón và điểm trả khách.
- Nhập thông tin người liên hệ và từng hành khách.
- Đặt vé cho cá nhân hoặc nhóm hành khách.
- Giữ ghế tạm thời trong thời gian chờ thanh toán.
- Xem thời hạn giữ chỗ và tổng tiền đơn vé.
- Chuyển sang cổng GoPay riêng để thanh toán.
- Thanh toán trực tuyến qua phương thức được GoPay hỗ trợ.
- Quay lại GoTicket để xem kết quả thanh toán.
- Tiếp tục thanh toán đơn còn hiệu lực.
- Hủy đơn chưa thanh toán.

### Quản lý vé và thay đổi đặt chỗ

- Xem danh sách vé và lịch sử đặt vé của bản thân.
- Tìm kiếm, lọc vé và đơn hàng theo trạng thái.
- Xem chi tiết đơn vé và từng hành khách.
- Xem vé điện tử và mã QR lên xe.
- In vé hoặc lưu bản in thành PDF qua trình duyệt.
- Yêu cầu gửi lại vé qua email.
- Xem trạng thái thanh toán, hủy vé và hoàn tiền.
- Xem trước phí hủy và số tiền được hoàn.
- Yêu cầu hủy từng vé trong đơn theo chính sách.
- Chỉnh sửa thông tin hành khách trên vé theo điều kiện cho phép.
- Thay đổi điểm đón, điểm trả theo điều kiện cho phép.
- Đổi ghế hoặc đổi sang chuyến khác cùng nhà xe theo chính sách.
- Xem trước phí đổi, tiền cần trả thêm hoặc tiền được hoàn.
- Thanh toán phần chênh lệch khi đổi vé có giá cao hơn.
- Theo dõi tiến trình xử lý yêu cầu đổi, hủy và sửa vé.
- Thử lại hoặc hủy yêu cầu đang xử lý ở các bước được phép.
- Nhận phiên bản vé và mã QR mới sau khi thay đổi thành công.
- Gửi đánh giá chuyến đi khi đủ điều kiện.

### Hỗ trợ và khiếu nại

- Gửi yêu cầu hỗ trợ hoặc khiếu nại liên quan đến đơn vé.
- Xem danh sách yêu cầu đã gửi.
- Theo dõi trạng thái xử lý yêu cầu.
- Xem phản hồi và kết quả giải quyết từ Admin.

## 3. Nhà xe — Vendor / Operator

### Hồ sơ và tổng quan

- Xem bảng tổng quan hoạt động của nhà xe.
- Xem thống kê chuyến xe, đơn vé và doanh thu.
- Xem và cập nhật hồ sơ nhà xe.
- Cập nhật logo và thông tin liên hệ của nhà xe.

### Quản lý xe và sơ đồ ghế

- Xem danh sách xe thuộc nhà xe.
- Thêm và sửa thông tin xe.
- Quản lý loại xe, biển số và trạng thái xe.
- Chuyển xe sang trạng thái hoạt động, bảo trì hoặc ngừng hoạt động.
- Thiết lập sơ đồ ghế và tầng xe.
- Thiết lập mã ghế, vị trí ghế và hạng ghế.
- Bật hoặc tắt ghế trong cấu hình xe.

### Quản lý điểm dừng và tuyến đường

- Xem, thêm và sửa điểm dừng.
- Ngừng sử dụng điểm dừng.
- Xem, thêm và sửa tuyến đường.
- Cấu hình điểm xuất phát và điểm đến của tuyến.
- Sắp xếp các trạm dừng trên tuyến.
- Tạm khóa và mở lại tuyến đường.
- Xóa tuyến khỏi danh sách sử dụng mà vẫn giữ lịch sử chuyến cũ.
- Ngăn chọn tuyến đã xóa khi tạo lịch trình mới.

### Quản lý lịch trình và vận hành chuyến

- Xem danh sách chuyến theo ngày, mặc định là ngày hiện tại.
- Chọn ngày khác để xem lịch sử hoặc lịch trình sắp tới.
- Tạo chuyến từ tuyến đường và xe phù hợp.
- Thiết lập giờ khởi hành, giờ đến và giá vé cơ bản.
- Chỉnh sửa chuyến ở trạng thái nháp.
- Mở bán chuyến xe.
- Thử lại việc xuất bản chuyến khi quá trình đồng bộ bị gián đoạn.
- Tạm ngừng bán và mở bán lại chuyến còn đủ điều kiện.
- Theo dõi trạng thái chuyến và trạng thái bán vé.
- Ghi nhận hoàn thành chuyến khi đủ điều kiện.
- Cấu hình giờ và quyền đón trả tại từng trạm của chuyến.
- Thiết lập giá bán theo hạng ghế.
- Xem sơ đồ và tình trạng ghế của từng chuyến.
- Khóa và mở khóa các ghế trống vì lý do vận hành.
- Hủy toàn bộ chuyến và theo dõi tiến trình xử lý các đơn liên quan.
- Chỉnh sửa tiêu đề, mô tả và ảnh giới thiệu tuyến; không cần gửi duyệt nội dung riêng.

### Tra cứu đơn vé

- Xem danh sách đơn vé thuộc nhà xe.
- Tìm kiếm, lọc và xem chi tiết đơn vé.
- Xem thông tin hành khách và trạng thái từng vé.

### Theo dõi bán vé theo nhân viên

- Xem số đơn và số vé từng nhân viên đã thu tiền tại quầy.
- Lọc theo ngày nhận tiền và tìm tài khoản nhân viên.
- Xem tiền thu ban đầu, khoản thu thêm, tiền đã hoàn và doanh số sau điều chỉnh.
- Xem số vé đã hủy và các đơn bán của từng nhân viên.
- Mở đơn liên quan để tra cứu chi tiết.

### Quản lý nhân viên

- Xem danh sách nhân viên của nhà xe.
- Tìm tài khoản để thêm vào đội ngũ nhân viên.
- Gán và cập nhật quyền của từng nhân viên.
- Phân quyền bán vé tiền mặt, soát vé và vận hành chuyến.
- Giới hạn nhân viên theo các chuyến được phân công.
- Tạm khóa và kích hoạt lại liên kết nhân viên với nhà xe.

### Báo cáo và quyết toán

- Xem báo cáo doanh thu theo khoảng thời gian.
- Xem thống kê đơn vé, ghế bán và tiền hoàn.
- Theo dõi doanh thu trực tuyến và tiền mặt.
- Theo dõi hoa hồng và các khoản nhà xe được nhận.
- Xem danh sách và trạng thái các khoản quyết toán.
- Gửi yêu cầu rút khoản doanh thu đủ điều kiện.

## 4. Nhân viên nhà xe — Staff

Các chức năng được phép sử dụng phụ thuộc quyền và chuyến được nhà xe phân công.

- Xem danh sách chuyến trong phạm vi được phân công.
- Chọn ngày để xem lịch trình làm việc.
- Xem chi tiết chuyến, lộ trình và tình trạng ghế.
- Xem đơn vé và thông tin hành khách trong phạm vi được phép.
- Bán vé tiền mặt tại quầy khi được cấp quyền.
- Chọn ghế, điểm đón trả và nhập thông tin hành khách.
- Tạo đơn, xác nhận thu tiền và phát hành vé tại quầy.
- Xem biên nhận và in vé cho khách.
- Hủy đơn tiền mặt chưa thu tiền.
- Bán vé và xác nhận nhận tiền trực tiếp, không cần mở hoặc đóng ca thủ công.
- Quét QR bằng camera trên trình duyệt được hỗ trợ.
- Nhập hoặc dán mã vé để soát vé.
- Xác nhận khách đã lên xe.
- Xem danh sách hành khách và trạng thái lên xe của từng người.
- Đánh dấu hành khách không có mặt theo điều kiện cho phép.
- Giữ tạm mã chưa gửi được trong phiên khi mất mạng và gửi lại khi có kết nối.
- Vận hành chuyến, điều chỉnh giá hoặc khóa ghế theo quyền được cấp.
- Tạm ngừng và mở lại bán vé theo quyền và điều kiện của chuyến.

## 5. Quản trị hệ thống — Admin

### Tổng quan và quản lý nhà xe

- Xem bảng tổng quan GoTicket.
- Xem thống kê nhà xe, chuyến, đơn vé và các hồ sơ cần xử lý.
- Tìm kiếm và xem danh sách nhà xe.
- Xem thông tin chi tiết nhà xe.
- Tạm ngừng và khôi phục hoạt động nhà xe.
- Xem danh sách hồ sơ đăng ký đối tác.
- Xem giấy tờ xác minh và chi tiết hồ sơ.
- Phê duyệt hoặc từ chối hồ sơ nhà xe kèm lý do.

### Tài khoản và phân quyền

- Tìm kiếm và xem thông tin tài khoản.
- Khóa và mở khóa tài khoản theo quyền quản trị.
- Cấp và thu hồi các vai trò được hệ thống cho phép.
- Xem thông tin chính sách vận hành của GoTicket.

### Đơn vé, hỗ trợ và hoàn tiền

- Tra cứu đơn vé GoTicket và xem chi tiết từng đơn.
- Lọc, phân trang và xem các đơn thực sự cần xử lý.
- Xem thông tin vé, hành khách và trạng thái thanh toán.
- Xem yêu cầu hỗ trợ và khiếu nại do khách gửi.
- Tiếp nhận, phản hồi và giải quyết hoặc từ chối yêu cầu.
- Theo dõi các khoản phải hoàn của toàn đơn hoặc từng vé.
- Ghi nhận hoàn tiền kèm mã giao dịch và chứng từ.
- Hỗ trợ xử lý yêu cầu đổi vé và các nghiệp vụ bị gián đoạn.
- Theo dõi tiến trình và thử lại hoặc hủy nghiệp vụ ở bước cho phép.

### Quản lý chuyến và sự cố vận hành

- Tra cứu thông tin vận hành của chuyến xe.
- Xem trước ảnh hưởng của việc hủy toàn bộ chuyến.
- Hủy chuyến kèm lý do.
- Theo dõi các đơn, vé và khoản hoàn liên quan đến chuyến bị hủy.
- Ghi nhận hoàn thành chuyến theo điều kiện nghiệp vụ.
- Xem các hồ sơ sai lệch do đối soát phát hiện.
- Quét lại đối soát cho đơn và ghi chú xử lý.
- Xem tác vụ gửi thông báo và email trong Outbox.
- Gửi lại các tác vụ thông báo đã thất bại.
- Xem và xử lý ngoại lệ trong luồng đổi vé.

### Quyết toán và hoa hồng

- Xem các khoản quyết toán trực tuyến của nhà xe GoTicket.
- Lọc theo nhà xe và trạng thái quyết toán.
- Xem các yêu cầu rút tiền đang chờ xử lý.
- Tính lại số tiền ròng trước khi ghi nhận chi trả.
- Ghi nhận đã chi trả kèm mã giao dịch và chứng từ.
- Xem các ca tiền mặt đã đóng cần quyết toán hoa hồng.
- Xem tổng tiền thu, tiền hoàn và hoa hồng của từng ca.
- Xem hoa hồng phải thu, đã nộp và còn thiếu.
- Ghi nhận nhà xe đã nộp hoa hồng theo từng ca, kèm chứng từ.
- Xem và cập nhật tỷ lệ hoa hồng riêng của GoTicket bằng đơn vị phần trăm.
- Ghi lý do khi thay đổi tỷ lệ hoa hồng.
- Giữ nguyên tỷ lệ đã chốt của các giao dịch và ca cũ.

## 6. Nghiệp vụ tự động và hỗ trợ backend

- Tự động ngừng bán khi chuyến đến giờ khởi hành.
- Tự động hết hạn giữ ghế và giải phóng chỗ chưa thanh toán.
- Kiểm soát đặt trùng và bán trùng ghế.
- Đồng bộ chuyến bán vé với danh mục và kho ghế dùng chung.
- Đồng bộ đơn hàng, thanh toán, tồn ghế và vé điện tử.
- Xử lý đổi, hủy và sửa từng vé trong đơn nhiều hành khách.
- Hỗ trợ thu thêm hoặc ghi nhận hoàn chênh lệch khi đổi vé tiền mặt qua API theo quyền.
- Phát hành mã QR có chữ ký và quản lý phiên bản vé.
- Từ chối mã vé không hợp lệ, đã hủy, đã thay thế hoặc đã soát theo quy tắc nghiệp vụ.
- Gửi vé và thông báo qua tác vụ nền.
- Ghi nhận tiến trình nghiệp vụ để tiếp tục hoặc xử lý lại khi lỗi.
- Đối soát sai lệch giữa đơn hàng, thanh toán, kho ghế và vé.
- Ghi nhật ký các thao tác vận hành quan trọng.
- Tạo dữ liệu demo cho đủ bốn vai trò, dùng lại tài khoản Admin hiện có.
- Tạo dữ liệu demo gồm xe, tuyến, chuyến theo ngày chạy seed, đơn vé và tình huống nghiệp vụ.
- Làm mới các phiên giữ ghế demo để có thể tiếp tục trình diễn.
- Hỗ trợ thanh toán mô phỏng qua API cho tài khoản demo được cho phép.

## Ghi chú ngắn

- Quyền thực hiện đổi, hủy, sửa vé và thao tác chuyến phụ thuộc trạng thái thực tế và chính sách nghiệp vụ.
- Ghi nhận hoàn tiền, chi trả và nộp hoa hồng bằng chứng từ không đồng nghĩa hệ thống tự động chuyển tiền ngân hàng.
- Mô phỏng thanh toán demo có giới hạn tài khoản; không phải nút thanh toán mô phỏng chung trên giao diện.
