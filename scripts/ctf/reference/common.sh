#!/usr/bin/env bash
set -euo pipefail

STUDENT_ID="${STUDENT_ID:-student-reference}"
API_GATEWAY_URL="${API_GATEWAY_URL:-http://api-gateway:8000}"
NETWORK_SWITCH_URL="${NETWORK_SWITCH_URL:-http://sim-network-switch:8004}"
FRAUD_URL="${FRAUD_URL:-http://sim-fraud-detection:8007}"
HSM_URL="${HSM_URL:-http://hsm-simulator:8011}"
ACS_URL="${ACS_URL:-http://acs-simulator:8013}"
ISSUER_URL="${ISSUER_URL:-http://sim-issuer-service:8005}"

ctf::need() {
  for tool in "$@"; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      echo "[ERROR] Missing required tool: $tool" >&2
      exit 1
    fi
  done
}

ctf::header() {
  echo
  echo "==== $* ===="
}

ctf::request() {
  local method="$1"
  local url="$2"
  local body="${3:-}"

  if [[ -n "$body" ]]; then
    curl -sS -X "$method" \
      -H "x-student-id: $STUDENT_ID" \
      -H "Content-Type: application/json" \
      "$url" \
      -d "$body"
  else
    curl -sS -X "$method" \
      -H "x-student-id: $STUDENT_ID" \
      "$url"
  fi
}

ctf::json() {
  if command -v jq >/dev/null 2>&1; then
    jq .
  else
    cat
  fi
}

ctf::post_json() {
  local url="$1"
  local body="${2:-{}}"
  ctf::request POST "$url" "$body"
}

ctf::put_json() {
  local url="$1"
  local body="${2:-{}}"
  ctf::request PUT "$url" "$body"
}

ctf::get_json() {
  local url="$1"
  ctf::request GET "$url"
}

