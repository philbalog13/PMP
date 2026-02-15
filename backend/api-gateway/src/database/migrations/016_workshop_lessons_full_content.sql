-- Migration 016: Expand workshop lesson content
-- Purpose: Replace the minimal placeholder lessons with richer, multi-section content
--          aligned with learning.workshops.sections for the student theory pages.

CREATE SCHEMA IF NOT EXISTS learning;

-- NOTE: workshop_lessons has a UNIQUE(workshop_id, section_id) constraint.
-- We upsert to stay idempotent and safely update existing seed rows.

INSERT INTO learning.workshop_lessons (
    workshop_id,
    workshop_title,
    workshop_description,
    section_id,
    section_title,
    section_content,
    section_order
)
VALUES
-- =============================================================================
-- INTRO (5 sections)
-- =============================================================================
(
    'intro',
    'Introduction aux Paiements',
    'Fondamentaux de la monetique et chaine de paiement.',
    'intro-1',
    'Le modele a 4 acteurs',
    $md$
Une transaction carte repose sur un **modele a 4 acteurs** (parfois 5 si on isole le processeur) :

- **Porteur (cardholder)** : initie le paiement et supporte le parcours d'authentification (PIN, 3DS, etc.).
- **Marchand (merchant)** : accepte le paiement via un TPE / e-commerce.
- **Acquereur (acquirer)** : banque/PSP du marchand, collecte les transactions et les presente au reseau.
- **Emetteur (issuer)** : banque du porteur, **decide** d'autoriser/refuser et porte le risque credit.
- **Reseau (scheme)** : Visa/Mastercard/CB, transporte les messages et definit des regles (formats, fees, dispute).

> Point cle : le marchand ne "parle" pas directement a l'emetteur. Les flux passent par l'acquereur et le reseau.
    $md$,
    1
),
(
    'intro',
    'Introduction aux Paiements',
    'Fondamentaux de la monetique et chaine de paiement.',
    'intro-2',
    'Autorisation temps reel',
    $md$
L'**autorisation** est la phase temps reel : on demande a l'emetteur si la transaction est acceptable.

Etapes typiques :

1. Lecture des donnees carte (chip / sans contact / e-commerce).
2. Eventuelle authentification : PIN (carte presente) ou 3DS (e-commerce), selon contexte.
3. Creation d'un message d'autorisation (ex: ISO 8583 MTI 0100) par l'acquereur/processeur.
4. Decision emetteur : controle solde/limites, risque, etat carte, regles internes.
5. Retour d'une reponse (ex: MTI 0110) avec un **code reponse** (approuve/refuse) et parfois un code d'autorisation.

Important :
- L'autorisation peut reserver un montant (hold) sans encore "payer" le marchand.
- La latence et la fiabilite du reseau impactent l'experience utilisateur.
    $md$,
    2
),
(
    'intro',
    'Introduction aux Paiements',
    'Fondamentaux de la monetique et chaine de paiement.',
    'intro-3',
    'Clearing & settlement',
    $md$
Apres l'autorisation, vient la partie "back-office" :

- **Clearing (compensation)** : le marchand/acquereur envoie des lots (batches) de transactions capturees.
- **Settlement (reglement)** : transfert interbancaire des fonds (souvent en J+1 / J+2 selon ecosysteme).
- **Reconciliation** : rapprochement comptable (tickets, lots, comptes, ecarts).

Concepts utiles :
- **Capture** : passage d'une autorisation a une transaction "presented" (mise en compensation).
- **Reversal/void** : annulation logique lorsqu'une autorisation ne doit plus tenir.
- **Frais** : interchange + scheme fees + frais acquereur, qui expliquent une partie des ecarts.
    $md$,
    3
),
(
    'intro',
    'Introduction aux Paiements',
    'Fondamentaux de la monetique et chaine de paiement.',
    'intro-4',
    'Donnees et identifiants',
    $md$
Les paiements manipulent beaucoup d'identifiants. Les plus courants :

| Element | Role | Exemple / remarque |
|---|---|---|
| PAN (DE2) | Numero de carte | A **proteger** (masquage, tokenisation) |
| Expiry (DE14) | Date d'expiration | MMYY |
| STAN (DE11) | Trace unique terminal | Evite doublons / facilite le support |
| RRN (DE37) | Reference reseau | Cle de rapprochement inter-acteurs |
| Terminal ID (DE41) | Identite du terminal | Traceabilite |
| Merchant ID (DE42) | Identite marchand | Traceabilite |

Bonnes pratiques :
- Ne jamais journaliser un PAN complet.
- Privilegier des **tokens** cote applicatif, le PAN restant dans le perimetre PCI.
    $md$,
    4
),
(
    'intro',
    'Introduction aux Paiements',
    'Fondamentaux de la monetique et chaine de paiement.',
    'intro-5',
    'Securite et conformite (vue globale)',
    $md$
Un systeme de paiement est critique : il doit etre robuste, traceable et conforme.

Checklist haut niveau :

- **PCI DSS** : segmentation, durcissement, gestion des vulnerabilites, journalisation, controle d'acces.
- **Chiffrement** : TLS en transit; chiffrement des secrets; P2PE selon contexte.
- **SCA / 3DS** : authentification forte sur e-commerce quand applicable.
- **HSM** : operations sensibles (PIN, MAC, cles) executees sans exposition de secrets.
- **Observabilite** : correlation IDs, metriques (taux d'autorisation, timeouts), alerting.
- **Gestion d'incident** : procedures, rotations, revocations, communication.

Objectif : reduire la fraude **sans** degrader l'acceptation et l'experience client.
    $md$,
    5
),

-- =============================================================================
-- ISO 8583 (8 sections)
-- =============================================================================
(
    'iso8583',
    'ISO 8583 - Messages',
    'Structure des messages ISO 8583 et champs principaux.',
    'iso-1',
    'Anatomie d un message',
    $md$
ISO 8583 est un standard de **messagerie** pour les transactions cartes.

Un message est generalement compose de :

```text
[MTI][BITMAP][DATA ELEMENTS...]
```

- **MTI** : type de message (autorisation, financial, reversal, network management).
- **Bitmap** : indique quels champs (DE) sont presents.
- **Data Elements (DE)** : les donnees utiles (PAN, montant, devise, terminal, etc.).

> La securite repose sur une combinaison : format strict, controles metier, et mecanismes crypto (PIN/MAC).
    $md$,
    1
),
(
    'iso8583',
    'ISO 8583 - Messages',
    'Structure des messages ISO 8583 et champs principaux.',
    'iso-2',
    'MTI (Message Type Indicator)',
    $md$
Le MTI est un code a 4 chiffres. Une lecture simple :

- 0100 : Authorization **request**
- 0110 : Authorization **response**
- 0200 : Financial request (presentment)
- 0210 : Financial response
- 0400/0420 : Reversal / Advice (selon ecosystems)
- 0800/0810 : Network management (echo, sign-on, etc.)

Table mentale :

| MTI | Intention |
|---|---|
| 01xx | Autoriser / reserver |
| 02xx | Presenter / debiter |
| 04xx | Annuler / corriger |
| 08xx | Superviser le reseau |
    $md$,
    2
),
(
    'iso8583',
    'ISO 8583 - Messages',
    'Structure des messages ISO 8583 et champs principaux.',
    'iso-3',
    'Bitmap primaire et secondaire',
    $md$
Le bitmap est un ensemble de bits qui declare la presence des DE.

- **Primary bitmap** : DE 1 a 64
- **Secondary bitmap** (optionnel) : DE 65 a 128

Convention :
- Si le **bit 1** du primary bitmap vaut 1, alors un secondary bitmap suit.

Pourquoi c'est important :
- Un parser doit valider **longueurs** et **coherences** (ex: DE present => format conforme).
- Un champ declare absent ne doit pas etre lu par accident (risque de desalignement).
    $md$,
    3
),
(
    'iso8583',
    'ISO 8583 - Messages',
    'Structure des messages ISO 8583 et champs principaux.',
    'iso-4',
    'Data Elements essentiels',
    $md$
Quelques DE incontournables (nomenclature variable selon les profils ISO) :

| DE | Nom | Usage courant |
|---:|---|---|
| 2 | PAN | Identifie la carte (a proteger) |
| 3 | Processing code | Type d'operation |
| 4 | Amount | Montant transaction |
| 7 | Transmission date/time | Horodatage reseau |
| 11 | STAN | Identifiant unique cote terminal |
| 14 | Expiry | Date expiration |
| 22 | POS entry mode | Chip / mag / sans contact / ecom |
| 35 | Track 2 | Donnees piste (legacy) |
| 37 | RRN | Reference de rapprochement |
| 39 | Response code | Approuve / refuse |
| 41 | Terminal ID | Identite terminal |
| 42 | Merchant ID | Identite marchand |
| 49 | Currency code | Devise (ISO 4217) |
| 52 | PIN data | Donnees PIN (sous cles) |
| 55 | ICC data | EMV (TLV) |

Un bon design :
- Trace STAN/RRN de bout en bout.
- Valide formats et ranges (montants, devise, dates).
    $md$,
    4
),
(
    'iso8583',
    'ISO 8583 - Messages',
    'Structure des messages ISO 8583 et champs principaux.',
    'iso-5',
    'EMV dans ISO 8583 (DE55)',
    $md$
Pour une transaction EMV, les donnees chip sont vehiculees (souvent) via **DE55** sous forme **TLV**.

Principe TLV :

```text
Tag | Length | Value
9F26 08 1122334455667788
```

Exemples de tags (indicatifs) :
- 9F26 : ARQC (cryptogramme)
- 9F10 : issuer application data
- 9F37 : unpredictable number
- 9A / 9C : date / type transaction
- 5F2A : currency code

> Objectif : permettre a l'emetteur d'evaluer le risque EMV et de produire une reponse (ARPC) si besoin.
    $md$,
    5
),
(
    'iso8583',
    'ISO 8583 - Messages',
    'Structure des messages ISO 8583 et champs principaux.',
    'iso-6',
    'Timeouts, advice et reversal',
    $md$
Dans la vraie vie, tout n'est pas synchrone :

- Un timeout peut survenir alors que l'emetteur a peut-etre autorise.
- Une capture peut echouer apres autorisation.
- Un doublon peut etre rejoue par un composant en cas d'erreur reseau.

Mecanismes classiques :
- **Reversal/void** : annuler une autorisation qui ne doit plus tenir.
- **Idempotency** : garantir qu'une meme intention ne debite pas deux fois.
- **Reconciliation** : detecter et corriger les ecarts via STAN/RRN et journaux.
    $md$,
    6
),
(
    'iso8583',
    'ISO 8583 - Messages',
    'Structure des messages ISO 8583 et champs principaux.',
    'iso-7',
    'Integrite (MAC) et secret PIN',
    $md$
Deux protections historiques en paiement :

- **PIN block** : le PIN n'est pas envoye en clair; il est encapsule sous cles (HSM).
- **MAC** : un Message Authentication Code peut proteger l'integrite d'un message (selon reseau).

Bonnes pratiques :
- Gerer les cles via HSM, rotation, dual control.
- Eviter que la securite depende uniquement du transport (TLS).
    $md$,
    7
),
(
    'iso8583',
    'ISO 8583 - Messages',
    'Structure des messages ISO 8583 et champs principaux.',
    'iso-8',
    'Validation et observabilite',
    $md$
ISO 8583 est tres sensible aux erreurs de parsing.

Recommandations :

- **Validation stricte** : longueurs, types, ranges, coherence bitmap vs champs.
- **Journalisation sure** : masquage PAN, pas de donnees sensibles, correlation IDs.
- **Metriques** : taux d'approbation, codes DE39, timeouts, latence par hop.
- **Tests** : jeux de messages realistes + cas limites (champs manquants, formats invalides).

Objectif : garantir un traitement deterministe, auditable, et robuste.
    $md$,
    8
),

-- =============================================================================
-- HSM KEYS (6 sections)
-- =============================================================================
(
    'hsm-keys',
    'HSM et Gestion des Cles',
    'Cycle de vie des cles cryptographiques en environnement HSM.',
    'hsm-1',
    'Pourquoi un HSM',
    $md$
Un **HSM (Hardware Security Module)** est un composant specialise qui :

- Genere, stocke et utilise des cles **sans exposition en clair**.
- Execute des operations sensibles (PIN, MAC, CVV, derivations) dans un perimetre durci.
- Apporte de l'audit et des controles organisationnels (roles, dual control).

Dans le paiement, le HSM est central pour reduire le risque de fuite de secrets et repondre aux exigences de conformite.
    $md$,
    1
),
(
    'hsm-keys',
    'HSM et Gestion des Cles',
    'Cycle de vie des cles cryptographiques en environnement HSM.',
    'hsm-2',
    'Hierarchie de cles',
    $md$
On structure les cles en niveaux :

- **LMK** (Local Master Key) : protege les cles stockees localement dans le HSM.
- **ZMK** (Zone Master Key) : protege des cles lors d'echanges inter-systemes (zones).
- **Working keys** : cles d'usage (ZPK pour PIN, ZAK pour MAC, DEK pour donnees, etc.).

Regle d'or :
- Une working key ne doit pas etre manipulee en clair en dehors du HSM.
    $md$,
    2
),
(
    'hsm-keys',
    'HSM et Gestion des Cles',
    'Cycle de vie des cles cryptographiques en environnement HSM.',
    'hsm-3',
    'Ceremonie de cles et dual control',
    $md$
La gestion de cles n'est pas qu'un sujet technique, c'est aussi une **procedure** :

- **Dual control** : une seule personne ne doit pas pouvoir generer/activer une cle critique.
- **Split knowledge** : les composants d'une cle sont repartis entre plusieurs operateurs.
- **Rotation** : changer les cles selon une periodicite et apres incident.
- **Audit** : journaliser qui fait quoi, quand, et pourquoi.

Ces controles reduisent le risque interne (insider) et renforcent la tracabilite.
    $md$,
    3
),
(
    'hsm-keys',
    'HSM et Gestion des Cles',
    'Cycle de vie des cles cryptographiques en environnement HSM.',
    'hsm-4',
    'PIN blocks (concept)',
    $md$
Le PIN ne doit pas circuler ni etre stocke en clair.

Le **PIN block** est un encodage qui :
- Combine le PIN avec des metadonnees (format) et parfois le PAN (liaison).
- Est chiffre sous une working key (ex: ZPK) et manipule via HSM (verify/translate).

Objectif : permettre la verification cote emetteur sans exposer le PIN dans les couches applicatives.
    $md$,
    4
),
(
    'hsm-keys',
    'HSM et Gestion des Cles',
    'Cycle de vie des cles cryptographiques en environnement HSM.',
    'hsm-5',
    'MAC, CVV et operations crypto',
    $md$
Autres usages frequents d'un HSM :

- **MAC** : integrite des messages entre participants (selon reseau).
- **CVV/CVC** : generation/verification basee sur PAN + expiration + service code, sous cles CVK.
- **Chiffrement** : DEK pour proteger certaines donnees applicatives (selon perimetre).

La logique metier appelle des API HSM, mais les secrets restent proteges par le module.
    $md$,
    5
),
(
    'hsm-keys',
    'HSM et Gestion des Cles',
    'Cycle de vie des cles cryptographiques en environnement HSM.',
    'hsm-6',
    'Hardening et exploitation',
    $md$
Bonnes pratiques d'exploitation :

- Cloisonnement reseau, mTLS, allowlists, et moindre privilege.
- Rate limiting + monitoring sur les endpoints sensibles.
- Journalisation sans fuite (redaction) et alertes sur comportements anormaux.
- Sauvegardes et procedures de reprise (HSM est un SPOF potentiel).

Le HSM est une piece critique : on le protege comme une banque protege un coffre.
    $md$,
    6
),

-- =============================================================================
-- 3DS FLOW (7 sections)
-- =============================================================================
(
    '3ds-flow',
    'Flux 3D Secure',
    'Parcours d authentification 3DS de bout en bout.',
    '3ds-1',
    'Acteurs 3DS',
    $md$
Le protocole 3D Secure (3DS2) implique :

- **Merchant / PSP** : initie le paiement e-commerce.
- **3DS Server** : oriente et orchestre les messages 3DS.
- **Directory Server (DS)** : point d'interconnexion reseau.
- **ACS (Access Control Server)** : cote emetteur, decide frictionless vs challenge.
- **Utilisateur** : peut etre sollicite via un challenge (OTP, app bancaire, biometrie).
    $md$,
    1
),
(
    '3ds-flow',
    'Flux 3D Secure',
    'Parcours d authentification 3DS de bout en bout.',
    '3ds-2',
    'Frictionless vs Challenge',
    $md$
Deux experiences possibles :

- **Frictionless** : authentification silencieuse, basee sur l'analyse de risque.
- **Challenge** : interaction utilisateur (OTP, app, etc.) si risque plus eleve ou regle imposee.

L'objectif est d'obtenir un bon equilibre :
- Minimiser la friction (conversion).
- Maintenir un niveau de securite adapte (SCA / risque).
    $md$,
    2
),
(
    '3ds-flow',
    'Flux 3D Secure',
    'Parcours d authentification 3DS de bout en bout.',
    '3ds-3',
    'Messages et statuts',
    $md$
Vue simplifiee :

| Phase | Message | Sens |
|---|---|---|
| Auth request | AReq/ARes | 3DS Server <-> ACS via DS |
| Challenge | CReq/CRes | Frontend/SDK <-> ACS |
| Result | RReq/RRes | ACS -> DS -> 3DS Server |

Le resultat contient un **statut** (ex: authentifie, tente, non authentifie) et des preuves utilisees ensuite en autorisation (ECI, valeurs d'authentification selon scheme).
    $md$,
    3
),
(
    '3ds-flow',
    'Flux 3D Secure',
    'Parcours d authentification 3DS de bout en bout.',
    '3ds-4',
    'SCA et exemptions',
    $md$
Selon la regulation (ex: PSD2 en Europe), la **Strong Customer Authentication** peut etre requise.

Exemples de mecanismes/exemptions (depend du contexte) :
- **Low value** (paiements de faible montant) avec limites.
- **TRA** (Transaction Risk Analysis) si l'acteur est eligible et le risque bas.
- **Recurring / MIT** selon regles scheme et parcours client.

> Il faut documenter et tracer le motif (SCA appliquee ou exemption) pour l'audit et la gestion de litiges.
    $md$,
    4
),
(
    '3ds-flow',
    'Flux 3D Secure',
    'Parcours d authentification 3DS de bout en bout.',
    '3ds-5',
    'Donnees et privacy',
    $md$
3DS exploite des donnees de contexte (device, navigateur, IP, historique, etc.) pour evaluer le risque.

Bonnes pratiques :
- Collecter le **minimum necessaire** (privacy by design).
- Chiffrer et journaliser prudemment.
- Eviter de re-exposer ces donnees dans des logs ou des retours d'erreur.
    $md$,
    5
),
(
    '3ds-flow',
    'Flux 3D Secure',
    'Parcours d authentification 3DS de bout en bout.',
    '3ds-6',
    'Lien avec l autorisation',
    $md$
Le resultat 3DS n'est pas la transaction elle-meme : il vient **enrichir** la demande d'autorisation.

En pratique :
- Le marchand/PSP transmet les indicateurs 3DS au systeme d'acquisition.
- L'emetteur peut tenir compte de ces preuves pour accepter/refuser.
- Le protocole peut influencer la **liability** (selon scheme et statut).
    $md$,
    6
),
(
    '3ds-flow',
    'Flux 3D Secure',
    'Parcours d authentification 3DS de bout en bout.',
    '3ds-7',
    'Bonnes pratiques securite',
    $md$
Points d'attention :

- Rate limiting et verrouillage progressif sur les challenges (OTP).
- Protection contre le phishing (UI, domaines, redirections, CSP).
- Journalisation securisee (pas de codes sensibles).
- Supervision : taux de challenge, erreurs, delais, et signaux de fraude.

Objectif : un 3DS robuste, qui securise sans casser le parcours client.
    $md$,
    7
),

-- =============================================================================
-- FRAUD DETECTION (5 sections)
-- =============================================================================
(
    'fraud-detection',
    'Detection de Fraude',
    'Regles et signaux pour detecter des comportements suspects.',
    'fraud-1',
    'Typologies de fraude',
    $md$
Quelques categories classiques :

- **CNP (Card Not Present)** : usage de donnees carte volees en e-commerce.
- **ATO (Account Takeover)** : compromission d'un compte client et usage frauduleux.
- **Friendly fraud** : litiges abusifs (chargebacks) apres une transaction legitime.
- **Refund / return fraud** : abus sur remboursements, retours, avoirs.

Comprendre la typologie aide a choisir les bons signaux et les bonnes contre-mesures.
    $md$,
    1
),
(
    'fraud-detection',
    'Detection de Fraude',
    'Regles et signaux pour detecter des comportements suspects.',
    'fraud-2',
    'Signaux et features',
    $md$
Signaux frequents :

- **Velocity** : trop de transactions en peu de temps.
- **Geographie** : pays/region incoherents avec l'historique.
- **Device** : nouvel appareil, changements rapides, empreinte instable.
- **Montant** : ecart a la norme (spike) ou pattern typique de tests.
- **Marchand** : MCC sensible, nouveau marchand, atypique pour le client.

Le meilleur signal n'est pas unique : c'est la **combinaison** qui compte.
    $md$,
    2
),
(
    'fraud-detection',
    'Detection de Fraude',
    'Regles et signaux pour detecter des comportements suspects.',
    'fraud-3',
    'Regles vs scoring',
    $md$
Deux approches complementaires :

- **Regles deterministes** : simples a auditer, rapides (ex: seuils, listes).
- **Scoring / modele** : plus flexible, detecte des patterns complexes.

Bon design :
- Garder des regles "garde-fou" (hard blocks) et un score pour le reste.
- Tracer les raisons (explainability) pour les operations et la relation client.
    $md$,
    3
),
(
    'fraud-detection',
    'Detection de Fraude',
    'Regles et signaux pour detecter des comportements suspects.',
    'fraud-4',
    'Operations et chargebacks',
    $md$
La fraude est aussi un sujet operationnel :

- **Revue manuelle** : file de cas, priorisation, SLA.
- **Chargebacks** : preuves, delais, workflows scheme.
- **Feedback loop** : reinjecter les confirmations fraude/non-fraude dans les regles/modeles.

Objectif : reduire les pertes sans exploser les faux positifs.
    $md$,
    4
),
(
    'fraud-detection',
    'Detection de Fraude',
    'Regles et signaux pour detecter des comportements suspects.',
    'fraud-5',
    'KPIs et calibration',
    $md$
Metriques utiles :

- Fraud rate (bps), chargeback rate
- Approval rate / conversion
- False positives / faux refus
- Taux de revue manuelle + temps de traitement
- Latence de decision

La performance d'un systeme anti-fraude se pilote comme un produit : tests, seuils, et ajustements continus.
    $md$,
    5
),

-- =============================================================================
-- EMV (6 sections)
-- =============================================================================
(
    'emv',
    'Cartes EMV',
    'Fonctionnement EMV, cryptogrammes et securisation carte-presente.',
    'emv-1',
    'EMV en bref',
    $md$
EMV (chip) securise les paiements **carte presente**.

Benefices majeurs :
- Reduction de la fraude par clonage (par rapport a la piste magnetique).
- Donnees et preuves cryptographiques par transaction.
- Meilleure gestion du risque (online/offline selon regles).
    $md$,
    1
),
(
    'emv',
    'Cartes EMV',
    'Fonctionnement EMV, cryptogrammes et securisation carte-presente.',
    'emv-2',
    'Authentification des donnees',
    $md$
La puce peut fournir des mecanismes d'authentification (selon carte/terminal) :

- Verification de donnees offline (selon configuration).
- Controles de coherence (AIP/AFL, profils) et gestion de risques locale.

Objectif : rendre plus difficile la fabrication de transactions "credibles" sans la carte.
    $md$,
    2
),
(
    'emv',
    'Cartes EMV',
    'Fonctionnement EMV, cryptogrammes et securisation carte-presente.',
    'emv-3',
    'ARQC / ARPC',
    $md$
Deux cryptogrammes centraux :

- **ARQC** : produit par la carte pour demander une autorisation online.
- **ARPC** : produit par l'emetteur (ou via HSM) pour repondre et finaliser la decision.

Ils s'appuient sur des cles et des donnees dynamiques (compteurs, nombre aleatoire, montant, etc.) pour limiter le rejeu.
    $md$,
    3
),
(
    'emv',
    'Cartes EMV',
    'Fonctionnement EMV, cryptogrammes et securisation carte-presente.',
    'emv-4',
    'CVM et PIN',
    $md$
La **CVM** (Cardholder Verification Method) decrit comment verifier le porteur :

- PIN online (verifie cote emetteur)
- PIN offline (verifie par la carte, selon regles)
- Signature / no CVM / biometrie (selon parcours)

Le choix depend du montant, du terminal, du pays, et des parametres de risque.
    $md$,
    4
),
(
    'emv',
    'Cartes EMV',
    'Fonctionnement EMV, cryptogrammes et securisation carte-presente.',
    'emv-5',
    'EMV et ISO 8583 (DE55)',
    $md$
Dans beaucoup d'ecosystemes, les donnees EMV (TLV) sont transporteess via **DE55** (ISO 8583).

Ce que l'emetteur recherche typiquement :
- Donnees de risque et contexte
- ARQC et elements necessaires a la verification
- Parametres terminal (capabilities)

Bonnes pratiques : valider les TLV attendus, journaliser prudemment, et surveiller les anomalies.
    $md$,
    5
),
(
    'emv',
    'Cartes EMV',
    'Fonctionnement EMV, cryptogrammes et securisation carte-presente.',
    'emv-6',
    'Sans contact, fallback, bonnes pratiques',
    $md$
Points d'attention :

- **Sans contact** : limites de montant, regles de CVM, kernels.
- **Fallback** : retour piste magnetique doit etre encadre (risque fraude).
- **Durcissement** : parametrage terminal, mises a jour, surveillance des patterns anormaux.

L'EMV est efficace si la chaine complete (terminal, acquisition, emission) applique des regles coherentes.
    $md$,
    6
)
ON CONFLICT (workshop_id, section_id) DO UPDATE SET
    workshop_title = EXCLUDED.workshop_title,
    workshop_description = EXCLUDED.workshop_description,
    section_title = EXCLUDED.section_title,
    section_content = EXCLUDED.section_content,
    section_order = EXCLUDED.section_order;

