# P0.1 - Reparer hsm-web

Date: 2026-03-06

## Correctifs appliques

- `frontend/hsm-web/lib/hsm-api.ts`
  - `VulnerabilityConfig` aligne sur le backend reel
  - ajout de `simulateDown` et `timingAttackEnabled`
- `frontend/hsm-web/app/config/page.tsx`
  - les 6 toggles backend sont maintenant representables dans l'UI de configuration
- `frontend/hsm-web/next.config.ts`
  - resolution `@shared` rendue compatible avec layout local et layout image Docker
- `frontend/hsm-web/tsconfig.json`
  - resolution TypeScript `@shared/*` rendue compatible avec les deux layouts
- `frontend/hsm-web/Dockerfile`
  - copie de `shared` alignee sur l'arborescence attendue par le projet

## Validations executees

### 1. Build local

```powershell
npm run build --prefix frontend/hsm-web
```

Resultat:
- OK

### 2. Build image runtime

```powershell
docker build -t pmp-hsm-web -f frontend/hsm-web/Dockerfile frontend
```

Resultat:
- OK

### 3. Redeploiement runtime

```powershell
docker compose -f docker-compose-runtime.yml up -d hsm-web
```

Resultat:
- container `pmp-hsm-web` recree avec succes
- `GET http://localhost:3006/api/health` -> `200`
- `GET http://localhost:3006/vuln` -> `200`

### 4. Validation UI reelle du toggle casse

Validation navigateur Playwright sur `http://localhost:3006/vuln`:
- session formateur injectee via token reel
- clic sur le toggle `Rate Limiting`
- verification backend: `GET /api/hsm/config` retourne `simulateDown=true`

Conclusion:
- le mapping UI "Rate Limiting" -> `simulateDown` est reel
- l'ecran ne depend plus d'un champ TypeScript absent

## Etat final laisse en runtime

- configuration HSM remise a zero apres test
