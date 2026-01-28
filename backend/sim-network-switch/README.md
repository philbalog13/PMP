# Sim-Network-Switch

Microservice de simulation du réseau de commutation monétique pour la Plateforme Monétique Pédagogique (PMP).

## 🎯 Fonctionnalités

- **Routage intelligent** basé sur le BIN (Bank Identification Number)
- **Identification réseau** : VISA, Mastercard, AMEX, Discover, UnionPay
- **Circuit Breaker** pour la résilience inter-services
- **Retry avec backoff exponentiel**
- **Métriques Prometheus** complètes
- **Health checks** (liveness, readiness, détaillé)
- **Graceful shutdown**
- **Logging structuré** (Winston)

## 📁 Structure

```
sim-network-switch/
├── src/
│   ├── config/           # Configuration (env validation)
│   ├── controllers/      # Controllers HTTP
│   ├── middleware/       # Validation, logging, errors
│   ├── models/           # Interfaces TypeScript
│   ├── routes/           # Routes Express
│   ├── services/         # Logique métier
│   ├── utils/            # Logger, metrics, circuit breaker
│   └── index.ts          # Entry point
├── tests/
│   ├── unit/             # Tests unitaires
│   └── setup.ts          # Configuration Jest
├── Dockerfile            # Multi-stage optimisé
├── package.json
├── tsconfig.json
└── jest.config.js
```

## 🚀 Démarrage

```bash
# Installer les dépendances
npm install

# Copier la configuration
cp .env.example .env

# Développement (hot reload)
npm run dev

# Build
npm run build

# Production
npm start

# Tests
npm test
```

## 🔌 Endpoints

### Transaction
- `POST /transaction` - Router une transaction
- `GET /transaction/network/:pan` - Identifier le réseau
- `GET /transaction/networks` - Réseaux supportés
- `GET /transaction/bin-table` - Table BIN (debug)

### Health
- `GET /health` - Health check détaillé
- `GET /health/live` - Liveness probe (K8s)
- `GET /health/ready` - Readiness probe (K8s)
- `GET /health/dependencies` - État des dépendances
- `GET /health/circuit-breakers` - État des circuit breakers

### Monitoring
- `GET /metrics` - Métriques Prometheus

## 📊 Exemple Transaction

```bash
curl -X POST http://localhost:8004/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "mti": "0100",
    "pan": "4111111111111111",
    "processingCode": "000000",
    "amount": 100.00,
    "currency": "EUR",
    "transmissionDateTime": "0128101530",
    "localTransactionTime": "101530",
    "localTransactionDate": "0128",
    "stan": "000001",
    "terminalId": "TERM0001",
    "merchantId": "MERCH001",
    "merchantCategoryCode": "5411",
    "expiryDate": "2812",
    "posEntryMode": "051",
    "acquirerReferenceNumber": "ACQ123456789"
  }'
```

## 🔒 Sécurité

- Validation Joi sur tous les inputs
- Rate limiting configurable
- Headers sécurisés (Helmet)
- Masquage PAN dans les logs
- Docker non-root

## 📈 Métriques

- `sim_network_switch_http_requests_total`
- `sim_network_switch_http_request_duration_seconds`
- `sim_network_switch_transactions_total`
- `sim_network_switch_routing_decisions_total`
- `sim_network_switch_circuit_breaker_state`
- `sim_network_switch_errors_total`

## 🐳 Docker

```bash
# Build
docker build -t sim-network-switch .

# Run
docker run -p 8004:8004 sim-network-switch
```

## 📝 Configuration

Variables d'environnement (voir `.env.example`):

| Variable | Description | Défaut |
|----------|-------------|--------|
| PORT | Port serveur | 8004 |
| LOG_LEVEL | Niveau de log | debug |
| REDIS_URL | URL Redis | - |
| ISSUER_SERVICE_URL | URL du service issuer | - |
| CIRCUIT_BREAKER_TIMEOUT | Timeout circuit breaker | 3000 |
| RETRY_MAX_ATTEMPTS | Tentatives max retry | 3 |

---

**Template microservice monétique pédagogique** 🎓
