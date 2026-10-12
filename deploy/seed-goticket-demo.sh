#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SEED_DIR="$ROOT_DIR/deploy/seeds/goticket"
CAR_ENV="$ROOT_DIR/car/.env"
SECRETS_DIR="${GOTRAVEL_SECRETS_DIR:-$ROOT_DIR/Identity/.secrets}"
INTERNAL_ENV="$SECRETS_DIR/internal.env"
NODE_BIN="${NODE_BIN:-/home/nhan/.nodejs-22/bin/node}"
DB_HOST="${SEED_DB_HOST:-127.0.0.1}"
DB_PORT="${SEED_DB_PORT:-5432}"
DB_USER="${SEED_DB_USER:-gotravel_db}"
DB_PASSWORD="${SEED_DB_PASSWORD:-123456}"

if [[ ! -f "$CAR_ENV" ]]; then
  echo "Missing $CAR_ENV" >&2
  exit 1
fi
if [[ ! -r "$INTERNAL_ENV" ]]; then
  echo "Missing $INTERNAL_ENV" >&2
  exit 1
fi
if [[ ! -x "$NODE_BIN" ]]; then
  echo "Node.js 22 executable not found: $NODE_BIN" >&2
  exit 1
fi

set -a
source "$CAR_ENV"
source "$INTERNAL_ENV"
set +a

if [[ -z "${DATABASE_URL:-}" || -z "${TICKET_SIGNING_KEY:-}" ]]; then
  echo "car/.env must define DATABASE_URL and TICKET_SIGNING_KEY" >&2
  exit 1
fi
if [[ ${#TICKET_SIGNING_KEY} -lt 32 ]]; then
  echo "TICKET_SIGNING_KEY must contain at least 32 characters" >&2
  exit 1
fi

CAR_DATABASE_URL="${DATABASE_URL%%\?*}"

ticket_token() {
  local ticket_id="$1"
  local item_id="$2"
  TICKET_ID="$ticket_id" ORDER_ITEM_ID="$item_id" TICKET_SIGNING_KEY="$TICKET_SIGNING_KEY" \
    "$NODE_BIN" -e 'const c=require("node:crypto");const m=process.env.TICKET_ID+":"+process.env.ORDER_ITEM_ID;const s=c.createHmac("sha256",process.env.TICKET_SIGNING_KEY).update(m).digest("base64url");process.stdout.write(process.env.TICKET_ID+"."+process.env.ORDER_ITEM_ID+"."+s)'
}

token_hash() {
  TOKEN_VALUE="$1" "$NODE_BIN" -e 'const c=require("node:crypto");process.stdout.write(c.createHash("sha256").update(process.env.TOKEN_VALUE).digest("hex"))'
}

TICKET1_TOKEN="$(ticket_token 62000000-0000-4000-8000-000000000001 61000000-0000-4000-8000-000000000001)"
TICKET3_TOKEN="$(ticket_token 62000000-0000-4000-8000-000000000003 61000000-0000-4000-8000-000000000003)"
TICKET4_TOKEN="$(ticket_token 62000000-0000-4000-8000-000000000004 61000000-0000-4000-8000-000000000004)"
TICKET5_TOKEN="$(ticket_token 62000000-0000-4000-8000-000000000005 61000000-0000-4000-8000-000000000005)"

shared_psql() {
  local database="$1"
  shift
  PGPASSWORD="$DB_PASSWORD" psql -X -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$database" -v ON_ERROR_STOP=1 "$@"
}

echo "[1/7] Identity demo accounts"
shared_psql auth_db -f "$SEED_DIR/01-identity.sql"

echo "[2/7] GoCar operators, fleet, routes and trips"
psql -X "$CAR_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SEED_DIR/02-car.sql"

echo "[3/7] Catalog transport offers"
shared_psql cataloglisting -f "$SEED_DIR/03-catalog.sql"

echo "[4/7] Transport inventory and holds"
shared_psql bookinginventory -f "$SEED_DIR/04-inventory.sql"

echo "[5/7] Orders, items, cash and disputes"
shared_psql cartorder \
  -v ticket1_token="$TICKET1_TOKEN" \
  -v ticket3_token="$TICKET3_TOKEN" \
  -v ticket4_token="$TICKET4_TOKEN" \
  -v ticket5_token="$TICKET5_TOKEN" \
  -f "$SEED_DIR/05-orders.sql"

echo "[6/7] Signed GoCar tickets"
psql -X "$CAR_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v ticket1_hash="$(token_hash "$TICKET1_TOKEN")" \
  -v ticket3_hash="$(token_hash "$TICKET3_TOKEN")" \
  -v ticket4_hash="$(token_hash "$TICKET4_TOKEN")" \
  -v ticket5_hash="$(token_hash "$TICKET5_TOKEN")" \
  -f "$SEED_DIR/06-car-tickets.sql"

echo "[7/7] Payment and payout snapshots"
shared_psql paymentwallet -f "$SEED_DIR/07-payments.sql"

echo
echo "GoTicket demo seed is ready."
echo "Login password for every goticket_* account: GoTicket@123"
echo "Customers: goticket_customer01 .. goticket_customer05"
echo "Vendors:   goticket_vendor01 .. goticket_vendor03"
echo "Staff:     goticket_staff01 .. goticket_staff02"
echo "Trips are generated relative to the current Vietnam date."

