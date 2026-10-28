# Dọn phân quyền nhân viên — 28/10/2026

- Giữ CHECK_IN, SELL_CASH và MANAGE_TRIP: đều có kiểm tra quyền ở backend. Đối chiếu service thật với các phân công có sẵn: cấp MANAGE_TRIP được phép; không cấp bị từ chối; phân công inactive bị từ chối. Không thay vai trò hoặc quyền để thực hiện lượt đối chiếu này.
- MANAGE_TRIP quyết định nút cấu hình/vận hành trên trang Chuyến được phân công và các thao tác mở/ngừng bán, giá, vòng đời chuyến. Không cấp quyền này vẫn được xem danh sách chuyến theo phạm vi, không có nghĩa là quyền điều hành vô hiệu.
- Gỡ checkbox Active khỏi ma trận quyền vì đây là trạng thái phân công và đã có thao tác riêng ở danh sách.
- Danh sách hiển thị Đang phân công/Đã ngừng và nút Ngừng phân công/Khôi phục. Xác nhận chỉ nói về phân công tại nhà xe, không mô tả là khóa toàn bộ tài khoản Identity.
- Khi sửa quyền, giữ nguyên active hiện có; tạo phân công mới mặc định active. Giữ canCloseShift và tripIds cũ qua hợp đồng PATCH-like của API phân công, không vô tình xóa phạm vi.
- Sửa việc thông báo thành công bị handleResetSelectedStaff xóa ngay sau khi lưu.
- Khi chọn hoặc đổi nhân viên, nạp/reset quyền đúng người; khóa thao tác lặp khi đang lưu. Bỏ mô tả mở ca trong SELL_CASH.
- Đã build/restart frontend. Kiểm tra riêng giao diện có đúng 3 checkbox, lưu lại quyền không đổi của một nhân viên demo vẫn giữ trạng thái/phạm vi, thông báo thành công hiển thị. Không chạy test suite.

Backup: `.release-backups/goticket-staff-permissions-20261028/`.
Kết quả đối chiếu và ảnh: `.data/goticket-journey-audit/20261028-staff-permissions/` (giữ riêng các phiên đăng nhập, không đưa lên Git).
