# Security Test Taxonomy

Ce dossier ne doit plus etre lu comme un bloc homogène. Les suites sont separees par niveau de preuve.

## Categories

| Niveau | Commande | Ce que ca prouve | Ce que ca ne prouve pas |
|---|---|---|---|
| `mock` | `npm run test:mock --prefix tests/security` | Des heuristiques et attentes pedagogiques locales restent coherentes | Rien sur le comportement reel des services PMP |
| `service` | `npm run test:service --prefix tests/security` | Un composant repo reel fonctionne en isolation | Rien sur le chainage runtime complet |
| `live` | `npm run test:live --prefix tests/security` | La plateforme running resiste aux payloads testes sur l'API ciblee | Rien au-dela du scope exact des endpoints attaques |
| `all` | `npm run test:all --prefix tests/security` | Le cumul des trois niveaux | Ne remplace pas la recette 4 parcours |

## Mapping des suites

- `mock`
  - `tests/security/penetration.test.ts`
  - `tests/security/penetration/xss.test.ts`
  - `tests/security/penetration/mitm-attack.test.ts`
  - `tests/security/compliance/*.test.ts`
- `service`
  - `tests/security/service/pan-masking.test.ts`
    - touche le vrai code `backend/monitoring-service/src/utils/pan-masking.ts`
- `live`
  - `tests/security/penetration/sql-injection.test.ts`
    - envoie de vraies requetes HTTP vers `PMP_API_BASE_URL` ou `http://localhost:8000`

## Convention de lecture

- Si une suite affiche `(mock)` dans son nom, elle ne constitue pas une preuve runtime.
- Si une suite affiche `(service)`, elle teste du vrai code repo sans dependre d'une stack complete.
- Si une suite affiche `(live)`, elle depend d'un runtime accessible et sert de preuve exploitable dans l'audit.

## Prerequis live

- Stack PMP joignable.
- `api-gateway` accessible sur `PMP_API_BASE_URL` ou `http://localhost:8000`.
- Compte client seed disponible via:
  - `PMP_TEST_CLIENT_EMAIL`
  - `PMP_TEST_CLIENT_PASSWORD`
