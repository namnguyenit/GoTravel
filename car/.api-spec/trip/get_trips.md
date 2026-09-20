# API Specification: Xem danh sách Chuyến xe của Nhà xe (Get Operator Trips)

- **HTTP Method**: `GET`
- **Endpoint Gateway**: `/api/v1/trips`
- **Endpoint Backend**: `/trips`
- **Quyền truy cập (Role)**: `HOST` / `OPERATOR` (Đã được Admin phê duyệt làm Nhà xe)
- **Mô tả**: Cho phép chủ Nhà xe lấy danh sách các chuyến xe thuộc quyền quản lý của mình kèm thông tin chi tiết về Tuyến đường (`Route`), Xe khách (`Car`), thống kê tình trạng vé/ghế đã bán và cụm số liệu KPI tổng quan.

---

## 📥 Request Headers

| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | `string` | **Có** | Bearer Token của tài khoản Nhà xe (`Bearer <JWT_TOKEN>`) |
| `x-user-id` | `string` | Auto | Do API Gateway tự động giải mã từ JWT token và đính kèm |

---

## 📥 Query Parameters

| Parameter | Type | Required | Default | Allowed Values / Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `keyword` | `string` | Không | `null` | Chuỗi ký tự bất kỳ | Tìm kiếm tương đối theo Điểm đi, Điểm đến, Tên xe hoặc Biển số xe |
| `status` | `string` | Không | `null` | `SCHEDULED`, `DEPARTED`, `COMPLETED`, `CANCELLED` | Lọc theo trạng thái chuyến đi. Nếu bỏ trống sẽ lấy tất cả |
| `routeId` | `string` | Không | `null` | UUID hợp lệ | Lọc các chuyến theo một tuyến đường cụ thể |
| `carId` | `string` | Không | `null` | UUID hợp lệ | Lọc các chuyến theo một xe khách cụ thể |
| `departureDate`| `string` | Không | `null` | Định dạng `YYYY-MM-DD` | Lọc các chuyến có giờ xuất bến trong ngày được chọn |
| `page` | `number` | Không | `1` | Số nguyên $\ge 1$ | Số trang hiển thị |
| `limit` | `number` | Không | `10` | 1 - 100 | Số chuyến hiển thị trên mỗi trang |
| `sortBy` | `string` | Không | `departureTime` | `departureTime`, `pricePerSeat`, `createdAt` | Trường dùng để sắp xếp |
| `sortOrder` | `string` | Không | `asc` | `asc`, `desc` | Thứ tự sắp xếp (tăng dần / giảm dần) |

### Mẫu Request URL:
- Lấy trang đầu tiên mặc định: `GET /api/v1/trips`
- Lọc các chuyến sắp chạy trong ngày: `GET /api/v1/trips?status=SCHEDULED&departureDate=2026-09-25`
- Tìm kiếm theo biển số xe hoặc tuyến Đà Lạt: `GET /api/v1/trips?keyword=Đà Lạt&page=1&limit=10`

---

## 📤 Response

### 1. Thành công (HTTP 200 OK)
```json
{
  "success": true,
  "code": "GET_TRIPS_SUCCESS",
  "message": "Lấy danh sách chuyến xe thành công.",
  "data": {
    "kpi": {
      "totalTrips": 25,
      "scheduledTrips": 12,
      "departedTrips": 3,
      "completedTrips": 9,
      "cancelledTrips": 1
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    },
    "data": [
      {
        "id": "trip_550e8400-e29b-41d4-a716-446655440000",
        "operatorId": "op_987654321_abcd",
        "departureTime": "2026-09-25T08:00:00.000Z",
        "arrivalTime": "2026-09-25T14:30:00.000Z",
        "pricePerSeat": 250000,
        "status": "SCHEDULED",
        "route": {
          "id": "route_b1c2d3e4-f5a6-7890-abcd-1234567890ab",
          "origin": "Hồ Chí Minh",
          "destination": "Đà Lạt"
        },
        "car": {
          "id": "car_9a8b7c6d-5e4f-3210-fedc-ba9876543210",
          "name": "Limousine VIP 01",
          "licensePlate": "51B-888.88",
          "type": "LIMOUSINE",
          "totalSeats": 34
        },
        "occupancy": {
          "bookedSeats": 28,
          "availableSeats": 6,
          "occupancyRate": 82.35
        },
        "createdAt": "2026-09-20T15:20:00.000Z",
        "updatedAt": "2026-09-20T15:20:00.000Z"
      }
    ]
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

### 3. Thất bại - Định dạng ngày tháng hoặc query không hợp lệ (HTTP 400 Bad Request)
```json
{
  "statusCode": 400,
  "message": [
    "departureDate phải có định dạng YYYY-MM-DD.",
    "Trạng thái chuyến đi phải là SCHEDULED, DEPARTED, COMPLETED hoặc CANCELLED."
  ],
  "error": "Bad Request"
}
```
