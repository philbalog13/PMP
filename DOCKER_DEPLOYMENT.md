# 🚀 Docker Deployment Guide - PMP

## Quick Start

```bash
# 1. Generate cryptographic keys
make keys

# 2. Build and start all services
make deploy

# 3. Check status
make health
```

## Prerequisites

- Docker 24.x+
- Docker Compose 2.x+
- Make (GNU Make)
- OpenSSL (for key generation on Windows: Git Bash or WSL)

## 🏗️ Infrastructure Overview

### Services (17 total)

**Frontend (2)**
- `client-interface` - React client app (port 3000)
- `merchant-interface` - Vue.js merchant app (port 3001)

**Gateway (1)**
- `api-gateway` - Express API Gateway (port 8000)

**Core Microservices (7)**
- `sim-card-service` - Virtual cards management
- `sim-pos-service` - POS terminal simulation  
- `sim-acquirer-service` - Acquirer bank
- `sim-network-switch` - Payment network routing
- `sim-issuer-service` - Issuer bank
- `sim-auth-engine` - Authorization engine
- `sim-fraud-detection` - Fraud detection

**Security Services (3)**
- `crypto-service` - Cryptographic operations
- `hsm-simulator` - HSM simulation
- `key-management` - Key lifecycle management

**Data (3)**
- `postgres` - PostgreSQL 14 (port 5432)
- `redis` - Redis 7 cache (port 6379)
- `pgadmin` - Database admin UI (port 5050)

**Proxy & Monitoring (3)**
- `nginx` - Reverse proxy with SSL (ports 80, 443)
- `prometheus` - Metrics collection (port 9090)
- `grafana` - Monitoring dashboards (port 3002)

### Network

- **Name**: `monetic-network`
- **Type**: Bridge
- **Subnet**: 172.20.0.0/16
- **Static IPs**: postgres (.10), redis (.11), nginx (.100)

### Volumes

- `postgres-data` - Database persistence
- `redis-data` - Cache persistence
- `pgadmin-data` - PgAdmin configuration
- `prometheus-data` - Metrics storage
- `grafana-data` - Dashboards storage

## 📝 Makefile Commands

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

After running `make start`:

### Applications
- **Client Interface**: http://localhost:3000 or https://localhost
- **Merchant Interface**: http://localhost:3001 or https://localhost/merchant
- **API Gateway**: http://localhost:8000

### Admin Tools
- **PgAdmin**: http://localhost:5050
  - Email: `admin@pmp.local`
  - Password: `pgadmin_pass_2024`

- **Grafana**: http://localhost:3002
  - User: `admin`
  - Password: `grafana_pass_2024`

- **Prometheus**: http://localhost:9090

### Databases (Direct)
- **PostgreSQL**: localhost:5432
  - User: `pmp_user`
  - Password: `pmp_secure_pass_2024`
  - Database: `pmp_db`

- **Redis**: localhost:6379
  - Password: `redis_pass_2024`

## 🔍 Health Checks

All services have health checks configured:

- **Interval**: 10-30s
- **Timeout**: 3-10s
- **Retries**: 3-5
- **Start period**: 10-20s

Check health status:
```bash
docker-compose ps
# or
make health
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
make logs

# Check specific service
docker-compose logs <service-name>

# Restart specific service
docker-compose restart <service-name>
```

### Database connection errors

```bash
# Check PostgreSQL health
docker-compose exec postgres pg_isready

# Restart database
docker-compose restart postgres

# Reset database (⚠️ deletes data)
make db-reset
```

### Port conflicts

If ports are already in use, modify `docker-compose.yml`:

```yaml
ports:
  - "3000:80"  # Change 3000 to another port
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
