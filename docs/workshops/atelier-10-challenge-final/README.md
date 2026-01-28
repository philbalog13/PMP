# Atelier 10 : Challenge Final 🏆

## 🎯 Objectif
Mettre en pratique toutes les connaissances acquises dans un mini-projet intégrateur.

---

## 📋 Le Défi

Vous devez créer un **mini-processeur de transactions** qui :

1. ✅ Reçoit une demande d'autorisation (format simplifié)
2. ✅ Génère un PIN Block et un MAC
3. ✅ Vérifie les règles anti-fraude
4. ✅ Détecte les tentatives de rejeu
5. ✅ Retourne une réponse formatée
6. ✅ Logue l'opération pour audit

---

## 📝 Spécifications

### Entrée (Request)

```json
{
  "terminalId": "TERM0001",
  "merchantId": "MERCH000000001",
  "pan": "4111111111111111",
  "pin": "1234",
  "amount": 50.00,
  "currency": "EUR"
}
```

### Sortie (Response)

```json
{
  "approved": true,
  "responseCode": "00",
  "authCode": "A12345",
  "stan": "123456",
  "timestamp": "2026-01-28T14:30:00Z",
  "fraudScore": 15
}
```

---

## 🏗️ Architecture Requise

```
┌─────────────────┐
│  Entrée JSON    │
└────────┬────────┘
         ▼
┌─────────────────┐
│  PIN Block Gen  │ ← Atelier 2
└────────┬────────┘
         ▼
┌─────────────────┐
│  Replay Check   │ ← Atelier 3
└────────┬────────┘
         ▼
┌─────────────────┐
│  Fraud Rules    │ ← Atelier 4
└────────┬────────┘
         ▼
┌─────────────────┐
│  Build ISO8583  │ ← Atelier 6
└────────┬────────┘
         ▼
┌─────────────────┐
│  Generate MAC   │ ← Atelier 7
└────────┬────────┘
         ▼
┌─────────────────┐
│  Audit Log      │ ← Atelier 9
└────────┬────────┘
         ▼
┌─────────────────┐
│  Response JSON  │
└─────────────────┘
```

---

## 🧪 Exercices

### Niveau 1 : Implémenter le Squelette

Complétez `solution-template.ts` avec les fonctions de base.

### Niveau 2 : Ajouter les Validations

Intégrez les règles de fraude et la détection de rejeu.

### Niveau 3 : Mode Production

Ajoutez le logging structuré et les métriques.

---

## 📁 Fichiers

| Fichier | Description |
|---------|-------------|
| `mini-project.md` | Consignes détaillées |
| `solution-template.ts` | Template à compléter |

---

## ✅ Critères de Réussite

- [ ] La transaction passe tous les contrôles
- [ ] Le PIN Block est correctement généré
- [ ] Le MAC est valide
- [ ] Les rejeux sont détectés
- [ ] L'audit log est complet

---

## 🎓 Félicitations !

Si vous complétez ce challenge, vous maîtrisez les fondamentaux des systèmes de paiement.

**Bon courage ! 💪**
