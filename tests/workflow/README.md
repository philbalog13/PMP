# Workflow Scripts

Ce dossier a ete reclassé pour separer les scripts encore recommandables des reliquats legacy.

## Current

Scripts a utiliser aujourd'hui:

- `tests/workflow/current/00-runtime-health.ps1`
- `tests/workflow/current/10-client-production-journey.ps1`
- `tests/workflow/current/20-merchant-production-journey.ps1`
- `tests/workflow/current/30-student-production-journey.ps1`
- `tests/workflow/current/40-instructor-production-journey.ps1`
- `tests/workflow/current/run-all.ps1`

Ces wrappers deleguent vers les scripts maintenus sous `scripts/` et vers les ports runtime actuels.

## Legacy

Les scripts archives dans `tests/workflow/legacy/` ne doivent plus etre recommandes pour verifier la plateforme.

Motifs constates pendant l'audit:

- `00-health-check.ps1`
  - ports obsoletes (`8080`, `3001`, `3002`, `3003`, `3004`)
  - semantique de health obsolete (`UP`) non alignee avec le runtime courant
- `01-create-card.ps1`
  - endpoint obsolete `/api/cards/generate`
  - echec runtime observe en `401`
- `02-submit-transaction.ps1`
  - depend d'un `state.json` local
  - chemins absolus figes
  - endpoint obsolete `http://localhost:3003/api/transaction/process`
  - script non parsable dans l'etat audite

## Commande recommandee

```powershell
powershell -ExecutionPolicy Bypass -File tests/workflow/current/run-all.ps1
```
