# E2E Tests - PMP

Suite de tests End-to-End pour la Plateforme Monétique Pédagogique.

## Installation

```bash
cd tests/e2e
npm install
```

## Prérequis

Tous les services doivent être démarrés avant de lancer les tests:

```bash
# Dans backend/
./start-all.bat start  # Windows
./start-all.sh start   # Linux/Mac
```

## Lancer les tests

```bash
# Tous les tests
npm test

# Tests spécifiques
npm run test:health        # Health checks uniquement
npm run test:cards         # Tests service cartes
npm run test:transactions  # Tests transactions
npm run test:workflow      # Workflow complet E2E
```

## Structure des tests

```
tests/e2e/
├── src/
│   ├── config.ts          # Configuration & données test
│   ├── setup.ts           # Setup Jest
│   └── tests/
│       ├── health.test.ts      # 8 health checks
│       ├── cards.test.ts       # CRUD cartes, Luhn
│       ├── transactions.test.ts # POS, Acquirer
│       ├── issuer.test.ts      # Authorization
│       ├── fraud.test.ts       # Scoring fraude
│       ├── crypto.test.ts      # Crypto & Keys
│       └── workflow.test.ts    # E2E complet
```

## Données de test synchronisées

| Carte | PAN | Scénario |
|-------|-----|----------|
| VISA OK | 4111111111111111 | Transactions OK |
| MC OK | 5500000000000004 | Transactions OK |
| Bloquée | 4000000000000002 | Decline 62 |
| Fonds insuffisants | 4000000000000051 | Decline 51 |
