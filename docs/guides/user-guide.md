# 📚 Guide Utilisateur - Plateforme Monétique Pédagogique

## Vue d'ensemble

La PMP est une plateforme éducative simulant l'ensemble du flux de paiement par carte bancaire.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway (8000)                       │
│                    JWT • Rate Limiting • Routing                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────────┐
        │                               │
┌───────┴────────┐             ┌────────┴────────┐
│ sim-card (8001)│             │ sim-pos (8002)  │
│   Cartes       │             │   Transactions  │
└────────────────┘             └────────┬────────┘
                                        │
                               ┌────────┴────────┐
                               │ acquirer (8003) │
                               │   Marchands     │
                               └────────┬────────┘
                                        │
                               ┌────────┴────────┐
                               │ issuer (8005)   │──┬──→ fraud (8007)
                               │   Autorisation  │  │
                               └─────────────────┘  └──→ auth-engine
                                       
┌────────────────┐             ┌─────────────────┐
│ crypto (8010)  │             │ key-mgmt (8012) │
│   Chiffrement  │             │   Clés crypto   │
└────────────────┘             └─────────────────┘
```

## Démarrage rapide

### 1. Installation
```bash
cd backend
start-all.bat install  # Windows
./start-all.sh install # Linux
```

### 2. Démarrage
```bash
start-all.bat start
```

### 3. Test rapide
```bash
# Health check
curl http://localhost:8000/health

# Token JWT
curl -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "demo", "role": "admin"}'
```

## Tutoriels

### 🔹 Tutoriel 1: Créer et valider une carte

```bash
# 1. Créer une carte
curl -X POST http://localhost:8001/cards \
  -H "Content-Type: application/json" \
  -d '{"cardholderName": "JEAN DUPONT", "cardType": "VISA"}'

# Réponse:
# {
#   "pan": "4534567890123456",
#   "cvv": "123",
#   "status": "ACTIVE"
# }

# 2. Valider le numéro (Luhn)
curl -X POST http://localhost:8001/cards/validate \
  -H "Content-Type: application/json" \
  -d '{"pan": "4534567890123456"}'

# Réponse:
# {
#   "valid": true,
#   "network": "VISA",
#   "_educational": {
#     "algorithm": "Luhn (ISO/IEC 7812)"
#   }
# }
```

### 🔹 Tutoriel 2: Effectuer une transaction

```bash
# Initier un achat
curl -X POST http://localhost:8002/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "pan": "4111111111111111",
    "amount": 50.00,
    "currency": "EUR",
    "merchantId": "MERCHANT001"
  }'

# Réponse:
# {
#   "transactionId": "txn-abc123",
#   "status": "APPROVED",
#   "responseCode": "00",
#   "_educational": {
#     "flow": ["POS", "Acquirer", "Network", "Issuer", "Response"]
#   }
# }
```

### 🔹 Tutoriel 3: Chiffrer un PIN

```bash
# Générer un PIN Block ISO 9564
curl -X POST http://localhost:8010/pin/encode \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234",
    "pan": "4111111111111111",
    "format": 0
  }'

# Réponse:
# {
#   "data": "041234FFFFFFFF",
#   "_educational": {
#     "standard": "ISO 9564",
#     "format": "Format 0 (PIN XOR PAN)"
#   }
# }
```

### 🔹 Tutoriel 4: Gérer les clés cryptographiques

```bash
# 1. Générer une clé
curl -X POST http://localhost:8012/keys \
  -H "Content-Type: application/json" \
  -d '{"name": "MA-CLE", "type": "DEK", "algorithm": "AES-256"}'

# 2. Rotation de clé (sécurité)
curl -X POST http://localhost:8012/keys/{keyId}/rotate

# 3. Lister les clés
curl http://localhost:8012/keys
```

## Cartes de test

| PAN | Type | Scénario |
|-----|------|----------|
| `4111111111111111` | VISA | ✅ Approuvé |
| `5500000000000004` | MC | ✅ Approuvé |
| `4000000000000002` | VISA | ❌ Bloquée |
| `4000000000000051` | VISA | ❌ Fonds insuffisants |

## Codes de réponse ISO 8583

| Code | Signification |
|------|---------------|
| `00` | Approuvé |
| `51` | Fonds insuffisants |
| `54` | Carte expirée |
| `62` | Carte bloquée |
| `91` | Émetteur indisponible |
