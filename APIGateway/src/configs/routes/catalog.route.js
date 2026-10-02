/**
 * ============================================================================
 * CATALOG & LISTING SERVICE - Route Configuration
 * Backend Port: 8082
 * ============================================================================
 *
 * Controllers & Endpoints Served:
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ CatalogPublicController (/api/v1/catalog/listings)                      │
 * │   GET  /{listingId}           → Xem chi tiết listing                   │
 * │   GET  /{listingId}/reviews   → Xem danh sách đánh giá (phân trang)   │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ CatalogUserController (/api/v1/catalog/reviews)                         │
 * │   POST /                      → Đăng bài đánh giá (Role: USER)         │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ CatalogHostController (/api/v1/catalog/host)                            │
 * │   POST   /landmark-suggestions     → Đề xuất địa danh mới              │
 * │   POST   /complexes                → Tạo khu tổ hợp (ENTERPRISE)       │
 * │   POST   /listings                 → Đăng dịch vụ mới                  │
 * │   GET    /listings                 → Danh sách dịch vụ của Host         │
 * │   PUT    /listings/{listingId}     → Cập nhật dịch vụ                  │
 * │   DELETE /listings/{listingId}     → Xóa dịch vụ (soft delete)         │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ CatalogAdminController (/api/v1/catalog/admin)                          │
 * │   GET   /landmark-suggestions                    → Xem đề xuất         │
 * │   PUT   /landmark-suggestions/{id}/status        → Duyệt/Từ chối      │
 * │   POST  /landmarks                               → Tạo địa danh        │
 * │   PUT   /landmarks/{landmarkId}                  → Cập nhật địa danh   │
 * │   PATCH /landmarks/{landmarkId}/status           → Đổi trạng thái      │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

export const catalogRoutes = [
    // ==========================================
    // 1. PUBLIC - Xem Listing & Reviews (Không Auth)
    // ==========================================
    {
        url: '/api/v1/catalog/listings',
        target: (process.env.CATALOG_SERVICE_URL || "http://localhost:8082"),
        auth: false,
        publicRequests: [
            { method: 'GET', path: '/api/v1/catalog/listings/landmarks' },
            { method: 'GET', path: /^\/api\/v1\/catalog\/listings\/[0-9a-fA-F-]{36}$/ },
            { method: 'GET', path: /^\/api\/v1\/catalog\/listings\/[0-9a-fA-F-]{36}\/reviews$/ }
        ],
        // GET /{listingId}          → Chi tiết listing
        // GET /{listingId}/reviews  → Reviews của listing
    },

    // ==========================================
    // 2. USER - Đánh giá dịch vụ (Auth required)
    // ==========================================
    {
        url: '/api/v1/catalog/reviews',
        target: (process.env.CATALOG_SERVICE_URL || "http://localhost:8082"),
        auth: true,
        // POST / → Gửi đánh giá (Role: USER)
    },

    // ==========================================
    // 3. HOST - Quản lý dịch vụ (Auth required)
    // ==========================================
    {
        url: '/api/v1/catalog/host',
        target: (process.env.CATALOG_SERVICE_URL || "http://localhost:8082"),
        auth: true,
        // POST   /landmark-suggestions     → Đề xuất landmark
        // POST   /complexes                → Tạo complex
        // POST   /listings                 → Tạo listing
        // GET    /listings                 → Xem listing của mình
        // PUT    /listings/{listingId}     → Sửa listing
        // DELETE /listings/{listingId}     → Xóa listing
    },

    // ==========================================
    // 4. ADMIN - Quản trị Landmark (Auth required)
    // ==========================================
    {
        url: '/api/v1/catalog/admin',
        target: (process.env.CATALOG_SERVICE_URL || "http://localhost:8082"),
        auth: true,
        // GET   /landmark-suggestions                → Xem đề xuất
        // PUT   /landmark-suggestions/{id}/status    → Approve/Reject
        // POST  /landmarks                           → Tạo landmark
        // PUT   /landmarks/{landmarkId}              → Sửa landmark
        // PATCH /landmarks/{landmarkId}/status        → Đổi status
    }
];
