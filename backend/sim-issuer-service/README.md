# sim-issuer-service - Banque Émettrice

Simule la banque émettrice de la carte qui autorise les transactions.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/authorize` | Autoriser transaction |
| GET | `/accounts` | Liste comptes |
| GET | `/accounts/:pan` | Détails compte |
| PATCH | `/accounts/:pan/balance` | Modifier solde |

## Comptes de test

| PAN | Solde | Limite/jour | Statut |
|-----|-------|-------------|--------|
| 4111111111111111 | €5000 | €1000 | ACTIVE |
| 5500000000000004 | €2500 | €500 | ACTIVE |
| 4000000000000002 | €1000 | €500 | BLOCKED |
| 4000000000000051 | €10 | €500 | ACTIVE |

## Rôle dans le flux

```
Acquirer → Network → [ISSUER] → Response
              ↓
         Fraud Check → Auth Engine → Account Debit
```

L'émetteur vérifie la fraude, applique les règles d'autorisation et débite le compte.

## Démarrage

```bash
npm install
npm run dev  # Port 8005
```
