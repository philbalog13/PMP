# 🏦 Ateliers Pédagogiques PMP

> **Suite complete de 15 ateliers pour maitriser les systemes monetiques**

![Workshops](https://img.shields.io/badge/Ateliers-15-blue.svg)
![Niveau](https://img.shields.io/badge/Niveau-Débutant_à_Expert-orange.svg)
![Durée](https://img.shields.io/badge/Durée_Totale-~31h-green.svg)

---

## 📚 Liste des Ateliers

### 🟢 Niveau Débutant (Ateliers 1-3)

| # | Atelier | Durée | Difficulté | Fichiers |
|---|---------|-------|------------|----------|
| 1 | [Flux Transactionnel Complet](./atelier-01-flux-transaction/) | 2h | ⭐⭐ | 3 |
| 2 | [PIN Block ISO 9564](./atelier-02-pin-block/) | 2h | ⭐⭐⭐ | 3 |
| 3 | [Attaque par Rejeu](./atelier-03-replay-attack/) | 2h | ⭐⭐⭐ | 3 |

### 🟡 Niveau Intermédiaire (Ateliers 4-9)

| # | Atelier | Durée | Difficulté | Fichiers |
|---|---------|-------|------------|----------|
| 4 | [Détection de Fraude](./atelier-04-fraud-detection/) | 2h | ⭐⭐⭐ | 3 |
| 5 | [Gestion des Clés](./atelier-05-key-management/) | 2h | ⭐⭐⭐⭐ | 3 |
| 6 | [Messages ISO 8583](./atelier-06-iso8583/) | 2h | ⭐⭐⭐ | 3 |
| 7 | [MAC et Intégrité ISO 9797](./atelier-07-mac-integrity/) | 1.5h | ⭐⭐⭐ | 3 |
| 8 | [Scénarios de Refus](./atelier-08-decline-scenarios/) | 1.5h | ⭐⭐ | 3 |
| 9 | [Audit et Logging](./atelier-09-audit-logging/) | 1.5h | ⭐⭐ | 3 |

### 🔴 Niveau Avancé (Ateliers 10-14)

| # | Atelier | Durée | Difficulté | Fichiers |
|---|---------|-------|------------|----------|
| 10 | [Challenge Final](./atelier-10-challenge-final/) | 3h | ⭐⭐⭐⭐⭐ | 3 |
| 11 | [CVV Statique vs Dynamique](./atelier-11-cvv/) | 1.5h | ⭐⭐⭐ | 3 |
| 12 | [3D-Secure Pédagogique](./atelier-12-3d-secure/) | 2h | ⭐⭐⭐⭐ | 3 |
| 13 | [Tokenisation des Cartes](./atelier-13-tokenisation/) | 1.5h | ⭐⭐⭐⭐ | 3 |
| 14 | [Conformité PCI-DSS](./atelier-14-pci-dss/) | 2h | ⭐⭐⭐⭐ | 3 |

### 🔥 Red Team / Blue Team (Atelier 15)

| # | Scénario | Exploit | Détection | Correctif |
|---|----------|---------|-----------|-----------|
| 15.1 | [MitM ISO 8583](./atelier-15-security-attacks/scenario-01-mitm/) | `mitm-attack.js` | `mac-verification-tool.js` | MAC obligatoire |
| 15.2 | [PAN Harvesting](./atelier-15-security-attacks/scenario-02-pan-harvesting/) | `pan-extractor.py` | `pci-scanner.sh` | Masking + chiffrement |
| 15.3 | [Weak PIN Encryption](./atelier-15-security-attacks/scenario-03-weak-pin/) | `pin-cracker.go` | `key-rotation-checker.js` | DUKPT |
| 15.4 | [Authorization Bypass](./atelier-15-security-attacks/scenario-04-auth-bypass/) | `auth-bypass.py` | `consistency-verifier.js` | Signature réponses |
| 15.5 | [DoS Attack](./atelier-15-security-attacks/scenario-05-dos/) | `auth-flooder.js` | `traffic-analyzer.py` | Rate limiting |

---

## 🎯 Objectifs Pédagogiques

À la fin de ces ateliers, vous serez capable de :

1. **Comprendre** le flux complet d'une transaction carte bancaire
2. **Implémenter** les mécanismes cryptographiques (PIN Block, MAC)
3. **Détecter** et **prévenir** les attaques courantes
4. **Configurer** des règles de détection de fraude
5. **Gérer** la hiérarchie et la rotation des clés
6. **Construire** et **parser** des messages ISO 8583
7. **Auditer** les transactions pour la conformité

---

## 🛠️ Prérequis

- Node.js 18+
- Plateforme PMP lancée (`docker compose -f docker-compose-runtime.yml up -d`)
- Connaissances basiques en JavaScript/TypeScript
- Navigateur moderne (pour les simulateurs HTML)

---

## 🚀 Démarrage

```bash
# 1. Naviguer vers les ateliers
cd docs/workshops

# 2. Commencer par l'atelier 1
cd atelier-01-flux-transaction
# Lire le README.md et suivre les instructions
```

---

## 📖 Structure de Chaque Atelier

```
atelier-XX-nom/
├── README.md           # Instructions et théorie
├── exercice-*.js       # Code à compléter
└── solution-*.js       # Solutions (spoiler!)
```

---

**Bon apprentissage ! 🎓**
