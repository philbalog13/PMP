# Atelier 14 : Audit et Conformité PCI-DSS

## 🎯 Objectif
Comprendre les exigences PCI-DSS et implémenter un système d'audit conforme.

**Durée estimée**: 2h  
**Prérequis**: Tous les ateliers précédents (concepts de sécurité)

---

## 📚 Théorie

### Qu'est-ce que PCI-DSS ?

**PCI-DSS** = Payment Card Industry Data Security Standard

Standard de sécurité pour toutes les entités qui stockent, traitent ou transmettent des données de carte.

### Les 12 Exigences PCI-DSS

```
┌─────────────────────────────────────────────────────────────┐
│               12 EXIGENCES PCI-DSS 4.0                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔒 CONSTRUIRE UN RÉSEAU SÉCURISÉ                           │
│  1. Installer et maintenir des pare-feux                    │
│  2. Ne pas utiliser les mots de passe par défaut            │
│                                                             │
│  🔐 PROTÉGER LES DONNÉES CARTE                              │
│  3. Protéger les données stockées                           │
│  4. Chiffrer la transmission des données                    │
│                                                             │
│  🛡️ MAINTENIR UN PROGRAMME DE GESTION DES VULNÉRABILITÉS   │
│  5. Protéger contre les malwares                            │
│  6. Développer des systèmes sécurisés                       │
│                                                             │
│  🔑 IMPLÉMENTER DES CONTRÔLES D'ACCÈS                       │
│  7. Restreindre l'accès aux données (need-to-know)          │
│  8. Identifier et authentifier les accès                    │
│  9. Restreindre l'accès physique                            │
│                                                             │
│  📊 SURVEILLER ET TESTER RÉGULIÈREMENT                      │
│  10. Tracer et surveiller tous les accès                    │
│  11. Tester régulièrement la sécurité                       │
│                                                             │
│  📋 MAINTENIR UNE POLITIQUE DE SÉCURITÉ                     │
│  12. Maintenir une politique de sécurité                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Focus sur l'Exigence 10 (Audit Logging)

| Sous-exigence | Description |
|---------------|-------------|
| 10.2.1 | Accès utilisateur aux données carte |
| 10.2.2 | Actions root/admin |
| 10.2.3 | Accès aux logs d'audit |
| 10.2.4 | Tentatives d'accès invalides |
| 10.2.5 | Modifications des mécanismes d'auth |
| 10.2.6 | Initialisation/arrêt des logs |
| 10.2.7 | Création/suppression d'objets système |

### Contenu Minimum d'un Log

```json
{
  "timestamp": "2026-01-28T14:30:55.123Z",
  "user_id": "admin@example.com",
  "source_ip": "192.168.1.100",
  "event_type": "DATA_ACCESS",
  "resource": "cardholder_data",
  "action": "READ",
  "result": "SUCCESS",
  "card_data_accessed": true,
  "pan_last4": "1111"
}
```

---

## 🧪 Exercices

### Exercice 1 : Vérifier la Conformité

```bash
node compliance-auditor.js
```

### Exercice 2 : Checklist PCI-DSS

Parcourez `pci-checklist.json` et évaluez votre système.

### Exercice 3 : Analyser les Logs d'Audit

Utilisez les outils de l'Atelier 9 pour vérifier que vos logs sont conformes.

---

## 📁 Fichiers de l'Atelier

| Fichier | Description |
|---------|-------------|
| `compliance-auditor.js` | Outil d'audit de conformité |
| `pci-checklist.json` | Checklist des exigences |

---

## 📝 Quiz d'Évaluation

1. **Combien d'exigences principales comporte PCI-DSS ?**
   - [ ] a) 6
   - [ ] b) 10
   - [ ] c) 12
   - [ ] d) 15

2. **L'exigence 10 concerne :**
   - [ ] a) Le chiffrement
   - [ ] b) Les pare-feux
   - [ ] c) Le logging et la surveillance
   - [ ] d) La gestion des clés

3. **Combien de temps les logs doivent-ils être conservés ?**
   - [ ] a) 3 mois
   - [ ] b) 6 mois
   - [ ] c) 12 mois
   - [ ] d) 24 mois

4. **Qui doit être conforme PCI-DSS ?**
   - [ ] a) Uniquement les banques
   - [ ] b) Uniquement les marchands
   - [ ] c) Toute entité manipulant des données carte
   - [ ] d) Uniquement les PSP

5. **Le PAN peut être stocké en clair si :**
   - [ ] a) C'est temporaire
   - [ ] b) Il y a un pare-feu
   - [ ] c) Jamais sans protection
   - [ ] d) Le client accepte

**Correction**: disponible uniquement dans la version formateur.

---

## 🎯 Prolongements Avancés

1. **Implémenter un SIEM (Security Information and Event Management)**
2. **Créer un rapport SAQ (Self-Assessment Questionnaire)**
3. **Automatiser les tests de conformité PCI**

---

## ✅ Critères de Validation

- [ ] Vous connaissez les 12 exigences PCI-DSS
- [ ] Vous comprenez l'importance du logging (Exigence 10)
- [ ] Vous savez quelles données doivent être loggées
- [ ] Vous comprenez le scope PCI et comment le réduire


