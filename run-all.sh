#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

APP_PREFIX="gostay"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
echo -e "${GREEN}[OK]${NC} $1"
}

info() {
echo -e "${CYAN}[INFO]${NC} $1"
}

warn() {
echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
echo -e "${RED}[ERROR]${NC} $1"
}

line() {
echo "============================================================"
}

if ! command -v pm2 >/dev/null 2>&1; then
error "PM2 is not installed"
exit 1
fi

clean_java_service() {

local svc=$1

info "Cleaning Java build artifacts: $svc"

(
    cd "$svc"
    rm -rf target
    chmod +x mvnw
    ./mvnw clean -q
)

}

build_java() {

line
info "BUILDING JAVA SERVICES"
line

JAVA_SERVICES=(
    "Identity"
    "CatalogandListing"
    "BookingandInventory"
    "CartandOrder"
    "PaymentandWallet"
)

for svc in "${JAVA_SERVICES[@]}"
do
    line
    info "Building service: $svc"
    info "Start time: $(date '+%Y-%m-%d %H:%M:%S')"
    line

    (
        clean_java_service "$svc"
        cd "$svc"
        ./mvnw package -DskipTests
    )

    log "$svc build completed"
    echo
done

}

prepare_node() {

line
info "PREPARING NODE SERVICES"
line

NODE_SERVICES=(
    "APIGateway"
    "cloudinary-service"
    "search-and-recommendation"
)

for svc in "${NODE_SERVICES[@]}"
do
    line
    info "Preparing service: $svc"
    line

    (
        cd "$svc"
        rm -rf dist .cache node_modules/.cache
        npm install
        if [ -f nest-cli.json ]; then
            npm run build
        fi
    )

    log "$svc ready"
    echo
done

}

build_frontend() {

line
info "BUILDING FRONTEND"
line

(
    cd front_end

    info "Cleaning frontend build cache"
    rm -rf .next .turbo node_modules/.cache
    npm cache clean --force

    npm install

    npm run build
)

log "Frontend build completed"

}

start_java_service() {

local svc_name=$1
local dir=$2

local jar_file

jar_file=$(find "$dir/target" \
    -maxdepth 1 \
    -name "*.jar" \
    ! -name "*plain.jar" \
    | head -n 1)

if [ -z "$jar_file" ]; then
    error "Jar file not found for $svc_name"
    return 1
fi

info "Starting $svc_name"
info "Jar: $jar_file"

if [ "$svc_name" = "identity" ]; then
    if [ ! -f "$dir/.env" ]; then
        error "Identity/.env is missing; run ./setup-linux.sh keystore first"
        return 1
    fi
    (
        set -a
        # Identity/.env contains the untracked JWT signing credentials.
        source "$dir/.env"
        if [ -f "$PROJECT_DIR/Identity/.secrets/internal.env" ]; then
            source "$PROJECT_DIR/Identity/.secrets/internal.env"
        fi
        set +a
        pm2 start java \
            --name "${APP_PREFIX}-${svc_name}" \
            -- -Xms64m -Xmx256m -Xss384k -XX:+UseG1GC -jar "$jar_file"
    )
else
    (
        set -a
        if [ -f "$PROJECT_DIR/Identity/.secrets/internal.env" ]; then
            source "$PROJECT_DIR/Identity/.secrets/internal.env"
        fi
        set +a
        pm2 start java \
            --name "${APP_PREFIX}-${svc_name}" \
            -- -Xms64m -Xmx256m -Xss384k -XX:+UseG1GC -jar "$jar_file"
    )
fi

log "$svc_name started"

}

start_node_service() {

local svc_name=$1
local dir=$2
local script=$3

info "Starting $svc_name"
info "Directory: $dir"
info "Script: $script"

pm2 start "$script" \
    --name "${APP_PREFIX}-${svc_name}" \
    --cwd "$dir"

log "$svc_name started"

}

start_frontend() {

info "Starting frontend"

pm2 start npm \
    --name "${APP_PREFIX}-frontend" \
    --cwd front_end \
    -- run start

log "Frontend started"

}

start_all() {

line
info "STARTING ALL SERVICES"
line

start_java_service identity Identity
start_java_service catalog CatalogandListing
start_java_service booking BookingandInventory
start_java_service cart CartandOrder
start_java_service payment PaymentandWallet

start_node_service media cloudinary-service src/media-server.js

start_node_service search search-and-recommendation dist/main.js

start_node_service gateway APIGateway server.js
start_node_service payment-portal payment_portal server.js

start_frontend

pm2 save

line
log "ALL SERVICES STARTED"
line

pm2 status

}

stop_all() {

line
info "STOPPING PM2 SERVICES"
line

pm2 delete all 2>/dev/null || true

log "All PM2 services removed"

}

show_logs() {
pm2 logs
}

usage() {
echo "Usage:"
echo "./run-all.sh build"
echo "./run-all.sh start"
echo "./run-all.sh stop"
echo "./run-all.sh restart"
echo "./run-all.sh status"
echo "./run-all.sh logs"
echo "./run-all.sh all"
}

case "${1:-all}" in

build)
    build_java
    prepare_node
    build_frontend
    ;;

start)
    start_all
    ;;

stop)
    stop_all
    ;;

restart)
    stop_all
    build_java
    prepare_node
    build_frontend
    start_all
    ;;

status)
    pm2 status
    ;;

logs)
    show_logs
    ;;

all|"")
    stop_all
    build_java
    prepare_node
    build_frontend
    start_all
    ;;

help|-h|--help)
    usage
    ;;

*)
    error "Unknown command: $1"
    usage
    exit 1
    ;;

esac
