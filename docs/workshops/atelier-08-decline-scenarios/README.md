# Atelier 8 : Scénarios de Refus

## 🎯 Objectif
Simuler et comprendre les différents codes de réponse et scénarios de refus de transaction.

---

## 📚 Théorie

### Codes de Réponse Courants (ISO 8583 DE39)

| Code | Signification | Action Terminal |
|------|---------------|-----------------|
| 00 | Approuvé | ✅ Imprimer ticket |
| 01 | Appeler banque | 📞 Contact manuel |
| 05 | Ne pas honorer | ❌ Refusé |
| 12 | Transaction invalide | ❌ Refusé |
| 14 | Carte invalide | ❌ Retenir carte |
| 51 | Fonds insuffisants | ❌ Refusé |
| 54 | Carte expirée | ❌ Refusé |
| 55 | PIN incorrect | 🔄 Nouvelle tentative |
| 91 | Émetteur indisponible | 🔄 Réessayer plus tard |

### Gestion des Retries

```
Transaction       Code      Action
    │              │          │
    ▼              ▼          ▼
┌───────┐      ┌──────┐   ┌─────────────┐
│ Retry │ ◀─── │  91  │   │ Attendre    │
│       │      │  96  │   │ 30 secondes │
└───────┘      └──────┘   └─────────────┘
    │
    ▼ (max 3 tentatives)
┌───────────┐
│ Abandon   │
└───────────┘
```

---

## 🧪 Exercices

### Exercice 1 : Simuler les Codes de Réponse

```bash
node scenario-simulator.js
```

### Exercice 2 : Implémenter la Logique de Retry

Modifiez le simulateur pour gérer les codes 91 et 96 avec retry automatique.

### Exercice 3 : Messages Utilisateur

Pour chaque code, créez un message clair pour l'utilisateur final.

---

## 📁 Fichiers

| Fichier | Description |
|---------|-------------|
| `response-codes.json` | Référence des codes |
| `scenario-simulator.js` | Simulateur interactif |

---

## ✅ Critères de Validation

- [ ] Vous connaissez les codes de réponse les plus courants
- [ ] Vous savez quand retenter une transaction
- [ ] Vous comprenez la différence entre refus technique et métier
