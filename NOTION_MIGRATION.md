# Notion Design Migration — Suivi d'implémentation
## PMP Platform · Branch: `bef-prod`

> Transformation du frontend MISSION CIPHER (dark/fintech/glow) → Notion style (minimaliste/aéré/structuré)
> Règle absolue : **ne jamais toucher à la logique métier** (lib/, hooks/, auth-client.ts, api calls)

---

## Statut global

| Phase | Nom | Durée | Statut |
|-------|-----|-------|--------|
| 0 | Design System Foundation | 3j | ✅ TERMINÉ |
| 1 | Layout Global Shell | 4j | ✅ TERMINÉ |
| 2 | Composants Atomiques | 5j | ✅ TERMINÉ |
| 3 | Pages Student | 7j | ✅ TERMINÉ |
| 4 | Pages Contenu | 4j | ✅ TERMINÉ |
| 5 | Polish & Dark Mode | 3j | ⬜ À FAIRE |

---

## PHASE 0 — Design System Foundation
**Objectif :** Poser tous les tokens CSS sans modifier une seule page. Rien ne casse.

### Étapes

| # | Action | Fichier | Statut |
|---|--------|---------|--------|
| 0.1 | Créer `notion-tokens.css` — variables CSS complètes | `frontend/shared/styles/notion-tokens.css` | ✅ FAIT |
| 0.2 | Créer `notion-utilities.css` — classes utilitaires Notion | `frontend/shared/styles/notion-utilities.css` | ✅ FAIT |
| 0.3 | Étendre `design-tokens.css` avec @theme Notion | `frontend/shared/styles/design-tokens.css` | ✅ FAIT |
| 0.4 | Importer les nouveaux fichiers dans `globals.css` | `frontend/portal/src/app/globals.css` | ✅ FAIT |
| 0.5 | Vérifier build sans erreur | `npm run build` dans portal/ | ⬜ À TESTER |

### Fichiers créés / modifiés
- `frontend/shared/styles/notion-tokens.css` ← NOUVEAU
- `frontend/shared/styles/notion-utilities.css` ← NOUVEAU
- `frontend/shared/styles/design-tokens.css` ← ÉTENDU
- `frontend/portal/src/app/globals.css` ← IMPORT ajouté

### Tests phase 0
- [ ] `docker compose build portal --no-cache` sans erreur
- [ ] Ouvrir localhost:3000 → aucun changement visuel attendu (tokens inactifs)
- [ ] Variables `--n-*` visibles dans DevTools > Elements > :root

---

## PHASE 1 — Layout Global Shell
**Objectif :** Remplacer UnifiedSidebar + full-bleed hero par le layout Notion.

### Étapes

| # | Action | Fichier | Statut |
|---|--------|---------|--------|
| 1.1 | Créer `NotionLayout.tsx` — shell flex sidebar+content | `frontend/shared/components/notion/NotionLayout.tsx` | ✅ FAIT |
| 1.2 | Créer `NotionSidebar.tsx` — nav minimaliste role-based | `frontend/shared/components/notion/NotionSidebar.tsx` | ✅ FAIT |
| 1.3 | Créer `NotionTopbar.tsx` — breadcrumb + actions | `frontend/shared/components/notion/NotionTopbar.tsx` | ✅ FAIT |
| 1.4 | Créer `index.ts` barrel export | `frontend/shared/components/notion/index.ts` | ✅ FAIT |
| 1.5 | Créer `student/layout.tsx` — applique NotionLayout aux pages student | `frontend/portal/src/app/student/layout.tsx` | ✅ FAIT |
| 1.6 | Créer `StudentSidebar.tsx` + `StudentTopbarContent.tsx` | `frontend/portal/src/components/student/` | ✅ FAIT |
| 1.7 | Créer `AppShell.tsx` — Navbar/Footer conditionnel selon la route | `frontend/portal/src/components/AppShell.tsx` | ✅ FAIT |
| 1.8 | Modifier `layout.tsx` root — intégrer AppShell, retirer Navbar/Footer directs | `frontend/portal/src/app/layout.tsx` | ✅ FAIT |
| 1.9 | Purger `globals.css` — supprimer 14 keyframes décoratifs, garder 6 utilitaires | `frontend/portal/src/app/globals.css` | ✅ FAIT |

### Animations à CONSERVER (phase 1.7)
- `fade-up` — reveal page load
- `fade-left` / `fade-right` — reveal directionnel
- `animate-stagger` — cascade children
- `skeleton-shimmer` — loading states
- `spine-fill` — progress roadmap
- `scale-in` — modal/popover

### Animations à SUPPRIMER (phase 1.7)
- `floating` / `animate-floating`
- `ambient-pulse` / `ambient-orb`
- `particle-rise` / `.particle`
- `roadmap-pulse`
- `glow-breathe` / `glow-breathe-cyan`
- `shimmer-scan` (décoratif sur cards)
- `spine-glow` / `roadmap-spine-fill`
- `pulse-glow`
- `ring-rotate-glow`
- `icon-float`
- `neon-flicker`
- `data-stream`
- `gradient-shift` (animated gradient text)
- `border-rotate` / `gradient-border-animated`
- `bounce-right`

### Classes composants à SUPPRIMER (phase 1.7)
- `.student-gradient-bg`
- `.apex-card-active` / `.apex-card-cyan`
- `.stat-card-accent` (shimmer sweep)
- `.glass-card` / `.glass-panel` (glassmorphism)
- `.neon-text` / `.neon-border`
- `.roadmap-node-done/active/next/locked`
- `.roadmap-card-hover`
- `.feature-card`
- `.gradient-border-animated`
- `.text-gradient-indigo-cyan`
- `.hero-gradient` / `.bg-grid`

### Fichiers créés / modifiés
- `frontend/shared/components/notion/NotionLayout.tsx` ← NOUVEAU
- `frontend/shared/components/notion/NotionSidebar.tsx` ← NOUVEAU
- `frontend/shared/components/notion/NotionTopbar.tsx` ← NOUVEAU
- `frontend/shared/components/notion/index.ts` ← NOUVEAU
- `frontend/portal/src/app/student/layout.tsx` ← NOUVEAU
- `frontend/portal/src/components/student/StudentSidebar.tsx` ← NOUVEAU
- `frontend/portal/src/components/student/StudentTopbarContent.tsx` ← NOUVEAU
- `frontend/portal/src/components/AppShell.tsx` ← NOUVEAU
- `frontend/portal/src/app/globals.css` ← PURGÉ (490→155 lignes, -68%)
- `frontend/portal/src/app/layout.tsx` ← MODIFIÉ (AppShell intégré)

### Tests phase 1 ✅ TOUS VALIDÉS
- [x] Sidebar Notion visible sur `/student` avec sections APPRENTISSAGE/LABS/MON ESPACE/OUTILS EXTERNES
- [x] Item actif "Tableau de bord" en bleu avec fond teinté accent
- [x] Topbar avec breadcrumb "Étudiant" et bouton toggle sidebar
- [x] Fond blanc/clair (plus d'obsidian sur les pages student)
- [x] User avatar + nom en bas de sidebar
- [x] Navigation inter-pages : `/student/cursus` → breadcrumb "Étudiant › Cursus", item "Cursus" actif
- [x] Navigation inter-pages : `/student/onboarding` → breadcrumb "Étudiant › Onboarding"
- [x] Landing page `/` → Navbar publique MISSION CIPHER intacte, sans régression
- [x] Layout DOM validé : sidebar=240px, topbar=48px, aucune erreur JS
- [x] AppShell conditionnel : public=Navbar+Footer, student=NotionLayout, auth=standalone

---

## PHASE 2 — Composants Atomiques
**Objectif :** Bibliothèque de 6 composants Notion-style réutilisables dans shared/.

### Étapes

| # | Action | Fichier | Statut |
|---|--------|---------|--------|
| 2.1 | Créer `NotionCard.tsx` — card atomique 4 variants | `frontend/shared/components/notion/NotionCard.tsx` | ✅ FAIT |
| 2.2 | Créer `NotionBadge.tsx` — badge sémantique 14 variants | `frontend/shared/components/notion/NotionBadge.tsx` | ✅ FAIT |
| 2.3 | Créer `NotionProgress.tsx` — barre de progression sobre | `frontend/shared/components/notion/NotionProgress.tsx` | ✅ FAIT |
| 2.4 | Créer `NotionSkeleton.tsx` — skeleton loaders | `frontend/shared/components/notion/NotionSkeleton.tsx` | ✅ FAIT |
| 2.5 | Créer `NotionEmptyState.tsx` — empty states | `frontend/shared/components/notion/NotionEmptyState.tsx` | ✅ FAIT |
| 2.6 | Créer `NotionTag.tsx` — tags/pills atomiques | `frontend/shared/components/notion/NotionTag.tsx` | ✅ FAIT |
| 2.7 | Refactoriser `StatusBadge.tsx` — wrapper NotionBadge | `frontend/shared/components/StatusBadge.tsx` | ✅ FAIT |
| 2.8 | Mettre à jour `index.ts` barrel avec nouveaux composants | `frontend/shared/components/notion/index.ts` | ✅ FAIT |

### Fichiers créés / modifiés
- `frontend/shared/components/notion/NotionCard.tsx` ← NOUVEAU (4 variants, padding configurable, href/onClick)
- `frontend/shared/components/notion/NotionBadge.tsx` ← NOUVEAU (14 variants : semantic + levels + severity)
- `frontend/shared/components/notion/NotionProgress.tsx` ← NOUVEAU (3 sizes, 4 colors, aria-progressbar)
- `frontend/shared/components/notion/NotionSkeleton.tsx` ← NOUVEAU (5 types : line/card/avatar/list/stat)
- `frontend/shared/components/notion/NotionEmptyState.tsx` ← NOUVEAU (icon + title + desc + action, 3 sizes)
- `frontend/shared/components/notion/NotionTag.tsx` ← NOUVEAU (14 variants pill-shape, clickable)
- `frontend/shared/components/notion/index.ts` ← ÉTENDU (6 nouveaux exports Phase 2)
- `frontend/shared/components/StatusBadge.tsx` ← REFACTORISÉ (wrapper NotionBadge, interface préservée)

### Tests phase 2 ✅ TOUS VALIDÉS
- [x] Chaque composant render sans erreur TypeScript
- [x] StatusBadge : même interface externe, délègue à NotionBadge
- [x] index.ts barrel : 9 composants + 3 types exportés

---

## PHASE 3 — Pages Student
**Objectif :** Migrer toutes les pages student, logique métier intacte.

### Étapes

| # | Page | Actions | Statut |
|---|------|---------|--------|
| 3.1 | **Dashboard** `/student` | Supprimer gradient bg · Remplacer apex-cards → NotionCard · Stat cards sobre | ✅ FAIT |
| 3.2 | **Cursus List** `/student/cursus` | Extraire CursusCard → composant · Désaturer colors · NotionTag levels | ✅ FAIT |
| 3.3 | **Cursus Detail** `/student/cursus/[id]` | Restyle module tree · NotionProgress · Items locked sobre | ✅ FAIT |
| 3.4 | **Module** `/student/cursus/[id]/[moduleId]` | Header sobre · Content area centré · Breadcrumb topbar | ✅ FAIT |
| 3.5 | **Progress** `/student/progress` | Accordion workshops sobre · NotionProgress · Checkmarks discrets | ✅ FAIT |
| 3.6 | **Badges** `/student/badges` | Grid sobre · earned = border accent · non-earned = opacity 0.4 | ✅ FAIT |
| 3.7 | **Transactions** `/student/transactions` | Table simple · StatusBadge restyle · Pagination sobre | ✅ FAIT |
| 3.8 | **Transaction Timeline** `/student/transactions/[id]/timeline` | Restyle timeline · dots sobre · étapes claires | ✅ FAIT |
| 3.9 | **Onboarding** `/student/onboarding` | Stepper sobre · NotionCard sélection · Pas d'animations lourdes | ✅ FAIT |
| 3.10 | **Quizzes List** `/student/quizzes` | Grid sobre · score badges · NotionTag catégorie | ✅ FAIT |

### Tests phase 3
- [ ] Dashboard charge les données (workshops, XP, badges)
- [ ] Cursus navigation : list → detail → module fonctionne
- [ ] Progress tracking se met à jour
- [ ] Transactions affichent les données backend
- [ ] Onboarding complète et redirige correctement

---

## PHASE 4 — Pages Contenu
**Objectif :** Theory, Quiz, CTF, Defense — expérience d'apprentissage optimale.

### Étapes

| # | Page | Actions | Statut |
|---|------|---------|--------|
| 4.1 | **Theory** `/student/theory/[moduleId]` | Layout prose centré 720px · leading-loose · ToC sidebar · Blocs callout | ✅ FAIT |
| 4.2 | **Quiz** `/student/quiz/[moduleId]` | Question lisible · Options NotionCard clickable · Score sobre | ✅ FAIT |
| 4.3 | **CTF List** `/student/ctf` | Cards standardisées NotionCard · NotionTag difficulty · Status sobre | ✅ FAIT |
| 4.4 | **CTF Detail** `/student/ctf/[code]` | Header sobre · Description claire · Progression sobre | ✅ FAIT |
| 4.5 | **CTF Terminal** `/student/ctf/[code]/terminal` | Exception : conserver dark terminal · Wrapper sobre | ✅ FAIT |
| 4.6 | **CTF Remediation** `/student/ctf/[code]/remediation` | Layout prose · Callout blocks · Code highlights | ✅ FAIT |
| 4.7 | **Defense** `/student/defense` | Severity tokens désaturés · Cards sobre · Status badges · Quiz modal Notion | ✅ FAIT |
| 4.8 | **Defense Lab** `/student/defense/lab/[vulnCode]` | Exploit/Fix sobre · Sidebar workflow · Probe response dark-mono | ✅ FAIT |

### Tests phase 4
- [ ] Theory charge et affiche le contenu markdown
- [ ] Quiz : sélection options, soumission, score calculé
- [ ] CTF : challenges lockés/unlockés, progression
- [ ] Terminal CTF : fonctionnel (pas de régression)
- [ ] Defense : exploit/fix déclenche l'action backend

---

## PHASE 5 — Polish & Dark Mode
**Objectif :** Dark mode toggle, micro-interactions, accessibilité, performance.

### Étapes

| # | Action | Fichier | Statut |
|---|--------|---------|--------|
| 5.1 | Implémenter toggle dark/light dans layout | `frontend/portal/src/app/layout.tsx` | ⬜ À FAIRE |
| 5.2 | Bouton toggle dans NotionTopbar | `frontend/shared/components/notion/NotionTopbar.tsx` | ⬜ À FAIRE |
| 5.3 | Tester chaque page en dark mode | Toutes pages student + merchant | ⬜ À FAIRE |
| 5.4 | Ajouter `focus-visible` states partout | globals.css + composants | ⬜ À FAIRE |
| 5.5 | Skeleton loaders sur toutes les pages async | Chaque page avec fetch | ⬜ À FAIRE |
| 5.6 | Empty states quand listes vides | Cursus, transactions, badges | ⬜ À FAIRE |
| 5.7 | Vérifier contrast ratio AA (4.5:1 min) | Tout le texte | ⬜ À FAIRE |
| 5.8 | Lazy loading dynamique sur composants lourds | TransactionTimeline, CourseRichRenderer, Terminal | ⬜ À FAIRE |
| 5.9 | Purge CSS finale — objectif globals.css < 5KB | `globals.css` | ⬜ À FAIRE |
| 5.10 | Tests smoke complets toutes fonctionnalités | All | ⬜ À FAIRE |

### Tests phase 5
- [ ] Toggle dark/light : transition fluide, persist localStorage
- [ ] Aucun élément blanc sur fond blanc en light mode
- [ ] Aucune console error en production build
- [ ] Lighthouse performance score > 85
- [ ] Lighthouse accessibility score > 90

---

## Règles de commit par phase

```
feat(design): Phase 0 - notion design tokens
feat(design): Phase 1 - notion layout shell
feat(design): Phase 2 - notion atomic components
feat(design): Phase 3 - student pages migration
feat(design): Phase 4 - content pages migration
feat(design): Phase 5 - polish dark mode
```

## Rollback strategy

Si une phase introduit une régression :
1. `git stash` sur la phase en cours
2. Identifier le composant cassant via git diff
3. La logique métier ne change jamais → le problème est toujours UI
4. Les tokens Phase 0 sont backward-compatible → safe à tout moment

---

*Dernière mise à jour : Phase 0 ✅ — Phase 1 ✅ — Phase 2 ✅ — Phase 3 ✅ TERMINÉE (10/10 pages) — Phase 4 ✅ TERMINÉE (8/8 pages) — Phase 5 ⬜ À FAIRE*
