# Sửa số cột sơ đồ ghế — 27/10/2026

- Nguyên nhân: ô chọn khởi tạo cố định 3 cột, không đọc vị trí ghế đã lưu. Đổi ô chọn cũng chưa sắp xếp ghế cho tới khi bấm một nút riêng.
- Đã bỏ trạng thái số cột độc lập. Ô chọn lấy số cột từ chính dữ liệu ghế đang hiển thị, kể cả sau chỉnh vị trí ghế thủ công.
- Đưa ô chọn ra ngay trên sơ đồ. Chọn 2/3/4 cột sắp xếp bản chỉnh sửa ở cả hai tầng ngay lập tức; bấm Lưu thay đổi để lưu. Reload đọc lại đúng số cột đã lưu.
- Giữ mã, hạng, số ghế và tầng; không tự đổi các xe khác khi mở trang.
- Đã chỉnh mẫu xe `xe vip1`, biển số `51B-134.24`, từ 4 thành 3 cột, giữ 50 ghế, mỗi tầng 25 ghế. Chỉ cập nhật tọa độ ghế; giữ cả ID, mã ghế, hạng, tầng và các vé/chuyến đã mở bán. Hash các saleSnapshot trước và sau giống nhau.
- Backup nguồn/build trước lượt sửa tại `.release-backups/goticket-seat-columns-20261027/`; dữ liệu mẫu trước sửa và kết quả đối chiếu tại `.data/goticket-journey-audit/20261027-seat-columns/`.
- Chỉ cần build/restart frontend cho thay đổi giao diện này; không migration database hoặc build backend.
