import { authRateLimiters } from "../../middlewares/auth-rate-limit.middleware.js";

/**
 * ============================================================================
 * IDENTITY SERVICE - Route Configuration
 * Backend Port: 8080
 * ============================================================================
 *
 * Controllers & Endpoints Served:
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ AuthenticationController (/api/auth)                                    │
 * │   POST /login                 → Đăng nhập, trả JWT                     │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ UserController (/api/users)                                             │
 * │                                                                         │
 * │ --- Public ---                                                          │
 * │   POST /                      → Đăng ký user mới                       │
 * │                                                                         │
 * │ --- User (Cá nhân, /me) ---                                             │
 * │   GET    /me                  → Xem thông tin tài khoản                 │
 * │   PUT    /me                  → Cập nhật tài khoản                      │
 * │   GET    /me/profile          → Xem hồ sơ user                          │
 * │   PUT    /me/profile          → Cập nhật hồ sơ user                     │
 * │   POST   /me/avatar           → Upload avatar (multipart)               │
 * │   POST   /me/upgradetohost    → Nâng cấp lên Host (multipart+CCCD)     │
 * │   DELETE /me/upgradetohost    → Hủy đơn nâng cấp host                  │
 * │   POST   /me/upgradetoenterprise → Nâng cấp lên Enterprise             │
 * │   GET    /me/host-profile     → Xem hồ sơ Host                          │
 * │   PUT    /me/host-profile     → Cập nhật hồ sơ Host                     │
 * │   GET    /me/enterprise-profile → Xem hồ sơ Enterprise                  │
 * │   PUT    /me/enterprise-profile → Cập nhật hồ sơ Enterprise             │
 * │                                                                         │
 * │ --- Admin ---                                                           │
 * │   GET    /                    → Danh sách Users (phân trang)            │
 * │   GET    /hosts               → Danh sách Host pending (phân trang)     │
 * │   GET    /hosts/all           → Tất cả Host (phân trang)                │
 * │   GET    /hosts/{accountId}   → Chi tiết 1 Host                         │
 * │   PUT    /{accountId}/approvalstatus → Approve/Reject hồ sơ Host       │
 * │   PUT    /accounts/{accountId}/status → Ban/Unban tài khoản            │
 * │   DELETE /admin/{id}          → Xóa tài khoản                           │
 * │   PATCH  /admin/{id}          → Ban tài khoản                           │
 * │   POST   /{id}/upgraderole    → Nâng cấp role                          │
 * │   POST   /{id}/successupgradetohost → Hoàn tất nâng cấp Host           │
 * │                                                                         │
 * │ --- Internal (Service-to-Service) ---                                   │
 * │   GET    /internal/{userId}/status → Kiểm tra trạng thái user           │
 * │   Không expose qua Gateway, Gateway gọi trực tiếp bằng internal token   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Lưu ý: JWKS endpoint (.well-known) đặt riêng ở đầu.
 */

export const identityRoutes = [
    // ==========================================
    // 1. JWKS (Public - Không Auth)
    // ==========================================
    {
        url: '/.well-known/jwks.json',
        target: (process.env.IDENTITY_SERVICE_URL || "http://localhost:8080"),
        auth: false
    },

    // ==========================================
    // 2a. REFRESH ROLES (Auth - Yêu cầu JWT hợp lệ)
    // Route này phải trước /api/v1/auth để sorting theo URL length ưu tiên đúng
    // ==========================================
    {
        url: '/api/v1/auth/refresh-roles',
        target: (process.env.IDENTITY_SERVICE_URL || "http://localhost:8080"),
        auth: true,
        pathRewrite: () => '/api/auth/refresh-roles'
    },

    // ==========================================
    // 2b. NHÓM AUTH (Đăng nhập, Đăng ký - Không Auth)
    // ==========================================
    {
        url: '/api/v1/auth',
        target: (process.env.IDENTITY_SERVICE_URL || "http://localhost:8080"),
        auth: false,
        middlewares: authRateLimiters,
        pathRewrite: (path, req) => {
            const parts = req.originalUrl.split('?');
            let url = parts[0];
            const query = parts[1] ? `?${parts[1]}` : '';

            // Phiên dịch URL từ Frontend sang Backend
            if (url === '/api/v1/auth/login') return '/api/auth/login' + query;
            if (url === '/api/v1/auth/register') return '/api/users' + query; // Nối vào @PostMapping("/api/users")
            if (url === '/api/v1/auth/refresh-roles') return '/api/auth/refresh-roles' + query;
            if (url === '/api/v1/auth/forgot-password') return '/api/auth/forgot-password' + query;
            if (url === '/api/v1/auth/reset-password') return '/api/auth/reset-password' + query;

            return path;
        }
    },

    // ==========================================
    // 3. NHÓM CÁ NHÂN (Tiền tố: /api/v1/me)
    // Bao gồm User, Host, Enterprise xem hồ sơ của chính mình
    // ==========================================
    {
        url: '/api/v1/me',
        target: (process.env.IDENTITY_SERVICE_URL || "http://localhost:8080"),
        auth: true,
        pathRewrite: (path, req) => {
            const parts = req.originalUrl.split('?');
            let url = parts[0];
            const query = parts[1] ? `?${parts[1]}` : '';

            // --- Tài khoản ---
            url = url.replace(/^\/api\/v1\/me\/?$/, '/api/users/me'); // GET, PUT Thông tin tài khoản

            // --- Hồ sơ User ---
            url = url.replace(/^\/api\/v1\/me\/profile$/, '/api/users/me/profile'); // GET, PUT Hồ sơ User

            // --- Avatar ---
            url = url.replace(/^\/api\/v1\/me\/avatar$/, '/api/users/me/avatar'); // POST Upload Avatar

            // --- Nâng cấp ---
            url = url.replace(/^\/api\/v1\/me\/upgrade-host$/, '/api/users/me/upgradetohost'); // POST, DELETE
            url = url.replace(/^\/api\/v1\/me\/upgrade-enterprise$/, '/api/users/me/upgradetoenterprise'); // POST
            url = url.replace(/^\/api\/v1\/me\/upgrade-applications$/, '/api/users/me/upgrade-applications'); // GET
            url = url.replace(/^\/api\/v1\/me\/ticket-vendor-application$/, '/api/users/me/ticket-vendor-application'); // POST, PUT
            url = url.replace(/^\/api\/v1\/me\/ticket-vendor-profile$/, '/api/users/me/ticket-vendor-profile'); // GET

            // --- Hồ sơ đặc thù ---
            url = url.replace(/^\/api\/v1\/me\/host-profile$/, '/api/users/me/host-profile'); // GET, PUT
            url = url.replace(/^\/api\/v1\/me\/enterprise-profile$/, '/api/users/me/enterprise-profile'); // GET, PUT
            url = url.replace(/^\/api\/v1\/me\/host-bank-account$/, '/api/users/me/host-bank-account'); // GET, PUT
            url = url.replace(/^\/api\/v1\/me\/enterprise-bank-account$/, '/api/users/me/enterprise-bank-account'); // GET, PUT

            return url + query;
        }
    },

    // ==========================================
    // 4. NHÓM ADMIN (Tiền tố: /api/v1/admin)
    // ==========================================
    {
        url: '/api/v1/admin',
        target: (process.env.IDENTITY_SERVICE_URL || "http://localhost:8080"),
        auth: true,
        pathRewrite: (path, req) => {
            const parts = req.originalUrl.split('?');
            let url = parts[0];
            const query = parts[1] ? `?${parts[1]}` : '';

            // --- Quản lý Users ---
            url = url.replace(/^\/api\/v1\/admin\/users\/?$/, '/api/users'); // GET All Users
            url = url.replace(/^\/api\/v1\/admin\/users\/([^\/]+)$/, '/api/users/admin/$1'); // DELETE, PATCH user
            url = url.replace(/^\/api\/v1\/admin\/users\/([^\/]+)\/role$/, '/api/users/$1/upgraderole'); // POST upgrade role
            url = url.replace(/^\/api\/v1\/admin\/users\/([^\/]+)\/revokerole$/, '/api/users/$1/revokerole'); // POST revoke role
            url = url.replace(/^\/api\/v1\/admin\/accounts\/([^\/]+)\/status$/, '/api/users/accounts/$1/status'); // PUT ban/unban

            // --- Quản lý Hosts ---
            if (url === '/api/v1/admin/hosts/approved') {
                return `/api/users/hosts?status=APPROVED${parts[1] ? '&' + parts[1] : ''}`;
            }

            url = url.replace(/^\/api\/v1\/admin\/hosts\/?$/, '/api/users/hosts'); // GET Host Pending
            url = url.replace(/^\/api\/v1\/admin\/hosts\/all$/, '/api/users/hosts/all'); // GET All Hosts
            url = url.replace(/^\/api\/v1\/admin\/hosts\/([^\/]+)\/approval$/, '/api/users/$1/approvalstatus'); // PUT Approve/Reject
            url = url.replace(/^\/api\/v1\/admin\/hosts\/([^\/]+)\/success$/, '/api/users/$1/successupgradetohost'); // POST Complete upgrade
            url = url.replace(/^\/api\/v1\/admin\/hosts\/([^\/]+)$/, '/api/users/hosts/$1'); // GET Host Detail

            // --- Quản lý Enterprises ---
            if (url === '/api/v1/admin/enterprises/approved') {
                return `/api/users/enterprises?status=APPROVED${parts[1] ? '&' + parts[1] : ''}`;
            }

            url = url.replace(/^\/api\/v1\/admin\/enterprises\/?$/, '/api/users/enterprises'); // GET Enterprise Pending
            url = url.replace(/^\/api\/v1\/admin\/enterprises\/all$/, '/api/users/enterprises/all'); // GET All Enterprises
            url = url.replace(/^\/api\/v1\/admin\/enterprises\/([^\/]+)\/approval$/, '/api/users/$1/approvalstatus'); // PUT Approve/Reject
            url = url.replace(/^\/api\/v1\/admin\/enterprises\/([^\/]+)\/success$/, '/api/users/$1/successupgradetoenterprise'); // POST Complete upgrade

            // --- Hồ sơ nhà vận hành GoTicket ---
            url = url.replace(/^\/api\/v1\/admin\/ticket-vendors\/?$/, '/api/users/ticket-vendors'); // GET Pending/All
            url = url.replace(/^\/api\/v1\/admin\/ticket-vendors\/([^\/]+)\/approval$/, '/api/users/ticket-vendors/$1/approval'); // PUT Approve/Reject

            return url + query;
        }
    }
];
