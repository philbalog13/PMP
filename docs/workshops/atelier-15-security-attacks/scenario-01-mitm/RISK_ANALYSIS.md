# Analyse de Risque - Scénario 1 : Man-in-the-Middle sur ISO 8583

## 📊 Fiche de Risque

| Attribut | Valeur |
|----------|--------|
| **ID Risque** | RISK-001-MITM |
| **Catégorie** | Intégrité des Transactions |
| **Probabilité** | Haute (sans MAC) / Faible (avec MAC) |
| **Impact** | Critique |
| **Score CVSS** | 9.1 (Critical) |

---

## 🎯 Description de la Menace

### Vecteur d'Attaque

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLUX NORMAL                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [Terminal] ──────────────────────────────► [Serveur Auth]     │
│              Message ISO 8583 (100€)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     FLUX COMPROMIS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [Terminal] ───► [Attaquant] ───► [Serveur Auth]               │
│              100€              10€                              │
│                   (modifie DE4)                                 │
│                                                                 │
│   Résultat: Commerçant croit débiter 100€, client débité 10€   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Conditions d'Exploitation

| Condition | Requise | Difficulté |
|-----------|---------|------------|
| Accès au réseau local | ✅ Oui | Moyenne |
| Absence de MAC sur DE4 | ✅ Oui | Faible |
| Absence de TLS | ✅ Oui | Faible |
| Connaissance ISO 8583 | ✅ Oui | Moyenne |

---

## 💰 Impact Financier

### Scénario de Pertes

| Type de Perte | Estimation |
|---------------|------------|
| **Perte directe par transaction** | Différence de montant modifié |
| **Volume potentiel (1 terminal/jour)** | ~50-200 transactions |
| **Perte quotidienne estimée** | 5 000€ - 50 000€ |
| **Détection moyenne** | 24-72 heures |
| **Perte avant détection** | 15 000€ - 150 000€ |

### Coûts Indirects

- 🔸 Frais d'investigation forensique
- 🔸 Notification aux clients (RGPD)
- 🔸 Pénalités des réseaux (Visa/Mastercard)
- 🔸 Perte de réputation
- 🔸 Révocation de licence PCI-DSS

---

## 🛡️ Contrôles de Sécurité

### Contrôles Préventifs

| Contrôle | Efficacité | Implémenté |
|----------|------------|------------|
| MAC ISO 9797 sur DE4, DE38, DE39 | ⭐⭐⭐⭐⭐ | `[ ]` |
| Chiffrement TLS 1.3 E2E | ⭐⭐⭐⭐⭐ | `[ ]` |
| Validation séquence STAN | ⭐⭐⭐⭐ | `[ ]` |
| Timestamps avec fenêtre de validité | ⭐⭐⭐⭐ | `[ ]` |
| Segmentation réseau (VLAN) | ⭐⭐⭐ | `[ ]` |

### Contrôles Détectifs

| Contrôle | Efficacité | Implémenté |
|----------|------------|------------|
| IDS/IPS réseau | ⭐⭐⭐⭐ | `[ ]` |
| Monitoring anomalies de montant | ⭐⭐⭐⭐ | `[ ]` |
| Corrélation transactions/rapprochements | ⭐⭐⭐⭐⭐ | `[ ]` |
| Alertes sur écarts de réconciliation | ⭐⭐⭐⭐ | `[ ]` |

### Contrôles Correctifs

| Contrôle | Délai de réponse |
|----------|-----------------|
| Blocage automatique du terminal | Immédiat |
| Révocation des clés compromises | < 1 heure |
| Rollback des transactions suspectes | < 24 heures |
| Notification des parties prenantes | < 4 heures (RGPD) |

---

## 📈 Matrice de Risque

```
PROBABILITÉ
     ↑
Haute│  ┌───────────┐
     │  │ 🔴 AVANT  │
     │  │   FIX     │
     │  └───────────┘
Moyen│
     │
Faible   ┌───────────┐
     │   │ 🟢 APRÈS  │
     │   │   FIX     │
     │   └───────────┘
     └──────────────────────────→ IMPACT
         Faible   Moyen   Élevé
```

---

## 🔧 Plan de Remédiation

### Phase 1 : Court terme (0-2 semaines)

1. **Audit de la configuration actuelle**
   - Vérifier présence MAC sur tous les champs critiques
   - Inventorier les connexions sans TLS

2. **Quick wins**
   - Activer le monitoring des anomalies de montant
   - Configurer les alertes de réconciliation

### Phase 2 : Moyen terme (2-8 semaines)

1. **Implémentation MAC obligatoire**
   - Déployer `fix-mac-mandatory.js`
   - Tester sur environnement de préproduction
   - Migration progressive des terminaux

2. **Upgrade TLS**
   - Passer tous les liens en TLS 1.3
   - Désactiver les protocoles obsolètes

### Phase 3 : Long terme (2-6 mois)

1. **Architecture Zero Trust**
   - Segmentation réseau complète
   - Authentification mutuelle TLS
   - Rotation automatique des clés

---

## ✅ KPIs de Suivi

| Indicateur | Cible | Actuel |
|------------|-------|--------|
| % transactions avec MAC valide | 100% | __% |
| % connexions TLS 1.3 | 100% | __% |
| Délai moyen de détection anomalie | < 5 min | __ min |
| Temps de réponse incident | < 15 min | __ min |
| Taux de faux positifs monitoring | < 1% | __% |

---

## 📚 Références

- ISO 8583:2003 - Financial transaction card originated messages
- ISO 9797-1 - Message Authentication Codes
- PCI-DSS v4.0 Requirement 4.1
- NIST SP 800-52 Rev. 2 - TLS Guidelines
