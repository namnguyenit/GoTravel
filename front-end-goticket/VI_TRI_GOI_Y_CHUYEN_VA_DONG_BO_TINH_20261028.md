# Vị trí, gợi ý GoTicket trong GoTravel và danh sách tỉnh

Đã triển khai ngày 28/10/2026. Giữ nguyên danh sách tỉnh và dữ liệu của GoStay/GoTravel; không chạy migration hay sửa hàng loạt tuyến/đơn/vé.

## Danh sách tỉnh chuẩn của dự án

Nguồn duy nhất: `front_end/src/shared/constants/provinces.ts` hiện có 63 tên tỉnh/thành. GoTicket sử dụng nguyên danh sách, gồm cách viết `TP. Hồ Chí Minh`.

- Dùng chung bản sao được đồng bộ cho tìm chuyến của khách, chọn tỉnh khi tạo/sửa tuyến và điểm đón/trả, và đối chiếu tỉnh ở backend GoCar.
- `deploy/sync-goticket-provinces.mjs` đọc GoStay, chỉ cập nhật bản sao trong GoTicket và GoCar. Không ghi ngược vào GoStay.
- `npm run build` ở `front-end-goticket` và `car` có bước `prebuild` tự đồng bộ. Nếu dùng lệnh biên dịch riêng thay vì npm build, chạy script đồng bộ trước.
- `node deploy/sync-goticket-provinces.mjs --check` kiểm tra hai bản sao còn khớp nguồn.
- Tương thích tuyến cũ như Hồ Chí Minh/TP Hồ Chí Minh, Huế/Thừa Thiên Huế, Đà Lạt/Lâm Đồng, Nha Trang/Khánh Hòa. Không đổi tên tuyến hoặc snapshot đã bán. Ưu tiên tên tỉnh/địa danh của tuyến; trường tỉnh của trạm đầu/cuối dùng khi tên tuyến không xác định được tỉnh.
- Đây là đồng bộ theo dữ liệu GoStay của dự án, không thay danh sách của GoStay bằng một danh sách hành chính khác.

## Xin quyền vị trí

Hai frontend dùng `ClientLocationProvider` ở layout khách hàng, giữ trạng thái khi chuyển trang trong ứng dụng.

- Khi vào trang khách hàng, trình duyệt tự xin quyền vị trí nếu chưa có quyết định; không cần nút riêng.
- Cho phép: lấy vị trí thiết bị, gọi BigDataCloud từ trình duyệt để xác định tỉnh, rồi chỉ dùng tên tỉnh trong các API tìm chuyến.
- Từ chối, không hỗ trợ, không xác định được tỉnh hoặc lỗi dịch vụ vị trí: giữ trải nghiệm mặc định, không đoán vị trí theo IP.
- Chỉ tên tỉnh/thành phố được nhớ trong tab tối đa 15 phút. Không lưu tọa độ trong tài khoản/database. Dừng theo dõi khi tab ẩn; tiếp tục khi quay lại; giới hạn tần suất tra vị trí.
- Thu hồi quyền trong cài đặt trình duyệt: ngừng theo dõi, xóa tỉnh đã nhớ và ẩn gợi ý.
- Quyền là quyền trình duyệt theo từng origin/subdomain, độc lập với cookie đăng nhập SSO. Cho phép GoStay không tự cấp quyền trình duyệt cho subdomain GoTicket.
- Phần giải thích dịch vụ định vị nằm trong `/privacy` của GoTravel. Không còn banner BigDataCloud, đoạn “Đang hiển thị tất cả chuyến…” hoặc nút “Dùng vị trí của tôi” trên GoTicket.

Tài liệu nhà cung cấp: https://www.bigdatacloud.com/docs/free-api/free-reverse-geocode-to-city-api — dùng vị trí hiện tại, gọi từ trình duyệt; không gọi endpoint miễn phí từ server hoặc gửi tọa độ demo ra dịch vụ thật.

## GoTicket

Vào Khám phá chưa tìm kiếm: nếu xác định được tỉnh, ưu tiên chuyến từ tỉnh đó đi mọi nơi; không có chuyến thì trở về tất cả chuyến còn bán. Tìm kiếm điểm đi/đến do khách chọn không bị vị trí tự ghi đè. Hộp chọn tỉnh không còn phụ thuộc vào việc đã có tuyến đang bán hay chưa.

## GoTravel

Ở trang chi tiết nơi lưu trú, trải nghiệm và dịch vụ dùng `CategoryDetailScreen`, thêm phần **Đến đây cùng GoTicket** phía trên **Các lựa chọn quanh khu vực**.

Chỉ hiển thị khi:

1. Khách cho phép vị trí và xác định được tỉnh theo danh sách GoStay.
2. Tỉnh của khách khác tỉnh dịch vụ đang xem.
3. Có chuyến đi đúng chiều giữa hai tỉnh, nhà xe/xe/tuyến đủ điều kiện bán, tồn kho đã đồng bộ và Inventory xác nhận còn ghế.

Hiện tối đa 3 chuyến sớm nhất tìm được còn ghế, kèm giờ, ngày, nhà xe, giá từ hạng ghế rẻ nhất. Nhấn chuyến mở trang chi tiết GoTicket ở tab mới; không tự đặt/giữ ghế hoặc thanh toán. Bản đồ và các gợi ý dịch vụ hiện tại của GoTravel giữ nguyên.

Không cùng điều kiện hoặc API lỗi: không hiện phần gợi ý/khung trống; danh sách dịch vụ quanh khu vực vẫn hoạt động. Dữ liệu gợi ý được làm mới khoảng mỗi phút khi tab đang mở.

## API và nơi sửa

- Dùng API công khai sẵn có `GET /api/v1/trips/search` qua Gateway của GoTravel.
- Thêm `originRegion` và `destinationRegion` (chuỗi tối đa 120 ký tự); gợi ý gửi `discover=true` để không ép chọn ngày, tìm các chuyến tương lai.
- Ví dụ: `?discover=true&originRegion=Hà%20Nội&destinationRegion=Ninh%20Bình&limit=12`.
- Tỉnh không hợp lệ hoặc cùng tỉnh trả rỗng, không trả tất cả tuyến như một gợi ý sai. Chỉ giao diện Khám phá thông thường mới có hành vi trở lại tất cả chuyến khi tỉnh ưu tiên không có chuyến.
- Bộ lọc tỉnh thu hẹp các tuyến được Catalog cho bán; giữ kiểm tra Inventory, xe/nhà xe active, trạng thái ON_SALE và mốc ngừng nhận đặt chỗ 15 phút hiện có.
- `front_end/src/shared/components/TripTravelSuggestions.tsx`: gợi ý, hủy yêu cầu khi chuyển trang, cache ngắn và liên kết sang GoTicket.
- `front_end/src/shared/components/CategoryDetailScreen.tsx`: đặt gợi ý vào sidebar.
- Hai frontend: `src/shared/context/ClientLocationContext.tsx`, `src/shared/utils/vietnam-province.ts`.
- GoCar: DTO/input/mapper/use case tìm chuyến; repository lọc theo tỉnh; utility `trip/domain/value-object/province.ts`.

## Build, triển khai và kiểm tra giới hạn

- Build GoCar bằng TypeScript, GoTicket bằng Vite, GoTravel bằng Next.js production build. Không bỏ qua lỗi TypeScript, không chạy bộ test toàn dự án.
- Đã restart đúng ba tiến trình: `gocar-service`, `gocar-frontend`, `gostay-frontend`. Gateway, Identity, Payment, Cart và Inventory không cần restart.
- Backup source, config build và artifact trước thay đổi: `.release-backups/location-travel-20261028/`.
- API thật: Hà Nội → Ninh Bình trả 9 chuyến (trang giới hạn 3); cùng tỉnh và tỉnh không xác định trả 0; TP. Hồ Chí Minh → Đồng Nai vẫn tìm được tuyến cũ Hồ Chí Minh.
- Kiểm tra giao diện bằng vị trí giả lập trong trình duyệt, chặn và trả dữ liệu giả lập cho BigDataCloud tại máy kiểm tra; không gửi tọa độ giả ra nhà cung cấp. Chuyến xe lấy từ API và database thật, không tạo seed mới hay giữ ghế.
- Trường hợp cho phép: một lần xác định vị trí, một lần tìm chuyến, hiện đúng 3 liên kết. Cùng tỉnh: không gọi tìm chuyến. Không có tuyến: ẩn phần gợi ý. Từ chối: không gọi định vị hoặc tìm chuyến.
- Desktop/mobile không tràn ngang, không có lỗi JavaScript trong các trường hợp trên. GoTicket đã không còn nội dung/nút vị trí cũ.
- Bằng chứng local: `.data/goticket-journey-audit/20261028-location-travel/`.
