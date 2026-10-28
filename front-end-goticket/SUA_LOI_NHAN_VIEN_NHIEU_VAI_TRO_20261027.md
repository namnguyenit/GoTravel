# Lỗi quầy nhân viên không thấy chuyến — 27/10/2026

## Nguyên nhân đã xác định

Tài khoản trong ảnh có đồng thời USER, STAFF, TICKET_VENDOR. Tài khoản sở hữu nhà xe `nhan` nhưng được phân công bán vé cho một nhà xe khác. Chuyến `528e60c5…` đang ON_SALE, khởi hành 22:00 ngày 28/10/2026; phân công vẫn active và cho phép bán toàn bộ chuyến của nhà xe đó.

Trước khi sửa, AuthService giữ `operatorId` của nhà xe sở hữu. Quầy dùng điều kiện `isStaff() && !isVendor()` nên tài khoản này đi vào nhánh tải chuyến vendor, lấy nhầm nhà xe. Danh sách chuyến, soát vé và mở ca có cùng cách chọn vai trò. Sidebar vừa báo chưa gán quyền đặc thù vừa hiện các chức năng vì hasCapability() cho vendor mọi quyền.

Không phải phải đợi sát giờ khởi hành. Đổi ngày đúng vẫn không khắc phục được lỗi chọn nhầm nhà xe.

## Thay đổi

- [x] UserSession lưu từng phân công được backend trả về: nhà xe, quyền, danh sách chuyến và phạm vi toàn bộ chuyến.
- [x] StaffPortalProvider tạo ngữ cảnh riêng dưới StaffGuard. Giữ nguyên phiên/nhà xe sở hữu ngoài kênh nhân viên; trong kênh nhân viên dùng đúng nhà xe và quyền phân công.
- [x] Vendor/admin không tự nhận mọi quyền trong ngữ cảnh staff. Chưa được phân công hoặc không tải được phân công thì hiện thông báo và nút tải lại.
- [x] Khi có nhiều phân công, sidebar cho chọn nhà xe đang tác nghiệp. Đổi nhà xe làm mới dữ liệu trang để tránh giữ ghế/form của nhà xe trước.
- [x] Quầy, danh sách chuyến, soát vé và chọn chuyến mở ca lấy danh sách phân công, lọc đúng nhà xe đang tác nghiệp.
- [x] Danh sách đơn gửi operatorId; GET `/api/v1/orders/transport/vendor/{orderId}` nhận operatorId tùy chọn, Cart gọi GoCar read-scope để xác thực lại. Không tin quyền gửi từ trình duyệt.
- [x] Khôi phục đơn quầy và theo dõi phát hành vé gửi cùng operatorId, tránh lỗi 403 do backend tự ưu tiên nhà xe sở hữu.
- [x] GoCar khi xem/sửa lịch và điểm dừng kiểm tra chủ của chính chuyến đó, nếu không phải chủ thì kiểm tra phân công/quyền/phạm vi chuyến. Không từ chối chỉ vì nhân viên sở hữu một nhà xe khác. Lifecycle vẫn xác thực qua TransportOperationsService.
- [x] Thông báo quầy rỗng nêu rõ nhà xe, ngày và điều kiện mở bán/phân công.

## Xác nhận và triển khai

- [x] Build TypeScript/Vite frontend, TypeScript GoCar và Maven Cart thành công. Maven bỏ qua test; không chạy test suite toàn hệ thống.
- [x] Đọc dữ liệu live qua StaffService và mô hình UserSession: chuyến trong ảnh còn trong danh sách quầy ngày 28/10 khi dùng đúng ngữ cảnh; nhà xe sở hữu không bị thay đổi; quyền không được cấp không kế thừa từ vai trò vendor.
- [x] Frontend, GoCar và Cart được cập nhật và restart. Không đổi dữ liệu phân công, vai trò hay mật khẩu tài khoản người dùng; không có migration database ở lượt này.

Lượt đối chiếu tài khoản trong ảnh dùng dữ liệu service thật và mô hình phiên phía frontend, không đăng nhập bằng tài khoản đó. Chứng cứ và kết quả mở trang bằng tài khoản demo nằm trong `.data/goticket-journey-audit/20261027-staff-scope/`. Bản trước sửa tại `.release-backups/goticket-staff-context-20261027/`.
