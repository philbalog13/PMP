# TPE Web Pédagogique

Application web frontend pour le Terminal de Paiement Électronique (TPE) de la Plateforme Monétique Pédagogique.

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 20+
- npm ou yarn

### Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.local.example .env.local
# Éditer .env.local avec l'URL de votre backend
```

### Lancement en Développement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 📦 Stack Technique

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **API Client**: Axios
- **Icons**: Lucide React
- **Formulaires**: React Hook Form + Zod

## 🎯 Fonctionnalités

### Terminal de Paiement
- ✅ Écran LCD virtuel avec statuts visuels
- ✅ Clavier numérique pour saisie montant
- ✅ Lecteur de carte virtuel (manuel, QR code, NFC)
- ✅ Types de transaction (Achat, Remboursement, Annulation, Pré-autorisation)

### Mode Pédagogique
- 🐛 **Debug View**: Affichage JSON des requêtes/réponses en temps réel
- 📊 **Step Flow**: Visualisation étape par étape du flux de transaction
- 🔍 **Détails Techniques**: Modal avec onglets pour ISO 8583, crypto, et logs serveurs

### Scénarios Prédéfinis
- 🟢 **Carte Valide** (`4111111111111111`): Transaction approuvée
- 🔴 **Solde Insuffisant** (`4000056655665556`): Code 51
- 🟠 **Carte Expirée** (`4532015112830366`): Code 54
- 🟣 **Carte Volée** (`4916338506082832`): Code 43

## 📂 Structure du Projet

```
app/
├── layout.tsx          # Layout racine
├── page.tsx            # Page principale
components/
├── terminal/
│   ├── TerminalScreen.tsx
│   ├── Keypad.tsx
│   ├── CardReaderSim.tsx
│   └── TransactionLog.tsx
├── config/
│   └── ConfigPanel.tsx
└── pedagogy/
    ├── DebugView.tsx
    ├── StepFlow.tsx
    └── TechnicalDetail.tsx
lib/
├── store.ts            # Zustand store
├── api-client.ts       # Axios client
└── utils.ts            # Utility functions
types/
└── transaction.ts      # TypeScript types
```

## 🔗 Intégration Backend

L'application communique avec le backend via:
- **SIM-NETWORK-SWITCH**: `http://localhost:8004`
- Endpoint principal: `POST /api/v1/process`

## 🎨 Personnalisation

### Thème
Les couleurs et styles sont définis dans `tailwind.config.js` et peuvent être personnalisés.

### Scénarios
Ajoutez de nouveaux scénarios pédagogiques dans `components/config/ConfigPanel.tsx`.

## 📝 Scripts Disponibles

```bash
npm run dev          # Développement
npm run build        # Build production
npm run start        # Démarrer en production
npm run lint         # Linter ESLint
```

## 📖 Documentation

Pour plus d'informations sur l'architecture globale, consultez le README principal du projet PMP.

## 🤝 Contribution

Cette application est conçue à des fins pédagogiques. Les contributions sont les bienvenues !

## 📄 Licence

MIT
