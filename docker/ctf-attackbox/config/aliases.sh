#!/bin/bash
# PMP CTF AttackBox - Additional Aliases

# Target shortcuts with colored output
alias targets='echo -e "\n\033[1;33m📡 PMP CTF Targets:\033[0m\n  \033[1;32mapi-gateway\033[0m       → \033[1;36mhttp://api-gateway:8000\033[0m\n  \033[1;32mhsm-simulator\033[0m     → \033[1;36mhttp://hsm-simulator:8011\033[0m\n  \033[1;32mnetwork-switch\033[0m    → \033[1;36mhttp://sim-network-switch:8004\033[0m\n  \033[1;32missuer-service\033[0m    → \033[1;36mhttp://sim-issuer-service:8005\033[0m\n  \033[1;32mpos-service\033[0m       → \033[1;36mhttp://sim-pos-service:8002\033[0m\n  \033[1;32macs-simulator\033[0m     → \033[1;36mhttp://acs-simulator:8013\033[0m\n  \033[1;32mfraud-detection\033[0m   → \033[1;36mhttp://sim-fraud-detection:8007\033[0m\n"'

# Scan all targets
alias scanall='for port in 8000 8002 8004 8005 8007 8011 8013; do echo -e "\n\033[1;33mScanning port $port...\033[0m"; nmap -sV -p $port api-gateway hsm-simulator sim-network-switch sim-issuer-service sim-pos-service acs-simulator sim-fraud-detection 2>/dev/null | grep -E "open|Host"; done'

# Quick recon
alias recon='echo -e "\033[1;33m[*] Starting reconnaissance...\033[0m" && nmap -sn 172.18.0.0/24 2>/dev/null | grep -E "scan report|Host is"'

# HTTP shortcuts
alias GET='curl -sS -X GET'
alias POST='curl -sS -X POST -H "Content-Type: application/json"'
alias PUT='curl -sS -X PUT -H "Content-Type: application/json"'
alias PATCH='curl -sS -X PATCH -H "Content-Type: application/json"'
alias DELETE='curl -sS -X DELETE'

# Pretty JSON
alias json='jq .'
alias jsonc='jq -C .'

# Directory fuzzing shortcut
fuzz() {
    local target="${1:-http://api-gateway:8000}"
    echo -e "\033[1;33m[*] Fuzzing $target...\033[0m"
    ffuf -u "$target/FUZZ" -w /usr/share/wordlists/common.txt -mc 200,201,204,301,302,400,401,403 -c
}

# Health check all services
healthcheck() {
    echo -e "\033[1;33m[*] Checking service health...\033[0m"
    for svc in "api-gateway:8000" "hsm-simulator:8011" "sim-network-switch:8004" "sim-issuer-service:8005" "sim-pos-service:8002" "acs-simulator:8013" "sim-fraud-detection:8007"; do
        host="${svc%%:*}"
        port="${svc##*:}"
        if curl -sf "http://$svc/health" > /dev/null 2>&1 || curl -sf "http://$svc/" > /dev/null 2>&1; then
            echo -e "  \033[1;32m✓\033[0m $host:$port"
        else
            echo -e "  \033[1;31m✗\033[0m $host:$port"
        fi
    done
}

# Clear screen alias
alias cls='clear'
alias c='clear'

# System info
alias sysinfo='neofetch 2>/dev/null || (echo -e "\033[1;36mPMP CTF AttackBox\033[0m"; uname -a)'
