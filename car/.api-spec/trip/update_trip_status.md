# API Specification: Cập nhật Trạng thái Chuyến xe (Update Trip Status)

- **HTTP Method**: `PATCH`
- **Endpoint Gateway**: `/api/v1/trips/:id/status`
- **Endpoint Backend**: `/trips/:id/status`
- **Quyền truy cập (Role)**: `HOST` / `OPERATOR` (Đã được Admin phê duyệt làm Nhà xe)
- **Mô tả**: Cho phép chủ Nhà xe cập nhật trạng thái vận hành của chuyến xe (`DEPARTED`, `COMPLETED`, hoặc `CANCELLED`). Áp dụng máy trạng thái nghiêm ngặt: **Chuyến đã xuất bến (`DEPARTED`) không được phép hủy (`CANCELLED`)**.

---

## 📥 Request Headers

| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | `string` | **Có** | Bearer Token của tài khoản Nhà xe (`Bearer <JWT_TOKEN>`) |
| `x-user-id` | `string` | Auto | Do API Gateway tự động giải mã từ JWT token và đính kèm |

---

## 📥 Path Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Có** | Mã định danh duy nhất của Chuyến xe (`Trip.id` - UUID) |

---

## 📥 Request Body

| Field | Type | Required | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Có** | `DEPARTED`, `COMPLETED`, `CANCELLED` | Trạng thái mới của chuyến xe muốn cập nhật |

### Mẫu Request Body:
```json
{
  "status": "DEPARTED"
}
```

---

## 📤 Response

### 1. Thành công (HTTP 200 OK)
```json
{
  "success": true,
  "code": "UPDATE_TRIP_STATUS_SUCCESS",
  "message": "Cập nhật trạng thái chuyến xe thành công!",
  "data": {
    "id": "trip_550e8400-e29b-41d4-a716-446655440000",
    "operatorId": "op_987654321_abcd",
    "routeId": "route_b1c2d3e4-f5a6-7890-abcd-1234567890ab",
    "carId": "car_9a8b7c6d-5e4f-3210-fedc-ba9876543210",
    "departureTime": "2026-09-25T08:00:00.000Z",
    "arrivalTime": "2026-09-25T14:30:00.000Z",
    "pricePerSeat": 250000,
    "status": "DEPARTED",
    "createdAt": "2026-09-20T15:20:00.000Z",
    "updatedAt": "2026-09-20T16:00:00.000Z"
  }
}
```

### 2. Thất bại - Cố gắng hủy chuyến xe đã xuất bến (HTTP 400 Bad Request)
```json
{
  "statusCode": 400,
  "message": "Chuyến xe đã xuất bến và đang trong hành trình di chuyển, không thể hủy chuyến.",
  "error": "Bad Request"
}
```

### 3. Thất bại - Trạng thái chuyển đổi không hợp lệ hoặc đã ở trạng thái yêu cầu (HTTP 400 Bad Request)
```json
{
  "statusCode": 400,
  "message": "Chuyến xe hiện đã ở trạng thái DEPARTED trước đó.",
  "error": "Bad Request"
}
```
*(Hoặc: `"Chỉ chuyến xe đang chạy (DEPARTED) mới có thể đánh dấu hoàn thành."`)*

### 4. Thất bại - Chưa được duyệt làm Nhà xe (HTTP 403 Forbidden)
```json
{
  "statusCode": 403,
  "message": "Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt.",
  "error": "Forbidden"
}
```

### 5. Thất bại - Chuyến xe không tồn tại hoặc không thuộc quyền sở hữu (HTTP 404 Not Found)
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy chuyến xe yêu cầu hoặc bạn không có quyền thao tác trên chuyến xe này.",
  "error": "Not Found"
}
```
