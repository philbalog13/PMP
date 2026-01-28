# Atelier 1 : Le Flux Transactionnel Complet

## 🎯 Objectif
Comprendre le cheminement complet d'une transaction par carte bancaire, de l'insertion de la carte jusqu'à la réponse finale.

---

## 📚 Théorie

### Les Acteurs d'une Transaction

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│   Terminal  │───▶│  Acquéreur  │───▶│   Réseau    │───▶│   Émetteur  │
│  (Porteur)  │    │    (POS)    │    │  (Banque    │    │   (Switch)  │    │  (Banque    │
│             │    │             │    │  Marchand)  │    │             │    │  Porteur)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          │                  │                  │                  │
                          ▼                  ▼                  ▼                  ▼
                    Collecte des      Validation du     Routage par BIN    Autorisation
                    données carte     commerçant                           (PIN, solde)
```

### Frais et Commissions

| Intervenant | Commission Typique | Rôle |
|-------------|-------------------|------|
| Réseau (Visa/MC) | 0.05-0.15% | Routing, règlement |
| Acquéreur | 0.2-0.5% | Gestion marchand |
| Émetteur | 0.3-0.7% | Interchange |
| **Total MDR** | **0.6-1.5%** | Merchant Discount Rate |

---

## 🧪 Exercices

### Exercice 1 : Tracer une Transaction

1. Ouvrez `transaction-trace.json`
2. Identifiez chaque étape et son timestamp
3. Calculez la latence totale

### Exercice 2 : Identifier les Intervenants

Pour chaque ligne du JSON :
- [ ] Identifier l'acteur source
- [ ] Identifier l'acteur destination
- [ ] Noter le type de message (requête/réponse)

### Exercice 3 : Calculer les Frais

1. Ouvrez `fees-calculator.js` dans votre éditeur
2. Complétez la fonction `calculateFees()`
3. Testez avec différents montants

```bash
node fees-calculator.js 100.00
# Devrait afficher le détail des frais
```

---

## 📁 Fichiers de l'Atelier

| Fichier | Description |
|---------|-------------|
| `transaction-trace.json` | Trace complète d'une transaction |
| `fees-calculator.js` | Calculateur de frais interactif |
| `flow-diagram.html` | Visualisation du flux (bonus) |

---

## ✅ Critères de Validation

- [ ] Vous pouvez expliquer le rôle de chaque acteur
- [ ] Vous comprenez la différence entre requête et réponse
- [ ] Vous savez calculer le MDR (Merchant Discount Rate)
- [ ] Vous pouvez identifier les points de latence

---

## 🔗 Ressources

- [ISO 8583 - Message Format](https://en.wikipedia.org/wiki/ISO_8583)
- [Card Payment Flow](https://stripe.com/docs/payments/cards/overview)
