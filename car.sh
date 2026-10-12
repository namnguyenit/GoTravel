#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================================="
echo "   Starting GoTravel Car Stack Services & Gateway        "
echo "=========================================================="
echo " 1. Car Frontend    : cd front-end-goticket && pnpm dev"
echo " 2. Car Service     : cd car && pnpm dev"
echo " 3. Identity Service: cd Identity && mvnw.cmd spring-boot:run"
echo " 4. API Gateway     : cd APIGateway && npm run dev"
echo "=========================================================="

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    if command -v cygpath >/dev/null 2>&1; then
        WIN_DIR=$(cygpath -w "$PROJECT_DIR")
    else
        WIN_DIR="C:\\HocTap\\GoStay"
    fi

    cmd //c start "1. Car Frontend (port 3000)" cmd //k "title 1. Car Frontend (port 3000) && cd /d ${WIN_DIR}\front-end-goticket && pnpm dev"
    cmd //c start "2. Car Service (port 3333)" cmd //k "title 2. Car Service (port 3333) && cd /d ${WIN_DIR}\car && pnpm dev"
    cmd //c start "3. Identity Service (port 8080)" cmd //k "title 3. Identity Service (port 8080) && cd /d ${WIN_DIR}\Identity && mvnw.cmd spring-boot:run"
    cmd //c start "4. API Gateway (port 5555)" cmd //k "title 4. API Gateway (port 5555) && cd /d ${WIN_DIR}\APIGateway && npm run dev"
else
    (cd "$PROJECT_DIR/front-end-goticket" && pnpm dev) &
    (cd "$PROJECT_DIR/car" && pnpm dev) &
    (cd "$PROJECT_DIR/Identity" && ./mvnw spring-boot:run) &
    (cd "$PROJECT_DIR/APIGateway" && npm run dev) &

    echo "Services running in background. Press Ctrl+C to stop all."
    trap 'kill $(jobs -p)' EXIT INT TERM
    wait
fi

echo "All 4 services started successfully!"
