# Atelier 3 : Attaque par Rejeu (Replay Attack)

## 🎯 Objectif
Comprendre les attaques par rejeu et implémenter des mécanismes de protection.

---

## 📚 Théorie

### Qu'est-ce qu'une Attaque par Rejeu ?

Une **attaque par rejeu** (replay attack) consiste à capturer une transaction légitime et à la retransmettre pour obtenir un effet non autorisé.

```
          Attaquant
              │
              │ 📡 Capture
              ▼
┌────────┐         ┌────────┐         ┌────────┐
│Terminal│───────▶│Acquéreur│───────▶│Émetteur│
└────────┘  TX #1  └────────┘         └────────┘
    │                                      │
    └─────────── ✅ APPROVED ◀─────────────┘

          Attaquant
              │
              │ 🔄 Rejeu TX #1
              ▼
┌────────┐         ┌────────┐         ┌────────┐
│Terminal│───────▶│Acquéreur│──❌────▶│Émetteur│
└────────┘  TX #1  └────────┘         └────────┘
    │               (doublé!)              │
    └─────────── ❌ DECLINED ◀─────────────┘
```

### Mécanismes de Protection

| Mécanisme | Description | Efficacité |
|-----------|-------------|------------|
| **STAN** | System Trace Audit Number unique | ⭐⭐⭐ |
| **RRN** | Retrieval Reference Number | ⭐⭐⭐ |
| **Timestamp** | Fenêtre temporelle | ⭐⭐ |
| **Nonce** | Valeur aléatoire unique | ⭐⭐⭐⭐ |
| **Signature** | HMAC/MAC du message | ⭐⭐⭐⭐⭐ |

---

## 🧪 Exercices

### Exercice 1 : Capturer une Transaction Valide

1. Lancez la plateforme PMP
2. Effectuez une transaction via le terminal
3. Observez les logs et identifiez les identifiants uniques

### Exercice 2 : Tenter un Rejeu

1. Ouvrez `replay-detector.ts`
2. Simulez l'envoi de la même transaction 10 fois
3. Observez les rejets après la première acceptation

```bash
npx ts-node replay-detector.ts
```

### Exercice 3 : Implémenter un Mécanisme Anti-Rejeu

Modifiez `sequence-manager.js` pour :
- Stocker les STAN vus dans les 5 dernières minutes
- Rejeter tout STAN dupliqué
- Nettoyer les entrées expirées

---

## 📁 Fichiers de l'Atelier

| Fichier | Description |
|---------|-------------|
| `replay-detector.ts` | Simulation d'attaque par rejeu |
| `sequence-manager.js` | Gestionnaire de séquences anti-rejeu |

---

## ⚠️ Points de Sécurité

> **RAPPEL** : Une transaction doit être identifiable de manière UNIQUE par la combinaison :
> - Terminal ID + STAN + Date/Heure

---

## ✅ Critères de Validation

- [ ] Vous comprenez le principe de l'attaque par rejeu
- [ ] Vous savez identifier les champs uniques d'une transaction
- [ ] Vous pouvez implémenter un mécanisme de détection
- [ ] Vous comprenez pourquoi le timestamp seul ne suffit pas
