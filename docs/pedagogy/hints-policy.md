# Politique hints CTF/Labs (L1/L2/L3)

Date: 2026-02-22
Portee: CTF, labs, ateliers
Dependance: `docs/pedagogy/templates/challenge-statement.md`

## Objectif
Fournir des hints progressifs qui debloquent l'etudiant sans casser la logique Learn by Hacking + PBL.

## Niveaux obligatoires
| Niveau | Intention | Ce qui est autorise | Ce qui est interdit |
|---|---|---|---|
| L1 Orientation | Debloquer la direction | Indice conceptuel, endpoint probable, classe de vuln | Payload exact, valeur exacte de flag, procedure complete |
| L2 Technique | Debloquer l'execution | Parametre critique, format de requete, outil a utiliser | Solution complete copier-coller |
| L3 Quasi-solution | Debloquer la fin | Sequence presque complete, checks de validation | Flag en clair, explication qui retire tout raisonnement |

## Regles anti-spoil
1. L1 ne doit jamais contenir de commande exploitable complete.
2. L2 doit exiger au moins une adaptation par l'etudiant.
3. L3 peut fournir un squelette presque complet, mais jamais le flag.
4. Aucun hint ne doit contredire l'enonce ni le mode (blackbox/whitebox).

## Regles de release progressive
- L1 disponible apres: 8 minutes ou 2 tentatives invalides.
- L2 disponible apres: 18 minutes ou 5 tentatives invalides.
- L3 disponible apres: 30 minutes ou 8 tentatives invalides.

## Format standard d'un hint
- `hintNumber`: [1..3]
- `hintText`: [texte actionnable]
- `costPoints`: [penalite pedagogique]
- `expectedUnlock`: [ce que l'etudiant devrait pouvoir faire apres lecture]

## Bareme recommande de cout
- L1: 5 points
- L2: 10-15 points
- L3: 25 points

## Controle qualite avant publication
1. Verifier la coherence avec l'objectif du challenge.
2. Verifier que L1 n'est pas un spoiler.
3. Verifier qu'au moins un dead-end frequent est adresse.
4. Verifier que la progression L1 -> L2 -> L3 est reelle.

## Exemples

### Exemple L1 (acceptable)
"Regarde les endpoints de debug exposes sans authentification et compare les codes HTTP."

### Exemple L2 (acceptable)
"Teste `GET /transaction/bin-table` avec et sans header `x-student-id` puis inspecte la reponse JSON."

### Exemple L3 (acceptable)
"Utilise `curl -s -H 'x-student-id: ...' http://sim-network-switch:8004/transaction/bin-table | jq .` puis recupere la valeur du champ `flag`."

### Exemple interdit
"Le flag est PMP{...} et la commande exacte est ..."
