# GoTicket demo seed

Run from the repository root:

```bash
./deploy/seed-goticket-demo.sh
```

The seed is intentionally small and uses deterministic UUIDs. It upserts its own
records and does not delete existing GoTravel or GoTicket data.

All `goticket_*` accounts use password `GoTicket@123`.

| Group | Accounts | Main scenario |
|---|---|---|
| Customer | `goticket_customer01` to `goticket_customer05` | Confirmed online ticket, pending payment, completed trip, refunded ticket, cash ticket |
| Vendor | `goticket_vendor01` to `goticket_vendor03` | Three approved operators with fleet, stops, routes and trips |
| Staff | `goticket_staff01`, `goticket_staff02` | Full counter/check-in permissions and trip-scoped permissions |
| Admin | Existing `admin` account | Pending/rejected operator applications, orders and disputes |

The seed creates 3 operators, 3 vehicles, 36 seat templates, 6 routes, 10
trips, 6 active Catalog offers, Inventory snapshots, 5 example orders, 4
signed tickets, one cash shift/receipt, two disputes, and matching payment and
payout snapshots.

Departure dates are relative to the Vietnam database date so public search
always has trips for tomorrow and the following day. Re-running the script
refreshes the seed-owned dates and the pending payment expiration. It does not
reset bookings or other records created manually after the seed.

