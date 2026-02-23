# Template canonique d'enonce challenge

Date: 2026-02-22
Portee: CTF, labs, ateliers
Reference: `docs/quality/rubric-100.md`

## Objectif
Standardiser tous les enonces avec une structure unique, orientee:
- Learn by Hacking (exploitation reelle)
- Problem Based Learning (hypothese, investigation, preuve, remediation)

## Regles d'usage
1. Tous les blocs ci-dessous sont obligatoires.
2. Le bloc "Objectif exploitation" doit etre measurable.
3. Le bloc "Livrables" doit contenir la preuve d'attaque et la preuve de correction.
4. Le texte doit rester executable en mode blackbox si le challenge l'impose.

---

# [CODE] - [Titre du challenge]

## 1) Mission brief (contexte realiste)
- Role etudiant: [analyste SOC / pentester / engineer / incident responder]
- Contexte metier: [systeme de paiement, service, environnement]
- Incident de depart: [symptome observe]
- Impact potentiel: [fraude, fuite PAN, indisponibilite, non-conformite PCI]

## 2) Objectif exploitation (measurable)
- Ce qui doit etre obtenu: [flag, bypass, extraction, forge, takeover]
- Condition de succes: [reponse attendue, header, champ JSON, preuve log]
- Condition d'echec: [ce qui invalide la tentative]

## 3) Contraintes
- Mode: [blackbox | whitebox | hybride]
- Outils autorises: [AttackBox only / outils specifiques]
- Interdits: [ex: modification infra hors perimetre]
- Limites: [temps, nombre d'essais, cibles hors scope]
- Prerequis: [challenge(s) precedent(s), notions techniques]

## 4) Surface d'attaque et ressources
- Cibles reseau: [URL/services/ports]
- Donnees initiales: [payloads, identifiants de test, contexte]
- Artefacts disponibles: [logs, traces, tickets, captures]

## 5) Livrables obligatoires
1. Preuve d'exploitation:
Commande(s) + sortie(s) prouvant la faille.
2. Flag:
Valeur du flag et source exacte (body/header/log).
3. Analyse d'impact:
Cause racine + impact business et securite.
4. Remediation:
Patch propose (config/code/regle) priorise.
5. Verification post-patch:
Preuve "avant/apres" montrant la correction.

## 6) Workflow Problem Based Learning
1. Formuler une hypothese d'attaque.
2. Concevoir un test minimal.
3. Executer et observer les preuves.
4. Ajuster l'hypothese jusqu'a exploitation fiable.
5. Construire la remediation.
6. Verifier la remediation par un test de non-regression.

## 7) Critere d'evaluation (sur 100)
- Comprendre le probleme et le contexte: 20
- Execution technique de l'exploitation: 25
- Qualite des preuves collectees: 20
- Pertinence de la remediation: 20
- Verification post-patch et communication: 15

## 8) Hints (structure imposee)
- Hint L1 (orientation): [direction sans spoiler]
- Hint L2 (technique): [piste exploitable]
- Hint L3 (quasi-solution): [presque procedure complete]

## 9) Debrief final
- Ce qui a ete compromis:
- Pourquoi le controle a echoue:
- Correctifs immediats:
- Correctifs structurels:
- Lecon transferable:

## 10) Checklist auteur (DoD enonce)
- [ ] Contexte realiste et explicite
- [ ] Objectif exploitation measurable
- [ ] Contraintes et perimetre clairs
- [ ] Livrables complets (attaque + defense)
- [ ] Workflow PBL present
- [ ] Criteres d'evaluation explicites
- [ ] Hints L1/L2/L3 coherents
