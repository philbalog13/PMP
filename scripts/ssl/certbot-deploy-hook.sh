#!/bin/sh
set -eu

TARGET_CERT="/etc/nginx/ssl/cert.pem"
TARGET_KEY="/etc/nginx/ssl/key.pem"

SOURCE_LINEAGE="${RENEWED_LINEAGE:-/etc/letsencrypt/live/${LETSENCRYPT_CERT_NAME:-pmp}}"
SOURCE_CERT="${SOURCE_LINEAGE}/fullchain.pem"
SOURCE_KEY="${SOURCE_LINEAGE}/privkey.pem"

if [ ! -f "${SOURCE_CERT}" ] || [ ! -f "${SOURCE_KEY}" ]; then
  echo "[certbot-hook] Certificate files not found in ${SOURCE_LINEAGE}; skipping copy."
  exit 0
fi

mkdir -p /etc/nginx/ssl
cp "${SOURCE_CERT}" "${TARGET_CERT}"
cp "${SOURCE_KEY}" "${TARGET_KEY}"
chmod 644 "${TARGET_CERT}"
chmod 600 "${TARGET_KEY}"

echo "[certbot-hook] Updated Nginx TLS certificate from ${SOURCE_LINEAGE}."
