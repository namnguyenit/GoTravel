# API Specification: Lấy danh sách địa điểm tuyến đường (Get Route Locations)

- **HTTP Method**: `GET`
- **Endpoint Gateway**: `/api/v1/routes/locations`
- **Endpoint Backend**: `/routes/locations`
- **Quyền truy cập (Role)**: **Công khai (Public / Mọi người dùng)**
- **Xác thực**: Không yêu cầu Bearer JWT Token (`auth: false` tại API Gateway)
- **Mô tả**: Cung cấp danh sách tất cả các địa điểm (tỉnh/thành phố) xuất hiện trong các tuyến đường đang hoạt động (`status = 'ACTIVE'`) của hệ thống. Dữ liệu được gộp chung từ cả `origin` và `destination`, loại bỏ trùng lặp (distinct) và sắp xếp A-Z tiếng Việt. Phục vụ Frontend đổ dữ liệu vào cả 2 dropdown "Điểm xuất phát" và "Điểm đến" trên thanh tìm kiếm chuyến xe.

---

## 📥 Request Headers

*(Không bắt buộc)*

| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | `string` | **Không** | Tùy chọn nếu người dùng đã đăng nhập |

---

## 📥 Query Parameters

*(Không có tham số - Không yêu cầu query params)*

### Mẫu Request URL:
```http
GET /api/v1/routes/locations HTTP/1.1
Host: api.gostay.vn
Accept: application/json
```

---

## 📤 Response

### 1. Thành công - Lấy được danh sách địa điểm (HTTP 200 OK)
```json
{
  "success": true,
  "code": "GET_ROUTE_LOCATIONS_SUCCESS",
  "message": "Lấy danh sách địa điểm thành công.",
  "data": {
    "locations": [
      "Bình Định",
      "Đà Nẵng",
      "Hà Nội",
      "Hải Phòng",
      "Huế",
      "Lâm Đồng",
      "Nha Trang",
      "Quảng Ninh",
      "Sa Pa",
      "Thành phố Hồ Chí Minh",
      "Vũng Tàu"
    ]
  }
}
```

### 2. Thành công - Hệ thống chưa có tuyến đường nào hoạt động (HTTP 200 OK)
```json
{
  "success": true,
  "code": "GET_ROUTE_LOCATIONS_SUCCESS",
  "message": "Lấy danh sách địa điểm thành công.",
  "data": {
    "locations": []
  }
}
```

---

## 💻 Cách sử dụng trên Frontend (Gợi ý cho React / Vue)

```typescript
// Gọi API 1 lần khi trang tìm kiếm khởi tạo (mount)
useEffect(() => {
  const fetchLocations = async () => {
    try {
      const res = await axios.get('/api/v1/routes/locations');
      if (res.data.success) {
        const locations = res.data.data.locations;
        setOriginOptions(locations);
        setDestinationOptions(locations);
      }
    } catch (error) {
      console.error('Không thể nạp danh sách địa điểm:', error);
    }
  };

  fetchLocations();
}, []);
```
