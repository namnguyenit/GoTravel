# API Specification: Tạo tuyến đường mới (Create Route)

- **HTTP Method**: `POST`
- **Endpoint Gateway**: `/api/v1/routes`
- **Endpoint Backend**: `/routes`
- **Quyền truy cập (Role)**: `HOST` / `OPERATOR` (Đã được Admin phê duyệt làm Nhà xe)
- **Mô tả**: Cho phép chủ Nhà xe tạo một tuyến đường xe khách mới kèm theo danh sách các điểm đón/trả khách dọc tuyến theo thứ tự.

---

## 📥 Request Headers

| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | `string` | **Có** | Bearer Token của tài khoản Nhà xe (`Bearer <JWT_TOKEN>`) |
| `Content-Type` | `string` | **Có** | `application/json` |
| `x-user-id` | `string` | Auto | Do API Gateway tự động giải mã từ JWT token và đính kèm |

---

## 📥 Request Body

| Field | Type | Required | Constraint | Description |
| :--- | :--- | :--- | :--- | :--- |
| `origin` | `string` | **Có** | 2 - 100 ký tự | Tỉnh / Thành phố điểm khởi hành (VD: "Hồ Chí Minh") |
| `destination` | `string` | **Có** | 2 - 100 ký tự, khác `origin` | Tỉnh / Thành phố điểm đến (VD: "Đà Lạt") |
| `stops` | `array` | **Có** | Tối thiểu 2 phần tử | Danh sách các điểm dừng đón/trả dọc tuyến |
| `stops[].name` | `string` | **Có** | 3 - 100 ký tự | Tên bến xe / trạm dừng chân |
| `stops[].order` | `number` | **Có** | Số nguyên $\ge 0$, duy nhất | Thứ tự điểm dừng trên tuyến (0, 1, 2...) |

### Mẫu Request Body JSON:
```json
{
  "origin": "Hồ Chí Minh",
  "destination": "Đà Lạt",
  "stops": [
    {
      "name": "Bến xe Miền Đông Mới",
      "order": 0
    },
    {
      "name": "Ngã tư Vũng Tàu",
      "order": 1
    },
    {
      "name": "Trạm dừng chân Định Quán",
      "order": 2
    },
    {
      "name": "Bến xe Bảo Lộc",
      "order": 3
    },
    {
      "name": "Bến xe liên tỉnh Đà Lạt",
      "order": 4
    }
  ]
}
```

---

## 📤 Response

### 1. Thành công (HTTP 201 Created)
```json
{
  "success": true,
  "code": "CREATE_ROUTE_SUCCESS",
  "message": "Tạo tuyến đường thành công!",
  "data": {
    "id": "route_b1c2d3e4-f5a6-7890-abcd-1234567890ab",
    "operatorId": "op_987654321_abcd",
    "origin": "Hồ Chí Minh",
    "destination": "Đà Lạt",
    "status": "ACTIVE",
    "stops": [
      {
        "id": "stop_11111111-2222-3333-4444-555555555551",
        "routeId": "route_b1c2d3e4-f5a6-7890-abcd-1234567890ab",
        "name": "Bến xe Miền Đông Mới",
        "order": 0,
        "createdAt": "2026-09-20T14:00:00.000Z"
      },
      {
        "id": "stop_11111111-2222-3333-4444-555555555552",
        "routeId": "route_b1c2d3e4-f5a6-7890-abcd-1234567890ab",
        "name": "Ngã tư Vũng Tàu",
        "order": 1,
        "createdAt": "2026-09-20T14:00:00.000Z"
      },
      {
        "id": "stop_11111111-2222-3333-4444-555555555553",
        "routeId": "route_b1c2d3e4-f5a6-7890-abcd-1234567890ab",
        "name": "Trạm dừng chân Định Quán",
        "order": 2,
        "createdAt": "2026-09-20T14:00:00.000Z"
      },
      {
        "id": "stop_11111111-2222-3333-4444-555555555554",
        "routeId": "route_b1c2d3e4-f5a6-7890-abcd-1234567890ab",
        "name": "Bến xe Bảo Lộc",
        "order": 3,
        "createdAt": "2026-09-20T14:00:00.000Z"
      },
      {
        "id": "stop_11111111-2222-3333-4444-555555555555",
        "routeId": "route_b1c2d3e4-f5a6-7890-abcd-1234567890ab",
        "name": "Bến xe liên tỉnh Đà Lạt",
        "order": 4,
        "createdAt": "2026-09-20T14:00:00.000Z"
      }
    ],
    "createdAt": "2026-09-20T14:00:00.000Z",
    "updatedAt": "2026-09-20T14:00:00.000Z"
  }
}
```

### 2. Thất bại - Chưa được cấp quyền Nhà xe (HTTP 403 Forbidden)
```json
{
  "statusCode": 403,
  "message": "Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt.",
  "error": "Forbidden"
}
```

### 3. Thất bại - Điểm đi trùng điểm đến hoặc dữ liệu không hợp lệ (HTTP 400 Bad Request)
```json
{
  "statusCode": 400,
  "message": [
    "Điểm khởi hành và điểm đến không được trùng nhau.",
    "Tuyến đường phải có tối thiểu 2 điểm dừng (1 điểm đón đầu tuyến và 1 điểm trả cuối tuyến)."
  ],
  "error": "Bad Request"
}
```
