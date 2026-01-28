# Atelier 5 : Gestion des Clés

## 🎯 Objectif
Comprendre la hiérarchie des clés cryptographiques et les processus de rotation et récupération.

---

## 📚 Théorie

### Hiérarchie des Clés

```
                    ┌─────────────────────────────┐
                    │      MASTER KEY (ZMK)       │
                    │   Stockée dans le HSM       │
                    │   Ne sort JAMAIS            │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │         DÉRIVATION          │
                    └──────────────┬──────────────┘
                                   │
       ┌───────────────────────────┼───────────────────────────┐
       ▼                           ▼                           ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│     ZPK      │          │     ZAK      │          │     ZEK      │
│  (PIN Keys)  │          │ (Auth Keys)  │          │ (Data Keys)  │
└──────────────┘          └──────────────┘          └──────────────┘
       │                           │                           │
       ▼                           ▼                           ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│  Session Key │          │  Session Key │          │  Session Key │
│  (par TX)    │          │  (par TX)    │          │  (par TX)    │
└──────────────┘          └──────────────┘          └──────────────┘
```

### Key Check Value (KCV)

Le **KCV** permet de vérifier l'intégrité d'une clé sans l'exposer :
- Chiffrer 8 octets de zéros avec la clé
- Prendre les 3 premiers octets du résultat
- Comparer avec le KCV attendu

### Rotation des Clés

| Fréquence | Type de Clé | Raison |
|-----------|-------------|--------|
| Annuelle | Master Key | Conformité PCI DSS |
| Mensuelle | Zone Keys | Limiter l'exposition |
| Par session | Working Keys | Sécurité maximale |

---

## 🧪 Exercices

### Exercice 1 : Dériver une Clé de Session

1. Ouvrez `key-derivation-tool.js`
2. Utilisez la clé maître pour dériver une clé de session
3. Vérifiez le KCV de la clé dérivée

```bash
node key-derivation-tool.js
```

### Exercice 2 : Rotation de Clés

1. Ouvrez `key-rotation-simulator.js`
2. Simulez une rotation de la ZPK
3. Observez le processus de re-chiffrement

### Exercice 3 : Récupération après Compromission

Scénario : La ZPK a été compromise !
1. Générer une nouvelle ZPK
2. Distribuer aux terminaux
3. Vérifier que les anciens PIN Blocks sont invalidés

---

## 📁 Fichiers de l'Atelier

| Fichier | Description |
|---------|-------------|
| `key-derivation-tool.js` | Outil de dérivation de clés |
| `key-rotation-simulator.js` | Simulateur de rotation |

---

## ⚠️ Points de Sécurité

> **RAPPEL PCI DSS** :
> - Les clés maîtres doivent être sous double contrôle
> - Minimum 2 personnes pour toute opération sur les clés
> - Audit trail obligatoire pour toutes les opérations

---

## ✅ Critères de Validation

- [ ] Vous comprenez la hiérarchie des clés
- [ ] Vous savez calculer un KCV
- [ ] Vous pouvez expliquer le processus de rotation
- [ ] Vous comprenez les implications d'une compromission
