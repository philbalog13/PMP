# 🌐 Guide des Routes API - Plateforme Monétique Pédagogique

**Date:** 2026-02-01
**Version:** 1.0

---

## 📌 IMPORTANT

**"Cannot GET /" est normal!** Ce ne sont pas des sites web, ce sont des **APIs REST**.

Utilisez les endpoints documentés ci-dessous pour interagir avec les services.

---

## 🎯 ENDPOINTS PRINCIPAUX

### 1. API Gateway (Port 8000) - Point d'entrée principal

#### Health Check
```bash
GET http://localhost:8000/health
```

**Exemple:**
```bash
curl http://localhost:8000/health
```

**Réponse:**
```json
{
  "status": "degraded|healthy",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "gateway": { "healthy": true },
  "services": { ... }
}
```

---

### 2. Card Service (Port 8001) - Gestion des cartes

#### Récupérer toutes les cartes
```bash
GET http://localhost:8001/cards
```

**Exemple:**
```bash
curl http://localhost:8001/cards
```

**Réponse:** Liste de cartes avec PAN masqué, solde, statut, etc.

#### Récupérer une carte par PAN
```bash
GET http://localhost:8001/cards/:pan
```

**Exemple:**
```bash
curl http://localhost:8001/cards/4111111111111111
```

#### Créer une carte
```bash
POST http://localhost:8001/cards
Content-Type: application/json

{
  "pan": "4111111111111111",
  "cvv": "123",
  "expiryMonth": 12,
  "expiryYear": 2025,
  "cardholderName": "JOHN DOE",
  "cardType": "VISA"
}
```

#### Mettre à jour le statut
```bash
PATCH http://localhost:8001/cards/:pan/status
Content-Type: application/json

{
  "status": "ACTIVE|BLOCKED|EXPIRED"
}
```

#### Valider un PAN
```bash
POST http://localhost:8001/cards/validate
Content-Type: application/json

{
  "pan": "4111111111111111"
}
```

#### Valider une transaction
```bash
POST http://localhost:8001/cards/validate-transaction
Content-Type: application/json

{
  "pan": "4111111111111111",
  "cvv": "123",
  "amount": 100
}
```

#### Health Check
```bash
GET http://localhost:8001/health
```

---

### 3. POS Service (Port 8002) - Terminal de paiement

#### Health Check
```bash
GET http://localhost:8002/health
```

**Exemple:**
```bash
curl http://localhost:8002/health
```

**Réponse:**
```json
{
  "status": "healthy",
  "service": "sim-pos-service",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

#### Initier une transaction
```bash
POST http://localhost:8002/transaction
Content-Type: application/json

{
  "pan": "4111111111111111",
  "cvv": "123",
  "amount": 100,
  "merchantId": "MERCH001"
}
```

---

### 4. Acquirer Service (Port 8003) - Service acquéreur

#### Health Check
```bash
GET http://localhost:8003/health
```

#### Traiter une transaction
```bash
POST http://localhost:8003/process
Content-Type: application/json

{
  "transactionId": "TXN123",
  "amount": 100,
  "pan": "4111111111111111"
}
```

---

### 5. Network Switch (Port 8004) - Routage des transactions

#### Health Check Détaillé
```bash
GET http://localhost:8004/health
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": 12345,
    "checks": [
      {"name": "redis", "status": "pass", "responseTime": 1},
      {"name": "issuer-service", "status": "pass"},
      {"name": "circuit-breakers", "status": "pass"}
    ],
    "metrics": {
      "requestsPerMinute": 0,
      "averageResponseTime": 0,
      "errorRate": 0
    }
  }
}
```

#### Router une transaction
```bash
POST http://localhost:8004/route
Content-Type: application/json

{
  "pan": "4111111111111111",
  "amount": 100
}
```

---

### 6. Issuer Service (Port 8005) - Service émetteur

#### Health Check
```bash
GET http://localhost:8005/health
```

#### Autoriser une transaction
```bash
POST http://localhost:8005/authorize
Content-Type: application/json

{
  "pan": "4111111111111111",
  "amount": 100,
  "merchantId": "MERCH001"
}
```

---

### 7. Auth Engine (Port 8006) - Moteur d'autorisation

#### Health Check Détaillé
```bash
GET http://localhost:8006/health
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "database": {
      "accounts": 4,
      "cards": 6,
      "status": "connected"
    },
    "checks": [
      {"name": "database", "status": "pass"},
      {"name": "rules-engine", "status": "pass"}
    ]
  }
}
```

#### Évaluer une transaction
```bash
POST http://localhost:8006/evaluate
Content-Type: application/json

{
  "accountId": "ACC123",
  "amount": 100,
  "merchantId": "MERCH001"
}
```

---

### 8. Fraud Detection (Port 8007) - Détection de fraude

#### Health Check
```bash
GET http://localhost:8007/health
```

#### Analyser une transaction
```bash
POST http://localhost:8007/analyze
Content-Type: application/json

{
  "transactionId": "TXN123",
  "pan": "4111111111111111",
  "amount": 100,
  "merchantId": "MERCH001"
}
```

---

### 9. Crypto Service (Port 8010) - Services cryptographiques

#### Health Check
```bash
GET http://localhost:8010/health
```

#### Chiffrer des données
```bash
POST http://localhost:8010/encrypt
Content-Type: application/json

{
  "data": "sensitive data",
  "algorithm": "AES-256-GCM"
}
```

#### Déchiffrer des données
```bash
POST http://localhost:8010/decrypt
Content-Type: application/json

{
  "encryptedData": "...",
  "algorithm": "AES-256-GCM"
}
```

---

### 10. HSM Simulator (Port 8011) - Simulateur HSM

#### Health Check
```bash
GET http://localhost:8011/health
```

**Réponse:**
```json
{
  "status": "OK",
  "service": "HSM Simulator",
  "version": "1.0.0"
}
```

#### Générer une clé
```bash
POST http://localhost:8011/keys/generate
Content-Type: application/json

{
  "keyType": "AES",
  "keyLength": 256
}
```

---

### 11. Key Management (Port 8012) - Gestion des clés

#### Health Check
```bash
GET http://localhost:8012/health
```

#### Récupérer une clé
```bash
GET http://localhost:8012/keys/:keyId
```

---

## 🔐 AUTHENTIFICATION

Certains endpoints nécessitent un token JWT dans le header:

```bash
Authorization: Bearer <your-jwt-token>
```

**Obtenir un token:**
```bash
POST http://localhost:8000/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}
```

---

## 💾 BASES DE DONNÉES

### PostgreSQL
- **Host:** localhost
- **Port:** 5432
- **Database:** pmp_db
- **User:** pmp_user
- **Password:** voir .env

**Connexion:**
```bash
psql -h localhost -p 5432 -U pmp_user -d pmp_db
```

### Redis
- **Host:** localhost
- **Port:** 6379
- **Password:** voir .env

**Connexion:**
```bash
redis-cli -p 6379 -a <password>
```

### PGAdmin
- **URL:** http://localhost:5050
- **Email:** admin@pmp.local
- **Password:** voir .env

---

## 🧪 EXEMPLES DE TESTS

### Test complet de flux de transaction

```bash
# 1. Vérifier que tous les services sont up
curl http://localhost:8000/health

# 2. Récupérer la liste des cartes
curl http://localhost:8001/cards

# 3. Initier une transaction
curl -X POST http://localhost:8002/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "pan": "4111111111111111",
    "cvv": "123",
    "amount": 50,
    "merchantId": "MERCH001"
  }'

# 4. Vérifier le statut dans le fraud detection
curl http://localhost:8007/health
```

---

## 🐛 DÉPANNAGE

### "Cannot GET /"
✅ **Normal!** Utilisez les endpoints documentés ci-dessus (ex: `/health`, `/cards`)

### "Connection refused"
❌ Le service n'est pas démarré. Vérifiez:
```bash
docker ps
docker-compose logs [service-name]
```

### "401 Unauthorized"
❌ Token JWT manquant ou invalide. Utilisez l'endpoint `/auth/login`

### "404 Not Found"
❌ Vérifiez l'URL de l'endpoint. Consultez ce guide pour les routes correctes.

---

## 📊 CARTES DE TEST DISPONIBLES

Voici quelques cartes pré-chargées pour vos tests:

| PAN | Type | Statut | Solde | Porteur |
|-----|------|--------|-------|---------|
| 4111111111111111 | VISA | ACTIVE | 250€ | JEAN DUPONT |
| 5555555555554444 | VISA | ACTIVE | 5000€ | MARIE MARTIN |
| 378282246310005 | VISA | EXPIRED | 1000€ | PIERRE BERNARD |
| 6011111111111117 | VISA | BLOCKED | 2500€ | SOPHIE DUBOIS |
| 4000056655665556 | VISA | ACTIVE | 1500€ | LUC THOMAS |

---

## 🚀 OUTILS RECOMMANDÉS

### Postman
Importez cette collection pour tester tous les endpoints:
```
File > Import > Raw Text
```

### cURL
Exemples fournis dans ce document

### HTTPie
Plus lisible que cURL:
```bash
http GET http://localhost:8001/cards
```

---

## 📖 DOCUMENTATION SUPPLÉMENTAIRE

- **README.md** - Vue d'ensemble du projet
- **REPAIR_REPORT.md** - Rapport de réparation détaillé
- **docker-compose.yml** - Configuration des services

---

**Guide créé automatiquement**
**Plateforme Monétique Pédagogique (PMP)**
