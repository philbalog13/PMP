# 🏗️ Architecture Frontend - PMP Platform

**Document de référence technique**
**Dernière mise à jour**: 2026-01-31

---

## 📊 Vue d'Ensemble

La plateforme PMP utilise une architecture **multi-applications** avec **authentification unifiée** et **navigation cross-app**.

```
┌─────────────────────────────────────────────────────────────┐
│                    PMP Platform Frontend                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Portal   │  │ TPE-Web  │  │User-Cards│  │ HSM-Web  │   │
│  │ (Hub)    │  │ (POS)    │  │ (Cartes) │  │ (Crypto) │   │
│  │ :3001    │  │ :3000    │  │ :3006    │  │ :3081    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │               │             │          │
│       └─────────────┴───────────────┴─────────────┘          │
│                         │                                     │
│                  ┌──────▼──────┐                             │
│                  │  Shared Lib │                             │
│                  │  Context    │                             │
│                  │  Components │                             │
│                  └─────────────┘                             │
│                                                              │
│  ┌──────────────┐  ┌────────────────┐                      │
│  │ 3DS Challenge│  │   Monitoring   │                      │
│  │ (Vite+React) │  │   Dashboard    │                      │
│  │ :3088        │  │   (Vite+React) │                      │
│  └──────────────┘  │   :3082        │                      │
│                     └────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Applications Frontend

### 1. Portal (Next.js 16.1.6) - Port 3001
**Rôle**: Hub central multi-rôles

**Routes par rôle**:
- `/demo` → CLIENT (démonstrations)
- `/analyze` → MARCHAND (analyse logs)
- `/student` → ÉTUDIANT (parcours pédagogique)
- `/instructor` → FORMATEUR (monitoring cohorte)

**Technologies**:
- Next.js App Router
- Tailwind CSS
- AuthContext (shared)
- Dark Neon Glassmorphism design

### 2. TPE-Web (Next.js 16.1.6) - Port 3000
**Rôle**: Terminal de paiement électronique

**Modes**:
- **Client**: Simulation simple
- **Marchand**: POS complet
- **Étudiant**: Mode pédagogique avec hints
- **Formateur**: Accès debug complet

**Features**:
- Transactions ISO 8583
- 3D Secure integration
- QR Code payments
- Debug console

### 3. User-Cards-Web (Next.js 16.1.6) - Port 3006
**Rôle**: Gestion de cartes virtuelles

**Accessible à**: CLIENT, ÉTUDIANT, FORMATEUR

**Features**:
- Création de cartes test
- Historique transactions
- Statistiques dépenses
- Dashboard premium

### 4. HSM-Web (Next.js 16.1.6) - Port 3081
**Rôle**: Simulateur Hardware Security Module

**Accessible à**: MARCHAND (certs only), ÉTUDIANT (labs), FORMATEUR (admin)

**Features**:
- Gestion de clés cryptographiques
- Opérations PIN/MAC
- Certificats SSL/TLS
- Détecteur de vulnérabilités

### 5. 3DS Challenge UI (Vite + React 18) - Port 3088
**Rôle**: Page OTP d'authentification 3D Secure

**Intégration**:
- Popup depuis TPE-Web
- Authentification ACS
- Challenge/Response flow

### 6. Monitoring Dashboard (Vite + React 18) - Port 3082
**Rôle**: Dashboard de supervision temps réel

**Accessible à**: Tous rôles (permissions différentes)

**Features**:
- Logs live (WebSocket)
- Graphiques D3.js
- Filtrage avancé
- Export CSV/JSON

---

## 🔐 Système d'Authentification

### Architecture

```
┌───────────────────────────────────────────────────────────┐
│                  AuthContext Provider                      │
│  Location: frontend/shared/context/AuthContext.tsx        │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  State: {                                                  │
│    user: User | null                                       │
│    token: string | null                                    │
│    isAuthenticated: boolean                                │
│    isLoading: boolean                                      │
│  }                                                         │
│                                                            │
│  Methods:                                                  │
│  - login(token, user)                                      │
│  - logout()                                                │
│  - hasRole(role)                                           │
│  - hasPermission(permission)                               │
│                                                            │
└───────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
    │ Portal  │    │TPE-Web  │    │Cards-Web│
    │ Wrapped │    │ Wrapped │    │ Wrapped │
    └─────────┘    └─────────┘    └─────────┘
```

### Middleware de Protection

**Fichier**: `frontend/shared/middleware/roleGuard.ts`

**Fonction**: `createRoleGuard(appName)`

**Exemple d'utilisation** (Portal):
```typescript
// frontend/portal/src/middleware.ts
import { createRoleGuard } from '../../shared/middleware/roleGuard';

export const middleware = createRoleGuard('portal');

export const config = {
    matcher: ['/demo/:path*', '/analyze/:path*', '/student/:path*', '/instructor/:path*']
};
```

**Configuration des routes**:
```typescript
const ROUTE_CONFIGS = {
    portal: [
        { path: '/demo', allowedRoles: [UserRole.CLIENT] },
        { path: '/student', allowedRoles: [UserRole.ETUDIANT] },
        // ...
    ],
    'tpe-web': [
        { path: '/', allowedRoles: [ALL_ROLES] }
    ],
    'hsm-web': [
        {
            path: '/',
            allowedRoles: [UserRole.MARCHAND, UserRole.ETUDIANT, UserRole.FORMATEUR],
            requiredPermissions: [Permission.MANAGE_POS, Permission.ACCESS_LAB, Permission.FULL_ACCESS]
        }
    ]
};
```

---

## 🧩 Bibliothèque Partagée

### Structure

```
frontend/shared/
├── components/
│   ├── GlassCard.tsx          # Composant card glassmorphism
│   ├── PremiumButton.tsx      # Bouton avec variants
│   ├── UnifiedSidebar.tsx     # Navigation role-based
│   └── Breadcrumb.tsx         # Fil d'Ariane
├── context/
│   └── AuthContext.tsx        # Context React auth global
├── hooks/
│   ├── useNavigation.ts       # Hook navigation + breadcrumbs
│   └── useModuleProgress.ts   # Hook progression étudiant (TODO)
├── lib/
│   ├── utils.ts               # Fonction cn() + helpers
│   ├── formatting.ts          # formatAmount, maskPAN, etc.
│   └── validation.ts          # validateLuhn, validateCVV, etc.
├── middleware/
│   └── roleGuard.ts           # Middleware Next.js protection
├── types/
│   └── user.ts                # UserRole, Permission, AuthState
└── styles/
    └── typography.css         # Système typographique (TODO)
```

### Composants Clés

#### GlassCard
```tsx
import GlassCard from '@/shared/components/GlassCard';

<GlassCard
    variant="interactive"
    glowColor="blue"
    className="p-6"
>
    Content
</GlassCard>
```

**Props**:
- `variant`: `default` | `interactive` | `highlight`
- `glowColor`: `blue` | `purple` | `green` | `red` | `none`

#### UnifiedSidebar
```tsx
import UnifiedSidebar from '@/shared/components/UnifiedSidebar';

// Dans layout.tsx
<AuthProvider>
    <UnifiedSidebar />
    <main>{children}</main>
</AuthProvider>
```

**Features**:
- Menu adapté au rôle utilisateur
- User profile badge
- Navigation cross-app
- Logout global

#### Breadcrumb
```tsx
import Breadcrumb from '@/shared/components/Breadcrumb';
import { useNavigation } from '@/shared/hooks/useNavigation';

const { breadcrumbs } = useNavigation();

<Breadcrumb items={breadcrumbs} />
```

---

## 🎨 Design System

### Dark Neon Glassmorphism

**Variables CSS**:
```css
:root {
    --bg-deep: #020617;        /* slate-950 */
    --bg-surface: #0f172a;     /* slate-900 */
    --bg-elevated: #1e293b;    /* slate-800 */

    --text-primary: #f1f5f9;   /* slate-100 */
    --text-secondary: #94a3b8; /* slate-400 */
    --text-muted: #64748b;     /* slate-500 */

    --primary-500: #3b82f6;    /* blue-500 */
    --primary-600: #2563eb;    /* blue-600 */

    --border-color: rgba(255, 255, 255, 0.1);

    --glow-blue: rgba(59, 130, 246, 0.2);
    --glow-purple: rgba(139, 92, 246, 0.2);
}
```

**Effets Glassmorphism**:
```css
.glass-card {
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1.5rem;
}

.glass-card-glow {
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.1);
}
```

### Typography

**Fonts**:
- Heading: `Outfit` (sans-serif, bold)
- Body: `Inter` (sans-serif)
- Mono: `JetBrains Mono` (code/data)

**Hiérarchie**:
```css
h1: 3.75rem (60px), font-weight: 900
h2: 3rem (48px), font-weight: 800
h3: 2.25rem (36px), font-weight: 700
h4: 1.875rem (30px), font-weight: 600
```

---

## 🔄 Navigation Cross-App

### Deep Linking

**Format**:
```
http://localhost:3000?role=etudiant&module=5&exercise=3ds
```

**Paramètres de contexte**:
- `role`: CLIENT | MARCHAND | ETUDIANT | FORMATEUR
- `module`: ID du module pédagogique
- `exercise`: ID de l'exercice
- `demo`: ID de la démo (pour client)
- `lab`: ID du lab (pour HSM)
- `action`: Action à effectuer (ex: create-test-card)

**Hook useNavigation**:
```typescript
import { useNavigation } from '@/shared/hooks/useNavigation';

const { context, navigateWithContext, getReturnUrl } = useNavigation();

// Lire contexte
console.log(context.role); // 'etudiant'
console.log(context.module); // '5'

// Naviguer avec contexte
navigateWithContext('http://localhost:3081', { lab: 'pin-validation' });

// URL de retour
const returnUrl = getReturnUrl('http://localhost:3001/student', 'Exercice complété ✅');
```

### Sidebar Navigation

Menu adapté par rôle:

**ÉTUDIANT**:
```
🏠 Accueil → Portal/student
📚 Parcours → Portal/student
🧪 Lab TPE → TPE-Web
💳 Cartes Test → User-Cards-Web
🔐 Lab Crypto → HSM-Web
📊 Monitoring → Dashboard (read-only)
🏆 Badges → Portal/badges
⚙️ Profil → Portal/profile
```

**FORMATEUR**:
```
🏠 Hub → Portal/instructor
👥 Suivi Étudiants → Portal/instructor/students
📝 Exercices → Portal/instructor/exercises
🎛️ Contrôle Lab → Portal/instructor/lab-control
💻 TPE (Admin) → TPE-Web
💳 Cards (Admin) → User-Cards-Web
🔐 HSM (Admin) → HSM-Web
📊 Monitoring → Dashboard (full access)
🛠️ Config → Portal/system-config
```

---

## 🧪 Parcours Pédagogique (Étudiant)

### Flow Module Complet

```
1. DASHBOARD (Portal/student)
   ↓
   [Clic "→ Continuer l'exercice"]
   ↓
2. EXERCICE PRATIQUE (TPE-Web / HSM-Web / Cards-Web)
   - Mode pédagogique activé
   - Hints contextuels
   - Debug view visible
   ↓
   [Validation exercice]
   ↓
3. RETOUR PORTAL
   - Success message
   - Progression mise à jour
   ↓
   [Clic "📖 Lire la théorie"]
   ↓
4. PAGE THÉORIE (Portal/student/theory/[moduleId])
   - Contenu pédagogique
   - Sommaire interactif
   - Exemples de code
   ↓
   [Clic "✅ Passer le quiz"]
   ↓
5. QUIZ VALIDATION (Portal/student/quiz/[moduleId])
   - 5 questions
   - Sélection réponses
   - Navigation Précédent/Suivant
   ↓
   [Terminer le quiz]
   ↓
6. RÉSULTATS
   - Score en % (80% requis)
   - Correction détaillée
   - Explications
   ↓
   Si PASS (≥80%):
   - Badge débloqué
   - Module suivant accessible
   ↓
   Si FAIL (<80%):
   - Bouton "Réessayer"
   - Retour théorie recommandé
```

### APIs Exercices (TODO - Backend)

**POST /api/etudiant/exercises/complete**
```json
{
    "studentId": "student01",
    "moduleId": "05",
    "exerciseId": "3ds-flow",
    "score": 100,
    "timeSpent": 15 // minutes
}
```

**Response**:
```json
{
    "success": true,
    "moduleProgress": 75,
    "badgeUnlocked": "3DS Expert",
    "pointsEarned": 150
}
```

---

## 🎯 Parcours Formateur

### Dashboard Monitoring Live

**Page**: `Portal/instructor/students`

**WebSocket Connection** (TODO):
```typescript
const ws = new WebSocket('ws://localhost:8000/instructor/live');

ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    // { studentId, currentApp, module, elapsedTime, status }
    updateStudentSession(update);
};
```

**Features**:
- Vue temps réel des étudiants actifs
- Application courante
- Module en cours
- Temps écoulé
- Progression %

### Contrôle Lab

**Page**: `Portal/instructor/lab-control`

**API Injection** (TODO):
```typescript
POST /api/formateur/lab-conditions
{
    "latency": 150,         // ms
    "authFailureRate": 5,   // %
    "fraudInjection": true,
    "hsmLatency": 50,       // ms
    "networkErrors": false
}
```

**Effet**:
- Affecte TOUS les étudiants
- Conditions appliquées aux backend services
- Réinitialisation possible

---

## 📦 Build et Déploiement

### Scripts NPM

**Development**:
```bash
# Lancer Portal
npm run dev --workspace=portal

# Lancer TPE-Web
npm run dev --workspace=tpe-web

# Lancer tous les Next.js apps (root)
npm run dev:all
```

**Production**:
```bash
# Build Portal
npm run build --workspace=portal

# Build toutes les apps
npm run build:all

# Start production
npm run start --workspace=portal
```

### Docker

**Dockerfile** (exemple Portal):
```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
```

**docker-compose.yml**:
```yaml
services:
  portal:
    build: ./frontend/portal
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://api-gateway:8000
    depends_on:
      - api-gateway
```

---

## 🔍 Debugging

### DevTools

**React DevTools**:
- Inspect component hierarchy
- View AuthContext state
- Profile renders

**Next.js DevTools**:
- Server Components inspector
- Route segments
- Cache debugging

### Logging

**Console logging**:
```typescript
import { useAuth } from '@/shared/context/AuthContext';

const { user, token } = useAuth();

console.log('[Auth]', { user, tokenLength: token?.length });
```

**Network tab**:
- Vérifier appels API
- Inspecter headers (Authorization)
- Debugging CORS

### Common Issues

**1. "useAuth must be used within AuthProvider"**
```tsx
// ❌ Mauvais
export default function Page() {
    const { user } = useAuth();
}

// ✅ Bon
export default function RootLayout({ children }) {
    return (
        <AuthProvider>
            {children}
        </AuthProvider>
    );
}
```

**2. Middleware ne protège pas les routes**
```typescript
// Vérifier matcher config
export const config = {
    matcher: ['/student/:path*'] // ✅ Avec :path*
    // matcher: ['/student'] // ❌ Ne protège pas les sous-routes
};
```

**3. Deep linking perd le contexte**
```typescript
// ✅ Utiliser useNavigation hook
const { navigateWithContext } = useNavigation();
navigateWithContext('http://localhost:3000', { module: '5' });

// ❌ Navigation simple
window.location.href = 'http://localhost:3000'; // Perd contexte
```

---

## 📈 Performance

### Optimisations

**Code Splitting**:
```typescript
// Dynamic imports
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
    loading: () => <Spinner />
});
```

**Image Optimization** (Next.js):
```tsx
import Image from 'next/image';

<Image
    src="/logo.png"
    width={200}
    height={50}
    alt="Logo"
    priority // Pour images above-the-fold
/>
```

**Lazy Loading**:
```typescript
const MonitoringDashboard = lazy(() => import('./MonitoringDashboard'));

<Suspense fallback={<Loading />}>
    <MonitoringDashboard />
</Suspense>
```

### Métriques Cibles

- **FCP (First Contentful Paint)**: < 1.5s
- **LCP (Largest Contentful Paint)**: < 2.5s
- **TTI (Time to Interactive)**: < 3.5s
- **CLS (Cumulative Layout Shift)**: < 0.1

---

## 🧪 Tests

### Structure

```
test/
├── e2e/
│   ├── student-journey.spec.ts
│   ├── instructor-monitoring.spec.ts
│   ├── client-demo.spec.ts
│   └── merchant-logs.spec.ts
├── integration/
│   ├── auth-flow.test.ts
│   └── navigation.test.ts
└── unit/
    ├── components/
    │   ├── GlassCard.test.tsx
    │   ├── PremiumButton.test.tsx
    │   └── Breadcrumb.test.tsx
    └── utils/
        ├── validation.test.ts
        └── formatting.test.ts
```

### Commandes

```bash
# E2E tests (Playwright)
npx playwright test

# Unit tests (Jest)
npm test

# Coverage
npm run test:coverage
```

---

## 📚 Références

### Documentation Technique
- Next.js 14: https://nextjs.org/docs
- React 18: https://react.dev
- Tailwind CSS: https://tailwindcss.com
- TypeScript: https://www.typescriptlang.org

### Standards Bancaires
- ISO 8583: https://en.wikipedia.org/wiki/ISO_8583
- EMV 3DS: https://www.emvco.com/emv-technologies/3d-secure/
- PCI DSS: https://www.pcisecuritystandards.org

---

**Maintenu par**: L'équipe PMP Platform
**Contact**: dev@pmp-platform.local
