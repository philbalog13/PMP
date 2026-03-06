# Suivi implementation plan UA (Room = UA)

Derniere mise a jour: 2026-03-05 17:08 (Europe/Paris)

Objectif: suivre l'implementation complete du plan UA + CTF separe, et permettre une reprise rapide en cas de perte de contexte.

## Regles de suivi
- [x] Mettre a jour ce fichier apres chaque tache terminee.
- [x] Conserver les decisions techniques verrouillees.
- [x] Lister les fichiers modifies et les validations executees.

## Decisions verrouillees
- Room pedagogique = UA (pas de namespace `/room` dans le flux UA).
- CTF legacy reste separe (`/api/ctf/*`, `/student/ctf`).
- Moteur runtime lab reutilise pour UA, pilotage pedagogique par `cursus_units` et `cursus_unit_tasks`.
- 1 session machine active par etudiant et par UA (`session_scope_key = UA::<unitId>`).
- Isolation UA forcee en `DEDICATED_FULL` (pas de fallback shared).

## Checklist globale

### 1) Database & migrations
- [x] Migration 027 ajoutee (progression UA + config lab UA + flow/scope sessions).
- [x] `flow_source` et `session_scope_key` sur `learning.ctf_lab_sessions`.
- [x] Contraintes/index pour cohérence session active par scope.
- [x] Triggers `updated_at` sur nouvelles tables.
- [x] Seed initial module + plusieurs UA (avec et sans machine).

### 2) Backend - lab runtime (`ctfLab.service`)
- [x] `startOrReuseLabSessionByTemplate(...)` implemente.
- [x] Support `flowSource`, `sessionKey`, `isolationMode`.
- [x] Erreur explicite `LAB_ISOLATION_UNAVAILABLE` si UA dedie indisponible.
- [x] Lecture session active par scope UA.
- [x] Timeout orchestrateur provision augmente/configurable (`LAB_ORCHESTRATOR_PROVISION_TIMEOUT_MS`).

### 3) Backend - orchestrator
- [x] `isolationMode` traite dans `/orchestrator/sessions/provision`.
- [x] `DEDICATED_FULL` implemente (attackbox dediee + targets dedies).
- [x] Retour `attackboxHost` dedie en mode UA.
- [x] Mode shared conserve pour CTF.
- [x] Config reseau controle corrigee (`LAB_CONTROL_NETWORK_NAME=pmp_monetic-network`).

### 4) Backend - API cursus UA
- [x] Endpoints UA ajoutes (detail/start/submit/session + extend/reset/terminate).
- [x] Progression UA/taches sequentielle implementee.
- [x] Resume `uaUnits[]` ajoute dans `GET /api/cursus/:id/module/:moduleId`.
- [x] Fix SQL types pour soumission UA (casts explicites `::text`).
- [x] Fix code challenge UA (max 30 chars) pour compat schema DB.

### 5) Frontend portal
- [x] Page module adaptee en cartes UA reelles.
- [x] Cross-link heuristique module -> CTF supprime.
- [x] Page detail UA ajoutee: `/student/cursus/[cursusId]/[moduleId]/ua/[unitId]`.
- [x] Panneau machine integre (start/timer/extend/reset/terminate).
- [x] Soumission taches (texte/quiz/flag) + feedback integres.

### 6) QA / validation
- [x] Lint/typecheck backend api-gateway.
- [x] Lint/typecheck frontend portal.
- [x] Smoke E2E UA complet (UA sans machine + UA avec machine + sessions).
- [x] Smoke separation CTF (progress/leaderboard/challenges inchanges par UA).

## Journal d'avancement

### 2026-03-05
- [x] Implementation API + service metier UA finalisee.
- [x] Runtime lab UA branche sur templates CTF avec scope UA.
- [x] Script E2E ajoute: `scripts/qa/ua_ctf_e2e_smoke.mjs`.
- [x] Fiabilisation script E2E:
  - `runSql` passe en `execFileSync` (Windows quoting robuste),
  - creation etudiant smoke robuste (`users.users`),
  - assertions extend/TTL corrigees.
- [x] Config runtime corrigee:
  - `.env`: `LAB_ENABLE_DOCKER_ACTIONS=true`,
  - `.env`: `LAB_CONTROL_NETWORK_NAME=pmp_monetic-network`,
  - `.env`: `LAB_INTERNAL_PROXY_SECRET` renseigne.
- [x] `docker-compose-runtime.yml` aligne avec ces variables.
- [x] Timeout provisioning orchestrateur corrige dans API (`45s`).
- [x] Images PAY-001 dediees construites localement:
  - `pmp-ctf-pay001-pos`
  - `pmp-ctf-pay001-bank`
- [x] Smoke E2E final execute avec succes:
  - commande: `node scripts/qa/ua_ctf_e2e_smoke.mjs`
  - resultat: `All UA + CTF smoke checks passed`
- [x] Deploiement Docker mis a jour pour test complet:
  - `docker-compose-runtime.yml`: defaults runtime labs alignes (`LAB_ENABLE_DOCKER_ACTIONS=true`, secret proxy fallback),
  - `Makefile`: nouvelles commandes `runtime-up`, `runtime-down`, `runtime-smoke`, `runtime-test-all`,
  - `README.md` + `DOCKER_DEPLOYMENT.md`: parcours de lancement/test runtime UA+CTF documente,
  - script PowerShell ajoute et valide: `scripts/deploy-runtime-test-all.ps1`.
- [x] Mode test sans verrouillage active:
  - backend: `UA_DISABLE_LOCKS=true` (ordre UA et sequence taches bypass),
  - frontend: cartes UA et soumission taches non bloquees par statut `LOCKED`,
  - route `/student/cursus/[cursusId]/[moduleId]/ua` ajoutee pour eviter 404 RSC.
- [x] Correctif crash frontend module UA:
  - bug: `ReferenceError: isLocked is not defined` sur `/student/cursus/[cursusId]/[moduleId]`,
  - fix: variable `isLocked` restauree dans la boucle de rendu des cartes UA (`page.tsx`),
  - validation: `npm run lint` + `npm run build` (portal) OK.
- [x] Redeploiement Docker portail force:
  - suppression/recreation container portail pour charger l'image corrigee,
  - verification image active: `sha256:74874eba61b719e8f5574ffa510096fd7a7562be4c055f4d1772767a3939bc4f`.
- [x] Script smoke E2E adapte au mode test sans verrouillage:
  - `scripts/qa/ua_ctf_e2e_smoke.mjs` accepte maintenant les 2 modes (`strict` ou `bypass`),
  - verification executee: `node scripts/qa/ua_ctf_e2e_smoke.mjs` => `All UA + CTF smoke checks passed`.

## Fichiers modifies (session actuelle incluse)
- [x] /IMPLEMENTATION_TRACKER_UA_PLAN.md
- [x] /backend/api-gateway/src/services/cursusUa.service.ts
- [x] /backend/api-gateway/src/services/ctfLab.service.ts
- [x] /backend/api-gateway/src/controllers/cursusUa.controller.ts
- [x] /backend/api-gateway/src/routes/cursus.routes.ts
- [x] /backend/api-gateway/src/controllers/cursus.controller.ts
- [x] /backend/lab-orchestrator/src/index.ts
- [x] /frontend/portal/src/app/student/cursus/types.ts
- [x] /frontend/portal/src/app/student/cursus/[cursusId]/[moduleId]/page.tsx
- [x] /frontend/portal/src/app/student/cursus/[cursusId]/[moduleId]/ua/[unitId]/page.tsx
- [x] /scripts/qa/ua_ctf_e2e_smoke.mjs
- [x] /docker-compose-runtime.yml
- [x] /Makefile
- [x] /README.md
- [x] /DOCKER_DEPLOYMENT.md
- [x] /scripts/deploy-runtime-test-all.ps1
- [x] /frontend/portal/src/app/student/cursus/[cursusId]/[moduleId]/ua/page.tsx
- [x] /.env
- [x] /.env.example

## Etat final de cette phase
- [x] Plan corrige UA+CTF implemente et valide en smoke E2E.
- [ ] Lot 2 non demarre: UI formateur d'authoring complet.

## Reprise rapide
- Point d'entree test: `node scripts/qa/ua_ctf_e2e_smoke.mjs`
- Si echec machine UA:
  - verifier `LAB_ENABLE_DOCKER_ACTIONS=true`,
  - verifier `LAB_CONTROL_NETWORK_NAME=pmp_monetic-network`,
  - verifier images lab requises presentes.
