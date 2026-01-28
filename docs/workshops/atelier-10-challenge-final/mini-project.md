# Mini-Projet : Processeur de Transactions

## Contexte

Vous êtes développeur chez une fintech et devez créer un prototype de processeur de transactions qui intègre toutes les couches de sécurité apprises dans les ateliers précédents.

## Objectifs Fonctionnels

### 1. Réception et Validation
- Valider le format de la requête JSON
- Vérifier le numéro de carte (algorithme de Luhn)
- Vérifier que le montant est positif

### 2. Sécurité Cryptographique
- Générer un PIN Block Format 0 (ISO 9564)
- Calculer un MAC HMAC-SHA256 sur le message

### 3. Anti-Fraude
- Vérifier les règles de velocity (max 5 TX / 10 min)
- Calculer un score de risque
- Bloquer si score > 80

### 4. Anti-Rejeu
- Vérifier unicité STAN + Terminal + Date
- Rejeter les doublons dans les 5 minutes

### 5. Logging
- Logger chaque étape avec timestamp
- Formater au standard JSON Lines

## Contraintes Techniques

- TypeScript ou JavaScript
- Pas de dépendances externes (sauf crypto natif)
- Le code doit être lisible et documenté

## Livrables

1. `transaction-processor.ts` - Le code principal
2. Tests avec au moins 5 scénarios différents
3. Documentation des choix techniques

## Barème

| Critère | Points |
|---------|--------|
| Validation entrée | 10 |
| PIN Block correct | 20 |
| MAC valide | 15 |
| Détection fraude | 20 |
| Anti-rejeu | 15 |
| Logging complet | 10 |
| Qualité code | 10 |
| **Total** | **100** |

## Ressources

Vous pouvez réutiliser le code des ateliers 1-9 comme base.

Bonne chance ! 🚀
