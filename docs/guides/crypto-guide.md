# 🔐 Guide Cryptographie - PMP

## Introduction

Ce guide explique les opérations cryptographiques disponibles dans la PMP et leur utilisation dans les paiements.

## Types de clés

| Type | Nom | Usage |
|------|-----|-------|
| **ZMK** | Zone Master Key | Échange de clés entre systèmes |
| **TMK** | Terminal Master Key | Clé unique par terminal |
| **ZPK** | Zone PIN Key | Chiffrement des PIN |
| **PVK** | PIN Verification Key | Vérification des PIN |
| **CVK** | Card Verification Key | Génération des CVV |
| **KEK** | Key Encrypting Key | Protection des autres clés |
| **DEK** | Data Encrypting Key | Chiffrement des données |
| **MAC** | Message Authentication | Intégrité des messages |

## Algorithmes supportés

### Chiffrement symétrique

| Algorithme | Taille clé | Usage |
|------------|------------|-------|
| AES-128-CBC | 128 bits | Standard moderne |
| AES-256-CBC | 256 bits | Haute sécurité |
| DES-CBC | 64 bits | ⚠️ Obsolète |
| 3DES-CBC | 192 bits | Legacy bancaire |

### HMAC

| Algorithme | Sortie | Usage |
|------------|--------|-------|
| HMAC-SHA256 | 256 bits | Recommandé |
| HMAC-SHA1 | 160 bits | Legacy |
| HMAC-MD5 | 128 bits | ⚠️ Déconseillé |

## PIN Block ISO 9564

### Format 0 (le plus courant)

```
PIN Block = PIN Field XOR PAN Field

PIN Field:  0 | N | P | P | P | P | F | F | F | F | F | F | F | F | F | F
PAN Field:  0 | 0 | 0 | 0 | P | P | P | P | P | P | P | P | P | P | P | P

Où:
- N = longueur du PIN (4-12)
- P = chiffres du PIN
- F = remplissage (0xF)
- PAN: 12 chiffres avant le check digit
```

### Exemple

```
PIN: 1234
PAN: 4111111111111111

PIN Field:  041234FFFFFFFFFF
PAN Field:  0000111111111111
            ────────────────
PIN Block:  041125EEEEEEEEEE
```

## Key Check Value (KCV)

Le KCV permet de vérifier une clé sans l'exposer:

```
KCV = encrypt(00000000, key)[0:6]

Exemple:
- Clé: 0123456789ABCDEF
- Chiffrer 8 octets de zéros
- Prendre les 6 premiers caractères hex du résultat
- KCV: "A1B2C3"
```

## Rotation des clés

La rotation régulière limite l'impact d'une compromission:

```bash
# 1. Générer nouvelle clé
POST /keys
{"name": "DEK-2024", "type": "DEK", "algorithm": "AES-256"}

# 2. Effectuer rotation
POST /keys/{oldKeyId}/rotate

# 3. L'ancienne clé passe en statut SUSPENDED
```

## Bonnes pratiques

1. **Ne jamais exposer les clés en clair** - Utiliser KCV pour vérification
2. **Rotation régulière** - Annuellement minimum, trimestriellement recommandé
3. **Séparation des clés** - Une clé par usage
4. **AES-256 minimum** - Pour nouvelles implémentations
5. **Logger les accès** - Audit trail obligatoire
