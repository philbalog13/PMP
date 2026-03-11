-- Seed 052: Semestre 5 cursus pack (734-2, 732-2, 722-2)
-- Source mapping:
-- - c4 (2).pdf -> Module 734-2
-- - c4 (1).pdf -> Module 732-2
-- - c4.pdf     -> Module 722-2
-- - exo.pdf    -> QCM + exercices for the 3 modules
-- All inserts are idempotent via ON CONFLICT DO NOTHING.

-- =============================================================================
-- CURSUS (3 official modules as 3 cursus entries)
-- =============================================================================
INSERT INTO learning.cursus (id, title, description, icon, color, level, estimated_hours, tags, is_published, module_count)
VALUES
(
    'bloc-s5-734-principes',
    'Principes du paiement',
    'Socle de la monétique: acteurs, modèles interbancaires, sécurité, SEPA et architectures de paiement.',
    'credit-card',
    'emerald',
    'DEBUTANT',
    40,
    ARRAY['module-734-2','principes','monetique','paiement','sepa'],
    true,
    1
),
(
    'bloc-s5-732-cp-cnp',
    'Paiements carte présente / carte non présente',
    'EMV pour le card present et 3-D Secure pour le card not present, avec travaux pratiques de simulation.',
    'shield',
    'cyan',
    'INTERMEDIAIRE',
    14,
    ARRAY['module-732-2','emv','3ds','cp','cnp'],
    true,
    1
),
(
    'bloc-s5-722-issuer-acq',
    'Fonctions monétiques : émetteur et acquéreur',
    'Fonctionnement front-office/back-office émetteur-acquéreur, protocoles CB2A/CBAE, GAB et SI bancaire.',
    'layers',
    'amber',
    'INTERMEDIAIRE',
    28,
    ARRAY['module-722-2','issuer','acquirer','cb2a','gab'],
    true,
    1
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MODULES
-- =============================================================================
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES
(
    'mod-s5-734-2-principes',
    'bloc-s5-734-principes',
    'Principes du paiement',
    'Definitions fondamentales, chaine de valeur, securite, modeles industriels et perspectives de paiement electronique.',
    1,
    2400,
    '2',
    6
),
(
    'mod-s5-732-2-cp-cnp',
    'bloc-s5-732-cp-cnp',
    'Paiements carte presente / carte non presente',
    'Architecture EMV, APDU, cryptogrammes, 3-D Secure v1/v2, DSP2 et mise en pratique.',
    1,
    840,
    '3',
    5
),
(
    'mod-s5-722-2-issuer-acq',
    'bloc-s5-722-issuer-acq',
    'Fonctions monetiques : emetteur et acquereur',
    'Roles emetteur/acquereur, front-office, back-office, protocoles d echange et operations de production.',
    1,
    1680,
    '3',
    6
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- CHAPTERS - MODULE 734-2
-- =============================================================================
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES
(
    'ch-s5-734-2-01-concepts',
    'mod-s5-734-2-principes',
    'Definitions et acteurs du paiement',
    $$## Fondations de la relation de paiement

Le paiement electronique repose sur 5 acteurs de reference: **porteur**, **emetteur**, **accepteur**, **acquereur**, **schema**.

```flow
Porteur -> Accepteur: achat
Accepteur -> Acquereur: demande autorisation
Acquereur -> Schema: routage interbancaire
Schema -> Emetteur: verification et decision
Emetteur -> Acquereur: code reponse
Acquereur -> Accepteur: resultat transaction
```

Points de vocabulaire:
- PAN (Primary Account Number)
- Accepteur (merchant)
- Processeur technique
- Interchange
$$,
    '["Le modele a 5 acteurs structure toute transaction carte","Le PAN identifie la carte et son emetteur","Le schema assure le routage et les regles"]'::jsonb,
    1,
    70
),
(
    'ch-s5-734-2-02-flux',
    'mod-s5-734-2-principes',
    'Cycle transactionnel et commissions',
    $$## Autorisation, clearing, settlement

Une transaction suit 3 etapes:
1. Autorisation (temps reel)
2. Clearing/compensation (echanges batch)
3. Settlement/reglement (mouvements financiers nets)

```flow
Autorisation -> Clearing: ticket valide
Clearing -> Settlement: position nette calculee
Settlement -> Creditation commercant: fonds regles
```

Le cout commercant (MSC) agrege:
- interchange (acquereur vers emetteur)
- frais schema
- marge acquereur
$$,
    '["Autorisation et reglement sont des phases distinctes","Le clearing calcule les positions nettes","MSC = interchange + frais schema + marge acquereur"]'::jsonb,
    2,
    75
),
(
    'ch-s5-734-2-03-modele-interbancaire',
    'mod-s5-734-2-principes',
    'Modele interbancaire et standards',
    $$## Groupements et standards de place

Le modele interbancaire combine:
- groupements nationaux (ex: GIE CB)
- schemas internationaux
- standards de message (ISO 8583, ISO 20022)

```flow
TPE -> Acquereur: message transaction
Acquereur -> Reseau interbancaire: format normalise
Reseau interbancaire -> Emetteur: demande autorisation
Emetteur -> Reseau interbancaire: reponse
```

EMV structure l authentification de la carte et du porteur.
$$,
    '["ISO 8583 et ISO 20022 standardisent les echanges","Le routage interbancaire depend du schema et du BIN","EMV ajoute une preuve cryptographique de carte"]'::jsonb,
    3,
    70
),
(
    'ch-s5-734-2-04-securite',
    'mod-s5-734-2-principes',
    'Securite, fraude et regulation',
    $$## Panorama risque et controles

Les risques principaux:
- fraude CNP
- contrefacon
- perte/vol
- fraude interne

```flow
Transaction -> Controle EMV: auth carte
Transaction -> Controle 3DS: auth porteur
Transaction -> Controle PCI DSS: protection donnees
Controle PCI DSS -> Reduction exposition: perimetre maitrise
```

La regulation europeenne (DSP2, IFR) encadre:
- authentification forte
- plafonds interchange
- responsabilites de remboursement
$$,
    '["PCI DSS protege les donnees sensibles","DSP2 impose la logique SCA selon les cas","La fraude se deplace du CP vers le CNP sans controles adaptes"]'::jsonb,
    4,
    75
),
(
    'ch-s5-734-2-05-industrie',
    'mod-s5-734-2-principes',
    'Dispositif industriel et chaine monetique',
    $$## Acteurs industriels et execution

La chaine monetique implique des fabricants, PSP, processeurs et operateurs de reseau.

```flow
Fabricant carte -> Emetteur: personnalisation support
Fabricant TPE -> Acquereur: equipement acceptation
PSP -> Acquereur: orchestration flux
Acquereur -> Emetteur: compensation et reglement
```

Objectif operationnel: disponibilite forte, latence basse et tracabilite bout en bout.
$$,
    '["La chaine de production depasse les seules banques","PSP et processeurs orchestrent la couche technique","Disponibilite et tracabilite sont des exigences critiques"]'::jsonb,
    5,
    65
),
(
    'ch-s5-734-2-06-sepa-futurs',
    'mod-s5-734-2-principes',
    'SEPA et futurs des paiements',
    $$## Instrumentation SEPA et trajectoires futures

Le cadre SEPA couvre:
- SCT / SCT Inst
- SDD
- SCF pour les cartes

```flow
Client -> SCT Inst: virement instantane
Client -> Carte tokenisee: paiement mobile
Carte tokenisee -> Authentification forte: reduction fraude
Authentification forte -> Paiement omnicanal: experience unifiee
```

Les tendances incluent tokenisation, instantaneite, IA antifraude et nouveaux rails europeens.
$$,
    '["SEPA harmonise les paiements en euro","La tokenisation limite l exposition du PAN","Les innovations visent vitesse, securite et interoperabilite"]'::jsonb,
    6,
    65
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- CHAPTERS - MODULE 732-2
-- =============================================================================
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES
(
    'ch-s5-732-2-01-emv-core',
    'mod-s5-732-2-cp-cnp',
    'EMV pour le card present',
    $$## Architecture EMV

EMV securise la transaction carte presente via APDU, authentification carte et gestion du risque.

```flow
Terminal -> Carte: SELECT AID
Terminal -> Carte: GET PROCESSING OPTIONS
Terminal -> Carte: READ RECORD
Terminal -> Carte: GENERATE AC
Terminal -> Acquereur: autorisation online si requise
```

Les mecanismes SDA, DDA, CDA offrent des niveaux progressifs de robustesse.
$$,
    '["EMV est base sur un dialogue APDU structure","DDA et CDA renforcent la resistance a la contrefacon","Le terminal arbitre offline/online selon regles"]'::jsonb,
    1,
    55
),
(
    'ch-s5-732-2-02-cryptogramme-contactless',
    'mod-s5-732-2-cp-cnp',
    'Cryptogramme et sans contact',
    $$## Cryptogramme de transaction et NFC

Le cryptogramme transactionnel prouve la participation effective de la carte.

```flow
Donnees transaction -> Carte: calcul cryptogramme
Carte -> Emetteur: ARQC/TC
Emetteur -> Verification: recalcul + validation
Verification -> Decision: accord ou refus
```

En sans contact, les seuils et compteurs limitent le risque tout en gardant une UX rapide.
$$,
    '["Le cryptogramme relie transaction et cle de la carte","Le sans contact optimise la latence avec garde-fous","La verification emetteur reste decisive en online"]'::jsonb,
    2,
    50
),
(
    'ch-s5-732-2-03-3ds-architecture',
    'mod-s5-732-2-cp-cnp',
    '3-D Secure pour le card not present',
    $$## Flux 3-D Secure v1/v2

3DS deplace la preuve d authentification vers le domaine emetteur.

```flow
Merchant -> 3DS Server: AReq
3DS Server -> Directory Server: routage
Directory Server -> ACS: demande authentification
ACS -> Cardholder: challenge ou frictionless
ACS -> Merchant: resultat + preuve
```

3DS2 apporte plus de donnees contexte et un meilleur support mobile.
$$,
    '["3DS structure le CNP autour de l ACS emetteur","Frictionless reduit la friction client","Le resultat 3DS influence la responsabilite fraude"]'::jsonb,
    3,
    60
),
(
    'ch-s5-732-2-04-dsp2-securite',
    'mod-s5-732-2-cp-cnp',
    'DSP2, SCA et limites de securite',
    $$## Cadre reglementaire et limites pratiques

DSP2 impose la SCA sur de nombreux flux CNP, avec exemptions controlees.

```flow
Transaction CNP -> Evaluation risque: exemption possible
Evaluation risque -> SCA requise: challenge fort
SCA requise -> Liability shift: responsabilite ajustee
```

Points de vigilance:
- attaques relais ou malware terminal
- mauvaise qualite des donnees risque
- contournement par parcours degrade
$$,
    '["DSP2 impose une logique d authentification forte","Le liability shift depend de l authentification reussie","La securite reste un compromis entre risque et conversion"]'::jsonb,
    4,
    45
),
(
    'ch-s5-732-2-05-pratiques',
    'mod-s5-732-2-cp-cnp',
    'Travaux pratiques EMV et 3DS',
    $$## Mise en pratique laboratoire

Le module inclut:
- analyse de traces EMV
- simulation terminal simplifie
- simulation 3DS avec variantes de risque

```flow
Trace transaction -> Analyse APDU: interpretation technique
Analyse APDU -> Simulation 3DS: comparaison des flux
Simulation 3DS -> Livrable: diagnostic et recommandations
```

L objectif est de passer de la theorie au diagnostic operationnel.
$$,
    '["Les TP ancrent la lecture de trames et de flux","La simulation 3DS prepare aux cas reels","Le livrable doit relier trace technique et impact metier"]'::jsonb,
    5,
    50
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- CHAPTERS - MODULE 722-2
-- =============================================================================
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES
(
    'ch-s5-722-2-01-ecosysteme',
    'mod-s5-722-2-issuer-acq',
    'Ecosysteme emetteur-acquereur',
    $$## Roles fondamentaux

L emetteur gere le porteur et la decision risque.
L acquereur gere l acceptation commercant et la collecte transactionnelle.

```flow
Porteur -> Emetteur: relation compte et carte
Commercant -> Acquereur: relation acceptation
Acquereur -> Emetteur: demande autorisation
Emetteur -> Acquereur: decision
```

Les commissions distribuent le revenu et le risque entre ces acteurs.
$$,
    '["Emetteur et acquereur ont des obligations differentes","Le flux autorisation les connecte en temps reel","La commission reflete risque et service rendu"]'::jsonb,
    1,
    60
),
(
    'ch-s5-722-2-02-fonctions-emetteur',
    'mod-s5-722-2-issuer-acq',
    'Fonctions emetteur: front-office et back-office',
    $$## Chaine emetteur

Le front-office emetteur couvre banque en ligne, app mobile, GAB et ACS 3DS.
Le back-office couvre SAE, comptes, listes noires, disputes et reporting.

```flow
Canal client -> Front-office emetteur: interaction porteur
Front-office emetteur -> SAE: demande autorisation
SAE -> Systeme comptes: controles financiers
SAE -> Moteur risque: controles fraude
```

La qualite de decision du SAE conditionne securite, experience et cout du risque.
$$,
    '["Le SAE est le coeur de la decision emetteur","Front-office et back-office doivent rester coherents","Listes noires et moteur risque sont des controles critiques"]'::jsonb,
    2,
    55
),
(
    'ch-s5-722-2-03-fonctions-acquereur',
    'mod-s5-722-2-issuer-acq',
    'Fonctions acquereur: TPE, GAB et production',
    $$## Chaine acquereur

L acquereur opere le parc TPE/GAB et gere la telecollecte.

```flow
TPE -> SAA: demande autorisation
SAA -> Reseau interbancaire: routage emetteur
GAB -> GDG: supervision automate
SAA -> Clearing: preparation compensation
```

Les back-offices acquereur pilotent disponibilite, support commercant et gestion litiges.
$$,
    '["Le SAA traite et route les autorisations cote acquereur","Le GDG supervise les operations GAB","La telecollecte alimente clearing et comptabilisation"]'::jsonb,
    3,
    55
),
(
    'ch-s5-722-2-04-protocoles',
    'mod-s5-722-2-issuer-acq',
    'Protocoles CB2A, CBAE et interfaces',
    $$## Protocoles d echange

CB2A/2AP relie accepteur et acquereur.
CBAE couvre certains echanges acquereur-emetteur.
PROGAB D couvre des messages operationnels de GAB.

```flow
Terminal -> Acquereur: CB2A/2AP
Acquereur -> Emetteur: CBAE / reseau
GAB -> GDG: PROGAB D
```

Les evolutions (ex: chainage CB2A) servent les usages recurrents et DSP2.
$$,
    '["CB2A est central pour l acceptation locale","PROGAB D structure les echanges GAB","Le chainage facilite certains paiements recurrents"]'::jsonb,
    4,
    50
),
(
    'ch-s5-722-2-05-si-bancaire',
    'mod-s5-722-2-issuer-acq',
    'Systeme d information bancaire et flux comptables',
    $$## Integration SI et comptabilite

Le SI bancaire relie monetique, comptabilite et supervision.

```flow
Autorisation -> Comptabilite intermediaire: ecritures J0
Clearing -> Rapprochement: positions nettes
Settlement -> Comptabilite finale: mouvements definitifs
```

La continuite d activite impose redondance, journalisation et plans de reprise.
$$,
    '["Le cycle comptable suit autorisation-clearing-settlement","Le rapprochement evite ecarts de position","La resilience SI est une exigence metier et reglementaire"]'::jsonb,
    5,
    55
),
(
    'ch-s5-722-2-06-pratiques',
    'mod-s5-722-2-issuer-acq',
    'Travaux pratiques et gestion des incidents',
    $$## Ateliers operationnels

Les ateliers couvrent:
- parametres TPE
- simulation d autorisations
- incidents GAB et remise en service

```flow
Alerte incident -> Diagnostic terrain: logs et etat materiel
Diagnostic terrain -> Correction: reparation et test
Correction -> GDG: telecollecte + remise en service
```

Le livrable attendu decrit decisions techniques, risques residuels et actions correctives.
$$,
    '["Les exercices reproduisent des situations de production","Le dialogue avec le GDG est cle en incident GAB","La reactivation doit etre testee et tracee"]'::jsonb,
    6,
    55
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- QUIZZES (from exo.pdf, 4 questions per module)
-- =============================================================================
INSERT INTO learning.cursus_quizzes (id, cursus_id, module_id, title, pass_percentage, time_limit_minutes, is_final_evaluation)
VALUES
('quiz-s5-734-2', 'bloc-s5-734-principes', 'mod-s5-734-2-principes', 'Quiz - Module 734-2 Principes du paiement', 75, 15, false),
('quiz-s5-732-2', 'bloc-s5-732-cp-cnp', 'mod-s5-732-2-cp-cnp', 'Quiz - Module 732-2 CP/CNP', 75, 15, false),
('quiz-s5-722-2', 'bloc-s5-722-issuer-acq', 'mod-s5-722-2-issuer-acq', 'Quiz - Module 722-2 Emetteur/Acquereur', 75, 15, false)
ON CONFLICT (id) DO NOTHING;

-- Module 734-2 QCM
INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order)
VALUES
(
    'qq-s5-734-2-01',
    'quiz-s5-734-2',
    'Quels sont les cinq acteurs principaux d une transaction par carte ?',
    '["Porteur, emetteur, accepteur, acquereur, schema","Porteur, banque centrale, commercant, processeur, Etat","Client, vendeur, banque, police, fisc","Payeur, beneficiaire, intermediaire, notaire, huissier"]'::jsonb,
    0,
    'Les cinq acteurs de reference sont porteur, emetteur, accepteur, acquereur et schema.',
    1
),
(
    'qq-s5-734-2-02',
    'quiz-s5-734-2',
    'Que signifie le sigle PAN ?',
    '["Primary Account Number","Payment Authorization Number","Personal Access Number","Public Authentication Node"]'::jsonb,
    0,
    'PAN est le numero principal du compte carte.',
    2
),
(
    'qq-s5-734-2-03',
    'quiz-s5-734-2',
    'Dans une transaction, quel acteur recoit la commission d interchange ?',
    '["L acquereur","L emetteur","Le commercant","Le porteur"]'::jsonb,
    1,
    'L interchange est verse par l acquereur a l emetteur.',
    3
),
(
    'qq-s5-734-2-04',
    'quiz-s5-734-2',
    'Quelle est la principale fonction du clearing (compensation) ?',
    '["Autoriser une transaction en temps reel","Echanger les donnees de transactions entre banques et calculer les positions nettes","Transferer les fonds du compte du porteur au compte du commercant","Imprimer les tickets de caisse"]'::jsonb,
    1,
    'Le clearing prepare le reglement par calcul de positions nettes; ce n est pas le transfert final de fonds.',
    4
)
ON CONFLICT (id) DO NOTHING;

-- Module 732-2 QCM
INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order)
VALUES
(
    'qq-s5-732-2-01',
    'quiz-s5-732-2',
    'En EMV, quelle commande APDU est utilisee pour selectionner l application de paiement ?',
    '["GET PROCESSING OPTIONS","SELECT","READ RECORD","VERIFY"]'::jsonb,
    1,
    'SELECT (INS=A4) permet de choisir l AID.',
    1
),
(
    'qq-s5-732-2-02',
    'quiz-s5-732-2',
    'Quelle methode d authentification EMV genere une signature differente a chaque transaction ?',
    '["SDA","DDA","CDA","Toutes les methodes sont dynamiques"]'::jsonb,
    1,
    'DDA utilise un defi dynamique du terminal.',
    2
),
(
    'qq-s5-732-2-03',
    'quiz-s5-732-2',
    'Dans 3-D Secure version 2, que signifie un flux frictionless ?',
    '["Authentification impossible","Saisie SMS obligatoire","Authentification sans interaction utilisateur","Transaction refusee sans explication"]'::jsonb,
    2,
    'Frictionless signifie validation risque sans challenge utilisateur.',
    3
),
(
    'qq-s5-732-2-04',
    'quiz-s5-732-2',
    'Quel est le principal avantage de la tokenisation dans les paiements mobiles ?',
    '["Reduire le temps de transaction","Remplacer le code PIN","Proteger les donnees reelles de carte via un jeton","Permettre le sans contact a distance"]'::jsonb,
    2,
    'Le jeton est inutilisable hors contexte et protege le PAN reel.',
    4
)
ON CONFLICT (id) DO NOTHING;

-- Module 722-2 QCM
INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order)
VALUES
(
    'qq-s5-722-2-01',
    'quiz-s5-722-2',
    'Quel systeme est responsable de la verification du cryptogramme ARQC ?',
    '["Le TPE","L acquereur","L emetteur via son SAE","Le schema carte"]'::jsonb,
    2,
    'Le SAE emetteur valide le cryptogramme de demande autorisation.',
    1
),
(
    'qq-s5-722-2-02',
    'quiz-s5-722-2',
    'Que signifie le sigle GDG dans le contexte des GAB ?',
    '["Gestionnaire de Depots et Garanties","Gestionnaire de GAB","Groupe de Developpement des GAB","Grand Distributeur de GAB"]'::jsonb,
    1,
    'Le GDG est le systeme acquereur de supervision des automates GAB.',
    2
),
(
    'qq-s5-722-2-03',
    'quiz-s5-722-2',
    'Le protocole CB2A (2AP) est utilise pour les echanges entre :',
    '["Emetteur et acquereur","TPE et acquereur","Carte et TPE","Schema et emetteur"]'::jsonb,
    1,
    'CB2A/2AP est le protocole accepteur-acquereur.',
    3
),
(
    'qq-s5-722-2-04',
    'quiz-s5-722-2',
    'Dans le cadre DSP2, que permet le chainage des transactions introduit dans CB2A 1.6 ?',
    '["Relier des transactions pour calcul des frais","Associer des paiements recurrents a une authentification initiale","Lier une carte a plusieurs comptes","Creer une chaine de blocs"]'::jsonb,
    1,
    'Le chainage permet de referencer des transactions liees pour des parcours recurrents.',
    4
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXERCISES (from exo.pdf, Ex1 to Ex12)
-- =============================================================================
INSERT INTO learning.cursus_exercises (id, module_id, title, type, description, instructions, hints, estimated_minutes)
VALUES
(
    'ex-s5-734-2-01',
    'mod-s5-734-2-principes',
    'Exercice 1 - Vocabulaire',
    'ANALYSE',
    'Definir les termes cle de la relation de paiement.',
    '["Definir acquereur","Definir accepteur","Definir processeur technique","Definir commission d interchange"]'::jsonb,
    '["Relier chaque terme a son role operationnel","Inclure la notion de risque et de remuneration"]'::jsonb,
    35
),
(
    'ex-s5-734-2-02',
    'mod-s5-734-2-principes',
    'Exercice 2 - Schema de transaction',
    'ANALYSE',
    'Decrire les etapes de la presentation carte au reglement interbancaire.',
    '["Lister les etapes de bout en bout","Nommer les acteurs a chaque etape","Distinguer autorisation, compensation et reglement"]'::jsonb,
    '["Utiliser un flux en 8 etapes","Verifier le sens de circulation des messages"]'::jsonb,
    45
),
(
    'ex-s5-734-2-03',
    'mod-s5-734-2-principes',
    'Exercice 3 - Instruments SEPA',
    'ANALYSE',
    'Identifier les instruments SCT, SDD et SCF et leur finalite.',
    '["Citer les trois instruments SEPA","Donner une description courte de chaque instrument","Comparer usage virement, prelevement, carte"]'::jsonb,
    '["SCT peut etre instantane","SDD existe en Core et B2B","SCF vise l interoperabilite carte"]'::jsonb,
    30
),
(
    'ex-s5-734-2-04',
    'mod-s5-734-2-principes',
    'Exercice 4 - Cas fraude 3DS',
    'CAS_ETUDE',
    'Analyser une contestation e-commerce avec 3-D Secure active ou absente.',
    '["Identifier le responsable initial du remboursement","Preciser les preuves marchandes attendues (CAVV, identifiant 3DS)","Comparer le cas avec et sans 3DS"]'::jsonb,
    '["Relier resultat authentification et liability shift","Documenter le role chargeback"]'::jsonb,
    55
),
(
    'ex-s5-732-2-05',
    'mod-s5-732-2-cp-cnp',
    'Exercice 5 - Commandes APDU',
    'PRATIQUE',
    'Expliquer le role des commandes APDU critiques dans un flux EMV.',
    '["Expliquer SELECT","Expliquer GET PROCESSING OPTIONS","Expliquer READ RECORD","Expliquer GENERATE AC"]'::jsonb,
    '["Associer chaque commande a son objectif transactionnel","Relier GENERATE AC au cryptogramme"]'::jsonb,
    40
),
(
    'ex-s5-732-2-06',
    'mod-s5-732-2-cp-cnp',
    'Exercice 6 - 3DS1 vs 3DS2',
    'ANALYSE',
    'Comparer les apports fonctionnels et securite de 3DS2.',
    '["Citer trois ameliorations majeures de 3DS2","Inclure API, donnees enrichies, frictionless, mobile SDK"]'::jsonb,
    '["Lier chaque amelioration a un impact conversion ou risque"]'::jsonb,
    35
),
(
    'ex-s5-732-2-07',
    'mod-s5-732-2-cp-cnp',
    'Exercice 7 - Scenario EMV offline',
    'CAS_ETUDE',
    'Analyser le risque et le comportement carte/terminal en mode offline.',
    '["Decrire le cas achat 20 EUR avec plafond offline 50 EUR","Evaluer le cas cumul deja a 45 EUR","Expliquer le risque pour emetteur"]'::jsonb,
    '["Verifier la bascule online en cas de depassement","Relier offline a la dette non visible en temps reel"]'::jsonb,
    50
),
(
    'ex-s5-722-2-08',
    'mod-s5-722-2-issuer-acq',
    'Exercice 8 - Roles SAE et SAA',
    'ANALYSE',
    'Distinguer les fonctions autorisation cote emetteur et cote acquereur.',
    '["Presenter le role du SAE","Presenter le role du SAA","Comparer les controles executes par chaque systeme"]'::jsonb,
    '["Le SAE decide, le SAA route et pre-controle","Inclure la preparation compensation cote SAA"]'::jsonb,
    40
),
(
    'ex-s5-722-2-09',
    'mod-s5-722-2-issuer-acq',
    'Exercice 9 - Tokenisation wallet',
    'ANALYSE',
    'Expliquer le principe FPAN/DPAN et les gains emetteur-porteur.',
    '["Definir FPAN et DPAN","Expliquer pourquoi le PAN reel nest pas transmis","Donner les avantages pour emetteur et porteur"]'::jsonb,
    '["Insister sur la desactivation selective du jeton","Relier au risque de fuite donnees"]'::jsonb,
    35
),
(
    'ex-s5-722-2-10',
    'mod-s5-722-2-issuer-acq',
    'Exercice 10 - Messages PROGAB D',
    'PRATIQUE',
    'Identifier les messages typiques echanges entre GAB et GDG.',
    '["Citer trois couples requete/reponse","Expliquer le role de chaque message: retrait, consultation, telecollecte"]'::jsonb,
    '["RETRAIT_REQ/RESP","CONSULT_REQ/RESP","TELECOLLECTE_REQ/RESP"]'::jsonb,
    35
),
(
    'ex-s5-722-2-11',
    'mod-s5-722-2-issuer-acq',
    'Exercice 11 - Configuration TPE CB2A',
    'CAS_ETUDE',
    'Analyser un parametrage TPE pour montants eleves et contraintes securite.',
    '["Expliquer utilisation identifiant commercant, serveur, port et protocole","Justifier force PIN/CVM required","Donner les comportements possibles si reseau indisponible"]'::jsonb,
    '["Pour montants eleves, privilegier online strict","Distinguer mode differe, refus, offline conditionnel"]'::jsonb,
    55
),
(
    'ex-s5-722-2-12',
    'mod-s5-722-2-issuer-acq',
    'Exercice 12 - Incident GAB',
    'CAS_ETUDE',
    'Decrire le runbook de diagnostic, correction et remise en service GAB.',
    '["Detailer la chaine depuis alerte GDG","Lister diagnostic logs et verification materielle","Decrire test final, telecollecte manuelle, notification de remise en service"]'::jsonb,
    '["Inclure cause probable, action corrective, preuve de retablissement"]'::jsonb,
    60
)
ON CONFLICT (id) DO NOTHING;
