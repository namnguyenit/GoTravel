# API Specification: Tìm kiếm Chuyến xe cho Khách hàng (Search Trips for Customers)

- **HTTP Method**: `GET`
- **Endpoint Gateway**: `/api/v1/trips/search`
- **Endpoint Backend**: `/trips/search`
- **Quyền truy cập (Role)**: **Công khai (Public / Mọi người dùng)**
- **Xác thực**: Không yêu cầu Bearer JWT Token (`auth: false` tại API Gateway)
- **Mô tả**: Phục vụ màn hình tìm kiếm vé xe của Hành khách trên Website/App GoStay. Tìm các chuyến xe còn mở bán (`SCHEDULED`), giờ chạy trong tương lai, thuộc các Tuyến đường và Xe đang hoạt động (`ACTIVE`).

---

## 📥 Request Headers

*(Không bắt buộc)*

| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | `string` | **Không** | Tùy chọn nếu khách hàng đã đăng nhập |

---

## 📥 Query Parameters

| Parameter | Type | Required | Default | Allowed Values / Format | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `origin` | `string` | **Có** | - | Chuỗi ký tự (VD: "Hà Nội", "Hồ Chí Minh") | Điểm xuất phát (Tìm kiếm tương đối theo tuyến) |
| `destination` | `string` | **Có** | - | Chuỗi ký tự (VD: "Hải Phòng", "Đà Lạt") | Điểm đến (Tìm kiếm tương đối theo tuyến) |
| `departureDate` | `string` | **Có** | - | Định dạng `YYYY-MM-DD` (Không ở quá khứ) | Ngày khởi hành muốn tìm |
| `type` | `string` | Không | `null` | `SLEEPER`, `LIMOUSINE`, `SEAT` | Lọc theo loại xe khách |
| `minPrice` | `number` | Không | `null` | Số nguyên $\ge 0$ | Mức giá vé tối thiểu (VNĐ) |
| `maxPrice` | `number` | Không | `null` | Số nguyên $\ge 0$ | Mức giá vé tối đa (VNĐ) |
| `operatorId` | `string` | Không | `null` | UUID hợp lệ | Lọc theo nhà xe cụ thể |
| `sortBy` | `string` | Không | `departureTime` | `departureTime`, `pricePerSeat` | Trường sắp xếp |
| `sortOrder` | `string` | Không | `asc` | `asc`, `desc` | Thứ tự sắp xếp (tăng dần / giảm dần) |
| `page` | `number` | Không | `1` | Số nguyên $\ge 1$ | Số trang hiển thị |
| `limit` | `number` | Không | `10` | 1 - 50 | Số lượng chuyến hiển thị mỗi trang |

### Mẫu Request URL:
- Tìm kiếm cơ bản chặng HCM ➔ Đà Lạt ngày 25/09/2026:
  `GET /api/v1/trips/search?origin=Hồ Chí Minh&destination=Đà Lạt&departureDate=2026-09-25`
- Tìm kiếm có lọc loại xe Limousine và sắp xếp theo giá thấp đến cao:
  `GET /api/v1/trips/search?origin=Hồ Chí Minh&destination=Đà Lạt&departureDate=2026-09-25&type=LIMOUSINE&sortBy=pricePerSeat&sortOrder=asc`

---

## 📤 Response

### 1. Thành công - Tìm thấy chuyến xe (HTTP 200 OK)
```json
{
  "success": true,
  "code": "SEARCH_TRIPS_SUCCESS",
  "message": "Tìm kiếm chuyến xe thành công.",
  "data": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 3,
      "totalPages": 1
    },
    "data": [
      {
        "id": "trip_550e8400-e29b-41d4-a716-446655440000",
        "departureTime": "2026-09-25T08:00:00.000Z",
        "arrivalTime": "2026-09-25T14:30:00.000Z",
        "pricePerSeat": 250000,
        "status": "SCHEDULED",
        "operator": {
          "id": "op_987654321_abcd",
          "name": "Nhà xe Phương Trang"
        },
        "route": {
          "id": "route_b1c2d3e4-f5a6-7890-abcd-1234567890ab",
          "origin": "Hồ Chí Minh",
          "destination": "Đà Lạt",
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
          ]
        },
        "car": {
          "id": "car_9a8b7c6d-5e4f-3210-fedc-ba9876543210",
          "name": "Limousine VIP 34 chỗ",
          "licensePlate": "51B-888.88",
          "type": "LIMOUSINE",
          "totalSeats": 34
        },
        "seats": {
          "totalSeats": 34,
          "bookedSeats": 22,
          "availableSeats": 12,
          "isSoldOut": false
        }
      }
    ]
  }
}
```

### 2. Thành công - Không tìm thấy chuyến nào (HTTP 200 OK)
```json
{
  "success": true,
  "code": "SEARCH_TRIPS_SUCCESS",
  "message": "Không tìm thấy chuyến xe phù hợp với điều kiện tìm kiếm.",
  "data": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 0
    },
    "data": []
  }
}
```

### 3. Thất bại - Thiếu tham số bắt buộc hoặc sai định dạng (HTTP 400 Bad Request)
```json
{
  "statusCode": 400,
  "message": [
    "Điểm khởi hành (origin) không được để trống.",
    "Điểm đến (destination) không được để trống.",
    "Ngày khởi hành (departureDate) phải có định dạng YYYY-MM-DD và không ở trong quá khứ."
  ],
  "error": "Bad Request"
}
```
