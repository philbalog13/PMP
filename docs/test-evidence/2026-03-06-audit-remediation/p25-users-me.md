# Evidence P2.5 - `/api/users/me`

Date: 2026-03-06

## Correctifs appliques

- Route explicite `GET /api/users/me` ajoutee avant `GET /api/users/:id`.
- Route explicite `POST /api/users/me/preferences` ajoutee avant `/:id`.
- Garde-fou ajoute dans `users.controller` pour bloquer `:id = me`.
- Migration source ajoutee: `backend/api-gateway/src/database/migrations/055_user_preferences.sql`.
- Runtime DB alignee avec ajout de `users.users.preferences` sur la stack active.

## Validation source

```powershell
npm run build --prefix backend/api-gateway
npx jest backend/api-gateway/src/__tests__/users.routes.test.ts --runInBand
```

Resultat:

- Build `api-gateway`: OK
- Test de non-regression routes `users.routes.test.ts`: 3/3 OK

## Validation runtime

Script multi-role execute contre `http://localhost:8000`:

- `client@pmp.edu` -> `GET /api/users/me` = `200`, role = `ROLE_CLIENT`
- `bakery@pmp.edu` -> `GET /api/users/me` = `200`, role = `ROLE_MARCHAND`
- `student01@pmp.edu` -> `GET /api/users/me` = `200`, role = `ROLE_ETUDIANT`
- `trainer@pmp.edu` -> `GET /api/users/me` = `200`, role = `ROLE_FORMATEUR`

Verification complementaire:

- `POST /api/users/me/preferences` avec l'etudiant -> `200`
- relecture `GET /api/users/me` -> `onboardingDone=true`, `learnerLevel=INTERMEDIATE`, `objective=RED_TEAM`

## Point de vigilance restant

- `docker-compose-runtime.yml` fait tourner `api-gateway` en `npm run dev` avec bind mount `src`, donc les migrations SQL ne sont pas executees automatiquement au boot de cette stack. Le point doit etre traite dans `P3.1`.
