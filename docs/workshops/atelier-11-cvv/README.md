# Atelier 11 : CVV Statique vs Dynamique

## 🎯 Objectif
Comprendre les différents types de codes de vérification de carte (CVV/CVC) et leur rôle dans la sécurité des paiements.

**Durée estimée**: 1h30  
**Prérequis**: Ateliers 1-2 (flux transactionnel, cryptographie de base)

---

## 📚 Théorie

### Types de CVV

| Type | Nom Complet | Localisation | Usage |
|------|-------------|--------------|-------|
| **CVV1** | Card Verification Value 1 | Piste magnétique | Transactions physiques |
| **CVV2** | Card Verification Value 2 | Dos de la carte (3 chiffres) | Transactions CNP (e-commerce) |
| **iCVV** | Integrated CVV | Puce EMV | Transactions chip |
| **dCVV** | Dynamic CVV | Carte à écran e-ink | Change périodiquement |

### Génération du CVV

```
┌─────────────────────────────────────────────────────────────┐
│                    GÉNÉRATION CVV2                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Inputs:                                                    │
│  ┌─────────────────┐                                        │
│  │ PAN (16 digits) │────┐                                   │
│  └─────────────────┘    │                                   │
│  ┌─────────────────┐    │    ┌─────────────┐   ┌─────────┐  │
│  │ Expiry (YYMM)   │────┼───▶│  3DES-CBC   │──▶│ CVV (3) │  │
│  └─────────────────┘    │    └─────────────┘   └─────────┘  │
│  ┌─────────────────┐    │          ▲                        │
│  │ Service Code    │────┘          │                        │
│  └─────────────────┘               │                        │
│                           ┌────────┴────────┐               │
│                           │   CVK (A + B)   │               │
│                           │ (Card Verif Key)│               │
│                           └─────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### Différence CVV1 vs CVV2

```
Piste 2 (avec CVV1):
;4111111111111111=2812101123400001?
                   │   ││││└─────── CVV1 (position 14-16 après =)
                   │   │││└──────── Discretionary data
                   │   ││└───────── PIN Verification Key Indicator
                   │   │└────────── Service Code (101=Normal)
                   │   └─────────── Date expiration (YYMM)
                   └────────────── PAN

CVV2 (dos de la carte):
Calculé avec Service Code = 000 (au lieu du vrai)
→ Résultat DIFFÉRENT du CVV1
→ Empêche la génération du CVV2 à partir de la piste
```

---

## 🧪 Exercices

### Exercice 1 : Comprendre la Génération

1. Ouvrez `cvv-generator.js`
2. Observez l'algorithme de génération
3. Expliquez pourquoi CVV1 ≠ CVV2

```bash
node cvv-generator.js
```

### Exercice 2 : Comparer les CVV

1. Ouvrez `cvv-comparison.html` dans votre navigateur
2. Entrez un PAN et une date d'expiration
3. Observez les différents CVV générés

### Exercice 3 : Sécurité du dCVV

Répondez aux questions suivantes :
1. Pourquoi le dCVV améliore-t-il la sécurité ?
2. Quels sont les inconvénients du dCVV ?
3. Comment le dCVV est-il synchronisé avec la banque ?

---

## 📁 Fichiers de l'Atelier

| Fichier | Description |
|---------|-------------|
| `cvv-generator.js` | Générateur de CVV pédagogique |
| `cvv-comparison.html` | Comparateur interactif |

---

## 📝 Quiz d'Évaluation

1. **Où se trouve le CVV1 ?**
   - [ ] a) Dos de la carte
   - [ ] b) Piste magnétique
   - [ ] c) Puce EMV
   - [ ] d) Application mobile

2. **Pourquoi CVV1 ≠ CVV2 ?**
   - [ ] a) Clés différentes
   - [ ] b) Service Code différent
   - [ ] c) Algorithme différent
   - [ ] d) PAN différent

3. **Quel CVV change régulièrement ?**
   - [ ] a) CVV1
   - [ ] b) CVV2
   - [ ] c) iCVV
   - [ ] d) dCVV

4. **Le CVV2 est utilisé pour :**
   - [ ] a) Transactions au TPE
   - [ ] b) Retraits DAB
   - [ ] c) Achats en ligne
   - [ ] d) Virements bancaires

5. **La clé utilisée pour générer le CVV s'appelle :**
   - [ ] a) ZPK
   - [ ] b) CVK
   - [ ] c) ZMK
   - [ ] d) MAC

**Correction**: disponible uniquement dans la version formateur.

---

## 🎯 Prolongements Avancés

1. **Implémenter la vérification CVV au niveau émetteur**
2. **Créer un simulateur de carte à dCVV**
3. **Analyser les vecteurs d'attaque sur le CVV2**

---

## ✅ Critères de Validation

- [ ] Vous connaissez les 4 types de CVV
- [ ] Vous comprenez pourquoi CVV1 ≠ CVV2
- [ ] Vous savez où chaque CVV est utilisé
- [ ] Vous pouvez expliquer l'avantage du dCVV


