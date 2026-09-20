# API Specification: Xem danh sách Tuyến đường của Nhà xe (Get Operator Routes)

- **HTTP Method**: `GET`
- **Endpoint Gateway**: `/api/v1/routes`
- **Endpoint Backend**: `/routes`
- **Quyền truy cập (Role)**: `HOST` / `OPERATOR` (Đã được Admin phê duyệt làm Nhà xe)
- **Mô tả**: Cho phép chủ Nhà xe lấy danh sách các tuyến đường thuộc quyền sở hữu của chính mình, kèm theo toàn bộ danh sách điểm dừng đón/trả (`RouteStop`) đã sắp xếp theo thứ tự `order`.

---

## 📥 Request Headers

| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | `string` | **Có** | Bearer Token của tài khoản Nhà xe (`Bearer <JWT_TOKEN>`) |
| `x-user-id` | `string` | Auto | Do API Gateway tự động giải mã từ JWT token và đính kèm |

---

## 📥 Query Parameters

| Parameter | Type | Required | Default | Allowed Values / Constraint | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `search` | `string` | Không | `null` | Chuỗi ký tự bất kỳ | Tìm kiếm tương đối theo Điểm đi (`origin`) hoặc Điểm đến (`destination`) |
| `status` | `string` | Không | `null` | `ACTIVE`, `INACTIVE` | Lọc theo trạng thái tuyến đường. Nếu bỏ trống sẽ lấy tất cả |
| `page` | `number` | Không | `1` | Số nguyên $\ge 1$ | Số trang |
| `limit` | `number` | Không | `10` | 1 - 100 | Số dòng hiển thị trên mỗi trang |
| `sortBy` | `string` | Không | `createdAt` | `createdAt`, `origin`, `destination` | Trường sắp xếp |
| `sortOrder` | `string` | Không | `desc` | `asc`, `desc` | Thứ tự sắp xếp (tăng dần / giảm dần) |

### Mẫu Request URL:
- Lấy danh sách trang đầu mặc định: `GET /api/v1/routes`
- Lọc các tuyến đang hoạt động: `GET /api/v1/routes?status=ACTIVE`
- Tìm kiếm theo tuyến Đà Lạt và phân trang: `GET /api/v1/routes?search=Đà Lạt&page=1&limit=10`

---

## 📤 Response

### 1. Thành công (HTTP 200 OK)
```json
{
  "success": true,
  "code": "GET_ROUTES_SUCCESS",
  "message": "Lấy danh sách tuyến đường thành công.",
  "data": [
    {
      "id": "route_b1c2d3e4-f5a6-7890-abcd-1234567890ab",
      "operatorId": "op_987654321_abcd",
      "origin": "Hồ Chí Minh",
      "destination": "Đà Lạt",
      "status": "ACTIVE",
      "totalStops": 5,
      "stops": [
        {
          "id": "stop_1",
          "name": "Bến xe Miền Đông Mới",
          "order": 0
        },
        {
          "id": "stop_2",
          "name": "Ngã tư Vũng Tàu",
          "order": 1
        },
        {
          "id": "stop_3",
          "name": "Trạm dừng chân Định Quán",
          "order": 2
        },
        {
          "id": "stop_4",
          "name": "Bến xe Bảo Lộc",
          "order": 3
        },
        {
          "id": "stop_5",
          "name": "Bến xe liên tỉnh Đà Lạt",
          "order": 4
        }
      ],
      "createdAt": "2026-09-20T14:00:00.000Z",
      "updatedAt": "2026-09-20T14:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### 2. Thất bại - Chưa được duyệt làm Nhà xe (HTTP 403 Forbidden)
```json
{
  "statusCode": 403,
  "message": "Tài khoản của bạn chưa được cấp quyền Nhà xe (Operator). Vui lòng nộp đơn đăng ký Nhà xe và chờ Admin phê duyệt.",
  "error": "Forbidden"
}
```
