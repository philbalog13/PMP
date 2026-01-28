# Atelier 12 : 3D-Secure Pédagogique

## 🎯 Objectif
Comprendre le protocole 3D-Secure pour l'authentification forte des paiements en ligne.

**Durée estimée**: 2h  
**Prérequis**: Ateliers 1, 6-7 (flux transactionnel, messages, MAC)

---

## 📚 Théorie

### Qu'est-ce que 3D-Secure ?

**3D** = 3 Domaines :
- **Acquirer Domain** : Marchand + PSP
- **Interoperability Domain** : Réseaux (Visa/Mastercard)
- **Issuer Domain** : Banque émettrice

### Évolution du Protocole

| Version | Nom Commercial | Caractéristiques |
|---------|----------------|------------------|
| **1.0** | Verified by Visa, SecureCode | Pop-up, mot de passe statique |
| **2.0** | Visa Secure, Identity Check | Frictionless, biométrie, risk-based |
| **2.1/2.2** | EMV 3DS | Amélioration UX, App-based auth |

### Flow 3DS 2.0

```
                    ┌─────────────────────────────────────────────────────────────────┐
                    │                     FLUX 3D-SECURE 2.0                          │
                    └─────────────────────────────────────────────────────────────────┘
                    
   Porteur          Marchand           3DS Server        Directory       ACS
     │                 │                    │              Server          │
     │ ─────────────▶  │                    │                │             │
     │  1. Achat       │                    │                │             │
     │                 │ ──────────────────▶│                │             │
     │                 │  2. Auth Request   │                │             │
     │                 │                    │ ──────────────▶│             │
     │                 │                    │  3. AReq       │             │
     │                 │                    │                │ ────────────▶
     │                 │                    │                │  4. Lookup   │
     │                 │                    │                │ ◀────────────
     │                 │                    │ ◀──────────────│  5. ARes     │
     │                 │                    │                │             │
     │                 │                    │  📊 Risk Assessment         │
     │                 │                    │  ┌──────────────────────────┐│
     │                 │                    │  │ Score < Seuil → Frictionless
     │                 │                    │  │ Score > Seuil → Challenge ││
     │                 │                    │  └──────────────────────────┘│
     │ ◀────────────────────────────────────│  6. Challenge (si requis)   │
     │  OTP / Biométrie                     │                │             │
     │ ─────────────────────────────────────▶                │             │
     │  7. Réponse                          │                │             │
     │                 │ ◀──────────────────│  8. RReq/RRes  │             │
     │                 │  Auth Result       │                │             │
     └────────────────────────────────────────────────────────────────────────────────
```

### Frictionless vs Challenge

| Mode | Déclencheur | Expérience Utilisateur |
|------|-------------|------------------------|
| **Frictionless** | Low risk, trusted device | Pas d'interaction |
| **Challenge** | High risk, nouveau device | OTP, biométrie, question |

---

## 🧪 Exercices

### Exercice 1 : Comprendre le Flow

1. Ouvrez `3ds-flow-simulator.html`
2. Simulez une transaction low-risk (frictionless)
3. Simulez une transaction high-risk (challenge)

### Exercice 2 : Implémenter l'Évaluation de Risque

```bash
node authentication-demo.js
```

### Exercice 3 : Scénarios de Test

Testez les cas suivants :
- Premier achat sur site inconnu → Challenge attendu
- Achat habituel, même device → Frictionless attendu
- Montant élevé → Challenge attendu

---

## 📁 Fichiers de l'Atelier

| Fichier | Description |
|---------|-------------|
| `3ds-flow-simulator.html` | Simulateur interactif du flow |
| `authentication-demo.js` | Démonstration d'authentification |

---

## 📝 Quiz d'Évaluation

1. **Que signifie "3D" dans 3D-Secure ?**
   - [ ] a) 3 Dimensions
   - [ ] b) 3 Domaines
   - [ ] c) 3 Devices
   - [ ] d) Triple Data

2. **Dans 3DS 2.0, le mode "Frictionless" signifie :**
   - [ ] a) Transaction gratuite
   - [ ] b) Pas d'authentification
   - [ ] c) Authentification silencieuse (sans interaction)
   - [ ] d) Authentification par SMS

3. **L'ACS est géré par :**
   - [ ] a) Le marchand
   - [ ] b) Le réseau carte
   - [ ] c) La banque émettrice
   - [ ] d) Le PSP

4. **Un challenge est déclenché quand :**
   - [ ] a) Le montant est pair
   - [ ] b) Le score de risque est élevé
   - [ ] c) C'est le week-end
   - [ ] d) La carte est Visa

5. **Le Directory Server appartient à :**
   - [ ] a) La banque du marchand
   - [ ] b) Le réseau carte (Visa/Mastercard)
   - [ ] c) Le porteur de carte
   - [ ] d) L'État

**Réponses**: 1-b, 2-c, 3-c, 4-b, 5-b

---

## 🎯 Prolongements Avancés

1. **Implémenter un moteur de risque 3DS**
2. **Analyser les données envoyées dans l'AReq**
3. **Comparer 3DS 1.0 vs 2.0 en termes de taux de conversion**

---

## ✅ Critères de Validation

- [ ] Vous comprenez les 3 domaines
- [ ] Vous savez différencier Frictionless et Challenge
- [ ] Vous connaissez le rôle de l'ACS et du DS
- [ ] Vous comprenez l'évaluation du risque
