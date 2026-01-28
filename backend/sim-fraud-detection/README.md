# sim-fraud-detection - Détection de Fraude

Service de détection de fraude avec scoring en temps réel.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/check` | Analyser transaction |
| GET | `/alerts` | Liste alertes |
| PATCH | `/alerts/:id/resolve` | Résoudre alerte |
| GET | `/stats` | Statistiques |

## Règles de scoring

| Règle | Score | Seuil |
|-------|-------|-------|
| Velocity (trop de transactions) | +35 | >5 txn/h |
| Montant élevé | +25 | >€1000 |
| MCC suspect (jeux, paris) | +30 | 7995, 7994, 6211 |
| Pays bloqué | +50 | KP, IR, SY |
| Première transaction élevée | +15 | >€200 |

## Niveaux de risque

| Score | Niveau | Recommandation |
|-------|--------|----------------|
| 0-30 | LOW | APPROVE |
| 30-50 | MEDIUM | REVIEW |
| 50-70 | HIGH | DECLINE |
| 70+ | CRITICAL | DECLINE |

## Démarrage

```bash
npm install
npm run dev  # Port 8007
```
