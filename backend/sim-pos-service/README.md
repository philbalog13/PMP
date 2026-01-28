# sim-pos-service - Terminal de Paiement

Simule un terminal de paiement (TPE/POS) pour initier des transactions.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/transactions` | Initier transaction |
| GET | `/transactions` | Liste transactions |
| GET | `/transactions/:id` | Détails transaction |
| POST | `/transactions/:id/cancel` | Annuler |

## Exemple de requête

```bash
curl -X POST http://localhost:8002/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "pan": "4111111111111111",
    "amount": 50.00,
    "currency": "EUR",
    "transactionType": "PURCHASE"
  }'
```

## Codes réponse

| Code | Signification |
|------|---------------|
| 00 | Approuvé |
| 51 | Fonds insuffisants |
| 54 | Carte expirée |
| 91 | Émetteur indisponible |

## Démarrage

```bash
npm install
npm run dev  # Port 8002
```
