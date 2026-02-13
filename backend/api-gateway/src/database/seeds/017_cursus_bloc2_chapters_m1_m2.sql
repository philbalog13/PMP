-- Chapters for Module 2.1 – ISO/IEC 7816

-- Chapter 1: ISO 7816 et la carte à puce
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.1.1-iso7816', 'mod-2.1-iso7816', 'ISO/IEC 7816 : le socle de la carte à puce',
$$## La norme ISO/IEC 7816

La norme ISO/IEC 7816 régit les cartes à circuit intégré (cartes à puce) à contacts. Elle est le fondement de la carte bancaire EMV.

### Parties principales

| Partie | Objet |
|--------|-------|
| 7816-1 | Caractéristiques physiques |
| 7816-2 | Dimensions et position des contacts |
| 7816-3 | Signaux électriques et protocoles (T=0, T=1) |
| 7816-4 | Structure des fichiers, commandes APDU, sécurité |

### Structure logique de la carte

La carte est vue comme un système de fichiers hiérarchique :

- **MF (Master File)** : Racine, unique.
- **DF (Dedicated File)** : Répertoire (ex : DF GSM, DF EMV).
- **EF (Elementary File)** : Fichier de données.
  - **Transparent** : séquence d'octets (lecture séquentielle).
  - **Record** : structure à enregistrements (linéaire, cyclique).

## L'APDU : le langage de la carte

L'APDU est l'unité de dialogue. Deux types :
- **C-APDU (Command)** : envoyée par le terminal.
- **R-APDU (Response)** : réponse de la carte.

### Structure de la Command APDU

```
+------+-----+----+----+------+------+------+
| CLA  | INS | P1 | P2 | [Lc] | DATA | [Le] |
+------+-----+----+----+------+------+------+
  \____________/  \_________________________/
      Header                 Body
```

**CLA** (1 octet) : Classe de la commande.
- `0x00` : commande ISO/IEC 7816
- `0x80` : commande propriétaire (souvent EMV)
- `0x84` : commande étendue, sécurité

**INS** (1 octet) : Instruction.
- `0xA4` : SELECT FILE
- `0xB0` : READ BINARY
- `0xB2` : READ RECORD
- `0x20` : VERIFY PIN
- `0x84` : GET CHALLENGE
- `0x88` : GENERATE APPLICATION CRYPTOGRAM (EMV)
- `0xC0` : GET RESPONSE

**P1, P2** : Paramètres de l'instruction.
**Lc** : Longueur du champ DATA.
**Le** : Longueur maximale des données attendues en réponse.$$,
'["ISO 7816-4 définit les commandes APDU et la structure de fichiers","C-APDU = commande du terminal, R-APDU = réponse de la carte","CLA détermine la classe (00=ISO, 80=propriétaire EMV)","INS identifie l''instruction (A4=SELECT, 20=VERIFY, 88=GENERATE AC)"]'::jsonb,
1, 40) ON CONFLICT (id) DO NOTHING;

-- Chapter 2: Les 4 cas de figure et les status words
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.1.2-cas-sw', 'mod-2.1-iso7816', 'Les 4 cas de figure et les Status Words',
$$## Les 4 cas de figure APDU

| Cas | Header | Lc | Data | Le | Exemple |
|-----|--------|-----|------|-----|---------|
| 1 | Oui | Non | Non | Non | `00 A4 04 00` (sélection par DF vide) |
| 2 | Oui | Non | Non | Oui | `00 B0 00 00 0A` (lire 10 octets) |
| 3 | Oui | Oui | Oui | Non | `00 D6 00 02 05 A1B2C3D4E5` (écrire 5 octets) |
| 4 | Oui | Oui | Oui | Oui | `00 88 00 00 10 0123... 00` (GENERATE AC) |

## Structure de la Response APDU

```
+----------------+--------+
|   DATA (opt)   | SW1 SW2 |
+----------------+--------+
```

- **DATA** : Octets de résultat (lecture de fichier, cryptogramme...).
- **SW1-SW2** : Status Word (2 octets), indique le succès ou l'échec.

## Codes SW1/SW2 essentiels en monétique

| SW1 | SW2 | Signification |
|-----|-----|---------------|
| `90` | `00` | Succès (OK) |
| `62` | `83` | Fichier sélectionné invalide |
| `63` | `00` | PIN faux, compteur épuisé |
| `63` | `Cx` | PIN faux, x tentatives restantes (ex: `63 C2` = 2 restantes) |
| `65` | `81` | Échec écriture mémoire |
| `67` | `00` | Longueur incorrecte (Lc/Le erroné) |
| `69` | `82` | Sécurité non satisfaite (VERIFY PIN requis) |
| `69` | `83` | Méthode d'authentification bloquée (PIN bloqué) |
| `69` | `85` | Conditions d'utilisation non remplies |
| `6A` | `82` | Fichier non trouvé |
| `6A` | `86` | P1-P2 incorrect |
| `6D` | `00` | INS inconnu |

> **Règle d'or** : Si SW ≠ 90 00, il faut analyser le code pour comprendre l'erreur avant de continuer le dialogue.$$,
'["4 cas APDU selon la présence de Lc, Data et Le","R-APDU = Data optionnelle + SW1 SW2 obligatoire","90 00 = succès, 63 Cx = PIN faux avec x tentatives restantes","69 83 = PIN bloqué définitivement"]'::jsonb,
2, 30) ON CONFLICT (id) DO NOTHING;

-- Chapter 3: Dialogue EMV complet en contact
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.1.3-dialogue', 'mod-2.1-iso7816', 'Dialogue EMV complet en contact',
$$## Le script de transaction EMV

Une transaction EMV suit un script APDU prédéfini :

### 1. SELECT PPSE
```
00 A4 04 00 0E 325041592E5359532E4444463031 00
```
Recherche l'application de paiement (fichier `2PAY.SYS.DDF01`).

### 2. SELECT AID
Sélection de l'application Visa : `A0 00 00 00 03 10 10`.

### 3. GET PROCESSING OPTIONS (GPO)
```
80 A8 00 00 ...
```
La carte retourne l'**AFL** (Application File Locator) qui indique les fichiers à lire.

### 4. READ RECORD
Lecture des fichiers de données : certificats, limites, clés.

### 5. VERIFY PIN
Si on-line ou off-line, le terminal présente le PIN.

### 6. GET CHALLENGE
```
00 84 00 00 08
```
Récupère un aléa carte (8 octets).

### 7. GENERATE AC
```
80 88 00 00 ...
```
Génération du cryptogramme :
- **TC** (Transaction Certificate) : accepté offline
- **ARQC** (Authorization Request Cryptogram) : à envoyer online
- **AAC** (Application Authentication Cryptogram) : refusé offline

## Exemple d'analyse de trace

```
<= 00 A4 04 00 0E 32 50 41 59 2E 53 59 53 2E 44 44 46 30 31 00
=> 6F 23 84 0E ... A0 00 00 00 03 10 10 50 06 56 69 73 61 20 20 90 00
```

- Commande : SELECT du PPSE
- Réponse : AID Visa détecté, `5669736120` = "Visa " en ASCII
- Status : `90 00` = succès

> **Point clé** : Le champ `5F 2D 02 66 72` dans la réponse SELECT indique la préférence linguistique (`66 72` = "fr" en ASCII).$$,
'["Transaction EMV = 7 étapes : SELECT PPSE → SELECT AID → GPO → READ RECORD → VERIFY → GET CHALLENGE → GENERATE AC","TC = accepté offline, ARQC = demande online, AAC = refusé offline","L''AFL indique quels fichiers la carte doit mettre à disposition","Les données ASCII dans les réponses (ex: 66 72 = fr) donnent des informations contextuelles"]'::jsonb,
3, 40) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Chapters for Module 2.2 – NFC, ISO 14443
-- =============================================================================

-- Chapter 1: ISO 14443 – La norme des cartes de proximité
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.2.1-iso14443', 'mod-2.2-nfc', 'ISO/IEC 14443 : cartes de proximité',
$$## Caractéristiques fondamentales

- **Fréquence** : 13,56 MHz
- **Distance** : jusqu'à 10 cm (typiquement 4-7 cm)
- **Débit** : 106 kbit/s (base), extensible à 424, 848 kbit/s
- **Alimentation** : par induction électromagnétique

## Architecture en 4 parties

| Partie | Objet |
|--------|-------|
| Partie 1 | Caractéristiques physiques (format ID-1, résistance) |
| Partie 2 | Interface radiofréquence et signalisation |
| Partie 3 | Initialisation et anti-collision |
| Partie 4 | Protocole de transmission (blocs, chaining, timeouts) |

## Type A vs Type B

| Caractéristique | Type A | Type B |
|-----------------|--------|--------|
| Modulation (PCD → PICC) | 100% ASK | 10% ASK |
| Codage bits (PCD → PICC) | Modified Miller | NRZ-L |
| Modulation (PICC → PCD) | Load modulation, sous-porteuse 847 kHz | Load modulation, sous-porteuse 847 kHz |
| Codage bits (PICC → PCD) | OOK + Manchester | BPSK + NRZ |
| Anti-collision | Arbre binaire (UID) | Slotted Aloha |
| Exemples | MIFARE, EMV Contactless, e-passeport | Carte d'identité française, certaines cartes US |

> **En monétique** : le Type A est massivement dominant (Visa payWave, MasterCard PayPass, CB sans contact).$$,
'["ISO 14443 : 13,56 MHz, portée ~4-10 cm, 106 kbit/s base","4 parties : physique, RF, anti-collision, protocole de transmission","Type A (100% ASK, Modified Miller) dominant en paiement","Type B (10% ASK, NRZ-L) utilisé pour identité"]'::jsonb,
1, 40) ON CONFLICT (id) DO NOTHING;

-- Chapter 2: Pile protocolaire et anti-collision
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.2.2-anticollision', 'mod-2.2-nfc', 'Pile protocolaire EMV Contactless et anti-collision',
$$## La pile protocolaire sans contact EMV

EMV Contactless utilise ISO 14443 en couche physique, puis ajoute ses propres règles :

1. **Activation** : le lecteur émet un champ RF, la carte répond par l'anti-collision.
2. **Sélection de l'application** : identique au contact (SELECT PPSE, SELECT AID).
3. **Échange de données** : les commandes APDU sont encapsulées dans des blocs ISO 14443-4 (I-blocks).
4. **Protocole de transaction** : défini par les Kernels EMV (1 à 7 selon le type de carte).

## Anti-collision détaillée (Type A)

1. **REQA** (Request Type A) : le lecteur envoie `0x26`.
2. **ATQA** : la carte répond avec son UID (taille, capacité).
3. **ANTICOLLISION** : le lecteur envoie un UID partiel, les cartes répondent bit à bit.
4. **SELECT** : le lecteur choisit une carte.
5. **HALT** : mise en sommeil des autres cartes.

> Cette mécanique permet d'avoir **plusieurs cartes dans le champ** sans collision.

## Exemple de capture NFC

```
PCD: 26                          # REQA
PICC: 44 00                     # ATQA (UID size double)
PCD: 93 20                     # ANTICOLLISION
PICC: 08 4F 12 3A 45           # UID partiel
PCD: 93 70 08 4F 12 3A 45 00  # SELECT
PICC: 08 4F 12 3A 45 20       # SAK (14443-4 supporté)
PCD: 02 00 38 84 00 ...       # RATS
PICC: 05 78 80 70 02 02       # ATS
PCD: 0A 00 A4 04 00 0E ...    # APDU dans I-block
```

Le SAK bit 5 = 1 indique que la carte supporte ISO 14443-4 (protocole de haut niveau pour les APDU).$$,
'["EMV Contactless = ISO 14443 physique + Kernels EMV applicatifs","Anti-collision Type A : REQA → ATQA → ANTICOLLISION → SELECT → HALT","Plusieurs cartes dans le champ sont gérées par l''algorithme d''arbre binaire","SAK bit 5 = 1 indique le support ISO 14443-4"]'::jsonb,
2, 40) ON CONFLICT (id) DO NOTHING;

-- Chapter 3: NFC et ses modes
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.2.3-nfc', 'mod-2.2-nfc', 'NFC : Near Field Communication',
$$## NFC : extension de l'ISO 14443

Le NFC est une extension de l'ISO 14443 qui permet trois modes :

### 1. Mode lecteur (Reader/Writer)
Comme un TPE : le téléphone lit une carte NFC ou un tag.

### 2. Mode carte (Card Emulation)
Le téléphone **simule une carte bancaire**. C'est le mode utilisé pour Apple Pay, Google Pay, Samsung Pay.

### 3. Mode pair-à-pair (Peer-to-Peer)
Échange de données entre deux appareils NFC (Android Beam, désormais obsolète).

## Points techniques

| Caractéristique | Valeur |
|-----------------|--------|
| Fréquence | 13,56 MHz |
| Débit max | 424 kbit/s |
| Portée | < 10 cm |
| Standards | ISO 14443, ISO 18092, NDEF |

## HCE (Host-based Card Emulation)

L'application Android/iOS échange des APDU directement, **sans élément sécurisé matériel** (SE).

- **Avantage** : Pas besoin de SIM spéciale ou de chip dédié.
- **Inconvénient** : La clé de paiement est protégée par logiciel (tokenisation obligatoire).
- **En pratique** : Les tokens sont limités dans le temps et le nombre d'utilisations.

> **Apple Pay** utilise un Secure Element matériel intégré dans l'iPhone. **Google Pay** utilise HCE avec tokenisation côté serveur.$$,
'["NFC = 3 modes : lecteur, carte (paiement mobile), pair-à-pair","HCE = émulation de carte par logiciel, sans élément sécurisé matériel","Apple Pay = SE matériel, Google Pay = HCE + tokenisation serveur","Même fréquence 13,56 MHz que l''ISO 14443"]'::jsonb,
3, 30) ON CONFLICT (id) DO NOTHING;
