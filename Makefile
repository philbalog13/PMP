# ==============================================
# Makefile for Plateforme Monétique Pédagogique
# ==============================================

.PHONY: help start stop restart logs logs-follow test status clean keys init build ps health ssl-init ssl-renew-start ssl-renew-stop prod prod-lite prod-lite-ui prod-lite-full dev monitoring ctf full down down-lite down-volumes trim-docker

# Colors for terminal output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# ==============================================
# Help target
# ==============================================

help: ## Display this help message
	@echo "$(BLUE)=========================================$(NC)"
	@echo "$(BLUE)  Plateforme Monétique Pédagogique (PMP)$(NC)"
	@echo "$(BLUE)=========================================$(NC)"
	@echo ""
	@echo "$(GREEN)Available commands:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(BLUE)=========================================$(NC)"

# ==============================================
# Setup and initialization
# ==============================================

keys: ## Generate cryptographic test keys
	@echo "$(GREEN)Generating cryptographic keys...$(NC)"
	@chmod +x scripts/load-test-keys.sh
	@bash scripts/load-test-keys.sh
	@echo "$(GREEN)✓ Keys generated successfully$(NC)"

init: keys ## Initialize the platform (generate keys and build)
	@echo "$(GREEN)Initializing PMP platform...$(NC)"
	@chmod +x scripts/init-databases.sh
	@echo "$(GREEN)✓ Initialization complete$(NC)"

build: ## Build all Docker images
	@echo "$(GREEN)Building Docker images...$(NC)"
	@docker-compose build --parallel
	@echo "$(GREEN)✓ Build complete$(NC)"

ssl-init: ## Request Let's Encrypt cert and deploy to Nginx
	@echo "$(GREEN)Requesting Let's Encrypt certificate...$(NC)"
	@chmod +x scripts/ssl/request-letsencrypt.sh
	@bash scripts/ssl/request-letsencrypt.sh
	@echo "$(GREEN)✓ Certificate deployed$(NC)"

ssl-renew-start: ## Start automatic Let's Encrypt renewal
	@docker-compose up -d certbot-renew
	@echo "$(GREEN)✓ certbot-renew started$(NC)"

ssl-renew-stop: ## Stop automatic Let's Encrypt renewal
	@docker-compose stop certbot-renew
	@echo "$(YELLOW)certbot-renew stopped$(NC)"

# ==============================================
# Profile-based deployments (optimisation cloud)
# ==============================================
# Profils disponibles :
#   (aucun)     → services core uniquement  (23 conteneurs, ~4GB RAM)
#   dev         → + pgadmin
#   monitoring  → + prometheus, grafana, elasticsearch, kibana, dashboards
#   ctf         → + ctf-attackbox
# ==============================================

prod: ## Démarrer les services core uniquement (prod optimisée)
	@echo "$(GREEN)Démarrage PMP - mode production (services core)...$(NC)"
	@docker compose up -d
	@echo ""
	@echo "$(GREEN)✓ Plateforme démarrée (23 conteneurs)$(NC)"
	@echo ""
	@echo "$(BLUE)Accès :$(NC)"
	@echo "  • Portail:             $(YELLOW)http://localhost:3000$(NC)"
	@echo "  • Interface client:    $(YELLOW)http://localhost:3001$(NC)"
	@echo "  • Cards web:           $(YELLOW)http://localhost:3004$(NC)"
	@echo "  • HSM web:             $(YELLOW)http://localhost:3006$(NC)"
	@echo "  • 3DS Challenge:       $(YELLOW)http://localhost:3088$(NC)"
	@echo "  • API Gateway:         $(YELLOW)http://localhost:8000$(NC)"
	@echo "  • Nginx (HTTPS):       $(YELLOW)https://localhost$(NC)"
	@echo ""

prod-lite: ## Demarrer la prod minimale (RAM/cout optimises)
	@echo "$(GREEN)Demarrage PMP - mode prod-lite (cout optimise)...$(NC)"
	@docker compose -f docker-compose.yml -f docker-compose.prod-lite.yml up -d
	@echo "$(GREEN)OK Prod-lite demarree (UI extra et extensions desactivees)$(NC)"

prod-lite-ui: ## Prod-lite + interfaces additionnelles (3001/3004/3006/3088)
	@echo "$(GREEN)Demarrage PMP - prod-lite + interfaces additionnelles...$(NC)"
	@docker compose -f docker-compose.yml -f docker-compose.prod-lite.yml --profile ui-extra up -d
	@echo "$(GREEN)OK Prod-lite UI demarree$(NC)"

prod-lite-full: ## Prod-lite + interfaces + extensions 3DS/tokenisation
	@echo "$(GREEN)Demarrage PMP - prod-lite complet...$(NC)"
	@docker compose -f docker-compose.yml -f docker-compose.prod-lite.yml --profile ui-extra --profile extensions up -d
	@echo "$(GREEN)OK Prod-lite complet demarre$(NC)"

dev: ## Démarrer en mode développement (prod + pgadmin)
	@echo "$(GREEN)Démarrage PMP - mode développement...$(NC)"
	@docker compose --profile dev up -d
	@echo "$(GREEN)✓ Plateforme démarrée avec PgAdmin sur :5050$(NC)"

monitoring: ## Démarrer avec le stack monitoring (prod + prometheus/grafana/elasticsearch)
	@echo "$(GREEN)Démarrage PMP - avec monitoring...$(NC)"
	@docker compose --profile monitoring up -d
	@echo ""
	@echo "$(GREEN)✓ Monitoring activé$(NC)"
	@echo "$(BLUE)Accès monitoring :$(NC)"
	@echo "  • Prometheus:          $(YELLOW)http://localhost:9090$(NC)"
	@echo "  • Grafana:             $(YELLOW)http://localhost:3002$(NC)"
	@echo "  • Kibana:              $(YELLOW)http://localhost:5601$(NC)"
	@echo "  • Dashboard:           $(YELLOW)http://localhost:3082$(NC)"
	@echo ""

ctf: ## Démarrer en mode CTF (prod + ctf-attackbox)
	@echo "$(GREEN)Démarrage PMP - mode CTF...$(NC)"
	@docker compose --profile ctf up -d
	@echo "$(GREEN)✓ CTF Attackbox démarrée sur :7681$(NC)"

full: ## Démarrer tous les services (31 conteneurs)
	@echo "$(GREEN)Démarrage PMP - mode complet (31 conteneurs)...$(NC)"
	@docker compose --profile dev --profile monitoring --profile ctf up -d
	@echo "$(GREEN)✓ Tous les services démarrés$(NC)"

down: ## Arrêter et supprimer les conteneurs (tous profils)
	@echo "$(RED)Arrêt de PMP...$(NC)"
	@docker compose --profile dev --profile monitoring --profile ctf down
	@echo "$(GREEN)✓ Plateforme arrêtée$(NC)"

down-lite: ## Arreter le deploiement prod-lite
	@echo "$(RED)Arret de PMP (prod-lite)...$(NC)"
	@docker compose -f docker-compose.yml -f docker-compose.prod-lite.yml --profile ui-extra --profile extensions down
	@echo "$(GREEN)OK Prod-lite arretee$(NC)"

down-volumes: ## Arrêter et supprimer conteneurs ET volumes (⚠ PERTE DE DONNÉES)
	@echo "$(RED)⚠ ATTENTION : suppression de toutes les données !$(NC)"
	@read -p "Confirmer ? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose --profile dev --profile monitoring --profile ctf down -v; \
		echo "$(GREEN)✓ Suppression complète$(NC)"; \
	else \
		echo "$(BLUE)Annulé$(NC)"; \
	fi

# ==============================================
# Start/Stop commands (compatibilité)
# ==============================================

start: prod ## Alias pour 'make prod' (compatibilité)

stop: ## Arrêter tous les services (tous profils)
	@echo "$(RED)Arrêt de PMP...$(NC)"
	@docker compose --profile dev --profile monitoring --profile ctf stop
	@echo "$(GREEN)✓ Plateforme arrêtée$(NC)"

restart: stop prod ## Redémarrer les services core

# ==============================================
# Logging commands
# ==============================================

logs: ## Show logs (last 100 lines)
	@docker-compose logs --tail=100

logs-follow: ## Follow logs in real-time (tous profils)
	@docker compose --profile dev --profile monitoring --profile ctf logs -f

logs-api: ## Show API Gateway logs
	@docker-compose logs --tail=100 -f api-gateway

logs-db: ## Show PostgreSQL logs
	@docker-compose logs --tail=100 -f postgres

logs-nginx: ## Show Nginx logs
	@docker-compose logs --tail=100 -f nginx

# ==============================================
# Status and monitoring
# ==============================================

ps: ## List running containers (tous profils)
	@docker compose --profile dev --profile monitoring --profile ctf ps

status: ## Show detailed service status (tous profils)
	@echo "$(BLUE)=========================================$(NC)"
	@echo "$(BLUE)  PMP Platform Status$(NC)"
	@echo "$(BLUE)=========================================$(NC)"
	@echo ""
	@docker compose --profile dev --profile monitoring --profile ctf ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
	@echo ""

health: ## Check health of all services
	@echo "$(BLUE)=========================================$(NC)"
	@echo "$(BLUE)  Health Check$(NC)"
	@echo "$(BLUE)=========================================$(NC)"
	@echo ""
	@echo "$(YELLOW)Database:$(NC)"
	@docker-compose exec -T postgres pg_isready -U pmp_user -d pmp_db && echo "  $(GREEN)✓ PostgreSQL healthy$(NC)" || echo "  $(RED)✗ PostgreSQL unhealthy$(NC)"
	@docker-compose exec -T redis redis-cli ping && echo "  $(GREEN)✓ Redis healthy$(NC)" || echo "  $(RED)✗ Redis unhealthy$(NC)"
	@echo ""
	@echo "$(YELLOW)Services:$(NC)"
	@curl -s http://localhost:8000/health > /dev/null && echo "  $(GREEN)✓ API Gateway healthy$(NC)" || echo "  $(RED)✗ API Gateway unhealthy$(NC)"
	@curl -s http://localhost/health > /dev/null && echo "  $(GREEN)✓ Nginx healthy$(NC)" || echo "  $(RED)✗ Nginx unhealthy$(NC)"
	@echo ""

# ==============================================
# Testing
# ==============================================

test: ## Run integration tests
	@echo "$(GREEN)Running integration tests...$(NC)"
	@echo ""
	@echo "$(YELLOW)Test 1: Health checks$(NC)"
	@curl -s http://localhost:8000/health | jq . || echo "$(RED)Health check failed$(NC)"
	@echo ""
	@echo "$(YELLOW)Test 2: Database connectivity$(NC)"
	@docker-compose exec -T postgres psql -U pmp_user -d pmp_db -c "SELECT COUNT(*) FROM cards.virtual_cards;" || echo "$(RED)Database test failed$(NC)"
	@echo ""
	@echo "$(YELLOW)Test 3: Redis connectivity$(NC)"
	@docker-compose exec -T redis redis-cli ping || echo "$(RED)Redis test failed$(NC)"
	@echo ""
	@echo "$(GREEN)✓ Tests complete$(NC)"

test-transaction: ## Test a sample transaction
	@echo "$(GREEN)Testing sample transaction (approved)...$(NC)"
	@curl -X POST http://localhost:8000/api/transaction/initiate \
	  -H "Content-Type: application/json" \
	  -d '{"pan":"5555555555554444","amount":50.00,"merchant_id":"MERCH0000000001","terminal_id":"TERM0001"}' | jq .
	@echo ""

test-insufficient-funds: ## Test insufficient funds scenario
	@echo "$(YELLOW)Testing insufficient funds scenario...$(NC)"
	@curl -X POST http://localhost:8000/api/transaction/initiate \
	  -H "Content-Type: application/json" \
	  -d '{"pan":"4111111111111111","amount":500.00,"merchant_id":"MERCH0000000001","terminal_id":"TERM0001"}' | jq .
	@echo ""

# ==============================================
# Database management
# ==============================================

db-connect: ## Connect to PostgreSQL
	@docker-compose exec postgres psql -U pmp_user -d pmp_db

db-backup: ## Backup database
	@echo "$(GREEN)Creating database backup...$(NC)"
	@mkdir -p backups
	@docker-compose exec -T postgres pg_dump -U pmp_user pmp_db > backups/pmp_backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✓ Backup created in backups/$(NC)"

db-restore: ## Restore database from latest backup
	@echo "$(YELLOW)Restoring latest database backup...$(NC)"
	@docker-compose exec -T postgres psql -U pmp_user -d pmp_db < $$(ls -t backups/*.sql | head -1)
	@echo "$(GREEN)✓ Database restored$(NC)"

db-reset: ## Reset database with fresh pedagogical data
	@echo "$(RED)⚠ This will delete all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(YELLOW)Resetting database...$(NC)"; \
		docker-compose restart postgres; \
		sleep 5; \
		echo "$(GREEN)✓ Database reset complete$(NC)"; \
	else \
		echo "$(BLUE)Cancelled$(NC)"; \
	fi

# ==============================================
# Cleanup commands
# ==============================================

clean: ## Remove containers and networks (keep volumes, tous profils)
	@echo "$(RED)Cleaning up containers and networks...$(NC)"
	@docker compose --profile dev --profile monitoring --profile ctf down
	@echo "$(GREEN)✓ Cleanup complete (volumes preserved)$(NC)"

clean-all: ## Remove everything including volumes (⚠ DATA LOSS)
	@echo "$(RED)⚠ WARNING: This will delete ALL data including volumes!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(RED)Removing all containers, networks, and volumes...$(NC)"; \
		docker compose --profile dev --profile monitoring --profile ctf down -v; \
		rm -rf keys/*.key keys/*.pem nginx/ssl/*.pem; \
		echo "$(GREEN)✓ Complete cleanup done$(NC)"; \
	else \
		echo "$(BLUE)Cancelled$(NC)"; \
	fi

clean-logs: ## Clean Nginx logs
	@echo "$(YELLOW)Cleaning Nginx logs...$(NC)"
	@rm -f nginx/logs/*.log
	@echo "$(GREEN)✓ Logs cleaned$(NC)"

trim-docker: ## Supprimer cache build + images/containers orphelins
	@echo "$(YELLOW)Nettoyage des ressources Docker inutilisees...$(NC)"
	@docker builder prune -af
	@docker image prune -af
	@docker container prune -f
	@echo "$(GREEN)OK Nettoyage Docker termine$(NC)"

# ==============================================
# Development commands
# ==============================================

shell-api: ## Open shell in API Gateway container
	@docker-compose exec api-gateway sh

shell-db: ## Open shell in PostgreSQL container
	@docker-compose exec postgres sh

shell-redis: ## Open shell in Redis container
	@docker-compose exec redis sh

rebuild: ## Rebuild and restart a specific service
	@read -p "Service name: " service; \
	echo "$(GREEN)Rebuilding $$service...$(NC)"; \
	docker-compose up -d --build --force-recreate $$service

# ==============================================
# Monitoring
# ==============================================

stats: ## Show resource usage statistics
	@docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

metrics: ## Display Prometheus metrics
	@curl -s http://localhost:9090/metrics | head -50

# ==============================================
# HSM Simulator
# ==============================================

hsm-backend: ## Start HSM Simulator Backend
	@echo "$(GREEN)Starting HSM Backend...$(NC)"
	@cd backend/hsm-sim && npm run dev

hsm-frontend: ## Start HSM Admin Interface
	@echo "$(GREEN)Starting HSM Frontend...$(NC)"
	@cd frontend/hsm-web && npm run dev

hsm-install: ## Install dependencies for HSM
	@echo "$(GREEN)Installing HSM Backend dependencies...$(NC)"
	@cd backend/hsm-sim && npm install
	@echo "$(GREEN)Installing HSM Frontend dependencies...$(NC)"
	@cd frontend/hsm-web && npm install

# ==============================================
# Quick deployment
# ==============================================

deploy: init build start ## Full deployment (init + build + start)
	@echo ""
	@echo "$(GREEN)=========================================$(NC)"
	@echo "$(GREEN)  ✓ PMP Platform fully deployed!$(NC)"
	@echo "$(GREEN)=========================================$(NC)"
	@echo ""
	@make status

# ==============================================
# Documentation
# ==============================================

doc: ## Open API documentation
	@echo "$(BLUE)Opening API documentation...$(NC)"
	@open http://localhost:8000/api/docs || xdg-open http://localhost:8000/api/docs

readme: ## Display README
	@cat README.md | less
