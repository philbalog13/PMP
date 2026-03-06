# P3.2 - Documentation et outillage auth alignes sur le runtime

Date: 2026-03-06  
Environnement: Windows local, runtime Docker actif  
Objectif: supprimer les derives documentaires restantes sur les services, ports exposes et credentials seed reelles.

## Fichiers corriges

- `README.md`
- `DOCKER_DEPLOYMENT.md`
- `.env.example`
- `backend/api-gateway/TEST-GUIDE.md`
- `tests/postman_auth_tests.json`

## Corrections appliquees

- `README.md`
  - table des frontends runtime corrigee:
    - `portal` -> `3000`
    - `tpe-web` -> `3001`
    - `user-cards-web` -> `3004`
    - `hsm-web` -> `3006`
    - `3ds-challenge-ui` -> `3088`
    - `monitoring-dashboard` -> `3082`
  - ajout d'une section runtime source of truth:
    - `node scripts/runtime-stack.mjs`
    - `docker-compose-runtime.yml`
  - suppression des references a `merchant-interface` / Vue.js comme composant runtime officiel
  - diagramme runtime remplace par un schema simplifie cale sur les services reelles
  - example 3DS corrige avec un `returnUrl` vers `http://localhost:3001/`

- `DOCKER_DEPLOYMENT.md`
  - inventaire runtime mis a jour a `29` services
  - clarification du mapping:
    - service runtime `client-interface`
    - application reelle `frontend/tpe-web`
  - acces publics via Nginx corriges:
    - `/` -> `portal`
    - `/api/` -> `api-gateway`
    - `/lab/` -> `lab-access-proxy`
  - acces directs documentes pour `3001`, `3004`, `3006`, `3082`, `3088`, `8013`, `7681`
  - suppression des faux secrets hardcodes PgAdmin / PostgreSQL / Redis
  - ajout des vrais personas seed runtime:
    - `qa-pass-123`
    - `code2fa=123456` pour formateur

- `.env.example`
  - `CORS_ORIGIN` runtime aligne sur les frontends reels:
    - `3000`, `3001`, `3004`, `3006`, `3082`, `3088`

- `backend/api-gateway/TEST-GUIDE.md`
  - demarrage officiel via `node scripts/runtime-stack.mjs up --no-build --skip-image-bootstrap`
  - verification via `docker compose -f docker-compose-runtime.yml ps`
  - `CORS_ORIGIN` runtime corrige
  - ajout explicite des personas seed valides
  - commandes legacy `docker-compose` restantes remplacees par `docker compose -f docker-compose-runtime.yml`

- `tests/postman_auth_tests.json`
  - remplacement de `pmp-password-2026` par `qa-pass-123`
  - correction du champ formateur:
    - `2fa_code` -> `code2fa`

## Validation

### 1. Inventaire runtime reel

Commande:

```powershell
docker compose -f docker-compose-runtime.yml config --services
```

Resultat:

- `count=29`
- services confirmes:
  - `portal`
  - `client-interface`
  - `user-cards-web`
  - `hsm-web`
  - `3ds-challenge-ui`
  - `monitoring-dashboard`
  - `api-gateway`
  - `acs-simulator`
  - `lab-orchestrator`
  - `lab-access-proxy`
  - `ctf-attackbox`
  - `postgres`
  - `redis`
  - etc.

### 2. Verification des ports exposes documentes

Commande:

```powershell
Invoke-WebRequest http://localhost:3000/api/health
Invoke-WebRequest http://localhost:3001/api/health
Invoke-WebRequest http://localhost:3004/api/health
Invoke-WebRequest http://localhost:3006/api/health
Invoke-WebRequest http://localhost:3082/
Invoke-WebRequest http://localhost:3088/
Invoke-WebRequest http://localhost:8013/health
```

Resultat:

- `http://localhost:3000/api/health` -> `200`
- `http://localhost:3001/api/health` -> `200`
- `http://localhost:3004/api/health` -> `200`
- `http://localhost:3006/api/health` -> `200`
- `http://localhost:3082/` -> `200`
- `http://localhost:3088/` -> `200`
- `http://localhost:8013/health` -> `200`

### 3. Verification des credentials seed documentes

Commandes:

```powershell
POST /api/auth/client/login
POST /api/auth/marchand/login
POST /api/auth/etudiant/login
POST /api/auth/formateur/login
```

Payloads verifies:

```json
{"email":"client@pmp.edu","password":"qa-pass-123"}
{"email":"bakery@pmp.edu","password":"qa-pass-123"}
{"email":"student01@pmp.edu","password":"qa-pass-123"}
{"email":"trainer@pmp.edu","password":"qa-pass-123","code2fa":"123456"}
```

Resultat:

- `client` -> `True ROLE_CLIENT`
- `merchant` -> `True ROLE_MARCHAND`
- `student` -> `True ROLE_ETUDIANT`
- `trainer` -> `True ROLE_FORMATEUR`

### 4. Verification de l'outillage auth

Commande:

```powershell
Get-Content tests/postman_auth_tests.json | ConvertFrom-Json
```

Resultat:

- collection JSON parsee sans erreur
- les 4 payloads login embarquent maintenant:
  - `qa-pass-123`
  - `code2fa` pour formateur

### 5. Verification d'absence des anciennes derives dans les fichiers officiels

Recherche executee sur:

- `README.md`
- `DOCKER_DEPLOYMENT.md`
- `backend/api-gateway/TEST-GUIDE.md`
- `tests/postman_auth_tests.json`
- `.env.example`

Motifs verifies:

- `merchant-interface`
- `pmp-password-2026`
- `2fa_code`
- `CORS_ORIGIN=http://localhost:3000,http://localhost:5173`
- `grafana_pass_2024`
- `pmp_secure_pass_2024`
- `redis_pass_2024`
- `client-interface:3000`
- `merchant-interface:3001`

Resultat:

- `no-stale-reference-found`

## Conclusion

- `P3.2` est valide.
- La documentation de reference et l'outillage auth ne promettent plus de composant inexistant ni de credentials seed fausses.
- Les ports exposes, le mapping des services runtime et les payloads d'auth sont maintenant prouves sur la stack reelle.
