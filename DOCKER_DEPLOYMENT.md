# 🚀 Docker Deployment Guide - PMP

## Quick Start

```bash
# 1. Prepare environment
cp .env.example .env

# 2. Procedure officielle runtime (source de verite)
node scripts/runtime-stack.mjs test-all

# 3. Variante : demarrer la stack seulement
node scripts/runtime-stack.mjs up

# 4. Variante : rejouer les smokes sans restart
node scripts/runtime-stack.mjs smoke
node scripts/runtime-stack.mjs frontend-smoke

# 5. Export standardise des preuves runtime
node scripts/runtime-stack.mjs evidence

# Wrappers de compatibilite
make runtime-test-all
make runtime-evidence
powershell -ExecutionPolicy Bypass -File scripts/deploy-runtime-test-all.ps1
```

`scripts/runtime-stack.mjs` est la procedure standard unique. Le `Makefile` et le script PowerShell ne portent plus leur propre logique runtime.

## Prerequisites

- Docker 24.x+
- Docker Compose 2.x+
- Node.js 20.x+
- Make (GNU Make, optionnel pour les wrappers)
- OpenSSL (for key generation on Windows: Git Bash or WSL)

## 🏗️ Infrastructure Overview

### Services (29 total)

La liste ci-dessous correspond au runtime courant retourne par `docker compose -f docker-compose-runtime.yml config --services`.

**Frontends exposes (6)**
- `portal` - Hub multi-roles (port 3000)
- `client-interface` - Service runtime qui expose en realite `frontend/tpe-web` (port 3001)
- `user-cards-web` - Espace client cartes et transactions (port 3004)
- `hsm-web` - Interface HSM (port 3006)
- `monitoring-dashboard` - Dashboard monitoring (port 3082)
- `3ds-challenge-ui` - Page OTP 3DS (port 3088)

**Gateway + coeur/securite (14)**
- `api-gateway` - API Gateway (port 8000)
- `sim-card-service` - Virtual cards management (port 8001)
- `sim-pos-service` - POS terminal simulation (port 8002)
- `sim-acquirer-service` - Acquirer bank (port 8003)
- `sim-clearing-engine` - Clearing and settlement (port 8016)
- `sim-network-switch` - Payment network routing (port 8004)
- `sim-issuer-service` - Issuer bank (port 8005)
- `sim-auth-engine` - Authorization engine (port 8006)
- `sim-fraud-detection` - Fraud detection (port 8007)
- `sim-monitoring-service` - Monitoring backend (port 3005)
- `crypto-service` - Cryptographic operations (port 8010)
- `hsm-simulator` - HSM simulation (port 8011)
- `key-management` - Key lifecycle management (port 8012)
- `acs-simulator` - 3DS backend simulator (port 8013)

**Lab services (3)**
- `lab-orchestrator` - Provisioning and lifecycle (port 8098)
- `lab-access-proxy` - Secure browser access proxy (port 8099)
- `ctf-attackbox` - Web terminal for labs (port 7681)

**Infra/data (6)**
- `postgres` - PostgreSQL 14 (port 5432)
- `redis` - Redis 7 cache (port 6379)
- `pgadmin` - Database admin UI (port 5050)
- `docker-socket-proxy` - Controlled Docker API bridge
- `nginx` - Reverse proxy with SSL (ports 80, 443)
- `certbot-renew` - Let's Encrypt renewal helper

### Network

- **Name**: `monetic-network`
- **Type**: Bridge
- **Subnet**: 172.20.0.0/16
- **Static IPs**: postgres (.10), redis (.11), nginx (.100)

### Volumes

- `postgres-data` - Database persistence
- `redis-data` - Cache persistence
- `pgadmin-data` - PgAdmin configuration
- `prometheus-data` / `grafana-data` - Legacy declarations still present in compose, but no active runtime service currently mounts them

## 📝 Makefile Commands

Les commandes `runtime-*` ci-dessous sont des wrappers de compatibilite autour de `node scripts/runtime-stack.mjs`.

### Core Commands

```bash
make start          # Start all services
make stop           # Stop all services
make restart        # Restart all services
make status         # Show service status
make health         # Run health checks
make logs           # View recent logs
make logs-follow    # Follow logs in real-time
```

### Setup Commands

```bash
make keys           # Generate crypto keys
make init           # Initialize platform
make build          # Build Docker images
make deploy         # Full deployment
```

### Testing

```bash
make test                      # Run integration tests
make test-transaction          # Test approved transaction
make test-insufficient-funds   # Test declined transaction
```

### Database

```bash
make db-connect     # Connect to PostgreSQL
make db-backup      # Create backup
make db-restore     # Restore from backup
make db-reset       # Reset with fresh data
```

### Cleanup

```bash
make clean          # Remove containers (keep volumes)
make clean-all      # Remove EVERYTHING (⚠️ data loss)
make clean-logs     # Clean Nginx logs
```

### Development

```bash
make shell-api      # Shell in API Gateway
make shell-db       # Shell in PostgreSQL
make shell-redis    # Shell in Redis
make rebuild        # Rebuild specific service
make stats          # Resource usage stats
```

## 🔐 Security Features

### SSL/TLS

- Self-signed certificates (pedagogical)
- TLS 1.2/1.3 only
- Strong cipher suite
- Auto-generated on `make keys`

### Public HTTPS with Let's Encrypt

1. Point your DNS records to your server public IP (A/AAAA records).
2. Open inbound ports `80` and `443` on your firewall/security group.
3. Configure these variables in `.env`:
   - `LETSENCRYPT_EMAIL`
   - `LETSENCRYPT_DOMAINS` (comma-separated, e.g. `example.com,www.example.com`)
   - `LETSENCRYPT_CERT_NAME` (default: `pmp`)
   - `LETSENCRYPT_STAGING=1` for first test, then `0` for production certs
4. Start platform and request cert:

```bash
docker compose up -d nginx
bash scripts/ssl/request-letsencrypt.sh
```

If you deploy with runtime compose:

```bash
PMP_COMPOSE_FILE=docker-compose-runtime.yml bash scripts/ssl/request-letsencrypt.sh
```

5. Keep automatic renewal running:

```bash
docker compose up -d certbot-renew
```

Public routes via Nginx:
- `https://<domain>/` -> portal (`portal`)
- `https://<domain>/api/` -> API Gateway (`api-gateway`)
- `https://<domain>/lab/` -> Lab access proxy (`lab-access-proxy`)

Direct-only runtime ports:
- `http://localhost:3001` -> `client-interface` (`tpe-web`)
- `http://localhost:3004` -> `user-cards-web`
- `http://localhost:3006` -> `hsm-web`
- `http://localhost:3082` -> `monitoring-dashboard`
- `http://localhost:3088` -> `3ds-challenge-ui`

### PowerShell automation (Windows)

```powershell
# Standard stack (start services + staging cert)
powershell -ExecutionPolicy Bypass -File scripts/ssl/setup-public-https.ps1 `
  -Domain monetic.com `
  -Email admin@monetic.com `
  -StartPlatform `
  -Staging

# Runtime stack (uses docker-compose-runtime.yml)
powershell -ExecutionPolicy Bypass -File scripts/ssl/setup-public-https.ps1 `
  -Domain monetic.com `
  -Email admin@monetic.com `
  -StartPlatform `
  -Staging `
  -Runtime
```

Optional flags:
- `-BuildPlatform` to force image rebuild before startup.
- remove `-Staging` when DNS is fully propagated to request the production certificate.

Home-server reminder: your router must forward TCP ports `80` and `443` to this machine.

### Rate Limiting (Nginx)

- API endpoints: 100 req/min
- Auth endpoints: 20 req/min
- Transaction endpoints: 50 req/min
- Connection limit: 10 per IP

### Cryptographic Keys

Generated keys (in `keys/` directory):
- LMK (Local Master Key) - AES-256
- Master Key (KEK) - AES-256
- PIN Encryption Key - 3DES
- MAC Key - HMAC-SHA256
- CVV Key - 3DES
- Data Encryption Key - AES-256
- RSA Key Pair - RSA-2048

⚠️ **All keys are for PEDAGOGICAL use only!**

## 🗄️ Database

### Schemas

- `cards` - Virtual cards data
- `transactions` - Transaction logs
- `security` - Keys and audit logs
- `merchants` - Merchant data

### Initialization

Database is auto-initialized on first startup:
1. `scripts/init-databases.sh` - Creates schemas and tables
2. `scripts/seed-pedagogical-data.sql` - Loads test data

### Test Data

**Merchants**: 8 test merchants  
**Terminals**: 9 POS terminals  
**Virtual Cards**: 5 test cards  
**Transactions**: 8 sample transactions

### Test Cards

| PAN | Name | Balance | Purpose |
|-----|------|---------|---------|
| 4111111111111111 | JEAN DUPONT | 250 EUR | Test insufficient funds |
| 5555555555554444 | MARIE MARTIN | 5000 EUR | Test approved transactions |
| 378282246310005 | PIERRE BERNARD | 1000 EUR | Test expired card |
| 6011111111111117 | SOPHIE DUBOIS | 2500 EUR | Test blocked card |
| 4000056655665556 | LUC THOMAS | 1500 EUR | General testing |

## 🌐 Access Points

After running `node scripts/runtime-stack.mjs up`:

### Applications
- **Portal**: http://localhost:3000 or https://localhost
- **Payment Terminal (`tpe-web`)**: http://localhost:3001
- **User Cards Web**: http://localhost:3004
- **HSM Web**: http://localhost:3006
- **Monitoring Dashboard**: http://localhost:3082
- **3DS Challenge UI**: http://localhost:3088
- **CTF AttackBox**: http://localhost:7681
- **API Gateway**: http://localhost:8000
- **ACS Simulator**: http://localhost:8013

### Admin Tools
- **PgAdmin**: http://localhost:5050
  - Email: `PGADMIN_DEFAULT_EMAIL` from `.env`
  - Password: `PGADMIN_DEFAULT_PASSWORD` from `.env`

### Databases (Direct)
- **PostgreSQL**: localhost:5432
  - User: `POSTGRES_USER` from `.env`
  - Password: `POSTGRES_PASSWORD` from `.env`
  - Database: `POSTGRES_DB` from `.env`

- **Redis**: localhost:6379
  - Password: `REDIS_PASSWORD` from `.env`

### Seed personas for auth/testing

- `client@pmp.edu` / `qa-pass-123`
- `bakery@pmp.edu` / `qa-pass-123`
- `student01@pmp.edu` / `qa-pass-123`
- `trainer@pmp.edu` / `qa-pass-123` + `code2fa=123456`

## 🔍 Health Checks

All services have health checks configured:

- **Interval**: 10-30s
- **Timeout**: 3-10s
- **Retries**: 3-5
- **Start period**: 10-20s

Check health status:
```bash
docker compose -f docker-compose-runtime.yml ps
node scripts/runtime-stack.mjs smoke
node scripts/runtime-stack.mjs frontend-smoke
```

## 📊 Resource Limits

Each service has CPU and memory limits:

**High-resource services:**
- PostgreSQL: 1 CPU / 1GB RAM
- API Gateway: 1 CPU / 512MB RAM
- Auth Engine: 1 CPU / 512MB RAM

**Medium-resource services:**
- Most microservices: 0.5 CPU / 256-512MB RAM

**Low-resource services:**
- HSM Simulator: 0.25 CPU / 128MB RAM
- Key Management: 0.25 CPU / 256MB RAM

## 🐛 Troubleshooting

### Services won't start

```bash
# Check logs
node scripts/runtime-stack.mjs logs

# Check specific service
docker compose -f docker-compose-runtime.yml logs <service-name>

# Restart specific service
docker compose -f docker-compose-runtime.yml up -d <service-name>
```

### Database connection errors

```bash
# Check PostgreSQL health
docker compose -f docker-compose-runtime.yml exec postgres pg_isready

# Restart database
docker compose -f docker-compose-runtime.yml up -d postgres

# Reset database (⚠️ deletes data)
make db-reset
```

### Port conflicts

If ports are already in use, modify `docker-compose-runtime.yml`:

```yaml
ports:
  - "3000:3000"  # Example: change host port only
```

### SSL certificate issues

Regenerate certificates:
```bash
rm -rf nginx/ssl/*
make keys
make restart
```

### Permission issues (Linux/Mac)

```bash
# Fix keys directory permissions
chmod +x scripts/*.sh
chmod 700 keys/
```

## 🔄 Update Workflow

```bash
# 1. Pull latest code
git pull

# 2. Rebuild specific service
make rebuild
# Enter service name when prompted

# 3. Check status
make health
```

## 📦 Backup & Restore

### Backup

```bash
# Automatic backup with timestamp
make db-backup

# Backups stored in: backups/pmp_backup_YYYYMMDD_HHMMSS.sql
```

### Restore

```bash
# Restore from latest backup
make db-restore
```

## 🧹 Maintenance

### Clean old Docker resources

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (⚠️ careful)
docker volume prune

# Remove everything unused
docker system prune -a
```

### Rotate logs

```bash
# Clean Nginx logs
make clean-logs

# Or manually
rm -f nginx/logs/*.log
```

## 📈 Monitoring

### Prometheus Metrics

Access: http://localhost:9090

Query examples:
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Service availability
up{job="api-gateway"}
```

### Grafana Dashboards

Access: http://localhost:3002

Pre-configured dashboards for:
- Service health
- Transaction metrics
- Database performance
- API Gateway statistics

## ⚠️ Production Considerations

**This setup is PEDAGOGICAL ONLY. Do NOT use in production!**

For production, you must:
- ✅ Use real HSM hardware
- ✅ Implement PCI DSS compliance
- ✅ Use proper certificate authority
- ✅ Encrypt sensitive data at rest
- ✅ Implement proper key ceremonies
- ✅ Use secrets management (Vault, AWS Secrets Manager)
- ✅ Enable comprehensive logging and monitoring
- ✅ Implement disaster recovery
- ✅ Use container orchestration (Kubernetes)
- ✅ Implement proper authentication (OAuth2, OIDC)

## 🆘 Support

For issues:
1. Check logs: `make logs`
2. Check health: `make health`
3. Review audit report: `audit_report.md`
4. Consult main README: `README.md`

---

**Created for educational purposes** ❤️
