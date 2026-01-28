# sim-acquirer-service - Banque Acquéreur

Simule la banque du marchand qui reçoit et valide les transactions avant de les router vers le réseau.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/process` | Traiter transaction |
| GET | `/merchants` | Liste marchands |
| GET | `/merchants/:id` | Détails marchand |
| POST | `/merchants` | Créer marchand |

## Marchands de test

| ID | Nom | MCC | Ville |
|----|-----|-----|-------|
| MERCHANT001 | Boutique Test Paris | 5411 | Paris |
| MERCHANT002 | Restaurant Demo | 5812 | Lyon |
| MERCHANT003 | Hotel Luxe Test | 7011 | Nice |

## Rôle dans le flux

```
POS → [ACQUIRER] → Network Switch → Issuer
```

L'acquéreur valide le marchand et formate le message ISO 8583 avant de l'envoyer au réseau.

## Démarrage

```bash
npm install
npm run dev  # Port 8003
```
