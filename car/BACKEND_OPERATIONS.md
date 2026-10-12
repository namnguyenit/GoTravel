# GoCar backend operations — source handoff 2026-10-11

Status: code added, validation deliberately deferred by the project owner. Nothing in this document is evidence of passing builds/tests or approval to enable GoCar.

## Ownership and boundaries

GoCar owns operational trip/boarding state; Cart owns commercial order state. Inventory remains the only writer of seats. GoPay remains the writer of online money records. All new migrations are additive and must precede starting the corresponding build; shared production databases have not been migrated in this work.

## Added API contracts

GoCar paths are relative to the existing GoCar base URL. Public routes require GoID JWT except the existing public search/seat view. Internal routes require receiver credentials.

| Method and path | Caller / input | Behavior |
|---|---|---|
| GET `/trips/:tripId/manifest` | CHECK_IN staff for this trip | Passenger/ticket/seat/stops with boarding status; no QR secrets in manifest. |
| POST `/trips/:tripId/tickets/:ticketId/no-show` | CHECK_IN staff | ACTIVE → NO_SHOW only after departure + configured cutoff; rejects checked-in/void tickets. |
| PUT `/trips/:tripId/lifecycle` | MANAGE_TRIP; `{status:"DEPARTED"}` or `COMPLETED` | Validates and commits lifecycle + durable sale intent under trip row lock, then synchronizes Inventory with exact version acknowledgement. Response exposes inventorySyncPending on dependency failure. Departure cannot be early; completion cannot precede planned arrival. |
| PUT `/trips/:tripId/class-prices` | MANAGE_TRIP; `{classPrices:{VIP:"350000"}}` | DRAFT only, integer VND strings, class must exist. Missing class uses base price. |
| PUT `/trips/:tripId/seat-blocks` | MANAGE_TRIP; `{seatIds:[uuid],blocked:true,reason:"..."}` | Entire selection atomically; AVAILABLE/BLOCKED only. HELD/SOLD cannot be overwritten. |
| PUT `/cars/:carId/seats` | Vendor owner | Existing DTO additionally accepts row/column; positions must be unique within a level when provided. |
| PUT `/operators/me/staff/:userId` | Vendor owner | Existing booleans plus canManageTrip, canCloseShift, tripIds. Empty tripIds covers all operator trips; only the owner's trips may be assigned. |
| POST `/api/v1/internal/car/transport/quote` | Cart | Returns quoteId, quoteVersion, quoteHash, expiry, immutable seat prices and passenger request. |
| POST `/api/v1/internal/car/transport/quotes/:quoteId/claim` | Cart; `{orderId,quoteHash}` | Checks trip version/status/deadline and assigns quote to exactly one order; replay same claim is idempotent. |
| GET `/api/v1/internal/car/transport/trips/:tripId/state` | Cart | Trip lifecycle + ticket states used to verify completion. |
| PUT `/api/v1/internal/orders/transport/trips/:tripId/complete` | GoCar → Cart | Cart reads back GoCar, validates trip/items/tickets, persists boarding status and COMPLETED order. |
| PUT `/api/v1/catalog/transport/offers/:listingId/content` | Approved vendor owning the offer | title, description, optional HTTPS thumbnailUrl; ACTIVE content returns to PENDING moderation; cannot edit GoTravel listings. |
| GET `/api/v1/orders/transport/:orderId/cancellation-preview` | Buyer or authorized cashier | Returns snapshotted cancellation fee/refund/policy before confirmation. |
| GET `/api/v1/orders/transport/admin/notifications` | Admin | Pending/sending/failed notification jobs, attempts and error class. |
| POST `/api/v1/orders/transport/admin/notifications/:eventId/retry` | Admin | Requeues FAILED jobs. |
| GET `/api/v1/orders/transport/admin/reports/:operatorUserId?from=YYYY-MM-DD&to=YYYY-MM-DD` | Admin | Orders by status/method, actual cash receipts, confirmed refund evidence and open discrepancies; bounded to 366 days. Not a bank balance report. |

Publish/stop-sale/cancel now also accept MANAGE_TRIP staff through server-side authorization. Staff delegation never changes the inventory/payment ownership above.

## Background work

- Publication is kept in PUBLISHING on downstream/moderation failure. Retry delay increases up to 10 minutes; status/error/attempts are stored on the trip. Catalog approval lets a later retry finish publication.
- The first publication freezes route, stops, vehicle seats, departure/arrival, base/class prices and quote version in sale_snapshot. Retries reuse that snapshot. Browsers never supply payable amounts.
- GoCar completion worker records remaining ACTIVE tickets as NO_SHOW only after the configured cutoff, then calls Cart completion and records acknowledgement. If Cart is unavailable or orders are still processing, it retries; previously completed orders remain idempotent.
- Reviews require a COMPLETED order and a CHECKED_IN transport item. NO_SHOW does not qualify. Legacy GoTravel review rules retain their completed-order requirement.
- Interrupted PENDING checkouts older than two minutes enter cancellation cleanup; Inventory independently expires any hold that was created.
- Ticket, cancellation, refund and exchange notifications are enqueued in the order/case transaction. Delivery starts after commit. Failed jobs back off and remain FAILED after ten attempts for operator action.
- QR encodes each signed boarding token, using locally generated PNG attachments. It does not call third-party QR URLs. SMTP delivery is at least once: a crash after mail acceptance but before acknowledgement can cause a repeat; event-based Message-ID is stable.
- Cancellation email explicitly says refund is pending. REFUNDED email is only enqueued after external refund evidence has been accepted.

## Legacy assisted full-order exchange

Admin uses the existing exchange endpoint with oldOrderId/newOrderId/reason. Both orders must be CONFIRMED, have the same customer, operator, payment method and number of passengers. CASH guests must have matching contact/name and both actual cash receipts. Replacement is funded first; old tickets are then voided, old seats released and the old payment fully refunded with evidence. Active exchange prevents ordinary cancellation of either order until completion.

Response records oldAmount/newAmount/difference/paymentMethod. Difference is **an accounting comparison**, not a second unverified payment. This legacy route funds the complete replacement first. Item operations below now provide net-only top-ups and per-item exchanges through separate Inventory/GoPay contracts. The two routes cannot run simultaneously for the same order. A trip cancellation can still affect a replacement; operator reconciliation must handle that exception.

## Configuration and credentials

- GOCAR_ENABLED remains false until release gates pass.
- GOCAR_NO_SHOW_MINUTES defaults to 120; this also ends the late check-in window. If arrival is earlier, completion synchronization waits until this cutoff to classify absent passengers.
- Cart transport.frontend-base-url is the future GoCar customer origin; set it before sending live ticket links.
- Each receiver reads TRANSPORT_INTERNAL_CALLERS as a JSON object mapping authorized caller name to a unique random secret of at least 32 characters. Each caller reads TRANSPORT_INTERNAL_TOKENS mapping destination name to the matching secret. Names: car, cart, catalog, inventory, payment, communication.
- Enable TRANSPORT_INTERNAL_AUTH_REQUIRED=true on all transport receivers after configuring matching credentials. Never commit real secrets. GoCar outgoing map needs catalog/inventory/cart; Cart needs car/inventory/payment/communication.
- Scope rules allow GoCar to publish/block/synchronize, Cart to reserve/confirm/release/issue and write settlement/refund, and Cart alone to send transport emails. Network routes remain internal. Legacy GoTravel endpoints retain their existing token contract; migration compatibility mode is not the final transport release configuration.

## Operator runbook

| Observation | Action |
|---|---|
| PUBLISHING + moderation pending | Approve/reject the offer in Catalog. Worker retries; never force ON_SALE in SQL. |
| PUBLISHING + service error | Restore the named dependency/configuration; inspect publish_error and retry timestamp. |
| Completed trip with Cart still CONFIRMED | Check cutoff, boarding states and Cart availability; worker will resume. Do not mark orders complete by hand. |
| CASH_RECEIVED_PENDING_RECONCILIATION | Retain the receipt, inspect hold/ticket state and attention endpoint; no second cash receipt. |
| REFUND_PENDING | Carry out the external refund, then record reference/evidence/exact amount using the existing admin API. A pending case is not a successful bank refund. |
| Failed mail | Correct SMTP configuration/recipient first; use notification retry API. Do not retry by re-running payment callbacks. |
| Replacement trip cancelled during exchange | Inspect both orders/tickets/refunds through reconciliation. Do not move money based only on the difference field. |
| Inventory/GoPay unavailable | Restore dependency and let durable workers retry; manual changes require existing audited support/refund paths. |

## Deferred validation / release

Do not reuse previous passing tests as proof for the additions above. The next validation stage must first generate Prisma client and compile, adapt affected test fixtures to new quote/scoping contracts, then cover lifecycle/review, publication recovery, atomic blocking, no-show races, notification lease recovery, scoped authorization, cash/online exchange and GoTravel regression on isolated migrated databases. No test or provider call was run in this implementation stage.


## Item cancellation / seat and trip exchange

Implementation is present across Cart, Inventory, GoCar and GoPay; it has not been compiled or exercised against migrated databases. Base path for customer/staff operations: `/api/v1/orders/transport`. Each request must use a stable UUID operationId; replaying that UUID with different payload is rejected. Public views exclude signed QR, internal results and commission/shift metadata. Staff need SELL_CASH and scope on both source and target trips; the buyer can act on their own tickets.

| Method and suffix | Input / behavior |
|---|---|
| POST `/{orderId}/items/{itemId}/operation-preview` | `{kind:"CANCEL"}` or `{kind:"EXCHANGE",tripId,seatId,pickupStopId,dropoffStopId}`. Snapshotted cancellation fee, current credit, topup and refundDue; does not reserve a seat. |
| POST `/{orderId}/items/{itemId}/cancel` | `{operationId}`. Cancels only this item, with subset seat release and per-item refund liability. |
| POST `/{orderId}/items/{itemId}/exchange` | `{operationId,tripId,seatId,pickupStopId,dropoffStopId}`. Same operator; replacement seat held while old seat stays SOLD. |
| GET `/item-operations/{id}` | Safe operation view: state/deadline/source/target and exact monetary strings. |
| POST `/item-operations/{id}/retry` | Replays current saga; does not invent receipts or bypass scope. |
| POST `/item-operations/{id}/abort` | Only precommit operations; releases replacement, preserves old ticket and returns actual collected topup through refund liability. |
| POST `/item-operations/{id}/cash-topup` | `{amount:"50000",reference:"..."}`. Actual delta collected by SELL_CASH actor in open shift; immutable. |
| POST `/item-operations/{id}/cash-refund` | `{amount,reference,evidenceUrl,cashShiftId}`. Actual cash refund, open shift, same operator, exact pending liability. |
| GET `/admin/item-operations/attention` | ADMIN: durable unresolved/retry/refund attention records. |
| POST `/admin/item-operations/{id}/retry` | ADMIN: retry downstream operation. |
| POST `/admin/item-operations/{id}/abort` | ADMIN: audited abort request while still precommit. |
| POST `/admin/item-operations/{id}/refund` | ADMIN: `{amount,reference,evidenceUrl,refundMethod:"BANK_TRANSFER"|"CASH",cashShiftId?}`. Registers actual evidence; GoPay ACK is required before projection is marked refunded. |
| GET `/vendor/{orderId}/items/{itemId}/ticket-document` | Explicit SELL_CASH printing document for an ACTIVE CASH ticket with actual original receipt; QR is returned here, never in generic staff lists/manifests. |

All IDs above are UUIDs. Exchange example (money fields omitted because only backend supplies payable amounts):

```json
{
  "operationId": "9709faac-f281-42ac-b91a-f1cdd015ac12",
  "tripId": "22222222-2222-4222-8222-222222222222",
  "seatId": "33333333-3333-4333-8333-333333333333",
  "pickupStopId": "44444444-4444-4444-8444-444444444444",
  "dropoffStopId": "55555555-5555-4555-8555-555555555555"
}
```

For an ONLINE operation with positive topup and state WAITING_FUNDS, call the existing GoPay payment creation contract using **operationId as orderId**. Cart's trusted payment summary returns GOCAR_EXCHANGE and exactly the delta. Do not create a new ordinary ticket order or charge the replacement's entire fare. CASH operations explicitly reject online session creation; use cash-topup. Backend contracts exist now; shared customer payment portal/frontend integration remains a later phase.

`PREPARED → HELD → WAITING_FUNDS → COMMITTING → TICKET_COMMITTED → SETTLING → COMPLETED/REFUND_PENDING`. Precommit abort uses `ABORTING → ABORTED/ABORT_REFUND_PENDING`. A positive delta is actual funding, a negative delta is an actual refund liability. After ticket commit, recovery moves forward; an HTTP timeout does not prove the ticket was unchanged. The operation keeps original order/item/ticket IDs and increases revision/token generation. Exchange notification carries the new signed QR; the previous token fails check-in.

Cancellation preserves other ACTIVE items and never marks the entire order REFUNDED while active tickets remain. The parent total remains the original amount charged; current effective fares and actual refunds are returned separately. Completion reads current trip/seat/revision, and blocks pending operations until settled. A late paid callback for an aborted operation opens an actual refund liability instead of losing the payment.

## Additional internal contracts

These paths require internal caller credentials and must stay inaccessible through public routing. Bodies below are trusted server plans, never browser amounts.

| Service | Method / path | Caller and contract |
|---|---|---|
| Cart | GET `/api/v1/internal/orders/transport/item-operations/{id}` | GoCar/GoPay read persisted plan + current coordinator state. |
| Cart | GET `/api/v1/internal/orders/transport/item-operations/{id}/cash-proof` and `/refund-proof` | Only GoPay reads actual evidence with operator/shift/amount/actor/snapshots. |
| Inventory | PUT `/api/v1/internal/inventory/transport/item-operations/{prepare|commit|complete|abort}` | Cart plan operationId/orderId/itemId/requestHash/old and new seats/expiry. Idempotent acknowledgement states. |
| Inventory | GET `/api/v1/internal/inventory/transport/item-operations/{id}` | GoCar/Cart read operation state. |
| Inventory | GET `/api/v1/internal/inventory/transport/orders/{orderId}/trips/{tripId}/seats/{seatId}` | Actual SOLD ownership used for current ticket check-in. |
| GoCar | PUT `/api/v1/internal/car/transport/item-operations/{id}/{prepare|commit|abort}` | Cart only. GoCar reads back Cart plan/state; commit verifies authoritative Inventory. |
| GoPay | PUT `/api/v1/internal/payments/transport/item-operations/{id}/{reserve|fund|commit|abort|refund}` | Cart only. GoPay reads actual sources/proofs from Cart and own payments. |
| GoPay | GET `/api/v1/internal/payments/transport/funds-report?ownerUserId&from&to` | Cart report integration; actual collections/refunds/ledger rather than booked totals. |

Inventory runs a native expired replacement hold worker every 15 seconds. Only HELD reservations expire; COMMITTED inventory remains reserved for recovery. Abort before prepare creates a tombstone so delayed prepare cannot reopen it. Coordinator workers are restartable and use conditional transitions; no manual SQL force-completion is part of the supported recovery flow.

## Transport settlement and administrative operations

| Method / full path | Access / behavior |
|---|---|
| POST `/api/v1/payouts/transport/{payoutId}/withdraw` | Owner: Cart must confirm terminal order; ledger must have no outstanding money operation. Computes net funds and snapshot commission. |
| PUT `/api/v1/payouts/transport/{payoutId}/mark-paid` | ADMIN: `{amount,reference,evidenceUrl}` matching net payable. Stores immutable actual payout proof before PAID. |
| POST `/trips/:tripId/admin-cancellation` | ADMIN: `{reason}`. Durable cancellation even when operator is suspended; fees waived only against real local trip cancellation intent. |
| PUT `/trips/:tripId/admin-lifecycle` | ADMIN: `{status:"DEPARTED"|"COMPLETED"}` with state/time/cancellation guards and versioned Inventory synchronization. |

GoPay stores per-item funding lots, immutable delta/fee/refund events and original payout basis. Commission contributions are retained at numeric(24,6) precision and rounded once when closing the net settlement. CASH adjustments retain the original collecting shift and rate/version; bank refunds are not treated as cash drawer payouts. Existing normal payout/bulk withdrawal routes skip TRANSPORT; GoTravel stays on its existing flow. Online exchange topups do not create a second full payout.

Existing transport payouts already PAID while an order is still active cause SOURCE_PAYOUT_ALREADY_PAID when reserving new item credit. Reconcile that legacy history before activation; do not allocate or transfer the original money twice.

## New schema prerequisites — not executed

For the complete older migration list see BACKEND_COMPLETION_PLAN section 15. Add the following, in order within the corresponding service database:

| Database | Additional migration after existing transport migrations |
|---|---|
| Inventory | `BookingandInventory/scripts/2026101104_transport_item_operations.sql` after inventory versioning 1103 |
| Cart | `CartandOrder/scripts/2026101107_transport_notification_revision.sql`, then `2026101108_transport_amendment_recovery.sql`, then `2026101109_transport_item_operations.sql` |
| GoCar | `car/prisma/migrations/20261011130000_item_operations/migration.sql` after commercial profile 11120000 |
| GoPay | `PaymentandWallet/scripts/20261012_transport_item_money.sql` after manual refunds and existing payout/payment schema |

These are separate service databases. Cart and GoCar both contain a table called transport_item_operations with different schemas; never apply both scripts in a shared schema. Use schema history rather than blindly re-running CREATE/ADD statements. Prisma client generation is deferred until validation; the checked-in schema does not regenerate a running server.

Preflight on isolated databases must inspect actual constraint names, unresolved amendment duplicates, legacy PAID transport payouts, active schedule overlaps, old price/class/sale snapshots, per-item originalAmount/departure backfill and legacy refund evidence. Use Asia/Ho_Chi_Minh for old LocalDateTime fields, and UTC Instant for new persisted operation deadlines/events.

## Money fields / email delivery notes

New public money fields are decimal strings: operation preview/view oldAmount/newAmount/fee/topup/refundDue; OrderResponse transportActiveFareAmount and transportOriginalChargeVnd; items transportFareVnd/transportRefundedVnd. Existing shared GoTravel numeric response fields retain compatibility. Treat exact strings as primary on the future GoCar frontend.

Outbox uniqueness is (order_id,kind,event_key); claim increments lease_version and all ACK/error writes require the current unexpired lease. AMENDMENT is supported end to end. Exchange creates a distinct TICKET event for its operation; REFUNDED follows real evidence ACK. Consumer formats VND exactly and accepts rotated signed tokens. SMTP remains at-least-once.

## Remaining release gates

Source inspection and syntax parsing do not prove type safety or business correctness. This turn did not run tests/builds, Prisma generation, migrations or provider calls. Java/Javac is absent in the current environment. Before enabling GoCar: E3 generate/compile (including nested Feign scanning/MapStruct/new Prisma model contracts), A-R21 actual database constraints, E4 isolated race/fault/auth/money tests and GoTravel regression, E5 scoped runtime credentials/migration/release. GoCar ports 3333/3334 remain disabled and the frontend has not been modified.
