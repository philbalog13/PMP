#!/usr/bin/env sh
set -eu

CTF_DATA_DIR="/opt/attackbox/ctf-data"
HINT_STATE_DIR="/tmp/.lab-hints"

STUDENT_ID="${CTF_STUDENT_ID:-}"
if [ -z "$STUDENT_ID" ] && [ -n "${CTF_STUDENT_TOKEN:-}" ]; then
  _payload="$(printf '%s' "$CTF_STUDENT_TOKEN" | cut -d. -f2)"
  _mod=$(( ${#_payload} % 4 ))
  if [ "$_mod" -eq 2 ]; then _payload="${_payload}=="; elif [ "$_mod" -eq 3 ]; then _payload="${_payload}="; fi
  _payload="$(printf '%s' "$_payload" | tr '_-' '/+')"
  STUDENT_ID="$(printf '%s' "$_payload" | base64 -d 2>/dev/null | grep -o '"userId":"[^"]*"' | cut -d'"' -f4 || true)"
fi

if [ -n "$STUDENT_ID" ]; then
  echo "[CTF] Identifiant etudiant: $STUDENT_ID"
else
  echo "[CTF] Identifiant etudiant non detecte."
fi

mkdir -p "$HINT_STATE_DIR"

list_codes() {
  if [ ! -d "$CTF_DATA_DIR" ]; then
    return 0
  fi

  grep -Rho "code: '[A-Z0-9-]\+'" "$CTF_DATA_DIR" 2>/dev/null \
    | sed -E "s/.*'([A-Z0-9-]+)'.*/\1/" \
    | sort -u
}

find_code_block() {
  code="$1"
  match="$(grep -RIn "code: '$code'" "$CTF_DATA_DIR" 2>/dev/null | head -n 1 || true)"
  if [ -z "$match" ]; then
    return 1
  fi

  file="$(printf '%s' "$match" | cut -d: -f1)"
  line="$(printf '%s' "$match" | cut -d: -f2)"
  end="$((line + 40))"
  sed -n "${line},${end}p" "$file"
}

extract_field() {
  field="$1"
  block="$2"
  printf '%s\n' "$block" | sed -n "s/.*$field: '\([^']*\)'.*/\1/p" | head -n 1
}

extract_points() {
  block="$1"
  printf '%s\n' "$block" | sed -n "s/.*points: \([0-9][0-9]*\).*/\1/p" | head -n 1
}

attack_class_for_code() {
  code="$1"
  case "$code" in
    HSM-*|KEY-*) echo "HSM Attack / Broken Access Control" ;;
    PIN-*) echo "PIN Security / Weak Authentication" ;;
    REPLAY-*) echo "Replay Attack / Missing Idempotency" ;;
    MITM-*|NET-*) echo "Network Attack / Insecure Transport" ;;
    ISO-*) echo "ISO8583 Manipulation" ;;
    3DS-*) echo "3DS Bypass / Authentication Workflow" ;;
    FRAUD-*|ADV-FRAUD-*) echo "Fraud Evasion / Business Logic" ;;
    TOKEN-*) echo "Token Vault / Data Exposure" ;;
    EMV-*) echo "EMV Weakness / Trust Boundary" ;;
    PRIV-*) echo "Privilege Escalation / Broken Authorization" ;;
    CRYPTO-*) echo "Crypto Weakness" ;;
    INFRA-*) echo "Supply Chain / Misconfiguration" ;;
    BOSS-*) echo "Multi-stage Red Team Chain" ;;
    *) echo "Security Misconfiguration" ;;
  esac
}

tools_for_code() {
  code="$1"
  case "$code" in
    MITM-*|NET-*|ISO-*) echo "nmap, tshark, curl" ;;
    HSM-*|KEY-*|PIN-*) echo "nmap, ffuf, curl" ;;
    3DS-*|FRAUD-*|ADV-FRAUD-*|REPLAY-*) echo "curl, jq" ;;
    TOKEN-*|CRYPTO-*) echo "curl, python" ;;
    INFRA-*) echo "ffuf, curl, grep" ;;
    BOSS-*) echo "nmap, tshark, ffuf" ;;
    *) echo "nmap, curl" ;;
  esac
}

evidence_area_for_code() {
  code="$1"
  case "$code" in
    HSM-*|KEY-*|PIN-*) echo "Cherchez dans les headers, le body et les logs selon le comportement observe." ;;
    MITM-*|NET-*|ISO-*) echo "Concentrez-vous sur la capture de trafic et les champs protocole modifies." ;;
    3DS-*) echo "Observez les statuts de flow et les identifiants de transaction." ;;
    FRAUD-*|ADV-FRAUD-*|REPLAY-*) echo "Comparez plusieurs requetes identiques et les decisions associees." ;;
    TOKEN-*|CRYPTO-*) echo "Cherchez la preuve dans la structure des valeurs et leur previsibilite." ;;
    INFRA-*) echo "Priorite aux artefacts de config, scripts tiers et surfaces admin exposees." ;;
    BOSS-*) echo "Assemblez des preuves successives sur toute la chaine d exploitation." ;;
    *) echo "Capturez une preuve avant/apres avec artefacts verifiables." ;;
  esac
}

show_mission() {
  code="$1"
  block="$(find_code_block "$code" || true)"
  if [ -z "$block" ]; then
    echo "Challenge introuvable: $code"
    exit 1
  fi

  title="$(extract_field title "$block")"
  category="$(extract_field category "$block")"
  points="$(extract_points "$block")"
  description="$(extract_field description "$block")"

  if [ -z "$title" ]; then title="$code"; fi
  if [ -z "$category" ]; then category="UNKNOWN"; fi
  if [ -z "$points" ]; then points="0"; fi

  cat <<EOF
[MISSION] $code - $title
[CATEGORY] $(attack_class_for_code "$code") [$category] [POINTS] $points

CONTEXT
-------
$description

TARGET ENVIRONMENT
------------------
Reseau cible: 10.10.10.0/24
Les hostnames ne sont PAS fournis. Commencez par la decouverte reseau.

OBJECTIVE
---------
1. Identifier l hote et le service exposes
2. Enumerer et confirmer le comportement vulnerable
3. Obtenir une preuve exploitable et recuperer le flag associe

Tapez: lab hint $code
pour debloquer des indices progressifs (cout: 5, 12, 25 points).
EOF
}

show_hint() {
  code="$1"
  state_key="${STUDENT_ID:-anonymous}_${code}"
  state_file="$HINT_STATE_DIR/$state_key"

  current=0
  if [ -f "$state_file" ]; then
    current="$(cat "$state_file" 2>/dev/null || echo 0)"
  fi

  case "$current" in
    0) level=1 ;;
    1) level=2 ;;
    2) level=3 ;;
    *) level=3 ;;
  esac

  printf '%s' "$level" > "$state_file"

  case "$level" in
    1)
      echo "[HINT 1 - 5 pts]"
      echo "Categorie d attaque: $(attack_class_for_code "$code")."
      ;;
    2)
      echo "[HINT 2 - 12 pts]"
      echo "Outils suggeres: $(tools_for_code "$code")."
      ;;
    3)
      echo "[HINT 3 - 25 pts]"
      echo "Zone de preuve: $(evidence_area_for_code "$code")"
      ;;
  esac
}

show_help() {
  cat <<'EOF'
Usage:
  lab <CHALLENGE_CODE>
  lab hint <CHALLENGE_CODE>

Examples:
  lab HSM-001
  lab hint HSM-001

Available challenges:
EOF
  list_codes | tr '\n' ' '
  echo
}

if [ $# -eq 0 ]; then
  show_help
  exit 0
fi

if [ "$1" = "hint" ]; then
  if [ $# -lt 2 ]; then
    echo "Usage: lab hint <CHALLENGE_CODE>"
    exit 1
  fi
  code="$(printf '%s' "$2" | tr '[:lower:]' '[:upper:]')"
  show_hint "$code"
  exit 0
fi

code="$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]')"
show_mission "$code"