# Atelier 15 : Scénarios d'Attaque en Monétique

## ⚠️ AVERTISSEMENT

> **Ce contenu est strictement PÉDAGOGIQUE.**  
> Les exploits présentés sont destinés à comprendre les vulnérabilités  
> pour mieux s'en protéger. Toute utilisation malveillante est ILLÉGALE.

**Durée estimée**: 4h  
**Niveau**: Expert ⭐⭐⭐⭐⭐  
**Prérequis**: Ateliers 1-14 (tous)

---

## 📚 Les 5 Scénarios

| Scénario | Vulnérabilité | Impact | Difficulté |
|----------|--------------|--------|------------|
| 1. [MitM ISO 8583](./scenario-01-mitm/) | Absence de MAC | Modification de montant | ⭐⭐⭐⭐ |
| 2. [PAN Harvesting](./scenario-02-pan-harvesting/) | Logs non chiffrés | Vol de données carte | ⭐⭐⭐ |
| 3. [Weak PIN Encryption](./scenario-03-weak-pin/) | Clé statique | Brute force PIN | ⭐⭐⭐⭐⭐ |
| 4. [Authorization Bypass](./scenario-04-auth-bypass/) | Validation insuffisante | Transactions non autorisées | ⭐⭐⭐⭐ |
| 5. [DoS Attack](./scenario-05-dos/) | Pas de rate limiting | Déni de service | ⭐⭐⭐ |

---

## 🎯 Structure de Chaque Scénario

```
scenario-XX-nom/
├── README.md           # Description de la vulnérabilité
├── exploit-*.js/py/go  # Code d'exploitation (POC)
├── detection-*.js      # Outil de détection
└── fix-*.js            # Correctif implémenté
```

---

## 🔐 Approche Red Team / Blue Team

Pour chaque scénario :

1. **🔴 Red Team**: Exécutez l'exploit pour comprendre l'attaque
2. **🔍 Detection**: Utilisez l'outil de détection pour identifier la faille
3. **🔵 Blue Team**: Appliquez le correctif et vérifiez qu'il fonctionne

---

## 📋 Checklist d'Apprentissage

- [ ] Comprendre chaque vecteur d'attaque
- [ ] Exécuter les exploits en environnement contrôlé
- [ ] Détecter les vulnérabilités
- [ ] Implémenter les correctifs
- [ ] Vérifier l'efficacité des protections
