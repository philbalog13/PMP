# Atelier 7 : MAC et Intégrité

## 🎯 Objectif
Comprendre et implémenter le Message Authentication Code pour garantir l'intégrité des messages.

---

## 📚 Théorie

### Qu'est-ce qu'un MAC ?

Le **MAC (Message Authentication Code)** garantit que :
1. Le message n'a pas été modifié (intégrité)
2. Le message provient bien de l'expéditeur attendu (authenticité)

```
┌───────────────────┐     ┌───────────────┐     ┌───────────────────┐
│  Message Original │────▶│  Algorithme   │────▶│   MAC (8 bytes)   │
│                   │     │  HMAC/CBC-MAC │     │                   │
│  + Clé Secrète    │     │               │     │                   │
└───────────────────┘     └───────────────┘     └───────────────────┘
```

### Types de MAC

| Algorithme | Description | Usage |
|------------|-------------|-------|
| HMAC-SHA256 | Hash-based MAC | Moderne, recommandé |
| CBC-MAC | Basé sur chiffrement | Legacy bancaire |
| CMAC | Cipher-based MAC | Standard NIST |

---

## 🧪 Exercices

### Exercice 1 : Générer un MAC

```bash
node mac-generator.js
```

### Exercice 2 : Vérifier l'Intégrité

Utilisez le vérificateur HTML pour tester si un message a été altéré.

### Exercice 3 : Simuler une Attaque

Modifiez un seul caractère du message et observez le changement de MAC.

---

## 📁 Fichiers

| Fichier | Description |
|---------|-------------|
| `mac-generator.js` | Générateur et vérificateur de MAC |
| `integrity-checker.html` | Interface de vérification |

---

## ✅ Critères de Validation

- [ ] Vous comprenez la différence entre MAC et signature
- [ ] Vous savez générer un HMAC-SHA256
- [ ] Vous comprenez pourquoi un bit modifié change tout le MAC
