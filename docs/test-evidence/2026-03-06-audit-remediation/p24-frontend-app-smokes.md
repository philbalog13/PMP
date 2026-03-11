# P2.4 - Smoke frontend par application

Date: 2026-03-06  
Environnement: runtime Docker local (`docker-compose-runtime.yml`)  
Objectif: ajouter une couverture smoke frontend reelle, par application, sans contourner les guards de role ni se limiter a des `/api/health`.

## Zones modifiees

- `scripts/qa/frontend_apps_smoke.mjs`
- `Makefile`
- `scripts/deploy-runtime-test-all.ps1`

## Ce qui a ete ajoute

- Un smoke Playwright headless data-driven sur les 6 frontends actifs:
  - `portal`
  - `tpe-web`
  - `user-cards-web`
  - `hsm-web`
  - `monitoring-dashboard`
  - `3ds-challenge-ui`
- Auth reelle sur les personas seeds du runtime:
  - client
  - marchand
  - etudiant
  - formateur
- Injection correcte des cookies `token` / `refreshToken` avant la premiere requete navigateur.
- Injection `localStorage` en `initScript` pour que les apps Next protegees passent a la fois le middleware serveur et le bootstrap client.
- Une interaction reelle sur le flow 3DS:
  - OTP `123456`
  - attente de l'etat `Challenge valide`

## Note importante identifiee pendant le lot

- Le runtime seed reel utilise `qa-pass-123`.
- Une partie de la doc / collection Postman annonce encore `pmp-password-2026`.
- Ce delta a ete laisse pour `P3.2` car il releve de la doc / outillage, pas du smoke frontend lui-meme.

## Contrat du smoke

Checks executes:

1. `portal-login-ui`
   - charge `/login`
   - soumet une vraie connexion etudiant
   - attend une redirection vers `/student`
2. `portal-merchant-dashboard`
   - ouvre `/merchant` avec session marchand
3. `portal-instructor-dashboard`
   - ouvre `/instructor` avec session formateur
4. `tpe-web-terminal`
   - ouvre `/` sur `3001` avec session marchand
5. `user-cards-dashboard`
   - ouvre `/` sur `3004` avec session client
6. `hsm-vulnerability-lab`
   - ouvre `/vuln` sur `3006` avec session formateur
7. `monitoring-dashboard-overview`
   - ouvre `/` sur `3082`
8. `3ds-challenge-flow`
   - ouvre l'UI 3DS
   - saisit `123456`
   - attend `Challenge valide`

## Commandes de validation

```powershell
node scripts/qa/frontend_apps_smoke.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-runtime-test-all.ps1 -NoBuild -SkipImageBootstrap
```

## Resultats

### Execution directe du smoke frontend

- `node scripts/qa/frontend_apps_smoke.mjs`: OK
- Resultat: `8/8 checks OK`

Sortie resumee:

```text
[PASS] portal-login-ui -> http://localhost:3000/student
[PASS] portal-merchant-dashboard -> http://localhost:3000/merchant
[PASS] portal-instructor-dashboard -> http://localhost:3000/instructor
[PASS] tpe-web-terminal -> http://localhost:3001/
[PASS] user-cards-dashboard -> http://localhost:3004/
[PASS] hsm-vulnerability-lab -> http://localhost:3006/vuln
[PASS] monitoring-dashboard-overview -> http://localhost:3082/
[PASS] 3ds-challenge-flow -> http://localhost:3088/?txId=TX_SMOKE_UI&acsTransId=ACS_SMOKE_UI
```

### Validation du point d'entree standard runtime

- `scripts/deploy-runtime-test-all.ps1 -NoBuild -SkipImageBootstrap`: OK
- La sequence complete a passe:
  - `docker compose runtime up -d`
  - smoke `UA + CTF`
  - smoke frontend `8/8`

## Impact ops

- Nouveau point d'entree Makefile:
  - `make runtime-frontend-smoke`
- `make runtime-test-all` enchaine maintenant:
  - `runtime-up`
  - `runtime-smoke`
  - `runtime-frontend-smoke`
- `scripts/deploy-runtime-test-all.ps1` lance maintenant aussi le smoke frontend, sauf si `-SkipFrontendSmoke` est passe.

## Conclusion

- `P2.4` est valide.
- La plateforme dispose maintenant d'une preuve navigateur minimale mais reelle sur chaque frontend critique du runtime.
- Le front de dette suivant n'est plus la couverture UI, mais l'alignement ops/documentation (`P3.1`, `P3.2`, `P3.3`).
