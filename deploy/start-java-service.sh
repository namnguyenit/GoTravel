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
exec /home/nhan/bin/java -Xms32m -Xmx160m -Xss256k \
  -XX:+UseSerialGC -XX:+TieredCompilation -XX:TieredStopAtLevel=1 \
  -XX:MaxMetaspaceSize=128m -jar "$jar_path"
