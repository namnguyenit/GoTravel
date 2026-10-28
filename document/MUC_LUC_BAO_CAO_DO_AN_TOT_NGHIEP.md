# MỤC LỤC BÁO CÁO ĐỒ ÁN TỐT NGHIỆP — HỆ SINH THÁI GOTRAVEL VÀ GOTICKET

**Phần đầu báo cáo**

- Trang bìa và trang phụ bìa
- Nhiệm vụ đồ án tốt nghiệp
- Lời cam đoan
- Lời cảm ơn
- Tóm tắt đồ án bằng tiếng Việt
- Tóm tắt đồ án bằng tiếng Anh
- Mục lục
- Danh mục hình và sơ đồ
- Danh mục bảng biểu
- Danh mục từ viết tắt

## Chương 1. Mở đầu

### 1.1. Bối cảnh và lý do chọn đề tài
#### 1.1.1. Nhu cầu đặt dịch vụ du lịch và vé xe trực tuyến
#### 1.1.2. Hạn chế của việc sử dụng các nền tảng riêng lẻ
#### 1.1.3. Định hướng xây dựng hệ sinh thái GoTravel và GoTicket

### 1.2. Mục tiêu của đề tài
#### 1.2.1. Mục tiêu tổng quát
#### 1.2.2. Mục tiêu nghiệp vụ và trải nghiệm người dùng
#### 1.2.3. Mục tiêu kiến trúc, tích hợp và vận hành

### 1.3. Đối tượng và phạm vi nghiên cứu
#### 1.3.1. Các nhóm người sử dụng hệ thống
#### 1.3.2. Phạm vi GoTravel: lưu trú, trải nghiệm và dịch vụ du lịch
#### 1.3.3. Phạm vi GoTicket: đặt vé và quản lý vận tải xe khách
#### 1.3.4. Phạm vi nền tảng dùng chung: GoID, GoPay và các service hỗ trợ
#### 1.3.5. Giới hạn của đồ án và phạm vi mô phỏng

### 1.4. Phương pháp thực hiện
#### 1.4.1. Khảo sát và phân tích yêu cầu
#### 1.4.2. Mô hình hóa và thiết kế hệ thống
#### 1.4.3. Xây dựng, tích hợp và đánh giá sản phẩm

### 1.5. Ý nghĩa và đóng góp của đề tài
#### 1.5.1. Giá trị ứng dụng của hệ thống
#### 1.5.2. Đóng góp về thiết kế và tích hợp các phân hệ

### 1.6. Bố cục báo cáo

## Chương 2. Cơ sở lý thuyết và công nghệ sử dụng

### 2.1. Kiến trúc ứng dụng phân tán
#### 2.1.1. Kiến trúc microservices và phân chia trách nhiệm
#### 2.1.2. API Gateway và giao tiếp REST giữa các service
#### 2.1.3. Phân lớp ứng dụng và tổ chức mã nguồn

### 2.2. Quản lý định danh và bảo mật
#### 2.2.1. Đăng nhập một lần SSO và quản lý phiên
#### 2.2.2. JWT, cookie HttpOnly và bảo vệ CSRF
#### 2.2.3. Phân quyền theo vai trò, năng lực và quyền sở hữu tài nguyên
#### 2.2.4. Xác thực giao tiếp nội bộ giữa các service

### 2.3. Giao dịch và tính nhất quán dữ liệu
#### 2.3.1. Giao dịch cục bộ và kiểm soát truy cập đồng thời
#### 2.3.2. Giữ chỗ có thời hạn và chống bán vượt tồn
#### 2.3.3. Điều phối nghiệp vụ nhiều service và xử lý bù
#### 2.3.4. Idempotency, retry và xử lý yêu cầu trùng lặp
#### 2.3.5. Outbox, tác vụ nền và cơ chế đối soát

### 2.4. Công nghệ frontend
#### 2.4.1. React, TypeScript và Vite
#### 2.4.2. Next.js và mô hình kết xuất giao diện
#### 2.4.3. Hệ thống giao diện, responsive và khả năng tiếp cận

### 2.5. Công nghệ backend và lưu trữ
#### 2.5.1. Java và Spring Boot
#### 2.5.2. Node.js, Express và NestJS
#### 2.5.3. PostgreSQL và SQLite
#### 2.5.4. ORM, JPA và Prisma
#### 2.5.5. Redis và bộ nhớ đệm

### 2.6. Công nghệ và dịch vụ tích hợp
#### 2.6.1. Cổng thanh toán VNPAY và môi trường sandbox
#### 2.6.2. Cloudinary và xử lý ảnh
#### 2.6.3. SMTP, email thông báo và mã QR
#### 2.6.4. Geolocation và xác định tỉnh/thành phố

### 2.7. Công nghệ triển khai và quản lý mã nguồn
#### 2.7.1. Git và quản lý phiên bản
#### 2.7.2. Máy chủ Linux và quản lý tiến trình bằng PM2
#### 2.7.3. Domain, HTTPS, proxy và Cloudflare Tunnel

## Chương 3. Khảo sát và phân tích yêu cầu hệ thống

### 3.1. Khảo sát bài toán và các hệ thống tham khảo
#### 3.1.1. Bài toán kinh doanh dịch vụ du lịch
#### 3.1.2. Bài toán bán vé và vận hành nhà xe
#### 3.1.3. Các giải pháp tham khảo và tiêu chí so sánh
#### 3.1.4. Kết quả khảo sát và yêu cầu đặt ra cho đề tài

### 3.2. Xác định tác nhân và ranh giới hệ thống
#### 3.2.1. Khách truy cập và khách hàng có tài khoản
#### 3.2.2. Chủ cơ sở lưu trú và doanh nghiệp cung cấp dịch vụ
#### 3.2.3. Chủ nhà xe và nhân viên nhà xe
#### 3.2.4. Quản trị viên hệ thống
#### 3.2.5. Các hệ thống và nhà cung cấp bên ngoài
#### 3.2.6. Sơ đồ ngữ cảnh của toàn hệ sinh thái

### 3.3. Yêu cầu chức năng của GoTravel
#### 3.3.1. Khám phá, tìm kiếm và xem thông tin dịch vụ
#### 3.3.2. Giỏ hàng, đặt dịch vụ và quản lý đơn hàng
#### 3.3.3. Đánh giá, khiếu nại và yêu cầu hỗ trợ
#### 3.3.4. Quản lý hồ sơ, nội dung và khả dụng của đối tác
#### 3.3.5. Quản lý tổ hợp du lịch, địa điểm và gợi ý liên quan
#### 3.3.6. Chức năng quản trị đối tác và nội dung GoTravel

### 3.4. Yêu cầu chức năng của GoTicket
#### 3.4.1. Tìm chuyến, chọn ghế và đặt vé
#### 3.4.2. Quản lý vé, đổi vé, hủy vé và yêu cầu hoàn tiền
#### 3.4.3. Đăng ký nhà xe và xét duyệt hồ sơ
#### 3.4.4. Quản lý đội xe, sơ đồ ghế, tuyến và lịch trình
#### 3.4.5. Quản lý nhân viên và phân công chuyến
#### 3.4.6. Bán vé tại quầy và soát vé lên xe
#### 3.4.7. Báo cáo doanh số, hoa hồng và quyết toán
#### 3.4.8. Chức năng quản trị và xử lý sự cố GoTicket

### 3.5. Yêu cầu chức năng dùng chung
#### 3.5.1. Đăng ký, đăng nhập, đăng xuất và quản lý tài khoản
#### 3.5.2. Thanh toán tập trung và theo dõi giao dịch
#### 3.5.3. Tải ảnh, gửi email và thông báo nghiệp vụ
#### 3.5.4. Quản trị định tuyến và cấu hình API Gateway
#### 3.5.5. Gợi ý chuyến xe từ GoTravel sang GoTicket theo vị trí

### 3.6. Yêu cầu phi chức năng
#### 3.6.1. Bảo mật và bảo vệ dữ liệu cá nhân
#### 3.6.2. Tính đúng đắn và nhất quán của nghiệp vụ
#### 3.6.3. Hiệu năng, khả năng mở rộng và tính sẵn sàng
#### 3.6.4. Khả năng sử dụng và tương thích thiết bị
#### 3.6.5. Khả năng bảo trì, giám sát và phục hồi

### 3.7. Mô hình Use Case
#### 3.7.1. Sơ đồ Use Case tổng quan hệ sinh thái
#### 3.7.2. Sơ đồ Use Case khách hàng GoTravel
#### 3.7.3. Sơ đồ Use Case chủ cơ sở và doanh nghiệp GoTravel
#### 3.7.4. Sơ đồ Use Case khách hàng GoTicket
#### 3.7.5. Sơ đồ Use Case chủ nhà xe và nhân viên
#### 3.7.6. Sơ đồ Use Case quản trị viên
#### 3.7.7. Đặc tả các Use Case trọng tâm

## Chương 4. Phân tích và mô hình hóa nghiệp vụ

### 4.1. Quy ước và quy tắc nghiệp vụ chung
#### 4.1.1. Chủ thể thực hiện, dữ liệu đầu vào và đầu ra
#### 4.1.2. Điều kiện thực hiện và các nhánh ngoại lệ
#### 4.1.3. Quy tắc thời gian, trạng thái và tiền tệ

### 4.2. Nghiệp vụ tài khoản và đăng nhập liên ứng dụng
#### 4.2.1. Đăng ký, xác thực và khôi phục tài khoản
#### 4.2.2. Đăng nhập SSO, chuyển hướng và đồng bộ phiên
#### 4.2.3. Đăng xuất và thay đổi quyền truy cập
#### 4.2.4. Sơ đồ Activity của luồng tài khoản và SSO

### 4.3. Nghiệp vụ đăng ký và quản lý đối tác
#### 4.3.1. Đăng ký chủ cơ sở và doanh nghiệp GoTravel
#### 4.3.2. Đăng ký nhà xe, tải logo và nộp hồ sơ KYC
#### 4.3.3. Xét duyệt, từ chối và bổ sung hồ sơ
#### 4.3.4. Cấp quyền và đồng bộ hồ sơ sang phân hệ nghiệp vụ
#### 4.3.5. Sơ đồ Activity của luồng xét duyệt đối tác

### 4.4. Nghiệp vụ đặt dịch vụ GoTravel
#### 4.4.1. Công bố dịch vụ và quản lý lịch khả dụng
#### 4.4.2. Tìm kiếm, chọn ngày, khung giờ và số lượng
#### 4.4.3. Giỏ hàng và đơn hàng nhiều sản phẩm
#### 4.4.4. Kiểm tra tồn, giữ chỗ và xác nhận đặt dịch vụ
#### 4.4.5. Quản lý đơn, đánh giá và xử lý yêu cầu sau bán
#### 4.4.6. Sơ đồ Activity của luồng đặt dịch vụ

### 4.5. Nghiệp vụ vận hành nhà xe GoTicket
#### 4.5.1. Quản lý xe, tầng, sơ đồ ghế và hạng ghế
#### 4.5.2. Quản lý điểm đón/trả và tuyến đường
#### 4.5.3. Tạo chuyến, công bố và đồng bộ tồn ghế
#### 4.5.4. Mở bán, ngừng bán và quản lý chuyến theo ngày
#### 4.5.5. Phân công nhân viên và kiểm soát quyền thao tác
#### 4.5.6. Ngừng sử dụng xe/tuyến và bảo toàn lịch sử
#### 4.5.7. Sơ đồ Activity của luồng chuẩn bị và vận hành chuyến

### 4.6. Nghiệp vụ đặt và sử dụng vé GoTicket
#### 4.6.1. Tìm chuyến và tra cứu tình trạng ghế
#### 4.6.2. Giữ ghế có thời hạn và chống đặt trùng
#### 4.6.3. Nhập thông tin hành khách và tạo đơn vé
#### 4.6.4. Thanh toán, chốt ghế và phát hành vé điện tử
#### 4.6.5. Hết hạn giữ ghế và xử lý thanh toán đến muộn
#### 4.6.6. Bán vé tại quầy và ghi nhận tiền mặt
#### 4.6.7. Quét QR, kiểm tra vé và xác nhận lên xe
#### 4.6.8. Sơ đồ Activity của đặt vé, bán tại quầy và soát vé

### 4.7. Nghiệp vụ thanh toán và xử lý sau bán
#### 4.7.1. Khởi tạo phiên GoPay và tiếp nhận kết quả thanh toán
#### 4.7.2. Xử lý Return, IPN và thông báo thanh toán trùng lặp
#### 4.7.3. Đổi vé và xử lý chênh lệch giá
#### 4.7.4. Hủy từng vé, hủy đơn và hủy chuyến
#### 4.7.5. Khiếu nại, xét yêu cầu và xác định nghĩa vụ hoàn tiền
#### 4.7.6. Hoàn tiền toàn đơn và hoàn tiền từng vé
#### 4.7.7. Ranh giới giữa giao dịch thực tế, sandbox và mô phỏng
#### 4.7.8. Sơ đồ Activity của thanh toán, đổi/hủy và hoàn tiền

### 4.8. Nghiệp vụ tài chính và xử lý sự cố
#### 4.8.1. Ghi nhận doanh số online và bán vé tiền mặt
#### 4.8.2. Tính hoa hồng, nghĩa vụ nộp và khoản được quyết toán
#### 4.8.3. Ghi nhận thanh toán quyết toán và chứng từ
#### 4.8.4. Đối soát dữ liệu giữa các service
#### 4.8.5. Gửi lại thông báo qua outbox và xử lý lỗi tác vụ nền
#### 4.8.6. Sơ đồ Activity của quyết toán và đối soát

### 4.9. Nghiệp vụ kết nối trải nghiệm GoTravel và GoTicket
#### 4.9.1. Xin quyền vị trí và xác định tỉnh của khách
#### 4.9.2. Đối chiếu tỉnh của khách với địa điểm dịch vụ
#### 4.9.3. Gợi ý chuyến xe phù hợp và chuyển sang GoTicket
#### 4.9.4. Xử lý trường hợp từ chối vị trí hoặc không có chuyến

## Chương 5. Thiết kế hệ thống

### 5.1. Thiết kế kiến trúc tổng thể
#### 5.1.1. Sơ đồ kiến trúc toàn hệ sinh thái
#### 5.1.2. Ranh giới ứng dụng và trách nhiệm từng service
#### 5.1.3. Sơ đồ thành phần và quan hệ phụ thuộc
#### 5.1.4. Luồng giao tiếp đồng bộ, tác vụ nền và thông báo

### 5.2. Thiết kế các service nghiệp vụ
#### 5.2.1. Identity/GoID và quản lý định danh
#### 5.2.2. Catalog & Listing và quản lý nội dung
#### 5.2.3. Booking & Inventory và quản lý khả dụng
#### 5.2.4. Cart & Order và điều phối đơn hàng
#### 5.2.5. Payment & Wallet/GoPay và quản lý giao dịch
#### 5.2.6. GoCar và nghiệp vụ vận tải GoTicket
#### 5.2.7. Search & Recommendation và gợi ý dịch vụ
#### 5.2.8. Media & Communication và ảnh/email
#### 5.2.9. API Gateway và cấu hình định tuyến động

### 5.3. Thiết kế cơ sở dữ liệu
#### 5.3.1. Phân chia database và quyền sở hữu dữ liệu
#### 5.3.2. ERD tài khoản, vai trò và hồ sơ đối tác
#### 5.3.3. ERD danh mục, dịch vụ, tổ hợp và đánh giá
#### 5.3.4. ERD lịch khả dụng, giữ chỗ và tồn ghế
#### 5.3.5. ERD giỏ hàng, đơn hàng, khiếu nại và đổi/hủy
#### 5.3.6. ERD thanh toán, hoàn tiền, hoa hồng và quyết toán
#### 5.3.7. ERD nhà xe, xe, tuyến, chuyến, nhân viên và vé
#### 5.3.8. Dữ liệu tìm kiếm, cache và cấu hình Gateway
#### 5.3.9. Ràng buộc, chỉ mục và liên kết logic giữa các database
#### 5.3.10. Thiết kế migration, dữ liệu mẫu và bảo toàn lịch sử

### 5.4. Thiết kế mô hình lớp
#### 5.4.1. Sơ đồ lớp nghiệp vụ GoTravel
#### 5.4.2. Sơ đồ lớp nghiệp vụ GoTicket
#### 5.4.3. Sơ đồ lớp đơn hàng, thanh toán và nghiệp vụ dùng chung
#### 5.4.4. Tổ chức controller, use case/service, repository và adapter

### 5.5. Thiết kế API và hợp đồng tích hợp
#### 5.5.1. Quy ước endpoint, dữ liệu và mã lỗi
#### 5.5.2. Nhóm API khách hàng, đối tác và quản trị GoTravel
#### 5.5.3. Nhóm API khách hàng, nhà xe, nhân viên và quản trị GoTicket
#### 5.5.4. API định danh, media và thanh toán dùng chung
#### 5.5.5. API nội bộ, callback và thông báo kết quả
#### 5.5.6. Phân trang, tìm kiếm, lọc và sắp xếp

### 5.6. Thiết kế tương tác bằng sơ đồ Sequence
#### 5.6.1. Sequence đăng nhập SSO và trở về ứng dụng
#### 5.6.2. Sequence duyệt đối tác và đồng bộ quyền/hồ sơ
#### 5.6.3. Sequence tạo đơn và giữ khả dụng GoTravel
#### 5.6.4. Sequence giữ ghế và tạo đơn vé GoTicket
#### 5.6.5. Sequence GoPay, VNPAY và xác nhận phát hành vé
#### 5.6.6. Sequence bán vé tiền mặt và soát vé
#### 5.6.7. Sequence đổi/hủy, hoàn tiền và xử lý bù
#### 5.6.8. Sequence quyết toán, đối soát và gửi lại thông báo

### 5.7. Thiết kế vòng đời bằng sơ đồ trạng thái
#### 5.7.1. Trạng thái hồ sơ đối tác và nhà xe
#### 5.7.2. Trạng thái nội dung và khả dụng dịch vụ GoTravel
#### 5.7.3. Trạng thái giữ chỗ và đơn hàng
#### 5.7.4. Trạng thái chuyến xe, ghế và vé GoTicket
#### 5.7.5. Trạng thái thanh toán và hoàn tiền
#### 5.7.6. Trạng thái khiếu nại, đổi/hủy và quyết toán

### 5.8. Thiết kế bảo mật và tính nhất quán
#### 5.8.1. Phiên SSO, cookie và quy tắc chuyển hướng
#### 5.8.2. Phân quyền, kiểm tra sở hữu và phạm vi nhà xe
#### 5.8.3. Bảo vệ API nội bộ, dữ liệu và tài liệu riêng tư
#### 5.8.4. Khóa dữ liệu, idempotency và chống thao tác trùng
#### 5.8.5. Hết hạn giữ chỗ, retry và khôi phục sau lỗi
#### 5.8.6. Audit, outbox và thiết kế đối soát

### 5.9. Thiết kế giao diện và điều hướng
#### 5.9.1. Hệ thống nhận diện và thành phần giao diện chung
#### 5.9.2. Sơ đồ điều hướng khách hàng GoTravel và GoTicket
#### 5.9.3. Giao diện chủ cơ sở và doanh nghiệp GoTravel
#### 5.9.4. Giao diện nhà xe và nhân viên GoTicket
#### 5.9.5. Giao diện quản trị và xử lý nghiệp vụ
#### 5.9.6. Giao diện GoID, GoPay và chuyển tiếp liên ứng dụng
#### 5.9.7. Responsive, trạng thái lỗi và phản hồi thao tác

### 5.10. Thiết kế triển khai
#### 5.10.1. Sơ đồ Deployment của toàn hệ thống
#### 5.10.2. Phân bố ứng dụng, service, database và cổng kết nối
#### 5.10.3. Ánh xạ domain, proxy, HTTPS và Cloudflare Tunnel
#### 5.10.4. Quản lý tiến trình, cấu hình và dữ liệu nhạy cảm
#### 5.10.5. Phương án cập nhật, sao lưu và khôi phục

## Chương 6. Xây dựng và triển khai hệ thống

### 6.1. Môi trường và tổ chức mã nguồn
#### 6.1.1. Công cụ, phiên bản và cấu hình phát triển
#### 6.1.2. Cấu trúc mã nguồn toàn dự án
#### 6.1.3. Quy trình build và cấu hình từng ứng dụng/service

### 6.2. Xây dựng nền tảng dùng chung
#### 6.2.1. GoID và chức năng quản lý tài khoản
#### 6.2.2. API Gateway và công cụ quản trị định tuyến
#### 6.2.3. GoPay và trang thanh toán tập trung
#### 6.2.4. Upload ảnh, tài liệu riêng tư và gửi email
#### 6.2.5. Tìm kiếm, gợi ý và bộ nhớ đệm

### 6.3. Xây dựng phân hệ GoTravel
#### 6.3.1. Trang chủ, tìm kiếm và chi tiết dịch vụ
#### 6.3.2. Giỏ hàng, đặt dịch vụ và quản lý đơn hàng
#### 6.3.3. Trang quản lý của chủ cơ sở và doanh nghiệp
#### 6.3.4. Trang quản trị nội dung, đối tác và nghiệp vụ
#### 6.3.5. Hình ảnh giao diện và minh họa chức năng

### 6.4. Xây dựng phân hệ GoTicket
#### 6.4.1. Tìm chuyến, chọn ghế và thanh toán vé
#### 6.4.2. Vé của khách hàng và nghiệp vụ sau bán
#### 6.4.3. Quản lý nhà xe, logo, đội xe và sơ đồ ghế
#### 6.4.4. Quản lý tuyến, lịch chuyến và nhân viên
#### 6.4.5. Bán vé tại quầy, quét QR và báo cáo doanh số
#### 6.4.6. Quản trị đơn vé, hủy chuyến, hoàn tiền và đối soát
#### 6.4.7. Hình ảnh giao diện theo từng vai trò

### 6.5. Tích hợp và xử lý các tình huống đặc biệt
#### 6.5.1. Dùng chung tài khoản và điều hướng theo vai trò
#### 6.5.2. Giữ chỗ, thanh toán và phát hành vé giữa các service
#### 6.5.3. Giữ chỗ hết hạn, lỗi thanh toán và phát hành vé thất bại
#### 6.5.4. Hoàn tiền, hoa hồng và quyết toán trong môi trường mô phỏng
#### 6.5.5. Đồng bộ tỉnh/thành và gợi ý chuyến xe từ GoTravel

### 6.6. Triển khai trên máy chủ
#### 6.6.1. Chuẩn bị database và áp dụng migration
#### 6.6.2. Cấu hình biến môi trường và kết nối dịch vụ ngoài
#### 6.6.3. Build, chạy service và quản lý bằng PM2
#### 6.6.4. Công bố ứng dụng qua domain và Cloudflare Tunnel
#### 6.6.5. Log, cập nhật phiên bản và khôi phục khi triển khai lỗi

### 6.7. Chuẩn bị dữ liệu và kịch bản trình diễn
#### 6.7.1. Tài khoản mẫu theo vai trò
#### 6.7.2. Dữ liệu dịch vụ, nhà xe, tuyến và chuyến theo ngày
#### 6.7.3. Dữ liệu đơn hàng, vé và các tình huống nghiệp vụ
#### 6.7.4. Kịch bản demo toàn bộ hệ sinh thái

## Chương 7. Kiểm thử và đánh giá hệ thống

### 7.1. Mục tiêu và phạm vi kiểm thử
#### 7.1.1. Môi trường, dữ liệu và công cụ kiểm thử
#### 7.1.2. Phương pháp kiểm thử và tiêu chí đạt
#### 7.1.3. Phân biệt kết quả đã kiểm chứng và nội dung chưa đánh giá

### 7.2. Kiểm thử định danh, phân quyền và Gateway
#### 7.2.1. Đăng ký, đăng nhập, đăng xuất và khôi phục tài khoản
#### 7.2.2. Phiên liên ứng dụng và điều hướng theo vai trò
#### 7.2.3. Truy cập sai quyền, sai chủ sở hữu và sai phạm vi nhà xe
#### 7.2.4. Định tuyến API và xác thực giao tiếp nội bộ

### 7.3. Kiểm thử nghiệp vụ GoTravel
#### 7.3.1. Tìm kiếm, lọc và xem thông tin dịch vụ
#### 7.3.2. Lịch khả dụng, giỏ hàng và đặt nhiều sản phẩm
#### 7.3.3. Thanh toán, đơn hàng và yêu cầu sau bán
#### 7.3.4. Quản lý đối tác, nội dung và quản trị

### 7.4. Kiểm thử nghiệp vụ GoTicket
#### 7.4.1. Hồ sơ nhà xe, logo và xét duyệt
#### 7.4.2. Xe, sơ đồ ghế, tuyến, chuyến và nhân viên
#### 7.4.3. Đặt ghế đồng thời và hết hạn giữ ghế
#### 7.4.4. Thanh toán, phát vé và gửi thông báo
#### 7.4.5. Bán vé tại quầy, ghi nhận tiền và soát vé
#### 7.4.6. Đổi vé, hủy vé, hủy chuyến và hoàn tiền
#### 7.4.7. Doanh số, hoa hồng, quyết toán và đối soát

### 7.5. Kiểm thử tích hợp và khả năng phục hồi
#### 7.5.1. Callback trùng, yêu cầu lặp và retry
#### 7.5.2. Service bị gián đoạn và dữ liệu chưa đồng bộ
#### 7.5.3. Outbox, tác vụ nền và đối soát sau lỗi
#### 7.5.4. Giới hạn của VNPAY sandbox và tính đúng đắn của mô phỏng
#### 7.5.5. Gợi ý chuyến liên ứng dụng và quyền vị trí

### 7.6. Đánh giá yêu cầu phi chức năng
#### 7.6.1. Hiệu năng và khả năng xử lý đồng thời
#### 7.6.2. Bảo mật và bảo vệ dữ liệu cá nhân
#### 7.6.3. Khả năng sử dụng trên máy tính và thiết bị di động
#### 7.6.4. Khả năng bảo trì, mở rộng và vận hành

### 7.7. Tổng hợp kết quả và hạn chế
#### 7.7.1. Bảng kết quả theo kịch bản kiểm thử
#### 7.7.2. Đối chiếu kết quả với yêu cầu ban đầu
#### 7.7.3. Các lỗi đã xử lý và vấn đề còn tồn tại
#### 7.7.4. Giới hạn về môi trường, dữ liệu và phạm vi đánh giá

## Chương 8. Kết luận và hướng phát triển

### 8.1. Kết quả đạt được
#### 8.1.1. Kết quả xây dựng GoTravel và GoTicket
#### 8.1.2. Kết quả tích hợp nền tảng dùng chung
#### 8.1.3. Mức độ hoàn thành các mục tiêu đề tài

### 8.2. Hạn chế của đồ án
#### 8.2.1. Hạn chế về chức năng và trải nghiệm
#### 8.2.2. Hạn chế của sandbox và các chức năng mô phỏng
#### 8.2.3. Hạn chế về kiểm thử, hiệu năng và triển khai

### 8.3. Hướng phát triển
#### 8.3.1. Hoàn thiện tích hợp thanh toán và quyết toán thực tế
#### 8.3.2. Mở rộng nghiệp vụ du lịch và vận tải
#### 8.3.3. Cải thiện tìm kiếm, gợi ý và cá nhân hóa
#### 8.3.4. Tăng cường giám sát, tự động hóa và khả năng mở rộng
#### 8.3.5. Mở rộng kiểm thử và nâng cao độ tin cậy

### 8.4. Bài học kinh nghiệm và kết luận chung

**Phần cuối báo cáo**

- Tài liệu tham khảo
- Phụ lục A. Danh mục API theo ứng dụng, service và vai trò
- Phụ lục B. Từ điển dữ liệu, bảng và trường dữ liệu
- Phụ lục C. Bộ sơ đồ UML, ERD, kiến trúc và triển khai
- Phụ lục D. Hướng dẫn cài đặt, build và vận hành hệ thống
- Phụ lục E. Hướng dẫn tạo dữ liệu mẫu và thực hiện demo
- Phụ lục F. Kịch bản, kết quả và bằng chứng kiểm thử
- Phụ lục G. Hướng dẫn sử dụng theo từng nhóm vai trò
