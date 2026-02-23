#!/usr/bin/env bash
# PMP CTF AttackBox - Tools List

set -euo pipefail

echo
echo "=============================================================="
echo "PMP CTF AttackBox - Security Tooling"
echo "=============================================================="
echo

echo "[Network]"
echo "  nmap, masscan, hping3, nc, socat, tcpdump"
echo

echo "[Web]"
echo "  curl, http, ffuf, dirb, nikto, sqlmap, jq"
echo

echo "[Password and Crypto]"
echo "  hydra, john, hashcat, openssl"
echo

echo "[Scripting and Ops]"
echo "  python3, pip3, git, tmux, docker"
echo

echo "[Wordlists]"
echo "  /usr/share/wordlists/pmp-api.txt"
echo "  /usr/share/wordlists/common.txt"
echo

echo "[Quick Commands]"
echo "  targets          -> show all PMP targets"
echo "  healthcheck      -> check service availability"
echo "  scanall          -> scan all target ports"
echo "  recon            -> quick network discovery"
echo "  fuzz <url>       -> directory fuzzing"
echo "  lab              -> list CTF challenges"
echo
