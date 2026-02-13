#!/bin/bash
# PMP CTF AttackBox - Welcome Banner

# Colors
RED='\033[1;31m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
PURPLE='\033[1;35m'
CYAN='\033[1;36m'
WHITE='\033[1;37m'
RESET='\033[0m'

# Only show once per session
if [ -z "${PMP_BANNER_SHOWN:-}" ]; then
    export PMP_BANNER_SHOWN=1
    
    clear
    echo -e "${RED}"
    cat << 'BANNER'
    ██████╗ ███╗   ███╗██████╗      █████╗ ████████╗████████╗ █████╗  ██████╗██╗  ██╗
    ██╔══██╗████╗ ████║██╔══██╗    ██╔══██╗╚══██╔══╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██████╔╝██╔████╔██║██████╔╝    ███████║   ██║      ██║   ███████║██║     █████╔╝ 
    ██╔═══╝ ██║╚██╔╝██║██╔═══╝     ██╔══██║   ██║      ██║   ██╔══██║██║     ██╔═██╗ 
    ██║     ██║ ╚═╝ ██║██║         ██║  ██║   ██║      ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝     ╚═╝     ╚═╝╚═╝         ╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
BANNER
    echo -e "${RESET}"
    
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════════════${RESET}"
    echo -e "${WHITE}                    🔐 Payment Monetization Platform - CTF Lab 🔐${RESET}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════════════${RESET}"
    echo ""
    
    echo -e "${YELLOW}📡 Network Targets:${RESET}"
    echo -e "  ${GREEN}api-gateway${RESET}          ${CYAN}http://api-gateway:8000${RESET}"
    echo -e "  ${GREEN}hsm-simulator${RESET}        ${CYAN}http://hsm-simulator:8011${RESET}"
    echo -e "  ${GREEN}sim-network-switch${RESET}   ${CYAN}http://sim-network-switch:8004${RESET}"
    echo -e "  ${GREEN}sim-issuer-service${RESET}   ${CYAN}http://sim-issuer-service:8005${RESET}"
    echo -e "  ${GREEN}sim-pos-service${RESET}      ${CYAN}http://sim-pos-service:8002${RESET}"
    echo -e "  ${GREEN}acs-simulator${RESET}        ${CYAN}http://acs-simulator:8013${RESET}"
    echo -e "  ${GREEN}sim-fraud-detection${RESET}  ${CYAN}http://sim-fraud-detection:8007${RESET}"
    echo ""
    
    echo -e "${YELLOW}🛠️  Quick Commands:${RESET}"
    echo -e "  ${WHITE}tools${RESET}     ${BLUE}→ List installed security tools${RESET}"
    echo -e "  ${WHITE}lab${RESET}       ${BLUE}→ List all CTF challenges${RESET}"
    echo -e "  ${WHITE}lab HSM-001${RESET} ${BLUE}→ Show challenge walkthrough${RESET}"
    echo ""
    
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════════════${RESET}"
    echo ""
fi
