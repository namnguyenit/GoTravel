# Seed cân bằng 34 tỉnh/thành

Công cụ cho database phát triển, batch `gotravel-province-balance-2026-10-05-v1`.

## Chạy

```bash
node balanced/research-anchors.js
node balanced/apply.js
node balanced/apply.js --apply
node balanced/verify.js
```

Chạy không có `--apply` chỉ lập kế hoạch. Lần sau kiểm kê lại, nếu số lượng các loại đã bằng nhau và có đủ 91 ngày lịch thì không ghi database. Không dùng wipe/reset.

`provinces.js` ánh xạ tên cũ về 34 tỉnh/thành theo nguồn Chính phủ. Chỉ thay trường province bằng compare-and-update, giữ ID, tên địa danh, tọa độ, giá và quyền của tài khoản. Không gán listing mới vào complex có chủ sở hữu không có trong danh sách tài khoản seed hoạt động/quyền phù hợp.

Chỉ tiêu lấy từ mức cao nhất hiện có giữa các tỉnh, tối thiểu 6 cho từng loại lưu trú/SVC/complex, tối thiểu 30 cho EXP. Vì giữ dữ liệu cũ và không xóa bớt để cân bằng, các chỉ tiêu có thể tăng nếu tỉnh nào đã có nhiều hơn. Toàn bộ tỉnh đạt cùng chỉ tiêu của từng loại. Trước lần nhập đầu: 13 loại lưu trú (6 mỗi loại, căn hộ/villa 8), EXP 30, 9 loại SVC mỗi loại 6, complex 9.

Dịch vụ mới có ảnh, mô tả, attributes, 3 review giả lập, aggregate rating khớp và inventory. Complex mới có >=2 listing cùng chủ sở hữu. Ảnh public chỉ lấy từ manifest Cloudinary được kiểm chứng. Ba tỉnh trước đây không có địa danh anchor được bổ sung trung tâm đô thị từ Wikipedia/Commons, có giấy phép và credit; không sao chép đánh giá Google Maps.

## Transaction và lịch

Booking và Catalog dùng transaction riêng cùng advisory lock. Calendar chèn theo batch 400 listing, `ON CONFLICT DO NOTHING`; giữ số lượng, status, version và lock/giao dịch hiện có. Chỉ kiểm tra chỗ trống của listing mới; lịch cũ hết chỗ/đã khóa không được mở lại. Config cũ không sửa; chỉ thêm config thiếu, nối lịch thiếu vào các ngày từ hiện tại đến +90 ngày. Booking commit trước Catalog để dữ liệu xuất bản có lịch.

Nếu Booking đã commit mà Catalog chưa xác định được commit, journal ghi `inventory_committed_requires_reconciliation`, cần kiểm kê các ID trong applied-plan trước khi chạy tiếp. Công cụ không tự xóa lịch có thể đã có lock. Không tạo đơn thanh toán giả, không sửa quyền SSO.

Plan/journal/backup nằm trong `.image-migration/balanced/` được ignore, có cả `applied-plan.json`; `receipt.json` là thống kê có thể đưa vào Git. Không đưa credential vào report. Bảng `seed_record_provenance` lưu nguồn gốc riêng; nhãn “[Mẫu]” không được thêm vào nội dung hiển thị, review vẫn xác định là giả lập.

## Hiển thị trang chủ

Trang chủ chỉ chọn các nhóm tỉnh có ít nhất 6 kết quả từ API, giới hạn 12 thẻ mỗi hàng dịch vụ. Complex giữ tối đa 12 thẻ và nhóm đủ 6. Cơ chế này tránh chọn một tỉnh chỉ có một thẻ được rating cao. Có thể có ít hàng hơn khi dữ liệu bị ẩn/hết chỗ; không lặp lại cùng ID để lấp khoảng trống.

Nguồn: https://xaydungchinhsach.chinhphu.vn/quoc-hoi-thong-qua-nghi-quyet-sap-xep-don-vi-hanh-chinh-cap-tinh-119250612101356465.htm
