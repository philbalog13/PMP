# 📚 Guide Étudiant - PMP Platform

Bienvenue dans la Plateforme Monétique Pédagogique ! Ce guide vous aidera à naviguer efficacement dans votre parcours d'apprentissage.

---

## 🎯 Accès à la plateforme

**URL**: http://localhost:3001/student

**Identifiants de test**:
- Email: `student01@pmp.edu`
- Password: `student123`

---

## 📖 Votre Dashboard

Votre tableau de bord affiche :

### Modules disponibles
Chaque module contient :
- **Théorie** 📖 : Cours complet avec exemples
- **Exercices pratiques** 🧪 : Laboratoires interactifs
- **Quiz de validation** ✅ : 5 questions (80% requis pour passer)

### Progression
- Barre de progression par module
- Badges débloqués
- Historique des exercices

### Actions rapides
Pour chaque module :
- **→ Continuer l'exercice** : Lance l'exercice pratique dans l'app appropriée
- **📖 Lire la théorie** : Accède au contenu pédagogique
- **✅ Passer le quiz** : Valide tes connaissances

---

## 🧪 Exercices Pratiques

### TPE-Web (Terminal de Paiement)
**URL**: http://localhost:3000?role=etudiant&module=X

**Exercices disponibles**:
- Module 4: Décodage ISO 8583
- Module 5: Flux 3D Secure

**Mode Étudiant**:
- Explications contextuelles activées
- Debug view visible
- Step-by-step guidance

**Comment compléter un exercice**:
1. Suivez les instructions à l'écran
2. Testez différents scénarios
3. Cliquez sur "Valider l'exercice" quand terminé
4. Retournez au Portal automatiquement

### HSM-Web (Lab Cryptographie)
**URL**: http://localhost:3081?role=etudiant&lab=X

**Labs disponibles**:
- Module 6: PIN validation
- Module 6: Key management basics

**Ce que vous apprendrez**:
- Génération de clés cryptographiques
- Chiffrement/déchiffrement
- Gestion des certificats

### User-Cards-Web (Gestion Cartes)
**URL**: http://localhost:3006?role=etudiant

**Fonctionnalités**:
- Créer des cartes de test
- Visualiser les transactions
- Comprendre les data elements

---

## ✅ Quiz de Validation

### Règles
- **5 questions** par quiz
- **80% minimum** pour valider (4/5 réponses correctes)
- **Nombre d'essais illimité**
- **Correction détaillée** fournie à la fin

### Comment passer un quiz

1. **Accéder au quiz**
   - Depuis votre dashboard : cliquez sur "✅ Passer le quiz"
   - Ou directement : `/student/quiz/[moduleId]`

2. **Répondre aux questions**
   - Sélectionnez votre réponse
   - Cliquez "Suivant" pour continuer
   - Vous pouvez revenir en arrière avec "Précédent"

3. **Voir les résultats**
   - Score en pourcentage
   - Correction détaillée avec explications
   - Badge si validation réussie (≥80%)

4. **En cas d'échec**
   - Relisez la théorie
   - Refaites les exercices
   - Réessayez le quiz (bouton "Réessayer")

---

## 🏆 Badges et Récompenses

### Badges disponibles
- **ISO Master** 📜 : Valider Module 4
- **Key Guardian** 🔒 : Valider Module 6
- **3DS Expert** 🛡️ : Valider Module 5
- **Fast Lane** ⚡ : Compléter un module en < 30 min

### Points
- Exercice complété : +100 pts
- Quiz réussi (80-90%) : +150 pts
- Quiz réussi (90-100%) : +200 pts
- Quiz échoué : +0 pts (mais vous pouvez réessayer !)

---

## 🗺️ Parcours Recommandé

### Niveau Débutant
1. **Module 04**: Protocoles ISO 8583
   - Comprendre la structure des messages
   - Apprendre les codes de réponse
   - Exercice TPE simple

2. **Module 05**: 3D Secure
   - Découvrir l'authentification forte
   - Tester le flux ACS/DS
   - Exercice 3DS challenge

### Niveau Intermédiaire
3. **Module 06**: Cryptographie HSM
   - Hiérarchie des clés
   - PIN encryption
   - Lab HSM complet

### Niveau Avancé
4. **Module 07**: Fraude & Risk Scoring (À venir)
   - Patterns de fraude
   - Détection de velocity
   - Machine learning basics

---

## 🆘 Besoin d'Aide ?

### Support Formateur
Si vous êtes bloqué, votre formateur peut :
- Voir votre progression en temps réel
- Injecter des conditions de test
- Vous débloquer un module

### Ressources
- **Monitoring Dashboard** : http://localhost:3082 (lecture seule)
- **Documentation technique** : `/docs`
- **Forum étudiant** : (À venir)

### Problèmes Techniques
1. Vérifiez que tous les services sont démarrés :
   ```bash
   docker-compose up -d
   npm run dev --workspace=portal
   ```

2. En cas d'erreur d'auth :
   - Déconnectez-vous et reconnectez-vous
   - Effacez le localStorage du navigateur

3. Module bloqué ?
   - Contactez votre formateur
   - Il peut réinitialiser votre progression

---

## 📊 Suivi de Progression

### Tableau de bord
- **Points totaux** : Visible en haut à droite
- **Grade** : Level 1 → Level 10 (basé sur points)
- **Modules validés** : Checkmark vert ✅
- **Modules en cours** : Barre de progression
- **Modules verrouillés** : Icône cadenas 🔒

### Historique
Visible dans la sidebar droite :
- Derniers exercices complétés
- Scores quiz récents
- Badges débloqués

### Objectif Final
**Certification d'Expert Monétique** 🎓
- Valider tous les modules disponibles
- Obtenir au moins 90% à tous les quiz
- Compléter tous les labs avancés

---

## 🚀 Conseils de Réussite

1. **Lisez la théorie AVANT les exercices**
   - Meilleure compréhension
   - Moins d'essais-erreurs

2. **Prenez des notes**
   - Les concepts sont cumulatifs
   - Module 6 s'appuie sur Module 4

3. **Expérimentez !**
   - Les labs sont un environnement sûr
   - Testez des scénarios d'erreur

4. **Ne trichez pas aux quiz**
   - Les réponses sont expliquées à la fin
   - L'apprentissage est l'objectif, pas juste le badge

5. **Collaborez (mais pas aux quiz)**
   - Discutez avec vos camarades
   - Partagez vos découvertes
   - Entraide sur les exercices

---

## 📅 Planning Suggéré

### Semaine 1
- Module 04: ISO 8583 (3h)
- Quiz + révisions (1h)

### Semaine 2
- Module 05: 3D Secure (4h)
- Quiz + labs (2h)

### Semaine 3
- Module 06: Cryptographie HSM (5h)
- Quiz + certification (2h)

### Total
**~17 heures** pour compléter le parcours complet

---

Bonne chance dans votre apprentissage ! 🎓💪

**Questions ?** Contactez votre formateur via le hub instructor.
