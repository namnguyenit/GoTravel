# Điều tra đăng nhập chậm — 05/10/2026

## Trạng thái

**Đã hoàn tất điều tra và báo cáo; chưa áp dụng thay đổi ứng dụng hoặc chuyển hash mật khẩu.** Phạm vi yêu cầu là tìm nguyên nhân và đề xuất khắc phục. Trong đợt này không restart service, không giảm mức băm, không đổi quyền SSO/cookie/CSRF, không sửa dữ liệu đặt chỗ hay thanh toán. Phép đo dùng tài khoản USER seed đã tồn tại, không dùng tài khoản khách hàng; đăng nhập hợp lệ cập nhật lastLoginAt của tài khoản thử theo hành vi bình thường.

Đã kiểm tra tài liệu trước: [báo cáo seed trước đó](GOTRAVEL_SEED_EXPANSION_2026-10-05.md) có ghi nhận một phiên 5,751 giây và sửa JIT từ tier 1 sang tier 4. Chưa có báo cáo tổng thể về độ trễ đăng nhập, nên tiến hành điều tra bổ sung. Nếu người dùng hỏi lại cùng nhiệm vụ khi kết quả này vẫn phù hợp, dùng báo cáo này và bỏ qua việc đo lại; trạng thái lưu trong [completion.json](login-latency-2026-10-05/completion.json).

## 1. Kết luận

**Nguyên nhân chính là BCrypt cost 15 quá tốn CPU đối với máy đang chạy Identity.** Tất cả 33 hash mật khẩu đang lưu trong Identity đều là BCrypt `$2a$`, cost 15. Login thực tế mất khoảng **4,78–9,67 giây**. Truy vấn tìm đúng tài khoản chỉ mất **0,103 ms** trong phép EXPLAIN, đọc hồ sơ nhanh và không có bằng chứng database là nguồn chậm nhiều giây trong các lần đo này.

**Gateway có timeout cố định 10 giây cho luồng SSO**, gần sát mức 9,5–9,7 giây đã đo. Khi CPU chậm hơn hoặc các lượt đăng nhập xếp hàng, có nguy cơ trả `502 IDENTITY_UNAVAILABLE` dù tài khoản đúng. Đây là rủi ro từ thời gian xử lý; các login hoàn tất trong đợt đo đều HTTP 200, không quan sát timeout mới.

**Chờ tải lại GoTravel tạo thêm độ trễ sau khi đã xác thực.** Trang chủ trả HTML/RSC giải nén **4.458.332 byte, khoảng 4,46 MB / 4,25 MiB**, tải lượng dữ liệu lớn và gọi các nhóm API tuần tự. Luồng đang dùng từ header chuyển sang Auth Portal, rồi chuyển lại cả trang GoTravel. Người dùng có thể cảm nhận thời gian xác thực và thời gian tải trang thành một lần “login lâu”.

**Các request `/session` lặp và việc chờ `/me` là phần phụ.** Chúng tăng số lượt mạng và thời điểm header cập nhật; không giải thích riêng phần xử lý CPU 5–10 giây tại Identity.

## 2. Phương pháp và kết quả đo

Thực hiện 37 request HTTP thành công trong bộ đo chính: đăng nhập trực tiếp Identity, qua Gateway, qua domain Auth Portal; đọc session/hồ sơ và logout; tải HTML Auth Portal/GoTravel. Login mỗi đường có 3 mẫu tuần tự trên cùng một tài khoản USER seed. Không chạy load test nhiều người dùng; không lưu password, JWT, cookie hoặc nội dung hồ sơ vào bằng chứng.

| Bước / đường gọi | Mẫu | Nhỏ nhất (s) | Trung vị (s) | Lớn nhất (s) |
| --- | ---: | ---: | ---: | ---: |
| Identity direct | 3 | 4.782 | 4.792 | 5.007 |
| Identity profile | 3 | 0.035 | 0.035 | 0.045 |
| Gateway | 3 | 4.804 | 9.484 | 9.670 |
| Gateway session | 3 | 0.021 | 0.025 | 0.046 |
| Gateway profile | 3 | 0.051 | 0.063 | 0.065 |
| Public SSO | 3 | 5.536 | 9.604 | 9.658 |
| Public SSO session | 3 | 0.104 | 0.158 | 0.178 |
| Public SSO profile | 3 | 0.118 | 0.141 | 0.152 |
| Auth portal public | 2 | 0.063 | 0.066 | 0.069 |
| GoTravel local | 2 | 2.886 | 3.833 | 4.780 |
| GoTravel public | 2 | 1.685 | 1.734 | 1.784 |

Các nhóm được đo nối tiếp ở thời điểm khác nhau. **Không lấy chênh lệch trung vị Gateway và Identity để kết luận Gateway thêm 4–5 giây**: chi phí CPU thay đổi theo thời điểm. Đã làm phép đối chiếu hai lời gọi gần nhau để kiểm tra điều này:

| Đường gọi | Thời gian thực | CPU của tiến trình Identity trong khoảng đo |
| --- | ---: | ---: |
| Gọi thẳng Identity | 9,650 s | 9,540 s |
| Qua Gateway | 9,480 s | 9,460 s |

Khi gọi thẳng cũng chậm và CPU Identity gần bằng thời gian chờ. Đây là bằng chứng phần chậm nằm trong xử lý tại Identity. Số CPU trên là tổng CPU tiến trình giữa hai snapshot, không phải trace riêng của phương thức; kết luận BCrypt là nguyên nhân chính dựa trên cả code, benchmark riêng và các đường API đối chiếu. Chưa xác định bằng profiler vì khác chủ sở hữu tiến trình; không giả định đã thu được stack/JFR.

[Bộ đo chính](login-latency-2026-10-05/live-measurements.json). [Đối chiếu CPU/Gateway](login-latency-2026-10-05/paired-measurements.json).

### Hạ tầng tại thời điểm kiểm tra

- CPU AMD A6-7310, hệ thống thấy 4 lõi; CPU đơn lõi của máy này là yếu tố cần cân nhắc khi chọn work factor.
- Identity thực tế chạy JDK 21 với `TieredStopAtLevel=4`, heap tối đa 160 MiB, Serial GC. Sửa JIT trước đó đã có hiệu lực; không còn kết luận rằng tiến trình hiện tại đang bị khóa ở tier 1.
- Load average đầu đợt khoảng 0,31; còn khoảng 3,3 GiB RAM khả dụng, VmSwap của Identity là 0. Không thấy dấu hiệu CPU toàn máy luôn bão hòa hoặc Identity đang swap trong snapshot này; snapshot không loại trừ các đợt tải khác.
- Database Identity có 33 tài khoản, có unique constraint của username trong entity. PostgreSQL dùng seq scan với bảng nhỏ và 1 trang cache trong phép đo; execution 0,103 ms. Không cần ép index hoặc tạo thêm index username để xử lý phần chậm 5–10 giây.

## 3. Chi tiết nguyên nhân và hướng khắc phục

### A. BCrypt cost 15 — ưu tiên cao nhất

[SecurityConfig.java](/home/trungcao/DoANLienNganh-devserver/Identity/src/main/java/com/gotravel/Identity/configuration/SecurityConfig.java:102) tạo `BCryptPasswordEncoder(15)`. [AuthenticationService.java](/home/trungcao/DoANLienNganh-devserver/Identity/src/main/java/com/gotravel/Identity/service/AuthenticationService.java:62) gọi `matches()` ngay trong đường login. Cost tăng theo lũy thừa; cost 15 có lượng vòng lặp gấp 8 lần cost 12.

Đã lấy **đúng thư viện spring-security-crypto 7.0.4 từ JAR đang triển khai** và chạy benchmark ngoài ứng dụng, cùng máy, JDK 21/tier 4, mật khẩu giả dùng riêng cho benchmark. Warmup 12 lần ở cost 10, sau đó 3 mẫu kiểm tra mật khẩu mỗi mức; không thay hash DB:

| Cost BCrypt | Mẫu | Trung vị thời gian thực | Trung vị CPU của thread |
| --- | ---: | ---: | ---: |
| 15 | 3 | 4.664 s | 4.662 s |
| 13 | 3 | 1.161 s | 1.160 s |
| 12 | 3 | 0.581 s | 0.581 s |
| 11 | 3 | 0.291 s | 0.291 s |

**Đề xuất thử cost 12 cho phần tạo hash mới**, cấu hình qua biến môi trường/property có validation và đo lại trong chính ứng dụng. Benchmark riêng cho thấy khoảng 0,58 giây; đây không phải cam kết endpoint login sẽ mất đúng 0,58 giây. Runtime Identity có lúc tốn CPU lâu hơn benchmark, cần kiểm chứng sau thay đổi và dưới tải dự kiến.

[Spring Security](https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html) đề nghị điều chỉnh work factor theo phần cứng để kiểm tra mật khẩu khoảng một giây. [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) nêu BCrypt tối thiểu cost 10 và nhìn chung hash nên tính dưới một giây. Cost 12 là ứng viên từ phép đo này; giảm từ 15 xuống 12 cũng giảm chi phí dò mật khẩu offline, nên phải chọn cùng chính sách bảo vệ mật khẩu, giới hạn đăng nhập và năng lực phần cứng của dự án.

#### Chuyển 33 hash cũ là phần bắt buộc của phương án

**Chỉ đổi constructor từ 15 thành 12 không làm tài khoản hiện có đăng nhập nhanh hơn.** BCrypt đọc cost từ hash đang lưu. Đã thử encoder 12 kiểm tra hash 15: vẫn mất **4,640 giây**. [AuthenticationService.java](/home/trungcao/DoANLienNganh-devserver/Identity/src/main/java/com/gotravel/Identity/service/AuthenticationService.java:67) hiện chỉ cập nhật lastLoginAt, không rehash khi đăng nhập.

Phương án cho tài khoản thực:

1. Vẫn kiểm tra hash hiện tại và trạng thái tài khoản đầy đủ.
2. Sau khi mật khẩu đúng, nếu chính sách yêu cầu chuyển, tạo hash mới bằng mật khẩu vừa nhập với salt mới/cost được cấu hình.
3. Cập nhật có điều kiện theo hash cũ hoặc optimistic version để không ghi đè một lượt đổi/reset mật khẩu đồng thời; kiểm tra lại trạng thái/roles cần dùng trước khi cấp token.
4. Đảm bảo tất cả đường đăng ký/đổi/reset mật khẩu cùng dùng chính sách mới. Lần đăng nhập chuyển đổi vẫn chịu chi phí kiểm tra hash cũ và tạo hash mới; các lần sau mới nhanh hơn.

`upgradeEncoding()` của BCrypt tự báo nâng cost khi hash cũ có cost thấp hơn target; nó không tự làm chuyển 15 xuống 12. Cần chính sách chuyển đổi rõ ràng nếu chọn hạ cost. Không sửa chuỗi cost trong hash bằng SQL, không lưu raw password để dùng lại. Với tài khoản seed có mật khẩu fixture được xác định, có thể xây dựng migration riêng giới hạn đúng các ID seed, backup và so sánh hash; không áp dụng quy tắc mật khẩu seed cho mọi tài khoản.

Nếu muốn giữ cost 15, phương án là hạ tầng có CPU đơn lõi mạnh hơn và kiểm thử lại; tăng RAM, số worker hoặc nhiều instance chỉ cải thiện một số vấn đề tải/hàng đợi, không tự làm một lượt BCrypt trên CPU hiện tại nhanh hơn.

[Bằng chứng benchmark và hash cũ](login-latency-2026-10-05/bcrypt-benchmark.json). [Mã benchmark chỉ dùng mật khẩu giả](login-latency-2026-10-05/PasswordCostProbe.java).

### B. Giữ transaction/connection khi tính BCrypt — rủi ro lúc có nhiều lượt đăng nhập

[AuthenticationService.java](/home/trungcao/DoANLienNganh-devserver/Identity/src/main/java/com/gotravel/Identity/service/AuthenticationService.java:49) đặt `@Transactional` quanh toàn bộ hàm: SELECT user → BCrypt → UPDATE lastLoginAt → tạo JWT.

Khi lấy snapshot ở giây đầu của cả hai request đối chiếu, PostgreSQL báo **`idle in transaction`, chờ `ClientRead`**, transaction gần 1 giây tuổi. Nghĩa là kết nối vẫn được giữ khi Java xử lý CPU. Đây không phải truy vấn SQL chạy lâu, nhưng nhiều lượt login đồng thời có thể chiếm pool và làm các API khác phải chờ. Chưa đo bão hòa pool hay P95 tải cao nên đây là rủi ro có bằng chứng về cách giữ kết nối, không phải kết luận đã xảy ra cạn pool.

Khắc phục: lấy snapshot xác thực tối thiểu trong transaction đọc ngắn; tính BCrypt bên ngoài transaction; dùng transaction ngắn để kiểm tra lại password/version, trạng thái và quyền, cập nhật lastLoginAt/rehash rồi cấp token. Không đổi sang cập nhật timestamp bất đồng bộ mà bỏ kiểm tra việc tài khoản bị khóa hoặc đổi mật khẩu trong lúc đang xác thực.

### C. Timeout SSO 10 giây — cần phù hợp với ngân sách độ trễ

[session.routes.js](/home/trungcao/DoANLienNganh-devserver/APIGateway/src/gateway/session.routes.js:89) dùng `AbortSignal.timeout(10_000)`. Đường login là handler SSO riêng, được đăng ký trước luồng proxy động. **Đổi timeout của route thông thường trên Gateway Studio không đổi giá trị 10 giây này.**

Phép đo có mẫu 9,670 giây, chỉ còn khoảng 0,33 giây trước deadline. Khắc phục ưu tiên chi phí BCrypt/hàng đợi. Sau đó đưa timeout SSO thành cấu hình được kiểm tra và đo P95/P99; chỉ nới tạm deadline nếu có nhu cầu triển khai, không coi đó là biện pháp tăng tốc. Không tự retry POST login nhiều lần khi timeout vì có thể nhân tải CPU và cập nhật lastLoginAt sau khi client đã bỏ yêu cầu.

### D. Luồng frontend thêm request và chờ tải toàn bộ trang

Luồng dùng từ header hiện tại:

```mermaid
flowchart LR
  A[Nhập tài khoản trên Auth Portal] --> B[POST login qua Gateway]
  B --> C[Identity kiểm tra BCrypt]
  C --> D[Gateway đặt cookie HttpOnly]
  D --> E[Chờ chuyển hướng 400 ms]
  E --> F[Tải lại trang GoTravel]
  F --> G[Đọc session và hồ sơ]
```

- [MainLayoutClient.tsx](/home/trungcao/DoANLienNganh-devserver/front_end/src/features/app/components/MainLayoutClient.tsx:308) chuyển sang Auth Portal. Sau login, [App.tsx](/home/trungcao/DoANLienNganh-devserver/auth_front-end/src/App.tsx:134) chờ cố định 400 ms rồi `location.replace()` về trang trước.
- Khi GoTravel mount, [MainLayoutClient.tsx](/home/trungcao/DoANLienNganh-devserver/front_end/src/features/app/components/MainLayoutClient.tsx:221) gọi `getSession()`, sau đó `fetchCurrentUser()` lại gọi `getSession()` trước `/me`. Hai kiểm tra session tuần tự trong cùng quá trình khởi tạo.
- Với đường AuthModal còn trong source, [auth.service.ts](/home/trungcao/DoANLienNganh-devserver/front_end/src/services/auth.service.ts:30) chờ `/me` sau POST login mới trả về; [AuthModal.tsx](/home/trungcao/DoANLienNganh-devserver/front_end/src/shared/components/AuthModal.tsx:52) sau đó reload cả trang với USER hoặc điều hướng admin. Header hiện tại ưu tiên Portal, nên không coi modal là đường login chính đã đo qua public SSO.
- Các fetch ở cả client GoTravel và Auth Portal không có deadline riêng. Nếu profile/network gặp sự cố, loading hoặc cập nhật người dùng có thể kéo dài hơn dự kiến. Các mẫu profile hiện tại nhanh, không tái hiện sự cố treo profile.

Khắc phục: có một bước bootstrap session/profile dùng chung và chống gọi trùng; sau khi Gateway xác nhận tạo phiên, cập nhật trạng thái xác thực, tải hồ sơ với trạng thái riêng và deadline hợp lý. Với login tại chỗ, cập nhật context/cache thay reload toàn bộ trang. Với Portal, giảm hoặc bỏ 400 ms nếu không cần và tối ưu trang đích. Không dùng dữ liệu localStorage làm căn cứ cấp quyền backend; giữ JWT/cookie HttpOnly/CSRF và kiểm tra trạng thái tài khoản.

### E. Trang chủ nặng — cần giảm dữ liệu tải sau đăng nhập

[page.tsx](/home/trungcao/DoANLienNganh-devserver/front_end/src/app/(main)/page.tsx:109) gọi **5 nhóm API tuần tự**: landmarks, EXP, STAY, SVC, complexes. Cấu hình getAll yêu cầu 500 listing mỗi loại và 200 complex; API landmarks hiện có 228 bản ghi. Sau đó truyền các mảng vào Client Provider và render toàn bộ 228 thẻ landmark, dù các hàng theo tỉnh chỉ hiển thị một phần dữ liệu.

HTML/RSC hiện khoảng **4,46 MB sau giải nén**, có **368 img tag / 223 src ảnh riêng**. Thời gian đọc xong response body trong phép đo là 1,69–1,78 giây qua public và 2,89–4,78 giây tại localhost; TTFB nhỏ hơn nhiều nhờ streaming. Độ trễ từng lần có thể khác theo cache/CPU. Các con số này không phải FCP/LCP hoặc thời gian ảnh tải xong trong trình duyệt.

Khắc phục:

1. Gọi các nhóm API độc lập bằng `Promise.allSettled` để vẫn giữ fallback riêng khi một nhóm lỗi. Nguyên tắc gọi song song/streaming có trong [tài liệu Next đang cài trên server](/home/trungcao/DoANLienNganh-devserver/front_end/node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md).
2. Endpoint homepage chỉ trả các nhóm tỉnh đã chọn và 6–12 thẻ mỗi hàng, thay lấy 1.500 listing rồi bỏ bớt sau khi truyền xuống client. Giữ cách chọn nhóm đủ thẻ để không tạo lại hàng trống.
3. Dùng projection dữ liệu thẻ: ID, tên, giá, rating, tỉnh, thumbnail/gallery cần thiết; mô tả/attributes chi tiết lấy khi mở detail. Landmark đầu trang giới hạn nhóm nổi bật và phân trang phần còn lại.
4. Cache dữ liệu công khai có TTL/invalidation, tách khỏi trạng thái đăng nhập; không cache response hồ sơ/cookie cá nhân. Thêm loading boundary để header/trạng thái login không phải chờ dữ liệu du lịch.
5. Kiểm tra kích thước/transform Cloudinary phù hợp thẻ, lazy loading; dùng HAR/LCP thực tế sau sửa. Đợt này chưa có browser trace, không khẳng định toàn bộ ảnh là yếu tố lớn nhất.

[Bằng chứng kích thước trang](login-latency-2026-10-05/frontend-payload.json).

## 4. Thứ tự triển khai đề xuất

| Ưu tiên | Công việc | Kết quả cần đạt |
| --- | --- | --- |
| 1 | Cấu hình BCrypt theo benchmark, bắt đầu đánh giá cost 12; thiết kế migration hash cũ | Giảm phần CPU xác thực, cả tài khoản cũ được chuyển đúng |
| 2 | Bootstrap session/profile một lần; trạng thái login rõ và deadline từng request | Giảm lượt mạng, không giữ spinner vì profile phụ |
| 3 | Homepage payload nhỏ, API độc lập chạy song song, giảm reload | Giảm thời gian người dùng chờ sau khi đã đăng nhập |
| 4 | Tách transaction khỏi BCrypt, giới hạn concurrency/hàng đợi xác thực có kiểm soát | Bảo vệ DB pool và tránh nhiều request làm chậm nhau |
| 5 | Cấu hình deadline SSO và metrics theo ngân sách độ trễ | Phân biệt lỗi password, timeout Identity và lỗi mạng |

Mục tiêu kiểm chứng sau sửa: mật khẩu mới/hash đã chuyển có độ trễ kiểm tra khoảng 0,5–1 giây theo phần cứng; login API P95 dưới 2 giây ở mức tải thực tế đã thống nhất, và UI xác nhận phiên ngay khi API thành công. Đây là mục tiêu, chưa phải kết quả đã đạt. Với tải lớn hơn hoặc CPU biến động, cần cân đối work factor và hạ tầng.

## 5. Kiểm tra bắt buộc khi áp dụng sửa

- Đăng nhập đúng/sai, tài khoản bị khóa/xóa, USER/HOST/ENTERPRISE/ADMIN/TICKET_VENDOR và approval vẫn được kiểm tra đúng.
- Kiểm tra hash 15 cũ, hash theo chính sách mới, login đầu chuyển đổi và login tiếp theo; không mất quyền hoặc đổi mật khẩu ngoài ý muốn.
- Chạy đồng thời đổi/reset password và login, bảo đảm không ghi đè mật khẩu mới bằng rehash từ snapshot cũ.
- Cookie HttpOnly/Secure/SameSite, CSRF, logout và thời hạn phiên vẫn giữ; không đưa JWT vào JSON/localStorage để tăng tốc.
- Đo riêng thời gian tìm user, verify password, cập nhật trạng thái, ký JWT, Gateway và bootstrap frontend. Metrics chỉ chứa tên bước, trạng thái và thời gian, không có mật khẩu/token/hồ sơ.
- Đo lạnh/ấm và lượng login đồng thời vừa phải trong môi trường thử; theo dõi connection pool/CPU trước khi nhận xét P95/P99 hoặc tăng công suất server.

## 6. Giới hạn của kết luận

Đây là đo HTTP từ chính server, không phải bấm đăng nhập trên mạng của người dùng. Phần public đi qua HTTPS/domain đang dùng, nhưng độ trễ từ máy người dùng, DNS mới, tải JavaScript, giải mã ảnh, render/hydration và LCP chưa được đo. Benchmark BCrypt chạy ở JVM riêng, không phải instrumentation trực tiếp của Spring endpoint. Không cộng các trung vị đo ở thời điểm khác nhau để gọi là thời gian click-to-ready chính xác.

Chưa thay đổi/redeploy ứng dụng trong nhiệm vụ này. Hướng khắc phục đã đủ cụ thể để triển khai tiếp và kiểm chứng; báo cáo không tuyên bố lỗi chậm đã được sửa.
