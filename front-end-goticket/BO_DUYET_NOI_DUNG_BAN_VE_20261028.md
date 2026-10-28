# Bỏ bước duyệt nội dung bán vé GoTicket — 28/10/2026

## Đã thay đổi

- Gỡ menu Kiểm duyệt Offer/Bài đăng khỏi admin; URL `/admin/offers` chuyển về quản lý nhà xe.
- Xóa mode offers cùng phần tải, tìm kiếm và nút duyệt/ẩn của màn hình AdminOperationsPage. Giữ nguyên các mode đối soát, hủy chuyến, tài khoản, chính sách và quyết toán.
- Cập nhật mô tả tổng quan admin và danh sách tính năng, không còn quảng bá bước duyệt nội dung GoTicket.
- Trong TransportOfferService, nội dung TRANSPORT đang ACTIVE vẫn ACTIVE khi nhà xe sửa tiêu đề/mô tả/ảnh. Bản ghi PENDING cũ chuyển ACTIVE khi được nhà xe hợp lệ chỉnh sửa/đồng bộ. Không tự khôi phục HIDDEN hoặc DELETED.
- Giữ kiểm tra chủ sở hữu, trạng thái tài khoản và KYC nhà xe trước khi cập nhật/đồng bộ niêm yết. Luồng tạo/mở bán chuyến vẫn kiểm tra lịch, giá, ghế và Inventory.
- Sửa TransportContentController từ hasAuthority('TICKET_VENDOR') sang hasRole('TICKET_VENDOR') để khớp JWT Identity phát scope ROLE_TICKET_VENDOR; tránh Access Denied cho chủ nhà xe hợp lệ.
- Trang sửa nội dung nhà xe không còn thông báo phải gửi duyệt.

## Dữ liệu cũ

`deploy/release-goticket-pending-content.mjs` xử lý một lần các bản ghi TRANSPORT đang PENDING, sau khi kiểm tra Identity xác nhận KYC APPROVED/isAllowed và GoCar xác nhận tuyến/nhà xe còn hoạt động, đúng sở hữu.

- Đã chuyển 4 niêm yết đủ điều kiện sang ACTIVE.
- Các bản ghi HIDDEN/DELETED và danh mục không phải TRANSPORT không nằm trong câu lệnh cập nhật.
- Không xóa bảng, không sửa đơn/vé, không bỏ quy trình niêm yết/phê duyệt của GoTravel.
- API quản trị listing dùng chung vẫn được giữ cho các ứng dụng khác; chỉ bỏ màn hình và bước duyệt nội dung trong GoTicket.

## Build và đối chiếu

- Build TypeScript/Vite frontend và Maven Catalog thành công; cập nhật/restart frontend và Catalog.
- Bỏ qua test suite. Đối chiếu riêng: sửa nguyên nội dung một niêm yết ACTIVE phải giữ ACTIVE, niêm yết HIDDEN phải giữ HIDDEN; admin không còn menu duyệt, URL cũ chuyển hướng đúng.

Backup nguồn/build trước sửa: `.release-backups/goticket-remove-content-review-20261028/`.
Kết quả đối chiếu và dữ liệu trạng thái trước chuyển: `.data/goticket-journey-audit/20261028-remove-content-review/`.
