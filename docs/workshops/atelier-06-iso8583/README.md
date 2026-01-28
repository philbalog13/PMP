# Atelier 6 : Messages ISO 8583

## 🎯 Objectif
Construire et parser des messages au format ISO 8583 utilisé dans les transactions financières.

---

## 📚 Théorie

### Structure d'un Message ISO 8583

```
┌──────────┬───────────┬─────────────────────────────┐
│   MTI    │  Bitmap   │      Data Elements          │
│ (4 char) │ (16 hex)  │      (variable)             │
└──────────┴───────────┴─────────────────────────────┘
```

### Message Type Indicator (MTI)

| MTI | Description |
|-----|-------------|
| 0100 | Authorization Request |
| 0110 | Authorization Response |
| 0200 | Financial Request |
| 0210 | Financial Response |
| 0400 | Reversal Request |
| 0410 | Reversal Response |

### Champs Essentiels

| DE | Nom | Format | Description |
|----|-----|--------|-------------|
| 2 | PAN | n..19 | Primary Account Number |
| 3 | Processing Code | n6 | Type de transaction |
| 4 | Amount | n12 | Montant (centimes) |
| 11 | STAN | n6 | System Trace Audit Number |
| 12 | Local Time | n6 | hhmmss |
| 13 | Local Date | n4 | MMDD |
| 39 | Response Code | an2 | Code réponse |
| 41 | Terminal ID | ans8 | Identifiant terminal |
| 42 | Merchant ID | ans15 | Identifiant marchand |

---

## 🧪 Exercices

### Exercice 1 : Construire un Message 0100

Utilisez `message-builder.js` pour créer une demande d'autorisation :
```bash
node message-builder.js
```

### Exercice 2 : Décoder un Message

Parsez un message ISO 8583 brut et extrayez les champs.

### Exercice 3 : Créer un Message de Réponse

À partir d'un 0100, construisez le 0110 correspondant avec le code réponse approprié.

---

## 📁 Fichiers

| Fichier | Description |
|---------|-------------|
| `message-builder.js` | Constructeur de messages |
| `field-reference.json` | Référence des champs |

---

## ✅ Critères de Validation

- [ ] Vous comprenez la structure MTI + Bitmap + Data
- [ ] Vous savez identifier les champs obligatoires
- [ ] Vous pouvez construire un message d'autorisation
- [ ] Vous pouvez parser un message reçu
