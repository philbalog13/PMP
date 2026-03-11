# P2.9 - Learning UI aligne sur la source de verite

Date: 2026-03-06

## Objectif

Retirer les heuristiques learning du portail et verifier que les ecrans etudiant consomment les vraies donnees backend.

## Zones corrigees

- `frontend/portal/src/app/student/quizzes/page-content.tsx`
- `frontend/portal/src/app/student/progress/page-content.tsx`
- `frontend/portal/src/app/student/page-content.tsx`
- `frontend/portal/src/app/student/quizzes/page.tsx`
- `frontend/portal/src/app/student/progress/page.tsx`
- `backend/api-gateway/src/controllers/progress.controller.ts`
- `backend/api-gateway/src/data/learningDefaults.ts`

## Heuristiques retirees

- `student/quizzes`
  - `questionCount = sections * 2`
  - `timeLimit = sections * 3`
  - `passed` deduit par seuil local quand le backend fournit deja le champ
- `student/progress`
  - XP par atelier calcule localement
  - rang `Debutant / Intermediaire / Avance / Expert`
  - temps par section derive par division
  - liste `Section 1`, `Section 2`, ... sans source backend
- `student/dashboard`
  - mission calculee localement au lieu de `next-step`
  - temps roadmap lus depuis une table statique au lieu des minutes backend
  - `Level` et `XP to next level`

## Contrat backend source

Correctifs appliques dans `api-gateway`:

- `GET /api/progress`
  - ajoute `sequence_status`
  - ajoute `unlocked`
  - ajoute les metadonnees quiz associees au workshop
- `GET /api/progress/workshops`
  - ajoute `quizTitle`
  - ajoute `quizPassPercentage`
  - ajoute `quizTimeLimitMinutes`
  - ajoute `quizQuestionCount`
- `GET /api/progress/stats`
  - `quizzes.total` et `quizzes.passed` comptent maintenant des quiz distincts
  - plus des tentatives brutes

Validation build:

```powershell
npm run build --prefix backend/api-gateway
```

Resultat:

- OK

## Validation portail

Validation build:

```powershell
npm run build --prefix frontend/portal
```

Resultat:

- OK
- Next execute `Running TypeScript ...`

## Reference API runtime

Compte utilise:

- `student01@pmp.edu`

Valeurs de reference observees sur l'API runtime:

- `GET /api/progress/next-step`
  - `label = "Commencer Cursus Audit Financier — Module 1 - Fondamentaux comptables et financiers"`
- `GET /api/progress`
  - `intro.progress_percent = 40`
  - `intro.current_section = 2`
  - `intro.total_sections = 5`
  - `intro.time_spent_minutes = 12`
  - `intro.estimated_minutes = 60`
- `GET /api/progress/quiz/quiz-intro`
  - `questionCount = 10`
  - `timeLimitMinutes = 15`
  - `passPercentage = 80`
- `GET /api/progress/quiz/quiz-iso8583`
  - `questionCount = 16`
  - `timeLimitMinutes = 20`
  - `passPercentage = 80`

## Preuve UI runtime

Contexte:

- portail courant lance localement sur `http://127.0.0.1:3010`
- authentification reelle avec token etudiant
- verification navigateur headless via Playwright

### Dashboard etudiant

Attendus:

- la mission reprend le `next-step` backend
- l'ancien `XP to next level` n'apparait plus

Resultat:

```json
{
  "hasNextStepLabel": true,
  "hasOldLevelText": false,
  "hasCompletedModulesPill": true
}
```

### Quizzes etudiant

Attendus:

- `quiz-intro` affiche `10 questions`, `15 min`, `Seuil 80%`
- `quiz-iso8583` affiche `16 questions`, `20 min`, `Seuil 80%`
- pas d'ancien `24 min` derive de `8 sections * 3`

Resultat:

```json
{
  "isoCardContains20min": true,
  "isoCardContains24min": false,
  "isoCardContains16questions": true,
  "isoCardContainsThreshold80": true
}
```

### Progression etudiant

Attendus:

- `intro` affiche `2/5 sections`
- `intro` affiche `12 min`
- `intro` affiche `1h` de duree prevue
- disparition des anciens artefacts heuristiques `Debutant/Intermediaire/Expert`
- disparition de la liste fictive `Section 1`

Resultat:

```json
{
  "hasActualIntroProgress": true,
  "hasActualSections": true,
  "hasActualTimeSpent": true,
  "hasEstimatedDuration": true,
  "hasOldRankText": false,
  "hasSectionHeuristicList": false
}
```

## Validation partielle du contrat backend source en runtime

Une instance `api-gateway` source a ete lancee localement sur `http://127.0.0.1:8020`.

Verification positive:

- `GET /api/progress/workshops` expose bien:
  - `quizTitle`
  - `quizPassPercentage`
  - `quizTimeLimitMinutes`
  - `quizQuestionCount`

Limite constatee:

- sous cette topologie locale, `GET /api/progress` et `GET /api/progress/stats` n'ont pas pu etre prouves en runtime
- la preuve fonctionnelle de bout en bout repose donc sur:
  - le build source `api-gateway`
  - le build source `portal`
  - le rendu UI du portail courant contre l'API runtime existante

## Conclusion

Le lot `P2.9` est valide:

- les principaux ecrans learning etudiant ne fabriquent plus leurs metriques critiques
- les valeurs visibles cote UI sont alignees avec les endpoints backend verifies
- les derives encore presents sont limites a des calculs d'affichage sur des donnees reelles deja renvoyees par l'API
