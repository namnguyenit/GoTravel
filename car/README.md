# GoCar backend

> **Hướng dẫn hiện trạng (18/10/2026):** đọc [README_GOTICKET.md](../README_GOTICKET.md) để xem kiến trúc, luồng nghiệp vụ, tên database, bảng và cách tra dữ liệu. Các đoạn theo giai đoạn bên dưới cần đọc kèm mốc triển khai của chúng.


GoCar owns operators, vehicles, routes, trips, staff assignments and issued tickets. Shared services own the commercial flow: Catalog publishes transport offers, BookingandInventory owns seat state and holds, CartandOrder owns orders and cash receipts, GoPay owns online payments and their settlement records, and GoID owns identity and vendor approval. See `BACKEND_REMAKE_PLAN.md` for the business scope and rollout gates.

The current server keeps GoCar off until the production migration, GoTravel regression and canary gates are approved. `GOCAR_ENABLED=true` is an explicit opt-in. The GoCar frontend is outside this backend phase.

## Source layout

- `src/transport/domain`: transport contracts and repository port.
- `src/transport/application`: publish, quote, seat view, issue, void and check-in use cases.
- `src/transport/infrastructure`: Prisma and internal HTTP adapters, ticket signing.
- `src/transport/presentation`: authenticated and internal HTTP endpoints.
- `src/staff`: assignment and per-trip capability checks.
- `src/auth`: GoID JWT/JWKS and live-account authorization.
- `src/{car,route,trip,operator}`: existing operational modules, adapted to the new authorization and publication states.

## Local build

Use Node 22 and the dependencies already installed in this checkout, or install from the lockfile. Copy `.env.example` to `.env`; configure receiver-specific `TRANSPORT_INTERNAL_CALLERS` and outgoing `TRANSPORT_INTERNAL_TOKENS` for transport routes. The legacy internal token is retained only for compatible shared GoTravel/Identity calls. Use a separate random signing key of at least 32 bytes for tickets. Leave `GOCAR_ENABLED=false` until all migrations, configuration and cross-service checks have passed.

```bash
./node_modules/.bin/prisma validate
./node_modules/.bin/prisma generate
./node_modules/.bin/nest build
./node_modules/.bin/jest --runInBand
```

Do not use `prisma db push` against the shared environment. Migration scripts are versioned and must be backed up and run through a controlled gate:

1. `car/prisma/migrations/20261011040000_transport_backend/migration.sql`
2. `car/prisma/migrations/20261011050000_trip_cancellations/migration.sql`
3. `CatalogandListing/scripts/20261011_transport_offers.sql`
4. `BookingandInventory/scripts/20261011_transport_inventory.sql`
5. `CartandOrder/scripts/20261011_transport_orders.sql`
6. `CartandOrder/scripts/2026101102_transport_trip_cancellations.sql`
7. `CartandOrder/scripts/2026101103_transport_reconciliation.sql`
8. `PaymentandWallet/scripts/20261011_transport_manual_refunds.sql`
9. `car/prisma/migrations/20261011060000_transport_operations/migration.sql`
10. `BookingandInventory/scripts/2026101102_transport_seat_blocks.sql`
11. `CartandOrder/scripts/2026101104_transport_operations.sql`

Before applying the GoCar migration, check for duplicate `operators.user_id` and overlapping active schedules for one vehicle; its unique and exclusion constraints will reject either. The services must not start a transport-enabled build before their corresponding migration has finished. Keep GoTravel smoke checks in the gate.

## Core flow

1. Vendor creates a trip in `DRAFT`, assigns an immutable vehicle seat template, then publishes. Catalog may leave a new route offer `PENDING`; after admin approval, retry publication. Inventory is initialized only for a publishable trip.
2. Cart asks GoCar for a short-lived server quote, verifies the active Catalog offer, creates a typed transport order, then asks Inventory to hold all selected seats atomically for 15 minutes. The final booking cutoff is 15 minutes before departure.
3. For online orders, GoPay reads Cart's trusted amount and expiry. After verified payment, Cart confirms seats and requests idempotent ticket issuance. Payment and fulfillment notifications are retained for retries.
4. For cash, a staff member needs `SELL_CASH`, an open shift and an active hold. Recording the exact physical amount appends an immutable receipt before confirming seats and issuing tickets. If a downstream call fails after collection, the receipt remains and the order is flagged for reconciliation.
5. Check-in requires an assigned staff member with `CHECK_IN`, a signed ticket token, a confirmed order and SOLD seats. Paid cancellations void tickets before releasing seats. Refunds remain pending until an admin records external payment evidence; the backend does not transfer money itself.

## Operational limits

- No public GoCar frontend or portal is delivered in this phase.
- Payment simulation uses `POST /api/v1/payments/create-mock` followed by the existing `mock-pay` endpoint. Both work only when the server-side `payment.mock-enabled` flag is true; keep it false outside isolated test environments.
- VNPAY and bank refunds require a real external refund plus administrative evidence; the manual confirmation endpoint records that evidence. It is not a transfer API.
- `PAID_REVIEW` and cash reconciliation states require staff attention. The admin `GET /api/v1/orders/transport/admin/attention` endpoint lists these orders.
- A production rollout still needs GoTravel regression on the migrated release environment, real provider sandbox verification, backup/rollback rehearsal and a controlled canary. Until then, keep GoCar disabled.

## Additional operations (implementation awaiting validation)

See `BACKEND_OPERATIONS.md` for manifest, lifecycle, no-show, blocking, class pricing,
quote claims, transport emails, staff scopes, assisted CASH/online exchange, reports
and receiver-specific internal credentials. The latest work intentionally did not run
builds/tests, migrate databases, invoke email/payment providers or restart services.
Generate the Prisma client during the subsequent build stage before compiling the new models.
The previous test results do not validate these additions.


## Per-item exchange / cancellation and GoPay ledger

Source now includes C4–C6: same-operator seat/trip exchange, per-item cancellation,
15-minute replacement reservations, actual ONLINE/CASH delta funding, rotated ticket
QR revisions, source-based refund obligations and net settlement with immutable evidence.
Original order totals remain the original charge; current item fares and actual refunds
are exposed separately as exact VND strings. Bank refunds are external operations
followed by evidence registration, not automatic transfers from this backend.

The authoritative checklist/file handoff is [BACKEND_COMPLETION_PLAN.md](BACKEND_COMPLETION_PLAN.md),
sections 20–21. Public/internal APIs, payment operationId flow and recovery instructions
are in [BACKEND_OPERATIONS.md](BACKEND_OPERATIONS.md). Its schema prerequisite section
extends the older migration list above, including operator stops, inventory versioning,
amendments/notification leases, operator profiles and item/money operation tables.
Each service uses its own database; do not combine all SQL into a shared schema.

Completion here means source implementation. Compile/Prisma generation, isolated
cross-service tests, GoTravel regression and live migration/release remain deferred.
No new service has been started; GoCar front/backend remain off. No commit/push was made.
