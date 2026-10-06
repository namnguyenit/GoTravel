#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
secrets_dir="${GOTRAVEL_SECRETS_DIR:-/home/DoANLienNganh/Identity/.secrets}"

case "${1:-}" in
  identity) module=Identity ;;
  catalog) module=CatalogandListing ;;
  booking) module=BookingandInventory ;;
  cart) module=CartandOrder ;;
  payment) module=PaymentandWallet ;;
  *) echo "Unknown Java service" >&2; exit 2 ;;
esac

jar_path="$project_dir/$module/target/$module-0.0.1-SNAPSHOT.jar"
test -r "$jar_path"
test -r "$secrets_dir/internal.env"

set -a
source "$secrets_dir/internal.env"
if [[ "$module" == Identity ]]; then
  identity_env="${GOTRAVEL_IDENTITY_ENV:-/home/DoANLienNganh/Identity/.env}"
  test -r "$identity_env"
  source "$identity_env"
fi
set +a

export SERVICE_BIND_HOST=127.0.0.1
if [[ "$module" == PaymentandWallet ]]; then
  export GOTRAVEL_PAYMENT_CONFIG="${GOTRAVEL_PAYMENT_CONFIG:-$project_dir/PaymentandWallet/.secrets/vnpay-local.yaml}"
fi
# BCrypt at cost 15 can exceed the Gateway deadline with only the tier-1 compiler.
# Keep full JIT optimization for Identity; retain the smaller compiler profile elsewhere.
compiler_level=1
if [[ "$module" == Identity ]]; then
  compiler_level=4
fi
exec /home/nhan/bin/java -Xms32m -Xmx160m -Xss256k \
  -XX:+UseSerialGC -XX:+TieredCompilation -XX:TieredStopAtLevel="$compiler_level" \
  -XX:MaxMetaspaceSize=128m -jar "$jar_path"
