# GoTravel Payment Portal

Standalone GoStay payment page. GoCar is not connected yet. This app runs on port 3336 and proxies the required payment APIs to the existing API Gateway on port 5555. It has no npm dependencies.

## Run

```bash
cd payment_portal
npm start
```

Optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PAYMENT_PORTAL_HOST` | `0.0.0.0` | Listen address |
| `PAYMENT_PORTAL_PORT` | `3336` | Listen port |
| `PAYMENT_GATEWAY_URL` | `http://127.0.0.1:5555` | Local Gateway URL |
| `GOSTAY_BASE_URL` | `https://gostay.nonnet123.io.vn` | Trusted return origin |

Set `NEXT_PUBLIC_PAYMENT_PORTAL_URL` in the GoStay frontend when the payment subdomain changes. GoStay sends the new order to `POST /launch`; the portal verifies the login and order owner, then returns a short-lived, cookie-bound `/pay?session=...` link. Opening the root page or a guessed payment URL returns HTTP 404. A browser refresh works during the 30-minute handoff session; a portal process restart ends in-memory handoff sessions.

The "Thanh toán mô phỏng" tab calls the existing backend `mock-pay` endpoint. In this test environment it marks the actual order as paid and triggers the same order confirmation path as the old GoStay payment page, without a bank transfer. The portal requires a valid checkout session tied to the current order before forwarding this request.

For the payment subdomain to create payments, add its exact HTTPS origin to Gateway's `allowedOrigins` setting. Authentication relies on the existing shared SSO cookie for `nonnet123.io.vn` and the Gateway CSRF cookie. Point the subdomain to port 3336. The old GoStay `/payment` page remains in the repository.
