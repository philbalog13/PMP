# Audit detaille des 4 parcours

Derniere mise a jour: 2026-03-06 13:03 (Europe/Paris)

## Portee

- Parcours client
- Parcours marchand
- Parcours etudiant
- Parcours formateur
- Verification runtime live sur la stack Docker deja demarree
- Verification API directe sur `http://localhost:8000`
- Verification d'integration frontend sur `portal`, `user-cards-web`, `tpe-web` et `hsm-web`

## Methode

- Lecture des routes frontend et backend pour reconstruire les parcours reels.
- Execution de scenarios HTTP stricts avec donnees fraiches.
- Verification des etats avant et apres action, pas seulement de la reponse immediate.
- Verification des ecrans qui peuvent afficher des donnees fictives ou heuristiques.

## Synthese

Les 4 parcours sont largement exploitables, mais ils ne representent pas encore totalement la realite metier. Les ecarts les plus importants ne sont pas des plantages frontaux: ce sont surtout des routes profil cassees, des vues qui masquent l'etat reel, un pilotage HSM qui ne modifie rien, et un parcours marchand ou le POS alimente le ledger sans alimenter les ecrans de pilotage.

## Constats transverses

### 1. `GET /api/users/me` est casse pour les 4 roles

- Cause racine:
  - `backend/api-gateway/src/app.ts:114` monte `app.use('/api/users', usersRoutes)` avant `gatewayRoutes`.
  - `backend/api-gateway/src/routes/users.routes.ts:31` intercepte `GET /api/users/:id`.
  - `backend/api-gateway/src/routes/gateway.routes.ts:223` declare pourtant la vraie route `GET /api/users/me`.
- Effet reel:
  - client: `403 FORBIDDEN_ROLE`
  - marchand: `403 FORBIDDEN_ROLE`
  - etudiant: `403 FORBIDDEN_ROLE`
  - formateur: `500 Failed to fetch user` car `me` part dans la route `:id` et provoque un cast UUID invalide

### 2. Des ecrans masquent la realite en injectant des donnees fictives

- `frontend/portal/src/app/merchant/api/page.tsx:142-166`
  - si l'API des cles ou webhooks echoue, la page affiche une "Production Key" et un webhook `example.com`.
- `frontend/portal/src/app/instructor/students/[id]/page.tsx:167-184`
  - si l'API de progression etudiant echoue, la page injecte un faux etudiant, de faux quiz, de faux badges et une fausse progression.

### 3. Certains ecrans learning affichent des metriques heuristiques et non la verite backend

- `frontend/portal/src/app/student/quizzes/page-content.tsx:162-163`
  - le nombre de questions et le temps de quiz sont derives de `totalSections`, pas de la definition reelle du quiz.
- Implication:
  - la page peut rester "plausible" tout en etant inexacte si le contenu pedagogique change.

## Parcours client

### Etat reel

- Parcours verifie de bout en bout:
  - inscription
  - login
  - compte bancaire
  - depot / retrait
  - creation carte
  - details carte
  - update limites
  - update features
  - blocage / deblocage
  - paiement marchand
  - 3DS frictionless
  - challenge 3DS
  - historique / detail / timeline
  - securite
  - refresh token
  - logout avec revocation

### Resultat

- 32 controles executes
- 31 OK
- 1 KO

### Ecart principal

- `GET /api/users/me` retourne `403` au lieu de `200`.
- Impact direct:
  - faible sur `user-cards-web`
  - critique en reutilisation cross-app si d'autres pages s'appuient sur le profil courant

### Ecart secondaire

- Le flux 3DS "resume" est logiquement strict, mais il manque une aide end-to-end dans le parcours client.
- Concretement:
  - un challenge bien demande retourne `202`
  - si on relance le resume sans completion ACS reelle, la reprise echoue proprement en `400`
- Ce n'est pas un bug de securite, mais c'est un trou de parcours outille.

## Parcours marchand

### Etat reel

- Parcours verifie de bout en bout:
  - inscription / login
  - dashboard
  - compte marchand
  - ledger entries
  - POS terminals
  - POS detail
  - POS transaction
  - settlement
  - payout
  - adjustment
  - api keys CRUD
  - webhooks CRUD
  - telecollecte
  - clearing batches
  - transactions detail / timeline
  - refund
  - void
  - rapports

### Resultat

- 40 controles sur le parcours marchand principal
- 33 OK
- 6 KO reels
- 1 echec non-bloquant attendu par regle metier (`minimum payout amount = 10.00`)
- Controle complementaire sur les operations post-transaction reelle: 8/8 OK

### Ecarts majeurs

#### A. La simulation POS nourrit le ledger mais pas les vues de pilotage

- Cause racine:
  - le dashboard et les rapports filtrent sur `buildRealTransactionIntegrityClause()`
  - `backend/api-gateway/src/controllers/merchant.controller.ts:269`
  - `backend/api-gateway/src/controllers/merchant.controller.ts:1154`
  - `backend/api-gateway/src/controllers/merchant.controller.ts:1642`
  - `backend/api-gateway/src/controllers/merchant.controller.ts:1833`
  - `backend/api-gateway/src/controllers/merchant.controller.ts:1899`
  - la simulation POS cree la transaction via `backend/api-gateway/src/controllers/merchant.controller.ts:1681`
  - cette insertion n'alimente pas les champs exiges par la clause d'integrite
- Effet reel observe:
  - transaction POS `APPROVED`
  - `pendingBalance` augmente
  - le ledger montre bien l'ecriture
  - mais:
    - dashboard = `0 transaction`
    - liste transactions = vide
    - detail terminal = vide
    - daily report = `0`
    - reconciliation = `0`

#### B. Le settlement peut avancer avec `settledTransactions = 0`

- Verification live:
  - apres une vente POS simulee invisible pour les rapports, `POST /api/merchant/account/settle` repond `200`
  - mais `settledTransactions = 0`
- Implication:
  - la comptabilite de compte marchand et la comptabilite transactionnelle ne racontent pas la meme histoire

#### C. Les vrais paiements client -> marchand, eux, sont coherents

- Verification live:
  - un vrai paiement client vers ce marchand remonte bien ensuite dans:
    - dashboard
    - transactions
    - reports
    - reconciliation
    - export
  - refund, void, timeline, settlement et payout fonctionnent alors correctement

#### D. La page `merchant/api` peut afficher de faux objets de production

- `frontend/portal/src/app/merchant/api/page.tsx:142-166`
- Si l'API tombe, l'ecran continue avec une fausse cle "Production Key" et un faux webhook.
- C'est incompatible avec l'objectif "representer exactement la realite".

## Parcours etudiant

### Etat reel

- Parcours verifie de bout en bout:
  - inscription / login
  - progression ateliers
  - contenu atelier
  - save progress
  - complete workshop
  - quiz definition
  - quiz submit
  - quiz results
  - badges
  - stats
  - leaderboard
  - next-step
  - certificat
  - CTF catalog / detail / start / session / extend / reset / terminate / progress / leaderboard
  - cursus catalog / detail / module content / save chapter progress
  - UA unit detail / start / task submit / session / extend / reset / terminate
  - exercices assignes, soumission et retour de note
  - transactions plateforme (liste / detail / timeline)

### Resultat

- 76 controles etudiant/formateur executes ensemble
- 72 OK
- 4 KO, dont 2 touchent directement l'etudiant
- verification complementaire des pages transactions etudiant/formateur: OK

### Ecarts majeurs

#### A. L'onboarding portail depend d'une route profil cassee

- `frontend/portal/src/app/student/page-content.tsx:253`
  - le dashboard etudiant appelle `/api/users/me` pour savoir si l'onboarding est fait
- Comme `/api/users/me` est casse, un etudiant deja onboarde cote serveur peut etre renvoye vers `/student/onboarding` sur un nouveau navigateur ou apres purge du local storage

#### B. La completion onboarding est marquee localement meme si la sauvegarde serveur echoue

- `frontend/portal/src/app/student/onboarding/page.tsx:75-88`
- Le `POST /api/users/me/preferences` est traite en `best effort`, puis `markOnboardingDoneLocally(user)` est appele quoi qu'il arrive.
- Effet reel:
  - l'utilisateur peut paraitre onboarde localement alors que les preferences serveur n'ont pas ete ecrites
  - combine au bug `/api/users/me`, cela fragilise la reprise sur un autre device

#### C. La page quiz affiche des chiffres derives et non la definition reelle

- `frontend/portal/src/app/student/quizzes/page-content.tsx:162-163`
- `questions` et `timeLimit` sont fabriques a partir de `totalSections`.
- Risque:
  - l'ecran reste "coherent visuellement" mais peut mentir des que les quiz reels changent

## Parcours formateur

### Etat reel

- Parcours verifie de bout en bout:
  - inscription / login
  - liste etudiants
  - detail progression d'un etudiant
  - cohort analytics
  - creation / lecture / update / status / suppression d'un utilisateur
  - lab conditions get / update
  - exercices create / list / detail / update / assign / submissions / grade / delete
  - CTF admin submissions / analytics / reset student progress
  - transactions plateforme (liste / detail / timeline)

### Ecarts majeurs

#### A. `GET /api/users/me` retourne `500` pour le formateur

- Meme cause racine que pour les autres roles
- Symptomatique differente:
  - le formateur passe le `RequireRole(UserRole.FORMATEUR)`
  - puis `usersController.getUserById` tente `id = 'me'`
  - cela part en erreur DB et remonte en `500`

#### B. Le reset des conditions de lab ne remet pas un etat neutre

- `backend/api-gateway/src/controllers/progress.controller.ts:1326-1335`
- `backend/api-gateway/src/data/learningDefaults.ts:532-537`
- Le reset remet:
  - `latencyMs = 150`
  - `authFailureRate = 5`
  - `hsmLatencyMs = 50`
- Ce comportement est valide techniquement, mais il ne correspond pas a une interpretation naturelle de "reset" comme retour a un lab neutre.

#### C. Le pilotage HSM ne modifie rien en realite

- `backend/hsm-simulator/src/controllers/hsm.controller.ts:276-285`
  - `setConfig` appelle `VulnEngine.updateConfig(body.vulnerabilities)`
- `backend/hsm-simulator/src/services/VulnEngine.ts:309-310`
  - `updateConfig()` est depreciee et ne fait rien
- Effet reel observe:
  - `POST /api/hsm/config` retourne `200`
  - la reponse reste au config par defaut
  - les toggles ne changent pas
- Impact:
  - la page formateur `lab-control`
  - et plus largement `hsm-web`, qui consomme aussi `/hsm/config`

#### D. Le detail etudiant peut afficher un faux etudiant si l'API tombe

- `frontend/portal/src/app/instructor/students/[id]/page.tsx:167-184`
- Impact:
  - l'ecran de suivi pedagogique peut mentir explicitement sur la progression, les quiz et les badges

## Ce qui fonctionne vraiment bien

- Les APIs client coeur sont solides.
- Les operations marchand sur vraies transactions client sont coherentes.
- Le CTF et les UA labs tournent reellement, avec sessions, reset, extend et terminate verifies.
- Le cycle formateur `create exercise -> assign -> student submit -> trainer grade` est fonctionnel.
- Les pages transactions plateforme etudiant/formateur sont alimentees par l'API reelle et ont ete validees en `200`.

## Priorites de correction

1. Reparer `/api/users/me` avant toute autre correction UX.
2. Corriger le parcours marchand POS pour aligner ledger, dashboard, terminal detail, reports et settlement.
3. Corriger le pilotage HSM (`/api/hsm/config`) qui est aujourd'hui un faux succes.
4. Supprimer les faux etats UI (`merchant/api`, `instructor/students/[id]`).
5. Refaire l'onboarding etudiant pour qu'il dependa d'un etat serveur fiable.
6. Remplacer les heuristiques frontend learning par des donnees source-of-truth.

## Evidence de test

- Client: 32 checks, 31 OK, 1 KO
- Marchand: 40 checks, 33 OK, 6 KO reels, 1 regle metier attendue
- Marchand complement ops: 8 checks, 8 OK
- Etudiant/Formateur: 76 checks, 72 OK, 4 KO
- Transactions plateforme ETUDIANT/FORMATEUR: liste, detail et timeline verifies
