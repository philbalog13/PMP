# Evidence P2.6 - Onboarding etudiant

Date: 2026-03-06

## Correctifs appliques

- `frontend/portal/src/app/student/page-content.tsx`
  - verification serveur `/api/users/me` prioritaire
  - repli local uniquement si l'API est indisponible et que l'utilisateur etait deja marque onboarde localement
  - suppression du faux renvoi systematique vers `/student/onboarding` en cas de doute reseau
- `frontend/portal/src/app/student/onboarding/page.tsx`
  - chargement du profil serveur au boot
  - redirection vers `/student` si `onboardingDone=true` cote serveur
  - `POST /api/users/me/preferences` rendu bloquant
  - confirmation serveur via `GET /api/users/me` avant d'ecrire le flag local
  - affichage d'une erreur explicite si la persistence echoue
- `frontend/portal/src/lib/onboarding.ts`
  - ajout de `clearOnboardingDoneLocally()`

## Validation build

```powershell
npm run build --prefix frontend/portal
```

Resultat:

- Build portail: OK
- Note: le build continue de skipper la validation TypeScript globale a cause du bypass existant, lot traite separement dans `P0.4`

## Validation navigateur

Preparation:

- reset du profil `student01@pmp.edu` a `preferences = '{}'::jsonb`
- rebuild + redeploiement de `pmp-portal`

Scenario 1: echec de persistence force

- ouverture de `http://localhost:3000/student` avec session etudiant
- redirection vers `/student/onboarding`
- interception navigateur de `POST /api/users/me/preferences` avec reponse `500`
- clic sur `Passer l'introduction`

Resultat:

- URL finale: `http://localhost:3000/student/onboarding`
- message d'erreur visible
- aucun flag `onboarding_done:*` dans `localStorage`

Scenario 2: succes serveur puis navigateur neuf

- appel reel `POST /api/users/me/preferences` avec `learnerLevel=INTERMEDIATE`, `objective=RED_TEAM`, `onboardingDone=true`
- nouveau contexte navigateur avec stockage onboarding vide
- ouverture de `http://localhost:3000/student`

Resultat:

- URL finale: `http://localhost:3000/student`
- dashboard charge avec heading `Bonjour, Marc`
- acces direct ensuite a `http://localhost:3000/student/onboarding` => redirection automatique vers `/student`
