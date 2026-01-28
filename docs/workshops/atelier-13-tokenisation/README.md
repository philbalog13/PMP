# Atelier 13 : Tokenisation des Cartes

## 🎯 Objectif
Comprendre la tokenisation des données de carte pour sécuriser les paiements récurrents et mobiles.

**Durée estimée**: 1h30  
**Prérequis**: Ateliers 1-2, 5 (flux, cryptographie, gestion des clés)

---

## 📚 Théorie

### Qu'est-ce que la Tokenisation ?

La **tokenisation** remplace le PAN (numéro de carte) par une valeur non sensible appelée **token**.

```
┌─────────────────────────────────────────────────────────────┐
│                    TOKENISATION                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   PAN Réel                    Token                        │
│   ┌─────────────────┐         ┌─────────────────┐           │
│   │ 4111111111111111│ ───────▶│ 4900000012345678│           │
│   └─────────────────┘ Vault   └─────────────────┘           │
│                        ▲                                    │
│                        │                                    │
│            ┌───────────┴───────────┐                        │
│            │   Token Vault (HSM)   │                        │
│            │   Mapping sécurisé    │                        │
│            └───────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Types de Tokens

| Type | Format | Usage | Exemple |
|------|--------|-------|---------|
| **Payment Token** | 16 chiffres (BIN spécial) | Paiements | 4900xxxxxxxxxxxx |
| **Merchant Token** | UUID ou hash | Stockage marchand | tok_1234567890 |
| **Network Token** | 16 chiffres EMVCo | Apple Pay, Google Pay | 4111xxxxxxxxxxxx |

### Token Vault

Le **Token Vault** est la base de données sécurisée (dans un HSM) qui stocke la correspondance :

```
┌─────────────────────────────────────────────────────────────┐
│                     TOKEN VAULT                             │
├─────────────────┬─────────────────┬─────────────────────────┤
│     Token       │     PAN         │     Métadonnées         │
├─────────────────┼─────────────────┼─────────────────────────┤
│ 4900000000001234│ 4111111111111111│ Merchant: AMAZON        │
│ tok_abc123def   │ 5500000000000004│ Created: 2026-01-28     │
│ 4900000000005678│ 4111111111111111│ Expiry: 2027-01        │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### Avantages de la Tokenisation

| Sans Tokenisation | Avec Tokenisation |
|-------------------|-------------------|
| PAN stocké partout | PAN uniquement dans le Vault |
| Breach = toutes cartes | Breach = tokens inutilisables |
| Scope PCI large | Scope PCI réduit |
| Rotation difficile | Révocation simple |

---

## 🧪 Exercices

### Exercice 1 : Tokeniser un PAN

```bash
node tokenizer.js
```

### Exercice 2 : Simuler le Vault

Ouvrez `vault-simulator.html` pour :
- Créer des tokens
- Rechercher des mappings
- Révoquer des tokens

### Exercice 3 : Scénarios d'Usage

Implémentez les cas suivants :
1. Paiement récurrent (abonnement)
2. Paiement mobile (Apple Pay)
3. Card-on-file (commande en 1-clic)

---

## 📁 Fichiers de l'Atelier

| Fichier | Description |
|---------|-------------|
| `tokenizer.js` | Service de tokenisation |
| `vault-simulator.html` | Interface du vault |

---

## 📝 Quiz d'Évaluation

1. **La tokenisation remplace :**
   - [ ] a) Le PIN par un token
   - [ ] b) Le PAN par un token
   - [ ] c) Le CVV par un token
   - [ ] d) Tout par un token

2. **Le Token Vault est stocké dans :**
   - [ ] a) La base de données du marchand
   - [ ] b) Un HSM sécurisé
   - [ ] c) Le navigateur du client
   - [ ] d) La carte bancaire

3. **Un Network Token est utilisé par :**
   - [ ] a) Les terminaux de paiement physiques
   - [ ] b) Apple Pay et Google Pay
   - [ ] c) Les virements bancaires
   - [ ] d) Les chèques

4. **Avantage principal de la tokenisation :**
   - [ ] a) Plus rapide
   - [ ] b) Moins cher
   - [ ] c) Réduction du scope PCI
   - [ ] d) Plus joli

5. **Un token peut être :**
   - [ ] a) Revers en PAN par le marchand
   - [ ] b) Réutilisé pour n'importe quel achat
   - [ ] c) Limité à un marchand spécifique
   - [ ] d) Généré par le client

**Réponses**: 1-b, 2-b, 3-b, 4-c, 5-c

---

## 🎯 Prolongements Avancés

1. **Implémenter un Token Service Provider (TSP)**
2. **Gérer le renouvellement automatique des tokens**
3. **Analyser le protocol EMVCo pour les Network Tokens**

---

## ✅ Critères de Validation

- [ ] Vous comprenez la différence PAN vs Token
- [ ] Vous savez ce qu'est un Token Vault
- [ ] Vous connaissez les types de tokens
- [ ] Vous comprenez l'impact sur la conformité PCI
