import { createEndpointLimiter } from "../../middlewares/auth-rate-limit.middleware.js";

const crossSellLimiter = createEndpointLimiter({
    path: '/api/v1/recommendations/cross-sell/cart-item',
    windowMs: 60 * 1000,
    limit: 30,
    message: 'Bạn gửi quá nhiều yêu cầu gợi ý. Vui lòng thử lại sau.'
});

const behaviorEventLimiter = createEndpointLimiter({
    path: '/api/v1/recommendations/events',
    windowMs: 60 * 1000,
    limit: 60,
    message: 'Bạn gửi quá nhiều sự kiện. Vui lòng thử lại sau.'
});

export const searchRoutes = [
    {
        url: '/api/v1/search',
        target: (process.env.SEARCH_SERVICE_URL || "http://localhost:8086"),
        auth: false,
        publicRequests: [
            { method: 'GET', path: '/api/v1/search/locations/suggest' },
            { method: 'GET', path: '/api/v1/search/landmarks/autocomplete' },
            { method: 'GET', path: '/api/v1/search/listings' },
            { method: 'GET', path: '/api/v1/search/listings/nearby' },
            { method: 'GET', path: '/api/v1/search/map' }
        ]
    },
    {
        url: '/api/v1/recommendations/events',
        target: (process.env.SEARCH_SERVICE_URL || "http://localhost:8086"),
        auth: true,
        middlewares: [behaviorEventLimiter],
    },
    {
        url: '/api/v1/recommendations',
        target: (process.env.SEARCH_SERVICE_URL || "http://localhost:8086"),
        auth: false,
        middlewares: [crossSellLimiter],
        publicRequests: [
            { method: 'GET', path: '/api/v1/recommendations/home/hero-landmarks' },
            { method: 'GET', path: '/api/v1/recommendations/home/feed' },
            { method: 'GET', path: '/api/v1/recommendations/provinces' },
            { method: 'GET', path: /^\/api\/v1\/recommendations\/provinces\/[^/]+\/destinations$/ },
            { method: 'GET', path: '/api/v1/recommendations/complexes' },
            { method: 'GET', path: /^\/api\/v1\/recommendations\/complexes\/[^/]+\/detail$/ },
            { method: 'GET', path: /^\/api\/v1\/recommendations\/complexes\/[^/]+$/ },
            { method: 'GET', path: '/api/v1/recommendations/home' },
            { method: 'GET', path: '/api/v1/recommendations/nearby' },
            { method: 'GET', path: /^\/api\/v1\/recommendations\/landmarks\/[0-9a-fA-F-]{36}$/ },
            { method: 'GET', path: /^\/api\/v1\/recommendations\/listings\/[0-9a-fA-F-]{36}\/similar$/ },
            { method: 'POST', path: '/api/v1/recommendations/cross-sell/cart-item' }
        ]
    }
];
