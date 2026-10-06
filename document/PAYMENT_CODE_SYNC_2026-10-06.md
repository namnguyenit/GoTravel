# Kiểm tra đồng bộ code thanh toán — 2026-10-06

Nguồn: `/home/DoANLienNganh`. Đích: `/home/trungcao/DoANLienNganh-devserver`.

## Kết quả

| Module | File nguồn | Khớp hoàn toàn | Thiếu tại devserver | Khác biệt |
| --- | ---: | ---: | ---: | --- |
| payment_portal | 9 | 5 | 0 | 4 file đã bổ sung hỗ trợ hai tên miền |
| PaymentandWallet | 54 | 53 | 0 | application.yaml: cấu hình bind và token nội bộ |

Bốn file portal khác biệt (`README.md`, `public/app.js`, `server.js`, `test/handoff.test.js`) trong thư mục chung khớp byte với HEAD đã commit của devserver. Bản devserver hiện bổ sung cấu hình trungcaodev.io.vn, giữ tên miền cũ, lưu origin mở checkout trong session và kiểm thử tương ứng. Không có code mới ở thư mục chung bị thiếu ở devserver.

Backend devserver giữ bind `127.0.0.1` mặc định và cấu hình token nội bộ đã bảo mật. Không chép đè application.yaml bằng bản thư mục chung.

## Runtime

- PM2 `gostay-payment-portal` đang chạy `devserver/payment_portal/server.js`.
- PM2 `gostay-payment` có cwd `/home/DoANLienNganh`, nhưng launcher là `devserver/deploy/start-java-service.sh`; launcher lấy project_dir theo vị trí chính script, nên JAR chạy từ `devserver/PaymentandWallet/target`.
- Không restart trong đợt kiểm tra đồng bộ này vì không cần đổi code runtime.
- Kiểm thử payment handoff đạt sau đối chiếu.

Không cần copy thêm file: mục tiêu đồng bộ đã đạt. Không chép môi trường bí mật, dependency, build artifact hoặc dữ liệu runtime. Chi tiết đối chiếu tại `PAYMENT_CODE_SYNC_2026-10-06.json`.
