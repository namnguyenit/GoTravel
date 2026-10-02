/**
 * ============================================================================
 * PAYMENT & WALLET SERVICE - Route Configuration
 * Backend Port: 8085
 * ============================================================================
 *
 * Controllers & Endpoints Served:
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ SepayWebhookController (/api/v1/public/payments)                        │
 * │   POST /sepay-webhook         → Nhận webhook từ SePay (public)          │
 * │   Không Auth - SePay gọi trực tiếp                                     │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ PaymentController (/api/v1/payments)                                    │
 * │   POST /create                → Tạo yêu cầu thanh toán (sinh QR)       │
 * │   GET  /{paymentId}           → Xem chi tiết 1 payment                  │
 * │   GET  /order/{orderId}       → Xem payment theo đơn hàng               │
 * │   GET  /history               → Lịch sử thanh toán (phân trang)         │
 * │   @PreAuthorize: isAuthenticated()                                      │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ HostPayoutController (/api/v1/payouts)                                  │
 * │   GET /me                     → Host xem thu nhập của mình              │
 * │   PUT /{payoutId}/mark-paid   → Admin đánh dấu đã trả tiền cho Host    │
 * │   @PreAuthorize: isAuthenticated() + ADMIN cho mark-paid                │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ InternalPaymentController (/api/v1/internal/payments)                   │
 * │   GET /order/{orderId}/status → CartandOrder kiểm tra trạng thái TT    │
 * │   Không expose qua Gateway, chỉ gọi service-to-service                  │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

export const paymentRoutes = [
    // ==========================================
    // 1. PUBLIC - SePay Webhook (Không Auth)
    //    PHẢI đặt TRƯỚC /api/v1/payments vì Express match prefix
    // ==========================================
    {
        url: '/api/v1/public/payments',
        target: (process.env.PAYMENT_SERVICE_URL || "http://localhost:8085"),
        auth: false,
        publicRequests: [
            { method: 'POST', path: '/api/v1/public/payments/sepay-webhook' }
        ],
        // POST /sepay-webhook → SePay gọi khi có biến động tài khoản
    },

    // ==========================================
    // 2. PAYMENT - Thanh toán (Auth required)
    // ==========================================
    {
        url: '/api/v1/payments',
        target: (process.env.PAYMENT_SERVICE_URL || "http://localhost:8085"),
        auth: true,
        // POST /create             → Tạo payment + sinh QR
        // GET  /{paymentId}        → Chi tiết payment
        // GET  /order/{orderId}    → Xem payment theo đơn
        // GET  /history            → Lịch sử thanh toán
    },

    // ==========================================
    // 3. PAYOUT - Thu nhập Host (Auth required)
    // ==========================================
    {
        url: '/api/v1/payouts',
        target: (process.env.PAYMENT_SERVICE_URL || "http://localhost:8085"),
        auth: true,
        // GET /me                  → Host xem thu nhập
        // PUT /{payoutId}/mark-paid → Admin đánh dấu đã trả
    }
];
