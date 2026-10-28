# Khiếu nại và hoàn tiền — 28/10/2026

## Cách dùng

- Vào **Admin → Khiếu nại & Hoàn tiền**.
- **Hoàn tiền → Chờ xử lý**: mỗi dòng là một nghĩa vụ hoàn toàn đơn hoặc từng vé. Số tiền do backend xác định sau phí hủy, không nhập từ tổng giá trị đơn.
- Bấm **Hoàn mô phỏng**, kiểm tra số tiền và bấm **Xác nhận hoàn mô phỏng**. Chỉ nhận giao dịch MOCK hoặc VNPAY sandbox đủ điều kiện; không gọi API chi tiền ngân hàng.
- Khoản xử lý xong chuyển sang **Đã hoàn** và có nhãn **Đã hoàn mô phỏng**, mã ghi nhận. Trang chi tiết đơn của khách cũng thông báo có khoản hoàn mô phỏng.
- **Cần rà soát**: đơn đã thu tiền nhưng chưa phát vé, số phải hoàn chưa xác định, hoặc nghiệp vụ đang lỗi/đang đồng bộ. Không tự lấy tổng đơn làm số phải hoàn.
- **Khiếu nại**: chỉ gồm phiếu khách thực sự gửi. Bấm **Phản hồi / Xử lý**, chọn đang xem xét/đã giải quyết/từ chối và nhập phản hồi. Đóng khiếu nại không tự hủy vé hoặc hoàn tiền.
- Tìm theo mã đơn, tên/email khách; danh sách khoản hoàn còn tìm theo mã hồ sơ, tuyến, ghế và mã ghi nhận. Sắp xếp mới nhất trước, có phân trang.
- Khoản đã trả bên ngoài ứng dụng vẫn có mục thu gọn **Đã hoàn bên ngoài ứng dụng?** để lưu chứng từ thật. Hoàn tiền mặt không được biến thành kết quả VNPAY giả.

## Đã thay đổi

- Thay ba tab chồng chéo bằng hai nhóm Hoàn tiền/Khiếu nại.
- Bỏ các nút quét đối soát, mở đối soát lặp lại, ghi chứng từ bị vô hiệu và những hướng dẫn kỹ thuật dài khỏi luồng xử lý chính.
- Không hiện lặp đơn cha trong khi nghĩa vụ hoàn đang nằm ở các hồ sơ từng vé.
- Có lịch sử đã hoàn, gồm cả hồ sơ đã hoàn trước đây.
- Hộp xác nhận ưu tiên mô phỏng; giữ lỗi để người dùng đọc và kiểm tra lại, không tự xóa lỗi ngay khi gửi thất bại.
- Bổ sung hoàn mô phỏng toàn đơn; trước đây chỉ có mô phỏng từng vé.
- Bổ sung nhãn mô phỏng cho kết quả MOCK mới và thông báo trên trang đơn của khách.
- Giữ dữ liệu cũ chưa đủ điều kiện ở nhóm rà soát; không xóa hồ sơ hay giả định đã hoàn.

## Luồng backend

### Từng vé

Cart giữ nghĩa vụ/phiếu nghiệp vụ → kiểm tra nguồn tiền với Pay → admin xác nhận → Pay lưu audit mô phỏng → Cart ghi chứng cứ SIMULATED → bộ xử lý hiện có cập nhật tiền, vé và đơn. Có yêu cầu bền vững và worker tiếp tục sau gián đoạn. Lệnh mô phỏng không biến thành lệnh chi thật khi retry.

### Toàn đơn

Cart khóa đơn để xác nhận số tiền và lưu người duyệt → gọi endpoint mô phỏng nội bộ của Pay ngoài khóa đơn → Pay kiểm tra nguồn thu và nghĩa vụ từ Cart, khóa giao dịch gốc, lưu audit và cập nhật sổ hoàn/phí/payout trong cùng transaction → Cart lưu xác nhận và đặt REFUNDED. Worker tiếp tục đồng bộ nếu Pay đã xong nhưng Cart chưa cập nhật. Xác nhận lặp không tạo khoản hoàn thứ hai.

Chỉ áp dụng khi đơn GoTicket thanh toán online đang REFUND_PENDING, số hoàn dương và khớp backend; giao dịch gốc thuộc đúng khách/nhà xe, đã thu, đúng giá trị; chưa phân bổ sang sổ từng vé, chưa quyết toán tiền cho nhà xe. VNPAY phải có attempt thành công được xác thực, merchant khớp và URL lưu lúc thanh toán là sandbox; thay cấu hình hiện tại sang sandbox không làm giao dịch production cũ đủ điều kiện.

Trạng thái mô phỏng là kết quả trong ứng dụng. Không sửa chữ ký, response hoặc trạng thái “Chờ duyệt” trên VNPAY.

## API bổ sung

Tất cả endpoint công khai bên dưới yêu cầu ADMIN:

- `GET /api/v1/orders/transport/admin/refund-queue?category=PENDING|COMPLETED|REVIEW&search=...&page=0&size=15`
- `GET /api/v1/orders/transport/admin/refunds/{orderId}/simulation`
- `POST /api/v1/orders/transport/admin/refunds/{orderId}/simulation/simulate`, body `{ "amount": "200000" }`

Pay nội bộ, sử dụng cơ chế internal service token hiện có:

- `GET /api/v1/internal/payments/transport/orders/{orderId}/refund-simulation`
- `POST` cùng URL, body `{ "actorId": "UUID", "amount": "200000" }`.

API mô phỏng từng vé hiện có vẫn được giữ. Link cũ `?tab=operations&search=...` được mở thành danh sách khoản hoàn theo cùng từ khóa.

## Database / migration

Chạy từ gốc repo bằng Node 22:

```bash
/home/nhan/.nodejs-22/bin/node deploy/migrate-goticket-refund-cleanup.mjs
```

Script lấy kết nối bằng cấu hình riêng hiện có, không hardcode mật khẩu:

- **Cart DB**: thêm `orders.transport_refund_simulated`, `transport_refund_confirmations.simulated`; tạo `transport_order_refund_requests` giữ người duyệt, tiền, trạng thái khôi phục. Read model đọc thêm `orders`, `order_items`, `transport_item_operations`, bảng lý do và chứng cứ hoàn từng vé.
- **Pay DB**: tạo `transport_order_refund_simulations`. Sổ hiện có `transport_manual_refunds`, `payment_requests`, `host_payouts` được cập nhật bởi nghiệp vụ hoàn toàn đơn hiện có, liên kết mã mô phỏng đã kiểm tra.
- Migration chỉ bổ sung schema và đánh dấu những đơn đã có chứng cứ SIMULATED; không xóa lịch sử, không sửa dữ liệu GoTravel.

## Phát hành

- Chỉ thay frontend GoTicket, CartandOrder và PaymentandWallet.
- Build frontend và hai service Java; Maven dùng `-Dmaven.test.skip=true`, không chạy bộ test tự động.
- Migration áp dụng trước khi thay JAR. Artifact mới cài bằng rename; giữ bản cũ tại `.release-backups/refunds-cleanup-20261028/`.
- PM2: `gocar-frontend`, `gostay-cart`, `gostay-payment`.
- Kiểm tra hẹp sau phát hành chỉ dùng hồ sơ seed/demo; bằng chứng tại `.data/goticket-journey-audit/20261028-refunds-cleanup/`. Không phê duyệt hàng loạt các hồ sơ khách đang chờ.

## Kết quả kiểm tra hẹp

- Frontend build thành công; Cart và Pay package thành công, không chạy test suite.
- Ba nhóm khoản hoàn và API khiếu nại trả 200 qua Gateway bằng phiên admin thực tế.
- Hồ sơ seed `GTD-261019B2C857-0051`: hoàn mô phỏng từng vé 110.000 đ, kết quả COMPLETED/SIMULATED.
- Hồ sơ seed `GTD-261019B2C857-1921`: hoàn mô phỏng toàn đơn 200.000 đ, kết quả COMPLETED/SIMULATED. Gọi xác nhận lặp vẫn có một lịch sử hoàn và không còn ở danh sách chờ.
- Đã xác nhận worker khôi phục được bước Cart sau khi Pay đã ghi nhận; không tạo lại khoản hoàn.
- Đã sửa lỗi do trigger chứng từ append-only: lưu `simulated` ngay trong INSERT, không UPDATE chứng từ sau khi tạo. Giữ nguyên trigger bảo vệ lịch sử.
- Giao diện được xem ở desktop 1440px và mobile 390px; không tràn ngang. Tìm kiếm, chuyển tab và hộp xác nhận đọc được dữ liệu thực.
- Không phê duyệt hồ sơ đang chờ của khách thật. Việc mở hộp xác nhận của hồ sơ VNPAY chỉ đọc điều kiện, không bấm hoàn cho khách đó.
- Phản hồi VNPAY thô vẫn giữ trên Pay; thông báo ở màn mô phỏng giải thích điều kiện sandbox, tránh làm người dùng nhầm rằng phải chờ VNPAY duyệt mới demo được.
