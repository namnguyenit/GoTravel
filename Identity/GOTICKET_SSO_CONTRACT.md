# Shared Identity contract for GoTravel and GoTicket

## Account ownership

Identity is the only account authority. A user has one `users.id` UUID, one login, and the existing `USER` role across both products. The JWT `sub` is this UUID. GoTicket must use that UUID as `identity_user_id` in its own vendor and booking data when its backend is refactored. Existing GoTicket integer user IDs must not be treated as Identity IDs.

The shared account keeps `username`, `email`, password/provider, `fullName`, `phoneNumber`, `dateOfBirth`, avatar, status and roles. `createdAt` and `lastLoginAt` support account administration. Passenger names, identification, contact details and travel documents belong to each ticket order; Identity does not store them as a default passenger profile.

`HOST` remains the GoTravel accommodation role. A transport operator receives the separate `TICKET_VENDOR` role only after its GoTicket application is approved. An existing `HOST` may also apply for `TICKET_VENDOR`; approval in one product does not grant the other product's permissions. `ADMIN` is the shared platform administrator.

## Ticket vendor application

1. The account submits company name, address, representative name and identity number, optional tax code/contact number, and two document images through `POST /api/v1/me/ticket-vendor-application` (multipart form data).
2. Identity stores the application as `PENDING` and uploads the documents to the secure media endpoint. `GET /api/v1/me/upgrade-applications` includes its current state and history.
3. Admin reviews applications at `GET /api/v1/admin/ticket-vendors?status=PENDING` and approves or rejects through `PUT /api/v1/admin/ticket-vendors/{identityUserId}/approval` with `{ "status": "APPROVED" | "REJECTED", "reason": "..." }`.
4. Approval grants `TICKET_VENDOR`; rejection leaves the shared user account usable and records the reason. A rejected application can be updated and resubmitted through `PUT /api/v1/me/ticket-vendor-application`.
5. The user calls `POST /api/v1/auth/refresh-roles` or logs in again to receive a JWT with the new role.

Identity owns verification and role state. GoTicket owns routes, vehicles, schedules, seat inventory, sales and operational vendor status. Its vendor record should reference the approved Identity UUID; it must also enforce its own active/suspended state.

## Token contract

Identity signs RS256 JWTs. `iss` remains `com.gotravel.identity`; `aud` contains both `gotravel-api` and `goticket-api` for backwards compatibility. `scope` contains space-separated `ROLE_*` values, including `ROLE_TICKET_VENDOR` only after approval. The public key is available from `/.well-known/jwks.json`. The API Gateway checks current Identity approval status on requests carrying `ROLE_TICKET_VENDOR`; a stale token can still call `refresh-roles` to remove the revoked role. GoTicket must also verify signature, issuer, audience, expiry and the current application and operational vendor statuses if it accepts tokens directly.

The current GoTicket Laravel backend still has its own integer users and JWT authentication. It is **not yet connected** to this Identity contract; that migration is the next backend phase.

## Production database change

Production Identity uses Hibernate `ddl-auto: validate`. Apply both SQL files in `Identity/migrations/` to `auth_db` before deploying this Identity version. Existing accounts retain `NULL` in `created_at` because their true creation time is unavailable. New accounts receive it automatically; successful password logins populate `last_login_at`.
