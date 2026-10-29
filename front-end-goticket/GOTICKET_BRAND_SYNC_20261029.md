# Đồng bộ nhận diện GoTicket với Go family — 29/10/2026

Nguồn nhận diện đã được thiết kế trước đây: `brand-assets/source/brands.json`, `brand-assets/exports/goticket/` và `document/GO_BRAND_FAMILY_2026-10-06.md`.

## Áp dụng

- Dùng lại nguyên logo gốc: vòng G mở và nét T, chữ thường `goticket.`. Wordmark trong SVG đã chuyển Outfit thành vector; không cần tải thêm font cho logo.
- Header khách, footer và topbar nhà xe/nhân viên/admin dùng chung `BrandWordmark`.
- Portal trên điện thoại dùng biểu tượng gọn và nhãn vai trò; desktop hiển thị logo có chữ. Giữ tên truy cập GoTicket cho liên kết logo.
- Vé tại quầy có bản logo đen để in.
- Thay favicon Vite bằng icon GoTicket, thêm PNG 32px, Apple Touch Icon 180px, theme-color và ngôn ngữ trang tiếng Việt.
- Các file triển khai ở `public/brand/` giống nguyên bản xuất tại `brand-assets/exports/goticket/`. Giữ đường dẫn `/favicon.svg` tương thích với tab cũ.

## Màu và giao diện

- Màu biểu tượng chính thức: `#147FCC`.
- Màu nút/chữ tương tác: `#1074BC`, đậm hơn để chữ trắng nhỏ đạt tương phản khoảng 4,95:1.
- Hover: `#0E5B94`; chữ xanh đậm: `#0B4C7D`; nền xanh nhạt: `#EAF4FC` và `#D7EAF8`.
- `src/index.css` quản lý token `--gt-brand-*`; các thành phần chuyển sang dùng token thay vì màu san hô GoTravel gắn trực tiếp.
- Thêm liên kết token với Tailwind v4 cho nút dùng `primary`, focus ring, trạng thái hover và thành phần dùng chung.
- Màu lỗi/hủy/xóa, cảnh báo và thành công vẫn theo ý nghĩa nghiệp vụ riêng.
- Giữ bố cục, ảnh du lịch, font nội dung, điều hướng, API, phân quyền, xác thực, giữ chỗ và luồng thanh toán hiện có.
- Tên prop `variant="coral"` của một số component cũ được giữ tương thích với nơi gọi hiện tại; màu thực tế đã lấy từ token thương hiệu GoTicket.

## Xử lý tài nguyên và proxy

Trước đây, `/brand` trong `vite.config.ts` được proxy toàn bộ sang GoPay, làm logo GoTicket trả trang 404 của GoPay. Chỉ giữ proxy `^/brand/gopay-` cho tài nguyên GoPay; `/brand/goticket-*` phục vụ từ frontend GoTicket. Các proxy `/api`, `/launch`, `/session`, `/pay`, `/vnpay`, font và script GoPay giữ nguyên.

## Build và triển khai

- Build TypeScript và Vite production vào thư mục tạm trước khi thay `dist`.
- Giữ asset hash của bản cũ để tab đang mở tiếp tục tải được tài nguyên.
- Chỉ restart `gocar-frontend` trên PM2; không sửa hoặc restart backend, GoID, GoPay và GoTravel.
- Backup source và bản build trước thay đổi: `.release-backups/goticket-brand-20261029/`.
- Ảnh và dữ liệu kiểm tra hiển thị lưu local tại `.data/goticket-journey-audit/20261029-brand/`, không đưa cookie phiên hoặc ảnh dữ liệu demo lên Git.

Bộ bố cục trong `GOTICKET_UI_REDESIGN_PLAN.md` là tài liệu thiết kế ở thời điểm trước; phần quy định màu san hô trong tài liệu đó được thay bằng nhận diện GoTicket gốc theo tài liệu này.

## Xác nhận hiển thị

- TypeScript và Vite production build thành công; `git diff --check` không có lỗi.
- Trang chủ, tìm chuyến, nhà xe, nhân viên và admin được xem trên desktop 1440px và mobile 390px: logo tải thành công, không tràn ngang và không phát hiện lỗi JavaScript trong lượt kiểm tra này.
- `/brand/goticket-lockup.svg` trả HTTP 200; `/brand/gopay-symbol.svg` qua proxy tương thích cũng trả HTTP 200.
- Không chạy bộ kiểm thử nghiệp vụ hoặc tạo giao dịch/đơn hàng mới trong đợt cập nhật nhận diện.
