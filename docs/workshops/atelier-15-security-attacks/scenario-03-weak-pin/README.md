# Scénario 3 : Weak PIN Encryption

## 🔴 Vulnérabilité

**Clé de chiffrement statique pour tous les terminaux**

Si la même clé est utilisée partout et n'est jamais changée :
- Un attaquant peut capturer des PIN Blocks chiffrés
- Tenter un brute force hors ligne
- Dériver les PIN en clair

```
┌─────────────────────────────────────────────────────────────┐
│                    ATTAQUE BRUTE FORCE                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PIN Block capturé: 0412AC4567890123                        │
│                                                             │
│  Clé statique: 0123456789ABCDEF (connue ou volée)          │
│                                                             │
│  Brute force 10000 combinaisons (0000-9999):                │
│    Test 0000... ❌                                          │
│    Test 0001... ❌                                          │
│    ...                                                      │
│    Test 1234... ✅ TROUVÉ!                                  │
│                                                             │
│  Temps moyen: quelques secondes                             │
└─────────────────────────────────────────────────────────────┘
```

## 💀 Impact

- Vol de PIN à grande échelle
- Transactions frauduleuses
- Clonage de cartes (magstripe + PIN)

---

## 🔧 Fichiers

| Fichier | Description |
|---------|-------------|
| `pin-cracker.go` | Exploit : brute force du PIN Block |
| `key-rotation-checker.js` | Détection : vérifie la rotation des clés |
| `fix-derived-keys.js` | Correctif : dérivation de clé par transaction |

---

## ▶️ Exécution

```bash
# 1. Lancer l'attaque (simulation)
go run pin-cracker.go

# 2. Vérifier la rotation des clés
node key-rotation-checker.js

# 3. Appliquer le correctif
node fix-derived-keys.js
```

---

## ✅ Correctif Recommandé

1. **Clé unique par terminal** (DUKPT)
2. **Rotation automatique** des clés
3. **HSM pour stockage** des clés
4. **Dérivation par transaction**
