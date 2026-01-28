# Atelier 9 : Audit et Logging

## 🎯 Objectif
Implémenter un système de traçabilité complet pour la conformité et le debug.

---

## 📚 Théorie

### Exigences PCI DSS

| Exigence | Description |
|----------|-------------|
| 10.2 | Logger toutes les actions sur les données sensibles |
| 10.3 | Inclure: user ID, type, date/heure, succès/échec |
| 10.5 | Protéger les logs contre toute modification |
| 10.7 | Conserver les logs au moins 1 an |

### Structure d'un Log d'Audit

```json
{
  "timestamp": "2026-01-28T14:30:55.123Z",
  "event_type": "TRANSACTION_AUTHORIZED",
  "actor": { "type": "TERMINAL", "id": "TERM0001" },
  "resource": { "type": "CARD", "id": "****1111" },
  "action": "AUTHORIZE",
  "result": "SUCCESS",
  "metadata": { "amount": 50.00, "response_code": "00" }
}
```

---

## 🧪 Exercices

### Exercice 1 : Analyser les Logs

```bash
node log-analyzer.js
```

### Exercice 2 : Viewer Interactif

Ouvrez `audit-viewer.html` pour visualiser et filtrer les logs.

### Exercice 3 : Détection d'Anomalies

Analysez les patterns pour détecter les comportements suspects.

---

## 📁 Fichiers

| Fichier | Description |
|---------|-------------|
| `log-analyzer.js` | Analyseur de logs |
| `audit-viewer.html` | Viewer interactif |

---

## ✅ Critères de Validation

- [ ] Vous connaissez les exigences PCI DSS pour le logging
- [ ] Vous savez structurer un log d'audit
- [ ] Vous pouvez analyser les patterns de logs
