#!/bin/bash
# Script pour démarrer tous les services backend PMP

echo "🚀 Démarrage des services backend PMP..."

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Services et leurs ports
declare -A SERVICES=(
    ["api-gateway"]="8000"
    ["sim-card-service"]="8001"
    ["sim-pos-service"]="8002"
    ["sim-acquirer-service"]="8003"
    ["sim-network-switch"]="8004"
    ["sim-issuer-service"]="8005"
    ["sim-auth-engine"]="8006"
    ["sim-fraud-detection"]="8007"
    ["hsm-sim"]="8008"
    ["crypto-edu"]="8009"
    ["crypto-service"]="8010"
    ["key-management"]="8012"
)

# Install dependencies for each service
install_deps() {
    for service in "${!SERVICES[@]}"; do
        if [ -d "$service" ]; then
            echo -e "${YELLOW}📦 Installing $service...${NC}"
            (cd "$service" && npm install --silent 2>/dev/null)
        fi
    done
}

# Start all services
start_services() {
    for service in "${!SERVICES[@]}"; do
        port=${SERVICES[$service]}
        if [ -d "$service" ]; then
            echo -e "${GREEN}▶️  Starting $service on port $port${NC}"
            (cd "$service" && npm run dev &) 2>/dev/null
        fi
    done
}

# Check health of all services
check_health() {
    echo -e "\n${YELLOW}🏥 Checking service health...${NC}"
    sleep 3
    for service in "${!SERVICES[@]}"; do
        port=${SERVICES[$service]}
        if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service (port $port) - healthy${NC}"
        else
            echo -e "${RED}❌ $service (port $port) - not responding${NC}"
        fi
    done
}

case "$1" in
    install)
        install_deps
        ;;
    start)
        start_services
        check_health
        ;;
    health)
        check_health
        ;;
    *)
        echo "Usage: $0 {install|start|health}"
        echo "  install - Install dependencies for all services"
        echo "  start   - Start all services"
        echo "  health  - Check health of all services"
        ;;
esac
