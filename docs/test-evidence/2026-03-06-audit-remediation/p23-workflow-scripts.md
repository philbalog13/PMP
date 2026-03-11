# Evidence P2.3 - Scripts workflow

## Objet

Nettoyer les scripts `tests/workflow` pour qu'aucun script encore recommande ne repose sur:

- des ports obsoletes
- des endpoints morts
- des chemins absolus figes
- un faux vert masquant un script manquant

## Constats initiaux

Scripts audites dans `tests/workflow/`:

- `00-health-check.ps1`
  - KO sur le runtime courant
  - ports anciens: `8080`, `3001`, `3002`, `3003`, `3004`
  - hypothese obsolete `status=UP`
- `01-create-card.ps1`
  - KO runtime
  - endpoint `http://localhost:3004/api/cards/generate`
  - erreur observee: `401 Unauthorized`
- `02-submit-transaction.ps1`
  - KO avant execution utile
  - depend de `tests/workflow/state.json`
  - endpoint obsolete `http://localhost:3003/api/transaction/process`
  - script non parsable dans l'etat audite

Constat complementaire:

- `scripts/test-user-journeys.ps1` sortait faux vert quand `test-vuln-sandbox.ps1` etait absent.

## Changements appliques

- Reclassification du dossier:
  - `tests/workflow/current/`
  - `tests/workflow/legacy/`
- Ajout de `tests/workflow/README.md`.
- Ajout d'un health check current:
  - `tests/workflow/current/00-runtime-health.ps1`
- Ajout de wrappers current:
  - `10-client-production-journey.ps1`
  - `20-merchant-production-journey.ps1`
  - `30-student-production-journey.ps1`
  - `40-instructor-production-journey.ps1`
- Ajout du runner:
  - `tests/workflow/current/run-all.ps1`
- Correction de `scripts/test-user-journeys.ps1`:
  - detection explicite des scripts manquants
  - `test-vuln-sandbox.ps1` rendu optionnel
  - plus de faux positif sur les scripts obligatoires

## Commandes executees

```powershell
powershell -ExecutionPolicy Bypass -File tests/workflow/legacy/00-health-check.ps1
powershell -ExecutionPolicy Bypass -File tests/workflow/legacy/01-create-card.ps1
powershell -ExecutionPolicy Bypass -File tests/workflow/current/00-runtime-health.ps1
powershell -ExecutionPolicy Bypass -File tests/workflow/current/run-all.ps1
powershell -ExecutionPolicy Bypass -File scripts/test-user-journeys.ps1
```

## Resultats

- legacy:
  - `00-health-check.ps1`: KO confirme
  - `01-create-card.ps1`: KO confirme (`401`)
  - `02-submit-transaction.ps1`: non recommandable, dependances et parsing invalides constates
- current:
  - `00-runtime-health.ps1`: OK
  - `run-all.ps1`: OK
  - wrappers client/marchand/etudiant/formateur: OK via `run-all.ps1`
- orchestrateur global:
  - `scripts/test-user-journeys.ps1`: OK
  - `Vuln Sandbox Journey` maintenant `SKIPPED` proprement si le fichier n'existe pas

## Conclusion

- `tests/workflow` ne promeut plus de scripts morts a sa racine.
- Les scripts encore recommandes renvoient vers les parcours reellement maintenus.
- Le faux vert de `scripts/test-user-journeys.ps1` a ete retire.
