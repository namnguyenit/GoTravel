#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR/auth_front-end"

echo "=========================================================="
echo "   Khởi chạy GoTravel SSO Auth Portal (Port 3335)         "
echo "   Domain nội bộ: http://localhost:3335                   "
echo "   Domain Cloudflare: https://auth.nonnet123.io.vn        "
echo "=========================================================="

pnpm dev
