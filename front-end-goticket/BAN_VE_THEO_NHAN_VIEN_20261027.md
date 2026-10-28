# Thay ca thủ công bằng bảng doanh số nhân viên — 27/10/2026

## Giao diện

- Đã gỡ Ca thu tiền mặt khỏi menu nhân viên và bỏ trang mở/đóng ca. URL `/staff/shifts` chuyển về chuyến được phân công.
- Vendor có menu **Doanh số nhân viên**, trang **Bán vé theo nhân viên** tại `/operator/counter-sales`. URL `/operator/shifts` chuyển về trang này.
- Lọc theo khoảng ngày nhận tiền ở Việt Nam; tìm nhân viên bằng tài khoản/email/SĐT.
- Xem số đơn, vé đã thu tiền, vé đã hủy, tiền thu ban đầu, tiền thu thêm, khoản hoàn đã xác nhận, doanh số sau điều chỉnh và lần bán gần nhất.
- Bấm Xem đơn để mở danh sách đơn của một người; bấm mã đơn để tra cứu trong quản lý đơn.
- Có phân trang tổng hợp và chi tiết, xử lý rỗng/lỗi, bảng cuộn riêng trên điện thoại.
- Bỏ tùy chọn gán quyền chốt ca trên màn hình quản lý nhân viên. Giữ dữ liệu quyền cũ để tương thích lịch sử/API; không tự thu hồi quyền hoặc xóa dữ liệu cũ.

## Quy tắc số liệu

- Nguồn bán thành công là `transport_cash_receipts`, không đếm CASH_PENDING/đơn giữ chỗ chưa nhận tiền.
- Một đơn nhiều ghế: số đơn đếm biên nhận duy nhất, số vé đếm order_items, không nhân tiền biên nhận lên theo số ghế.
- Khoảng ngày chọn theo `received_at` của biên nhận ban đầu, múi giờ Asia/Ho_Chi_Minh; cả ngày kết thúc được tính.
- Thu thêm từ `transport_operation_cash_proofs`; hoàn thực tế từ `transport_refund_confirmations` và `transport_operation_refund_proofs`. Không lấy nghĩa vụ hoàn đang chờ làm tiền đã hoàn.
- Các điều chỉnh của đơn được tính đến thời điểm xem và quy về người bán ban đầu. Đây là báo cáo doanh số của đơn, không phải xác nhận tiền thực tế nhân viên đã nộp.
- Vé đã hủy bao gồm trạng thái REFUND_PENDING/REFUNDED/VOID hoặc đơn đã hủy/hoàn tương ứng. Vé phát hành chưa xong được phân biệt trên bảng.
- Giữ người bán cũ/nhân viên không còn hoạt động nếu có biên nhận trong khoảng lọc. Nếu không tải được tên, vẫn hiện định danh tài khoản thay vì mất dòng số liệu.

## Backend và sổ tiền

Bỏ thao tác ca cho nhân viên không được xóa sổ gốc vì GoPay, hoa hồng và hoàn tiền đang tham chiếu nó.

- `checkoutCash` không còn yêu cầu nhân viên có ca mở sẵn. Sau khi xác thực quyền SELL_CASH/chuyến/giá/cấu hình hoa hồng, giao dịch tạo đơn tự mở hoặc tái sử dụng một nhóm ghi sổ nội bộ.
- Tạo nhóm ghi sổ và gắn vào đơn nằm trong cùng transaction. Khóa advisory theo nhân viên và khóa hàng sổ để tránh hai tab tạo nhóm trùng.
- Nhóm theo nhân viên, nhà xe, ngày Việt Nam; giữ phiên bản hoa hồng đã chốt. Khi chuyển nhà xe, cần hoàn tất/hủy đơn chưa nhận tiền của nhà xe trước.
- Khi qua ngày, hệ thống tự chốt nhóm không còn đơn PENDING/CASH_PENDING và chuyển thông tin quyết toán sang GoPay bằng luồng outbox hiện có.
- Hệ thống chỉ tổng hợp tiền theo chứng từ. `counted_amount` và `variance` của nhóm tự động để NULL; không giả rằng đã kiểm đếm hoặc nộp đủ tiền.
- Luồng nhận tiền vẫn kiểm tra đúng người bán, số tiền, thời hạn giữ ghế và khóa sổ đúng nhà xe trước khi tạo biên nhận.
- Các bảng/biên nhận/ca đã đóng trước đây được giữ nguyên. API ca cũ giữ để tương thích các tác vụ cũ, không còn là bước trên giao diện nhân viên.

API mới, chỉ chủ nhà xe được xem và backend tự xác thực phạm vi:

- `GET /api/v1/orders/transport/vendor/counter-sales?from=YYYY-MM-DD&to=YYYY-MM-DD&cashierId=<optional>&page=0&size=20`
- `GET /api/v1/orders/transport/vendor/counter-sales/{cashierId}?from=YYYY-MM-DD&to=YYYY-MM-DD&page=0&size=20`

Không mở rộng quyền xem báo cáo này cho nhân viên; không dùng thông tin quyền từ frontend để thay xác thực backend.

## Migration và triển khai

- `deploy/sql/goticket-automatic-cash-batches.sql`: thêm `auto_managed` và index; nhận quản lý tự động các sổ đang mở. Không sửa số tiền/biên nhận hay lịch sử kiểm đếm của sổ đã đóng.
- Chạy trên server bằng Node 22: `node deploy/migrate-goticket-automatic-cash.mjs`.
- Đã áp dụng migration, build Cart/TypeScript/Vite thành công, cập nhật và restart Cart cùng frontend.
- Không chạy test suite. Kiểm tra phạm vi hẹp: tài khoản demo chưa có ca tạo được đơn giữ ghế; hủy đơn đó thành công, không ghi biên nhận thu tiền. Kiểm tra quyền báo cáo (staff bị từ chối), số đơn tổng hợp khớp chi tiết, và mở bảng/modal trên trình duyệt.
- Chưa thực hiện một giao dịch mới xác nhận thu tiền/phát hành vé hoặc chạy kịch bản qua nửa đêm trong lượt này.

Backup trước sửa: `.release-backups/goticket-counter-sales-20261027/`. Chứng cứ phạm vi hẹp: `.data/goticket-journey-audit/20261027-counter-sales/` (không đưa phiên đăng nhập lên Git).
