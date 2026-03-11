# Evidence P2.2 - Gate parcours etudiant

## Objet

Transformer `scripts/test-student-production-journey.ps1` en vrai gate de parcours, au lieu d'un simple smoke permissif pouvant finir vert avec:

- `0` exercice assigne
- `0%` au quiz
- des logs non alignes sur les vraies valeurs serveur

## Changements appliques

- Le script echoue maintenant si:
  - aucun atelier n'est disponible
  - le contenu atelier est vide
  - le quiz cible n'a pas de questions
  - le quiz ne fournit ni score exploitable ni correction explicite
- La progression atelier affiche les vrais `progress_percent` renvoyes par l'API.
- Les badges affichent `earned/total` au lieu de confondre le catalogue complet avec les badges gagnes.
- La partie exercices est reelle:
  - si le nouvel etudiant n'a aucun exercice assigne, le script cree un formateur temporaire
  - cree un exercice
  - l'assigne a l'etudiant
  - recharge la liste cote etudiant
  - verifie le detail
  - verifie que `solution` n'est pas exposee
  - soumet l'exercice et exige `status=SUBMITTED`
- La partie quiz est reelle:
  - tentative 1 baseline
  - verification du `review`
  - tentative 2 reconstruite a partir des `correctOptionIndex`
  - verification de `passed`, `attempt_number`, `bestScore`
- Le script verifie ensuite la persistence via:
  - `GET /api/progress`
  - `GET /api/progress/stats`
  - `GET /api/progress/badges`
  - `GET /api/progress/quiz/:quizId/results`

## Commande executee

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-student-production-journey.ps1
```

## Resultat runtime

- inscription etudiant: OK
- dashboard etudiant:
  - `GET /api/progress`: OK
  - `GET /api/progress/stats`: OK
  - `GET /api/progress/badges`: OK
- catalogue learning:
  - `6` ateliers disponibles
  - atelier `intro` retenu
  - contenu atelier non vide
- progression atelier:
  - premiere sauvegarde: `20%`
  - deuxieme sauvegarde: `40%`
- exercices:
  - aucun exercice assigne initialement
  - bootstrap formateur temporaire: OK
  - exercice cree: OK
  - exercice assigne: OK
  - detail cote etudiant: OK
  - `solution` non exposee: OK
  - soumission: `SUBMITTED`
- quiz:
  - `quiz-intro` charge avec `10` questions
  - tentative 1: `0%`, mais `review` complet
  - tentative 2: `100%`, `passed=true`
  - historique: `>= 2` tentatives, `bestScore` coherent
- persistence:
  - atelier `intro` en `COMPLETED`
  - stats quiz coherentes
  - quiz present dans l'historique recent
  - badges finaux: `4/13`

## Conclusion

Le parcours etudiant est maintenant gate sur du contenu pedagogique reellement exploitable et sur la persistence serveur, pas seulement sur des `200` HTTP.
