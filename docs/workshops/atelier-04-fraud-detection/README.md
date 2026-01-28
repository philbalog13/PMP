# Atelier 4 : Détection de Fraude Basique

## 🎯 Objectif
Implémenter des règles de détection anti-fraude pour protéger les transactions.

---

## 📚 Théorie

### Types de Détection de Fraude

| Type | Description | Exemple |
|------|-------------|---------|
| **Règles** | Conditions explicites | Montant > 5000€ |
| **Velocity** | Fréquence des transactions | 10+ TX/heure |
| **Géolocalisation** | Distance impossible | Paris → Tokyo en 1h |
| **Comportement** | Écart par rapport à l'historique | Achat nocturne inhabituel |

### Score de Risque

```
Score Total = Σ (Poids[règle] × Déclenchée[règle])

0-30:   🟢 LOW       → Approuver
31-60:  🟡 MEDIUM    → Review optionnel
61-80:  🟠 HIGH      → Alerte + Review
81-100: 🔴 CRITICAL  → Bloquer automatiquement
```

---

## 🧪 Exercices

### Exercice 1 : Velocity Checking

Détectez les patterns de fréquence anormale :
- Plus de 3 transactions en 10 minutes
- Plus de 10 transactions en 1 heure
- Plus de 20 transactions en 24 heures

### Exercice 2 : Analyse Géographique

Implémentez la détection de "voyage impossible" :
- Transaction à Paris à 10:00
- Transaction à New York à 11:00
- Vitesse requise: ~5500 km/h (impossible!)

### Exercice 3 : Comportement Anormal

Détectez les écarts par rapport au comportement habituel :
- MCC (catégorie marchande) jamais utilisé
- Pays jamais visité
- Montant 5x supérieur à la moyenne

---

## 📁 Fichiers de l'Atelier

| Fichier | Description |
|---------|-------------|
| `fraud-rules.json` | Configuration des règles de fraude |
| `anomaly-detector.js` | Moteur de détection d'anomalies |

---

## ✅ Critères de Validation

- [ ] Vous comprenez le concept de scoring de risque
- [ ] Vous pouvez implémenter une règle de velocity
- [ ] Vous savez détecter un voyage impossible
- [ ] Vous comprenez l'importance du contexte historique
