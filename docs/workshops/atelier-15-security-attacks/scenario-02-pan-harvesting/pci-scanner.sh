#!/bin/bash
#
# Scénario 2 : Scanner PCI-DSS
# Détecte les PAN en clair dans les fichiers
#
# Usage: bash pci-scanner.sh /path/to/scan
#

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "═══════════════════════════════════════════════════════════════"
echo "  🔍 PCI-DSS SCANNER - Détection de PAN en clair"
echo "══════════════════════════════════════════════════════════════="

TARGET_DIR=${1:-.}
REPORT_FILE="pci-scan-report-$(date +%Y%m%d-%H%M%S).txt"

# Patterns de PAN (expressions régulières étendues)
PATTERNS=(
    '4[0-9]{12}([0-9]{3})?'                    # Visa
    '5[1-5][0-9]{14}'                          # Mastercard
    '3[47][0-9]{13}'                           # Amex
    '6(?:011|5[0-9]{2})[0-9]{12}'              # Discover
)

# Patterns dans les logs
LOG_PATTERNS=(
    'PAN[[:space:]]*[:=][[:space:]]*[0-9]{13,19}'
    'card[_-]?number[[:space:]]*[:=][[:space:]]*[0-9]{13,19}'
    '"pan"[[:space:]]*:[[:space:]]*"[0-9]{13,19}"'
    'DE2[[:space:]]*[:=][[:space:]]*[0-9]{13,19}'
)

TOTAL_FILES=0
VULNERABLE_FILES=0
TOTAL_PANS=0

echo ""
echo "📂 Répertoire scanné: $TARGET_DIR"
echo "📅 Date du scan: $(date)"
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""

# Fonction pour scanner un fichier
scan_file() {
    local file=$1
    local found=0
    
    # Scanner avec grep pour les patterns de PAN
    for pattern in "${PATTERNS[@]}" "${LOG_PATTERNS[@]}"; do
        matches=$(grep -Eon "$pattern" "$file" 2>/dev/null | head -20)
        if [ -n "$matches" ]; then
            if [ $found -eq 0 ]; then
                echo -e "${RED}❌ VULNÉRABLE: $file${NC}"
                found=1
                ((VULNERABLE_FILES++))
            fi
            
            while IFS= read -r line; do
                line_num=$(echo "$line" | cut -d: -f1)
                content=$(echo "$line" | cut -d: -f2- | head -c 60)
                # Masquer le PAN pour l'affichage
                masked=$(echo "$content" | sed -E 's/([0-9]{6})[0-9]+([0-9]{4})/\1****\2/g')
                echo "   Ligne $line_num: $masked..."
                ((TOTAL_PANS++))
            done <<< "$matches"
        fi
    done
    
    ((TOTAL_FILES++))
}

# Scanner récursivement les fichiers de log
echo "🔍 Scan en cours..."
echo ""

find "$TARGET_DIR" -type f \( -name "*.log" -o -name "*.txt" -o -name "*.json" -o -name "*.xml" -o -name "*.csv" \) 2>/dev/null | while read -r file; do
    scan_file "$file"
done

# Si aucun fichier trouvé, créer un exemple
if [ $TOTAL_FILES -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Aucun fichier de log trouvé. Création d'un exemple...${NC}"
    echo ""
    
    # Créer un fichier de test vulnérable
    TEST_FILE="/tmp/vulnerable-log-example.log"
    cat > "$TEST_FILE" << 'EOF'
2026-01-28 14:30:22 INFO Transaction processed
  PAN: 4111111111111111
  Amount: 125.00 EUR
  
2026-01-28 14:31:45 DEBUG Auth request
  {"pan": "5500000000000004", "amount": 8999}
  
2026-01-28 14:32:10 INFO DE2=340000000000009
EOF
    
    echo "📄 Fichier de test créé: $TEST_FILE"
    echo ""
    scan_file "$TEST_FILE"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  📊 RÉSUMÉ DU SCAN"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ $VULNERABLE_FILES -gt 0 ]; then
    echo -e "  ${RED}⚠️  VULNÉRABILITÉS DÉTECTÉES${NC}"
    echo ""
    echo "  Fichiers scannés:      $TOTAL_FILES"
    echo "  Fichiers vulnérables:  $VULNERABLE_FILES"
    echo "  PAN détectés:          $TOTAL_PANS"
    echo ""
    echo "  📋 ACTIONS REQUISES:"
    echo "    1. Purger les logs contenant des PAN"
    echo "    2. Implémenter le masking automatique"
    echo "    3. Chiffrer les logs sensibles"
    echo "    4. Mettre à jour la politique de logging"
else
    echo -e "  ${GREEN}✅ AUCUNE VULNÉRABILITÉ DÉTECTÉE${NC}"
    echo ""
    echo "  Fichiers scannés: $TOTAL_FILES"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
