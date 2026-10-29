# Go — Bộ nhận diện GoTravel, GoID, GoPay, GoTicket

Bộ biểu tượng gốc được dựng bằng SVG: vòng chữ G mở, nét bo tròn cùng độ dày, kết hợp hướng đi (GoTravel), đường nối (GoID), chữ P (GoPay), chữ T (GoTicket). Wordmark dùng chữ thường: `gotravel.`, `goid.`, `gopay.`, `goticket.`; `go` nét 800, phần sau nét 500, dấu chấm mang màu thương hiệu.

## Màu

| Thương hiệu | Màu |
| --- | --- |
| GoTravel | `#FF385C` |
| GoID | `#6554D9` |
| GoPay | `#008B79` |
| GoTicket | `#147FCC` |

## Tệp bàn giao

- `brand-family.svg` / `.png`: bảng tổng thể nền sáng, nền tối và kích thước nhỏ.
- `exports/<brand>/*-symbol.svg`: biểu tượng nền trong suốt, bản màu / đen / trắng.
- `exports/<brand>/*-lockup.svg`: biểu tượng + chữ, bản màu / đen / trắng. Chữ đã chuyển thành đường vector, không cần cài font để hiển thị.
- PNG biểu tượng 512px, logo có chữ rộng 1200px; nền trong suốt.
- `*-icon.svg`, PNG 32 / 64 / 180px: favicon và biểu tượng ứng dụng có nền thương hiệu.
- `source/brands.json`: các nét SVG gốc và cấu hình màu.
- `source/generate.py`, `source/render.mjs`: dựng lại SVG và PNG. Dùng FontTools để chuyển chữ thành vector, Sharp của frontend để render. Font Outfit và giấy phép OFL nằm tại `front_end/public/fonts`.

## Sử dụng

Dùng bản màu trên nền sáng, bản trắng trên nền tối. Giữ khoảng trống ít nhất bằng 1/4 chiều cao biểu tượng; không kéo méo hoặc thêm viền/đổ bóng vào logo. Với kích thước 16–24px ưu tiên biểu tượng hoặc favicon, không thu nhỏ cả logo có chữ. Tệp `public/brand` tại các ứng dụng là các bản triển khai cho web.

GoTicket hiện triển khai tại `front-end-goticket/`, dùng bộ logo gốc ở header, footer, các cổng quản trị và favicon. Màu tương tác xanh được quản lý qua token chung. Chi tiết cập nhật ngày 29/10/2026: [Đồng bộ nhận diện GoTicket](../front-end-goticket/GOTICKET_BRAND_SYNC_20261029.md).
