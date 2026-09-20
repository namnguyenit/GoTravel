# API Specification: Khóa / Mở khóa Tuyến đường (Toggle Route Status)

- **HTTP Method**: `PATCH`
- **Endpoint Gateway**: `/api/v1/routes/:id/status`
- **Endpoint Backend**: `/routes/:id/status`
- **Quyền truy cập (Role)**: `HOST` / `OPERATOR` (Đã được Admin phê duyệt làm Nhà xe)
- **Mô tả**: Cho phép chủ Nhà xe thay đổi trạng thái hoạt động của tuyến đường (`ACTIVE` ➔ `INACTIVE` hoặc ngược lại), dùng để tạm ngừng khai thác tuyến hoặc kích hoạt lại tuyến theo nhu cầu.

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
| `id` | `string` | **Có** | Mã định danh duy nhất của Tuyến đường (`Route.id`) |

---

## 📥 Request Body

| Field | Type | Required | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Có** | `ACTIVE`, `INACTIVE` | Trạng thái mới của tuyến đường muốn cập nhật |

### Mẫu Request Body:
```json
{
  "status": "INACTIVE"
}
```

---

## 📤 Response

### 1. Thành công - Khóa tuyến thành công (HTTP 200 OK)
```json
{
  "success": true,
  "code": "UPDATE_ROUTE_STATUS_SUCCESS",
  "message": "Cập nhật trạng thái tuyến đường thành công!",
  "data": {
    "id": "route_b1c2d3e4-f5a6-7890-abcd-1234567890ab",
    "operatorId": "op_987654321_abcd",
    "origin": "Hồ Chí Minh",
    "destination": "Đà Lạt",
    "status": "INACTIVE",
    "createdAt": "2026-09-20T14:00:00.000Z",
    "updatedAt": "2026-09-20T15:30:00.000Z"
  }
}
```

### 2. Thất bại - Trạng thái không đổi / Đã ở trạng thái yêu cầu (HTTP 400 Bad Request)
```json
{
  "statusCode": 400,
  "message": "Tuyến đường này hiện đã bị khóa trước đó.",
  "error": "Bad Request"
}
```

### 3. Thất bại - Giá trị status không hợp lệ (HTTP 400 Bad Request)
```json
{
  "statusCode": 400,
  "message": [
    "Trạng thái tuyến đường phải là ACTIVE hoặc INACTIVE."
  ],
  "error": "Bad Request"
}
```

### 4. Thất bại - Chưa được duyệt làm Nhà xe (HTTP 403 Forbidden)
```json
{
  "statusCode": 403,
  "message": "Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt.",
  "error": "Forbidden"
}
```

### 5. Thất bại - Tuyến không tồn tại hoặc không thuộc quyền sở hữu (HTTP 404 Not Found)
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy tuyến đường yêu cầu hoặc bạn không có quyền thao tác trên tuyến đường này.",
  "error": "Not Found"
}
```
