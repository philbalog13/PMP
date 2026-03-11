# Plan de remise a niveau vers 100% fiabilite

Derniere mise a jour: 2026-03-06 18:07 (Europe/Paris)

Objectif: rendre la plateforme PMP reconstruisible depuis le code source courant, coherente fonctionnellement, et prouvable par une chaine de validation fiable.

## Definition du "100%"

Le projet ne sera considere a 100% que si les 7 conditions ci-dessous sont vraies en meme temps:

- Le code source courant rebuild tous les services et interfaces declares dans le runtime.
- Tous les builds locaux critiques passent sans bypass silencieux.
- Toutes les suites de tests de reference passent avec une configuration executable.
- Le runtime complet peut etre lance depuis une machine fraiche avec une procedure standard unique.
- Les parcours metier critiques donnent des resultats coherents avec les dashboards et les ecritures.
- La documentation et les scripts de deploiement refletent exactement la realite.
- Les preuves d'execution sont archivees dans un dossier d'evidence versionne ou exportable.

## Baseline issue de l'audit

### Ce qui fonctionne vraiment aujourd'hui

- Stack Docker runtime deja demarree et joignable.
- Healthchecks backend verifies en HTTP: OK.
- Smoke UA + CTF: OK.
- Parcours client: OK.
- Parcours formateur: OK.
- Parcours etudiant: OK au niveau API.
- Parcours marchand: OK partiel, avec incoherence dashboard.

### Ecarts majeurs constates

- `frontend/hsm-web` ne build pas.
- `backend/sim-auth-engine` ne build pas.
- `backend/sim-network-switch` ne build pas.
- `frontend/portal` masque les erreurs TypeScript avec `ignoreBuildErrors`.
- Les tests racine du repo ne sont pas executables tels quels.
- `sim-auth-engine` reference une config d'integration absente.
- Les tests ACS d'integration pointent vers un mauvais port.
- Le dashboard marchand n'integre pas les transactions POS simulees.
- La doc de deploiement et certains scripts legacy ne refletent plus la realite du runtime.

### Complement audit detaille 4 parcours

- Client:
  - 32 checks, 31 OK, 1 KO.
  - Ecart principal: `GET /api/users/me` retourne `403`.
- Marchand:
  - 40 checks, 33 OK, 6 KO reels, 1 regle metier attendue.
  - 8 checks complementaires sur vraies transactions client: 8 OK.
  - Ecart critique: une vente POS approuvee credite le ledger et le pending balance mais reste invisible du dashboard, des rapports et du detail terminal.
- Etudiant / Formateur:
  - 76 checks, 72 OK, 4 KO.
  - Les transactions plateforme ETUDIANT / FORMATEUR ont ensuite ete validees en liste + detail + timeline.
- Nouveaux ecarts critiques identifies:
  - `/api/users/me` casse pour les 4 roles a cause d'une collision de routing.
  - Le dashboard etudiant depend de cette route pour l'onboarding.
  - `POST /api/hsm/config` repond `200` mais ne modifie rien en pratique.
  - Certaines pages portail injectent de fausses donnees si l'API echoue.
  - Certaines pages learning affichent des metriques heuristiques et non la source de verite backend.
- Rapport detaille:
  - `AUDIT_4_PARCOURS_DETAILLE.md`

## Regles de suivi

- Mettre a jour ce fichier apres chaque lot termine.
- Ne marquer `[x]` qu'apres validation reelle, pas apres simple lecture de code.
- Pour chaque lot termine, ajouter la preuve dans `docs/test-evidence/<date>-audit-remediation/`.
- Si un choix reduit le niveau d'exigence au lieu de corriger la cause racine, le noter explicitement dans "Decision".

## Sequence cible

1. Reparer la reconstruisibilite du code courant.
2. Reparer la fiabilite des tests et des scripts de verification.
3. Corriger les incoherences fonctionnelles observees en runtime.
4. Aligner l'outillage ops et la documentation.
5. Executer une recette finale complete avec preuves.

## Tracker macro

| Phase | Intitule | Priorite | Statut | Sortie attendue |
|---|---|---|---|---|
| P0 | Reproductibilite source | Critique | [x] | Tous les builds critiques passent |
| P1 | Fiabilite des tests | Critique | [x] | Suites de reference executables et vertes |
| P2 | Coherence metier | Critique | [x] | Flows et dashboards alignes |
| P3 | Ops et documentation | Haute | [x] | Procedure standard unique et doc fiable |
| P4 | Recette finale et evidence | Critique | [x] | Pack de preuves complet |

## P0 - Reproductibilite source

### Lot P0.1 - Reparer `hsm-web`

- Statut: [x]
- Priorite: Critique
- Portee:
  - `frontend/hsm-web/Dockerfile`
  - `frontend/hsm-web/app/config/page.tsx`
  - `frontend/hsm-web/app/vuln/page.tsx`
  - `frontend/hsm-web/lib/hsm-api.ts`
  - `frontend/hsm-web/next.config.ts`
  - `frontend/hsm-web/tsconfig.json`
- Probleme:
  - L'UI utilise `simulateDown` alors que le type `VulnerabilityConfig` ne le declare pas.
  - Le rebuild Docker runtime de `hsm-web` ne reconstruit pas correctement les chemins `@shared` et les imports CSS partages.
- Actions:
  - Contrat `VulnerabilityConfig` aligne avec le backend reel:
    - ajout de `simulateDown`
    - ajout de `timingAttackEnabled`
  - Page `config` et mapper front alignes sur les 6 toggles backend.
  - Resolution `@shared` rendue compatible layout local + layout image Docker.
  - `Dockerfile` corrige pour copier `shared` dans l'arborescence attendue par l'app.
  - Validation UI reelle du toggle `Rate Limiting` sur `hsm-web`.
- Definition of done:
  - `npm run build --prefix frontend/hsm-web` passe.
  - Le toggle "Rate Limiting" est branche sur un champ reel.
  - Le comportement est verifie en runtime.
- Validation:
  - `npm run build --prefix frontend/hsm-web`
  - `docker build -t pmp-hsm-web -f frontend/hsm-web/Dockerfile frontend`
  - verification HTTP sur `http://localhost:3006`
  - verification navigateur sur `http://localhost:3006/vuln`
- Resultat:
  - OK le 2026-03-06.
  - Build local: OK.
  - Build image Docker runtime: OK.
  - Redeploiement `pmp-hsm-web`: OK.
  - `GET http://localhost:3006/api/health`: `200`.
  - `GET http://localhost:3006/vuln`: `200`.
  - Toggle `Rate Limiting` verifie en UI reelle et mappe vers `simulateDown`.
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p01-hsm-web.md`

### Lot P0.2 - Reparer `sim-auth-engine`

- Statut: [x]
- Priorite: Critique
- Portee:
  - `backend/sim-auth-engine/src/app.ts`
  - `backend/sim-auth-engine/src/index.ts`
  - `backend/sim-auth-engine/src/utils/mtls.helper.ts`
  - `backend/sim-auth-engine/jest.integration.config.js`
  - `backend/sim-auth-engine/tests/setup.ts`
  - `backend/sim-auth-engine/tests/integration/*`
- Probleme:
  - Erreur TS sur `startMTLSServer(app, ...)`.
  - Le script `test:integration` reference une config Jest absente.
- Actions:
  - Typage mTLS corrige en passant le helper sur `Application` au lieu de `Express`.
  - Separation `createApp()` / bootstrap serveur ajoutee pour rendre le service testable sans ecoute reseau.
  - Ajout de `jest.integration.config.js` manquant.
  - Ajout d'un setup de test partage et de vrais tests integration sur:
    - `GET /health`
    - `GET /health/live`
    - `GET /health/ready`
    - `POST /authorize`
    - `GET /transactions/:pan`
    - `POST /simulate/:scenario`
  - Rejoue build + tests unitaires + tests integration.
- Definition of done:
  - `npm run build --prefix backend/sim-auth-engine` passe.
  - `npm test --prefix backend/sim-auth-engine` passe.
  - `npm run test:integration --prefix backend/sim-auth-engine` passe avec une vraie config.
- Validation:
  - `npm run build --prefix backend/sim-auth-engine`
  - `npm test --prefix backend/sim-auth-engine -- --runInBand`
  - `npm run test:integration --prefix backend/sim-auth-engine -- --runInBand`
- Resultat:
  - OK le 2026-03-06.
  - Build `backend/sim-auth-engine`: OK.
  - Tests package `backend/sim-auth-engine`: OK.
  - Tests integration `backend/sim-auth-engine`: OK.
  - Le service est maintenant reconstruisible et son script `test:integration` est reellement executable depuis le repo.
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p02-sim-auth-engine.md`

### Lot P0.3 - Reparer `sim-network-switch`

- Statut: [x]
- Priorite: Critique
- Portee:
  - `backend/sim-network-switch/src/index.ts`
  - `backend/sim-network-switch/src/utils/mtls.helper.ts`
  - `backend/sim-network-switch/src/services/routing.service.ts`
  - `backend/sim-network-switch/tests/integration/phase8-audit-bi.test.ts`
- Problemes:
  - Erreur TS sur `startMTLSServer(app, ...)`.
  - Divergence entre la reponse reelle et ce que le test attend.
- Actions:
  - Typage mTLS corrige en passant le helper sur `Application`.
  - Verite unique fixee sur le contrat `TransactionResponse` top-level.
  - Normalisation de la reponse brute issuer ajoutee dans `routing.service.ts`:
    - mapping vers `stan`
    - `acquirerReferenceNumber`
    - `responseCode`
    - `responseMessage`
    - `authorizationCode`
    - `networkId`
    - `issuerRoutingInfo`
    - `processedAt`
    - `responseTime`
    - champs supplementaires preserves dans `additionalData`
  - Mock `axios` de la Phase 8 corrige pour supporter `axios.create()` et les deux appels d'integration attendus.
  - Rejoue build + tests unitaires + tests integration.
- Definition of done:
  - `npm run build --prefix backend/sim-network-switch` passe.
  - `npm test --prefix backend/sim-network-switch` passe.
  - `npm run test:integration --prefix backend/sim-network-switch` passe.
- Validation:
  - `npm run build --prefix backend/sim-network-switch`
  - `npm test --prefix backend/sim-network-switch -- --runInBand`
  - `npm run test:integration --prefix backend/sim-network-switch -- --runInBand`
- Resultat:
  - OK le 2026-03-06.
  - Build `backend/sim-network-switch`: OK.
  - Tests package `backend/sim-network-switch`: OK.
  - Tests integration `backend/sim-network-switch`: OK.
  - Le contrat de sortie du switch est maintenant stable et explicite.
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p03-sim-network-switch.md`

### Lot P0.4 - Retirer les bypass de build dangereux

- Statut: [x]
- Priorite: Critique
- Portee:
  - `frontend/portal/next.config.ts`
  - `frontend/shared/components/notion/*`
  - `frontend/shared/components/banking/data-display/StatCard.tsx`
  - pages portail en erreur TypeScript
- Probleme:
  - `ignoreBuildErrors` reduit la valeur du build vert.
- Actions:
  - Inventaire des erreurs reelles fait via `npx tsc --noEmit` sur `frontend/portal`.
  - Correction des contrats trop etroits dans les composants partages Notion:
    - `NotionPill` accepte maintenant `danger`
    - `NotionProgress` accepte `default`, `max` et `style`
    - `NotionBadge` accepte `style`
    - `NotionSkeleton` accepte `style`
  - `StatCard` et les pages marchand corrigees pour un delta typable et coherent.
  - Route UA Next alignee sur le contrat `params: Promise<...>`.
  - `Navbar` typage explicite pour supprimer les unions bancales sur `dropdown`.
  - `merchant/api` corrige pour utiliser `formatDateTimeString` au lieu d'appeler `formatDateTime(Date)` avec une chaine.
  - Bloc `typescript.ignoreBuildErrors` retire de `frontend/portal/next.config.ts`.
  - Verification complementaire: aucune autre app frontend critique n'utilise `ignoreBuildErrors`.
- Definition of done:
  - `frontend/portal` build sans bypass.
  - Toute app Next critique build avec un signal fiable.
- Validation:
  - `npm exec --prefix frontend/portal tsc -- --noEmit`
  - `npm run build --prefix frontend/portal`
  - `rg -n "ignoreBuildErrors" frontend -g "next.config.*"`
- Resultat:
  - OK le 2026-03-06.
  - `npx tsc --noEmit` dans `frontend/portal`: OK.
  - `npm run build` dans `frontend/portal`: OK, avec vraie phase `Running TypeScript ...`.
  - `ignoreBuildErrors` supprime du portail.
  - Recherche repo `ignoreBuildErrors` sur `frontend/*/next.config.*`: aucun autre bypass trouve.
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p04-portal-build-signal.md`

## P1 - Fiabilite des tests

### Lot P1.1 - Rendre les tests racine executables

- Statut: [x]
- Priorite: Critique
- Portee:
  - `jest.config.js`
  - `jest.integration.js`
  - `tsconfig.jest.json`
  - `setupTests.ts`
  - quelques suites racine en echec reel
- Probleme:
  - Les suites Jest racine ne resolvent pas `ts-jest`.
- Actions:
  - Strategie retenue: conserver les suites a la racine, mais faire pointer explicitement les configs root vers le toolchain versionne sous `tests/integration/node_modules`.
  - `jest.config.js` et `jest.integration.js` rebranches sur `ts-jest` explicite + mapper `axios`.
  - `tsconfig.jest.json` ajoute pour donner une resolution TS stable a `@jest/globals`, `axios` et `@/*` utilise par `tpe-web`.
  - Suites reellement bloquees ensuite corrigees:
    - adresse Ethereum invalide dans `tests/unit/backend/blockchain-service/settlement.test.ts`
    - import relatif faux + globals Jest dans `tests/integration/boot-sequence/tpe-health-check.test.ts`
    - PAN de test et assertions d'ordre d'appels HSM dans `tests/integration/issuer-flow-full.test.ts`
  - `frontend/tpe-web/lib/api-client.ts` ajuste minimalement pour compiler proprement dans ce contexte Jest strict.
  - Commandes de reference documentees et rejouees depuis la racine.
- Definition of done:
  - `npx jest -c jest.config.js` passe depuis la racine.
  - `npx jest -c jest.integration.js` passe depuis la racine.
- Validation:
  - `npx jest -c jest.config.js --runInBand`
  - `npx jest -c jest.integration.js --runInBand`
- Resultat:
  - OK le 2026-03-06.
  - Suite racine unitaire: `17/17` suites OK, `51/51` tests OK.
  - Suite racine integration: `8/8` suites OK, `13/13` tests OK.
  - Les configs racine ne dependent plus d'une resolution implicite de `ts-jest` depuis un `node_modules` root absent.
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p11-root-jest.md`

### Lot P1.2 - Reparer les tests integration ACS

- Statut: [x]
- Priorite: Haute
- Portee:
  - `backend/acs-simulator/src/__tests__/acs.test.ts`
  - config d'execution integration ACS
- Probleme:
  - Les tests pointent `http://localhost:8088` alors que le runtime expose `8013`.
- Actions:
  - Export de `createApp()` et `startServer()` dans `backend/acs-simulator/src/index.ts`.
  - Les tests integration ACS levent maintenant leur propre serveur Express sur un port ephemere, ce qui supprime la dependance a un service externe et a un port hardcode.
  - `acs.test.ts` n'utilise plus `8088`; la base URL devient dynamique avec repli `127.0.0.1:8013`.
  - Les attentes de challenge ont ete rendues deterministes en forcant un cas haut risque reel (`cardholderName: TEST USER`).
  - Les assertions d'URL de challenge ont ete alignees sur la vraie construction de `ThreeDSecureService`.
- Definition of done:
  - `npm run test:integration --prefix backend/acs-simulator` passe.
- Validation:
  - `npm run build --prefix backend/acs-simulator`
  - `npm run test:integration --prefix backend/acs-simulator -- --runInBand`
  - `npm test --prefix backend/acs-simulator -- --runInBand`
- Resultat:
  - OK le 2026-03-06.
  - Build `backend/acs-simulator`: OK.
  - `npm run test:integration --prefix backend/acs-simulator -- --runInBand`: OK (`12/12` tests).
  - `npm test --prefix backend/acs-simulator -- --runInBand`: OK, avec integrations skippees hors mode dedie.
  - Aucune modification manuelle de port n'est necessaire pour la recette locale.
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p12-acs-integration.md`

### Lot P1.3 - Reparer les tests integration `sim-auth-engine`

- Statut: [x]
- Priorite: Critique
- Portee:
  - `backend/sim-auth-engine/package.json`
  - fichier de config Jest integration manquant
- Probleme:
  - `test:integration` reference `jest.integration.config.js` absent.
- Actions:
  - Ajouter la config manquante ou corriger le script.
  - Verifier le scope exact des tests integration attendus.
- Definition of done:
  - La commande `npm run test:integration --prefix backend/sim-auth-engine` existe et passe.
- Resultat:
  - OK le 2026-03-06, traite pendant `P0.2`.
  - `backend/sim-auth-engine/jest.integration.config.js` ajoute.
  - `npm run test:integration --prefix backend/sim-auth-engine -- --runInBand`: OK.
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p02-sim-auth-engine.md`

### Lot P1.4 - Stabiliser `key-management`

- Statut: [x]
- Priorite: Haute
- Portee:
  - `backend/key-management`
  - `src/services/pki.service.ts`
  - tests associes
- Probleme:
  - Les tests passent mais le package echoue sur coverage.
- Actions:
  - Ajout d'une vraie suite `pki.service.test.ts` couvrant:
    - generation initiale de la Root CA
    - rechargement d'une CA existante depuis le disque
    - certificat microservice
    - certificat EMV card
    - erreurs `CA not initialized`
  - Ajout des branches manquantes de `key.service.test.ts`:
    - `DES`
    - fallback algorithme inconnu
    - `getKeyData`
    - `updateKeyStatus`
    - `exportKey`
    - KCV `000000` sur materiel invalide
  - Aucun abaissement de seuil.
- Definition of done:
  - `npm test --prefix backend/key-management` passe vraiment en sortie 0.
- Validation:
  - `npm test --prefix backend/key-management -- --runInBand`
- Resultat:
  - OK le 2026-03-06.
  - `npm test --prefix backend/key-management -- --runInBand`: OK.
  - Coverage finale:
    - statements `100%`
    - branches `100%`
    - functions `100%`
    - lines `100%`
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p14-key-management.md`

### Lot P1.5 - Distinguer tests reels et tests mockes

- Statut: [x]
- Priorite: Haute
- Portee:
  - `tests/security/penetration.test.ts`
  - `tests/security/penetration/sql-injection.test.ts`
  - `tests/security/service/pan-masking.test.ts`
  - `tests/security/README.md`
  - `docs/security/best-practices.md`
  - documentation QA
- Probleme:
  - Une partie des tests "security" valide un mock local, pas la plateforme.
- Actions:
  - Taxonomie explicite mise en place dans `tests/security`:
    - `mock` pour les suites pedagogiques locales
    - `service` pour le vrai code repo execute en isolation
    - `live` pour les requetes HTTP contre la plateforme running
  - Scripts package clarifies:
    - `npm test` = offline (`mock + service`)
    - `npm run test:mock`
    - `npm run test:service`
    - `npm run test:live`
    - `npm run test:all`
  - Les suites mockes ont ete re-etiquetees dans leurs titres de test pour afficher `(mock)` a l'execution.
  - Ajout d'une vraie suite `service` sur `backend/monitoring-service/src/utils/pan-masking.ts`.
  - Ajout d'un `README` de taxonomie dans `tests/security/`.
  - La doc `docs/security/best-practices.md` ne cite plus `penetration.test.ts` comme preuve live.
- Definition of done:
  - Un lecteur du repo peut distinguer en 30 secondes ce qui prouve la plateforme reelle.
  - Les rapports de test separeront clairement mock et live.
- Validation:
  - `npm run test:mock --prefix tests/security`
  - `npm run test:service --prefix tests/security`
  - `npm run test:live --prefix tests/security`
  - `npm test --prefix tests/security`
  - `npm run test:all --prefix tests/security`
- Resultat:
  - OK le 2026-03-06.
  - `mock`: `6/6` suites OK, `44/44` tests OK.
  - `service`: `1/1` suite OK, `3/3` tests OK.
  - `live`: `1/1` suite OK, `7/7` tests OK.
  - `npm test --prefix tests/security` ne lance plus de preuve live implicite; il execute maintenant le gate offline `mock + service`.
  - `npm run test:all --prefix tests/security` assemble explicitement les trois niveaux de preuve.
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p15-security-proof-levels.md`

## P2 - Coherence metier

### Lot P2.1 - Aligner simulation POS et dashboard marchand

- Statut: [x]
- Priorite: Critique
- Portee:
  - `backend/api-gateway/src/controllers/merchant.controller.ts`
  - eventuelle ecriture ledger / settlement / dashboard
  - scripts marchand
- Probleme:
  - Une transaction POS approuvee ne remonte pas dans le dashboard marchand du meme parcours.
- Decision a prendre:
  - Option A: une transaction POS simulee est une transaction reelle et doit nourrir dashboard et recent transactions.
  - Option B: elle reste purement pedagogique, alors le dashboard et le script doivent l'annoncer clairement.
- Recommandation:
  - Option A, car le parcours actuel vend un comportement "production".
- Actions:
  - Remplacer la clause de filtrage marchand pour accepter les transactions POS externes sans `client_id`, tout en gardant l'integrite obligatoire cote marchand.
  - Rendre la clause robuste a tous les points d'insertion SQL en la parenthesant explicitement.
  - Aligner les endpoints marchand suivants sur la meme visibilite:
    - dashboard
    - recent transactions
    - listing
    - detail
    - timeline
    - detail terminal
    - report daily
    - reconciliation
    - export
    - lookups `void` / `refund`
  - Ajouter un test de non-regression sur la clause de visibilite.
- Definition of done:
  - Apres un POS `APPROVED`, le dashboard marchand et l'historique refleteront le resultat attendu.
- Validation:
  - `npm run build --prefix backend/api-gateway`
  - `npx jest backend/api-gateway/src/__tests__/merchant-visibility-clause.test.ts --runInBand`
  - validation HTTP runtime sur `http://localhost:8000` avec login marchand reel
  - creation POS `APPROVED`
  - verification dashboard / liste / detail / timeline / detail terminal / daily / reconciliation
  - verification complementaire `void` / `refund` / `export`
- Resultat:
  - OK le 2026-03-06.
  - Build `backend/api-gateway`: OK.
  - Test `merchant-visibility-clause`: 2/2 OK.
  - Une transaction POS externe `APPROVED` (`POS17728032768334Q9K`) remonte bien dans:
    - dashboard `today.transactionCount=1`, `revenue=21.37`
    - `recentTransactions`
    - `GET /api/merchant/transactions?search=...`
    - `GET /api/merchant/transactions/:id`
    - `GET /api/merchant/transactions/:id/timeline`
    - `GET /api/merchant/pos/:id`
    - `GET /api/merchant/reports/daily`
    - `GET /api/merchant/reports/reconciliation`
  - Le `pendingBalance` marchand evolue bien apres la vente (`8975.03 -> 8996.40`).
  - Validation complementaire sur transactions POS externes:
    - `void` OK sur `POS1772803325262KTI0` -> statut `CANCELLED`
    - `refund` OK sur `POS1772803325350QY2J` -> original `REFUNDED`, refund `REF1772803325369RZ8A` visible en detail + timeline
    - `export` OK -> contient la vente annulee, la vente remboursee et la transaction de refund
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p21-merchant-pos-dashboard.md`

### Lot P2.2 - Durcir le parcours etudiant

- Statut: [x]
- Priorite: Haute
- Portee:
  - `scripts/test-student-production-journey.ps1`
  - APIs exercices / quiz
- Probleme:
  - Le script peut finir vert avec `0` exercice et `0%` au quiz.
- Actions:
  - Le script a ete transforme en gate strict:
    - `Fail` immediat sur absence d'atelier
    - `Fail` sur contenu atelier vide
    - `Fail` sur quiz sans questions
    - `Fail` si le quiz ne produit ni score exploitable ni correction explicite
  - Les logs ont ete alignes sur les valeurs reelles renvoyees par l'API:
    - progression atelier lue depuis `progress.progress_percent`
    - badges lus via `earned/total`
  - Le parcours teste maintenant un vrai exercice assigne:
    - si aucun exercice n'est assigne au nouvel etudiant, le script bootstrap un formateur temporaire
    - cree un exercice reel
    - l'assigne a l'etudiant
    - verifie le detail cote etudiant
    - soumet l'exercice avec statut `SUBMITTED`
  - Le quiz est maintenant prouve en deux temps:
    - tentative 1 avec reponses baselines
    - verification du `review`
    - tentative 2 reconstruite depuis `correctOptionIndex`
    - verification `passed`, `attempt_number`, `bestScore`
  - Le script verifie ensuite la persistence serveur dans:
    - `GET /api/progress`
    - `GET /api/progress/stats`
    - `GET /api/progress/badges`
    - `GET /api/progress/quiz/:quizId/results`
- Definition of done:
  - Le script echoue si le contenu pedagogique critique n'est pas reellement exploitable.
- Validation:
  - `powershell -ExecutionPolicy Bypass -File scripts/test-student-production-journey.ps1`
- Resultat:
  - OK le 2026-03-06.
  - Le script ne peut plus sortir vert avec `0` exercice et `0%` sans preuve de correction.
  - Validation runtime observee:
    - `6` ateliers charges
    - contenu atelier `intro` non vide
    - exercice bootstrap cree, assigne, detaille et soumis
    - quiz `quiz-intro` charge avec `10` questions
    - tentative 1 `0%` mais `review` complet
    - tentative 2 `100%`, `passed=true`
    - historique quiz `>= 2` tentatives
    - atelier complete cote serveur
    - stats et badges coherents apres parcours (`4/13` badges gagnes)
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p22-student-journey-gate.md`

### Lot P2.3 - Auditer et corriger les scripts workflow legacy

- Statut: [x]
- Priorite: Haute
- Portee:
  - `tests/workflow/*.ps1`
  - `tests/workflow/current/*`
  - `tests/workflow/legacy/*`
  - `tests/workflow/README.md`
  - `scripts/test-user-journeys.ps1`
  - anciens endpoints frontend/backend
- Probleme:
  - `tests/workflow/01-create-card.ps1` echoue deja en 401 et ne reflete plus les routes/permissions actuelles.
- Actions:
  - Audit runtime des scripts legacy realise:
    - `00-health-check.ps1` KO sur ports/semantique de health obsoletes
    - `01-create-card.ps1` KO en `401`
    - `02-submit-transaction.ps1` KO des le parsing, avec dependance `state.json` et endpoint obsolete
  - Reclassification explicite du dossier:
    - `tests/workflow/current/` pour les scripts encore recommandables
    - `tests/workflow/legacy/` pour les reliquats archives
  - Ajout d'un vrai health check current sur les ports runtime actuels:
    - `tests/workflow/current/00-runtime-health.ps1`
  - Ajout de wrappers current vers les parcours maintenus:
    - client
    - marchand
    - etudiant
    - formateur
  - Ajout d'un runner current:
    - `tests/workflow/current/run-all.ps1`
  - Ajout d'une doc de source de verite:
    - `tests/workflow/README.md`
  - Correction du faux vert dans `scripts/test-user-journeys.ps1`:
    - script manquant detecte explicitement
    - `test-vuln-sandbox.ps1` traite comme optionnel
    - plus de resume "All journeys passed" alors qu'un script obligatoire manquerait
- Definition of done:
  - Aucun script de verification recommande ne repose sur des endpoints morts ou des hypothese obsoletes.
- Validation:
  - `powershell -ExecutionPolicy Bypass -File tests/workflow/legacy/00-health-check.ps1`
  - `powershell -ExecutionPolicy Bypass -File tests/workflow/legacy/01-create-card.ps1`
  - `powershell -ExecutionPolicy Bypass -File tests/workflow/current/00-runtime-health.ps1`
  - `powershell -ExecutionPolicy Bypass -File tests/workflow/current/run-all.ps1`
  - `powershell -ExecutionPolicy Bypass -File scripts/test-user-journeys.ps1`
- Resultat:
  - OK le 2026-03-06.
  - Les scripts legacy ne sont plus presentes a la racine de `tests/workflow`.
  - `current/00-runtime-health.ps1`: OK.
  - `current/run-all.ps1`: OK.
  - `scripts/test-user-journeys.ps1`: OK, avec `Vuln Sandbox Journey` skippe proprement si absent.
  - Les scripts recommandes pointent maintenant vers les scripts de parcours reellement maintenus.
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p23-workflow-scripts.md`

### Lot P2.4 - Valider les frontends par parcours reel

- Statut: [x]
- Priorite: Haute
- Portee:
  - `scripts/qa/frontend_apps_smoke.mjs`
  - `portal`
  - `client-interface` / `tpe-web`
  - `user-cards-web`
  - `hsm-web`
  - `monitoring-dashboard`
  - `3ds-challenge-ui`
  - `Makefile`
  - `scripts/deploy-runtime-test-all.ps1`
- Problemes:
  - Il n'existait pas de couverture smoke navigateur standard par frontend.
  - Les validations UI etaient eparses, ponctuelles, et centrees sur quelques preuves ad hoc.
  - Un smoke base sur `localStorage` seul produit un faux negatif avec les guards Next, car le middleware lit les cookies avant le bootstrap client.
- Actions:
  - Ajout d'un smoke Playwright headless data-driven pour les 6 apps runtime:
    - `portal`
    - `tpe-web`
    - `user-cards-web`
    - `hsm-web`
    - `monitoring-dashboard`
    - `3ds-challenge-ui`
  - Auth reelle sur les personas seeds:
    - client
    - marchand
    - etudiant
    - formateur
  - Injection cookies + `localStorage` avant la premiere requete pour respecter les guards de role.
  - Verification par routes critiques, pas seulement `GET /` ou `/api/health`.
  - Check interactif sur le flow 3DS avec OTP reel (`123456`) et attente de `Challenge valide`.
  - Point d'entree standard ajoute dans le `Makefile`:
    - `runtime-frontend-smoke`
  - `runtime-test-all` et `scripts/deploy-runtime-test-all.ps1` enrichis pour enchainer aussi ce smoke frontend.
- Definition of done:
  - Chaque frontend critique a au moins un smoke navigateur reel sur sa route majeure.
  - Le point d'entree runtime standard execute aussi cette couverture UI minimale.
- Validation:
  - `node scripts/qa/frontend_apps_smoke.mjs`
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-runtime-test-all.ps1 -NoBuild -SkipImageBootstrap`
- Resultat:
  - OK le 2026-03-06.
  - Smoke frontend direct: `8/8` checks OK.
  - Validation runtime standard: `deploy-runtime-test-all.ps1` OK avec:
    - stack runtime levee
    - smoke `UA + CTF` OK
    - smoke frontend `8/8` OK
  - Apps couvertes:
    - `portal` login UI + dashboards marchand/formateur
    - `tpe-web`
    - `user-cards-web`
    - `hsm-web`
    - `monitoring-dashboard`
    - `3ds-challenge-ui`
  - Note:
    - le runtime seed reel utilise `qa-pass-123`; la doc et la collection Postman qui annoncent encore `pmp-password-2026` restent a nettoyer en `P3.2`.
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p24-frontend-app-smokes.md`

### Lot P2.5 - Reparer `GET /api/users/me` pour les 4 roles

- Statut: [x]
- Priorite: Critique
- Portee:
  - `backend/api-gateway/src/app.ts`
  - `backend/api-gateway/src/routes/users.routes.ts`
  - `backend/api-gateway/src/routes/gateway.routes.ts`
  - `backend/api-gateway/src/controllers/users.controller.ts`
  - `backend/api-gateway/src/database/migrations/055_user_preferences.sql`
- Probleme:
  - `GET /api/users/me` est masque par `GET /api/users/:id`.
  - Symptomes verifies:
    - `ROLE_CLIENT`: `403`
    - `ROLE_MARCHAND`: `403`
    - `ROLE_ETUDIANT`: `403`
    - `ROLE_FORMATEUR`: `500` sur cast UUID invalide
  - Le handler `getMe` dependait aussi d'une colonne `users.users.preferences` absente du runtime audite.
- Actions:
  - Routes explicites `GET /api/users/me` et `POST /api/users/me/preferences` ajoutees avant `/:id` dans `users.routes`.
  - Protection explicite ajoutee contre la regression `:id = me` dans `users.controller`.
  - Migration `055_user_preferences.sql` ajoutee pour remettre le schema source en coherence.
  - Runtime actuel corrige en base pour ajouter `users.users.preferences`, car la stack `docker-compose-runtime.yml` lance `api-gateway` en `npm run dev` sans rejouer les migrations.
  - Endpoint verifie avec les 4 roles et verification complementaire sur `POST /api/users/me/preferences`.
- Definition of done:
  - `GET /api/users/me` retourne `200` et le bon profil pour les 4 roles.
- Validation:
  - script HTTP multi-role
  - verification portail etudiant onboarding
- Resultat:
  - OK le 2026-03-06.
  - `GET /api/users/me`: `200` pour client, marchand, etudiant, formateur.
  - `POST /api/users/me/preferences`: `200`, puis relecture `GET /api/users/me` avec persistence confirmee.
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p25-users-me.md`

### Lot P2.6 - Reparer l'onboarding etudiant pour qu'il repose sur un etat serveur fiable

- Statut: [x]
- Priorite: Critique
- Portee:
  - `frontend/portal/src/app/student/page-content.tsx`
  - `frontend/portal/src/app/student/onboarding/page.tsx`
  - `frontend/portal/src/lib/onboarding.ts`
- Problemes:
  - Le dashboard etudiant depend de `/api/users/me`, corrige dans `P2.5` mais encore sensible si la persistence preferences echoue cote UI.
  - La page onboarding marque l'etat localement meme si la sauvegarde serveur echoue.
- Actions:
  - Le dashboard etudiant interroge maintenant d'abord `/api/users/me` et n'utilise le flag local qu'en repli si l'API est indisponible alors que l'utilisateur est deja marque localement.
  - Le flag local est efface si le serveur dit `onboardingDone = false`.
  - La page onboarding recharge le profil serveur au boot, pre-remplit les preferences existantes et redirige vers `/student` si l'utilisateur est deja onboarde cote serveur.
  - `saveAndRedirect()` ne marque plus l'etat local apres un simple `fetch`; il exige un `POST /api/users/me/preferences` reussi puis une relecture `GET /api/users/me` confirmant `onboardingDone = true`.
  - En cas d'echec API, un message d'erreur explicite est affiche et l'utilisateur reste sur la page onboarding.
- Definition of done:
  - Un etudiant deja onboarde n'est pas renvoye en onboarding sur un nouveau navigateur.
  - Une sauvegarde echouee n'est plus maquillee par un succes local.
- Validation:
  - test manuel et test HTTP sur `POST /api/users/me/preferences` puis re-login
- Resultat:
  - OK le 2026-03-06.
  - Build `frontend/portal`: OK.
  - Validation navigateur: echec force de `POST /api/users/me/preferences` => pas de redirection, erreur visible, aucun flag `onboarding_done:*` en localStorage.
  - Puis sauvegarde serveur reussie => re-ouverture sur navigateur neuf vers `/student` sans repasser par `/student/onboarding`.
  - Acces direct a `/student/onboarding` avec utilisateur deja onboarde => redirection vers `/student`.
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p26-student-onboarding.md`

### Lot P2.7 - Corriger le pilotage HSM reel

- Statut: [x]
- Priorite: Critique
- Portee:
  - `backend/hsm-simulator/src/controllers/hsm.controller.ts`
  - `backend/hsm-simulator/src/services/VulnEngine.ts`
  - `frontend/portal/src/app/instructor/lab-control/page.tsx`
  - `frontend/hsm-web/app/config/page.tsx`
  - `frontend/hsm-web/lib/hsm-api.ts`
- Probleme:
  - `POST /api/hsm/config` repond `200` mais `VulnEngine.updateConfig()` est un no-op deprecie.
  - `GET /api/hsm/config` ne refletait donc aucune mutation reelle durable.
- Actions:
  - Mise en place d'une vraie configuration globale runtime dans `VulnEngine`.
  - Persistance Redis si disponible, avec repli memoire coherent sinon.
  - Middleware HSM modifie pour charger la config effective au lieu du faux `DEFAULT_CONFIG`.
  - `POST /hsm/config` remplace le no-op par une ecriture effective.
  - `GET /hsm/config` renvoie maintenant la config effective lue par le runtime.
  - Contrat front `hsm-web` aligne avec le backend sur les champs de vulnerabilites.
- Definition of done:
  - Un toggle HSM modifie reellement l'etat lu ensuite par `GET /api/hsm/config`.
- Validation:
  - `GET` avant / `POST` / `GET` apres
  - verification fonctionnelle via `POST http://localhost:8011/pin/verify`
  - restart runtime `docker restart pmp-hsm-simulator`
  - verification UI sur `lab-control` et `hsm-web`
- Resultat:
  - OK le 2026-03-06.
  - `GET /api/hsm/config` -> `POST /api/hsm/config` -> `GET /api/hsm/config`: mutation reelle observee.
  - `simulateDown=true` force bien `pin/verify` en mode `FAIL_OPEN`.
  - La config persiste apres restart de `pmp-hsm-simulator`.
  - Parcours formateur valide en UI reelle sur `http://localhost:3000/instructor/lab-control`.
  - Validation UI `hsm-web` realisee sur `http://localhost:3006/vuln`.
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p27-hsm-control.md`

### Lot P2.8 - Supprimer les faux etats UI et imposer la verite runtime

- Statut: [x]
- Priorite: Haute
- Portee:
  - `frontend/portal/src/app/merchant/api/page.tsx`
  - `frontend/portal/src/app/instructor/students/[id]/page.tsx`
  - autres ecrans analogues si trouves
- Problemes:
  - Certaines pages injectent des objets fictifs au lieu d'afficher une erreur ou un empty state.
- Actions:
  - Retirer toute injection de faux objets "production".
  - Remplacer par:
    - erreur claire
    - empty state
    - ou skeleton temporaire
- Definition of done:
  - Une panne API n'affiche plus de fausses donnees metier.
- Validation:
  - simulation d'echec API
  - verification visuelle des pages ciblees
- Resultat:
  - OK le 2026-03-06.
  - `merchant/api` n'injecte plus de fausse cle "Production Key" ni de faux webhook `example.com`.
  - `instructor/students/[id]` n'injecte plus de faux profil `Jean Dupont` ni de faux badges/progression.
  - Les deux pages distinguent maintenant:
    - donnees vides
    - donnees indisponibles
    - action de retry explicite
  - Validation build:
    - `npm run build --prefix frontend/portal`: OK
  - Validation runtime:
    - preuve navigateur sur build local du portail en `http://127.0.0.1:3010`
    - echec API force via interception Playwright
    - `merchant/api`: etats `Cles API indisponibles` et `Webhooks indisponibles` visibles, sans faux objets
    - `instructor/students/[id]`: etat `Fiche etudiant indisponible` + `Reessayer`, sans faux profil
  - Note de contexte:
    - l'instance runtime existante sur `http://localhost:3000` servait encore une image anterieure au correctif; la preuve `P2.8` a donc ete prise sur le build local courant pour eviter un faux negatif.
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p28-ui-runtime-truth.md`

### Lot P2.9 - Remplacer les heuristiques frontend learning par la source de verite backend

- Statut: [x]
- Priorite: Haute
- Portee:
  - `frontend/portal/src/app/student/quizzes/page-content.tsx`
  - `frontend/portal/src/app/student/progress/page-content.tsx`
  - `frontend/portal/src/app/student/page-content.tsx`
  - `frontend/portal/src/app/student/quizzes/page.tsx`
  - `frontend/portal/src/app/student/progress/page.tsx`
  - `backend/api-gateway/src/controllers/progress.controller.ts`
  - `backend/api-gateway/src/data/learningDefaults.ts`
- Problemes:
  - Le portail calcule certaines infos a partir d'heuristiques (`questions`, `timeLimit`, scores derives, etc.).
- Actions:
  - `student/quizzes` corrige:
    - suppression des derives `sections * 2` et `sections * 3`
    - lecture des vraies definitions via `GET /api/progress/quiz/:quizId`
    - lecture des vraies tentatives via `GET /api/progress/quiz/:quizId/results`
    - suppression du fallback `passed` base sur un seuil local
  - `student/progress` corrige:
    - suppression du faux XP par atelier
    - suppression du faux rang (`Debutant`, `Intermediaire`, etc.)
    - suppression du faux temps par section
    - suppression de la liste `Section 1`, `Section 2`, ... inventee
    - affichage de faits reels uniquement: progression, sections completees, temps passe, duree prevue backend, resume quiz reel
  - `student/dashboard` corrige:
    - mission pilotee par `GET /api/progress/next-step`
    - roadmap alignee sur les minutes backend quand elles existent
    - suppression du faux `Level` / `XP to next level`
  - Contrat backend source enrichi:
    - `getMyProgress` ajoute `sequence_status`, `unlocked` et les metadonnees quiz
    - `getWorkshopsCatalog` expose `quizTitle`, `quizPassPercentage`, `quizTimeLimitMinutes`, `quizQuestionCount`
    - `getMyStats` corrige `quizzes.total` et `quizzes.passed` pour compter des quiz distincts au lieu des tentatives
  - `student/quizzes/page.tsx` et `student/progress/page.tsx` convertis en wrappers vers `page-content` pour supprimer le delta de duplication
- Definition of done:
  - Les ecrans learning affichent uniquement des champs reels ou explicitement marques comme estimations.
- Validation:
  - `npm run build --prefix backend/api-gateway`
  - `npm run build --prefix frontend/portal`
  - comparaison payload API / rendu UI sur instance locale du portail
- Resultat:
  - OK le 2026-03-06.
  - `backend/api-gateway` build: OK.
  - `frontend/portal` build: OK.
  - Validation runtime sur `http://127.0.0.1:3010` avec le compte `student01@pmp.edu`.
  - Dashboard:
    - la mission reprend bien `GET /api/progress/next-step`
    - l'ancien texte `XP to next level` n'apparait plus
  - Quizzes:
    - `quiz-intro` affiche `10 questions`, `15 min`, `Seuil 80%`
    - `quiz-iso8583` affiche `16 questions`, `20 min`, `Seuil 80%`
    - la carte `quiz-iso8583` n'affiche plus le faux `24 min` qui venait de l'heuristique `sections * 3`
  - Progression:
    - la page affiche `2/5 sections`, `12 min`, `1h` pour l'atelier `intro`, alignes avec l'API
    - les anciens artefacts heuristiques `Debutant/Intermediaire/Expert` et `Section 1` n'apparaissent plus
  - Validation complementaire du contrat backend source:
    - une instance locale `api-gateway` source en `http://127.0.0.1:8020` expose bien les nouveaux champs quiz sur `GET /api/progress/workshops`
    - sous cette topologie locale, `GET /api/progress` et `GET /api/progress/stats` n'ont pas pu etre prouves en runtime; la preuve fonctionnelle de bout en bout repose donc sur le portail courant consomme sur la stack runtime existante, tandis que la source backend est prouvee au build et partiellement en runtime sur `workshops`
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p29-learning-source-of-truth.md`

## P3 - Ops et documentation

### Lot P3.1 - Definir une procedure standard unique

- Statut: [x]
- Priorite: Haute
- Portee:
  - `scripts/runtime-stack.mjs`
  - `Makefile`
  - `scripts/deploy-runtime-test-all.ps1`
  - `README.md`
  - `DOCKER_DEPLOYMENT.md`
  - `docker-compose-runtime.yml`
- Probleme:
  - `make runtime-up` ne bootstrap pas toutes les images si elles manquent.
  - Le vrai flux robuste vit dans un script PowerShell a part.
- Actions:
  - Creation d'un CLI runtime unique cross-platform:
    - `node scripts/runtime-stack.mjs`
  - Commandes unifiees:
    - `up`
    - `down`
    - `logs`
    - `smoke`
    - `frontend-smoke`
    - `test-all`
  - Options unifiees:
    - `--no-build`
    - `--skip-image-bootstrap`
    - `--skip-frontend-smoke`
  - `Makefile` converti en wrappers vers ce CLI pour toutes les cibles `runtime-*`.
  - `scripts/deploy-runtime-test-all.ps1` converti en wrapper vers ce CLI.
  - Compatibilite historique preservee dans PowerShell:
    - `-SkipSmoke` mappe vers `up`
  - `README.md` et `DOCKER_DEPLOYMENT.md` mis a jour pour pointer vers ce point d'entree unique.
  - `docker-compose-runtime.yml` nettoye:
    - suppression de `version: '3.8'` pour retirer le warning Compose obsolete de la procedure officielle.
- Definition of done:
  - Une procedure standard unique permet de lancer la stack complete depuis zero.
- Validation:
  - `node scripts/runtime-stack.mjs help`
  - `node scripts/runtime-stack.mjs up --no-build --skip-image-bootstrap`
  - `node scripts/runtime-stack.mjs test-all --no-build --skip-image-bootstrap`
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-runtime-test-all.ps1 -SkipSmoke -NoBuild -SkipImageBootstrap`
- Resultat:
  - OK le 2026-03-06.
  - Le runtime officiel a maintenant une seule source de verite:
    - `scripts/runtime-stack.mjs`
  - Validation CLI:
    - `help`: OK
    - `up --no-build --skip-image-bootstrap`: OK
    - `test-all --no-build --skip-image-bootstrap`: OK
    - `UA + CTF smoke`: OK
    - `frontend smoke`: `8/8` OK
  - Validation wrapper PowerShell:
    - `-SkipSmoke -NoBuild -SkipImageBootstrap`: OK
  - Validation wrapper Makefile:
    - non executee sur cette machine car `make` etait absent
    - risque residuel faible car les cibles `runtime-*` sont maintenant des wrappers one-line vers `node scripts/runtime-stack.mjs`
  - Le warning Compose `version is obsolete` ne sort plus sur la procedure officielle.
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p31-runtime-single-entrypoint.md`

### Lot P3.2 - Nettoyer la documentation obsolete

- Statut: [x]
- Priorite: Haute
- Portee:
  - `README.md`
  - `DOCKER_DEPLOYMENT.md`
  - `.env.example`
  - `backend/api-gateway/TEST-GUIDE.md`
  - `tests/postman_auth_tests.json`
- Problemes:
  - References a `merchant-interface` Vue.
  - Incoherences sur les ports et sur les services de reference.
  - Une partie de la doc et de l'outillage auth annonce encore `pmp-password-2026` alors que le seed runtime reel valide est `qa-pass-123`.
- Actions:
  - Inventaire runtime reel rejoue via `docker compose -f docker-compose-runtime.yml config --services`.
  - `README.md` corrige:
    - table des frontends runtime
    - diagramme runtime simplifie
    - mapping `client-interface` -> `frontend/tpe-web`
    - section `source of truth`
  - `DOCKER_DEPLOYMENT.md` corrige:
    - inventaire `29` services
    - ports exposes reels
    - routes Nginx reelles
    - suppression des faux secrets hardcodes
    - ajout des seed personas valides
  - `.env.example` aligne sur les origines runtime front reelles.
  - `backend/api-gateway/TEST-GUIDE.md` aligne sur:
    - `node scripts/runtime-stack.mjs up`
    - `docker compose -f docker-compose-runtime.yml ps`
    - vrais seeds `qa-pass-123`
  - `tests/postman_auth_tests.json` aligne sur:
    - `qa-pass-123`
    - `code2fa` pour formateur
- Definition of done:
  - La doc ne promet plus de composant inexistant.
  - Les ports, services et commandes matches sont reels.
  - L'outillage auth seed pointe vers les credentials et payloads valides.
- Validation:
  - `docker compose -f docker-compose-runtime.yml config --services`
  - verifications HTTP:
    - `http://localhost:3000/api/health`
    - `http://localhost:3001/api/health`
    - `http://localhost:3004/api/health`
    - `http://localhost:3006/api/health`
    - `http://localhost:3082/`
    - `http://localhost:3088/`
    - `http://localhost:8013/health`
  - logins verifies:
    - `POST /api/auth/client/login`
    - `POST /api/auth/marchand/login`
    - `POST /api/auth/etudiant/login`
    - `POST /api/auth/formateur/login`
  - `Get-Content tests/postman_auth_tests.json | ConvertFrom-Json`
  - grep negatif sur les derives obsoletes:
    - `merchant-interface`
    - `pmp-password-2026`
    - `2fa_code`
    - anciens CORS/ports/secrets fake
- Resultat:
  - OK le 2026-03-06.
  - Inventaire runtime confirme: `29` services.
  - Les ports documentes repondent bien en runtime:
    - `3000`, `3001`, `3004`, `3006`, `3082`, `3088`, `8013`
  - Les 4 logins seed valides sont prouves avec `qa-pass-123`.
  - La collection Postman parse et embarque maintenant les bons payloads.
  - Aucune reference obsolete ciblee ne reste dans les fichiers officiels controles.
- Evidence:
  - `docs/test-evidence/2026-03-06-audit-remediation/p32-docs-runtime-truth.md`

### Lot P3.3 - Formaliser les preuves de recette

- Statut: [x]
- Priorite: Haute
- Portee:
  - `docs/test-evidence/`
  - `docs/test-evidence/README.md`
  - `scripts/qa/export_runtime_evidence.mjs`
  - `scripts/qa/ua_ctf_e2e_smoke.mjs`
  - `scripts/qa/frontend_apps_smoke.mjs`
  - `scripts/runtime-stack.mjs`
  - `Makefile`
- Actions:
  - Standard de preuve documente dans `docs/test-evidence/README.md`:
    - date
    - commit
    - environnement
    - commandes
    - resultat
    - ecarts
    - artefacts
  - Les deux smokes officiels emettent maintenant un JSON structure via `PMP_SMOKE_REPORT_JSON`.
  - Nouveau script officiel:
    - `node scripts/qa/export_runtime_evidence.mjs`
  - Nouveau point d'entree runtime:
    - `node scripts/runtime-stack.mjs evidence`
  - Nouvelle cible compatibilite:
    - `make runtime-evidence`
  - Export automatique rejoue en reel pour produire un dossier horodate standardise.
- Definition of done:
  - Une recette finale produit automatiquement un dossier d'evidence exploitable.
- Validation:
  - `node scripts/runtime-stack.mjs evidence --no-build --skip-image-bootstrap`
- Resultat:
  - OK le 2026-03-06.
  - Dossier de preuve standardise genere:
    - `docs/test-evidence/20260306-175716-runtime-evidence/`
  - `REPORT.md` genere avec:
    - date
    - commit
    - environnement
    - commandes executees
    - resultat global
    - ecarts
    - artefacts
  - `ua-ctf-smoke.json`: `PASS`, `134/134`
  - `frontend-apps-smoke.json`: `PASS`, `8/8`
  - Statut global du dossier exporte: `CONFORME`
- Evidence:
  - `docs/test-evidence/README.md`
  - `docs/test-evidence/20260306-175716-runtime-evidence/REPORT.md`
  - `docs/test-evidence/2026-03-06-audit-remediation/p33-evidence-standard.md`

## P4 - Recette finale

### Gate final obligatoire

- Statut: [x]
- Priorite: Critique
- Prerequis:
  - Tous les lots P0 a P3 termines.
- Sequence:
  1. Build backend:
     - `npm run build --prefix backend/...` pour tous les services critiques
  2. Build frontend:
     - `npm run build --prefix frontend/...` pour toutes les apps critiques
  3. Tests packages:
     - unitaires
     - integration
     - security live
  4. Bootstrap runtime:
     - commande standard officielle
  5. Smoke runtime:
     - `node scripts/qa/ua_ctf_e2e_smoke.mjs`
     - `node scripts/qa/frontend_apps_smoke.mjs`
  6. Journees de parcours:
     - client
     - marchand
     - etudiant
     - formateur
  7. Verification coherence:
     - dashboard marchand apres POS
     - HSM web
     - monitoring dashboard
  8. Publication evidence:
     - `docs/test-evidence/<date>-audit-remediation/`
- Definition of done:
  - Toutes les commandes officielles passent.
  - Aucun point critique de l'audit initial n'est encore ouvert.
- Validation:
  - builds critiques:
    - `npm run build --prefix backend/api-gateway`
    - `npm run build --prefix backend/sim-auth-engine`
    - `npm run build --prefix backend/sim-network-switch`
    - `npm run build --prefix frontend/portal`
    - `npm run build --prefix frontend/hsm-web`
  - tests de reference:
    - `npx jest -c jest.config.js --runInBand`
    - `npx jest -c jest.integration.js --runInBand`
    - `npm test --prefix backend/key-management`
    - `npm run test:integration --prefix backend/acs-simulator`
    - `npm run test:integration --prefix backend/sim-auth-engine -- --runInBand`
    - `npm run test:integration --prefix backend/sim-network-switch -- --runInBand`
    - `npm run test:all --prefix tests/security`
  - runtime officiel:
    - `node scripts/runtime-stack.mjs evidence --no-build --skip-image-bootstrap`
  - parcours:
    - `scripts/test-client-production-journey.ps1`
    - `scripts/test-merchant-production-journey.ps1`
    - `scripts/test-student-production-journey.ps1`
    - `scripts/test-instructor-production-journey.ps1`
- Resultat:
  - OK le 2026-03-06.
  - Builds critiques: tous verts.
  - Tests de reference: tous verts.
  - Export runtime standardise:
    - `docs/test-evidence/20260306-180554-runtime-evidence/`
    - statut `CONFORME`
  - Parcours client: OK
  - Parcours marchand: OK
  - Parcours etudiant: OK
  - Parcours formateur: OK
  - Verdict final: `GO`
- Evidence:
  - `docs/test-evidence/20260306-180554-runtime-evidence/REPORT.md`
  - `docs/test-evidence/2026-03-06-audit-remediation/p4-final-recipe.md`

## Tableau d'execution detaille

| ID | Lot | Priorite | Tache | Statut | Owner | Blocage | Sortie attendue |
|---|---|---|---|---|---|---|---|
| T-001 | P0.1 | Critique | Corriger contrat `hsm-web` | [x] | TBD | Type/API | Build OK |
| T-002 | P0.2 | Critique | Corriger typage mTLS `sim-auth-engine` | [x] | TBD | Build TS | Build OK |
| T-003 | P0.2 | Critique | Reparer integration `sim-auth-engine` | [x] | TBD | Config Jest | Tests OK |
| T-004 | P0.3 | Critique | Corriger typage mTLS `sim-network-switch` | [x] | TBD | Build TS | Build OK |
| T-005 | P0.3 | Critique | Aligner contrat reponse switch/tests | [x] | TBD | Contrat API | Integration OK |
| T-006 | P0.4 | Critique | Retirer `ignoreBuildErrors` portal | [x] | TBD | Erreurs TS cachees | Build fiable |
| T-007 | P1.1 | Critique | Rendre Jest racine executable | [x] | TBD | Tooling root | Suites root OK |
| T-008 | P1.2 | Haute | Corriger tests ACS et port par defaut | [x] | TBD | Mauvaise base URL | Integration ACS OK |
| T-009 | P1.4 | Haute | Couvrir `key-management` jusqu'au seuil | [x] | TBD | Coverage | Exit 0 |
| T-010 | P1.5 | Haute | Reclasser tests mock/live | [x] | TBD | Lisibilite QA | Reporting clair |
| T-011 | P2.1 | Critique | Aligner POS marchand avec dashboard | [x] | TBD | Regle metier | Coherence OK |
| T-012 | P2.2 | Haute | Durcir parcours etudiant | [x] | TBD | Script permissif | Gate utile |
| T-013 | P2.3 | Haute | Corriger ou archiver scripts legacy | [x] | TBD | QA obsolete | Scripts propres |
| T-014 | P2.4 | Haute | Ajouter smoke frontend par app | [x] | TBD | Couverture UI | Smokes OK |
| T-015 | P3.1 | Haute | Unifier procedure standard de bootstrap | [x] | 2026-03-06 | Ops duales | Procedure unique |
| T-016 | P3.2 | Haute | Nettoyer doc obsolete | [x] | 2026-03-06 | Derive documentaire | Doc alignee |
| T-017 | P3.3 | Haute | Standardiser evidence de recette | [x] | 2026-03-06 | Preuves eparses | Dossier evidence |
| T-019 | P2.7 | Critique | Rendre `/api/hsm/config` reel et persistant | [x] | TBD | No-op backend | Toggle runtime fiable |
| T-020 | P2.8 | Haute | Supprimer les faux etats UI du portail | [x] | TBD | Faux fallback front | UI veridique |
| T-021 | P2.9 | Haute | Supprimer les heuristiques learning du portail | [x] | TBD | Metriques derivees | UI alignee API |
| T-018 | P4 | Critique | Executer recette finale complete | [x] | 2026-03-06 | Lots precedents | Go/no-go final |

## Journal d'avancement

### 2026-03-06

- [x] Audit complet realise.
- [x] Baseline runtime mesuree.
- [x] Tracker de remediations cree.
- [x] Lot `P0.1` corrige et valide en build local + build Docker + runtime UI.
- [x] Lot `P2.5` corrige et valide en runtime.
- [x] Lot `P2.6` corrige et valide en build + navigateur.
- [x] Lot `P2.7` corrige et valide en API + restart runtime + portail + hsm-web.
- [x] Lot `P2.1` corrige et valide en runtime marchand complet.
- [x] Lot `P0.2` corrige et valide en build + tests + integration.
- [x] Lot `P0.3` corrige et valide en build + tests + integration.
- [x] Lot `P0.4` corrige et valide en typecheck + build portail sans bypass.
- [x] Lot `P1.1` corrige et valide en execution reelle depuis la racine.
- [x] Lot `P1.2` corrige et valide en build + integration ACS self-contained.
- [x] Lot `P1.4` corrige et valide sans baisser les seuils de coverage.
- [x] Lot `P1.5` corrige avec taxonomie explicite `mock/service/live` et scripts separes.
- [x] Lot `P2.2` corrige avec gate etudiant strict et validation runtime atelier/exercice/quiz/persistence.
- [x] Lot `P2.3` corrige avec reclassification `current/legacy` et runner workflow fiable.
- [x] Lot `P2.8` corrige avec preuves runtime sur echec API simule.
- [x] Lot `P2.9` corrige avec preuves UI sur valeurs reelles et suppression des derives learning.
- [x] Lot `P2.4` corrige avec smoke navigateur standard sur les 6 frontends et integration dans le point d'entree runtime.
- [x] Lot `P3.1` corrige avec CLI runtime unique, wrappers alignes et preuve d'execution reelle.
- [x] Lot `P3.2` corrige avec docs/runtime/auth tooling alignes et validation sur la stack reelle.
- [x] Lot `P3.3` corrige avec export standardise de preuve runtime et dossier automatique `CONFORME`.
- [x] Gate `P4` rejouee completement avec verdict final `GO`.
- [x] Aucun correctif prioritaire ouvert dans le tracker.

## Decisions a verrouiller

- [x] POS marchand nourrit le dashboard marchand immediatement, avec transactions externes autorisees si l'integrite cote marchand est validee.
- [x] `sim-network-switch` publie un `TransactionResponse` top-level normalise; les champs issuer hors contrat sont conserves sous `additionalData`.
- [x] Les suites Jest racine restent a la racine; elles reutilisent explicitement le toolchain versionne sous `tests/integration` au lieu de dependre d'un `node_modules` root absent.
- [x] `tests/security` expose des niveaux de preuve distincts; `npm test` reste offline et `test:live` est explicite.
- [x] Les scripts legacy non fiables sont archives sous `tests/workflow/legacy` et exclus des chemins QA recommandes.

## Commandes de reference

### Build critique

```powershell
npm run build --prefix backend/api-gateway
npm run build --prefix backend/sim-auth-engine
npm run build --prefix backend/sim-network-switch
npm run build --prefix frontend/portal
npm run build --prefix frontend/hsm-web
```

### Tests critiques

```powershell
npx jest -c jest.config.js --runInBand
npx jest -c jest.integration.js --runInBand
npm test --prefix backend/key-management
npm run test:integration --prefix backend/acs-simulator
npm run test:integration --prefix backend/sim-auth-engine
npm run test:integration --prefix backend/sim-network-switch
npm test --prefix tests/security
npm run test:mock --prefix tests/security
npm run test:service --prefix tests/security
npm run test:live --prefix tests/security
npm run test:all --prefix tests/security
```

### Runtime critique

```powershell
node scripts/runtime-stack.mjs up
node scripts/runtime-stack.mjs test-all
node scripts/runtime-stack.mjs smoke
node scripts/runtime-stack.mjs frontend-smoke
node scripts/runtime-stack.mjs evidence
node scripts/qa/export_runtime_evidence.mjs
powershell -ExecutionPolicy Bypass -File scripts/deploy-runtime-test-all.ps1
node scripts/qa/ua_ctf_e2e_smoke.mjs
node scripts/qa/frontend_apps_smoke.mjs
powershell -ExecutionPolicy Bypass -File scripts/test-client-production-journey.ps1
powershell -ExecutionPolicy Bypass -File scripts/test-merchant-production-journey.ps1
powershell -ExecutionPolicy Bypass -File scripts/test-student-production-journey.ps1
powershell -ExecutionPolicy Bypass -File scripts/test-instructor-production-journey.ps1
```

## Sortie attendue finale

- Un repo qui se rebuild proprement.
- Une stack qui se relance depuis une procedure standard unique.
- Des parcours metier coherents.
- Des tests qui prouvent la plateforme reelle.
- Une documentation qui dit vrai.
