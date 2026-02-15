# Guide Etudiant - Sandbox Defense

## Objectif
La sandbox defense suit un flux en 3 etapes:
1. Exploiter une vulnerabilite en lab.
2. Soumettre le flag CTF associe a la faille.
3. Appliquer le correctif via le quiz defense.

## Acces
- Aller sur `Dashboard Etudiant -> Sandbox Defense`.
- Chaque carte de faille affiche un etat:
  - `DEFENSE VERROUILLEE`: il faut d abord soumettre le flag.
  - `QUIZ DEBLOQUE`: le correctif defense est disponible.
  - `SECURISE`: la faille est corrigee pour votre profil.

## Workflow detaille
1. Ouvrir le lab de la faille et recuperer le flag.
   - Depuis chaque carte, cliquer `Ouvrir le lab (flag)` pour acceder au probe.
2. Saisir le flag dans le champ `FLAG{...}` de la carte.
3. Cliquer `Valider le flag`.
4. Une fois debloque, cliquer `Corriger la faille`.
5. Repondre au quiz defense et valider.

## Score
- Le score de securite augmente selon le nombre de failles corrigees.
- Le score est personnel (isole par etudiant).

## Rejouer un lab
- Sur une faille `SECURISE`, utiliser `Reinitialiser` pour repasser la faille en mode vulnerable (sandbox uniquement).

## Bonnes pratiques
- Toujours valider l exploit en environnement autorise uniquement.
- Lire l explication pedagogique apres chaque quiz pour retenir le controle attendu.
- Si une faille reste verrouillee, verifier le format exact du flag.
