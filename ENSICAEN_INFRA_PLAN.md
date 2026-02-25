# Plan : Reproduire l'infrastructure ENSICAEN en tout-logiciel

## Contexte

L'article de Sulmont, Pasquet & Reynaud (ENSICAEN) decrit une PMP physique avec du materiel industriel reel. Ce plan detaille comment implementer les **6 elements manquants** de l'article en tant que services logiciels produisant les memes donnees et fonctionnalites.

---

## Vue d'ensemble des nouveaux services

```
                         +----------------------------------+
                         |      FRONTEND (Nouvelles apps)    |
                         |                                   |
                         |  gab-web (3007) - Interface GAB   |
                         |  pki-web (3009) - Console PKI     |
                         +----------+-----------------------+
                                    |
                         +----------v-----------------------+
                         |      API GATEWAY (8000)           |
                         |  + nouvelles routes /api/gab/*    |
                         |  + nouvelles routes /api/pki/*    |
                         |  + nouvelles routes /api/emv/*    |
                         |  + nouvelles routes /api/iso8583/*|
                         |  + nouvelles routes /api/audit/*  |
                         +----------+-----------------------+
                                    |
       +----------------------------+----------------------------+
       |                            |                            |
+------v------+  +--------v---------+  +----------v----------+
| sim-emv-    |  | sim-gab-service   |  | sim-pki-service     |
| perso       |  | (8016)            |  | (8017)              |
| (8020)      |  |                   |  |                     |
| Perso carte |  | Simulateur GAB    |  | Infrastructure PKI  |
| + embossage |  | + billets + oper. |  | + certificats       |
+-------------+  +-------------------+  +---------------------+

+-------------+  +-------------------+
| sim-iso8583 |  | sim-pci-audit     |
| -codec      |  | (8019)            |
| (8018)      |  |                   |
| Encodeur/   |  | Auditeur PCI-DSS  |
| Decodeur    |  | + rapports        |
| ISO 8583    |  |                   |
+-------------+  +-------------------+
```

---

## Service 1 : `sim-emv-personalization` (Port 8020)

### But
Simuler l'atelier de personnalisation de cartes EMV de l'ENSICAEN : ecriture des donnees puce, injection de certificats PKI, embossage visuel. L'article mentionne un "atelier de personnalisation" et une PKI interne pour les certificats ENSIBANK.

### Ce qu'il reproduit de l'article
- Personnalisation des cartes EMV (donnees puce, cryptographie)
- Machine a embosser (75kg) -> simulation logicielle
- Injection des certificats PKI de la banque dans les donnees carte
- Profils carte differents selon le niveau de securite

### Structure du service

```
backend/sim-emv-personalization/
+-- src/
|   +-- index.ts
|   +-- config/
|   |   +-- index.ts
|   +-- controllers/
|   |   +-- personalization.controller.ts
|   +-- services/
|   |   +-- emvProfile.service.ts      # Profils EMV (tags, AIDs, SFI)
|   |   +-- embossing.service.ts       # Simulation embossage visuel
|   |   +-- chipWriter.service.ts      # Ecriture donnees puce simulee
|   |   +-- cardCertificate.service.ts # Injection certificats dans la carte
|   +-- models/
|   |   +-- emvTags.ts                 # Dictionnaire complet des tags EMV
|   |   +-- cardProfile.ts            # Structure profil carte
|   |   +-- apduCommands.ts           # Commandes APDU simulees
|   +-- routes/
|   |   +-- personalization.routes.ts
|   +-- utils/
|       +-- logger.ts
+-- Dockerfile
+-- package.json
+-- tsconfig.json
```

### Endpoints

```
POST   /perso/profiles                  # Creer un profil EMV (VISA, MC, CB)
GET    /perso/profiles                  # Lister les profils disponibles
GET    /perso/profiles/:id             # Detail d'un profil (tags EMV inclus)

POST   /perso/personalize              # Lancer une personnalisation complete
  Body: { cardId, profileId, bankId, holderId }
  Retour: {
    emvData: { tags EMV ecrits, AID, SFI },
    embossing: { pan, holderName, expiry, embossedImage },
    certificates: { issuerCert, cardCert, publicKey },
    apduLog: [ { command, response, description } ],
    steps: [ "1. Selection profil...", "2. Generation cles...", ... ]
  }

GET    /perso/cards/:cardId/emv-data   # Lire les donnees EMV d'une carte
GET    /perso/cards/:cardId/apdu-log   # Journal APDU de personnalisation

POST   /perso/emboss                    # Simulation embossage seul
  Body: { pan, holderName, expiry }
  Retour: { embossedData, visualRepresentation }

GET    /perso/emv-tags                  # Dictionnaire des tags EMV (educatif)
GET    /perso/emv-tags/:tag            # Detail d'un tag (ex: 9F26 = AC)

GET    /health
```

### Donnees EMV simulees (exemple de sortie)

```json
{
  "emvData": {
    "5A": "4761340000000019",
    "5F20": "SULMONT/EMILIE",
    "5F24": "271231",
    "9F07": "FF00",
    "9F0D": "F040048000",
    "9F0E": "0010000000",
    "9F0F": "F040048000",
    "9F26": "A1B2C3D4E5F60718",
    "9F27": "80",
    "9F36": "0042",
    "9F4B": "...",
    "8C": "9F02069F03069F1A02...",
    "8D": "910A8A02",
    "9F46": "<issuer_public_key_cert>",
    "90": "<issuer_cert_from_pki>"
  },
  "aid": "A0000000041010",
  "apduLog": [
    { "step": 1, "command": "00A40400 07 A0000000041010", "response": "6F...", "desc": "SELECT AID" },
    { "step": 2, "command": "80A80000 02 8300", "response": "77...", "desc": "GET PROCESSING OPTIONS" },
    { "step": 3, "command": "00B2010C 00", "response": "70...", "desc": "READ RECORD SFI 1 REC 1" }
  ]
}
```

### Schema DB

```sql
CREATE TABLE client.emv_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    network VARCHAR(20) NOT NULL,
    aid VARCHAR(32) NOT NULL,
    emv_tags JSONB NOT NULL,
    security_level VARCHAR(20) DEFAULT 'STANDARD',
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE client.card_emv_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID REFERENCES client.virtual_cards(id),
    profile_id UUID REFERENCES client.emv_profiles(id),
    emv_tags JSONB NOT NULL,
    issuer_cert TEXT,
    card_cert TEXT,
    card_public_key TEXT,
    card_private_key_encrypted TEXT,
    apdu_log JSONB,
    embossing_data JSONB,
    personalized_at TIMESTAMP DEFAULT NOW(),
    personalized_by UUID REFERENCES users.users(id)
);
```

### Dependances inter-services
- `sim-pki-service` -> pour obtenir les certificats emetteur
- `hsm-simulator` -> pour les operations cryptographiques (generation AC, signature)
- `sim-card-service` -> pour lier aux cartes virtuelles existantes

---

## Service 2 : `sim-gab-service` (Port 8016)

### But
Simuler un Guichet Automatique de Banque complet, avec les deux modes que l'article decrit : **mode operateur** (demarrage a froid, maintenance, rechargement billets) et **mode client** (retrait, consultation solde). L'article insiste sur la "vision operateur" comme fondamentale.

### Ce qu'il reproduit de l'article
- GAB reels (2 marques differentes) -> 2 skins/profils de GAB
- Demarrage a froid (Nouvelle Architecture Cryptographique)
- Vrai-faux billets de la Banque de France -> simulation gestion billets
- TP manipulation GAB : nommage des parties, comparaison marques
- Vision operateur vs vision client

### Structure du service

```
backend/sim-gab-service/
+-- src/
|   +-- index.ts
|   +-- config/
|   |   +-- index.ts
|   |   +-- gabBrands.ts               # Configs des 2 marques de GAB
|   +-- controllers/
|   |   +-- gab.controller.ts          # CRUD & lifecycle GAB
|   |   +-- operator.controller.ts     # Mode operateur
|   |   +-- customer.controller.ts     # Mode client (retrait)
|   |   +-- bills.controller.ts        # Gestion des billets
|   +-- services/
|   |   +-- gabLifecycle.service.ts    # Cold start, shutdown, states
|   |   +-- keyExchange.service.ts     # NAC (Nouvelle Architecture Crypto)
|   |   +-- withdrawal.service.ts      # Logique retrait avec billets
|   |   +-- billDispenser.service.ts   # Simulation cassettes billets
|   |   +-- cardReader.service.ts      # Lecture carte (lien EMV)
|   |   +-- journal.service.ts         # Journal comptable GAB
|   +-- models/
|   |   +-- gabMachine.ts             # Etat machine GAB
|   |   +-- billCassette.ts           # Cassette de billets
|   |   +-- gabStates.ts             # FSM : OFF -> BOOTING -> KEY_EXCHANGE -> READY -> MAINTENANCE
|   +-- routes/
|   |   +-- gab.routes.ts
|   +-- utils/
|       +-- logger.ts
+-- Dockerfile
+-- package.json
+-- tsconfig.json
```

### Endpoints

```
# Gestion du parc de GAB
POST   /gab/machines                    # Creer un GAB (choisir marque)
GET    /gab/machines                    # Lister tous les GAB
GET    /gab/machines/:id               # Etat detaille d'un GAB
DELETE /gab/machines/:id               # Supprimer un GAB

# Cycle de vie (mode operateur)
POST   /gab/machines/:id/cold-start    # Demarrage a froid complet
  Retour: {
    steps: [
      { phase: "POWER_ON", desc: "Mise sous tension", duration: "2s" },
      { phase: "BIOS_CHECK", desc: "Verification materielle", duration: "3s" },
      { phase: "OS_BOOT", desc: "Demarrage systeme", duration: "5s" },
      { phase: "KEY_EXCHANGE", desc: "NAC - Echange de cles avec serveur", duration: "4s",
        detail: { masterKeyLoaded: true, sessionKeyGenerated: "3DES-128", macKeyLoaded: true } },
      { phase: "CERT_VALIDATION", desc: "Validation certificats CA", duration: "2s" },
      { phase: "NETWORK_CONNECT", desc: "Connexion au reseau acquereur", duration: "1s" },
      { phase: "SELF_TEST", desc: "Auto-diagnostic composants", duration: "3s",
        detail: { cardReader: "OK", billDispenser: "OK", receipt: "OK", screen: "OK" } },
      { phase: "READY", desc: "GAB operationnel", duration: "0s" }
    ],
    totalDuration: "20s",
    gabState: "READY"
  }

POST   /gab/machines/:id/shutdown      # Arret propre
POST   /gab/machines/:id/maintenance   # Passer en mode maintenance
POST   /gab/machines/:id/resume        # Reprendre apres maintenance

# Gestion des billets (operateur)
GET    /gab/machines/:id/cassettes     # Etat des cassettes de billets
POST   /gab/machines/:id/cassettes/load  # Charger des billets
  Body: { cassette: 1, denomination: 20, count: 200, type: "REAL"|"TEST" }
GET    /gab/machines/:id/cassettes/inventory # Inventaire billets
POST   /gab/machines/:id/cassettes/purge    # Vidanger les cassettes

# Billets de test (vrai-faux billets Banque de France)
GET    /gab/bills/denominations        # Types de billets disponibles
GET    /gab/bills/test-bills           # Liste des vrai-faux billets de test
  Retour: {
    testBills: [
      { denomination: 20, serialPrefix: "TEST", characteristics: {
          paperGranularity: true, reflectiveBand: true,
          correctImage: false, correctColor: false,
          acceptedInNormalMode: false, acceptedInTestMode: true
      }}
    ]
  }

# Mode client (retrait/consultation)
POST   /gab/machines/:id/insert-card   # Inserer une carte
  Body: { cardId }
  Retour: { emvData, cardAccepted: true/false, rejectReason? }

POST   /gab/machines/:id/verify-pin    # Saisir le PIN
  Body: { pin }
  Retour: { pinVerified, attemptsRemaining }

POST   /gab/machines/:id/withdraw      # Retrait
  Body: { amount }
  Retour: {
    authorized: true,
    dispensed: { bills: [{ denomination: 20, count: 2 }, { denomination: 10, count: 1 }] },
    transactionId,
    receipt: { ... }
  }

GET    /gab/machines/:id/balance       # Consultation solde
POST   /gab/machines/:id/eject-card    # Ejecter la carte

# Journal & audit (operateur)
GET    /gab/machines/:id/journal       # Journal des transactions
GET    /gab/machines/:id/journal/export # Export journal (telecollecte)
GET    /gab/machines/:id/diagnostics   # Auto-diagnostic complet

# Composants du GAB (educatif)
GET    /gab/machines/:id/components    # Liste des composants nommes
  Retour: {
    brand: "NCR_SelfServ_23",
    components: [
      { name: "Lecteur de carte", type: "DIP_READER", status: "OK" },
      { name: "Distributeur de billets", type: "BILL_DISPENSER", status: "OK", cassettes: 4 },
      { name: "Imprimante ticket", type: "RECEIPT_PRINTER", status: "OK" },
      { name: "Clavier PIN (EPP)", type: "ENCRYPTING_PIN_PAD", status: "OK", encryption: "3DES" },
      { name: "Ecran tactile", type: "TOUCHSCREEN", status: "OK", resolution: "1024x768" },
      { name: "Camera", type: "CAMERA", status: "OK" },
      { name: "Coffre-fort", type: "SAFE", status: "LOCKED" },
      { name: "Module NFC", type: "CONTACTLESS_READER", status: "OK" }
    ]
  }

GET    /health
```

### Machine a etats du GAB

```
    OFF --> BOOTING --> KEY_EXCHANGE --> CERT_VALIDATION --> SELF_TEST --> READY
     ^                                                                      |
     |                                                                      v
     +----------------- SHUTDOWN <---- MAINTENANCE <----------------- IN_SERVICE
                                                                        |
                                                                        v
                                                                   OUT_OF_SERVICE
                                                                   (erreur/panne)
```

### Deux marques de GAB (comme dans l'article)

```typescript
// config/gabBrands.ts
export const GAB_BRANDS = {
  NCR_SelfServ_23: {
    name: "NCR SelfServ 23",
    manufacturer: "NCR Corporation",
    cassettes: 4,
    maxBillsPerCassette: 2500,
    supportedDenominations: [5, 10, 20, 50],
    hasContactless: true,
    hasBiometric: false,
    bootSequence: ["POWER_ON", "BIOS_CHECK", "OS_BOOT", "KEY_EXCHANGE", "CERT_VALIDATION", "SELF_TEST"],
    avgBootTime: 45,
    keyExchangeProtocol: "TR-34",
    encryptionMode: "3DES",
  },
  Diebold_Opteva_750: {
    name: "Diebold Opteva 750",
    manufacturer: "Diebold Nixdorf",
    cassettes: 6,
    maxBillsPerCassette: 3000,
    supportedDenominations: [5, 10, 20, 50, 100],
    hasContactless: true,
    hasBiometric: true,
    bootSequence: ["POWER_ON", "HW_INIT", "OS_LOAD", "APP_START", "NAC_HANDSHAKE", "DIAGNOSTICS"],
    avgBootTime: 60,
    keyExchangeProtocol: "NAC-v3",
    encryptionMode: "AES-256",
  }
};
```

### Schema DB

```sql
CREATE TABLE client.gab_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    bank_id VARCHAR(20) NOT NULL,
    location VARCHAR(200),
    state VARCHAR(30) DEFAULT 'OFF',
    session_key_encrypted TEXT,
    mac_key_encrypted TEXT,
    last_boot_at TIMESTAMP,
    last_key_exchange_at TIMESTAMP,
    components JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE client.gab_cassettes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gab_id UUID REFERENCES client.gab_machines(id),
    slot_number INTEGER NOT NULL,
    denomination INTEGER NOT NULL,
    current_count INTEGER DEFAULT 0,
    max_capacity INTEGER NOT NULL,
    bill_type VARCHAR(10) DEFAULT 'REAL',
    last_loaded_at TIMESTAMP,
    UNIQUE(gab_id, slot_number)
);

CREATE TABLE client.gab_journal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gab_id UUID REFERENCES client.gab_machines(id),
    event_type VARCHAR(30) NOT NULL,
    card_id UUID,
    amount DECIMAL(15,2),
    bills_dispensed JSONB,
    transaction_id UUID,
    operator_id UUID,
    detail JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Dependances inter-services
- `hsm-simulator` -> pour le Key Exchange (NAC) au cold start
- `sim-pki-service` -> pour valider les certificats CA au boot
- `sim-card-service` -> pour lire les donnees carte inseree
- `sim-emv-personalization` -> pour les donnees EMV de la carte
- `sim-auth-engine` -> pour l'autorisation de retrait
- `sim-network-switch` -> pour router la transaction vers l'emetteur

---

## Service 3 : `sim-pki-service` (Port 8017)

### But
Reproduire l'Infrastructure a Cle Publique (PKI) interne de l'ENSICAEN. L'article decrit explicitement : chaque ENSIBANK a son propre certificat, la cle publique PKI est integree dans les TPE/GAB pour accepter les cartes signees par l'autorite de certification interne.

### Ce qu'il reproduit de l'article
- PKI interne avec CA racine (autorite de certification)
- Certificats ENSIBANK A et ENSIBANK B
- Cle publique CA integree dans TPE/GAB
- Chaine de confiance : CA -> Issuer Cert -> Card Cert
- Rejet des cartes non signees par la CA interne

### Structure du service

```
backend/sim-pki-service/
+-- src/
|   +-- index.ts
|   +-- config/
|   |   +-- index.ts
|   +-- controllers/
|   |   +-- pki.controller.ts
|   +-- services/
|   |   +-- ca.service.ts              # Certificate Authority (root + issuer)
|   |   +-- certificate.service.ts     # Generation & signature de certificats
|   |   +-- crl.service.ts            # Certificate Revocation List
|   |   +-- chainValidator.service.ts  # Validation de chaine de certificats
|   +-- models/
|   |   +-- certificate.ts
|   |   +-- keyPair.ts
|   +-- routes/
|   |   +-- pki.routes.ts
|   +-- utils/
|       +-- logger.ts
+-- Dockerfile
+-- package.json
+-- tsconfig.json
```

### Endpoints

```
# Autorite de Certification
POST   /pki/ca/init                    # Initialiser la CA racine (root)
  Retour: { rootCert, publicKey, fingerprint, validity }

GET    /pki/ca                         # Info CA racine
GET    /pki/ca/public-key              # Cle publique CA (pour injection TPE/GAB)

# Certificats emetteur (ENSIBANK A, ENSIBANK B)
POST   /pki/issuers                    # Creer un certificat emetteur
  Body: { bankId: "ENSIBANK_A", commonName, organizationUnit }
  Retour: { issuerCert, publicKey, signedByCA: true, chainValid: true }

GET    /pki/issuers                    # Liste des emetteurs
GET    /pki/issuers/:bankId           # Certificat d'un emetteur

# Certificats carte
POST   /pki/cards/:cardId/certificate  # Emettre un certificat carte
  Body: { issuerId, cardPublicKey }
  Retour: { cardCert, issuerCert, rootCert, chain: [...] }

GET    /pki/cards/:cardId/certificate  # Lire le certificat d'une carte

# Validation
POST   /pki/validate                   # Valider une chaine de certificats
  Body: { certificateChain: [cardCert, issuerCert, rootCert] }
  Retour: {
    valid: true/false,
    steps: [
      "1. Verification signature root CA -> auto-signe OK",
      "2. Verification issuer cert signe par root CA OK",
      "3. Verification card cert signe par issuer OK",
      "4. Verification validite temporelle OK",
      "5. Verification CRL (non revoque) OK"
    ],
    chainDepth: 3
  }

# CRL (Certificate Revocation List)
POST   /pki/crl/revoke                # Revoquer un certificat
  Body: { certId, reason }
GET    /pki/crl                        # Liste de revocation courante

# Educatif
GET    /pki/explain/chain              # Explication de la chaine de confiance
GET    /pki/explain/emv-pki            # Schema PKI EMV (CA->Issuer->ICC)

GET    /health
```

### Hierarchie PKI (fidele a l'article)

```
              +-------------------+
              |   PMP Root CA     |  <- Autorite de certification ENSICAEN
              |  (auto-signe)     |
              +---------+---------+
                        | signe
              +---------+---------+
              |                   |
     +--------v--------+ +-------v---------+
     |  ENSIBANK A CA  | |  ENSIBANK B CA  |  <- Certificats emetteurs
     |  (Issuer Cert)  | |  (Issuer Cert)  |
     +--------+--------+ +-------+---------+
              | signe             | signe
     +--------v--------+ +-------v---------+
     | Cartes ENSIBANK | | Cartes ENSIBANK |  <- Certificats carte (ICC)
     | A (ICC Certs)   | | B (ICC Certs)   |
     +-----------------+ +-----------------+

TPE/GAB contiennent la cle publique du Root CA
-> Permet de valider toute la chaine
-> Rejette les cartes non signees par cette CA
```

### Schema DB

```sql
CREATE TABLE client.pki_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cert_type VARCHAR(20) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    issuer_id UUID,
    bank_id VARCHAR(20),
    card_id UUID,
    public_key TEXT NOT NULL,
    private_key_encrypted TEXT,
    certificate_pem TEXT NOT NULL,
    serial_number VARCHAR(40) UNIQUE,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    revocation_reason VARCHAR(100),
    fingerprint VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE client.pki_crl (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cert_id UUID REFERENCES client.pki_certificates(id),
    reason VARCHAR(100),
    revoked_at TIMESTAMP DEFAULT NOW()
);
```

### Dependances inter-services
- `hsm-simulator` -> pour le stockage securise des cles privees
- `key-management` -> pour le chiffrement des cles privees par LMK

---

## Service 4 : `sim-iso8583-codec` (Port 8018)

### But
L'article decrit des TPs ou les etudiants analysent des "trames protocolaires" et le "format des protocoles monetiques". Actuellement votre plateforme utilise du REST/JSON. Ce service ajoute un encodeur/decodeur ISO 8583 reel pour que les messages transitent aussi sous forme de trames binaires lisibles.

### Ce qu'il reproduit de l'article
- Analyse de trames protocolaires (messages ISO 8583)
- Format des protocoles monetiques
- Journal de serveur d'autorisation avec trames enregistrees

### Structure du service

```
backend/sim-iso8583-codec/
+-- src/
|   +-- index.ts
|   +-- config/
|   |   +-- index.ts
|   +-- controllers/
|   |   +-- iso8583.controller.ts
|   +-- services/
|   |   +-- encoder.service.ts         # JSON -> ISO 8583 binary/hex
|   |   +-- decoder.service.ts         # ISO 8583 binary/hex -> JSON
|   |   +-- bitmapParser.service.ts    # Analyse des bitmaps
|   |   +-- fieldDictionary.service.ts # Dictionnaire des 128 champs
|   +-- models/
|   |   +-- messageTypes.ts           # 0100, 0110, 0200, 0210, etc.
|   |   +-- fieldDefinitions.ts       # Definition des 128 champs
|   +-- routes/
|   |   +-- iso8583.routes.ts
|   +-- utils/
|       +-- logger.ts
+-- Dockerfile
+-- package.json
+-- tsconfig.json
```

### Endpoints

```
# Encodage / Decodage
POST   /iso8583/encode                  # Donnees JSON -> trame ISO 8583
  Body: {
    mti: "0100",
    fields: {
      "2": "4761340000000019",
      "3": "000000",
      "4": "000000005000",
      "11": "123456",
      "14": "2712",
      "22": "051",
      "23": "001",
      "25": "00",
      "26": "12",
      "35": "4761340000000019D2712...",
      "41": "TERM0001",
      "42": "MERCHANT000001",
      "43": "ENSIBANK B COMMERCE    CAEN      FR",
      "49": "978",
      "52": "A1B2C3D4E5F60718",
      "55": "<EMV_DATA_TLV>"
    }
  }
  Retour: {
    hex: "01007238040128C18016476134...",
    binary: "0000000100000000...",
    bitmap: { primary: "7238040128C18016", secondary: null },
    length: 186,
    breakdown: [
      { offset: 0, length: 4, field: "MTI", value: "0100", desc: "Authorization Request" },
      { offset: 4, length: 16, field: "Bitmap", value: "7238040128C18016", desc: "Primary Bitmap" },
      { offset: 20, length: 2, field: "F2 Len", value: "16", desc: "PAN Length" },
      { offset: 22, length: 16, field: "F2", value: "4761340000000019", desc: "Primary Account Number" }
    ]
  }

POST   /iso8583/decode                  # Trame hex -> donnees JSON structurees
  Body: { hex: "01007238040128C18016476134..." }
  Retour: { mti, fields, bitmap, breakdown }

# Analyse educative
POST   /iso8583/analyze                 # Analyse detaillee d'un message
  Retour: {
    messageType: { code: "0100", name: "Authorization Request", direction: "Acquirer -> Issuer" },
    bitmap: {
      hex: "7238040128C18016",
      binary: "0111001000111000...",
      fieldsPresent: [2, 3, 4, 11, 14, 22, 23, 25, 26, 35, 41, 42, 43, 49, 52, 55],
      explanation: "Bit 2 ON = PAN present, Bit 3 ON = Processing code..."
    },
    fields: [
      { id: 2, name: "PAN", value: "4761340000000019", format: "LLVAR(n19)", category: "Card Data" },
      { id: 52, name: "PIN Block", value: "A1B2C3D4E5F60718", format: "b8", category: "Security", warning: "Contains encrypted PIN" }
    ],
    securityAnalysis: {
      pinBlockPresent: true,
      emvDataPresent: true,
      trackDataPresent: true
    }
  }

# Simulation de flux
POST   /iso8583/simulate-flow          # Simule un echange request/response
  Body: { transactionType: "PURCHASE", amount: 5000, pan: "..." }
  Retour: {
    request: { mti: "0100", hex: "...", fields: {} },
    response: { mti: "0110", hex: "...", fields: {}, responseCode: "00" },
    timeline: [
      { step: "Terminal -> Acquereur", message: "0100", desc: "Authorization Request" },
      { step: "Acquereur -> Reseau", message: "0100", desc: "Forwarded" },
      { step: "Reseau -> Emetteur", message: "0100", desc: "Routed to ENSIBANK A" },
      { step: "Emetteur -> Reseau", message: "0110", desc: "Authorization Response (Approved)" },
      { step: "Reseau -> Acquereur", message: "0110", desc: "Forwarded back" },
      { step: "Acquereur -> Terminal", message: "0110", desc: "Delivered" }
    ]
  }

# Dictionnaire
GET    /iso8583/fields                  # Liste des 128+ champs ISO 8583
GET    /iso8583/fields/:id             # Detail d'un champ
GET    /iso8583/message-types           # Liste des MTI (0100, 0110, 0200, etc.)

# Journal protocolaire
GET    /iso8583/journal                 # Trames ISO 8583 enregistrees
GET    /iso8583/journal/:id            # Detail d'une trame

GET    /health
```

### Schema DB

```sql
CREATE TABLE client.iso8583_journal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID,
    direction VARCHAR(20) NOT NULL,
    mti VARCHAR(4) NOT NULL,
    hex_message TEXT NOT NULL,
    decoded_fields JSONB NOT NULL,
    bitmap_hex VARCHAR(32),
    source_service VARCHAR(50),
    destination_service VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Integration avec les services existants
Ce service s'integre comme une **couche de traduction** : quand `sim-network-switch` route un message, il peut aussi appeler `sim-iso8583-codec` pour encoder/decoder la trame et l'enregistrer dans le journal.

---

## Service 5 : `sim-pci-audit` (Port 8019)

### But
L'article decrit explicitement la conformite PCI-DSS et PA-DSS comme objectif. Ce service audite automatiquement la plateforme et genere des rapports de conformite.

### Ce qu'il reproduit de l'article
- Conformite PCI-DSS (12 exigences)
- Conformite PA-DSS pour les logiciels
- PSSI (Politique de Securite du Systeme d'Information)
- ISO 27002 (recommandations securite SI)

### Structure du service

```
backend/sim-pci-audit/
+-- src/
|   +-- index.ts
|   +-- config/
|   |   +-- index.ts
|   +-- controllers/
|   |   +-- audit.controller.ts
|   +-- services/
|   |   +-- pciScanner.service.ts      # Scan des 12 exigences PCI-DSS
|   |   +-- networkAudit.service.ts    # Audit reseau (segmentation, firewall)
|   |   +-- dataAudit.service.ts       # Audit stockage donnees carte
|   |   +-- accessAudit.service.ts     # Audit controle d'acces
|   |   +-- cryptoAudit.service.ts     # Audit chiffrement
|   |   +-- reportGenerator.service.ts # Generation rapports
|   +-- models/
|   |   +-- pciRequirements.ts        # Les 12 exigences PCI-DSS
|   |   +-- auditResult.ts
|   +-- routes/
|   |   +-- audit.routes.ts
|   +-- utils/
|       +-- logger.ts
+-- Dockerfile
+-- package.json
+-- tsconfig.json
```

### Endpoints

```
# Scans
POST   /audit/scan/full                # Scan complet PCI-DSS (12 exigences)
POST   /audit/scan/quick               # Scan rapide (exigences critiques)
POST   /audit/scan/category/:cat       # Scan par categorie

# Resultats
GET    /audit/reports                   # Liste des rapports
GET    /audit/reports/:id              # Detail d'un rapport
GET    /audit/reports/:id/export       # Export PDF/JSON

# Les 12 exigences PCI-DSS
GET    /audit/requirements             # Liste des 12 exigences
GET    /audit/requirements/:id        # Detail + sous-exigences

# Educatif
GET    /audit/explain/pci-dss          # Presentation PCI-DSS
GET    /audit/explain/pa-dss           # Presentation PA-DSS
GET    /audit/explain/iso27002         # Presentation ISO 27002

GET    /health
```

### Exemple de rapport de scan

```json
{
  "scanId": "uuid",
  "timestamp": "2026-02-25T10:00:00Z",
  "standard": "PCI-DSS v4.0",
  "overallScore": 78,
  "status": "PARTIAL_COMPLIANCE",
  "requirements": [
    {
      "id": 1,
      "title": "Installer et gerer une configuration de pare-feu",
      "status": "PASS",
      "score": 95,
      "checks": [
        { "check": "Network segmentation (Docker networks)", "result": "PASS", "detail": "monetic-network et ctf-target-net isoles" },
        { "check": "Service-to-service auth", "result": "PASS", "detail": "X-Internal-Secret header requis" },
        { "check": "External access control", "result": "WARNING", "detail": "Port 8011 (HSM) expose publiquement" }
      ]
    },
    {
      "id": 3,
      "title": "Proteger les donnees de titulaires de cartes stockees",
      "status": "WARNING",
      "score": 70,
      "checks": [
        { "check": "PAN masking in DB", "result": "PASS", "detail": "masked_pan stocke separement" },
        { "check": "PAN encryption at rest", "result": "FAIL", "detail": "PAN stocke en clair dans virtual_cards.pan" },
        { "check": "CVV storage", "result": "PASS", "detail": "Seul le hash CVV est stocke" },
        { "check": "PIN storage", "result": "PASS", "detail": "Seul le hash PIN est stocke" }
      ]
    },
    {
      "id": 4,
      "title": "Chiffrer la transmission des donnees de titulaires de carte",
      "status": "PASS",
      "score": 90,
      "checks": [
        { "check": "TLS for external traffic", "result": "PASS" },
        { "check": "Internal service encryption", "result": "WARNING", "detail": "HTTP interne (acceptable en Docker network isole)" }
      ]
    }
  ]
}
```

### Schema DB

```sql
CREATE TABLE learning.audit_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_type VARCHAR(20) NOT NULL,
    standard VARCHAR(30) NOT NULL,
    overall_score INTEGER,
    status VARCHAR(30),
    results JSONB NOT NULL,
    scanned_by UUID REFERENCES users.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Service 6 (Frontend) : `gab-web` (Port 3007)

### But
Interface web simulant visuellement un GAB complet avec deux modes (operateur et client) et deux skins de marque.

### Pages

```
/gab                               # Selection du GAB (liste des machines)
/gab/:id                          # Vue client du GAB (ecran ATM)
/gab/:id/operator                 # Mode operateur (maintenance, cassettes, journal)
/gab/:id/cold-start               # Animation de demarrage a froid
/gab/:id/components               # Vue educative des composants (nommage)
/gab/compare                      # Comparaison cote-a-cote des 2 marques
```

### Interface client (simulation ecran ATM)

```
+---------------------------------------------+
|              ENSIBANK B                      |
|          Guichet Automatique                 |
|                                              |
|    +-----------------------------+           |
|    |   Inserez votre carte       |           |
|    |        [====]               |           |
|    |                             |           |
|    |   +------+  +------+       |           |
|    |   |Retrait|  |Solde |       |           |
|    |   +------+  +------+       |           |
|    |   +------+  +------+       |           |
|    |   |Releve |  |Autre |       |           |
|    |   +------+  +------+       |           |
|    +-----------------------------+           |
|                                              |
|    [1] [2] [3]    Clavier PIN               |
|    [4] [5] [6]    (EPP chiffrant)           |
|    [7] [8] [9]                              |
|    [*] [0] [#]    [Valider] [Annuler]       |
|                                              |
|    [Ticket]  [Billets]                       |
+---------------------------------------------+
```

---

## Frontend additionnel : `pki-web` (Port 3009)

### Pages

```
/pki                        # Dashboard PKI (CA, emetteurs, stats)
/pki/ca                     # Gestion CA racine
/pki/issuers                # Gestion certificats emetteur (ENSIBANK A/B)
/pki/cards                  # Certificats carte emis
/pki/validate               # Outil de validation de chaine
/pki/crl                    # Liste de revocation
```

---

## Integration au docker-compose.yml

```yaml
  # === NOUVEAUX SERVICES ===

  sim-gab-service:
    build:
      context: ./backend/sim-gab-service
      dockerfile: Dockerfile
    container_name: pmp-sim-gab-service
    restart: unless-stopped
    user: "node:node"
    environment:
      - NODE_ENV=${NODE_ENV}
      - PORT=8016
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - HSM_SIMULATOR_URL=http://hsm-simulator:8011
      - PKI_SERVICE_URL=http://sim-pki-service:8017
      - CARD_SERVICE_URL=http://sim-card-service:8001
      - AUTH_ENGINE_URL=http://sim-auth-engine:8006
      - NETWORK_SWITCH_URL=http://sim-network-switch:8004
      - INTERNAL_HSM_SECRET=${INTERNAL_HSM_SECRET}
    ports:
      - "8016:8016"
    networks:
      - monetic-network
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
      hsm-simulator: { condition: service_started }

  sim-pki-service:
    build:
      context: ./backend/sim-pki-service
      dockerfile: Dockerfile
    container_name: pmp-sim-pki-service
    restart: unless-stopped
    user: "node:node"
    environment:
      - NODE_ENV=${NODE_ENV}
      - PORT=8017
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - HSM_SIMULATOR_URL=http://hsm-simulator:8011
      - KEY_MANAGEMENT_URL=http://key-management:8012
    ports:
      - "8017:8017"
    networks:
      - monetic-network
    depends_on:
      postgres: { condition: service_healthy }
      hsm-simulator: { condition: service_started }

  sim-iso8583-codec:
    build:
      context: ./backend/sim-iso8583-codec
      dockerfile: Dockerfile
    container_name: pmp-sim-iso8583-codec
    restart: unless-stopped
    user: "node:node"
    environment:
      - NODE_ENV=${NODE_ENV}
      - PORT=8018
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
    ports:
      - "8018:8018"
    networks:
      - monetic-network
    depends_on:
      postgres: { condition: service_healthy }

  sim-pci-audit:
    build:
      context: ./backend/sim-pci-audit
      dockerfile: Dockerfile
    container_name: pmp-sim-pci-audit
    restart: unless-stopped
    user: "node:node"
    environment:
      - NODE_ENV=${NODE_ENV}
      - PORT=8019
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - API_GATEWAY_URL=http://api-gateway:8000
      - HSM_SIMULATOR_URL=http://hsm-simulator:8011
      - CARD_SERVICE_URL=http://sim-card-service:8001
    ports:
      - "8019:8019"
    networks:
      - monetic-network
    depends_on:
      postgres: { condition: service_healthy }

  sim-emv-personalization:
    build:
      context: ./backend/sim-emv-personalization
      dockerfile: Dockerfile
    container_name: pmp-sim-emv-perso
    restart: unless-stopped
    user: "node:node"
    environment:
      - NODE_ENV=${NODE_ENV}
      - PORT=8020
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - PKI_SERVICE_URL=http://sim-pki-service:8017
      - HSM_SIMULATOR_URL=http://hsm-simulator:8011
      - CARD_SERVICE_URL=http://sim-card-service:8001
    ports:
      - "8020:8020"
    networks:
      - monetic-network
    depends_on:
      postgres: { condition: service_healthy }
      sim-pki-service: { condition: service_started }
      hsm-simulator: { condition: service_started }

  gab-web:
    build:
      context: ./frontend/gab-web
      dockerfile: Dockerfile
    container_name: pmp-gab-web
    restart: unless-stopped
    environment:
      - NODE_ENV=${NODE_ENV}
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8000}
    ports:
      - "3007:3000"
    networks:
      - monetic-network
    depends_on:
      api-gateway: { condition: service_started }
```

---

## Ordre d'implementation recommande

| Phase | Service | Raison |
|-------|---------|--------|
| **1** | `sim-pki-service` (8017) | Fondation : les certificats sont necessaires pour la personnalisation et le GAB |
| **2** | `sim-iso8583-codec` (8018) | Independant, enrichit immediatement la valeur pedagogique |
| **3** | `sim-emv-personalization` (8020) | Depend de PKI, complete le cycle carte |
| **4** | `sim-gab-service` (8016) | Depend de PKI + EMV + auth, le plus gros service |
| **5** | `gab-web` (3007) + `pki-web` (3009) | Frontends, apres que les backends fonctionnent |
| **6** | `sim-pci-audit` (8019) | Peut etre fait en dernier, audite les services existants |

---

## Migration DB unique

Fichier : `backend/api-gateway/src/database/migrations/025_ensicaen_infra_services.sql`

Contient toutes les tables : `emv_profiles`, `card_emv_data`, `gab_machines`, `gab_cassettes`, `gab_journal`, `pki_certificates`, `pki_crl`, `iso8583_journal`, `audit_reports`.

---

## Resume des ressources

| Element | Nombre |
|---------|--------|
| Nouveaux services backend | 5 |
| Nouvelles apps frontend | 2 (gab-web, pki-web) |
| Nouvelles tables DB | 9 |
| Nouveaux endpoints API | ~60 |
| Nouveaux ports | 8016, 8017, 8018, 8019, 8020, 3007, 3009 |
| Total services Docker (apres) | **51** (44 actuels + 7 nouveaux) |
