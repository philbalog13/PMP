-- Chapters for Module 3.3 – HSM (4 chapters)

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.3.1-archi', 'mod-3.3-hsm', 'Architecture et fonctions d''un HSM bancaire',
$$## Qu'est-ce qu'un HSM ?

Le **Hardware Security Module** est un dispositif matériel inviolable (tamper-resistant) certifié **FIPS 140-2/3 niveau 3 ou 4** et **PCI HSM**.

### Fonctions principales

- Génération et stockage sécurisé de clés
- Chiffrement/déchiffrement sans exposer les clés en clair
- Génération et vérification de PIN, CVV, ARQC
- Signature de code et de messages

### Typologie des clés

| Type | Nom | Rôle |
|------|-----|------|
| LMK | Local Master Key | Clé maître du HSM, protège toutes les autres |
| TMK | Terminal Master Key | Clé maître pour un parc de TPE |
| BDK | Base Derivation Key | Clé mère du DUKPT |
| PVK | PIN Verification Key | Vérification des PIN |
| CVK | Card Verification Key | Génération CVV/CVC |
| IMK | Issuer Master Key | Clé maître pour les cartes EMV |

> **Principe** : Les clés sont stockées chiffrées sous LMK. Elles ne sortent **jamais** en clair du HSM.$$,
'["HSM = dispositif matériel inviolable, certifié FIPS 140-2/3 + PCI HSM","LMK = clé maître racine, protège toutes les autres clés","Clés stockées chiffrées sous LMK, jamais en clair hors HSM","Fonctions : PIN, CVV, ARQC, signature, chiffrement"]'::jsonb,
1, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.3.2-commandes', 'mod-3.3-hsm', 'Commandes HSM et opérations cryptographiques',
$$## Commandes HSM standard (Thales payShield)

| Commande | Fonction | Exemple |
|----------|----------|---------|
| FM | Générer une clé (symétrique) | FM + longueur |
| GG | Exporter une clé sous LMK | GG + key index |
| PV | Vérifier un PIN | PV + PIN block + offset |
| M | Générer un MAC | M + data |
| EA | Générer ARQC | EA + données EMV |
| EE | Vérifier ARQC | EE + ARQC reçu |
| BK | Générer clé DUKPT | BK + BDK + KSN |

### Exemple : Vérification de PIN

```
Requête  : PV;02;1234;041234FFFFFFFF;4970123456789012
Réponse  : 00 (PIN correct) ou 01 (PIN faux)
```

Le HSM :
1. Reçoit le PIN block chiffré (format ISO 9564)
2. Déchiffre avec la PVK (index 02)
3. Compare avec le PIN de référence (dérivé du PAN)
4. Retourne le résultat **sans jamais exposer le PIN en clair**$$,
'["Commandes HSM : FM (générer clé), PV (vérifier PIN), EA/EE (ARQC)","Le PIN ne sort jamais en clair du HSM","HSM vérifie le PIN block chiffré et retourne OK/KO","Toutes les opérations crypto sensibles passent par le HSM"]'::jsonb,
2, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.3.3-dukpt', 'mod-3.3-hsm', 'DUKPT en profondeur',
$$## DUKPT – Derived Unique Key Per Transaction

**ANSI X9.24 Part 1** : Chaque transaction utilise une clé unique.

### Principe

1. **BDK** (Base Derivation Key) : clé maître partagée entre HSM et TPE
2. **KSN** (Key Serial Number) : 80 bits = ID terminal (59 bits) + compteur (21 bits)
3. **Clé de session** = DUKPT(BDK, KSN) — unique par transaction

### Algorithme simplifié

```
1. Charger le BDK
2. Construire un masque à partir du compteur
3. Pour chaque bit '1' du compteur → dériver
4. Appliquer 3DES → clé de session
```

### Propriétés

| Propriété | Valeur |
|-----------|--------|
| Pas de synchronisation | Le terminal et l'hôte calculent la même clé |
| Forward secrecy | Un PIN intercepté ne compromet pas les futurs |
| Capacité | 2²¹ ≈ 2 millions de transactions par BDK |
| Re-injection | Nécessaire quand compteur atteint son max |

### Exemple

```
BDK = 0123456789ABCDEFFEDCBA9876543210
KSN = FFFF9876543210E00001
→ Clé de session = A1B2C3D4E5F67890...
```

> **Quand le compteur atteint 2²¹** : le terminal doit être **re-injecté** avec un nouveau BDK (opération sécurisée).$$,
'["DUKPT = une clé unique par transaction, dérivée du BDK et KSN","KSN = 80 bits : 59 bits ID terminal + 21 bits compteur","Pas de synchronisation nécessaire entre terminal et hôte","Capacité ~2 millions de transactions avant re-injection"]'::jsonb,
3, 45) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.3.4-cloud-attaques', 'mod-3.3-hsm', 'HSM cloud et vulnérabilités',
$$## HSM dans le cloud

Depuis 2024, des solutions comme **Futurex Payment HSM on AWS** permettent de déporter les fonctions HSM dans le cloud.

### Architecture

- Tunnels dédiés (AWS PrivateLink)
- Certifications toujours valides (PCI HSM, FIPS)
- Le contrôle physique est perdu, mais le fournisseur est certifié

### HSM distribué (brevet 2025)

Système où plusieurs clients interagissent avec un HSM pour générer des clés de session, signatures et HMAC dans un workflow de gestion de paiement. Préfigure les HSM « as-a-service » orientés microservices.

## Vulnérabilités et attaques

### Attaque par faute (Fault Injection)

**Principe** : Abaisser la tension d'alimentation pour corrompre une instruction de vérification et forcer un succès.

**Contre-mesures** :
- Capteurs de tension intégrés
- Double exécution de chaque opération critique
- Vérification redondante des résultats
- Randomisation des cycles d'horloge

### Side-channel

**Principe** : Analyser la consommation électrique (SPA/DPA) ou les émissions électromagnétiques pour déduire les clés.

**Contre-mesures** :
- Exécution à temps constant
- Masquage des opérations
- Bruit électronique ajouté

### Attaque physique

**Principe** : Décapsulation du boîtier pour accéder directement aux puces.

**Contre-mesures** :
- Résine anti-décapsulation
- Capteurs de lumière
- Mesh conductrice
- Auto-destruction des clés$$,
'["HSM cloud : AWS PrivateLink, certifications maintenues","Fault injection : variation tension → corrompre vérification","Side-channel : analyse de consommation (SPA/DPA) → fuite de clés","Contre-mesures : temps constant, double exécution, capteurs, mesh"]'::jsonb,
4, 40) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Chapters for Module 3.4 – ISO 8583 & ISO 20022 (4 chapters)
-- =============================================================================

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.4.1-iso8583-avance', 'mod-3.4-messaging', 'ISO 8583 avancé : limites et évolution',
$$## Rappel et versions

| Version | Année | Caractéristiques |
|---------|-------|-----------------|
| ISO 8583:1987 | 1987 | Version originale |
| ISO 8583:1993 | 1993 | La plus utilisée aujourd'hui |
| ISO 8583:2003 | 2003 | Bitmap étendu |
| ISO 8583:2023 | 2023 | MTI version 8 |

### Limites d'ISO 8583

- Espace limité (128/192 champs max)
- Format peu extensible (champs propriétaires dans DE48, DE62)
- Pas de structuration riche (XML/JSON)
- Interprétation des champs variable selon les banques

### Utilisation actuelle

Toujours **majoritaire** dans le monde du paiement par carte :
- Autorisation en temps réel
- Clearing et settlement
- Utilisé en interne par Visa, MasterCard, CB$$,
'["ISO 8583:1993 reste la version la plus utilisée","128/192 champs max = limite fondamentale","DE48 et DE62 = fourre-tout pour données propriétaires","Toujours majoritaire pour le paiement par carte"]'::jsonb,
1, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.4.2-iso20022', 'mod-3.4-messaging', 'ISO 20022 : le nouveau standard mondial',
$$## Origine et objectif

ISO 20022 (normalisé par SWIFT, puis ISO) vise à remplacer ISO 8583 et les messages MT par un **modèle de données unique en XML/JSON**.

### Avantages

- Modèle de données **riche** (pas de limite de champs)
- Lisibilité humaine (balises XML)
- Interopérabilité mondiale
- Support natif de la traçabilité et conformité (LEI, etc.)

### Messages clés ISO 20022

| Message MX | Nom | Équivalent MT | Usage |
|-----------|-----|--------------|-------|
| pain.001 | Customer Credit Transfer Initiation | MT 101 | Initiation virement |
| pacs.008 | FI To FI Customer Credit Transfer | MT 103 | Virement interbancaire |
| pacs.003 | Direct Debit | MT 104 | Prélèvement |
| camt.053 | Bank To Customer Statement | MT 940 | Relevé de compte |
| camt.054 | Debit Credit Notification | MT 900/910 | Notification |

> **Échéance** : SWIFT a imposé la migration complète pour novembre 2025. Tous les paiements de gros montant transitent en ISO 20022.

### JSON depuis 2025

ISO 20022 accepte désormais le format JSON en plus du XML, facilitant l'intégration avec les API modernes.$$,
'["ISO 20022 = modèle de données universel en XML ou JSON","pain = initiation client, pacs = interbancaire, camt = relevés","Migration SWIFT complète depuis novembre 2025","JSON accepté depuis 2025 (en plus du XML)"]'::jsonb,
2, 45) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.4.3-comparaison', 'mod-3.4-messaging', 'Comparaison et coexistence des formats',
$$## ISO 8583 vs ISO 20022

| Critère | ISO 8583 | ISO 20022 |
|---------|----------|-----------|
| Format | Binaire / ASCII fixe | XML, JSON |
| Lisibilité | Faible | Élevée |
| Extensibilité | Limitée (champs privés) | Illimitée (namespaces) |
| Validation | Par bitmap | Schéma XSD |
| Domaine | Paiement par carte | Tous paiements |
| Adoption | 95% des switchs carte | 100% virements SEPA |

## Coexistence et traduction

Les deux formats vont cohabiter pendant au moins une décennie. Les switchs modernes intègrent des **moteurs de transformation** :

- **ISO 8583 → ISO 20022** : entrée dans les systèmes core banking
- **ISO 20022 → ISO 8583** : acceptation par d'anciens acquéreurs

### Défis de la traduction

| Défi | Exemple |
|------|---------|
| Champs non mappables | Données structurées ISO 20022 → DE48 (flat) |
| Perte d'information | Adresse structurée → ligne unique |
| Formats de montant | Décimal libre vs n12 fixe |
| Encodage | UTF-8 vs ASCII/EBCDIC |

> **La richesse d'ISO 20022 est souvent perdue dans la traduction** : les champs structurés sont aplatis pour rentrer dans les DE ISO 8583.$$,
'["ISO 8583 = binaire/ASCII fixe, ISO 20022 = XML/JSON structuré","Coexistence pendant une décennie, moteurs de transformation nécessaires","Traduction = perte de richesse (champs structurés → flat)","95% des switchs carte = ISO 8583, 100% SEPA = ISO 20022"]'::jsonb,
3, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.4.4-architecture', 'mod-3.4-messaging', 'Architecture moderne ISO 20022',
$$## Architecture event-driven

Les fournisseurs cloud proposent des architectures modernes pour le traitement ISO 20022 :

```
[API Gateway] → [Validation XSD] → [Transformation] → [Routage]
                                          ↓
                                    [Files SQS/Kafka]
                                          ↓
                                    [Stockage DB]
                                          ↓
                                    [Analytics]
```

### Avantages

- Messages conservés en base avec capacité de **rejeu** et correction
- Scaling horizontal (chaque composant est indépendant)
- Analytics temps réel sur les flux de paiement
- Intégration API native (REST, GraphQL)

## Exemple : pain.001 simplifié

```xml
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>FACT-2026-0212</MsgId>
      <CreDtTm>2026-02-12T14:30:00</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
    </GrpHdr>
    <PmtInf>
      <Dbtr>
        <Nm>MoneticLab SARL</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id><IBAN>FR7630001007941234567890185</IBAN></Id>
      </DbtrAcct>
      <CdtTrfTxInf>
        <Amt><InstdAmt Ccy="EUR">1250.00</InstdAmt></Amt>
        <Cdtr><Nm>Fournisseur X</Nm></Cdtr>
        <CdtrAcct>
          <Id><IBAN>DE89370400440532013000</IBAN></Id>
        </CdtrAcct>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
```

> **pain.001** = initié par le client. **pacs.008** = message interbancaire correspondant.$$,
'["Architecture event-driven : API → validation → transformation → files → stockage","Rejeu et correction possibles grâce au stockage persistant","pain.001 = initiation virement par le client","pacs.008 = virement interbancaire entre institutions"]'::jsonb,
4, 40) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Chapters for Module 3.5 – Tokenisation & P2PE (4 chapters)
-- =============================================================================

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.5.1-concepts', 'mod-3.5-tokenisation', 'Tokenisation vs Chiffrement',
$$## Deux approches pour protéger le PAN

| Approche | Principe | Réversible ? | Impact PCI |
|----------|----------|-------------|-----------|
| **Chiffrement** | Transformation mathématique avec clé | Oui (avec la clé) | Réduit si clés protégées |
| **Tokenisation** | Substitution par un identifiant sans lien | Non (hors coffre TSP) | Hors périmètre PCI |

### Les trois familles de jetons

| Type | Producteur | Domaine | Caractéristique |
|------|-----------|---------|-----------------|
| Jeton acquéreur | PSP, commerçant | Un seul commerçant | Réversible via coffre local |
| Jeton réseau (EMV) | TSP enregistré EMVCo | Multi-commerçants | Avec cryptogramme à usage unique |
| Jeton émetteur | Banque émettrice | Côté porteur | Lié au PAN, utilisé dans les wallets |

## EMV Payment Tokenisation

### Acteurs

- **TSP** (Token Service Provider) : génère et gère les jetons, enregistré EMVCo
- **Token Requestor** : demande un jeton (wallet, commerçant)
- **BIN Controller** : gère les plages de BIN pour les jetons

### Données clés

- **Token** : PAN de substitution (16-19 chiffres, BIN dédié)
- **PAR** (Payment Account Reference) : 29 caractères, lie token au PAN sans l'exposer, stable dans le temps
- **Cryptogramme** : preuve que le token est légitime et utilisé dans son domaine$$,
'["Chiffrement = réversible avec clé, Tokenisation = substitution sans lien mathématique","Jeton EMV : accompagné d''un cryptogramme à usage unique","PAR = Payment Account Reference, 29 caractères, stable","TSP = Token Service Provider, enregistré EMVCo"]'::jsonb,
1, 30) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.5.2-cycle', 'mod-3.5-tokenisation', 'Cycle de vie d''un token EMV',
$$## Les 6 étapes du cycle de vie

### 1. Demande de tokenisation
Token Requestor (wallet, commerçant) → TSP : "Je veux un token pour ce PAN"

### 2. Génération
TSP crée un token associé au PAN et au domaine (e-commerce, mobile, IoT...)

### 3. Provisioning
Le token est chargé dans l'appareil (mobile, serveur commerçant)

### 4. Transaction
Le token est présenté à la place du PAN : `DE2 = 520999123456789`

### 5. Détokenisation
L'émetteur reçoit le token → le TSP retrouve le PAN pour l'autorisation

### 6. Suspension / Révocation
En cas de perte de l'appareil, le token est désactivé. **Le PAN reste valide**.

## Transaction avec token

```
Commerçant → Acquéreur : DE2 = token (520999...)
Acquéreur → TSP : Vérification token + cryptogramme
TSP → Acquéreur : PAN réel (substitution transparente)
Acquéreur → Émetteur : DE2 = PAN réel + PAR en DE48
Émetteur → Acquéreur : Réponse (code 00)
```

Le TSP vérifie :
1. Le token est **actif** et non expiré
2. Le **domaine** est autorisé (ce commerçant, ce device)
3. Le **cryptogramme** est valide (appel HSM)
4. Remplace DE2 par le PAN réel$$,
'["6 étapes : demande → génération → provisioning → transaction → détokenisation → révocation","Le token remplace le PAN dans DE2 du message ISO 8583","Le TSP vérifie domaine + cryptogramme avant détokenisation","Révocation du token n''affecte pas le PAN (carte toujours utilisable)"]'::jsonb,
2, 30) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.5.3-p2pe', 'mod-3.5-tokenisation', 'P2PE : Point-to-Point Encryption',
$$## Principe du P2PE

Chiffrement des données de carte **dès le terminal** jusqu'au déchiffrement dans l'environnement sécurisé du processeur.

### PCI P2PE Standard v3.1

Solution validée par le PCI SSC avec 5 domaines d'exigences :
1. Gestion sécurisée des terminaux et applications
2. Sécurité des applications
3. Gestion de la solution P2PE
4. Environnement de déchiffrement
5. Gestion des clés cryptographiques

### Bénéfice majeur

Le réseau du commerçant (LAN, WiFi) **sort du périmètre PCI DSS**. Le questionnaire SAQ est drastiquement réduit (SAQ P2PE).

## P2PE vs E2EE

| Aspect | P2PE | E2EE |
|--------|------|------|
| Validation | PCI SSC (auditée) | Non validée |
| Matériel | Terminaux approuvés | Tout terminal |
| Périmètre PCI | Quasi nul (SAQ P2PE) | Réduit mais pas supprimé |
| Coût | Élevé (certification) | Moindre |

## Champs chiffrés en P2PE

Dans le message ISO 8583, les champs suivants sont chiffrés :
- **DE2** : PAN
- **DE35** : Track 2 equivalent data
- **DE45** : Track 1 data
- **DE52** : PIN block

Le reste du message (montant, date, terminal ID) est en clair pour permettre le routage.$$,
'["P2PE = chiffrement dès le terminal → processeur, validé PCI SSC","Réseau du commerçant hors périmètre PCI DSS avec P2PE","E2EE = chiffrement maison, non validé, périmètre réduit mais pas supprimé","DE2, DE35, DE45, DE52 chiffrés ; montant/date en clair pour routage"]'::jsonb,
3, 30) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.5.4-reduction-pci', 'mod-3.5-tokenisation', 'P2PE + Tokenisation : réduction du périmètre PCI',
$$## Le duo gagnant

Combinaison recommandée :
- **P2PE** : protège les données en transit (terminal → processeur)
- **Tokenisation** : stocke un jeton en base pour les paiements récurrents

### Scénario abonnement

1. **Transaction initiale** : P2PE + tokenisation réseau
2. **Transactions suivantes** : usage du token (avec cryptogramme si EMV) → pas de manipulation du PAN

## Réduction du périmètre PCI

| Méthode | PAN vu par commerçant ? | Périmètre PCI |
|---------|------------------------|---------------|
| PAN clair | Oui | Tout le SI |
| Chiffrement (E2EE) | Non, mais clés présentes | Réduit (salles serveurs) |
| P2PE validé | Non | Quasi nul (SAQ P2PE) |
| Tokenisation réseau | Non (token) | Faible (si non réversible) |
| **P2PE + Tokenisation** | **Non** | **Minimal** |

### Cas Apple Pay

Apple Pay combine :
- **Tokenisation EMV** : DPAN (Device PAN) dans le Secure Element
- **Élement sécurisé matériel** : pas de HCE
- **Cryptogramme dynamique** : unique par transaction
- **Biométrie** : Face ID / Touch ID

Le commerçant ne voit **jamais** le PAN réel. Le processeur reçoit le token + cryptogramme, contacte le TSP pour le PAN.

> **Résultat** : Apple Pay est considéré comme l'un des modes de paiement les plus sécurisés.$$,
'["P2PE (transit) + Tokenisation (stockage) = périmètre PCI minimal","SAQ P2PE = questionnaire PCI le plus réduit pour les commerçants","Apple Pay : tokenisation EMV + SE matériel + biométrie = très sécurisé","Commerçant ne voit jamais le PAN réel avec ces technologies"]'::jsonb,
4, 30) ON CONFLICT (id) DO NOTHING;
