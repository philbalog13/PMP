#!/usr/bin/env bash
set -euo pipefail

required_commands=(
  bash
  curl
  jq
  nc
  nmap
  masscan
  hping3
  tcpdump
  ffuf
  dirb
  nikto
  sqlmap
  hydra
  john
  hashcat
  openssl
  python3
  pip3
  git
  tmux
  docker
  http
)

required_paths=(
  /usr/share/wordlists
  /usr/share/wordlists/pmp-api.txt
  /usr/share/wordlists/common.txt
)

echo "[smoke-tools] Verifying required commands"
for cmd in "${required_commands[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[smoke-tools] Missing command: $cmd" >&2
    exit 1
  fi
done

echo "[smoke-tools] Verifying required paths"
for path in "${required_paths[@]}"; do
  if [ ! -e "$path" ]; then
    echo "[smoke-tools] Missing path: $path" >&2
    exit 1
  fi
done

echo "[smoke-tools] OK"
