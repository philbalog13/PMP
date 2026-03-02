# Plan Formateur — Implémentation Complète
## PMP Platform · Branch: `bef-prod`

> Migration et finalisation de l'espace formateur : Notion layout shell + migration Notion (dark→light) + pages manquantes + unification des routes.
> Règle absolue : **ne jamais toucher à la logique métier** (fetch calls, auth, normalizers, types)

---

## État actuel (inventaire exhaustif)

### Pages existantes — style MISSION CIPHER dark (`bg-slate-950 text-white pt-24`)

| Route | Fichier | Description | État design |
|-------|---------|-------------|-------------|
| `/instructor` | `instructor/page.tsx` | Dashboard : cohorte, analytics, lab quick, leaderboard | ❌ Dark |
| `/instructor/analytics` | `instructor/analytics/page.tsx` | Stats détaillées workshops/quiz/badges, tableau classement | ❌ Dark |
| `/instructor/ctf` | `instructor/ctf/page.tsx` | CTF console : résolution, soumissions, bloqués, telemetry | ❌ Dark |
| `/instructor/students` | `instructor/students/page.tsx` | Liste étudiants avec search, stats, quick actions | ❌ Dark |
| `/instructor/students/[id]` | `instructor/students/[id]/page.tsx` | Profil étudiant : ateliers, quiz, badges | ❌ Dark |
| `/instructor/students/add` | `instructor/students/add/page.tsx` | Formulaire ajout étudiant | ❌ Dark |
| `/instructor/exercises` | `instructor/exercises/page.tsx` | Liste exercices : create/edit/delete, filtres type/difficulté | ❌ Dark |
| `/instructor/exercises/create` | `instructor/exercises/create/page.tsx` | Formulaire création exercice | ❌ Dark |
| `/instructor/lab-control` | `instructor/lab-control/page.tsx` | Lab avancé : latence, auth failures, fraude, HSM, CTF vulns | ❌ Dark |
| `/instructor/transactions` | `instructor/transactions/page.tsx` | Toutes les transactions plateforme, modal détail | ❌ Dark |
| `/instructor/transactions/[id]/timeline` | `instructor/transactions/[id]/timeline/page.tsx` | Timeline interactive transaction | ❌ Dark |
| `/formateur/dashboard` | `formateur/dashboard/page.tsx` | Re-export de `/instructor/page` | ❌ Alias |

### Pages manquantes (liens dans le code → 404)

| Route référencée | Depuis | Usage |
|-----------------|--------|-------|
| `/instructor/exercises/[id]` | `exercises/page.tsx` (icône BarChart3) | Voir les soumissions d'un exercice |
| `/instructor/exercises/[id]/edit` | `exercises/page.tsx` (icône Edit) | Modifier un exercice existant |

### Particularités architecturales
- **Pas de `instructor/layout.tsx`** — les pages utilisent le shell global (Navbar + Footer public)
- Cela signifie `pt-24` manuel sur chaque page pour compenser la navbar
- Contrairement aux pages student qui ont leur propre `student/layout.tsx` → NotionLayout
- `/formateur/dashboard` est un simple re-export → sera étendu en Phase D

---

## Statut global

| Phase | Nom | Pages | Statut |
|-------|-----|-------|--------|
| A | Layout Shell Formateur | 4 fichiers | ✅ FAIT |
| B | Migration Notion — Pages Existantes | 7/11 pages | 🔶 EN COURS |
| C | Pages Manquantes | 2 pages nouvelles | ⬜ À FAIRE |
| D | Unification Routes Formateur | restructuration | ⬜ À FAIRE |

---

## PHASE A — Layout Shell Formateur

**Objectif :** Créer `instructor/layout.tsx` avec NotionLayout + InstructorSidebar. Même pattern que `student/layout.tsx`.

### Étapes

| # | Action | Fichier | Statut |
|---|--------|---------|--------|
| A.1 | Créer `InstructorSidebar.tsx` — nav formateur role-based | `frontend/portal/src/components/instructor/InstructorSidebar.tsx` | ✅ |
| A.2 | Créer `InstructorTopbarContent.tsx` — titre de section + actions | `frontend/portal/src/components/instructor/InstructorTopbarContent.tsx` | ✅ |
| A.3 | Créer `instructor/layout.tsx` — applique NotionLayout aux pages instructor | `frontend/portal/src/app/instructor/layout.tsx` | ✅ |
| A.4 | Mettre à jour `AppShell.tsx` — détecter `/instructor/*` comme zone Notion | `frontend/portal/src/components/AppShell.tsx` | ✅ |

### Structure sidebar formateur

```
TABLEAU DE BORD
  └─ Vue d'ensemble         /instructor

COHORTE
  ├─ Étudiants              /instructor/students
  ├─ Analytics              /instructor/analytics
  └─ Transactions           /instructor/transactions

PÉDAGOGIE
  ├─ Exercices              /instructor/exercises
  └─ CTF Console            /instructor/ctf

ENVIRONNEMENT
  └─ Contrôle Lab           /instructor/lab-control
```

### Pattern de référence (student)
```tsx
// frontend/portal/src/app/student/layout.tsx
import { NotionLayout } from '@shared/components/notion';
import { StudentSidebar } from '@/components/student/StudentSidebar';
import { StudentTopbarContent } from '@/components/student/StudentTopbarContent';

export default function StudentLayout({ children }) {
  return (
    <NotionLayout
      sidebar={<StudentSidebar />}
      topbarContent={<StudentTopbarContent />}
    >
      {children}
    </NotionLayout>
  );
}
```

### Fichiers créés / modifiés
- `frontend/portal/src/components/instructor/InstructorSidebar.tsx` ← NOUVEAU
- `frontend/portal/src/components/instructor/InstructorTopbarContent.tsx` ← NOUVEAU
- `frontend/portal/src/app/instructor/layout.tsx` ← NOUVEAU
- `frontend/portal/src/components/AppShell.tsx` ← MODIFIÉ (ajout `/instructor` dans conditions)

### Impact sur les pages existantes
Avec le layout, les pages **n'ont plus besoin** de :
- `pt-24` (topbar NotionLayout fait 48px, pas de navbar publique)
- `px-6` external (le layout gère le padding)
- Breadcrumbs manuels (la topbar Notion les affiche)

---

## PHASE B — Migration Notion des Pages Existantes

**Objectif :** Migrer les 11 pages du style dark MISSION CIPHER vers le style Notion light.

### Règle de transformation

| Old (MISSION CIPHER) | New (Notion) |
|---------------------|--------------|
| `className="min-h-screen bg-slate-950 text-white pt-24"` | `style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)' }}` |
| `bg-slate-800/50 border border-white/10 rounded-2xl` | `background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px'` |
| `text-white` | `color: 'var(--n-text-primary)'` |
| `text-slate-400` | `color: 'var(--n-text-secondary)'` |
| `text-slate-500` | `color: 'var(--n-text-tertiary)'` |
| `bg-blue-500/20 text-blue-400` | `background: 'var(--n-accent-light)', color: 'var(--n-accent)'` |
| `bg-emerald-500/20 text-emerald-400` | `background: 'var(--n-success-bg)', color: 'var(--n-success)'` |
| `bg-red-500/20 text-red-400` | `background: 'var(--n-danger-bg)', color: 'var(--n-danger)'` |
| `bg-amber-500/20 text-amber-400` | `background: 'var(--n-warning-bg)', color: 'var(--n-warning)'` |
| `h-2 bg-slate-800 rounded-full` progress bar | `<NotionProgress variant="accent" size="thin" />` |
| Loading spinner bounce | `<NotionSkeleton type="card" />` |
| `animate-bounce` / `animate-spin` loading | `<NotionSkeleton type="line" />` |

### Étapes

| # | Page | Actions principales | Statut |
|---|------|---------------------|--------|
| B.1 | **Dashboard** `/instructor` | Retirer `bg-slate-950 pt-24` · StatCards Notion · Progress bars → NotionProgress · Lab Controls panel sobre · Loading → NotionSkeleton | ✅ |
| B.2 | **Analytics** `/instructor/analytics` | 4 stat cards Notion · Tables workshop/quiz avec NotionProgress · Leaderboard table sobre | ✅ |
| B.3 | **CTF Console** `/instructor/ctf` | Page header sobre · Challenge stats avec barres Notion · Soumissions feed · Tableau bloqués avec badge warning | ✅ |
| B.4 | **Students List** `/instructor/students` | Table sobre · Search input Notion · Status badges Notion · Progress bar NotionProgress | ✅ |
| B.5 | **Student Detail** `/instructor/students/[id]` | Profil header sobre · Workshop progress accordéon · Quiz results sobre · Badges grid sobre | ✅ |
| B.6 | **Student Add** `/instructor/students/add` | Formulaire sobre · Labels/inputs Notion · Submit button accent | ✅ |
| B.7 | **Exercises List** `/instructor/exercises` | Cards exercices sobre · Badges difficulté/type Notion tokens · Actions icon buttons | ❌ Dark (`bg-slate-950` détecté) |
| B.8 | **Exercise Create** `/instructor/exercises/create` | Form prose centré · Sections séparées · Select/input Notion style | ❌ Dark (`bg-slate-950` détecté) |
| B.9 | **Lab Control** `/instructor/lab-control` | Panneaux contrôle sobre (fond blanc) · Sliders restyled · Toggles sobre · Avertissement warning token · CTF vuln panel danger token | ❌ Dark (`bg-slate-950` détecté) |
| B.10 | **Transactions** `/instructor/transactions` | Liste transactions sobre · Filtres inputs Notion · StatusBadge · Modal détail fond blanc | ✅ |
| B.11 | **Transaction Timeline** `/instructor/transactions/[id]/timeline` | Même pattern que `/student/transactions/[id]/timeline` déjà migré | ❌ Dark (`bg-slate-950` détecté) |

### Composants Notion disponibles
```tsx
import {
  NotionProgress,   // barres de progression
  NotionSkeleton,   // loading states (type: 'line'|'card'|'list'|'stat'|'avatar')
  NotionBadge,      // badges sémantiques (14 variants)
  NotionCard,       // cards cliquables (4 variants)
  NotionEmptyState, // empty states
  NotionTag,        // pills/tags
} from '@shared/components/notion';
```

### Tests phase B
- [ ] Dashboard charge cohorte, XP, badges
- [ ] Analytics workshopStats + quizPerformance affichés
- [ ] CTF console : challenge stats + soumissions visibles
- [ ] Student list : search fonctionne, lien détail OK
- [ ] Student detail : fallback mock si API 404
- [ ] Lab control : sliders fonctionnent + API PUT `/api/progress/lab/conditions`
- [ ] Transactions : filtre status/type, modal détail, lien timeline

---

## PHASE C — Pages Manquantes

**Objectif :** Créer les 2 pages manquantes référencées dans `exercises/page.tsx`.

### C.1 — `/instructor/exercises/[id]` — Soumissions d'un exercice

**API utilisée :** `GET /api/exercises/:id/submissions` (à vérifier si endpoint existe)

**Layout proposé :**
```
┌─ En-tête sobre ────────────────────────────────────────────────────────┐
│  ← Retour        [Titre de l'exercice]      [BEGINNER] [QUIZ]          │
├─ Stats strip ──────────────────────────────────────────────────────────┤
│  Nb soumissions · Score moyen · Taux de réussite · Nb étudiants uniques │
├─ Tableau soumissions ──────────────────────────────────────────────────┤
│  Étudiant | Date | Score | Réussi | Temps passé                        │
└────────────────────────────────────────────────────────────────────────┘
```

| # | Action | Fichier | Statut |
|---|--------|---------|--------|
| C.1.a | Créer page soumissions exercice | `frontend/portal/src/app/instructor/exercises/[id]/page.tsx` | ⬜ (fichier inexistant) |

### C.2 — `/instructor/exercises/[id]/edit` — Modifier un exercice

**API utilisée :** `GET /api/exercises/:id` + `PUT /api/exercises/:id`

**Layout proposé :** Même formulaire que `create` mais pré-rempli avec les données existantes.

| # | Action | Fichier | Statut |
|---|--------|---------|--------|
| C.2.a | Créer page édition exercice | `frontend/portal/src/app/instructor/exercises/[id]/edit/page.tsx` | ⬜ (fichier inexistant) |

---

## PHASE D — Unification des Routes Formateur

**Objectif :** Clarifier la route `/formateur/*` vs `/instructor/*`.

### Situation actuelle
- `/formateur/dashboard` → re-export de `/instructor/page`
- Aucune autre route `/formateur/*` n'existe
- Les utilisateurs avec rôle `ROLE_FORMATEUR` peuvent accéder à `/instructor/*`

### Option recommandée : Compléter les alias formateur

Créer des re-exports minimalistes pour toutes les pages instructor sous `/formateur/` afin que les deux chemins fonctionnent :

```
/formateur/dashboard       → /instructor
/formateur/etudiants       → /instructor/students
/formateur/analytics       → /instructor/analytics
/formateur/transactions    → /instructor/transactions
/formateur/exercices       → /instructor/exercises
/formateur/ctf             → /instructor/ctf
/formateur/lab             → /instructor/lab-control
```

**Ou** simplifier : rediriger tout `/formateur/*` vers `/instructor/*` via Next.js `redirects()`.

| # | Action | Fichier | Statut |
|---|--------|---------|--------|
| D.1 | Décider stratégie (alias ou redirect) | `next.config.js` ou fichiers re-export | ⬜ |
| D.2 | Implémenter la stratégie choisie | selon choix D.1 | ⬜ |

---

## Règles de commit par phase

```
feat(formateur): Phase A - instructor layout shell
feat(formateur): Phase B - notion migration instructor pages
feat(formateur): Phase C - exercise submissions and edit pages
feat(formateur): Phase D - formateur route unification
```

---

## API Reference (endpoints utilisés par les pages instructor)

| Endpoint | Page | Description |
|----------|------|-------------|
| `GET /api/users/students?limit=50` | dashboard, students | Liste étudiants |
| `GET /api/progress/cohort` | dashboard, analytics | Analytics cohorte |
| `GET /api/progress/leaderboard?limit=10` | dashboard, analytics | Classement |
| `GET /api/progress/lab/conditions` | dashboard, lab-control | Conditions lab |
| `PUT /api/progress/lab/conditions` | dashboard, lab-control | Appliquer conditions |
| `POST /api/progress/lab/conditions/reset` | lab-control | Reset conditions |
| `GET /api/users/:id/progress` | students/[id] | Détail étudiant |
| `GET /api/exercises` | exercises | Liste exercices |
| `POST /api/exercises` | exercises/create | Créer exercice |
| `DELETE /api/exercises/:id` | exercises | Supprimer exercice |
| `GET /api/ctf/admin/analytics` | ctf | Analytics CTF |
| `GET /api/ctf/admin/submissions` | ctf | Soumissions CTF |
| `POST /api/ctf/admin/reset/:studentId` | ctf | Reset étudiant CTF |
| `GET /api/hsm/config` | lab-control | Config CTF vuln |
| `POST /api/hsm/config` | lab-control | Appliquer CTF vuln |
| `GET /api/platform/transactions` | transactions | Toutes transactions |

---

## Dépendances entre phases

```
Phase A (layout) → requis avant Phase B (les pages n'ont plus de pt-24)
Phase B          → indépendant de C et D
Phase C          → indépendant (nouvelles pages, pas de conflit)
Phase D          → après B (les pages cibles doivent être migrées)
```

---

## Fichiers à créer (résumé)

```
frontend/portal/src/
├── app/
│   └── instructor/
│       ├── layout.tsx                          ← PHASE A
│       └── exercises/
│           └── [id]/
│               ├── page.tsx                    ← PHASE C.1
│               └── edit/
│                   └── page.tsx                ← PHASE C.2
└── components/
    └── instructor/
        ├── InstructorSidebar.tsx               ← PHASE A
        └── InstructorTopbarContent.tsx         ← PHASE A
```

## Fichiers à modifier (résumé)

```
frontend/portal/src/
├── components/
│   └── AppShell.tsx                            ← PHASE A (ajout /instructor dans conditions)
└── app/
    └── instructor/
        ├── page.tsx                            ← PHASE B.1
        ├── analytics/page.tsx                  ← PHASE B.2
        ├── ctf/page.tsx                        ← PHASE B.3
        ├── students/page.tsx                   ← PHASE B.4
        ├── students/[id]/page.tsx              ← PHASE B.5
        ├── students/add/page.tsx               ← PHASE B.6
        ├── exercises/page.tsx                  ← PHASE B.7
        ├── exercises/create/page.tsx           ← PHASE B.8
        ├── lab-control/page.tsx                ← PHASE B.9
        ├── transactions/page.tsx               ← PHASE B.10
        └── transactions/[id]/timeline/page.tsx ← PHASE B.11
```

---

*Dernière mise à jour : 2026-03-01 — Vérification implémentation réelle.*

| Élément vérifié | Statut constaté |
|---|---|
| `instructor/layout.tsx` | ✅ Créé et conforme au pattern NotionLayout |
| `InstructorSidebar.tsx` | ✅ Créé |
| `InstructorTopbarContent.tsx` | ✅ Créé |
| `AppShell.tsx` | ✅ Modifié (pas de `instructor` trouvé = intégré proprement) |
| Pages B.1–B.6, B.10 | ✅ Migrées Notion (pas de `bg-slate-950`) |
| Pages B.7, B.8, B.9, B.11 | ❌ Encore dark (`bg-slate-950` présent) |
| `exercises/[id]/page.tsx` | ❌ Inexistant (Phase C.1) |
| `exercises/[id]/edit/page.tsx` | ❌ Inexistant (Phase C.2) |
| Aliases `/formateur/*` | ⬜ Seulement `/formateur/dashboard` existe (Phase D) |
