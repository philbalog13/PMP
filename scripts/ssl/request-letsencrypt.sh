#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but was not found." >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "docker compose (plugin) or docker-compose is required." >&2
  exit 1
fi

COMPOSE_FILE_PATH="${PMP_COMPOSE_FILE:-}"
COMPOSE_CMD=("${COMPOSE[@]}")
if [ -n "${COMPOSE_FILE_PATH}" ]; then
  COMPOSE_CMD+=(-f "${COMPOSE_FILE_PATH}")
fi

CERT_PATH="${ROOT_DIR}/nginx/ssl/cert.pem"
KEY_PATH="${ROOT_DIR}/nginx/ssl/key.pem"

is_cert_pem() {
  local path="$1"
  [ -f "${path}" ] && grep -q "BEGIN CERTIFICATE" "${path}"
}

is_key_pem() {
  local path="$1"
  [ -f "${path}" ] && grep -Eq "BEGIN (RSA |EC )?PRIVATE KEY" "${path}"
}

ensure_bootstrap_tls() {
  if is_cert_pem "${CERT_PATH}" && is_key_pem "${KEY_PATH}"; then
    return
  fi

  echo "Bootstrap TLS certificate missing/invalid. Generating a temporary self-signed cert..."
  if command -v openssl >/dev/null 2>&1; then
    openssl req -x509 -nodes -newkey rsa:2048 -sha256 \
      -keyout "${KEY_PATH}" \
      -out "${CERT_PATH}" \
      -days 2 \
      -subj "/CN=localhost" >/dev/null 2>&1
    return
  fi

  echo "Local openssl not found, using nginx:alpine image to generate bootstrap cert..."
  docker run --rm \
    -v "${ROOT_DIR}/nginx/ssl:/out" \
    nginx:alpine sh -c \
    "openssl req -x509 -nodes -newkey rsa:2048 -sha256 \
      -keyout /out/key.pem \
      -out /out/cert.pem \
      -days 2 \
      -subj '/CN=localhost'" >/dev/null 2>&1
}

: "${LETSENCRYPT_EMAIL:?Set LETSENCRYPT_EMAIL in your environment or .env}"
: "${LETSENCRYPT_DOMAINS:?Set LETSENCRYPT_DOMAINS as comma-separated domains (example.com,www.example.com)}"

CERT_NAME="${LETSENCRYPT_CERT_NAME:-pmp}"
STAGING="${LETSENCRYPT_STAGING:-0}"

mkdir -p certbot/conf certbot/www nginx/ssl
ensure_bootstrap_tls

IFS=',' read -r -a RAW_DOMAINS <<< "${LETSENCRYPT_DOMAINS}"
DOMAIN_ARGS=()
for domain in "${RAW_DOMAINS[@]}"; do
  trimmed="$(echo "${domain}" | xargs)"
  if [ -n "${trimmed}" ]; then
    DOMAIN_ARGS+=("-d" "${trimmed}")
  fi
done

if [ "${#DOMAIN_ARGS[@]}" -eq 0 ]; then
  echo "No valid domains found in LETSENCRYPT_DOMAINS." >&2
  exit 1
fi

STAGING_ARGS=()
if [ "${STAGING}" = "1" ]; then
  STAGING_ARGS+=("--staging")
  echo "Using Let's Encrypt staging environment."
fi

echo "Starting nginx (HTTP challenge endpoint)..."
if ! "${COMPOSE_CMD[@]}" up -d --no-deps nginx; then
  echo "Nginx could not start in isolated mode, retrying with dependencies..."
  "${COMPOSE_CMD[@]}" up -d nginx
fi

echo "Requesting certificate for: ${LETSENCRYPT_DOMAINS}"
docker run --rm \
  -v "${ROOT_DIR}/certbot/conf:/etc/letsencrypt" \
  -v "${ROOT_DIR}/certbot/www:/var/www/certbot" \
  -v "${ROOT_DIR}/nginx/ssl:/etc/nginx/ssl" \
  -v "${ROOT_DIR}/scripts/ssl:/opt/ssl:ro" \
  certbot/certbot:latest certonly \
  --webroot -w /var/www/certbot \
  --email "${LETSENCRYPT_EMAIL}" \
  --agree-tos \
  --no-eff-email \
  --cert-name "${CERT_NAME}" \
  --keep-until-expiring \
  --preferred-challenges http \
  "${STAGING_ARGS[@]}" \
  "${DOMAIN_ARGS[@]}" \
  --deploy-hook "sh /opt/ssl/certbot-deploy-hook.sh"

if ! is_cert_pem "${CERT_PATH}" || ! is_key_pem "${KEY_PATH}"; then
  echo "Certificate deployment failed: nginx/ssl/cert.pem or nginx/ssl/key.pem is invalid." >&2
  exit 1
fi

echo "Starting automatic renewal service..."
"${COMPOSE_CMD[@]}" up -d certbot-renew

echo "Reloading nginx..."
"${COMPOSE_CMD[@]}" exec -T nginx nginx -s reload

echo "Done. HTTPS certificate deployed for cert name '${CERT_NAME}'."
