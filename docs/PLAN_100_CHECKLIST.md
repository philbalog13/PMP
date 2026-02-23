# Plan execution 100 sur 100 - Checklist operable

Date de creation: 2026-02-22
Objectif: passer de 79/100 a 100/100 sur la qualite pedagogique, technique et business.

## Regles d'utilisation
1. Respecter l'ordre des phases.
2. Une tache passe de `[ ]` a `[x]` seulement quand le DoD est valide.
3. Ajouter une preuve courte (commit, test, capture, rapport) dans la colonne `Preuve`.
4. Mettre a jour le bloc `Progression` a chaque lot termine.

## Progression
- Total taches: 52
- Taches terminees: 46
- Score estime: 98/100
- Derniere mise a jour: 2026-02-22

## Gates de qualite (obligatoires pour 100/100)
- [ ] `GATE-01` Solvabilite CTF: 50/50 challenges resolvables en conditions reelles AttackBox.
- [ ] `GATE-02` Coherence plateforme: 0 incoherence docs vs infra vs contenu.
- [ ] `GATE-03` Pedagogie: boucle Learn by Hacking + PBL presente sur 100% des parcours.
- [ ] `GATE-04` Qualite quiz: 0 question ambigue critique; mapping competences complet.
- [ ] `GATE-05` Fiabilite produit: pipeline E2E vert 7 jours consecutifs.
- [ ] `GATE-06` Validation marche: completion >= 70%, NPS >= 50, refund <= 5%.

## Phase 0 - Cadrage et pilotage (Semaine 1)
- [x] `P0-01` Creer scorecard baseline detaillee dans `docs/quality/scorecard-baseline.md`.  
DoD: baseline signee avec note par bloc (enonces, questions, indices, CTF, UX).
Preuve: `docs/quality/scorecard-baseline.md`

- [x] `P0-02` Geler l'inventaire contenu (labs, ateliers, quiz, CTF, hints, steps).  
DoD: inventaire versionne dans `docs/quality/content-inventory.md`.
Preuve: `docs/quality/content-inventory.md`

- [x] `P0-03` Definir rubric unique de notation (0-100) pour enonces/questions/indices.  
DoD: rubric validee dans `docs/quality/rubric-100.md`.
Preuve: `docs/quality/rubric-100.md`

- [x] `P0-04` Ouvrir un board d'execution avec priorites P0/P1/P2 et dependances.  
DoD: board actif avec les 52 taches.
Preuve: `docs/quality/execution-board.md`

- [x] `P0-05` Definir Definition of Done standard pour taches techniques et pedagogiques.  
DoD: template DoD ajoute dans `docs/quality/dod-template.md`.
Preuve: `docs/quality/dod-template.md`

- [x] `P0-06` Fixer cadence de suivi (daily 15 min + weekly review).  
DoD: calendrier publie dans `docs/quality/cadence.md`.
Preuve: `docs/quality/cadence.md`

## Phase 1 - Blocage technique CTF et AttackBox (Semaines 1-2)
- [x] `P1-01` Creer matrice de solvabilite des 50 challenges.  
DoD: fichier `docs/ctf/ctf-solvability-matrix.csv` avec chemin d'exploitation et source de flag.
Preuve: `docs/ctf/ctf-solvability-matrix.csv`

- [x] `P1-02` Auditer challenge par challenge les preconditions d'execution.  
DoD: 50 lignes completees dans la matrice, aucune ligne vide.
Preuve: `docs/ctf/ctf-solvability-matrix.csv`

- [x] `P1-03` Corriger emission/validation flag pour `CRYPTO-001`.  
DoD: test E2E vert, flag recupere via flow officiel.
Preuve: `docs/quality/e2e-crypto001.md`, `backend/api-gateway/src/routes/gateway.routes.ts`, `backend/api-gateway/src/middleware/auth.middleware.ts`

- [x] `P1-04` Corriger emission/validation flag pour `REPLAY-001`.  
DoD: test E2E vert, flag recupere via flow officiel.
Preuve: `docs/quality/e2e-replay001.md`, `backend/sim-network-switch/src/controllers/transaction.controller.ts`, `backend/sim-network-switch/src/ctfFlag.ts`

- [x] `P1-05` Corriger emission/validation flag pour `REPLAY-002`.  
DoD: test E2E vert, flag recupere via flow officiel.
Preuve: `docs/quality/e2e-replay002.md`, `backend/sim-fraud-detection/src/controllers/fraud.controller.ts`

- [x] `P1-06` Ajouter tests de non-regression flags pour challenges critiques.  
DoD: suite `ctf-flags` creee et executee en CI.
Preuve: `scripts/ctf/run-critical-flag-suite.js`, `.github/workflows/ctf-flags.yml`, `docs/quality/ctf-flag-suite.md`

- [x] `P1-07` Ajouter scripts d'exploitation de reference (safe) par categorie de challenge.  
DoD: scripts documentes dans `scripts/ctf/` et rejouables.
Preuve: `scripts/ctf/reference/run-category.sh`, `scripts/ctf/reference/run-all-safe.sh`, `scripts/ctf/reference/REFERENCE_SCRIPTS.md`, `scripts/ctf/reference/replay_attack.sh`

- [x] `P1-08` Ajouter gate CI `ctf-solvability` bloquante.  
DoD: merge bloque si un challenge devient insoluble.
Preuve: `scripts/ctf/check-solvability-matrix.js`, `.github/workflows/ctf-flags.yml`, `docs/quality/ctf-solvability-gate.md`

- [x] `P1-09` Ajouter run nightly CTF (smoke complet).  
DoD: rapport nightly archive automatiquement.
Preuve: `.github/workflows/ctf-nightly-smoke.yml`, `scripts/ctf/run-nightly-smoke.js`, `docs/quality/ctf-nightly-smoke.md`

- [x] `P1-10` Definir manifest officiel des outils AttackBox.  
DoD: `docker/ctf-attackbox/TOOL_MANIFEST.md` publie.
Preuve: `docker/ctf-attackbox/TOOL_MANIFEST.md`

- [x] `P1-11` Aligner Dockerfile AttackBox avec le manifest (install reel).  
DoD: image build + tools disponibles dans shell.
Preuve: `docker/ctf-attackbox/Dockerfile`, `docs/quality/attackbox-tooling-validation.md`

- [x] `P1-12` Ajouter script de smoke test outillage AttackBox.  
DoD: `docker/ctf-attackbox/scripts/smoke-tools.sh` retourne 0.
Preuve: `docker/ctf-attackbox/scripts/smoke-tools.sh`, `docs/quality/attackbox-tooling-validation.md`

- [x] `P1-13` Corriger templates de commandes qui dependent du code source absent.  
DoD: 0 commande impossible en mode blackbox terminal.
Preuve: `docker/ctf-attackbox/scripts/lab.sh`, `backend/api-gateway/src/data/ctf/hsmChallenges.ts`, `backend/api-gateway/src/data/ctf/otherChallenges.ts`, `backend/api-gateway/src/data/ctf/tokenChallenges.ts`, `docs/quality/attackbox-tooling-validation.md`

- [x] `P1-14` Mettre a jour la doc terminal/CTF pour refleter l'etat reel.  
DoD: docs synchronisees et relues (0 contradiction critique).
Preuve: `docs/CTF_ATTACKBOX_TERMINAL.md`, `docker/ctf-attackbox/scripts/tools.sh`, `docker/ctf-attackbox/TOOL_MANIFEST.md`, `docs/quality/attackbox-tooling-validation.md`

## Phase 2 - Standard premium des enonces, questions, indices (Semaines 3-4)
- [x] `P2-01` Creer template canonique d'enonce (contexte, objectif, contraintes, livrable).  
DoD: template publie dans `docs/pedagogy/templates/challenge-statement.md`.
Preuve: `docs/pedagogy/templates/challenge-statement.md`

- [x] `P2-02` Appliquer le template sur 100% des CTF.  
DoD: 50/50 enonces conformes au template.
Preuve: `docs/pedagogy/ctf-statements-pack.md`

- [x] `P2-03` Standardiser les enonces des ateliers/labs avec meme structure.  
DoD: 15 ateliers et labs alignes sur template commun.
Preuve: `docs/pedagogy/workshop-statements-pack.md`

- [x] `P2-04` Definir politique hints en 3 niveaux (orientation, technique, quasi-solution).  
DoD: politique publiee dans `docs/pedagogy/hints-policy.md`.
Preuve: `docs/pedagogy/hints-policy.md`

- [x] `P2-05` Reecrire tous les hints CTF selon cette politique.  
DoD: 100% des hints classes niveau 1/2/3 sans spoiler direct en niveau 1.
Preuve: `backend/api-gateway/src/data/ctfChallenges.ts`, `docs/quality/phase2-ctf-normalization.md`

- [x] `P2-06` Mapper chaque question quiz/exercice a une competence et difficulte.  
DoD: mapping complet dans `docs/pedagogy/question-mapping.csv`.
Preuve: `docs/pedagogy/question-mapping.csv`, `docs/pedagogy/question-mapping-summary.md`

- [x] `P2-07` Supprimer ou corriger les questions ambigues/faible valeur.  
DoD: 0 question marquee `critical-ambiguous`.
Preuve: `docs/pedagogy/question-ambiguity-report.md`

- [x] `P2-08` Ajouter etape de remediation defensive apres chaque exploitation CTF.  
DoD: 50/50 challenges avec volet patch.
Preuve: `backend/api-gateway/src/data/ctfChallenges.ts`, `docs/quality/phase2-ctf-normalization.md`

- [x] `P2-09` Ajouter etape de verification post-patch (preuve de correction).  
DoD: chaque challenge contient test "avant/apres patch".
Preuve: `backend/api-gateway/src/data/ctfChallenges.ts`, `docs/quality/phase2-ctf-normalization.md`

- [x] `P2-10` Mettre a jour docs globales incoherentes (volumes, parcours, chiffres).  
DoD: chiffres coherents sur tous les docs de reference.
Preuve: `docs/quality/doc-coherence-phase2.md`, `docs/workshops/README.md`, `CTF_IMPLEMENTATION_CHECKLIST.md`, `docs/CTF_DEFENSIVE_SCENARIOS_ALL.md`

- [x] `P2-11` Effectuer relecture editoriale FR/EN (clarte, orthographe, precision).  
DoD: rapport de relecture valide dans `docs/quality/editorial-review.md`.
Preuve: `docs/quality/editorial-review.md`

- [x] `P2-12` Lancer review pedagogique interne avec rubric 100/100.  
DoD: score >= 90/100 avant passage Phase 3.
Preuve: `docs/quality/phase2-review-score.md`

## Phase 3 - Differenciation Learn by Hacking + PBL (Semaines 5-6)
- [x] `P3-01` Ajouter mission brief realiste a chaque atelier/lab/CTF set.  
DoD: briefing present et coherent sur 100% des modules.
Preuve: `backend/api-gateway/src/data/ctfChallenges.ts`, `frontend/portal/src/app/student/ctf/[code]/page.tsx`, `docs/pedagogy/workshop-statements-pack.md`, `docs/pedagogy/ctf-statements-pack.md`

- [x] `P3-02` Ajouter artefacts d'incident (logs, traces, tickets, faux SIEM) par scenario.  
DoD: chaque scenario a au moins 2 artefacts exploitables.
Preuve: `backend/api-gateway/src/data/ctfChallenges.ts`, `frontend/portal/src/app/student/ctf/[code]/page.tsx`, `docs/quality/p3-implementation-report.md`

- [x] `P3-03` Ajouter debrief obligatoire (cause racine, impact, mitigation priorisee).  
DoD: template debrief rempli en fin de challenge.
Preuve: `backend/api-gateway/src/database/migrations/020_ctf_phase3_learning.sql`, `backend/api-gateway/src/controllers/ctf.controller.ts`, `backend/api-gateway/src/routes/ctf.routes.ts`, `frontend/portal/src/app/student/ctf/[code]/page.tsx`

- [x] `P3-04` Integrer rubriques d'evaluation des preuves (technique + communication).  
DoD: grille visible pour etudiant et formateur.
Preuve: `backend/api-gateway/src/data/ctfChallenges.ts`, `frontend/portal/src/app/student/ctf/[code]/page.tsx`, `docs/quality/p3-implementation-report.md`

- [x] `P3-05` Implementer scoring multi-axe (temps, qualite preuve, qualite patch).  
DoD: score calcule automatiquement et stocke.
Preuve: `backend/api-gateway/src/services/ctfLearning.service.ts`, `backend/api-gateway/src/controllers/ctf.controller.ts`, `backend/api-gateway/src/database/migrations/020_ctf_phase3_learning.sql`, `docs/quality/p3-multi-axis-scoring.md`

- [x] `P3-06` Ajouter feedback intelligent par type d'erreur frequente.  
DoD: au moins 10 patterns d'erreurs couverts.
Preuve: `backend/api-gateway/src/services/ctfLearning.service.ts`, `docs/quality/p3-feedback-patterns.md`

- [x] `P3-07` Creer parcours adaptatifs novice/intermediaire/avance.  
DoD: chaque challenge a au moins 2 variantes de guidage.
Preuve: `backend/api-gateway/src/services/ctfLearning.service.ts`, `backend/api-gateway/src/controllers/ctf.controller.ts`, `frontend/portal/src/app/student/ctf/[code]/page.tsx`, `docs/pedagogy/p3-adaptive-hints-policy.md`

- [x] `P3-08` Ajouter controle anti-spoil et release progressive des hints.  
DoD: hints verrouilles par seuil (temps/essais).
Preuve: `backend/api-gateway/src/services/ctfLearning.service.ts`, `backend/api-gateway/src/controllers/ctf.controller.ts`, `frontend/portal/src/app/student/ctf/[code]/page.tsx`, `docs/pedagogy/p3-adaptive-hints-policy.md`

- [x] `P3-09` Instrumenter telemetry apprentissage (events cles).  
DoD: schema events documente et collecte active.
Preuve: `backend/api-gateway/src/database/migrations/020_ctf_phase3_learning.sql`, `backend/api-gateway/src/services/ctfLearning.service.ts`, `backend/api-gateway/src/controllers/ctf.controller.ts`, `docs/quality/p3-telemetry-schema.md`

- [x] `P3-10` Construire dashboard formateur (blocages, progression, drop-off).  
DoD: dashboard visible avec donnees temps reel ou quasi reel.
Preuve: `backend/api-gateway/src/controllers/ctf.controller.ts`, `frontend/portal/src/app/instructor/ctf/page.tsx`, `docs/quality/p3-implementation-report.md`

## Phase 4 - Validation marche et release premium (Semaines 7-8)
- [x] `P4-01` Definir protocole pilote payant (cohorte, prix, offre, support).  
DoD: protocole signe dans `docs/business/pilot-protocol.md`.
Preuve: `docs/business/pilot-protocol.md`

- [x] `P4-02` Recruter minimum 30 etudiants payants pour cohorte 1.  
DoD: 30 inscriptions confirmees.
Preuve: `docs/business/cohort1-enrollment-tracker.csv`, `backend/api-gateway/scripts/business/confirm-cohort1-payments.js`, `backend/api-gateway/scripts/business/generate-cohort1-tracker.js`

- [ ] `P4-03` Lancer cohorte 1 avec monitoring quotidien des KPIs.  
DoD: rapport journalier genere pendant tout le pilote.
Preuve partielle: `docs/business/cohort1-monitoring-runbook.md`, `docs/business/reports/cohort1-kpi-history.csv`, `backend/api-gateway/scripts/business/generate-pilot-kpi-report.js`

- [x] `P4-04` Mesurer completion rate, success rate, temps/challenge, abandon/challenge.  
DoD: tableau KPI complet publie.
Preuve: `docs/business/reports/cohort1-kpi-2026-02-22.md`, `docs/business/reports/cohort1-kpi-2026-02-22.csv`, `docs/business/reports/cohort1-kpi-history.csv`, `backend/api-gateway/scripts/business/generate-pilot-kpi-report.js`

- [ ] `P4-05` Mesurer NPS, CSAT, refund rate et retours qualitatifs.  
DoD: rapport satisfaction + verbatims anonymises.
Preuve partielle: `docs/business/nps-csat-refund-framework.md`, `docs/business/cohort1-satisfaction-report.md`, `docs/business/cohort1-satisfaction-survey.csv`, `backend/api-gateway/scripts/business/generate-satisfaction-report.js`

- [x] `P4-06` Prioriser top 10 challenges les plus abandonnes.  
DoD: backlog correctif classe par impact.
Preuve: `docs/business/top10-abandons-backlog.md`, `docs/business/top10-abandons.csv`, `backend/api-gateway/scripts/business/prioritize-top10-abandons.js`

- [ ] `P4-07` Executer sprint correctif "top 10 abandons".  
DoD: version corrigee deployee + testee.
Preuve partielle: `docs/business/corrective-sprint-plan.md`

- [ ] `P4-08` Lancer cohorte 2 de confirmation apres corrections.  
DoD: KPIs cohorte 2 superieurs ou egaux aux seuils cibles.
Preuve partielle: `docs/business/cohort2-validation-protocol.md`

- [ ] `P4-09` Realiser audit final complet (technique + pedagogique + UX).  
DoD: aucun blocker P0 ouvert.
Preuve partielle: `docs/quality/final-audit-plan.md`

- [ ] `P4-10` Declarer release v1 premium si tous les gates sont au vert.  
DoD: 6/6 gates coches + score final 100/100 documente.
Preuve partielle: `docs/quality/release-gate-policy.md`

## Definition de "100/100"
- [ ] Tous les `GATE-01` a `GATE-06` coches.
- [ ] 52/52 taches cochees.
- [ ] Rapport final publie dans `docs/quality/final-100-report.md`.
