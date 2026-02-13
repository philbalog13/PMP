#!/bin/bash
# PMP CTF AttackBox - Tools List

# Colors
RED='\033[1;31m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
PURPLE='\033[1;35m'
CYAN='\033[1;36m'
WHITE='\033[1;37m'
RESET='\033[0m'

echo ""
echo -e "${PURPLE}╔═══════════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${PURPLE}║${RESET}           ${WHITE}🛠️  PMP CTF AttackBox - Security Tools${RESET}                     ${PURPLE}║${RESET}"
echo -e "${PURPLE}╚═══════════════════════════════════════════════════════════════════════╝${RESET}"
echo ""

echo -e "${YELLOW}📡 Network Scanning:${RESET}"
echo -e "  ${GREEN}nmap${RESET}      → Network exploration and security auditing"
echo -e "  ${GREEN}masscan${RESET}   → TCP port scanner (faster than nmap)"
echo -e "  ${GREEN}hping3${RESET}    → Packet crafting and network testing"
echo -e "  ${GREEN}netcat${RESET}    → TCP/UDP connections and transfers (nc)"
echo -e "  ${GREEN}socat${RESET}     → Multipurpose relay tool"
echo -e "  ${GREEN}tcpdump${RESET}   → Packet capture and analysis"
echo ""

echo -e "${YELLOW}🌐 Web Testing:${RESET}"
echo -e "  ${GREEN}curl${RESET}      → Transfer data from/to servers"
echo -e "  ${GREEN}httpie${RESET}    → User-friendly HTTP client (http)"
echo -e "  ${GREEN}ffuf${RESET}      → Fast web fuzzer"
echo -e "  ${GREEN}gobuster${RESET}  → Directory/file brute-forcer"
echo -e "  ${GREEN}dirb${RESET}      → Web content scanner"
echo -e "  ${GREEN}nikto${RESET}     → Web server vulnerability scanner"
echo -e "  ${GREEN}sqlmap${RESET}    → SQL injection exploitation"
echo ""

echo -e "${YELLOW}🔑 Password & Crypto:${RESET}"
echo -e "  ${GREEN}hydra${RESET}     → Network login cracker"
echo -e "  ${GREEN}john${RESET}      → Password cracker (John the Ripper)"
echo -e "  ${GREEN}hashcat${RESET}   → Advanced password recovery"
echo -e "  ${GREEN}openssl${RESET}   → Cryptography toolkit"
echo ""

echo -e "${YELLOW}📚 Wordlists:${RESET}"
echo -e "  ${CYAN}/usr/share/wordlists/${RESET}"
echo -e "  ${CYAN}/usr/share/seclists/${RESET}"
echo ""

echo -e "${YELLOW}🔧 Utilities:${RESET}"
echo -e "  ${GREEN}jq${RESET}        → JSON processor"
echo -e "  ${GREEN}python3${RESET}   → Python scripting"
echo -e "  ${GREEN}git${RESET}       → Version control"
echo -e "  ${GREEN}vim/nano${RESET}  → Text editors"
echo -e "  ${GREEN}tmux${RESET}      → Terminal multiplexer"
echo -e "  ${GREEN}htop${RESET}      → Process viewer"
echo ""

echo -e "${YELLOW}⚡ Quick Commands:${RESET}"
echo -e "  ${WHITE}targets${RESET}      → Show all PMP targets"
echo -e "  ${WHITE}healthcheck${RESET}  → Check service availability"
echo -e "  ${WHITE}scanall${RESET}      → Scan all target ports"
echo -e "  ${WHITE}recon${RESET}        → Quick network discovery"
echo -e "  ${WHITE}fuzz <url>${RESET}   → Directory fuzzing"
echo -e "  ${WHITE}lab${RESET}          → List CTF challenges"
echo ""
