# Scénario 2 : PAN Harvesting via Faille Batch

## 🔴 Vulnérabilité

**Logs de transaction non chiffrés contenant des PAN en clair**

Un attaquant ayant accès aux fichiers de log peut :
- Extraire tous les PAN des transactions passées
- Récupérer des milliers de numéros de carte
- Revendre ces données ou les utiliser pour de la fraude

```
┌─────────────────────────────────────────────────────────────┐
│  FICHIER LOG VULNÉRABLE                                     │
├─────────────────────────────────────────────────────────────┤
│  2026-01-28 14:30:22 INFO Transaction processed             │
│    PAN: 4111111111111111  ← PAN EN CLAIR!                  │
│    Amount: 125.00                                           │
│    Status: APPROVED                                         │
│                                                             │
│  2026-01-28 14:31:45 INFO Transaction processed             │
│    PAN: 5500000000000004  ← PAN EN CLAIR!                  │
│    Amount: 89.99                                            │
│    Status: APPROVED                                         │
└─────────────────────────────────────────────────────────────┘
```

## 💀 Impact

- Vol massif de données de carte
- Non-conformité PCI-DSS (Exigence 3.4)
- Amendes et perte de certification
- Atteinte à la réputation

---

## 🔧 Fichiers

| Fichier | Description |
|---------|-------------|
| `pan-extractor.py` | Exploit : parse les logs et extrait les PAN |
| `pci-scanner.sh` | Détection : scanne les fichiers pour PAN en clair |
| `fix-pan-masking.js` | Correctif : masking automatique + chiffrement |

---

## ▶️ Exécution

```bash
# 1. Lancer l'attaque (simulation)
python pan-extractor.py

# 2. Scanner les vulnérabilités
bash pci-scanner.sh /path/to/logs

# 3. Appliquer le correctif
node fix-pan-masking.js
```

---

## ✅ Correctif Recommandé

1. **Masking systématique** : Afficher uniquement ****1234
2. **Chiffrement des logs** : AES-256-GCM
3. **Purge automatique** : Supprimer les logs > 12 mois
4. **Contrôle d'accès** : Restreindre l'accès aux logs
