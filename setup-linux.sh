#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

APP_DB_USER="${APP_DB_USER:-gotravel_db}"
APP_DB_PASSWORD="${APP_DB_PASSWORD:-}"

AUTH_DB_NAME="${AUTH_DB_NAME:-auth_db}"
CATALOG_DB_NAME="${CATALOG_DB_NAME:-cataloglisting}"
BOOKING_DB_NAME="${BOOKING_DB_NAME:-bookinginventory}"
CART_DB_NAME="${CART_DB_NAME:-cartorder}"
PAYMENT_DB_NAME="${PAYMENT_DB_NAME:-paymentwallet}"
RECOMMENDATION_DB_NAME="${RECOMMENDATION_DB_NAME:-recommendation_db}"

CATALOG_READER_ROLE="${CATALOG_READER_ROLE:-catalog_readonly}"
CATALOG_READER_USER="${CATALOG_READER_USER:-catalog_node_reader}"
CATALOG_READER_PASSWORD="${CATALOG_READER_PASSWORD:-}"
RECOMMENDATION_DB_USER="${RECOMMENDATION_DB_USER:-recommendation_user}"
RECOMMENDATION_DB_PASSWORD="${RECOMMENDATION_DB_PASSWORD:-}"

INTERNAL_TOKEN="${INTERNAL_TOKEN:-}"
GATEWAY_PORT="${GATEWAY_PORT:-5555}"
MEDIA_PORT="${MEDIA_PORT:-5001}"
SEARCH_PORT="${SEARCH_PORT:-8086}"
FRONTEND_API_URL="${FRONTEND_API_URL:-http://localhost:${GATEWAY_PORT}/api}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { printf "%b[OK]%b %s\n" "${GREEN}" "${NC}" "$1"; }
info() { printf "%b[INFO]%b %s\n" "${CYAN}" "${NC}" "$1"; }
warn() { printf "%b[WARN]%b %s\n" "${YELLOW}" "${NC}" "$1"; }
error() { printf "%b[ERROR]%b %s\n" "${RED}" "${NC}" "$1"; }

line() {
  printf '%s\n' "============================================================"
}

require_database_passwords() {
  local name
  for name in APP_DB_PASSWORD CATALOG_READER_PASSWORD RECOMMENDATION_DB_PASSWORD; do
    if [[ -z "${!name}" ]]; then
      error "Set $name in the environment before provisioning databases or generating service config"
      return 1
    fi
  done
}

postgres_psql() {
  sudo -u postgres psql -v ON_ERROR_STOP=1 "$@"
}

role_exists() {
  local role="$1"
  postgres_psql -qtAc "SELECT 1 FROM pg_roles WHERE rolname = '$role';"
}

db_exists() {
  local db="$1"
  postgres_psql -qtAc "SELECT 1 FROM pg_database WHERE datname = '$db';"
}

ensure_role_login() {
  local role="$1"
  local password="$2"

  if [[ "$(role_exists "$role")" == "1" ]]; then
    postgres_psql -c "ALTER ROLE \"$role\" WITH LOGIN PASSWORD '$password';"
  else
    postgres_psql -c "CREATE ROLE \"$role\" WITH LOGIN PASSWORD '$password';"
  fi

  postgres_psql -c "ALTER ROLE \"$role\" WITH NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;"
}

ensure_role_nologin() {
  local role="$1"

  if [[ "$(role_exists "$role")" == "1" ]]; then
    postgres_psql -c "ALTER ROLE \"$role\" WITH NOLOGIN;"
  else
    postgres_psql -c "CREATE ROLE \"$role\" NOLOGIN;"
  fi
}

ensure_database() {
  local db="$1"
  local owner="$2"

  if [[ "$(db_exists "$db")" != "1" ]]; then
    postgres_psql -c "CREATE DATABASE \"$db\" OWNER \"$owner\";"
  fi

  postgres_psql -c "ALTER DATABASE \"$db\" OWNER TO \"$owner\";"
  postgres_psql -d "$db" -c "ALTER SCHEMA public OWNER TO \"$owner\";"
  postgres_psql -d "$db" -c "GRANT ALL PRIVILEGES ON DATABASE \"$db\" TO \"$owner\";"
  postgres_psql -d "$db" -c "GRANT ALL ON SCHEMA public TO \"$owner\";"
}

install_system_packages() {
  line
  info "INSTALLING SYSTEM PACKAGES"
  line

  sudo apt-get update -qq
  sudo apt-get install -y -qq \
    curl wget gnupg ca-certificates \
    build-essential git unzip \
    libvips-dev \
    postgresql postgresql-contrib postgis \
    redis-server nginx ufw

  log "System packages installed"
}

install_java() {
  if java -version 2>&1 | grep -q 'version "17'; then
    log "Java 17 already installed"
    return
  fi

  info "Installing Java 17 (Temurin)"
  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL https://packages.adoptium.net/artifactory/api/gpg/key/public \
    | sudo tee /etc/apt/keyrings/adoptium.asc >/dev/null
  echo "deb [signed-by=/etc/apt/keyrings/adoptium.asc] https://packages.adoptium.net/artifactory/deb $(lsb_release -cs 2>/dev/null || echo bookworm) main" \
    | sudo tee /etc/apt/sources.list.d/adoptium.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq temurin-17-jdk
  log "Java 17 installed"
}

install_node() {
  if node -v 2>/dev/null | grep -q '^v22'; then
    log "Node.js 22 already installed"
  else
    info "Installing Node.js 22 LTS"
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
    sudo apt-get install -y -qq nodejs
    log "Node.js $(node -v) installed"
  fi

  if command -v pm2 >/dev/null 2>&1; then
    log "PM2 already installed"
  else
    info "Installing PM2 globally"
    sudo npm install -g pm2 yarn --silent
    log "PM2 installed"
  fi
}

setup_databases() {
  require_database_passwords
  line
  info "SETTING UP POSTGRESQL DATABASES"
  line

  sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null || true

  ensure_role_login "$APP_DB_USER" "$APP_DB_PASSWORD"
  ensure_role_login "$RECOMMENDATION_DB_USER" "$RECOMMENDATION_DB_PASSWORD"
  ensure_role_nologin "$CATALOG_READER_ROLE"
  ensure_role_login "$CATALOG_READER_USER" "$CATALOG_READER_PASSWORD"

  ensure_database "$AUTH_DB_NAME" "$APP_DB_USER"
  ensure_database "$CATALOG_DB_NAME" "$APP_DB_USER"
  ensure_database "$BOOKING_DB_NAME" "$APP_DB_USER"
  ensure_database "$CART_DB_NAME" "$APP_DB_USER"
  ensure_database "$PAYMENT_DB_NAME" "$APP_DB_USER"
  ensure_database "$RECOMMENDATION_DB_NAME" "$RECOMMENDATION_DB_USER"

  postgres_psql -d "$CATALOG_DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS postgis;"
  postgres_psql -d "$CATALOG_DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS unaccent;"
  postgres_psql -d "$CATALOG_DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

  postgres_psql -d "$RECOMMENDATION_DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

  postgres_psql -d "$CATALOG_DB_NAME" -c "GRANT CONNECT ON DATABASE \"$CATALOG_DB_NAME\" TO \"$CATALOG_READER_ROLE\";"
  postgres_psql -d "$CATALOG_DB_NAME" -c "GRANT USAGE ON SCHEMA public TO \"$CATALOG_READER_ROLE\";"
  postgres_psql -d "$CATALOG_DB_NAME" -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"$CATALOG_READER_ROLE\";"
  postgres_psql -d "$CATALOG_DB_NAME" -c "ALTER DEFAULT PRIVILEGES FOR ROLE \"$APP_DB_USER\" IN SCHEMA public GRANT SELECT ON TABLES TO \"$CATALOG_READER_ROLE\";"
  postgres_psql -d "$CATALOG_DB_NAME" -c "ALTER ROLE \"$CATALOG_READER_USER\" SET search_path TO public;"
  postgres_psql -d "$CATALOG_DB_NAME" -c "GRANT \"$CATALOG_READER_ROLE\" TO \"$CATALOG_READER_USER\";"

  log "Databases and roles configured"
}

setup_redis() {
  line
  info "CONFIGURING REDIS"
  line

  sudo systemctl enable redis-server 2>/dev/null || true
  sudo systemctl start redis-server 2>/dev/null || sudo service redis-server start 2>/dev/null || true

  if redis-cli ping 2>/dev/null | grep -q PONG; then
    log "Redis is running"
  else
    warn "Redis may not have started cleanly"
  fi
}

generate_keystore() {
  (
    umask 077
    local secret_dir="$PROJECT_DIR/Identity/.secrets"
    local keystore_path="$secret_dir/identity-signing.jks"
    local env_path="$PROJECT_DIR/Identity/.env"
    local keytool_bin="${KEYTOOL_BIN:-keytool}"

    if [[ -e "$keystore_path" || -e "$env_path" ]]; then
      if [[ -f "$keystore_path" && -f "$env_path" ]]; then
        log "Identity JWT keystore already exists outside Git"
        return
      fi
      error "Incomplete Identity JWT secrets; inspect $secret_dir and $env_path before retrying"
      return 1
    fi

    mkdir -p "$secret_dir"
    if command -v setfacl >/dev/null 2>&1; then
      setfacl -b -k "$secret_dir"
    fi
    chmod 700 "$secret_dir"
    local temp_dir
    temp_dir="$(mktemp -d "$secret_dir/.generate-XXXXXXXX")"
    trap 'rm -rf "$temp_dir"' EXIT

    local jwt_password jwt_key_id
    jwt_password="$(openssl rand -hex 32)"
    jwt_key_id="identity-$(openssl rand -hex 12)"
    JWT_KEYSTORE_PASSWORD="$jwt_password" "$keytool_bin" -genkeypair \
      -alias identity-key \
      -keyalg RSA \
      -keysize 3072 \
      -storetype JKS \
      -keystore "$temp_dir/identity-signing.jks" \
      -storepass:env JWT_KEYSTORE_PASSWORD \
      -keypass:env JWT_KEYSTORE_PASSWORD \
      -dname "CN=GoTravel Identity, O=GoTravel, C=VN" \
      -validity 3650 >/dev/null

    printf 'JWT_KEYSTORE_PATH=%q\nJWT_KEYSTORE_PASSWORD=%s\nJWT_KEY_ID=%s\nJWT_KEY_ALIAS=identity-key\n' \
      "$keystore_path" "$jwt_password" "$jwt_key_id" > "$temp_dir/.env"
    if command -v setfacl >/dev/null 2>&1; then
      setfacl -b "$temp_dir/identity-signing.jks" "$temp_dir/.env"
    fi
    chmod 600 "$temp_dir/identity-signing.jks" "$temp_dir/.env"
    mv "$temp_dir/identity-signing.jks" "$keystore_path"
    mv "$temp_dir/.env" "$env_path"
    log "Identity JWT keystore generated outside Git; restart every JWT verifier when deploying"
  )
}

generate_env_files() {
  require_database_passwords
  line
  info "GENERATING ENV FILES"
  line

  umask 077
  mkdir -p Identity/.secrets
  if [[ -z "$INTERNAL_TOKEN" && -f Identity/.secrets/internal.env ]]; then
    INTERNAL_TOKEN="$(sed -n 's/^INTERNAL_SERVICE_TOKEN=//p' Identity/.secrets/internal.env | head -n 1)"
  fi
  if [[ -z "$INTERNAL_TOKEN" ]]; then
    INTERNAL_TOKEN="$(openssl rand -hex 32)"
  fi
  printf 'INTERNAL_SERVICE_TOKEN=%s\n' "$INTERNAL_TOKEN" > Identity/.secrets/internal.env
  chmod 600 Identity/.secrets/internal.env

  local csrf_secret
  csrf_secret="${CSRF_SECRET:-}"
  if [[ -z "$csrf_secret" && -f APIGateway/.env ]]; then
    csrf_secret="$(sed -n 's/^CSRF_SECRET=//p' APIGateway/.env | head -n 1)"
  fi
  if [[ -z "$csrf_secret" ]]; then
    csrf_secret="$(openssl rand -hex 32)"
  fi

  cat > APIGateway/.env <<EOF
GATEWAY_PORT=${GATEWAY_PORT}
GATEWAY_BIND_HOST=127.0.0.1
TRUST_PROXY=loopback
IDENTITY_SERVICE_URL=http://localhost:8080
MEDIA_SERVICE_URL=http://localhost:${MEDIA_PORT}
CATALOG_SERVICE_URL=http://localhost:8082
BOOKING_SERVICE_URL=http://localhost:8083
CART_SERVICE_URL=http://localhost:8084
PAYMENT_SERVICE_URL=http://localhost:8085
SEARCH_SERVICE_URL=http://localhost:${SEARCH_PORT}
INTERNAL_SERVICE_TOKEN=${INTERNAL_TOKEN}
CSRF_SECRET=${csrf_secret}
AUTH_COOKIE_DOMAIN=nonnet123.io.vn
EOF
  log "APIGateway/.env created"

  cat > cloudinary-service/.env <<EOF
MEDIA_PORT=${MEDIA_PORT}
MEDIA_BIND_HOST=127.0.0.1
IDENTITY_SERVICE_URL=http://localhost:8080
INTERNAL_SERVICE_TOKEN=${INTERNAL_TOKEN}
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EOF
  log "cloudinary-service/.env created"

  cat > search-and-recommendation/.env <<EOF
PORT=${SEARCH_PORT}
SERVICE_BIND_HOST=127.0.0.1
NODE_ENV=production
CATALOG_DB_HOST=localhost
CATALOG_DB_PORT=5432
CATALOG_DB_NAME=${CATALOG_DB_NAME}
CATALOG_DB_USER=${CATALOG_READER_USER}
CATALOG_DB_PASSWORD=${CATALOG_READER_PASSWORD}
RECOMMENDATION_DB_HOST=localhost
RECOMMENDATION_DB_PORT=5432
RECOMMENDATION_DB_NAME=${RECOMMENDATION_DB_NAME}
RECOMMENDATION_DB_USER=${RECOMMENDATION_DB_USER}
RECOMMENDATION_DB_PASSWORD=${RECOMMENDATION_DB_PASSWORD}
REDIS_URL=redis://localhost:6379
INVENTORY_SERVICE_URL=http://localhost:8083
INTERNAL_SERVICE_TOKEN=${INTERNAL_TOKEN}
EOF
  log "search-and-recommendation/.env created"

  cat > front_end/.env <<EOF
NEXT_PUBLIC_API_URL=${FRONTEND_API_URL}
EOF
  log "front_end/.env created"
}

build_all() {
  line
  info "BUILDING SERVICES"
  line

  for svc in Identity CatalogandListing BookingandInventory CartandOrder PaymentandWallet; do
    info "Building $svc"
    (
      cd "$svc"
      chmod +x mvnw
      ./mvnw clean package -DskipTests -q
    )
    log "$svc built"
  done

  for svc in APIGateway cloudinary-service search-and-recommendation; do
    info "Installing Node dependencies in $svc"
    (cd "$svc" && npm install --silent)
  done

  info "Building search-and-recommendation"
  (cd search-and-recommendation && npm run build --silent)
  log "search-and-recommendation built"

  info "Building frontend"
  (cd front_end && npm install --silent && npm run build)
  log "front_end built"
}

stop_services() {
  line
  info "STOPPING PM2 SERVICES"
  line

  if command -v pm2 >/dev/null 2>&1; then
    pm2 delete all 2>/dev/null || true
    pm2 kill 2>/dev/null || true
    log "PM2 services stopped"
  else
    warn "PM2 is not installed"
  fi
}

usage() {
  cat <<EOF
Usage: $0 [command]

Commands:
  install     Install system dependencies
  setup-db    Create databases, users, roles, and extensions
  setup-redis Configure Redis
  keystore    Generate the Identity JWT keystore
  env         Generate .env files for all Node apps
  build       Build Java, Node, and frontend services
  stop        Stop all PM2 services for this project
  all         Run install, db, redis, keystore, env, build
  help        Show this help

No args is equivalent to 'all'.
EOF
}

main() {
  case "${1:-all}" in
    install)
      install_system_packages
      install_java
      install_node
      ;;
    setup-db)
      setup_databases
      ;;
    setup-redis)
      setup_redis
      ;;
    keystore)
      generate_keystore
      ;;
    env)
      generate_env_files
      ;;
    build)
      build_all
      ;;
    stop)
      stop_services
      ;;
    all|"")
      info "Starting full environment setup"
      install_system_packages
      install_java
      install_node
      setup_databases
      setup_redis
      generate_keystore
      generate_env_files
      build_all
      line
      log "ENVIRONMENT SETUP COMPLETE"
      line
      printf 'Next steps:\n'
      printf '  1. Edit cloudinary-service/.env with real Cloudinary credentials.\n'
      printf '  2. Start the stack with run-all.sh or your PM2 entrypoint.\n'
      ;;
    help|--help|-h)
      usage
      ;;
    *)
      error "Unknown command: $1"
      usage
      exit 1
      ;;
  esac
}

main "$@"
