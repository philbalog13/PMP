#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

categories=(
  replay_attack
  crypto_weakness
  3ds_bypass
  fraud_cnp
  iso8583_manipulation
  hsm_attack
  pin_cracking
  mitm
  privilege_escalation
  emv_cloning
  token_vault
  network_attack
  key_management
  advanced_fraud
  supply_chain
)

for category in "${categories[@]}"; do
  echo
  echo "### Running category: $category"
  "$SCRIPT_DIR/run-category.sh" "$category"
done

echo

echo "Reference scripts completed."

