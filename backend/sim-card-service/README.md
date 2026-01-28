# sim-card-service - Gestion des Cartes Virtuelles

Service de gestion des cartes bancaires virtuelles avec validation Luhn.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/cards` | Créer une nouvelle carte |
| GET | `/cards` | Liste des cartes (paginée) |
| GET | `/cards/:pan` | Détails d'une carte |
| PATCH | `/cards/:pan/status` | Modifier statut |
| DELETE | `/cards/:pan` | Supprimer carte |
| POST | `/cards/validate` | Valider PAN (Luhn) |

## Cartes de test préchargées

| PAN | Type | Solde | Scénario |
|-----|------|-------|----------|
| 4111111111111111 | VISA | €5000 | Transaction OK |
| 5500000000000004 | MC | €2500 | Transaction OK |
| 4000000000000002 | VISA | €1000 | Carte bloquée |
| 4000000000000051 | VISA | €10 | Fonds insuffisants |

## Démarrage

```bash
npm install
npm run dev  # Port 8001
```
