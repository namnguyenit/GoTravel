# GoCar backend

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

Use Node 22 and the dependencies already installed in this checkout, or install from the lockfile. Copy `.env.example` to `.env` and supply the **same** internal service token used by the Spring services. Use a separate random signing key of at least 32 bytes for tickets. Leave `GOCAR_ENABLED=false` until all migrations, configuration and cross-service checks have passed.

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
