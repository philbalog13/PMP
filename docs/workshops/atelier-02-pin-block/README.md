# Atelier 2 : Le PIN Block en Pratique

## 🎯 Objectif
Maîtriser la norme ISO 9564 pour le chiffrement sécurisé des codes PIN.

---

## 📚 Théorie

### Qu'est-ce qu'un PIN Block ?

Le **PIN Block** est une représentation chiffrée du code PIN qui permet sa transmission sécurisée sans jamais exposer le PIN en clair.

### Format 0 (ISO-0) - Le plus courant

```
Structure du PIN Block Format 0:
┌────────────────────────────────────────────┐
│  0  │ L │ P │ P │ P │ P │ F │ F │ ... │ F │
└────────────────────────────────────────────┘
  │    │   └───────────┬───────────┘
  │    │               │
  │    │               └── PIN digits padded with 0xF
  │    └── Length of PIN (1 hex digit)
  └── Format indicator (0 = ISO-0)

XOR avec les 12 derniers chiffres du PAN (sans check digit):
┌────────────────────────────────────────────┐
│  0  │ 0 │ 0 │ 0 │ P │ P │ P │ P │ ... │ P │
└────────────────────────────────────────────┘
              └───────────────────────────────┘
                      12 rightmost PAN digits
                      (excluding check digit)
```

### Hiérarchie des Clés

```
                    ┌─────────────────┐
                    │   Master Key    │
                    │    (ZMKI)       │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │  Zone PIN Key │ │  Zone MAC Key │ │  Zone Data Key│
    │    (ZPK)      │ │    (ZMK)      │ │    (ZDK)      │
    └───────────────┘ └───────────────┘ └───────────────┘
```

---

## 🧪 Exercices

### Exercice 1 : Générer un PIN Block Format 0

1. Ouvrez `pin-block-simulator.html` dans votre navigateur
2. Entrez un PIN (ex: `1234`)
3. Entrez un PAN (ex: `4111111111111111`)
4. Observez le PIN Block généré

### Exercice 2 : Chiffrer avec une ZPK

```javascript
// Clé ZPK de test (32 hex = 128 bits)
const ZPK = '0123456789ABCDEF0123456789ABCDEF';

// Utilisez le simulateur pour :
// 1. Générer le PIN Block clair
// 2. Chiffrer avec la ZPK en mode 3DES-CBC
// 3. Observer le résultat chiffré
```

### Exercice 3 : Déchiffrer au niveau Émetteur

Simulez le processus de la banque émettrice :
1. Recevoir le PIN Block chiffré
2. Déchiffrer avec la ZPK
3. Extraire le PIN original
4. Comparer avec le PIN stocké (hashé)

---

## 📁 Fichiers de l'Atelier

| Fichier | Description |
|---------|-------------|
| `pin-block-simulator.html` | Simulateur interactif |
| `key-visualizer.js` | Visualisation de la hiérarchie des clés |

---

## ⚠️ Points de Sécurité

> **ATTENTION** : En production, les clés ne doivent JAMAIS être exposées en clair !
> Ce simulateur est UNIQUEMENT pédagogique.

- Les clés sont stockées dans des HSM matériels
- Les PIN ne sont jamais loggés
- Les clés sont rotées régulièrement

---

## ✅ Critères de Validation

- [ ] Vous comprenez la structure d'un PIN Block Format 0
- [ ] Vous savez pourquoi le XOR avec le PAN est nécessaire
- [ ] Vous comprenez la hiérarchie ZMK → ZPK
- [ ] Vous pouvez générer un PIN Block manuellement
