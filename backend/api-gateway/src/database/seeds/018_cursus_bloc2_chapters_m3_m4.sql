-- Chapters for Module 2.3 – APDU → ISO 8583 (4 chapters)

-- Chapter 1: De la carte au switch
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.3.1-transformation', 'mod-2.3-iso8583', 'De la carte au switch : le changement de paradigme',
$$## Du dialogue local au message réseau

La carte parle en **APDU** (ISO 7816). Le terminal traduit cette interaction en un **message d'autorisation** à destination de la banque. Ce message suit la norme **ISO 8583**.

> ISO 8583 : *Financial transaction card originated messages – Interchange message specifications.*

### Ce que fait le terminal

1. Dialogue avec la carte (APDU) → collecte les données EMV
2. Construit un message ISO 8583 (MTI 0100 = demande d'autorisation)
3. Envoie au switch via TCP/IP
4. Reçoit la réponse (MTI 0110)
5. Transmet le résultat à la carte (EXTERNAL AUTHENTICATE ou second GENERATE AC)

### Structure d'un message ISO 8583

Trois parties :
- **MTI** (Message Type Indicator) – 4 chiffres
- **Bitmap(s)** – indique quels champs sont présents (64 bits primaire, 128 secondaire)
- **Data Elements (DE)** – les champs de données$$,
'["La carte parle APDU, le réseau parle ISO 8583","Le terminal fait la traduction entre les deux mondes","ISO 8583 = MTI + bitmap(s) + data elements","Dernière version : ISO 8583:2023"]'::jsonb,
1, 30) ON CONFLICT (id) DO NOTHING;

-- Chapter 2: MTI et bitmap
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.3.2-mti-bitmap', 'mod-2.3-iso8583', 'MTI et bitmap : identifier et structurer le message',
$$## Le MTI (Message Type Indicator)

Format : **abcd** (4 chiffres)

| Position | Signification | Valeurs |
|----------|--------------|---------|
| a | Version | 0=1987, 1=1993, 2=2003, 8=2023 |
| b | Classe | 1=Autorisation, 2=Financier, 4=Reversement, 6=Admin |
| c | Fonction | 0=Requête, 1=Réponse, 2=Advice |
| d | Origine | 0=Acquéreur, 1=Émetteur |

### Exemples courants

- **0100** : Demande d'autorisation (acquéreur → émetteur)
- **0110** : Réponse à l'autorisation
- **0200** : Demande financière (avec capture immédiate)
- **0420** : Reversement (chargeback)

## Le bitmap

Chaque bit = 1 indique que le data element correspondant est présent.

- **64 bits** (8 octets) pour le bitmap primaire
- Si bit 1 = 1, un **bitmap secondaire** (64 bits supplémentaires) suit

### Lecture du bitmap

```
Bitmap hex : 38 00 00 00 00 00 00 00
Binaire :    0011 1000 0000 ...
→ Bits 3, 4, 5 sont présents = DE3, DE4, DE5
```$$,
'["MTI = 4 chiffres codant version, classe, fonction, origine","0100 = demande d''autorisation, 0110 = réponse","Bitmap primaire = 64 bits, secondaire optionnel = 128 bits","Chaque bit à 1 indique la présence du DE correspondant"]'::jsonb,
2, 30) ON CONFLICT (id) DO NOTHING;

-- Chapter 3: Data Elements essentiels
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.3.3-data-elements', 'mod-2.3-iso8583', 'Data Elements essentiels en monétique',
$$## Les champs clés d'ISO 8583

| DE | Nom | Format | Exemple |
|----|-----|--------|---------|
| 2 | PAN | n..19 (LLVAR) | `16 4970123456789012` |
| 3 | Code traitement | n6 | `003000` (paiement) |
| 4 | Montant | n12 | `000000002500` (25,00 €) |
| 7 | Date transmission | n10 (MMDDhhmmss) | |
| 11 | Numéro de trace | n6 | |
| 14 | Date expiration | n4 (YYMM) | `2612` |
| 22 | Mode d'entrée | n3 | `051` (puce, PIN online) |
| 35 | Piste 2 | z..37 (LLVAR) | |
| 38 | Code approbation | an6 | |
| 39 | Code réponse | n2 | `00` (accepté), `05` (refus) |
| 41 | ID terminal (TID) | ans8 | |
| 42 | ID commerçant (MID) | ans15 | |
| 49 | Code devise | n3 | `978` (EUR) |
| 52 | PIN block | b64 | |
| 55 | Données EMV (TLV) | b..255 (LLLVAR) | |

### Formats de données

- **n** : numérique
- **an** : alphanumérique
- **LLVAR** : longueur sur 2 chiffres + donnée variable
- **LLLVAR** : longueur sur 3 chiffres + donnée variable
- **b** : binaire$$,
'["DE2 = PAN, DE4 = montant, DE39 = code réponse, DE52 = PIN block, DE55 = données EMV","LLVAR/LLLVAR = format à longueur variable avec préfixe de longueur","DE22 mode d''entrée : 05x = puce, 07x = sans contact, 01x = saisie manuelle","DE39 code 00 = accepté, 05 = refusé, 91 = émetteur indisponible"]'::jsonb,
3, 30) ON CONFLICT (id) DO NOTHING;

-- Chapter 4: Le pont EMV TLV → DE 55
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.3.4-de55', 'mod-2.3-iso8583', 'Le pont : du TLV EMV au DE 55',
$$## Le champ DE 55 : réceptacle des données EMV

Le DE 55 est un champ composite contenant des objets **TLV** (Tag-Length-Value).

### Exemple de contenu DE 55

```
9F 26 08 2A 3B 4C 5D 6E 7F 8A 9B    (ARQC)
9F 27 01 80                         (Cryptogramme Info Data)
9F 10 07 01 02 03 04 05 AABBCC      (Issuer Application Data)
9F 37 04 12 34 56 78               (Aléa terminal)
95 05 00 00 00 00 80               (TVR)
9B 02 E8 00                        (TSI)
```

### Mapping APDU → ISO 8583

| Donnée source | Dans APDU | Dans ISO 8583 |
|--------------|-----------|---------------|
| PAN | Lecture EF (Track 2) | DE 2 |
| Montant | Entrée TPE | DE 4 |
| Mode entrée | TVR, TSI | DE 22 |
| Date expiration | Donnée carte | DE 14 |
| PIN bloc | Commande VERIFY (chiffré) | DE 52 |
| ARQC | Réponse GENERATE AC | DE 55 (Tag 9F26) |
| TVR | Généré par terminal | DE 55 (Tag 95) |
| Aléa terminal | GET CHALLENGE | DE 55 (Tag 9F37) |

> **L'émetteur** a besoin de ces données EMV pour vérifier le cryptogramme, appliquer les règles de risque, et authentifier la carte.$$,
'["DE 55 contient les données EMV au format TLV (Tag-Length-Value)","Tag 9F26 = ARQC (cryptogramme), Tag 95 = TVR, Tag 9B = TSI","L''émetteur utilise le DE 55 pour vérifier l''authenticité de la carte","Le terminal est le traducteur entre le monde APDU et le monde ISO 8583"]'::jsonb,
4, 30) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Chapters for Module 2.4 – EMV Carte & Terminal (4 chapters)
-- =============================================================================

-- Chapter 1: Architecture EMV
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.4.1-archi', 'mod-2.4-emv', 'Architecture EMV : Books et Kernels',
$$## Qu'est-ce qu'EMV ?

**EMV** = Europay, MasterCard, Visa — aujourd'hui géré par **EMVCo**.

Standard mondial pour les transactions par carte à puce. Remplace la bande magnétique (données statiques) par un **cryptogramme dynamique**.

### Architecture documentaire

| Document | Contenu |
|----------|---------|
| Book 1 | Application indépendante (concepts, terminologie) |
| Book 2 | Sécurité et gestion des clés |
| Book 3 | Spécification de l'application |
| Book 4 | Interface terminal/carte |
| Kernels | Spécifiques au sans contact (K2=MC, K3=Visa...) |

### Les données critiques de la carte

| Tag | Nom | Rôle |
|-----|-----|------|
| 82 | AIP | Capacités de la carte (auth dynamique, CVM...) |
| 94 | AFL | Liste des fichiers à lire |
| 9F38 | PDOL | Données que le terminal doit fournir |
| 90 | Issuer PK Certificate | Certificat émetteur |
| 9F46 | ICC PK Certificate | Certificat carte |
| 8E | CVM List | Méthodes de vérification acceptées |
| 9F1B | Floor Limit | Plafond offline |$$,
'["EMV = standard mondial géré par EMVCo, remplace la bande magnétique","4 Books + Kernels pour le sans contact","AIP (Tag 82) = capacités carte, AFL (Tag 94) = fichiers à lire","CVM List (Tag 8E) = méthodes de vérification porteur acceptées"]'::jsonb,
1, 45) ON CONFLICT (id) DO NOTHING;

-- Chapter 2: Transaction EMV complète
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.4.2-transaction', 'mod-2.4-emv', 'Le déroulé complet d''une transaction EMV',
$$## Les 7 phases d'une transaction EMV contact

### Phase 1 : Initialisation
- **SELECT PPSE** : Trouver les applications de paiement
- **SELECT AID** : Choisir l'application (Visa, MC, CB)

### Phase 2 : Traitement des données
- **GET PROCESSING OPTIONS (GPO)** : le terminal envoie les données PDOL
- La carte répond par l'**AFL** (liste des fichiers à lire)
- **READ RECORD** (boucle) : lecture des certificats, clés, listes CVM

### Phase 3 : Vérification du porteur (CVM)
Selon la liste CVM de la carte et les capacités du terminal :
- **PIN off-line** : carte vérifie le code
- **PIN on-line** : terminal chiffre et envoie
- **Signature** : papier (non sécurisé)
- **Aucune CVM** : sans contact petit montant

### Phase 4 : Analyse des risques (terminal)
Le terminal évalue : date d'expiration, plafond offline, compteurs, hotlist.
Résultat → **TVR** (Terminal Verification Results)

### Phase 5 : Demande de cryptogramme
**GENERATE AC** → la carte répond par :
- **TC** : accepté offline
- **ARQC** : à envoyer online
- **AAC** : refusé offline

### Phase 6 : Traitement online (si ARQC)
Terminal construit ISO 8583 → émetteur vérifie → répond ARPC

### Phase 7 : Finalisation
Carte met à jour ses compteurs, terminal imprime ticket$$,
'["7 phases : init → données → CVM → risques → crypto → online → final","3 cryptogrammes possibles : TC (offline OK), ARQC (online), AAC (refus)","Le TVR résume tous les tests échoués par le terminal","Le GPO déclenche la phase de traitement avec les données PDOL"]'::jsonb,
2, 60) ON CONFLICT (id) DO NOTHING;

-- Chapter 3: TVR et TSI
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.4.3-tvr-tsi', 'mod-2.4-emv', 'TVR et TSI : les registres de décision',
$$## Le TVR (Terminal Verification Results) — Tag 95

Le TVR est un champ de **5 octets (40 bits)**. Chaque bit indique un test échoué.

### Octet 1 — Authentification offline

| Bit | Signification |
|-----|---------------|
| B8 | Offline data auth not performed |
| B7 | SDA failed |
| B6 | ICC data missing |
| B5 | Card on hotlist |
| B4 | DDA failed |
| B3 | CDA failed |

### Octet 3 — Vérification du porteur

| Bit | Signification |
|-----|---------------|
| B8 | CVM non réalisée |
| B7 | CVM failed |
| B6 | PIN try limit exceeded |
| B5 | PIN non saisi (timeout) |

### Octet 4 — Gestion des risques

| Bit | Signification |
|-----|---------------|
| B8 | Transaction exceed floor limit |
| B7 | Random online selected |

## Le TSI (Transaction Status Information) — Tag 9B

Le TSI (2 octets) indique ce qui **a été réalisé** :

| Bit | Signification |
|-----|---------------|
| B8 | Offline data authentication performed |
| B7 | Cardholder verification performed |
| B6 | Card risk management performed |
| B5 | Issuer authentication performed |
| B4 | Terminal risk management performed |

> **Exemple** : TVR = `00 00 00 80 00` → bit 8 octet 4 = transaction dépasse le floor limit → online obligatoire.$$,
'["TVR = 5 octets, chaque bit = un test échoué par le terminal","TVR tag 95 est transmis dans le DE 55 du message ISO 8583","TSI = 2 octets indiquant les étapes effectivement réalisées","TVR influence la décision : TC (offline), ARQC (online), AAC (refus)"]'::jsonb,
3, 45) ON CONFLICT (id) DO NOTHING;

-- Chapter 4: ARQC — le cœur cryptographique
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.4.4-arqc', 'mod-2.4-emv', 'L''ARQC : le cœur cryptographique EMV',
$$## Qu'est-ce que l'ARQC ?

L'**ARQC** (Authorization Request Cryptogram) est un **MAC** calculé par la carte avec une clé dérivée (souvent 3DES ou AES).

### Données en entrée du calcul

- Montant
- Devise
- Pays
- TVR (Terminal Verification Results)
- ATC (Application Transaction Counter)
- Aléa terminal (unpredictable number)

Le tout est défini par le **CDOL** (Card Risk Management Data Object List).

### Vérification par l'émetteur

1. L'émetteur reçoit l'ARQC dans le DE 55 (Tag 9F26)
2. Il recalcule l'ARQC avec la **même clé** (dérivée de l'IMK via le PAN et l'ATC)
3. Si ARQC calculé = ARQC reçu → **carte authentique**
4. L'émetteur génère un **ARPC** (réponse) et le renvoie

### Les trois cryptogrammes

| Type | Signification | Action |
|------|--------------|--------|
| **TC** | Transaction Certificate | Acceptée offline |
| **ARQC** | Authorization Request Cryptogram | Envoyée online pour validation |
| **AAC** | Application Authentication Cryptogram | Refusée offline |

> **Point clé** : Même si les données de la carte sont copiées, le **cryptogramme change à chaque transaction** grâce à l'ATC et à l'aléa. C'est la force majeure d'EMV par rapport à la bande magnétique.$$,
'["ARQC = MAC calculé par la carte, vérifié par l''émetteur","Le calcul utilise montant, devise, TVR, ATC, aléa terminal (définis par CDOL)","L''émetteur recalcule avec la même clé dérivée de l''IMK","Le cryptogramme change à chaque transaction → impossible à cloner"]'::jsonb,
4, 45) ON CONFLICT (id) DO NOTHING;
