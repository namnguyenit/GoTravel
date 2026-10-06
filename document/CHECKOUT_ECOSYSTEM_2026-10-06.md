# GoID, GoPay và danh sách đơn hàng

Ngày cập nhật: 06/10/2026. Checkout triển khai: `/home/trungcao/DoANLienNganh-devserver`.

## Thay đổi

- GoID: phần giới thiệu đổi thành **Nền tảng Go**, bên dưới **GoTravel · GoTicket**. Giữ hiệu ứng và nhận diện hiện có.
- GoPay: logo VNPAY nguyên bản từ [website VNPAY](https://vnpay.vn/), lưu tại `payment_portal/public/brand/vnpay-logo.svg`. Logo được phục vụ tại GoPay, không tải từ bên thứ ba khi mở trang.
- Bỏ biểu tượng thẻ chung, tiêu đề “Ngân hàng, thẻ hoặc mã QR”, đoạn giới thiệu và danh sách ba bước. Giữ cảnh báo Sandbox và các nút thanh toán/kiểm tra trạng thái.
- Lịch sử mua hàng: mỗi đơn là một ô chữ nhật riêng, có mã đơn, trạng thái, tên sản phẩm, ngày đặt, số sản phẩm và tổng tiền. Bấm ô mở chi tiết đúng đơn. Giữ tìm kiếm, bộ lọc, phân trang và liên kết cũ `?orderId=`.
- Chi tiết đơn trên GoTravel bổ sung đơn giá và nhãn thành tiền cho từng mục.

## Vì sao trước đây chỉ thấy một sản phẩm?

`payment_portal/server.js` lấy `order.items[0].listingTitle` để tạo phiên handoff. Trang thanh toán chỉ nhận một trường `title`, nên không có danh sách để hiển thị sản phẩm còn lại. API CartandOrder vốn đã trả đầy đủ `items[]`.

GoPay hiện đọc lại `GET /api/v1/orders/{orderId}` bằng phiên đăng nhập của khách hàng và hiển thị toàn bộ danh sách. Handoff không còn lưu tên sản phẩm đầu tiên.

### Thông tin hiển thị

- Đơn hàng: mã đơn, ngày đặt, trạng thái, hạn thanh toán nếu còn chờ thanh toán và tổng tiền.
- Từng sản phẩm: tên đầy đủ, ảnh Cloudinary nếu có, ngày bắt đầu/kết thúc, khung giờ nếu có, số lượng, đơn giá và thành tiền.
- Khách hàng: họ tên, số điện thoại và email đã nhập khi đặt hàng.

Các trường lấy từ dữ liệu đơn hàng đã lưu. API hiện không có bảng phí/thuế/giảm giá hoặc thông tin người tham gia từng sản phẩm; giao diện không tự tạo các dữ liệu này.

## Xác thực và an toàn

- Giữ xác minh nguồn launch, phiên GoID, quyền sở hữu đơn và ràng buộc handoff với cookie đăng nhập.
- Không lấy giá hoặc tên sản phẩm từ query string; API đọc đơn tiếp tục kiểm tra chủ sở hữu.
- Mỗi phản hồi thanh toán phải có đúng mã đơn, mã giao dịch hợp lệ và số tiền khớp tổng đơn, kể cả khi kiểm tra lại hoặc bấm thanh toán.
- Chỉ chuyển sang URL HTTPS của VNPAY đã được cho phép, với giao dịch `PENDING`. Giữ xác minh IPN/Return ở Java và xác nhận trạng thái đơn trước khi báo thành công.
- Nội dung khách hàng/sản phẩm dựng bằng `textContent`. Ảnh chỉ nhận HTTPS Cloudinary; ảnh lỗi có ô thay thế. CSP chỉ bổ sung `https://res.cloudinary.com` cho nguồn ảnh; không mở inline script/style.

## Kiểm tra

- Build Next.js và GoID thành công. ESLint cho các tệp lịch sử đơn đã sửa không có lỗi.
- `payment_portal`: `npm test` thành công; kiểm tra nguồn launch, quyền sở hữu, cookie handoff, đầy đủ hai sản phẩm, tài nguyên logo và CSP.
- Kiểm tra trình duyệt với hai sản phẩm khác nhau: đủ thông tin mua hàng, logo đúng màu, loại bỏ hướng dẫn, không tràn ngang trên điện thoại; nội dung HTML không được thực thi, URL ảnh ngoài bị bỏ qua, URL thanh toán ngoài bị chặn và số tiền lệch không được thanh toán.
- Kiểm tra danh sách 102 đơn: các ô tách riêng, phân trang sau 100 đơn, tìm kiếm/lọc, mở chi tiết hai sản phẩm, quay lại giữ bộ lọc, QR giải mã đúng mã đơn. Thử gửi lại email/khiếu nại trong bộ kiểm tra này dùng API giả lập.
- Trên tên miền thật: tạo một đơn kiểm thử với hai lượt dịch vụ 2.000đ ở hai ngày/khung giờ khác nhau, số lượng 1 và 2, tổng 6.000đ. GoPay và trang chi tiết đều hiển thị đủ hai mục. Đã hủy đơn sau kiểm tra, xác nhận trạng thái `CANCELLED`, kiểm tra giỏ hàng trước/sau không thay đổi. Không thanh toán ngân hàng và không gửi email thật.

Kết quả máy đọc: `CHECKOUT_ECOSYSTEM_UI_CHECK_2026-10-06.json`, `ORDER_CARDS_UI_CHECK_2026-10-06.json`, `CHECKOUT_ECOSYSTEM_LIVE_CHECK_2026-10-06.json` trong cùng thư mục.

## Triển khai

- PM2 24 / GoTravel: `.next-ecosystem-checkout-20261006`, cổng 3000.
- PM2 27 / GoID: `dist-goid-ecosystem-20261006`, cổng 3335.
- PM2 35 / GoPay: đã restart, cổng 3336.
- Kiểm tra HTTP 200 cho GoID, lịch sử GoTravel, health GoPay và logo VNPAY; cả ba tiến trình đang online. Giữ tài nguyên build cũ để các tab đang mở vẫn tải được.
- Build trước và bản sao các tệp trước đợt sửa được giữ để hoàn tác.

### Cấu hình tự khởi động PM2

Snapshot `/home/nhan/.pm2/dump.pm2` vẫn là cấu hình cũ, chưa phản ánh các build/đường dẫn đang chạy. Tài khoản `trungcao` không có quyền ghi tệp này. Chủ tài khoản `nhan` hoặc root cần lưu danh sách PM2 hiện tại bằng `PM2_HOME=/home/nhan/.pm2 pm2 save` sau khi kiểm tra tiến trình. Đây là vấn đề triển khai sẵn có; cấu hình runtime hiện tại đã cập nhật, nhưng không nên dùng snapshot cũ để phục hồi sau reboot.

Không commit hoặc push Git trong đợt sửa giao diện này.
