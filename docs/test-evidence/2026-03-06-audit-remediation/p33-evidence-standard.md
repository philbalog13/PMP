# P3.3 - Standardisation des preuves runtime

Date: 2026-03-06  
Environnement: Windows local, runtime Docker actif  
Objectif: formaliser un format unique de preuve et verifier qu'un export complet est produit automatiquement par la commande officielle.

## Ce qui a ete ajoute

- `docs/test-evidence/README.md`
  - contrat minimal des preuves
  - structure attendue
  - commande officielle d'export

- `scripts/qa/export_runtime_evidence.mjs`
  - creation automatique d'un dossier horodate
  - capture des snapshots Compose
  - execution des smokes officiels
  - generation de:
    - `REPORT.md`
    - `metadata.json`
    - logs stdout/stderr
    - rapports JSON machine-lisibles

- `scripts/qa/ua_ctf_e2e_smoke.mjs`
- `scripts/qa/frontend_apps_smoke.mjs`
  - support de `PMP_SMOKE_REPORT_JSON`
  - emission d'un rapport JSON structure

- `scripts/runtime-stack.mjs`
  - nouvelle commande officielle:
    - `node scripts/runtime-stack.mjs evidence`

- `Makefile`
  - nouvelle cible:
    - `make runtime-evidence`

## Validation

Commande officielle executee:

```powershell
node scripts/runtime-stack.mjs evidence --no-build --skip-image-bootstrap
```

Resultat:

- export reussi
- statut global: `CONFORME`
- dossier genere:
  - `docs/test-evidence/20260306-175716-runtime-evidence/`

## Artefacts verifies

- rapport standard:
  - `docs/test-evidence/20260306-175716-runtime-evidence/REPORT.md`
- metadata:
  - `docs/test-evidence/20260306-175716-runtime-evidence/metadata.json`
- snapshot Compose:
  - `docs/test-evidence/20260306-175716-runtime-evidence/docker-compose-services.txt`
  - `docs/test-evidence/20260306-175716-runtime-evidence/docker-compose-ps.txt`
- smokes machine-lisibles:
  - `docs/test-evidence/20260306-175716-runtime-evidence/ua-ctf-smoke.json`
  - `docs/test-evidence/20260306-175716-runtime-evidence/frontend-apps-smoke.json`

## Resultats prouves

- `REPORT.md` contient bien:
  - date
  - commit
  - environnement
  - commandes executees
  - resultat global
  - ecarts
  - artefacts
- `ua-ctf-smoke.json`:
  - `PASS`
  - `134/134`
- `frontend-apps-smoke.json`:
  - `PASS`
  - `8/8`

## Conclusion

- `P3.3` est valide.
- Le projet dispose maintenant d'un standard de preuve documente et d'une commande reproductible pour exporter un dossier d'evidence complet.
