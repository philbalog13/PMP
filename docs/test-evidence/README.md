# Standard de preuves

Les preuves versionnees sous `docs/test-evidence/` doivent suivre le meme contrat minimal.

## Structure attendue

Un dossier de preuve standard contient:

- `REPORT.md`
- `metadata.json`
- les captures machine-lisibles des commandes executees
- les logs stdout/stderr utiles si une suite echoue

## Champs minimums du rapport

Le `REPORT.md` doit toujours exposer:

- date exacte
- commit
- environnement
- commandes executees
- resultat global
- ecarts
- artefacts produits

## Commande officielle

Pour exporter une preuve runtime standardisee:

```powershell
node scripts/qa/export_runtime_evidence.mjs
```

Cette commande genere automatiquement un dossier horodate sous `docs/test-evidence/` avec:

- le snapshot Compose
- les rapports JSON des smokes officiels
- les logs des suites
- un `REPORT.md` standardise

## Suites officielles capturees

- `scripts/qa/ua_ctf_e2e_smoke.mjs`
- `scripts/qa/frontend_apps_smoke.mjs`

Les deux scripts savent aussi ecrire un rapport JSON structure via:

```text
PMP_SMOKE_REPORT_JSON=<path>
```
