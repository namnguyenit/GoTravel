#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
secrets_dir="${GOTRAVEL_SECRETS_DIR:-$project_dir/Identity/.secrets}"
test -r "$project_dir/car/.env"
test -r "$secrets_dir/internal.env"
set -a
source "$project_dir/car/.env"
source "$secrets_dir/internal.env"
set +a
export GOCAR_ENABLED=true
export SERVICE_BIND_HOST=127.0.0.1
exec /home/nhan/.nodejs-22/bin/node --max-old-space-size=160 "$project_dir/car/dist/main.js"
