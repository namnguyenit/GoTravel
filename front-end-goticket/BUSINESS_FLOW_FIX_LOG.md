# Rà soát và sửa luồng nghiệp vụ GoTicket — 14/10/2026

## Cập nhật lịch chuyến và xóa tuyến — 18/10/2026

### Sửa đăng xuất, đổi tài khoản và điều hướng SSO

- [x] Gỡ đường dẫn cứng `/account/tickets` khỏi nút đăng nhập desktop. Mọi lần đăng nhập/đăng ký qua `/auth/callback`; mặc định ADMIN → `/admin`, TICKET_VENDOR → `/operator`, STAFF → `/staff/trips`, khách → `/`.
- [x] Luồng đặt vé có returnTo hợp lệ được giữ; returnTo bị kiểm tra lại theo vai trò của tài khoản mới. Không quay vào portal cũ chỉ vì URL cũ còn lưu. Đường dẫn ngoài origin và đường login/callback lặp bị loại.
- [x] Guard nhà xe không cho admin không có vai trò nhà xe vào nhầm giao diện nhà xe; admin không có assignment cũng không bị đưa sang staff portal. Tài khoản khác vào admin URL được đưa về khu vực đúng vai trò. Portal mất phiên hiển thị nút đăng nhập, không tự gọi SSO gây nháy/đăng nhập lại trong lúc logout.
- [x] AuthProvider hủy request đọc phiên đang chạy khi logout, bỏ response cũ theo generation, giữ loading đến khi điều hướng. Đổi ID/role/operator sẽ remount giao diện để bỏ state của tài khoản trước. Xóa khóa token/user/role legacy; giữ các mã lệnh nghiệp vụ đã lưu để không gây thanh toán/booking trùng.
- [x] Chỉ lấy roles từ session JWT đã được Gateway xác thực, không hợp nhất với snapshot `/me` khác phiên. Kiểm tra userId session/`me` và xác nhận lại snapshot cuối trước khi nhận hồ sơ/quyền nhà xe/assignment.
- [x] Gateway không ghi lại `access_token` khi GET session: loại race khiến response đọc phiên cũ khôi phục đăng nhập sau logout. GET chỉ bootstrap CSRF; login/refresh-roles là các đường ghi cookie phiên.
- [x] Login/logout xóa biến thể cookie host-only và domain cha ở các path legacy trước khi ghi phiên mới hoặc kết thúc phiên. Logout GoTicket đi tiếp qua `/logout` của SSO để dọn cookie host-only tại cổng auth rồi về trang công khai.
- [x] Cookie access trùng tên được chọn theo phiên còn hạn/iat mới nhất rồi vẫn xác minh chữ ký JWT; tránh cookie host-only cũ che phiên mới. Logout đặt marker HttpOnly dùng chung trong cùng domain để cookie legacy ở subdomain khác cũng không tự đăng nhập lại. Login thành công xóa marker. Gateway ghi hash token vừa logout tạm thời để chặn response refresh-roles đang chạy khôi phục cookie cũ; không lưu JWT thô.
- [x] CSRF vẫn yêu cầu origin hợp lệ + HMAC theo access cookie. Chấp nhận đúng cookie CSRF trong trường hợp có cookie trùng tên khác scope; client ưu tiên token bootstrap từ header và chỉ retry một lần với lỗi INVALID_CSRF_TOKEN bị chặn trước business handler. Không retry giao dịch do timeout/5xx.
- [x] Vite proxy của GoTicket và SSO chuyển tiếp host cho Gateway xác định đúng domain cookie khi GET không có Origin/Referer. SSO chờ kiểm tra phiên trước khi cho submit và bỏ response cũ khi unmount; không tự trả về callback khi người dùng bấm đóng form.
- [x] Đồng bộ tab cùng origin qua BroadcastChannel, các subdomain qua cookie server và refresh khi focus/pageshow. BroadcastChannel không được coi là cơ chế xuyên domain.
- [x] Build GoTicket/SSO thành công, kiểm tra cú pháp ba file JS Gateway bằng `node --check`, restart `gocar-frontend`, `auth-frontend`, `gostay-gateway`. Cả ba PM2 online, log khởi động và cổng 3334/3335/5555 xác nhận đang chạy. Không chạy test hay đăng nhập bằng tài khoản thật. Không cần migration database hay rebuild Java/GoCar cho lượt này.

Marker logout áp dụng trong từng miền cookie (ví dụ `nonnet123.io.vn`); đây là đồng bộ phiên trình duyệt, không phải thu hồi JWT bearer trên mọi thiết bị. Cookie access chỉ được ghi khi login/refresh-roles thành công; hash token kết thúc được dùng để bỏ response refresh cũ khi logout hoặc đổi tài khoản.

### Bổ sung sau phản hồi về chuyến ngày 13 và nhãn tuyến

- [x] Đọc dữ liệu và audit: chuyến `43da4a73…` đã được đánh dấu DEPARTED rồi COMPLETED ngày 13/10; không phải worker ngày 18 tự hoàn thành. Hai tuyến trong ảnh không có chuyến ngày 18; chuyến ngày 14 đã STOP_SALE.
- [x] Giữ COMPLETED là lịch sử vận hành, hiển thị riêng “Đã ngừng bán” để không nhầm là còn bán vé. Chuyến ngày cũ có dòng “Lịch sử ngày … / Không nhận đặt vé mới”.
- [x] Nhãn tuyến ACTIVE đổi thành “Cho phép tạo chuyến”, INACTIVE thành “Đã khóa tạo chuyến”. Không tự khóa danh mục chỉ vì hôm nay chưa xếp xe (sẽ khiến nhà xe không thể tạo chuyến ngày tới).
- [x] API danh sách tuyến bổ sung số chuyến và số chuyến ON_SALE còn trước giờ đi trong ngày Việt Nam, tính từ database cho từng tuyến trên trang bằng truy vấn gộp. UI hiển thị rõ “Không có chuyến xe / Không có chuyến đang mở bán” nếu bằng 0.
- [x] Ngày trên thẻ tuyến có tiền tố “Tạo”, không gây nhầm là ngày khởi hành. Ngày/giờ thẻ chuyến và tuyến dùng múi giờ Việt Nam.
- [x] Danh sách tuyến refresh nền mỗi 30 giây và khi quay lại tab, giữ phân trang; bỏ lời hứa sai rằng chỉ mở khóa tuyến là hành khách sẽ tìm thấy chuyến.
- [x] Build backend/frontend thành công, restart `gocar-service`/`gocar-frontend`; PM2 online, Nest báo khởi động thành công, cổng 3333/3334 lắng nghe. Không có migration mới trong bản bổ sung này. Không chạy test hay gọi API nghiệp vụ.

- [x] Lịch chuyến nhà xe/nhân viên mặc định ngày hiện tại theo giờ Việt Nam. Chọn ngày để xem lịch sử hoặc lịch tương lai; không tải tất cả ngày vào trang lịch nhà xe.
- [x] Đổi ngày áp dụng ngay, về trang 1. Nút Hôm nay quay về ngày hiện tại; Đặt lại cũng về hôm nay. Filter lưu trong URL, có thể quay lại bằng Back/Forward.
- [x] KPI theo ngày đang chọn. Danh sách tự cập nhật mỗi 30 giây khi đang mở và khi quay lại tab; không ghi đè bộ lọc đang nhập bằng lần tải nền.
- [x] Backend tự chuyển ON_SALE/PUBLISHING/SCHEDULED đã đến giờ khởi hành sang STOP_SALE lúc khởi động và mỗi 30 giây; API danh sách nhà xe cũng cập nhật trước khi đọc. Tăng version để đồng bộ ngừng bán sang Inventory, có audit và retry. Quote/issue/publish vẫn kiểm tra giờ tại backend, không dựa vào nhịp refresh UI.
- [x] Không tự chuyển chuyến nháp thành chuyến đã bán. Không tự hủy/hoàn tiền vé do đến giờ đi. Giữ policy cutoff 15 phút đã có cho giao dịch mới.
- [x] Bỏ nút xác nhận Xuất bến khỏi thẻ chuyến và trang vận hành. Nhãn khởi hành/ngừng bán rõ theo giờ; không mở bán lại sau giờ khởi hành.
- [x] Hoàn thành chuyến không bắt buộc đã bấm DEPARTED trước đó, nhưng chỉ được sau giờ đến dự kiến. Không tự hoàn thành/đối soát chuyến chỉ theo đồng hồ.
- [x] DELETE tuyến trở thành xóa khỏi danh mục bằng `routes.deleted_at`, status INACTIVE. Bấm lại vẫn thành công, không xóa bản ghi trip/route stop/ticket và không đổi ID lịch sử.
- [x] Tuyến đã xóa bị loại khỏi danh sách quản lý và các ô chọn tuyến. Backend chặn tạo chuyến, đổi sang tuyến đã xóa, phát hành/mở bán lại và khôi phục trạng thái tuyến qua API cũ. Publication đang dở được ngừng; chuyến đã mở bán giữ lịch và vé hiện có. Modal chi tiết lộ trình đọc qua quyền của chuyến, nên nhà xe/nhân viên vẫn xem được trạm cũ khi tuyến bị xóa.
- [x] Modal xóa giải thích đúng hậu quả. Lựa chọn tuyến cũ của form tạo chuyến được reset nếu tuyến đã bị xóa.
- [x] Build backend và frontend thành công; áp dụng riêng migration bổ sung thành công; restart `gocar-service`/`gocar-frontend`. PM2 online, log Nest khởi động thành công, cổng 3333/3334 đã lắng nghe. Không gọi API nghiệp vụ hay chạy test. Vite còn cảnh báo dung lượng bundle (không chặn build).
- [ ] Kiểm thử nghiệp vụ: không chạy theo yêu cầu chủ dự án; chủ dự án tự thử sau triển khai.

**Triển khai database:** schema hiện hữu của GoCar không có bảng `_prisma_migrations`. Vì vậy dùng Node 22 chạy `node deploy/migrate-gocar-route-archive.cjs` để áp dụng riêng SQL idempotent `20261018010000_archive_routes` (thêm cột nullable và index). Không chạy lại các migration tạo schema cũ trên database đang dùng. Sau đó `prisma generate`, build `car` và `front-end-goticket`, restart `gocar-service`/`gocar-frontend`. GoTravel không cần rebuild hay restart cho lượt này.

Các quy định xóa vĩnh viễn tuyến ở bản rà soát 14/10 bên dưới đã được thay thế bằng xóa khỏi danh mục như trên.

Phạm vi: người dùng, nhân viên, nhà xe; đối chiếu source frontend, GoCar, Cart & Order, Catalog và cấu hình Gateway. Không redesign giao diện. Theo yêu cầu chủ dự án, không chạy test hay browser automation. Chủ dự án đã xác nhận cho phép build và restart để tự kiểm tra. Các dấu tích nghiệp vụ dưới đây xác nhận đã sửa source, không xác nhận đã chạy qua nghiệp vụ trên server.

## Các lỗi đã sửa trong lượt này

### Tuyến đường và đội xe

- [x] Giữ địa chỉ/tỉnh của điểm dừng xuyên suốt tạo tuyến → DTO/mapper → danh sách → form sửa → payload cập nhật → response.
- [x] Form sửa không còn suy đoán điểm trung gian theo tên/chia đôi rồi tự đổi thứ tự tuyến; giữ thứ tự đã lưu.
- [x] Không ghép cả địa chỉ dài vào tên điểm dừng khi chọn từ danh mục, tránh vượt giới hạn tên.
- [x] Reset state/lỗi của form tuyến khi mở lại.
- [x] Endpoint đọc chi tiết tuyến có kiểm tra sở hữu, khớp `getRouteById` của frontend.
- [x] Response đổi trạng thái tuyến vẫn trả danh sách điểm dừng; không làm thẻ tuyến mất toàn bộ trạm sau tạm khóa.
- [x] Invalidate cache địa điểm khi tạo/sửa/xóa/đổi trạng thái tuyến.
- [x] Tạm khóa tuyến chỉ ngừng lên lịch mới; chuyến đã mở bán vẫn xuất hiện trong tìm kiếm theo trạng thái của chuyến, đồng nhất với quote/booking và lời giải thích trên dialog. Muốn dừng bán phải dùng STOP_SALE.
- [x] Cập nhật lại danh sách/phân trang sau mutation; xóa phần tử cuối trang sẽ quay về trang còn dữ liệu.
- [x] Lỗi xóa/đổi trạng thái hiện ngay trong dialog.
- [x] Chặn xóa/sửa lộ trình đã phát hành/hủy chuyến hoặc có vé legacy/vé mới; tránh xóa nhầm lịch sử hay lỗi FK. Chỉ tuyến chưa phát hành được xóa cùng các chuyến nháp, có lời giải thích trong xác nhận.
- [x] Đồng bộ giới hạn tạo xe với sơ đồ tối đa 100 ghế; chặn số ghế không nguyên.
- [x] Khóa submit và bỏ khoảng chờ mở lại submit sau khi tạo xe thành công.

### Điều hành chuyến và nhân viên

- [x] Trang quản lý chuyến không gọi API ghế public cho chuyến nháp/đã ngừng bán. Thêm API có xác thực `GET /api/v1/trips/:id/manage/seats`; draft không giả định đã có inventory.
- [x] Lỗi tải inventory không làm mất toàn bộ thông tin quản lý chuyến.
- [x] Giá hạng ghế khởi tạo từ hạng thực của xe; không tạo STANDARD giả cho xe chỉ có VIP.
- [x] Chặn gửi giá sai thay vì âm thầm bỏ field rồi xóa cấu hình giá.
- [x] Nút xuất bến khớp ON_SALE/STOP_SALE. Hủy chuyến dùng màn quản lý và saga có lý do, không gửi CANCELLED vào API lifecycle.
- [x] Staff có MANAGE_TRIP được gọi lifecycle; backend vẫn kiểm tra capability/phạm vi chuyến.
- [x] Link quản lý chuyến trong cổng staff trỏ đến `/staff/trips/:tripId/manage`; ẩn link đối với staff không có quyền quản lý.
- [x] Khởi tạo filter từ URL, reset filter không gọi API bằng state cũ, sort staff hoạt động, ngày lọc theo ngày Việt Nam.
- [x] Gỡ kết nối DB hardcode khỏi AuthGuard. Nhận diện assignment bằng Prisma với đúng tên cột được map (`user_id`).
- [x] Kiểm tra chủ nhà xe hoạt động trước phân quyền; assignment chỉ được lưu đúng phạm vi, rồi mới đồng bộ role Identity.
- [x] Cập nhật quyền không gửi `tripIds` sẽ giữ scope cũ; không tự mở rộng thành tất cả chuyến.
- [x] Nhà xe đình chỉ/không còn duyệt không xuất hiện trong assignment/chuyến và bị chặn authorize vận hành.
- [x] Staff thuộc nhiều nhà xe không được hợp nhất quyền của các nhà xe thành quyền của một nhà xe. Session, danh sách chuyến và read scope dùng scope đang chọn nhất quán.
- [x] Session nhà xe không bị assignment staff ghi đè operatorId của chủ nhà xe.
- [x] Hàng đợi QR offline theo tài khoản; response manifest cũ không ghi đè chuyến vừa chọn.

### Ca tiền mặt và quầy bán vé

- [x] Bổ sung alias mở ca `POST .../cash/shifts/open` mà frontend gọi; giữ endpoint cũ.
- [x] Bổ sung `GET .../cash/shifts/active/detail`, đọc ca thực đang mở của actor.
- [x] Tách quyền mở ca SELL_CASH và đóng ca CLOSE_SHIFT; frontend không cho thao tác sai quyền.
- [x] Số tiền kiểm đếm gửi dạng chuỗi và giá trị 0 không bị fallback sang tổng thu.
- [x] Quầy dùng pickupAllowed/dropoffAllowed và thứ tự lộ trình, không lọc chỉ bằng trường `type` thiếu trong response.
- [x] Khôi phục đơn CASH_PENDING sau reload từ server, không để mất đường nhận tiền/hủy giữ chỗ.
- [x] Sau nhận tiền, cập nhật tiếp trạng thái phát vé; không giả định đã phát vé ngay khi có biên nhận.
- [x] Số tiền nhận lấy từ đơn server, ưu tiên giá trị tiền chính xác dạng chuỗi; không lấy tổng tạm tính client khi server thiếu tiền.
- [x] Lỗi refetch ghế sau thu tiền/hủy hold không báo mutation đã thất bại.
- [x] Email tại quầy có thể để trống. Không tự điền email giả. Checkout trực tuyến vẫn bắt buộc email hợp lệ ở backend.

### Người dùng

- [x] Lọc khung giờ chạy ở backend trước phân trang, không lọc một trang đã tải ở client.
- [x] Tab vé của tôi gửi nhóm status vào backend trước phân trang; không hiển thị count của trang hiện tại như count toàn hệ thống.
- [x] Phân biệt CASH_PENDING, trạng thái đã nhận tiền/chờ phát vé, hủy/hoàn tiền; không cho trả GoPay cho đơn CASH.
- [x] Countdown theo expiresAt thực, hết giờ refetch trạng thái server; không chỉ trừ số giây khi tab có thể bị treo.
- [x] Mọi form hành khách dùng quyền điểm dừng và thứ tự server, không suy đoán điểm đón/trả theo tên tỉnh hay chia đôi danh sách.
- [x] Kiểm tra điểm trả phải sau điểm đón ở checkout, quầy, amend và exchange.
- [x] Checkout/đổi/sửa vé giữ mã yêu cầu và fingerprint qua timeout/reload. Thay payload khi yêu cầu trước chưa rõ kết quả bị chặn, không tự tạo ID mới.
- [x] Khi exchange đã tạo operation mà còn chờ tiền, chuyển đến operation progress để thanh toán; lỗi portal không tạo exchange thứ hai.
- [x] Có thể chọn ghế mới trên chính chuyến hiện tại trong luồng đổi vé; không loại cả chuyến hiện tại khỏi tìm kiếm.
- [x] Xóa lựa chọn/preview cũ khi đổi ngày/chuyến; preview phải khớp request lúc xác nhận.
- [x] Đường đọc lộ trình của chủ vé qua Cart → GoCar độc lập trạng thái catalog/public sale, dùng cho amend/exchange. Quyền sở hữu order và item được kiểm tra ở Cart; GoCar kiểm tra trip thuộc order đã phát vé.
- [x] API gửi lại email đúng `.../ticket-email/resend`.
- [x] API đánh giá đúng `/api/v1/catalog/reviews`; bỏ field không thuộc DTO.
- [x] Link đơn trong email đúng `/account/orders/:id`.
- [x] Không cho action sửa/đổi/hủy của item chưa có ticket hoặc đã qua giờ khởi hành dựa trên dữ liệu hiện có; backend tiếp tục là nơi quyết định chính sách.
- [x] Các hooks search capsule đứng trước conditional return, tránh lỗi thứ tự hook khi đổi biến thể.

### Nội dung mở bán nhà xe

- [x] Nội dung offer đi qua prefix Gateway đã có `/api/v1/catalog/host/transport/offers/...`; backend giữ đường cũ và thêm alias mới.
- [x] Thêm GET đọc nội dung có kiểm tra sở hữu để form không mở với dữ liệu trống rồi ghi đè nội dung đang có.
- [x] Save bị khóa nếu chưa đọc nội dung thành công. Copy thành công nói rõ nội dung active phải chờ duyệt lại.

## Source cần build khi bắt đầu triển khai bản sửa

1. `car` (NestJS): route, staff authorization, managed seats và itinerary nội bộ.
2. `CartandOrder` (Spring): cash shift endpoints, itinerary của chủ vé, email tại quầy, link email.
3. `CatalogandListing` (Spring): đọc nội dung và alias qua Gateway.
4. `front-end-goticket`: tất cả phần nối luồng ở trên.

Không có migration database mới trong lượt này. Không thay đổi cấu hình Gateway đang lưu trong SQLite; dùng prefix đã có để nối Catalog. Không áp dụng thao tác thu tiền, phát vé, hủy chuyến, hoàn tiền hoặc tạo dữ liệu thật khi rà source.

## Phân biệt giới hạn nghiệp vụ với lỗi

- Tuyến đã có lịch sử không được xóa vĩnh viễn hay thay lộ trình trên chính tuyến đó. Dùng tạm khóa để ngừng khai thác hoặc tạo tuyến mới để thay lộ trình.
- Hạng ghế phải có trong sơ đồ xe trước khi đặt giá hạng trên chuyến.
- Giữ chỗ/quote cần đủ thời gian trước giờ chạy theo policy backend; frontend không nới điều kiện này.
- Thu tiền mặt yêu cầu ca đang mở và SELL_CASH; chốt ca yêu cầu CLOSE_SHIFT.
- Vé đã check-in/đã khởi hành và operation đã commit không được ép trở về trạng thái cũ ở frontend.

## Trạng thái xác minh

- [x] Đối chiếu đường gọi frontend với controller/DTO/mapper/service/repository của các luồng nêu trên.
- [x] Rà source sau chỉnh sửa và kiểm tra diff không có lỗi whitespace.
- [x] Production build của bốn dự án: `car`, `front-end-goticket`, `CartandOrder`, `CatalogandListing`. Java dùng `-Dmaven.test.skip=true`, bỏ cả biên dịch và chạy test. Frontend có cảnh báo dung lượng bundle nhưng build thành công.
- [ ] Runtime smoke và kiểm thử nghiệp vụ (chưa chạy theo yêu cầu chủ dự án).
- [x] Deploy/restart bản sửa qua PM2: `gocar-service`, `gocar-frontend`, `gostay-cart`, `gostay-catalog`. Các tiến trình online, log xác nhận khởi động thành công và cổng 3333/3334/8084/8082 đã lắng nghe. Catalog xác nhận schema đã cập nhật, không cần migration. Không gọi API nghiệp vụ hay chạy test.

Không dùng tài liệu này để tuyên bố hệ thống không còn lỗi runtime. Build thành công không thay thế kiểm thử nghiệp vụ; phần kiểm thử được để lại theo yêu cầu chủ dự án.


## 25/10/2026 — Quyền nhà xe, hỗ trợ và tra cứu hồ sơ

### Đã sửa

- Khi quyền hiện tại từ Identity khác JWT, GoTicket gọi `POST /api/v1/auth/refresh-roles`, chỉ nhận quyền từ phiên đã ký mới, rồi kiểm tra lại cùng tài khoản. So sánh tập vai trò không phụ thuộc thứ tự trả về.
- Đồng bộ phiên khi quay lại tab và mỗi 30 giây khi trang đang hiển thị. Có nút cập nhật quyền ở màn chưa kích hoạt nhà xe.
- Cổng nhà xe kiểm tra hồ sơ vận hành; báo lỗi tải hoặc trạng thái bị ngừng riêng, có nút thử lại. Trang đăng ký chỉ xem 404 là chưa có hồ sơ, không nuốt mọi lỗi thành đăng ký mới.
- Trang khiếu nại cho chọn đơn vé của chính khách, tìm đơn theo mã/tên chuyến, phân trang và kiểm tra điều kiện trước khi gửi. Link từ chi tiết vé chọn sẵn đúng đơn.
- Lịch sử khiếu nại có tìm kiếm, bộ lọc trạng thái, phân trang trên server và sắp xếp mới nhất trước. Phân biệt lỗi gửi phiếu với lỗi tải danh sách; chống bấm gửi trùng.
- Admin tìm phiếu theo đơn, nội dung, tên/email khách; tìm khoản hoàn toàn đơn và ngoại lệ từng vé. Ngoại lệ từng vé có endpoint phân trang mới `/api/v1/orders/transport/admin/item-operations/attention/page`; endpoint cũ vẫn giữ cho bên gọi hiện có.
- Vé chờ hoàn có nhãn riêng, hiện tiền đã hoàn; hủy vé có đường dẫn theo dõi tiến trình. Polling tiến trình không tháo cả trang và hộp thoại. Bỏ nội dung hứa tự động hoàn qua ngân hàng vì hệ thống đang ghi nhận chứng từ thực tế.
- Bổ sung tìm kiếm cho vé của khách, điểm đón trả (kèm phân trang/trạng thái), nhân viên đã phân công, bài đăng bán vé và tài khoản Admin.
- Tìm kiếm hồ sơ KYC nhà xe chạy trên server trước phân trang; hồ sơ và tài khoản mới nhất hiển thị trước, có khóa phụ để thứ tự ổn định.

### Phạm vi và triển khai

- Thay đổi frontend GoTicket, backend Cart & Order và Identity. Không cần migration mới.
- Maven đóng gói bằng `-Dmaven.test.skip=true`; frontend build bằng TypeScript/Vite. Không chạy unit/integration/E2E, không tạo giao dịch thử hay thay đổi dữ liệu tiền/quyền trong database.
- Backup nguồn GoTicket/Cart, nguồn UserService Identity và các JAR cũ: `.release-backups/goticket-access-support-20261025/`.
- Khiếu nại vẫn là phiếu hỗ trợ; đóng phiếu không tự hủy vé hoặc tự chuyển tiền. Hoàn toàn đơn và hoàn từng vé tiếp tục dùng đúng nghĩa vụ và chứng từ riêng.
- Cần người dùng kiểm tra thao tác thực tế sau triển khai; build và log khởi động không thay thế xác nhận nghiệp vụ đầu cuối.
