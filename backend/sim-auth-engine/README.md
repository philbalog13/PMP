# Sim-Auth-Engine

Moteur d'autorisation monétique avec règles configurables pour la Plateforme Monétique Pédagogique.

## 🎯 Fonctionnalités

- **Moteur de règles configurable** avec 18 règles prédéfinies
- **Base de données en mémoire** (comptes, cartes, historique)
- **9 scénarios de simulation** pédagogiques
- **API REST complète** pour autorisation et gestion des règles

## 📋 Règles Prédéfinies

| Code | Règle | Response Code |
|------|-------|---------------|
| RULE_INSUFFICIENT_FUNDS | Solde insuffisant | 51 |
| RULE_EXPIRED_CARD | Carte expirée | 54 |
| RULE_DAILY_LIMIT | Limite quotidienne | 61 |
| RULE_STOLEN_CARD | Carte volée | 43 |
| RULE_LOST_CARD | Carte perdue | 41 |
| RULE_BLOCKED_CARD | Carte bloquée | 62 |
| RULE_PIN_BLOCKED | PIN bloqué | 75 |
| RULE_3DS_REQUIRED | 3DS requis | 65 |
| RULE_INTERNATIONAL_BLOCKED | International bloqué | 57 |
| RULE_ECOMMERCE_BLOCKED | E-commerce bloqué | 57 |
| RULE_VELOCITY | Vélocité dépassée | 65 |
| RULE_SUSPICIOUS_LOCATION | Localisation suspecte | 59 |

## 🔌 API Endpoints

### Autorisation
```bash
POST /authorize
{
  "stan": "000001",
  "pan": "4111111111111111",
  "amount": 100.00,
  "currency": "EUR",
  "merchantId": "MERCH001",
  "terminalId": "TERM01",
  "type": "PURCHASE"
}
```

### Historique
```bash
GET /transactions/:pan
```

### Simulations
```bash
POST /simulate/APPROVED
POST /simulate/INSUFFICIENT_FUNDS
POST /simulate/EXPIRED_CARD
POST /simulate/STOLEN_CARD
POST /simulate/OVER_LIMIT
POST /simulate/3DS_REQUIRED
POST /simulate/FRAUD_SUSPECTED
```

### Gestion des règles
```bash
GET /rules                    # Lister les règles
GET /rules/:id                # Détail d'une règle
POST /rules                   # Créer une règle
PUT /rules/:id/enabled        # Activer/désactiver
DELETE /rules/:id             # Supprimer (custom only)
```

## 🗃️ Données de test

### Cartes disponibles

| PAN | Statut | Compte |
|-----|--------|--------|
| 4111111111111111 | Active (5000€) | Jean Dupont |
| 4000056655665556 | Active (150€) | Marie Martin |
| 5555555555554444 | Active (25000€) | Pierre Durand |
| 4532015112830366 | Expirée | - |
| 4916338506082832 | Volée | - |
| 5105105105105100 | PIN bloqué | - |

## 🚀 Démarrage

```bash
npm install
cp .env.example .env
npm run dev
```

## 📊 Architecture

```
src/
├── config/           # Configuration
├── controllers/      # Controllers REST
├── database/         # Base de données en mémoire
├── models/           # Interfaces TypeScript
├── routes/           # Routes Express
├── services/         # Logique métier
│   ├── authorization.service.ts
│   └── rulesEngine.service.ts
└── index.ts          # Entry point
```

---

**Microservice pédagogique PMP** 🎓
