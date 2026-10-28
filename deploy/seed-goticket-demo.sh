#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="${NODE_BIN:-/home/nhan/.nodejs-22/bin/node}"
if [[ "${1:-}" == "--profile" && "${2:-}" == "legacy" ]]; then
  shift 2
  exec bash "$ROOT_DIR/deploy/seeds/goticket/legacy-seed.sh" "$@"
fi
if [[ ! -x "$NODE_BIN" ]]; then NODE_BIN="$(command -v node || true)"; fi
if [[ ! -x "$NODE_BIN" ]]; then echo 'Cần Node.js >=22.13' >&2; exit 1; fi
if [[ ! -d "$ROOT_DIR/deploy/seeds/goticket/runner/node_modules/pg" ]]; then
  echo 'Chạy npm ci --prefix deploy/seeds/goticket/runner trước khi seed.' >&2; exit 1
fi
exec "$NODE_BIN" --disable-warning=ExperimentalWarning "$ROOT_DIR/deploy/seeds/goticket/runner/src/cli.mjs" "$@"
