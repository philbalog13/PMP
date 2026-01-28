# key-management - Gestion des Clés Cryptographiques

Service de gestion du cycle de vie des clés cryptographiques (simule HSM).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/keys` | Générer nouvelle clé |
| GET | `/keys` | Liste clés (sans data) |
| GET | `/keys/:id` | Détails clé |
| DELETE | `/keys/:id` | Détruire clé |
| POST | `/keys/:id/rotate` | Rotation clé |
| POST | `/keys/import` | Importer clé |
| POST | `/keys/:id/export` | Exporter clé |

## Types de clés

| Type | Usage |
|------|-------|
| ZMK | Zone Master Key - échange de clés |
| TMK | Terminal Master Key - par terminal |
| ZPK | Zone PIN Key - chiffrement PIN |
| PVK | PIN Verification Key |
| CVK | Card Verification Key - CVV |
| KEK | Key Encrypting Key |
| DEK | Data Encrypting Key |
| MAC | Message Authentication |

## Clés de test préchargées

- MASTER-ZMK-001 (3DES)
- TERMINAL-TMK-001 (3DES)
- PIN-ZPK-001 (AES-128)
- CVV-CVK-001 (3DES)
- MAC-KEY-001 (AES-256)

## KCV (Key Check Value)

Le KCV est les 6 premiers caractères hex du chiffrement de 8 octets de zéros avec la clé.
Il permet de vérifier une clé sans exposer sa valeur.

## Démarrage

```bash
npm install
npm run dev  # Port 8012
```
