# 💳 Guide de Test - Simulation de Transactions

**Plateforme Monétique Pédagogique (PMP)**

---

## 🎯 SCÉNARIOS DE TEST

### Scénario 1: Transaction Simple Réussie

#### 1. Vérifier qu'une carte existe
```bash
curl -X GET http://localhost:8001/cards/4111111111111111
```

**Réponse attendue:**
```json
{
  "pan": "411111******1111",
  "cardholderName": "JEAN DUPONT",
  "status": "ACTIVE",
  "balance": 250
}
```

#### 2. Initier une transaction au POS
```bash
curl -X POST http://localhost:8002/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "pan": "4111111111111111",
    "cvv": "123",
    "expiryDate": "12/25",
    "amount": 50.00,
    "currency": "EUR",
    "merchantId": "MERCH001",
    "merchantName": "Supermarché Carrefour"
  }'
```

**Réponse attendue:**
```json
{
  "transactionId": "TXN_xxx",
  "status": "APPROVED",
  "amount": 50.00,
  "timestamp": "2026-02-01T08:00:00.000Z"
}
```

#### 3. Vérifier le nouveau solde
```bash
curl -X GET http://localhost:8001/cards/4111111111111111
```

**Le solde devrait être:** 250 - 50 = 200€

---

### Scénario 2: Transaction avec Détection de Fraude

#### 1. Transaction suspecte (montant élevé)
```bash
curl -X POST http://localhost:8007/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TXN_FRAUD_001",
    "pan": "4111111111111111",
    "amount": 5000.00,
    "merchantId": "MERCH999",
    "merchantCountry": "NG",
    "timestamp": "2026-02-01T03:00:00.000Z"
  }'
```

**Réponse attendue:**
```json
{
  "riskScore": 85,
  "decision": "BLOCKED",
  "reasons": [
    "High amount transaction",
    "Unusual merchant country",
    "Unusual transaction time"
  ]
}
```

#### 2. Transaction normale après la suspecte
```bash
curl -X POST http://localhost:8007/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TXN_NORMAL_001",
    "pan": "4111111111111111",
    "amount": 25.00,
    "merchantId": "MERCH001",
    "merchantCountry": "FR",
    "timestamp": "2026-02-01T12:00:00.000Z"
  }'
```

**Réponse attendue:**
```json
{
  "riskScore": 15,
  "decision": "APPROVED",
  "reasons": []
}
```

---

### Scénario 3: Flux Complet via Network Switch

#### 1. Router une transaction via le Network Switch
```bash
curl -X POST http://localhost:8004/route \
  -H "Content-Type: application/json" \
  -d '{
    "messageType": "0200",
    "pan": "5555555555554444",
    "amount": 100.00,
    "currency": "EUR",
    "merchantId": "MERCH002",
    "posEntryMode": "CHIP",
    "transactionType": "PURCHASE"
  }'
```

**Réponse attendue:**
```json
{
  "responseCode": "00",
  "authorizationCode": "AUTH123456",
  "transactionId": "TXN_xxx",
  "message": "Approved"
}
```

#### 2. Vérifier les métriques du Network Switch
```bash
curl -X GET http://localhost:8004/health
```

**Réponse attendue:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "metrics": {
      "requestsPerMinute": 1,
      "averageResponseTime": 45,
      "errorRate": 0
    },
    "checks": [
      {"name": "redis", "status": "pass"},
      {"name": "issuer-service", "status": "pass"}
    ]
  }
}
```

---

### Scénario 4: Autorisation avec le Auth Engine

#### 1. Évaluer une transaction
```bash
curl -X POST http://localhost:8006/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "ACC001",
    "cardNumber": "4111111111111111",
    "amount": 75.00,
    "merchantId": "MERCH001",
    "merchantCategory": "5411"
  }'
```

**Réponse attendue:**
```json
{
  "approved": true,
  "authorizationCode": "AUTH789",
  "balance": 175.00,
  "rules": [
    {"name": "sufficient_balance", "passed": true},
    {"name": "card_active", "passed": true},
    {"name": "daily_limit", "passed": true}
  ]
}
```

#### 2. Vérifier l'état du Auth Engine
```bash
curl -X GET http://localhost:8006/health
```

---

### Scénario 5: Cryptographie - Chiffrement de PIN

#### 1. Chiffrer un PIN
```bash
curl -X POST http://localhost:8010/pin/encrypt \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234",
    "pan": "4111111111111111",
    "format": "ISO-0"
  }'
```

**Réponse attendue:**
```json
{
  "encryptedPinBlock": "AB12CD34EF56...",
  "format": "ISO-0",
  "algorithm": "3DES"
}
```

#### 2. Vérifier un PIN
```bash
curl -X POST http://localhost:8010/pin/verify \
  -H "Content-Type: application/json" \
  -d '{
    "encryptedPinBlock": "AB12CD34EF56...",
    "pan": "4111111111111111",
    "pin": "1234"
  }'
```

**Réponse attendue:**
```json
{
  "verified": true,
  "message": "PIN verification successful"
}
```

---

### Scénario 6: HSM - Génération de Clés

#### 1. Générer une clé ZPK (Zone PIN Key)
```bash
curl -X POST http://localhost:8011/keys/generate \
  -H "Content-Type: application/json" \
  -d '{
    "keyType": "ZPK",
    "keyLength": 128,
    "keyScheme": "U"
  }'
```

**Réponse attendue:**
```json
{
  "keyId": "ZPK_001",
  "keyCheckValue": "ABC123",
  "keyUnderLMK": "U1234567890ABCDEF...",
  "clearKey": "FEDCBA0987654321..."
}
```

#### 2. Générer un MAC
```bash
curl -X POST http://localhost:8011/mac/generate \
  -H "Content-Type: application/json" \
  -d '{
    "data": "0200123456789012345",
    "keyId": "TAK_001",
    "macAlgorithm": "ISO9797-1"
  }'
```

**Réponse attendue:**
```json
{
  "mac": "A1B2C3D4E5F6",
  "algorithm": "ISO9797-1"
}
```

---

### Scénario 7: Gestion des Cartes

#### 1. Créer une nouvelle carte
```bash
curl -X POST http://localhost:8001/cards \
  -H "Content-Type: application/json" \
  -d '{
    "pan": "4000000000000002",
    "cvv": "456",
    "expiryMonth": 6,
    "expiryYear": 2027,
    "cardholderName": "ALICE MARTIN",
    "cardType": "VISA",
    "status": "ACTIVE",
    "balance": 1000
  }'
```

**Réponse attendue:**
```json
{
  "message": "Card created successfully",
  "card": {
    "pan": "400000******0002",
    "cardholderName": "ALICE MARTIN",
    "status": "ACTIVE"
  }
}
```

#### 2. Mettre à jour le statut d'une carte
```bash
curl -X PATCH http://localhost:8001/cards/4000000000000002/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "BLOCKED",
    "reason": "Lost card reported"
  }'
```

#### 3. Supprimer une carte
```bash
curl -X DELETE http://localhost:8001/cards/4000000000000002
```

---

### Scénario 8: Acquirer - Traitement de Transaction

#### 1. Soumettre une transaction à l'acquirer
```bash
curl -X POST http://localhost:8003/process \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TXN_ACQ_001",
    "merchantId": "MERCH003",
    "amount": 150.00,
    "pan": "5555555555554444",
    "transactionType": "PURCHASE",
    "timestamp": "2026-02-01T14:30:00.000Z"
  }'
```

#### 2. Réconciliation des transactions
```bash
curl -X POST http://localhost:8003/reconcile \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "MERCH003",
    "date": "2026-02-01",
    "transactions": ["TXN_ACQ_001"]
  }'
```

---

### Scénario 9: Issuer - Autorisation

#### 1. Demander une autorisation
```bash
curl -X POST http://localhost:8005/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "pan": "378282246310005",
    "amount": 200.00,
    "merchantId": "MERCH001",
    "merchantCategory": "5812",
    "posEntryMode": "CONTACTLESS"
  }'
```

**Réponse attendue (carte expirée):**
```json
{
  "approved": false,
  "responseCode": "54",
  "message": "Expired card"
}
```

#### 2. Demander une autorisation avec carte active
```bash
curl -X POST http://localhost:8005/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "pan": "5555555555554444",
    "amount": 80.00,
    "merchantId": "MERCH001",
    "merchantCategory": "5411",
    "posEntryMode": "CHIP"
  }'
```

**Réponse attendue:**
```json
{
  "approved": true,
  "responseCode": "00",
  "authorizationCode": "AUTH456789",
  "message": "Approved"
}
```

---

## 🔄 FLUX COMPLET DE TRANSACTION

### Testez le flux complet de bout en bout:

```bash
#!/bin/bash

echo "=== 1. Vérification de la carte ==="
curl -s http://localhost:8001/cards/4111111111111111 | python -m json.tool

echo -e "\n=== 2. Initiation au POS ==="
curl -s -X POST http://localhost:8002/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "pan": "4111111111111111",
    "cvv": "123",
    "amount": 30.00,
    "merchantId": "MERCH001"
  }' | python -m json.tool

echo -e "\n=== 3. Routage via Network Switch ==="
curl -s -X POST http://localhost:8004/route \
  -H "Content-Type: application/json" \
  -d '{
    "pan": "4111111111111111",
    "amount": 30.00,
    "messageType": "0200"
  }' | python -m json.tool

echo -e "\n=== 4. Analyse de fraude ==="
curl -s -X POST http://localhost:8007/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TXN_TEST",
    "pan": "4111111111111111",
    "amount": 30.00,
    "merchantId": "MERCH001"
  }' | python -m json.tool

echo -e "\n=== 5. Autorisation ==="
curl -s -X POST http://localhost:8006/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "ACC001",
    "amount": 30.00,
    "merchantId": "MERCH001"
  }' | python -m json.tool

echo -e "\n=== 6. Vérification du nouveau solde ==="
curl -s http://localhost:8001/cards/4111111111111111 | python -m json.tool
```

**Sauvegardez ce script dans `test_full_flow.sh` et exécutez:**
```bash
chmod +x test_full_flow.sh
./test_full_flow.sh
```

---

## 📊 CARTES DE TEST DISPONIBLES

| PAN | Porteur | Statut | Solde | CVV | Expiration |
|-----|---------|--------|-------|-----|------------|
| 4111111111111111 | JEAN DUPONT | ACTIVE | 250€ | 123 | 12/25 |
| 5555555555554444 | MARIE MARTIN | ACTIVE | 5000€ | 456 | 06/26 |
| 378282246310005 | PIERRE BERNARD | EXPIRED | 1000€ | 789 | 01/23 |
| 6011111111111117 | SOPHIE DUBOIS | BLOCKED | 2500€ | 321 | 09/25 |
| 4000056655665556 | LUC THOMAS | ACTIVE | 1500€ | 654 | 03/27 |

---

## 🎭 SCÉNARIOS DE FRAUDE À TESTER

### 1. Montant suspect
```bash
curl -X POST http://localhost:8007/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "pan": "4111111111111111",
    "amount": 10000.00,
    "merchantId": "MERCH999"
  }'
```

### 2. Transactions multiples rapides (velocity)
```bash
# Transaction 1
curl -X POST http://localhost:8002/transaction \
  -H "Content-Type: application/json" \
  -d '{"pan": "4111111111111111", "amount": 50.00, "merchantId": "MERCH001"}'

# Transaction 2 (quelques secondes après)
curl -X POST http://localhost:8002/transaction \
  -H "Content-Type: application/json" \
  -d '{"pan": "4111111111111111", "amount": 100.00, "merchantId": "MERCH002"}'

# Transaction 3 (quelques secondes après)
curl -X POST http://localhost:8002/transaction \
  -H "Content-Type: application/json" \
  -d '{"pan": "4111111111111111", "amount": 150.00, "merchantId": "MERCH003"}'
```

### 3. Pays suspect
```bash
curl -X POST http://localhost:8007/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "pan": "4111111111111111",
    "amount": 200.00,
    "merchantId": "MERCH_NK",
    "merchantCountry": "KP"
  }'
```

---

## 🔍 CODES DE RÉPONSE

### Codes de succès
- **00** - Approved
- **85** - No reason to decline

### Codes d'erreur
- **05** - Do not honor
- **14** - Invalid card number
- **51** - Insufficient funds
- **54** - Expired card
- **55** - Incorrect PIN
- **57** - Transaction not permitted to cardholder
- **61** - Exceeds withdrawal amount limit

---

## 💡 ASTUCES

### Formater les réponses JSON
```bash
curl http://localhost:8001/cards | python -m json.tool
# ou avec jq
curl http://localhost:8001/cards | jq
```

### Voir les headers HTTP
```bash
curl -i http://localhost:8001/health
```

### Sauvegarder la réponse
```bash
curl http://localhost:8001/cards > cards.json
```

### Mesurer le temps de réponse
```bash
curl -w "\nTemps: %{time_total}s\n" http://localhost:8004/health
```

---

**Guide créé pour la Plateforme Monétique Pédagogique (PMP)**
**Tous les services sont opérationnels sur Docker** 🚀
