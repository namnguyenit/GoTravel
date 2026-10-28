# Quyết toán và hoa hồng mô phỏng

## Cách demo

1. Nhà xe mở Báo cáo vận hành, gửi yêu cầu rút khoản thu của đơn đã kết thúc và xử lý xong hoàn/hủy vé.
2. Admin mở **Quyết toán & hoa hồng → Chi trả nhà xe · Online**; chọn **Đã yêu cầu rút**.
3. Bấm **Chi trả mô phỏng**, kiểm tra số thực nhận đã trừ hoa hồng và xác nhận. Khoản chi chuyển PAID và có nhãn **Đã chi trả mô phỏng** ở cả admin lẫn nhà xe.
4. Tab **Thu hoa hồng · Tiền mặt**: bấm **Nộp mô phỏng** ở ca kế toán đã đóng, còn nợ hoa hồng. Số mô phỏng chỉ bằng phần còn thiếu sau hoàn vé và khoản đã nộp trước đó.
5. Tổng đã nộp/còn thiếu tự cập nhật. Mỗi ca ghi rõ số tiền mô phỏng; nếu phát sinh hoàn vé sau khi đã nộp, phần nộp vượt vẫn hiện để đối chiếu.

Đây là mô phỏng nghiệp vụ trong ứng dụng. Không gọi VNPAY để chi trả, không chuyển tiền ngân hàng, không tạo chứng từ chuyển khoản giả. Cấu hình tỷ lệ hoa hồng và cách tính số tiền vẫn dùng nghiệp vụ hiện có; không tự đổi tỷ lệ của các đơn đã chốt.

## Điều kiện và lịch sử

- Mô phỏng được bật riêng trên cấu hình sandbox của server. Mặc định mã nguồn là tắt; đổi sang môi trường VNPAY production cũng không mở được mô phỏng.
- Online chỉ nhận payout GoTicket `TRANSPORT`, giao dịch gốc MOCK hoặc VNPAY sandbox đã xác thực. Các nguồn thu bổ sung đang còn trong vé cũng được kiểm tra. Không đổi khoản chi dịch vụ GoTravel sang mô phỏng.
- Không bỏ bước nhà xe yêu cầu rút, không giả lập chuyến đã hoàn thành, không bỏ qua khoản hoàn đang chờ đối soát.
- Preview và xác nhận đều tính lại net payable. Backend đối chiếu số tiền; không nhận số tự nhập để ghi thanh toán sai.
- Payout, audit và chứng cứ nghiệp vụ được ghi trong cùng transaction. Xác nhận lặp không tạo khoản chi thứ hai. Giữ khóa theo đơn để tránh lệch với nghiệp vụ tiền từng vé.
- Hoa hồng tiền mặt mô phỏng được ghi thành khoản riêng, cộng với chứng từ cũ khi tính báo cáo. Không sửa chứng từ cũ và không xóa ràng buộc của bảng chứng từ.
- Nút **Chứng từ thật** vẫn phục vụ khoản đã chuyển thực tế. Mã mô phỏng không được dùng để giả mạo chứng từ thật.

## Backend / database

Thay đổi ở PaymentandWallet và frontend GoTicket; không cần đổi Cart hoặc GoCar cho luồng mới này.

- `host_payouts.settlement_simulated`: đánh dấu chi trả mô phỏng, trả về API admin/nhà xe.
- `transport_settlement_simulations`: khóa `(kind,target_id)`, lưu người duyệt, số tiền, mã tham chiếu và thời điểm. Hai loại `PAYOUT` và `CASH_COMMISSION`.
- Online dùng sổ `transport_payout_bases`, `transport_payout_proofs`, `host_payouts` hiện có để chốt số thực nhận sau điều chỉnh vé.
- Cash dùng `transport_cash_settlements`, chứng từ `transport_cash_commission_payments`, các bảng đảo hoa hồng sau hoàn vé, cộng thêm audit mô phỏng để tính số đã nộp/còn nợ.
- Cấu hình `transport.settlement-simulation-enabled`, mặc định `false`; chỉ cấu hình riêng sandbox đang chạy bật `true`. Không lưu bí mật vào tài liệu hoặc code.

Migration từ gốc repo:

```bash
/home/nhan/.nodejs-22/bin/node deploy/migrate-goticket-settlement-simulation.mjs
```

## API mới

Đều yêu cầu ADMIN, theo cơ chế JWT/Gateway hiện có:

- `GET /api/v1/payouts/transport/simulation`: trạng thái bật mô phỏng.
- `POST /api/v1/payouts/transport/{payoutId}/simulation-preview`: số chi trả đã đối chiếu.
- `POST /api/v1/payouts/transport/{payoutId}/simulate-paid`, body `{ "amount": "437000" }`.
- `POST /api/v1/payouts/transport/cash-settlements/{shiftId}/simulation-preview`.
- `POST /api/v1/payouts/transport/cash-settlements/{shiftId}/simulate-paid`, body `{ "amount": "10000" }`.

Danh sách cash và tổng hoa hồng hiện có đã cộng phần mô phỏng, không chỉ cập nhật riêng một nhãn ở frontend.

## Phát hành

Build frontend và Pay bằng Maven `-Dmaven.test.skip=true`, áp dụng migration bổ sung, thay artifact và restart `gocar-frontend`, `gostay-payment`. Không chạy test suite. Chỉ kiểm tra gọn bằng hồ sơ seed/demo; giữ lịch sử người dùng hiện có.

Bản trước nằm tại `.release-backups/settlement-simulation-20261028/`. Dữ liệu kiểm tra hẹp nằm tại `.data/goticket-journey-audit/20261028-settlement-simulation/`.

## Kết quả sau phát hành

- Pay package và frontend build thành công; không chạy test suite.
- Sandbox flag được tải thành công; Pay và frontend đã restart.
- Hồ sơ seed payout `692ae8e7-3459-5aa7-af80-1183a849bcf3`: mô phỏng chi trả 437.000 đ, COMPLETED; danh sách PAID có `settlementSimulated=true`.
- Một ca seed tách riêng: mô phỏng nộp 77.000 đ, còn thiếu bằng 0; số tiền và cờ mô phỏng hiện trên API danh sách ca.
- Xác nhận lặp cả hai hồ sơ đều trả cùng mã ghi nhận; không thêm khoản trùng.
- Đã xem hộp xác nhận và giao diện desktop/mobile 390px; trang không tràn ngang, bảng có vùng cuộn riêng.
- File cấu hình riêng giữ quyền 640, nhóm doAn để tiến trình nhan đọc được; backup cấu hình chỉ chủ sở hữu đọc. Không thay token hoặc thông tin merchant.
