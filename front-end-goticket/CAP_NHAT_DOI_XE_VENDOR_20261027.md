# Cập nhật nhà xe: đội xe và sơ đồ ghế — 27/10/2026

## Đã triển khai

- [x] Gỡ Quầy bán vé khỏi menu nhà xe. Đường dẫn cũ `/operator/counter` chuyển về quản lý đơn; nhân viên có quyền SELL_CASH vẫn dùng `/staff/counter`.
- [x] Giữ Ca thu tiền mặt cho nhà xe theo dõi và đối chiếu nhân viên.
- [x] Đội xe hiển thị tên, biển số, loại, số ghế, trạng thái và các nút mở sơ đồ, sửa thông tin, xóa xe.
- [x] Bỏ lỗi phân trang tự quay về trang đầu do callback phụ thuộc trang đang xem; bộ lọc từ khóa áp dụng khi bấm Lọc hoặc Enter.
- [x] Thêm DELETE `/api/v1/cars/:id`, kiểm tra quyền TICKET_VENDOR và xe thuộc nhà xe của tài khoản đang gọi.
- [x] Xóa mềm bằng `cars.deleted_at`, đồng thời chuyển INACTIVE. Ẩn khỏi danh sách, KPI, chọn xe mới và trang sửa; giữ nguyên bản ghi xe, ghế, chuyến và vé lịch sử. Biển số vẫn được giữ để bảo toàn định danh xe, không cấp lại cho xe khác.
- [x] Chặn xóa khi còn chuyến chưa COMPLETED/CANCELLED và giờ đến dự kiến còn ở tương lai, bao gồm chuyến nháp. Thông báo chỉ rõ mã chuyến và thời gian khởi hành theo giờ Việt Nam; cần đổi xe hoặc hủy chuyến trước.
- [x] Chuyến cũ đã qua giờ đến không còn chặn xóa/sửa/ngừng xe chỉ vì còn trạng thái ON_SALE/STOP_SALE/SCHEDULED/DEPARTED cũ. Không tự sửa trạng thái lịch sử hoặc xóa lịch để giải quyết lỗi.
- [x] Dùng cùng khóa hàng xe với tạo lịch, sửa lịch và phát hành chuyến; sau khi xóa không thể gắn xe lại hoặc mở bán chuyến mới bằng API.
- [x] Sửa API đổi trạng thái trả đủ tên, biển số, loại và tổng ghế, tránh hiển thị xe trống thông tin sau khi đổi trạng thái.
- [x] Xe mới tự tạo và lưu ghế theo cấu hình tầng, mặc định 3 cột; có lựa chọn 2/4 cột theo xe thực tế.
- [x] Sơ đồ trực quan theo tầng, bấm ghế để chỉnh mã/hạng/tầng/vị trí; hỗ trợ chọn nhiều ghế và hạng ghế dùng chung.
- [x] Giao diện dùng hàng/cột bắt đầu từ 1, dữ liệu API vẫn bắt đầu từ 0. Chặn vị trí trùng và tọa độ không hợp lệ.
- [x] Sắp xếp lại 3 cột hoặc chia tầng là bản chỉnh sửa cần lưu; không tự đổi sơ đồ cũ. Giữ mã và hạng ghế khi sắp xếp lại. Vé/chuyến đã mở bán dùng saleSnapshot, không bị đổi theo mẫu xe.
- [x] Cảnh báo bản chỉnh sửa chưa lưu; hỗ trợ thao tác trên điện thoại.

## Backend và database

Chỉ thay đổi GoCar và frontend GoTicket. Không sửa schema hay nghiệp vụ thanh toán của GoTravel.

Migration cộng thêm một cột nullable và một index:

- `car/prisma/migrations/20261027010000_archive_cars/migration.sql`
- `deploy/migrate-gocar-car-archive.cjs`

Với database hiện tại chưa theo dõi đầy đủ `_prisma_migrations`, dùng script cộng thêm; không chạy lại các migration khởi tạo:

```bash
cd /home/DoANLienNganh
/home/nhan/.nodejs-22/bin/node deploy/migrate-gocar-car-archive.cjs
cd car
PATH=/home/nhan/.nodejs-22/bin:$PATH ./node_modules/.bin/prisma generate
```

Script này đã được áp dụng trên database GoCar của server. Không chỉnh/xóa dữ liệu chuyến cũ.

## Xác nhận phạm vi hẹp sau khi hoàn tất

Không chạy test suite hoặc quét lại toàn hệ thống.

- [x] TypeScript backend và TypeScript/Vite frontend build thành công.
- [x] Tạo một xe kiểm tra 12 ghế/2 tầng: ghế tự lưu, mặc định 3 cột.
- [x] Bấm A01 đổi VIP, lưu và đọc lại dữ liệu thành công.
- [x] Đổi trạng thái giữ đủ thông tin xe.
- [x] Xóa xe kiểm tra bằng giao diện: xe biến mất khỏi danh sách, đọc/sửa chi tiết trả 404. Bản ghi xóa mềm được giữ trong database và có audit ARCHIVE_CAR.
- [x] Menu và URL quầy cũ của nhà xe đã gỡ/chuyển hướng.
- [x] Xem sơ đồ trên desktop và điện thoại; không có lỗi JavaScript trong lượt thao tác này.

Chưa chạy kịch bản đồng thời giữa xóa và tạo lịch, hoặc thực hiện hủy/chuyển xe trên các chuyến có vé thật trong lượt này. Điều kiện khóa và bảo toàn lịch sử được kiểm tra ở mã nguồn; không tuyên bố đã kiểm thử tất cả nghiệp vụ.

Bản build cũ và bản nguồn trước lượt sửa được giữ tại `.release-backups/goticket-vendor-fleet-20261027/`. Chứng cứ thao tác nằm trong `.data/goticket-journey-audit/20261027-vendor-fleet/` (không đưa session/cookie lên Git).
