# API Specification: Tạo Chuyến xe mới (Create Trip)

- **HTTP Method**: `POST`
- **Endpoint Gateway**: `/api/v1/trips`
- **Endpoint Backend**: `/trips`
- **Quyền truy cập (Role)**: `HOST` / `OPERATOR` (Đã được Admin phê duyệt làm Nhà xe)
- **Mô tả**: Cho phép chủ Nhà xe lên lịch một chuyến xe mới bằng cách gán Tuyến đường (`Route`), Xe khách (`Car`), thời gian đi (`departureTime`), thời gian đến (`arrivalTime`) và giá vé cơ bản (`pricePerSeat`).

---

## 📥 Request Headers

| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | `string` | **Có** | Bearer Token của tài khoản Nhà xe (`Bearer <JWT_TOKEN>`) |
| `x-user-id` | `string` | Auto | Do API Gateway tự động giải mã từ JWT token và đính kèm |

---

## 📥 Request Body

| Field | Type | Required | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `routeId` | `string` | **Có** | UUID hợp lệ | Mã định danh của Tuyến đường (phải thuộc nhà xe và đang `ACTIVE`) |
| `carId` | `string` | **Có** | UUID hợp lệ | Mã định danh của Xe khách (phải thuộc nhà xe và đang `ACTIVE`) |
| `departureTime` | `string` | **Có** | ISO 8601 (UTC/Offset) | Thời gian xe xuất bến (phải lớn hơn thời điểm hiện tại `now()`) |
| `arrivalTime` | `string` | **Có** | ISO 8601 (UTC/Offset) | Thời gian xe đến nơi dự kiến (phải lớn hơn `departureTime`) |
| `pricePerSeat` | `number` | **Có** | Số nguyên $> 0$ | Giá vé cơ bản trên mỗi ghế ngồi (đơn vị: VNĐ, tối thiểu 10.000 đ) |

### Mẫu Request Body:
```json
{
  "routeId": "route_b1c2d3e4-f5a6-7890-abcd-1234567890ab",
  "carId": "car_9a8b7c6d-5e4f-3210-fedc-ba9876543210",
  "departureTime": "2026-09-25T08:00:00.000Z",
  "arrivalTime": "2026-09-25T14:30:00.000Z",
  "pricePerSeat": 250000
}
```

---

## 📤 Response

### 1. Thành công (HTTP 201 Created)
```json
{
  "success": true,
  "code": "CREATE_TRIP_SUCCESS",
  "message": "Lên lịch chuyến xe mới thành công!",
  "data": {
    "id": "trip_550e8400-e29b-41d4-a716-446655440000",
    "operatorId": "op_987654321_abcd",
    "routeId": "route_b1c2d3e4-f5a6-7890-abcd-1234567890ab",
    "carId": "car_9a8b7c6d-5e4f-3210-fedc-ba9876543210",
    "departureTime": "2026-09-25T08:00:00.000Z",
    "arrivalTime": "2026-09-25T14:30:00.000Z",
    "pricePerSeat": 250000,
    "status": "SCHEDULED",
    "createdAt": "2026-09-20T15:20:00.000Z",
    "updatedAt": "2026-09-20T15:20:00.000Z"
  }
}
```

### 2. Thất bại - Xe bị trùng lịch chạy (HTTP 409 Conflict)
```json
{
  "statusCode": 409,
  "message": "Xe khách đã có lịch vận hành cho một chuyến đi khác trong khoảng thời gian này. Vui lòng chọn xe khác hoặc đổi khung giờ.",
  "error": "Conflict"
}
```

### 3. Thất bại - Tuyến đường đang tạm ngừng khai thác (HTTP 400 Bad Request)
```json
{
  "statusCode": 400,
  "message": "Tuyến đường này hiện đang tạm ngừng khai thác (INACTIVE), không thể lên lịch chuyến xe mới.",
  "error": "Bad Request"
}
```

### 4. Thất bại - Xe khách đang bảo dưỡng hoặc bị khóa (HTTP 400 Bad Request)
```json
{
  "statusCode": 400,
  "message": "Xe khách này hiện không sẵn sàng hoạt động (đang bảo trì hoặc bị khóa).",
  "error": "Bad Request"
}
```

### 5. Thất bại - Thời gian chạy không hợp lệ (HTTP 400 Bad Request)
```json
{
  "statusCode": 400,
  "message": "Thời gian xuất bến phải là thời điểm trong tương lai.",
  "error": "Bad Request"
}
```
*(Hoặc: `"Thời gian đến dự kiến phải sau thời gian xuất bến."`)*

### 6. Thất bại - Không tìm thấy Tuyến đường hoặc Xe khách (HTTP 404 Not Found)
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy tuyến đường hoặc xe khách yêu cầu, hoặc tài nguyên không thuộc quyền quản lý của nhà xe.",
  "error": "Not Found"
}
```

### 7. Thất bại - Chưa được duyệt làm Nhà xe (HTTP 403 Forbidden)
```json
{
  "statusCode": 403,
  "message": "Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt.",
  "error": "Forbidden"
}
```
