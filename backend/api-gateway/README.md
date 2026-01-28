# API Gateway - Plateforme Monétique Pédagogique

Point d'entrée unique pour tous les microservices de la plateforme.

## Fonctionnalités

- **Routing dynamique** vers 10 services backend
- **JWT Authentication** avec Bearer tokens
- **Rate Limiting** (100 req/min par IP)
- **Circuit Breaker** (Opossum) pour la résilience
- **Correlation ID** pour le tracing distribué

## Endpoints

| Path | Service | Description |
|------|---------|-------------|
| `/api/cards` | sim-card-service:8001 | Gestion cartes |
| `/api/transactions` | sim-pos-service:8002 | Transactions |
| `/api/authorize` | sim-auth-engine:8006 | Autorisation |
| `/api/crypto/*` | crypto-service:8010 | Cryptographie |
| `/api/keys` | key-management:8012 | Clés |
| `/health` | - | Health check agrégé |

## Démarrage

```bash
npm install
npm run dev  # Port 8000
```

## Token de test

```bash
curl -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "role": "admin"}'
```
