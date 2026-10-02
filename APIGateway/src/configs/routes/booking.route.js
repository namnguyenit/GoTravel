/**
 * ============================================================================
 * BOOKING & INVENTORY SERVICE - Route Configuration
 * Backend Port: 8083
 * ============================================================================
 *
 * Controllers & Endpoints Served:
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ InventoryPublicController (/api/v1/public/inventory)                    │
 * │   GET /listings/{listingId}/availability                               │
 * │       → Kiểm tra phòng trống theo khoảng ngày (startDate, endDate)     │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ InventoryHostController (/api/v1/host/inventory)                        │
 * │   GET /listings/{listingId}/calendars        → Xem lịch tháng          │
 * │   PUT /listings/{listingId}/calendars/block  → Đóng/mở ngày            │
 * │   GET /listings/{listingId}/occupancy-rate   → Thống kê công suất      │
 * │   GET /listings/{listingId}/locks            → Xem locks của ngày      │
 * │   @PreAuthorize: HOST hoặc ADMIN                                       │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ InventoryAdminController (/api/v1/admin/inventory)                      │
 * │   PUT  /listings/{listingId}/force-update    → Phong tỏa dịch vụ       │
 * │   POST /listings/{listingId}/sync            → Đồng bộ lại tồn kho    │
 * │   @PreAuthorize: ADMIN                                                  │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ InventoryInternalController (/api/v1/internal/inventory)                │
 * │   POST /initialize             → Khởi tạo kho cho listing mới          │
 * │   POST /locks                  → Tạm giữ chỗ (batch lock)             │
 * │   PUT  /locks/{orderId}/confirm → Chốt đơn sau thanh toán              │
 * │   PUT  /locks/{orderId}/cancel  → Hủy đơn, hoàn kho                   │
 * │   Không expose qua Gateway, chỉ gọi service-to-service                  │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

export const bookingRoutes = [
    // ==========================================
    // 1. PUBLIC - Kiểm tra phòng trống (Không Auth)
    // ==========================================
    {
        url: '/api/v1/public/inventory',
        target: (process.env.BOOKING_SERVICE_URL || "http://localhost:8083"),
        auth: false,
        publicRequests: [
            { method: 'GET', path: /^\/api\/v1\/public\/inventory\/listings\/[0-9a-fA-F-]{36}\/availability$/ }
        ],
        // GET /listings/{listingId}/availability?startDate=...&endDate=...
    },

    // ==========================================
    // 2. HOST - Quản lý lịch và tồn kho (Auth, HOST/ADMIN)
    // ==========================================
    {
        url: '/api/v1/host/inventory',
        target: (process.env.BOOKING_SERVICE_URL || "http://localhost:8083"),
        auth: true,
        // GET /listings/{listingId}/calendars?month=6&year=2026
        // PUT /listings/{listingId}/calendars/block
        // GET /listings/{listingId}/occupancy-rate?month=6&year=2026
        // GET /listings/{listingId}/locks?date=2026-06-15
    },

    // ==========================================
    // 3. ADMIN - Can thiệp hệ thống (Auth, ADMIN)
    // ==========================================
    {
        url: '/api/v1/admin/inventory',
        target: (process.env.BOOKING_SERVICE_URL || "http://localhost:8083"),
        auth: true,
        // PUT  /listings/{listingId}/force-update
        // POST /listings/{listingId}/sync
    }
];
