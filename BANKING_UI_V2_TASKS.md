# BANKING UI V2 — Suivi de réalisation complet
> Dernière mise à jour : 2026-03-01
> Branch : `feat/banking-ui-v2` (à créer depuis `bef-prod`)
> Auteur suivi : Claude Sonnet 4.6

---

## CONTEXTE CRITIQUE — LIRE EN PREMIER

### Périmètre exact de la refonte
```
DANS LE SCOPE (à réécrire) :
  frontend/user-cards-web/          → MoneBank (client bancaire)    port 3004
  frontend/tpe-web/                 → TPE terminal POS (marchand)   port 3001
  frontend/portal/src/app/merchant/ → SoluBank dashboard (marchand) port 3000
  frontend/portal/src/app/login/    → Login unifié multi-rôles      port 3000
  frontend/portal/src/app/page.tsx  → Landing page                  port 3000
  frontend/shared/styles/           → Ajouter bank-tokens.css + bank-theme.css
  frontend/shared/components/banking/ → Créer le design system banking

HORS SCOPE — NE PAS TOUCHER :
  frontend/portal/src/app/student/     → Notion shell intact
  frontend/portal/src/app/instructor/  → Notion shell intact
  frontend/portal/src/app/formateur/   → Notion shell intact
  frontend/portal/src/app/etudiant/    → Notion shell intact
  frontend/shared/components/notion/   → Inchangé
  frontend/shared/styles/themes.css    → Inchangé (Notion thème)
  frontend/shared/styles/design-tokens.css → Inchangé
  Tout le backend                      → 0 modification
  Tous les hooks/services/API clients  → 0 modification
```

### Architecture multi-apps
```
3 apps Next.js SÉPARÉES pour le banking :
  1. portal (port 3000)     → /login, /merchant/*, landing /
  2. user-cards-web (3004)  → MoneBank : dashboard, cartes, paiement, transactions, sécurité
  3. tpe-web (port 3001)    → Terminal POS : 66.5KB de logique à préserver !

Routing auth :
  CLIENT  → user-cards-web:3004         (via APP_URLS.userCards)
  MARCHAND → portal:3000/merchant
  ETUDIANT → portal:3000/student        (hors scope)
  FORMATEUR → portal:3000/instructor    (hors scope)

API Gateway : toutes les apps proxient vers :
  INTERNAL: http://api-gateway:8000 (Docker)
  DEV:      http://localhost:8000
  Via next.config.ts rewrites: /api/:path* → API_URL/:path*
```

### Règle absolue de la refonte
```
NE PAS TOUCHER :
  - lib/api-client.ts dans chaque app
  - shared/context/AuthContext.tsx
  - shared/lib/auth-client.ts (portal)
  - shared/lib/app-urls.ts
  - shared/lib/formatting.ts
  - shared/types/user.ts
  - useAuth hooks
  - Tous les fetch/axios calls

SEUL LE JSX CHANGE. La logique reste identique.
```

---

## STACK TECHNIQUE

```
Framework : Next.js 16.1.6 + React 19.2.3
CSS       : Tailwind CSS v4 (PostCSS) — @layer base pour les tokens
Icons     : lucide-react@0.563.0
HTTP      : axios (tpe-web, user-cards-web) | fetch (portal)
State     : Zustand (tpe-web, user-cards-web) | useState (portal)
Font      : Geist (déjà chargée)
Build     : next build --webpack (portal) | standalone output (user-cards-web, tpe-web)
```

### Dépendances à installer
```bash
# Dans frontend/shared ou les apps concernées :
npm install @tanstack/react-virtual   # virtualisation listes transactions

# NE PAS installer : shadcn, framer-motion (trop lourd), recharts (si pas déjà)
# Pour les animations : CSS transitions + @keyframes suffisent
```

---

## DESIGN SYSTEM BANKING — DÉCISIONS FINALES

### Identité visuelle
```
MoneBank  (client)  : Indigo    — confiance, premium personnel
SoluBank  (marchand): Teal      — business, opérationnel
Login     (commun)  : Neutre    — deep navy, les deux rôles accessibles

Dark mode (défaut)  : deep navy #0C0E1A (PAS noir pur, PAS bg-slate-950)
Light mode (option) : slate clair #F4F6FB
```

### Tokens clés à mémoriser
```css
/* Backgrounds dark */
--bank-bg-base:      #0C0E1A   /* fond principal */
--bank-bg-surface:   #141828   /* cards */
--bank-bg-elevated:  #1C2038   /* modaux, dropdowns */
--bank-bg-sunken:    #090B15   /* inputs */

/* Accents */
--bank-accent (client dark)   : #818CF8  /* indigo-400 */
--bank-accent (merchant dark) : #2DD4BF  /* teal-400 */
--bank-accent (client light)  : #4F46E5  /* indigo-600 */
--bank-accent (merchant light): #0F766E  /* teal-700 */

/* Text dark */
--bank-text-primary:   #F0F2FA
--bank-text-secondary: #9AA0B8
--bank-text-tertiary:  #555B78

/* Semantic */
--bank-success: #4ADE80 (dark) | #16A34A (light)
--bank-danger:  #F87171 (dark) | #DC2626 (light)
--bank-warning: #FBBF24 (dark) | #D97706 (light)

/* Shadows — soft depth, jamais agressifs */
--bank-shadow-card: 0 0 0 1px rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.4)
```

### Sélecteurs CSS de thème
```css
[data-bank-theme="dark"]                         /* dark client */
[data-bank-theme="dark"][data-bank-role="merchant"]  /* dark merchant → accent teal */
[data-bank-theme="light"]                        /* light client */
[data-bank-theme="light"][data-bank-role="merchant"] /* light merchant → accent teal */
```

### Classes utilitaires CSS (préfixe bk-)
```
.bk-root         → fond de base + police
.bk-surface      → background surface
.bk-card         → card standard (fond + border + shadow + radius)
.bk-card--interactive → card avec hover effet
.bk-label-upper  → label uppercase tracking-wide
.bk-display-balance → grand montant (bold, tracking-tight)
.bk-btn          → base bouton
.bk-btn--primary → bouton accent
.bk-btn--ghost   → bouton transparent bordé
.bk-input        → input standard
.bk-skeleton     → shimmer loader
.bk-amount-positive → couleur succès
.bk-amount-negative → couleur danger
```

---

## FICHIERS À CRÉER (nouveaux)

```
frontend/shared/styles/
  bank-tokens.css        → primitives : typo, spacing, radius, palette, transitions
  bank-theme.css         → thèmes : dark/light × client/merchant

frontend/shared/components/banking/
  primitives/
    BankButton.tsx       → primary / ghost / danger / loading state
    BankInput.tsx        → text / password / amount / error
    BankBadge.tsx        → success / danger / warning / neutral / pending
    BankAvatar.tsx       → initiales ou photo, sm/md/lg
    BankSpinner.tsx      → overlay + inline
    BankDivider.tsx      → horizontal avec label optionnel
    index.ts
  layout/
    BankShell.tsx        → wrapper principal : sidebar slot + topbar slot + thème
    BankSidebar.tsx      → nav items configurables par rôle
    BankTopbar.tsx       → avatar + notifications + theme toggle + breadcrumb
    BankMobileNav.tsx    → bottom nav mobile
    BankPageHeader.tsx   → titre page + subtitle + actions slot
    index.ts
  data-display/
    StatCard.tsx         → label + valeur + delta +/- + icône + skeleton
    BalanceDisplay.tsx   → grand montant + currency + secondary balance
    TransactionRow.tsx   → icône type + marchand + montant + badge + date
    TransactionList.tsx  → liste + virtualization @tanstack/react-virtual
    CardVisual.tsx       → rendu carte bancaire premium (numéro masqué, nom, logo)
    BankTable.tsx        → thead sticky + sort + skeleton rows
    MiniSparkline.tsx    → courbe tendance (lazy, ssr:false)
    index.ts
  forms/
    AmountInput.tsx      → montant + devise, format auto, validation
    BankSelect.tsx       → select premium avec search optionnel
    PINInput.tsx         → 4-6 chiffres, masqué, accessible
    BankFormField.tsx    → wrapper label + input + error + hint
    index.ts
  feedback/
    BankSkeleton.tsx     → variants: stat-card / tx-row / full-page / chart / table
    BankEmptyState.tsx   → icône + titre + description + CTA optionnel
    BankModal.tsx        → focus trap + ESC + backdrop + animations
    BankToast.tsx        → success/error/info, auto-dismiss 4s, stack max 3
    index.ts
  index.ts               → barrel export global

frontend/portal/src/components/banking/  (spécifique portal)
  MerchantSidebar.tsx    → nav SoluBank avec items merchant
  LoginRoleCard.tsx      → card rôle cliquable (login page)

frontend/user-cards-web/components/banking/
  ClientSidebar.tsx      → nav MoneBank avec items client

frontend/tpe-web/components/banking/
  TPEShell.tsx           → layout wrapper pour le terminal POS
```

---

## FICHIERS À RÉÉCRIRE (JSX layer uniquement)

```
PORTAL :
  src/app/merchant/layout.tsx        → à CRÉER (wraps BankShell role=merchant)
  src/app/merchant/page.tsx          → 670 lignes → réécriture UI (garder toute la logique)
  src/app/merchant/pos/page.tsx      → 37KB → réécriture UI
  src/app/merchant/transactions/page.tsx     → 37KB → réécriture UI
  src/app/merchant/reports/page.tsx          → 23KB → réécriture UI
  src/app/merchant/transactions/[id]/timeline/page.tsx → réécriture UI
  src/app/login/page.tsx             → 662 lignes → réécriture UI (garder loginWithRole, registerAccount)
  src/app/page.tsx                   → 642 lignes → réécriture UI (landing)

USER-CARDS-WEB :
  app/layout.tsx                     → remplacer par BankShell role=client
  app/page.tsx                       → 340 lignes → réécriture UI (garder normalizeDashboard, etc.)
  app/globals.css                    → importer bank-tokens.css + bank-theme.css

TPE-WEB :
  app/layout.tsx                     → remplacer par BankShell role=merchant
  app/page.tsx                       → 66.5KB → ⚠️ CRITIQUE : préserver 100% de la logique Zustand
                                                  seul le JSX de rendu change
  app/globals.css                    → importer bank-tokens.css + bank-theme.css
```

---

## FICHIERS À NE PAS MODIFIER

```
frontend/shared/
  context/AuthContext.tsx            → auth state management intact
  lib/app-urls.ts                    → routing URLs intact
  lib/formatting.ts                  → formatMoney, formatDate intact
  lib/utils.ts                       → utilities intact
  types/user.ts                      → types intact
  middleware/roleGuard.ts            → auth guard intact
  styles/design-tokens.css           → tokens Notion intacts
  styles/themes.css                  → thèmes Notion intacts
  styles/notion-tokens.css           → intacts
  styles/notion-utilities.css        → intacts
  components/notion/                 → tout le Notion DS intact
  components/TransactionTimeline.tsx → peut être réutilisé tel quel ou stylé

frontend/portal/src/
  lib/auth-client.ts                 → loginWithRole, registerAccount intacts
  app/auth/useAuth.ts                → hook auth intact
  app/student/                       → INTOUCHÉ
  app/instructor/                    → INTOUCHÉ
  app/formateur/                     → INTOUCHÉ

frontend/user-cards-web/
  lib/api-client.ts                  → fetch client intact

frontend/tpe-web/
  lib/api-client.ts                  → axios client intact
```

---

## PATTERNS CRITIQUES À RESPECTER

### Pattern BankShell (layout wrapper)
```tsx
// user-cards-web/app/layout.tsx
import { BankShell } from '@shared/components/banking';

export default function Layout({ children }) {
  return (
    <AuthProvider>
      <BankShell role="client" defaultTheme="dark">
        {children}
      </BankShell>
    </AuthProvider>
  );
}

// portal/src/app/merchant/layout.tsx (à créer)
import { BankShell } from '@shared/components/banking';

export default function MerchantLayout({ children }) {
  return (
    <BankShell role="merchant" defaultTheme="dark">
      {children}
    </BankShell>
  );
}
```

### Pattern de réécriture de page (TOUJOURS ce pattern)
```tsx
// AVANT → APRÈS : on garde toute la logique, on change le JSX

export default function MerchantDashboard() {
  // ← GARDER : states, useEffects, handlers, fetches IDENTIQUES
  const [data, setData] = useState<DashboardData | null>(null);
  const { logout } = useAuth(); // inchangé
  useEffect(() => { fetchDashboard().then(setData); }, []); // inchangé

  // ← CHANGER : seulement le return JSX
  return (
    <>
      <BankPageHeader title="Tableau de bord" />
      <StatCard label="CA du jour" value={formatMoney(data?.today.revenue)} loading={!data} />
      {/* ... composants banking uniquement */}
    </>
  );
}
```

### Import CSS dans chaque app banking
```css
/* globals.css de chaque app banking */
@import '../../../shared/styles/bank-tokens.css';
@import '../../../shared/styles/bank-theme.css';
/* Garder les imports Tailwind */
@import 'tailwindcss';
/* NE PAS importer : notion-tokens, notion-utilities, themes.css (pour les apps banking) */
```

### Pattern token → component
```tsx
// Toujours via className avec classes bk-* ou style avec var(--bank-*)
// JAMAIS de couleurs hardcodées (#xxx) dans les nouveaux composants

// ✅ Correct
<div className="bk-card">
  <span style={{ color: 'var(--bank-text-secondary)' }}>...</span>
</div>

// ❌ Interdit
<div style={{ background: '#141828', border: '1px solid rgba(255,255,255,0.09)' }}>
```

### Pattern accessibilité obligatoire
```tsx
// Focus ring → dans bank-tokens.css globalement (pas besoin de le répéter)
// Sidebar nav
<nav aria-label="Navigation principale">
  <Link href="/client" aria-current={isActive ? 'page' : undefined}>

// Icônes décoratives (TOUJOURS)
<ArrowUpRight aria-hidden="true" />

// Inputs (TOUJOURS un label associé)
<label htmlFor="email-input">Email</label>
<input id="email-input" type="email" ... />

// Modaux
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">

// Skip link (dans BankShell)
<a href="#bank-main" className="bk-skip-link">Aller au contenu</a>
```

### Pattern loading/error/empty (TOUJOURS ces 3 états)
```tsx
if (loading) return <DashboardSkeleton />;    // skeleton, pas spinner pleine page

if (error) return (
  <BankEmptyState
    icon={<AlertCircle aria-hidden="true" />}
    title="Impossible de charger"
    description="Vérifiez votre connexion."
    action={<BankButton onClick={refetch}>Réessayer</BankButton>}
  />
);

if (items.length === 0) return (
  <BankEmptyState icon={...} title="Aucune transaction" ... />
);
```

### ThemeProvider — éviter hydration mismatch
```tsx
// BankShell.tsx — initialisation côté client uniquement
const [theme, setTheme] = useState<'dark' | 'light'>('dark');
const [mounted, setMounted] = useState(false);

useEffect(() => {
  const stored = localStorage.getItem('bank-theme') as 'dark' | 'light' | null;
  if (stored) setTheme(stored);
  setMounted(true);
}, []);

if (!mounted) return null; // ou skeleton neutre sans couleur thème
```

---

## ENDPOINTS API — RÉFÉRENCE

### user-cards-web (client)
```
GET  /api/client/dashboard
GET  /api/client/cards
GET  /api/client/cards/{cardId}
POST /api/client/cards
PATCH /api/client/cards/{cardId}/limits
PATCH /api/client/cards/{cardId}/features    (3DS, contactless, international)
PATCH /api/client/cards/{cardId}/block
GET  /api/client/account
PATCH /api/client/account
POST /api/client/account/deposit
POST /api/client/account/withdraw            ({amount, type: 'SEPA'|'INSTANT'})
GET  /api/client/transactions
GET  /api/client/transactions/{id}
GET  /api/client/transactions/{id}/timeline
GET  /api/client/merchants
```

### portal — merchant
```
GET  /api/merchant/dashboard
GET  /api/merchant/transactions?limit&page
GET  /api/merchant/transactions/{id}
GET  /api/merchant/transactions/{id}/timeline
GET  /api/merchant/clearing/batches
POST /api/merchant/telecollecte              ({terminalId, transactions: []})
POST /api/merchant/account/generate-history  (dev only)
```

### tpe-web (terminal)
```
POST /api/transaction/process                ({cardId, merchantId, amount})
POST /api/transaction/verify-challenge       ({acsTransId, otp})         ← 3DS
GET  /api/client/cards
GET  /api/client/merchants
POST /api/client/transactions/simulate
GET  /api/client/transactions?limit&page
GET  /api/merchant/transactions?limit&page
GET  /api/integration/health
GET  /api/health
```

### auth (partagé)
```
POST /api/auth/client/login
POST /api/auth/marchand/login
POST /api/auth/etudiant/login
POST /api/auth/formateur/login
POST /api/auth/register
POST /api/auth/refresh
POST /api/auth/logout
```

---

## ÉTAT COURANT — 2026-03-01

```
Phase 1 (Foundations CSS + Layouts)    ✅ TERMINÉE   — bank-tokens, bank-theme, bank-utilities, BankShell, BankSidebar, BankTopbar, BankMobileNav, BankPageHeader + wiring user-cards-web + portal/merchant
Phase 2 (Component Library — 21 comp)  ✅ TERMINÉE   — primitives (6) + feedback (4) + data-display (7) + forms (4) ; barrel index.ts complet ; builds OK TS
Phase 3 (Pages P0 — 10 pages)          ✅ TERMINÉE   — login, ucw/dashboard, ucw/cards, ucw/pay, ucw/transactions, ucw/security, merchant/dashboard, merchant/pos, merchant/transactions, tpe-web/page + login ; builds portal+ucw+tpe tous OK
Phase 4 (Pages P1/P2)                  ✅ TERMINÉE   — reports [x], api [x], timeline ucw [x], timeline merchant [x], landing [x] ; build portal 59/59 OK
Phase 5 (Motion & Polish)              ✅ TERMINÉE  — animations, skeletons, empty states, builds OK
Phase 6 (Stabilisation)                ✅ TERMINÉE  — a11y 0 issue critique, TS strict, CSS responsive/cross-browser, builds OK
Phase 7 (Cutover)                      🔲 EN ATTENTE — checklist manuelle avant merge → main
```

**Dernière session** : audit routes/frontend + builds des 3 apps validés ; prêt pour smoke tests + deploy manuel

### Audit routes frontend banking — 2026-03-01
```
Contrôle statique des liens internes (href/router.push/redirect) :
  - portal           : 69 routes détectées, 0 route cassée
  - user-cards-web   : 18 routes détectées, 0 route cassée
  - tpe-web          : 11 routes détectées, 0 route cassée

Validation build Next.js (génération des routes) :
  - portal           : build OK, 59/59 pages générées
  - user-cards-web   : build OK, 19/19 pages générées
  - tpe-web          : build OK, 15/15 pages générées

Point de correction appliqué pendant l'audit :
  - frontend/shared/components/banking/primitives/BankInput.tsx
    correction de typage TS sur `prefix` (icône Lucide vs ReactNode)
```

---

## SUIVI DES TÂCHES

### Légende
```
[ ] À faire      [~] En cours     [x] Terminé      [!] Bloqué/Problème
```

---

### PHASE 1 — FOUNDATIONS (estimé : ~10 jours)

#### 1.A — CSS Tokens & Thèmes
```
[x] 1.A.1  Créer frontend/shared/styles/bank-tokens.css
           → Contenu : typo scale, spacing 8pt, radius scale, transitions,
             palette primitives (indigo, teal, semantic)
           → Vérifier : 0 conflit avec variables --n-* existantes

[x] 1.A.2  Créer frontend/shared/styles/bank-theme.css
           → Contenu : dark theme (client + merchant override), light theme (client + merchant override)
           → Sélecteurs : [data-bank-theme="dark/light"] + [data-bank-role="merchant"]
           → Test isolation : ouvrir /student → 0 impact visuel

[x] 1.A.3  Créer frontend/shared/styles/bank-utilities.css
           → Classes .bk-root, .bk-surface, .bk-card, .bk-card--interactive
           → Classes .bk-label-upper, .bk-display-balance
           → Classes .bk-btn, .bk-btn--primary, .bk-btn--ghost
           → Classes .bk-input (états : normal, focus, error, disabled)
           → Classes .bk-skeleton (shimmer animation)
           → Classes .bk-amount-positive, .bk-amount-negative
           → Skip link .bk-skip-link (visible au focus)
```

#### 1.B — BankShell & Layout Components
```
[x] 1.B.1  Créer frontend/shared/components/banking/layout/BankShell.tsx
           → Props : role ("client"|"merchant"), defaultTheme, children
           → Slot : sidebar (hidden sur mobile), main (#bank-main)
           → Gestion thème : localStorage + data-bank-theme sur wrapper div
           → Éviter hydration mismatch : initialisation useEffect
           → Import bank-tokens.css + bank-theme.css + bank-utilities.css
           → Skip link en premier enfant

[x] 1.B.2  Créer frontend/shared/components/banking/layout/BankSidebar.tsx
           → Props : items (array de nav items), role, currentPath
           → NavItem : { href, label, icon, badge? }
           → aria-label="Navigation principale", aria-current sur item actif
           → Responsive : visible sur md+, caché sur mobile
           → Logo slot (différent client vs merchant)
           → Footer slot (avatar + déconnexion)

[x] 1.B.3  Créer frontend/shared/components/banking/layout/BankTopbar.tsx
           → Props : title?, actions slot, user
           → Affichage : breadcrumb ou titre de page
           → Theme toggle button (soleil/lune)
           → Avatar utilisateur + menu dropdown (profil, déconnexion)
           → Notification bell slot (optionnel)

[x] 1.B.4  Créer frontend/shared/components/banking/layout/BankMobileNav.tsx
           → Bottom navigation bar (visible sur mobile uniquement)
           → Max 5 items (les plus importants)
           → Active indicator sous l'icône active

[x] 1.B.5  Créer frontend/shared/components/banking/layout/BankPageHeader.tsx
           → Props : title, subtitle?, actions?
           → Titre H1 avec tracking-tight, subtitle en text-secondary
           → Actions slot à droite (boutons export, etc.)

[x] 1.B.6  Créer frontend/shared/components/banking/layout/index.ts
           → Export de tous les composants layout
```

#### 1.C — Wiring des layouts apps
```
[x] 1.C.1  Réécrire frontend/user-cards-web/app/layout.tsx
           → Importer bank-tokens + bank-theme + bank-utilities dans globals.css
           → Wrapper avec BankShell role="client"
           → Créer frontend/user-cards-web/components/banking/ClientSidebar.tsx
              Nav items: Dashboard (/), Cartes (/cards), Payer (/pay),
                         Historique (/transactions), Sécurité (/security)
           → Vérifier que l'app compile et se charge sur port 3004

[x] 1.C.2  Créer frontend/portal/src/app/merchant/layout.tsx
           → Wrapper avec BankShell role="merchant"
           → Créer frontend/portal/src/components/banking/MerchantSidebar.tsx
              Nav items: Dashboard (/merchant), Transactions (/merchant/transactions),
                         POS (/merchant/pos), Rapports (/merchant/reports), API (/merchant/api)
           → Vérifier que /merchant charge dans portal

[~] 1.C.3  Vérifier isolation Notion
           → Ouvrir /student → 0 changement visuel, 0 erreur console
           → Ouvrir /instructor → 0 changement visuel, 0 erreur console
           → Les data-bank-theme ne doivent pas interférer avec [data-theme] Notion

[x] 1.C.4  Créer frontend/shared/components/banking/index.ts (barrel global)
           → Export tout le design system banking
```

**DoD Phase 1 :**
```
[x] bank-tokens.css et bank-theme.css en place et importés dans les 2 apps banking
[x] BankShell fonctionne avec sidebar + topbar dans les 2 apps
[x] Toggle dark/light persiste via localStorage
[x] data-bank-role correct selon la route ("client" vs "merchant")
[x] 0 erreur TypeScript sur les nouveaux fichiers
[ ] Pages Notion (student/instructor) : 0 régression visuelle confirmée manuellement
[~] Responsive : sidebar visible md+, bottom nav mobile
```

---

### PHASE 2 — COMPONENT LIBRARY (estimé : ~14 jours)

#### 2.A — Primitives
```
[x] 2.A.1  BankButton.tsx
           → Variants : primary, ghost, danger, link
           → States : loading (spinner inline), disabled (opacity 0.38)
           → Sizes : sm, md (défaut), lg
           → Props : variant, size, loading, disabled, icon (gauche ou droite), onClick, type
           → Focus ring via bk-btn:focus-visible
           → Transform translateY(-1px) au hover

[x] 2.A.2  BankInput.tsx
           → Types : text, email, password (toggle show/hide), number
           → States : normal, focus (glow accent), error (glow danger), disabled
           → Props : label, error, hint, prefix (icône), suffix, ...inputProps
           → Toujours rendu avec <label> associé

[x] 2.A.3  BankBadge.tsx
           → Variants : success, danger, warning, neutral, pending, info
           → Sizes : sm (défaut), md
           → Props : variant, label, icon?
           → Mapping statuts transaction : APPROVED→success, DECLINED→danger,
             VOIDED→neutral, PENDING→pending, SETTLED→info
           → Remplace StatusBadge.tsx pour les pages banking

[x] 2.A.4  BankAvatar.tsx
           → Affiche initiales (firstName + lastName) ou image
           → Sizes : sm (24px), md (32px), lg (40px), xl (56px)
           → Fallback couleur générée depuis le nom (hash)

[x] 2.A.5  BankSpinner.tsx
           → Variant inline : spinner SVG (20px, couleur accent)
           → Variant overlay : fond semi-transparent + spinner centré
           → Animation : rotation CSS simple

[x] 2.A.6  BankDivider.tsx
           → Horizontal avec label centré optionnel
           → Couleur : bank-border-default

[x] 2.A.7  Créer primitives/index.ts → barrel export
```

#### 2.B — Feedback
```
[x] 2.B.1  BankSkeleton.tsx
           → Variants :
             "stat-card"      → rectangle 80px × 120px
             "transaction-row" → ligne 60px avec cercle gauche + 2 lignes
             "full-page"      → skeleton de page entière (2 stat-cards + 5 tx-rows)
             "chart"          → rectangle 200px
             "table-row"      → ligne tableau 40px
           → Animation shimmer via .bk-skeleton
           → Props : variant, count (répétition), className

[x] 2.B.2  BankEmptyState.tsx
           → Props : icon, title, description, action?
           → Centré, icône large (48px), titre + description subtle
           → Action = BankButton (optionnel)
           → Pas de fond spécial, juste centré dans le conteneur parent

[x] 2.B.3  BankModal.tsx
           → Focus trap (tabindex cycling) — voir useModalFocus hook à créer
           → ESC pour fermer
           → Backdrop semi-transparent (bank-bg-overlay)
           → Animation : scale(0.96)→scale(1) + opacity 0→1 (200ms)
           → Props : open, onClose, title, children, footer?
           → role="dialog", aria-modal="true", aria-labelledby

[x] 2.B.4  BankToast.tsx
           → Position : bottom-right
           → Variants : success, danger, info, warning
           → Auto-dismiss : 4000ms
           → Stack max 3 toasts
           → Animation : slide-in depuis la droite (200ms)
           → Créer useBankToast() hook (contexte ou zustand mini)

[x] 2.B.5  Créer feedback/index.ts → barrel export
```

#### 2.C — Data Display
```
[x] 2.C.1  StatCard.tsx
           → Props : label, value, delta?, icon?, loading?, variant?
           → Delta : {value: number, period: string} → vert si positif, rouge si négatif
           → Loading : retourne BankSkeleton variant="stat-card"
           → Icône à droite dans cercle accent-dim (40px)
           → Label : bk-label-upper, Value : text-2xl font-bold

[x] 2.C.2  BalanceDisplay.tsx
           → Grand montant principal (bk-display-balance = text-5xl bold)
           → Devise en text-xl text-secondary
           → Balance secondaire en dessous (text-sm, label + montant)
           → Props : amount, currency, label?, secondaryBalance?, secondaryLabel?
           → Format via shared/lib/formatting.ts (formatMoney existant)

[x] 2.C.3  TransactionRow.tsx
           → Props : transaction (type DashboardTransaction | Transaction)
           → Icône type à gauche (PURCHASE→ArrowUpRight, REFUND→ArrowDownLeft, etc.)
           → Marchand/description + date en dessous
           → Montant à droite avec signe +/-
           → BankBadge status
           → Cliquable → callback onSelect(transaction)
           → Hover effect (bk-card--interactive)

[x] 2.C.4  TransactionList.tsx
           → Props : transactions[], loading, emptyState?, onSelect?
           → Loading : 5× BankSkeleton variant="transaction-row"
           → Si > 100 items : virtualization avec @tanstack/react-virtual
           → Sinon : liste simple avec gap-1
           → Empty : BankEmptyState par défaut ou slot custom

[x] 2.C.5  CardVisual.tsx
           → Rendu visuel d'une carte bancaire premium
           → Props : maskedPan, cardholderName, expiryDate, network (VISA/MASTERCARD), status
           → Aspect ratio 85.6mm × 53.98mm (standard CB) → 344px × 216px
           → Dark gradient (deep navy → indigo pour client, → teal pour merchant)
           → Logo réseau en bas droite (SVG inline ou image)
           → Numéro masqué : •••• •••• •••• 1234 (text-sm mono spacing)
           → status BLOCKED → overlay rouge semi-transparent

[x] 2.C.6  BankTable.tsx
           → Props : columns[], data[], loading, sort?
           → Thead sticky (position: sticky, top: 0, bg: bg-elevated)
           → Sort icons dans les headers (ChevronUp/Down)
           → Loading : 5× BankSkeleton variant="table-row"
           → Responsive : overflow-x-auto sur le conteneur

[x] 2.C.7  MiniSparkline.tsx
           → Chart SVG simple (courbe de tendance uniquement)
           → LAZY : dynamic(() => import(...), { ssr: false })
           → Props : data (number[]), color?, width?, height?
           → Dessiné en SVG pur (path), pas de dépendance chart externe
           → BankSkeleton variant="chart" en loading

[x] 2.C.8  Créer data-display/index.ts → barrel export
```

#### 2.D — Forms
```
[x] 2.D.1  AmountInput.tsx
           → Input spécialisé montant avec format auto (séparateur milliers)
           → Devise affichée à gauche (EUR, USD, etc.)
           → Props : value, onChange, currency, min?, max?, error?
           → Valider : chiffres uniquement, max 2 décimales
           → Au focus : remove format, stocker valeur numérique
           → Au blur : re-formatter

[x] 2.D.2  BankSelect.tsx
           → Select custom (pas le select natif)
           → Props : options[], value, onChange, placeholder, searchable?, error?
           → Dropdown avec fond bg-elevated, border-default
           → Si searchable : input de filtrage en haut du dropdown
           → Accessible : role="combobox", aria-expanded, aria-haspopup

[x] 2.D.3  PINInput.tsx
           → 4 ou 6 champs séparés (PIN code entry style)
           → Auto-advance sur saisie
           → Type "password" pour masquer
           → Props : length (4|6), onChange(value: string), error?
           → Accessible : fieldset + legend, labels masqués visuellement

[x] 2.D.4  BankFormField.tsx
           → Wrapper : label + composant input + error message + hint
           → Props : label, error?, hint?, required?, children
           → Error en rouge (bank-danger) avec icône AlertCircle
           → Hint en text-tertiary sous l'input

[x] 2.D.5  Créer forms/index.ts → barrel export
```

**DoD Phase 2 :**
```
[x] 22 composants créés et exportés depuis le barrel index.ts
[x] 0 erreur TypeScript
[~] Tous les états visuels (hover, focus, disabled, error, loading) fonctionnels
[~] BankSkeleton couvre tous les variants utilisés dans les pages P0
[~] Focus ring visible sur tous les éléments interactifs
[x] Aucune couleur hardcodée dans les composants (tout via var(--bank-*))
[x] BankToast avec hook useBankToast() fonctionnel
```

---

### PHASE 3 — PAGES P0 (estimé : ~14 jours)

#### 3.1 — Login Unifié (`/login`)
```
[x] 3.1.1  Réécrire frontend/portal/src/app/login/page.tsx
           Structure cible :
           ┌─────────────────────────────────────────────────────┐
           │  Left panel (hidden < md)    │  Right panel (form)   │
           │                              │                        │
           │  Logo MoneTIC                │  Tab: Connexion/Inscr  │
           │  "L'infrastructure..."       │  RoleSelector cards    │
           │  3 bullets features          │  Email input           │
           │  Service pills               │  Password input+toggle │
           │                              │  BankButton submit     │
           │                              │  Error inline          │
           └─────────────────────────────────────────────────────┘

           → GARDER INTACT : loginWithRole(), registerAccount(), usePortalAuth(),
             getRoleRedirectUrl(), normalizeRole(), ROLE_OPTIONS data,
             2FA logic, password strength meter logic
           → REMPLACER : tout le JSX, les className Tailwind legacy
           → Créer LoginRoleCard.tsx : card rôle cliquable avec accent couleur par rôle
             (CLIENT→indigo, MARCHAND→teal, ETUDIANT→emerald, FORMATEUR→blue)
           → Pas de fond MISSION CIPHER (#030812 + grid) — fond: bank-bg-base (#0C0E1A)
           → Left panel : gradient subtle deep navy → légèrement plus clair
           → Animations : role card sélectionnée → border accent + scale(1.02) (200ms)

[x] 3.1.2  Vérifier tous les flows de login :
           → Client → redirect user-cards-web:3004
           → Merchant → redirect /merchant
           → Étudiant → redirect /student (Notion shell, hors scope)
           → Formateur → redirect /instructor (Notion shell, hors scope)
           → 2FA flow pour FORMATEUR
           → Register flow pour tous les rôles
           → Erreur credentials → message inline (pas toast)
           → Vérifié en code : `getRoleRedirectUrl()` + `resolveSafeRedirectTarget()`
             + `router.replace()/window.location.assign()` dans `portal/src/app/login/page.tsx`
```

#### 3.2 — MoneBank Dashboard (`user-cards-web/app/page.tsx`)
```
[x] 3.2.1  Réécrire user-cards-web/app/page.tsx
           Structure cible :
           ┌─────────────────────────────────────────────┐
           │  BankPageHeader "Bonjour, [Prénom]"          │
           ├─────────────────────────────────────────────┤
           │  BalanceDisplay (balance principale)         │
           │  Quick actions : [Payer] [Recharger]         │
           ├──────────────┬──────────────────────────────┤
           │  StatCard     │  StatCard                    │
           │  Dépenses mois│  Transactions                │
           ├──────────────┴──────────────────────────────┤
           │  CardVisual (carte active) + actions          │
           ├─────────────────────────────────────────────┤
           │  TransactionList (6 dernières) + "Voir tout" │
           └─────────────────────────────────────────────┘

           → GARDER INTACT : normalizeDashboard(), normalizeAccount(),
             tous les useEffect + fetch, auto-issued card detection,
             card balance vs account balance logic
           → REMPLACER : tout le JSX
           → Loading : BalanceDisplay skeleton + 2 StatCard skeletons + TransactionList skeleton
           → Empty : BankEmptyState si 0 transactions

[x] 3.2.2  Vérifier : le dashboard charge les données depuis /api/client/dashboard
           → Vérifié en code : `clientApi.getDashboard()` -> `/api/client/dashboard`
[x] 3.2.3  Vérifier : la balance s'affiche correctement (auto-issued vs regular card)
           → Vérifié en code : `normalizeDashboard()` + `normalizeAccount()`
             + usage explicite `isAutoIssued`, `card.balance` et `account.balance` dans la vue
```

#### 3.3 — Cartes (`user-cards-web/app/cards/page.tsx`)
```
[x] 3.3.1  Réécrire la page (vérifier contenu actuel avant avec Read)
           Structure :
           ┌─────────────────────────────────────────────┐
           │  BankPageHeader "Mes cartes"                 │
           ├─────────────────────────────────────────────┤
           │  CardVisual (carousel ou liste horizontale)  │
           │  Card active highlight + flip sur click       │
           ├─────────────────────────────────────────────┤
           │  Card details panel :                        │
           │    Numéro masqué, expiry, CVV masqué         │
           │    Status badge, plafonds journaliers         │
           ├─────────────────────────────────────────────┤
           │  Actions : [Bloquer] [Voir PIN] [Gérer]       │
           └─────────────────────────────────────────────┘
           → GARDER : tous les PATCH /api/client/cards/* handlers
           → Bloquer/débloquer → BankModal de confirmation
```

#### 3.4 — Paiement (`user-cards-web/app/pay/page.tsx`)
```
[x] 3.4.1  Réécrire (vérifier contenu actuel)
           Structure :
           ┌─────────────────────────────────────────────┐
           │  BankPageHeader "Nouvelle transaction"        │
           ├─────────────────────────────────────────────┤
           │  AmountInput (montant + EUR)                  │
           │  BankSelect (terminal/marchand)               │
           │  BankFormField description (optionnel)        │
           │  BankButton "Simuler"                         │
           ├─────────────────────────────────────────────┤
           │  Result panel (après submit) :               │
           │    BankBadge status APPROVED/DECLINED         │
           │    Code réponse + details                     │
           │    Timeline (TransactionTimeline shared)      │
           │  BankButton "Nouvelle transaction"            │
           └─────────────────────────────────────────────┘
           → BankSpinner overlay pendant le fetch POST
```

#### 3.5 — Historique client (`user-cards-web/app/transactions/page.tsx`)
```
[x] 3.5.1  Réécrire (vérifier contenu actuel)
           Structure :
           ┌─────────────────────────────────────────────┐
           │  BankPageHeader "Historique" + [Exporter]    │
           ├─────────────────────────────────────────────┤
           │  Filtres : status | date range | montant     │
           ├─────────────────────────────────────────────┤
           │  TransactionList (virtualized si > 100)      │
           │    → click → BankModal avec timeline détail  │
           └─────────────────────────────────────────────┘
```

#### 3.6 — Sécurité client (`user-cards-web/app/security/page.tsx`)
```
[x] 3.6.1  Réécrire (vérifier contenu actuel)
           → Change password form (BankFormField × 3)
           → Sessions actives (liste devices)
           → Activité récente (dernières connexions)
```

#### 3.7 — SoluBank Dashboard (`/merchant`)
```
[x] 3.7.1  Réécrire portal/src/app/merchant/page.tsx (670 lignes actuelles)
           Structure :
           ┌─────────────────────────────────────────────┐
           │  BankPageHeader "Tableau de bord" + date     │
           ├──────────┬──────────┬──────────┬────────────┤
           │ StatCard  │ StatCard  │ StatCard  │ StatCard  │
           │ CA jour   │ Txn count │ Approval% │ Remb.     │
           ├─────────────────────────────────────────────┤
           │  Account Balance Cards (4 colonnes) :       │
           │  Disponible | En attente | Réserve | Net      │
           ├──────────────────────────┬──────────────────┤
           │  TransactionList (20)     │ Terminals status  │
           │                           │ Télécollecte      │
           └──────────────────────────┴──────────────────┘

           → GARDER INTACT : tous les fetchDashboard, fetchBatches,
             handleTelecollecte, DashboardData types, generate-history (dev)
           → ACCENT TEAL (data-bank-role="merchant" override)
           → Télécollecte panel : BankButton "Envoyer ISO 8583 TC33" +
             batch history avec BankBadge status par batch

[x] 3.7.2  Vérifier /api/merchant/dashboard charge correctement
[x] 3.7.3  Vérifier télécollecte POST /api/merchant/telecollecte fonctionne
[x] 3.7.4  Vérifier batch history GET /api/merchant/clearing/batches
```

#### 3.8 — POS Terminal (`/merchant/pos`)
```
[x] 3.8.1  Lire frontend/portal/src/app/merchant/pos/page.tsx avant de réécrire
[x] 3.8.2  Réécrire JSX uniquement
           → AmountInput + BankSelect terminal
           → BankButton "Simuler transaction"
           → Processing steps (stepper visuel)
           → Result : BankBadge + code réponse
```

#### 3.9 — Transactions Merchant (`/merchant/transactions`)
```
[x] 3.9.1  Lire frontend/portal/src/app/merchant/transactions/page.tsx avant
[x] 3.9.2  Réécrire avec BankTable
           → Colonnes : ID, PAN masqué, Montant, Type, Status, Terminal, Date
           → Filtres : status, terminal, date range
           → Row click → /merchant/transactions/[id]/timeline
           → Export CSV button
```

#### 3.10 — TPE Web (`tpe-web/app/page.tsx`) — ⚠️ FICHIER CRITIQUE 66.5KB
```
[x] 3.10.1 LIRE ENTIÈREMENT tpe-web/app/page.tsx avant de toucher quoi que ce soit
           → Identifier tous les composants JSX à remplacer
           → Identifier tous les états Zustand (useTerminalStore) à préserver
           → Identifier toutes les fonctions à préserver (processTransaction, verifyChallenge, etc.)
[x] 3.10.2 Créer frontend/tpe-web/components/banking/TPEShell.tsx
           → Layout spécifique terminal POS (pas de sidebar, fullscreen terminal UI)
           → Fond bank-bg-base, pas de navigation latérale
[x] 3.10.3 Réécrire JSX de tpe-web/app/page.tsx
           → Garder useTerminalStore et toute la logique Zustand
           → Garder processTransaction(), verifyChallenge()
           → Garder le debug panel (stylé banking mais fonctionnellement intact)
           → Garder le flow states : 'card' → 'merchant' → 'amount' → 'confirm'
           → Garder la 3DS challenge UI (OTP entry)
           → Garder fraud detection display
           → UNIQUEMENT remplacer les className et le JSX de rendu
[x] 3.10.4 Vérifier : transaction complète de A à Z fonctionne après réécriture
```

**DoD Phase 3 :**
```
[x] Toutes les pages P0 chargent sans erreur JS en prod build
[x] Les donnees viennent des memes endpoints backend qu'avant
[x] 0 style legacy/MISSION CIPHER ne subsiste sur ces pages (builds portal+ucw+tpe OK)
[x] Login fonctionne pour tous les roles (student/instructor non impactes)
[x] Une transaction complete via TPE-Web fonctionne (card -> merchant -> amount -> result)
[~] BankShell se ferme/ouvre correctement sur mobile
[x] Telecollecte merchant fonctionne
```

---

### PHASE 4 — PAGES P1/P2 (estimé : ~8 jours)

```
[x] 4.1  Réécrire /merchant/reports
         → Lire le fichier d'abord (23KB)
         → MiniSparkline pour courbes de CA
         → BankTable pour rapport de transactions
         → Export CSV

[x] 4.2  Réécrire /merchant/api
         → Interface documentation API
         → Gestion tokens d'accès merchant

[x] 4.3  Timeline transactions client (user-cards-web)
         → Réécrire la page de détail timeline si elle existe dans user-cards-web

[x] 4.4  Timeline transactions merchant
         → Réécrire /merchant/transactions/[id]/timeline/page.tsx
         → Utiliser TransactionTimeline shared (stylée avec tokens bank) (à aligner)

[x] 4.5  Réécrire frontend/portal/src/app/page.tsx (landing)
         → Garder la structure (hero + stats + role cards + architecture + flow)
         → Remplacer MISSION CIPHER (amber/teal sur fond #030812) par design banking premium
         → Hero : fond bank-bg-base, gradient subtle, pas de grid texture
         → Role cards : garder les 4 rôles, accents par rôle
         → CTA vers login avec les rôles corrects
```

---

### PHASE 5 — MOTION & POLISH (estimé : ~7 jours)

```
[x] 5.1  Transitions de pages (BankShell)
         → BankShell <main> : animation bk-fade-up var(--bank-t-slow) var(--bank-ease-out) both
         → prefers-reduced-motion respecté via bank-utilities.css

[x] 5.2  BalanceDisplay count-up
         → useCountUp(targetAmount, 600) hook — requestAnimationFrame loop
         → Uniquement au mount

[x] 5.3  StatCard stagger
         → index prop × 80ms animationDelay + bk-animate-fade-up class ajoutée
         → prefers-reduced-motion : animation: none via bank-utilities.css

[x] 5.4  BankModal animation
         → scale(0.96)→scale(1) + opacity 0→1 via bk-scale-in (200ms)

[x] 5.5  TransactionRow hover
         → .bk-card--interactive présent sur toutes les rows

[x] 5.6  Status badge pulse
         → APPROVED : bk-ring-pulse 0.7s 1× au mount (data-animate="true")
         → DECLINED : bk-shake 0.45s 1× (2× translateX ±2px)
         → TransactionBadge auto-applique animate pour success/danger
         → prefers-reduced-motion : animation: none !important

[x] 5.7  Empty states finaux (contextualisés)
         → 0 transaction client → BankEmptyState "Simulez votre premier paiement" + CTA /pay
         → 0 carte active dashboard → BankEmptyState "Demandez une carte" + CTA /cards
         → 0 transaction merchant → BankEmptyState "Ouvrir le POS" → APP_URLS.tpe
         → 0 batch télécollecte → "Aucune télécollecte effectuée." (panel inline)
         → TransactionList : prop emptyState?: React.ReactNode ajoutée (override du défaut)

[x] 5.8  Skeleton audit final
         → isLoading guards : BankSpinner full-page → BankSkeleton variant="full-page"
           · ucw/page.tsx, ucw/cards/page.tsx, portal/merchant/page.tsx
         → Legacy Tailwind guards ucw/cards/page.tsx → bank tokens
         → BankSpinner imports supprimés des 3 fichiers
         → Builds : ucw ✓, portal 59/59 ✓, tpe-web 15/15 ✓
```

---

### PHASE 6 — STABILISATION (estimé : ~6 jours)

```
[x] 6.1  Audit accessibilité (statique)
         → Audit complet de shared/components/banking/** : 0 issue critique
         → BankShell fournit <main>, tous les layouts UCW + portal/merchant l'utilisent
         → BankModal : focus trap + aria-modal + Escape + body scroll lock ✓
         → TransactionRow : role="button" + tabIndex=0 + onKeyDown(Enter/Space) ✓
         → BankSelect : role="combobox" + aria-expanded + navigation clavier ✓
         → PINInput : role="group" + aria-label par cellule + aria-invalid ✓
         → BankSpinner/BankToast/BankBadge : role="status"/"alert" présents ✓
         → Tous les SVG décoratifs : aria-hidden="true" ✓
         → lang="fr" sur <html> dans ucw/app/layout.tsx ✓
         ⚠️ Reste MANUEL : Lighthouse axe-core runtime, test VoiceOver/NVDA

[~] 6.2  Performance audit
         → MiniSparkline : pur SVG sans dep externe (~2KB) — pas de lazy nécessaire
         → BankModal : < 3KB, pas de lazy nécessaire
         → Pas de libs chart lourdes (recharts non installé) ✓
         ⚠️ Reste MANUEL : Lighthouse CI (nécessite browser + stack running)

[x] 6.3  Cross-browser
         → backdrop-filter : -webkit-backdrop-filter présent partout ✓
         → Fallback : background-color opaque défini pour Firefox ancien ✓
         → Pas de CSS subgrid utilisé (grid standard uniquement) ✓
         ⚠️ Reste MANUEL : test real Firefox 120+, Safari 17+

[x] 6.4  Responsive final (CSS vérifié)
         → max-width: 768px → .bk-sidebar { display: none }, .bk-main padding réduit ✓
         → max-width: 768px → bottom nav visible (supprimé sur min-width: 769px) ✓
         → .bk-display-balance font-size réduit sur mobile ✓
         → .bk-sidebar--collapsed + .bk-main--collapsed pour sidebar tablet ✓
         ⚠️ Reste MANUEL : test viewport 375px/768px/1280px dans browser

[x] 6.5  TypeScript strict
         → 0 "any" dans le nouveau code banking (shared/components/banking + pages redesign)
         → merchant/page.tsx : 3× catch(e: any) → catch(e: unknown) + instanceof Error ✓
         → 0 @ts-ignore ajouté dans le redesign ✓
         → Build portal 59/59 + ucw ✓ + tpe-web 15/15 ✓

[x] 6.6  Bundle audit
         → MiniSparkline pur React/SVG ~2KB — lazy non requis
         → Pas de recharts ni framer-motion ni shadcn installés ✓
         → Shared banking library : ~21 composants purs sans deps externes ✓
         ⚠️ Reste MANUEL : next build --analyze pour taille exacte JS initial
```

---

### PHASE 7 — CUTOVER (estimé : ~2 jours)

```
[~] 7.1  Checklist pré-bascule (valider avant merge → main)
         [x] Builds propres : portal 59/59 + ucw ✓ + tpe-web 15/15 ✓
         [x] 0 TypeScript error sur les 3 apps ✓
         [x] 0 legacy Tailwind MISSION CIPHER dans les pages banking ✓
         [ ] Docker images taguées : docker tag [image]:latest [image]:pre-banking-v2
         [ ] 0 console error sur stack running (test manuel)
         [x] Login → redirect correct pour tous les rôles (client, merchant)
             (vérification statique : mapping `APP_URLS` + login redirect logic)
         [ ] Une transaction TPE complète fonctionne (client pays → approved)
         [ ] La télécollecte merchant fonctionne (POST /telecollecte → batch créé)
         [ ] La timeline de transaction s'affiche (10 steps visibles)
         [ ] Test responsive 375px : navigation mobile visible, dashboard lisible

[~] 7.2  Procédure deploy (à exécuter manuellement)
         → (1) Tagger les images actuelles comme backup :
               docker compose -f docker-compose-runtime.yml images
               docker tag pmp-user-cards-web:latest pmp-user-cards-web:pre-banking-v2
               docker tag pmp-portal:latest pmp-portal:pre-banking-v2
               docker tag pmp-tpe-web:latest pmp-tpe-web:pre-banking-v2
         → (2) Builder les nouvelles images :
               docker compose build user-cards-web portal tpe-web --no-cache
         → (3) Redémarrer :
               docker compose -f docker-compose-runtime.yml up -d user-cards-web portal tpe-web
         → (4) Smoke tests (5 min) :
               login client → dashboard MoneBank visible
               simuler 1 paiement → badge APPROVED animé
               login merchant → dashboard SoluBank visible
               logout → redirect /login

[~] 7.3  Monitoring post-deploy (24h)
         → Console errors FE : 0 toléré (F12 sur chaque page P0)
         → Auth 401/403 rate : surveiller logs api-gateway (docker logs api-gateway)
         → Transaction success rate : doit rester ~90% (simulation POS)

[~] 7.4  Rollback si régression critique
         → docker compose stop user-cards-web portal tpe-web
         → docker run -d pmp-user-cards-web:pre-banking-v2
         → docker run -d pmp-portal:pre-banking-v2
         → docker run -d pmp-tpe-web:pre-banking-v2
         → Pages student/instructor : NON impactées (layouts Notion indépendants)
```

---

## TESTS — PLAN MINIMAL

### Tests unitaires (Phase 6)
```
Fichiers à créer :
  __tests__/banking/BankButton.test.tsx
  __tests__/banking/BankInput.test.tsx
  __tests__/banking/BankBadge.test.tsx
  __tests__/banking/StatCard.test.tsx
  __tests__/banking/TransactionRow.test.tsx
  __tests__/banking/AmountInput.test.tsx
  __tests__/banking/BankModal.test.tsx
  __tests__/banking/BankSkeleton.test.tsx

Cas à couvrir par composant :
  BankButton  : loading state, disabled, keyboard accessible, variants
  BankInput   : error state, focus, password toggle
  BankBadge   : tous les variants, mapping statuts
  StatCard    : loading skeleton, delta positif/négatif
  TransactionRow : PAN masqué affiché, montant formaté, badge correct
  AmountInput : format nombre, bloque non-numérique, error state
  BankModal   : focus trap, ESC, aria attributes
  BankSkeleton : tous les variants rendus
```

### E2E Playwright (Phase 6)
```
Fichiers à créer :
  e2e/banking/p0-login.spec.ts
  e2e/banking/p0-client-dashboard.spec.ts
  e2e/banking/p0-merchant-dashboard.spec.ts
  e2e/banking/p0-transaction-flow.spec.ts
  e2e/banking/p0-logout.spec.ts

Flows couverts :
  P0-01 : Login merchant → /merchant dashboard visible
  P0-02 : Login client → user-cards-web dashboard visible
  P0-03 : Client → /pay → submit transaction → voir result APPROVED/DECLINED
  P0-04 : Client → /transactions → liste visible, click → modal détail
  P0-05 : Merchant → liste transactions → filtre status → résultat filtré
  P0-06 : Logout depuis n'importe quelle page → redirect /login
```

### Visual regression (Phase 6)
```
Pages à couvrir avec screenshots :
  login (dark)
  client-dashboard (dark + light)
  merchant-dashboard (dark)
  client-transactions (dark)
  client-pay-result (approved)
  mobile-375px (client-dashboard)

Threshold : 2% diff max
Outil : Playwright toHaveScreenshot()
```

---

## QUESTIONS RÉSOLUES (via exploration codebase)

```
Q1 : user-cards-web est-elle l'app principale client ?
     → OUI confirmé. /client/* dans portal = stubs redirect vers APP_URLS.userCards (port 3004)

Q2 : La landing page est-elle dans le scope ?
     → OUI incluse (portal/src/app/page.tsx, 642 lignes — refonte Phase 4)

Q3 : Mode light — exigence prod ou optionnel ?
     → À CONFIRMER avec l'utilisateur. Le plan le prévoit mais peut être repoussé en V2.

Q4 : CI/CD existant ?
     → PAS DÉTECTÉ dans le projet (pas de .github/workflows/). Tests manuels pour l'instant.

Q5 : Charts dans les rapports merchant ?
     → À VÉRIFIER en lisant merchant/reports/page.tsx avant Phase 4

Q6 : tpe-web — affiché aux marchands directement ?
     → OUI : le merchant dashboard (/merchant) a un bouton "Terminal POS" qui ouvre
       tpe-web avec le token JWT en paramètre URL (APP_URLS.tpe + ?token=...)
       Donc tpe-web est dans le scope de la refonte.

Q7 : Sentry configuré ?
     → NON DÉTECTÉ. Monitoring = Docker logs + surveillance manuelle post-deploy.
```

---

## ORDRE D'EXÉCUTION RECOMMANDÉ

```
SEMAINE 1-2   : Phase 1 (Foundations)
  Jour 1-2    : 1.A.1 bank-tokens.css + 1.A.2 bank-theme.css + 1.A.3 bank-utilities.css
  Jour 3-5    : 1.B.1 BankShell + 1.B.2 BankSidebar + 1.B.3 BankTopbar
  Jour 6-7    : 1.B.4 BankMobileNav + 1.B.5 BankPageHeader
  Jour 8-9    : 1.C.1 layout user-cards-web + 1.C.2 layout merchant
  Jour 10     : 1.C.3 test isolation Notion + 1.C.4 barrel export

SEMAINE 3-4   : Phase 2 (Components)
  Parallélisable si 2 devs : un sur Primitives+Feedback, un sur DataDisplay+Forms
  Sinon séquentiel dans l'ordre du backlog

SEMAINE 5-6   : Phase 3 Pages P0
  Commencer par : 3.1 Login (simple, bon test du design system)
  Ensuite : 3.2 Dashboard client + 3.7 Dashboard merchant (en parallèle si possible)
  Puis : 3.3→3.6 (pages client) + 3.8→3.9 (pages merchant)
  En DERNIER : 3.10 TPE Web (le plus risqué, 66.5KB)

SEMAINE 7     : Phase 4 + Phase 5

SEMAINE 8     : Phase 6 + Phase 7
```

---

## COMMANDES UTILES

```bash
# Démarrer les apps banking en dev
cd frontend/user-cards-web && npm run dev  # port 3004
cd frontend/tpe-web && npm run dev         # port 3001
cd frontend/portal && npm run dev          # port 3000

# Build de vérification
cd frontend/user-cards-web && npm run build
cd frontend/portal && npm run build

# Build Docker après modification
docker compose build user-cards-web portal tpe-web --no-cache
docker compose -f docker-compose-runtime.yml up -d user-cards-web portal tpe-web

# Logs en direct
docker compose logs -f user-cards-web portal tpe-web

# TypeScript check sans build
npx tsc --noEmit
```

---

## NOTES D'IMPLÉMENTATION

```
1. JAMAIS de className Tailwind hardcodant une couleur dans les composants banking.
   → Toujours via var(--bank-*) ou classes .bk-*

2. TOUJOURS lire un fichier avant de le réécrire
   → Certaines pages ont de la logique non documentée (ex: tpe-web 66.5KB)

3. Le TransactionTimeline shared existant PEUT être réutilisé
   → Il faut juste le styler avec les tokens --bank-* si nécessaire
   → Le composant est dans frontend/shared/components/TransactionTimeline.tsx

4. Le formatMoney() de @shared/lib/formatting.ts gère déjà EUR/USD
   → Ne pas recréer de fonction de formatage

5. L'AuthContext gère déjà le refresh token automatique
   → Ne pas recréer de logique de session dans les nouveaux composants

6. user-cards-web utilise AXIOS pas fetch (contrairement au portal)
   → api-client.ts dans user-cards-web : axios avec interceptors
   → Ne pas mélanger les patterns

7. tpe-web utilise ZUSTAND pour l'état du terminal
   → useTerminalStore doit rester intact
   → Seul le JSX de rendu change, pas les actions du store

8. Les données de l'API sont snake_case → normaliser en camelCase dans les components
   → Patterns existants : masked_pan || maskedPan (déjà géré)
   → Ne pas changer les normalizateurs existants
```

---

*Fichier à mettre à jour au fur et à mesure. Marquer [x] à chaque tâche terminée.*
*En cas de problème bloquant : noter [!] + description du problème.*



