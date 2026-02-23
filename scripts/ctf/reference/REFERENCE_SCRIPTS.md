# CTF reference scripts (safe)

These scripts provide replayable reference exploit paths by category for controlled PMP lab environments.

## Location
- `scripts/ctf/reference`

## Preconditions
- Services up (docker compose or equivalent):
  - `api-gateway`
  - `sim-network-switch`
  - `sim-fraud-detection`
  - `hsm-simulator`
  - `acs-simulator`
  - `sim-issuer-service`
- Tools in shell: `bash`, `curl`, `jq`, `base64`

## Environment variables
- `STUDENT_ID` (default: `student-reference`)
- `API_GATEWAY_URL` (default: `http://api-gateway:8000`)
- `NETWORK_SWITCH_URL` (default: `http://sim-network-switch:8004`)
- `FRAUD_URL` (default: `http://sim-fraud-detection:8007`)
- `HSM_URL` (default: `http://hsm-simulator:8011`)
- `ACS_URL` (default: `http://acs-simulator:8013`)
- `ISSUER_URL` (default: `http://sim-issuer-service:8005`)

For BOSS scripts only:
- `BOSS_CODE` (default: `BOSS-001`)
- `PROOF_FLAGS_CSV` (comma-separated list of prerequisite flags)

## Run one category
Example:
```bash
STUDENT_ID=student-01 bash scripts/ctf/reference/replay_attack.sh
```

## Run by generic runner
Example:
```bash
STUDENT_ID=student-01 bash scripts/ctf/reference/run-category.sh replay_attack
```

## Run all safe categories
```bash
STUDENT_ID=student-01 bash scripts/ctf/reference/run-all-safe.sh
```

## Category wrappers
- `3ds_bypass.sh`
- `advanced_fraud.sh`
- `boss.sh`
- `crypto_weakness.sh`
- `emv_cloning.sh`
- `fraud_cnp.sh`
- `hsm_attack.sh`
- `iso8583_manipulation.sh`
- `key_management.sh`
- `mitm.sh`
- `network_attack.sh`
- `pin_cracking.sh`
- `privilege_escalation.sh`
- `replay_attack.sh`
- `supply_chain.sh`
- `token_vault.sh`

## Safety notes
- Use only in dedicated PMP lab/CTF environments.
- Scripts are designed as controlled references, not offensive tooling for external targets.
- Some categories require pre-seeded challenge state to return flags.

