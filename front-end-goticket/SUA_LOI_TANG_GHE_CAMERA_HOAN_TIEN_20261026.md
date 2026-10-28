# Sửa luồng tầng xe, hạng ghế, camera và hoàn tiền

Ngày: **26/10/2026**. Bản sửa đã build và triển khai trên `https://gocar.nonnet123.io.vn`.

## Các yêu cầu đã làm

- [x] Tạo xe có lựa chọn 1 hoặc 2 tầng; với 2 tầng, nhập số ghế tầng 1 và xem số ghế tầng 2.
- [x] Tạo xe tự lưu sơ đồ trong cùng thao tác database. Không cần vào sơ đồ rồi bấm lưu lần đầu.
- [x] Sơ đồ có nút chuyển tầng 1/tầng 2, số ghế từng tầng và thao tác xếp lại 1/2 tầng.
- [x] Khách chọn tầng để xem/chọn ghế; hiển thị số ghế trống và số ghế đã chọn theo tầng.
- [x] Sửa lỗi tọa độ hàng/cột bị mất khi đọc chi tiết xe, khiến lưu hạng ghế bị báo trùng vị trí.
- [x] Có danh mục hạng ghế riêng cho nhà xe: mã, tên hiển thị; lưu để dùng lại khi tạo hoặc sửa các xe khác.
- [x] Chọn nhiều ghế bằng checkbox rồi áp dụng một hạng ghế; sau đó bấm Lưu thay đổi.
- [x] Sửa mẫu ghế xe đang có chuyến đã công bố được thực hiện cho những lần mở bán sau. Chuyến đã công bố giữ bản sơ đồ đóng băng và vé đã phát không bị thay đổi.
- [x] Camera không còn bắt buộc trình duyệt có `BarcodeDetector`; có bộ đọc QR JavaScript dự phòng.
- [x] Camera gắn stream sau khi video được render; dừng stream khi đóng, đổi trang hoặc đọc được QR; chống kết quả mở camera trả về muộn.
- [x] Hiển thị lỗi quyền camera, không có thiết bị, camera đang bị ứng dụng khác sử dụng và yêu cầu HTTPS.
- [x] Hiển thị hạn tự hủy/đổi và hoàn tiền theo số phút trên trang chuyến, checkout và chi tiết vé. Vé hiển thị thêm hạn cụ thể theo giờ Việt Nam.
- [x] Chính sách trên đơn dùng snapshot đã chốt lúc đặt; trang chuyến đọc cấu hình backend hiện hành. Không hardcode mốc phút ở frontend.
- [x] Admin mặc định thấy đơn chờ hoàn/rà soát; đặt tên rõ tab xử lý hoàn từng vé và khoản chênh lệch đổi vé.
- [x] Từ chi tiết đơn có liên kết mang theo mã đơn tới hoàn toàn đơn, hoàn từng vé hoặc phiếu hỗ trợ; URL giữ bộ lọc khi tải lại hoặc điều hướng.
- [x] Đơn REFUND_PENDING vẫn xuất hiện dù nghĩa vụ hoàn toàn đơn bằng 0/null. Có đường dẫn sang hồ sơ từng vé và thao tác quét đối soát chính đơn đó.

## Nguyên nhân các lỗi quan trọng

### Xe và hạng ghế

Trước đây tạo xe chỉ ghi bản ghi `cars`. Sơ đồ hiển thị lần đầu ở frontend là bản tạm, chưa được lưu. API chi tiết xe lại bỏ `row` và `column`; frontend gán các tọa độ thiếu về 0, nên khi chỉnh hạng ghế và lưu dễ bị chặn trùng vị trí.

Hiện tại `cars` và `seat_templates` được tạo cùng một thao tác Prisma lồng nhau. Mỗi tầng có tọa độ riêng và mã ghế không trùng trong xe. API trả đủ tọa độ. Các chỉnh sửa mẫu xe không ghi đè snapshot của chuyến đã công bố.

Danh mục mới `operator_seat_classes` thuộc **database GoCar**, liên kết `operators`. Mã hạng gồm chữ A–Z, số và dấu gạch dưới, tối đa 32 ký tự; tên hiển thị tối đa 80 ký tự. Có sẵn STANDARD, VIP, LUXURY. Hạng ghế không tự đặt giá: giá bán vẫn được cấu hình tại từng chuyến.

### Camera

Nhiều trình duyệt không có API `BarcodeDetector`; trước đây ứng dụng báo không hỗ trợ và không xin mở camera. Có thêm nguy cơ gắn stream trước khi thẻ video tồn tại. Bản sửa có bộ giải mã `jsqr` dự phòng và gắn/dọn stream theo vòng đời video.

### Hoàn tiền Admin

Phiếu khách gửi hỗ trợ, nghĩa vụ hoàn toàn đơn và nghiệp vụ hoàn từng vé là các loại hồ sơ khác nhau. Trang trước mở mặc định phiếu khách hỗ trợ; hồ sơ hủy từng vé nằm trong tab mang tên “Ngoại lệ từng vé”, nên từ đơn chờ hoàn rất khó tìm đúng nơi xử lý.

Có cả dữ liệu seed mang trạng thái REFUND_PENDING nhưng không có nghĩa vụ hoàn toàn đơn hoặc operation tương ứng. Các đơn này nay được hiển thị để rà soát, nhưng **không được tự lấy tổng giá trị đơn làm tiền phải hoàn**. Nút xác nhận hoàn toàn đơn chỉ dùng khi có số phải hoàn được backend xác nhận.

## Chính sách đang hoạt động

Đọc từ backend khi triển khai:

- Còn dưới **360 phút** trước khởi hành: không cho khách tự hủy/đổi để hoàn tiền.
- Từ 360 đến dưới 1.440 phút: phí 10%.
- Từ 1.440 phút: hoàn toàn bộ giá vé.
- Nhà xe hủy chuyến được xử lý theo luồng riêng; không áp dụng chặn tự hủy của khách.

Các con số trên là cấu hình hiện tại. Đơn cũ hiển thị snapshot riêng đã lưu, không bị đổi chính sách theo cấu hình mới.

## Kiểm tra có bằng chứng

Thực hiện trên Chromium với đăng nhập SSO thật và API thật, bằng dữ liệu DEMO:

1. Tạo xe 6 ghế qua giao diện, chọn 2 tầng và 3 ghế tầng 1: đọc lại API ngay thấy 6 ghế, 3 ghế mỗi tầng, trước khi mở trang sơ đồ.
2. Mở sơ đồ: trạng thái đã lưu, không cần lưu lần đầu. Tạo hạng CABIN_DEMO, chọn ghế, áp dụng và lưu; tải lại trang giữ đúng hạng và tọa độ.
3. Mở form tạo xe khác: hạng vừa lưu có trong danh sách để chọn lại.
4. Tạo/mở bán một chuyến DEMO; sửa mẫu ghế xe sau đó; so sánh API sơ đồ chuyến trước/sau cho kết quả không đổi.
5. Khách chưa đăng nhập mở chuyến, chọn ghế tầng 2 và nhìn thấy mốc 360 phút trước khi đặt.
6. Chạy camera với video QR giả lập và tắt `BarcodeDetector`: bộ đọc JavaScript đọc đúng mã từ video, điền vào ô nhập và đóng camera. Không giả response API check-in.
7. Mở vé DEMO có chính sách snapshot, hủy vé qua giao diện; Admin đi từ đơn sang đúng hồ sơ từng vé, ghi chứng từ DEMO và kiểm tra đơn khách thành REFUNDED.
8. Mở một đơn seed chờ hoàn nhưng thiếu nghĩa vụ: vẫn thấy đơn, nút ghi chứng từ hoàn toàn đơn bị khóa để tránh xác nhận sai số tiền.
9. Trên bản frontend cuối, bấm quét đối soát chính đơn seed đang chọn qua giao diện: API trả thành công, không tự xác nhận hoàn. Kiểm tra lại sơ đồ trên viewport điện thoại 390px: nút chuyển tầng và các ghế đều hiển thị, bấm được.

Tài khoản, cookie, QR, ảnh và kết quả chi tiết được giữ tại `.data/goticket-journey-audit/20261026/`, được Git bỏ qua. Không đưa thông tin phiên vào tài liệu này.

## Triển khai

- Backend GoCar: build NestJS, cập nhật Prisma Client và restart `gocar-service`.
- CartandOrder: build Maven, thay JAR và restart `gostay-cart`.
- Frontend: build TypeScript/Vite và restart `gocar-frontend`.
- Migration cộng thêm: `car/prisma/migrations/20261026010000_seat_class_presets/migration.sql`, chạy bằng `deploy/migrate-gocar-seat-presets.cjs`. Không chạy lại migration tạo schema ban đầu.
- Script migration kiểm tra xe thiếu sơ đồ để khởi tạo. Lần chạy này có **0 xe thiếu sơ đồ**.
- Gateway thêm đúng một route GET công khai tới API chính sách, qua script `deploy/configure-goticket-policy-route.mjs`; registry lưu bền và tự nhận phiên bản mới. Không reset các route khác.
- Bản nguồn/build/JAR trước sửa nằm trong `.release-backups/goticket-seat-refund-20261026/`.

## Giới hạn

Camera đã được kiểm tra bằng video giả lập trong Chromium, chưa cầm điện thoại để xác nhận camera vật lý và quyền riêng của từng trình duyệt. Chứng từ hoàn trong kiểm tra là DEMO, không phải chuyển tiền ngân hàng thật. Các đơn seed thiếu dữ liệu tài chính được giữ để rà soát; không tạo giao dịch hoàn tiền giả cho chúng.
