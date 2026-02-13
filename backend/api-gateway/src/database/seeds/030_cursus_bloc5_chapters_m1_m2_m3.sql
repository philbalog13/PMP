-- BLOC 5 Chapters: Modules 5.1 (Contact TP), 5.2 (Android HCE), 5.3 (Crypto)

-- Module 5.1 – Transactions Contact ISO 7816 (3 chapters)

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.1.1-pcsc', 'mod-5.1-contact', 'Environnement PC/SC et javax.smartcardio',
$$## Communication PC/SC

**PC/SC** (Personal Computer/Smart Card) est l'interface standard pour communiquer avec les cartes à puce depuis un PC.

### Architecture

```
[Application Java]
       ↓
[javax.smartcardio API]
       ↓
[PC/SC Middleware (pcscd)]
       ↓
[Lecteur USB (ACR122, CyberJack)]
       ↓
[Carte à puce]
```

### API Java – javax.smartcardio

```java
import javax.smartcardio.*;

// Lister les lecteurs
TerminalFactory factory = TerminalFactory.getDefault();
CardTerminals terminals = factory.terminals();
for (CardTerminal terminal : terminals.list()) {
    System.out.println(terminal.getName());
}

// Se connecter à la carte
CardTerminal terminal = terminals.list().get(0);
Card card = terminal.connect("*"); // T=0 ou T=1
CardChannel channel = card.getBasicChannel();
```

### Protocoles de transport

| Protocole | Caractéristique |
|-----------|----------------|
| **T=0** | Orienté octet, half-duplex, GET RESPONSE nécessaire |
| **T=1** | Orienté bloc, full-duplex, plus efficace |
| **T=CL** | Sans contact (ISO 14443-4) |

> La plupart des cartes EMV supportent T=0 et T=1. Le choix se fait à l'ATR (Answer To Reset).$$,
'["PC/SC = interface standard pour communiquer avec les cartes à puce","javax.smartcardio = API Java pour PC/SC","T=0 = orienté octet (nécessite GET RESPONSE), T=1 = orienté bloc","ATR (Answer To Reset) indique les protocoles supportés"]'::jsonb,
1, 50) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.1.2-apdu-impl', 'mod-5.1-contact', 'Implémentation des commandes APDU',
$$## Classe CardChannelHelper

Implémentation de commandes APDU de base en Java :

### SELECT par AID

```java
public byte[] selectAID(byte[] aid) throws CardException {
    CommandAPDU select = new CommandAPDU(
        0x00, 0xA4, 0x04, 0x00, aid, 256);
    ResponseAPDU resp = channel.transmit(select);
    if (resp.getSW() != 0x9000) {
        throw new CardException("SELECT failed: "
            + Integer.toHexString(resp.getSW()));
    }
    return resp.getData();
}
```

### Gestion du protocole T=0

En T=0, si SW1=0x61, la carte a des données à envoyer. Il faut utiliser **GET RESPONSE** :

```java
public byte[] transmitT0(CommandAPDU cmd) throws CardException {
    ResponseAPDU resp = channel.transmit(cmd);
    int sw = resp.getSW();
    if ((sw & 0xFF00) == 0x6100) {
        int bytesAvail = sw & 0x00FF;
        CommandAPDU getResp = new CommandAPDU(
            0x00, 0xC0, 0x00, 0x00, bytesAvail);
        return channel.transmit(getResp).getData();
    }
    return resp.getData();
}
```

### Commandes essentielles

| Commande | CLA INS | P1 P2 | Usage |
|----------|---------|-------|-------|
| SELECT | 00 A4 | 04 00 | Sélectionner une app par AID |
| READ BINARY | 00 B0 | offset | Lire un fichier transparent |
| VERIFY PIN | 00 20 | 00 80 | Vérifier le PIN porteur |
| GET CHALLENGE | 00 84 | 00 00 | Obtenir un aléa de la carte |
| GET DATA | 80 CA | tag | Lire un objet de données |$$,
'["SELECT 00 A4 04 00 = sélection par AID, commande la plus courante","T=0 + SW1=61 → GET RESPONSE (00 C0) pour récupérer les données","VERIFY PIN 00 20 00 80 avec PIN paddé 0xFF sur 8 octets","GET CHALLENGE 00 84 = obtenir un nombre aléatoire de la carte"]'::jsonb,
2, 50) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.1.3-trace', 'mod-5.1-contact', 'Analyse de trace APDU EMV',
$$## Lecture d'une trace APDU

### Format typique d'une trace

```
→ 00 A4 04 00 0E 32 50 41 59 2E 53 59 53 2E 44 44 46 30 31 00
← 6F 23 84 0E 32 50 41 59 ... 90 00   [12 ms]

→ 00 A4 04 00 07 A0 00 00 00 03 10 10 00
← 6F 1A 84 07 A0 00 00 00 03 10 10 ... 90 00   [8 ms]

→ 80 A8 00 00 04 83 02 00 00 00
← 77 12 82 02 19 80 94 0C ... 90 00   [45 ms]
```

### Décodage pas à pas

| Étape | Commande | Réponse | Temps |
|-------|----------|---------|-------|
| 1 | SELECT PPSE | FCI avec AID Visa | 12 ms |
| 2 | SELECT AID A0000000031010 | FCI avec PDOL | 8 ms |
| 3 | GET PROCESSING OPTIONS | AIP + AFL | 45 ms |

### Tags importants à identifier

| Tag | Nom | Taille | Contenu type |
|-----|-----|--------|-------------|
| 6F | FCI Template | variable | Contient 84 et A5 |
| 84 | DF Name (AID) | 5-16 | AID de l'application |
| 50 | Application Label | variable | "VISA", "MASTERC" |
| 82 | AIP | 2 | Capabilities de l'app |
| 94 | AFL | 4n | Fichiers à lire |
| 9F36 | ATC | 2 | Compteur de transactions |
| 9F26 | ARQC | 8 | Cryptogramme |

> **Outil** : Un script Python avec `re` peut parser les logs hexadécimaux et décoder les tags TLV automatiquement.$$,
'["Trace APDU : → = commande (C-APDU), ← = réponse (R-APDU)","Tags TLV : 6F=FCI, 84=AID, 50=Label, 82=AIP, 94=AFL","GPO (80 A8) est la commande la plus lente (calculs crypto côté carte)","Le timing de chaque commande est important pour le diagnostic"]'::jsonb,
3, 50) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Module 5.2 – Android et Applications Smartphone (4 chapters)
-- =============================================================================

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.2.1-nfc-android', 'mod-5.2-android', 'Architecture NFC Android',
$$## Les modes NFC Android

| Mode | Rôle du téléphone | API |
|------|-------------------|-----|
| **Reader/Writer** | Lecteur (lit une carte, un tag) | NfcAdapter, IsoDep |
| **Card Emulation (HCE)** | Se fait passer pour une carte | HostApduService |
| **Peer-to-Peer** | Échange bidirectionnel | Android Beam (obsolète) |

### HCE vs Secure Element

| Caractéristique | HCE | Secure Element |
|----------------|-----|---------------|
| Sécurité | Logicielle | Matérielle (inviolable) |
| Coût | Gratuit | Cher (SIM, eSE) |
| Contrôle | Développeur | Opérateur/fabricant |
| Utilisation | Cartes de fidélité, tests | Apple Pay, Samsung Pay |
| Limit. | Pas de stockage sécurisé natif | API limitée |

### Déclaration HCE dans AndroidManifest.xml

```xml
<service
    android:name=".EMVCardEmulationService"
    android:exported="true"
    android:permission="android.permission.BIND_NFC_SERVICE">
    <intent-filter>
        <action android:name=
            "android.nfc.cardemulation.action.HOST_APDU_SERVICE"/>
    </intent-filter>
    <meta-data
        android:name=
            "android.nfc.cardemulation.host_apdu_service"
        android:resource="@xml/apduservice"/>
</service>
```

### Fichier apduservice.xml

```xml
<host-apdu-service xmlns:android="..."
    android:requireDeviceUnlock="false">
    <aid-group android:category="payment">
        <aid-filter android:name="A0000000031010"/>
        <aid-filter android:name="A0000000041010"/>
    </aid-group>
</host-apdu-service>
```$$,
'["HCE = émulation carte par logiciel, pas de SE matériel nécessaire","Reader/Writer : NfcAdapter + IsoDep pour lire les cartes","HCE : HostApduService + apduservice.xml pour déclarer les AID","Apple Pay/Samsung Pay utilisent un SE matériel, pas HCE"]'::jsonb,
1, 50) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.2.2-hce-wallet', 'mod-5.2-android', 'Implémentation HCE : Wallet simple',
$$## Service HCE minimal

```java
public class WalletCardService extends HostApduService {
    private int balance = 1000; // centimes = 10,00 €

    @Override
    public byte[] processCommandApdu(byte[] apdu, Bundle extras) {
        byte cla = apdu[0];
        byte ins = apdu[1];

        if (cla == (byte) 0xB0) {
            switch (ins) {
                case 0x40: // CREDIT
                    balance += apdu[5];
                    return new byte[]{(byte)0x90, 0x00};

                case 0x30: // DEBIT
                    if (balance >= apdu[5]) {
                        balance -= apdu[5];
                        return new byte[]{(byte)0x90, 0x00};
                    }
                    return new byte[]{(byte)0x6A, (byte)0x83};

                case 0x50: // READ BALANCE
                    return new byte[]{
                        (byte)((balance >> 8) & 0xFF),
                        (byte)(balance & 0xFF),
                        (byte)0x90, 0x00};
            }
        }
        return new byte[]{(byte)0x6D, 0x00};
    }

    @Override
    public void onDeactivated(int reason) { }
}
```

### Table des commandes

| CLA | INS | Nom | Data | Réponse |
|-----|-----|-----|------|---------|
| B0 | 40 | CREDIT | 1 octet (montant) | 90 00 |
| B0 | 30 | DEBIT | 1 octet (montant) | 90 00 ou 6A 83 |
| B0 | 50 | BALANCE | — | 2 octets + 90 00 |

> Ce wallet est uniquement pédagogique. Un vrai wallet nécessite authentification, chiffrement et protections anti-replay.$$,
'["HostApduService : processCommandApdu() reçoit chaque C-APDU du terminal","6A 83 = fonds insuffisants, 6D 00 = instruction non supportée","Le solde est stocké en centimes sur 2 octets (short)","Un vrai wallet nécessite crypto + auth + anti-replay"]'::jsonb,
2, 50) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.2.3-lecteur-emv', 'mod-5.2-android', 'Lecteur EMV Android',
$$## Lecture de carte EMV avec IsoDep

### Séquence EMV minimale

```java
IsoDep isoDep = IsoDep.get(tag);
isoDep.connect();

// 1. SELECT PPSE
byte[] resp = isoDep.transceive(buildSelect(PPSE_AID));
List<TLV> ppse = parseTLV(resp);

// 2. Extraire l'AID de l'application
byte[] aid = extractAID(ppse);

// 3. SELECT AID
resp = isoDep.transceive(buildSelect(aid));

// 4. GET PROCESSING OPTIONS
resp = isoDep.transceive(buildGPO(pdol));

// 5. READ RECORD (selon l'AFL)
for (AFLEntry e : parseAFL(resp)) {
    resp = isoDep.transceive(buildReadRecord(e.sfi, e.record));
    // Extraire PAN (tag 5A), date (tag 5F24), etc.
}
```

### Parsing TLV (BER-TLV)

```java
public class TLV {
    byte[] tag;
    int length;
    byte[] value;
    List<TLV> children; // tags construits
}

public List<TLV> parseTLV(byte[] data, int offset) {
    // Tag : 1, 2 ou 3 octets
    // Length : 1 octet si <128, sinon 3 octets (82 xx xx)
    // Value : les données
    // Récursif pour les tags construits (bit 6 du 1er octet)
}
```

### Tags EMV à extraire

| Tag | Nom | Usage |
|-----|-----|-------|
| 5A | PAN | Numéro de carte |
| 5F24 | Expiry Date | YYMMDD |
| 5F20 | Cardholder Name | Nom du porteur |
| 9F26 | ARQC | Cryptogramme |
| 9F36 | ATC | Compteur de transactions |

> ⚠️ **NE JAMAIS** stocker les données lues. Tests uniquement sur cartes de test. Mode avion recommandé.$$,
'["IsoDep.transceive() envoie une C-APDU et reçoit la R-APDU","Séquence EMV : SELECT PPSE → SELECT AID → GPO → READ RECORD","Parsing TLV récursif : tags construits contiennent d''autres TLV","Tag 5A = PAN, 5F24 = expiry, 9F26 = ARQC"]'::jsonb,
3, 60) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.2.4-kernel8', 'mod-5.2-android', 'EMV Kernel 8 et évolutions',
$$## EMV Contactless Kernel 8

### Nouveautés critiques (2022-2026)

| Innovation | Description |
|-----------|-------------|
| **Standardisation** | Remplacement des kernels propriétaires par un kernel unifié |
| **ECC** | Elliptic Curve Cryptography pour authentification carte |
| **Secure Channel** | Canal chiffré AES+ECC entre carte et terminal |
| **Cloud-ready** | Kernel exécutable partiellement dans le cloud (mPOS) |
| **Biométrie** | Support CVM biométrique (empreinte, visage) |

### Impact pour le développeur Android

- Les apps HCE doivent supporter **ECC** (signature ECDSA, échange ECDH)
- Le secure channel impose une **gestion de session** cryptographique
- Les anciennes cartes RSA continuent de fonctionner (rétrocompatibilité)

### Profils de test EMVCo

| Profil | Réseau |
|--------|--------|
| Visa L3 CI v020 | Visa |
| Mastercard L3 MTIP v295 | Mastercard |
| AmEx L3 Expresspay XP v020 | American Express |
| JCB TCI-CL 1.2 | JCB |
| UnionPay QPC 1.1 | UnionPay |

### Architecture Bridge NFC

```
[App Android Lecteur]         [App Android Simulateur]
  - NFC Reader (carte)          - HCE Service (POS)
  - Module réseau (envoie)      - Module réseau (reçoit)
       ↕ Socket TCP                   ↕
  [Carte de test]              [Terminal POS]
```

> ⚠️ L'architecture bridge est **strictement encadrée**. Usage uniquement sur cartes de test, en laboratoire isolé.$$,
'["Kernel 8 = kernel EMV unifié remplaçant les kernels propriétaires","ECC (secp256r1) remplace progressivement RSA pour l''auth carte","Secure channel = ECDH + AES/GCM entre carte et terminal","Bridge NFC = relais d''APDU via réseau, usage lab uniquement"]'::jsonb,
4, 50) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Module 5.3 – Cryptographie (4 chapters)
-- =============================================================================

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.3.1-dukpt-impl', 'mod-5.3-crypto', 'Implémentation DUKPT en Java',
$$## DUKPT : Derived Unique Key Per Transaction

### Rappel ANSI X9.24 Part 1

| Élément | Description |
|---------|-------------|
| BDK | Base Derivation Key (16/24 octets, 3DES) |
| KSN | Key Serial Number (80 bits = 59 ID + 21 compteur) |
| Clé session | DUKPT(BDK, KSN) |

### Implémentation Java

```java
public class DUKPT {
    private byte[] bdk;

    public DUKPT(byte[] bdk) { this.bdk = bdk; }

    public byte[] deriveKey(byte[] ksn) {
        // 1. Extraire le compteur (21 derniers bits)
        int counter = extractCounter(ksn);
        // 2. Initialiser la clé courante = BDK
        byte[] currentKey = Arrays.copyOf(bdk, bdk.length);
        // 3. Pour chaque bit '1' dans le compteur
        for (int i = 20; i >= 0; i--) {
            if ((counter & (1 << i)) != 0) {
                currentKey = deriveStep(currentKey, ksn, i);
            }
        }
        return currentKey;
    }

    public byte[] encryptPinBlock(byte[] pinBlock, byte[] ksn) {
        byte[] sessionKey = deriveKey(ksn);
        // 3DES CBC, IV=0
        return des3Encrypt(sessionKey, pinBlock);
    }
}
```

### Vecteurs de test ANSI X9.24

```
BDK = 0123456789ABCDEFFEDCBA9876543210
KSN = FFFF9876543210E00001
Clé attendue = [vecteur officiel]
```

> La validation par vecteurs de test officiels est **obligatoire** pour une implémentation de production.$$,
'["DUKPT = une clé unique par transaction, dérivée du BDK et KSN","Compteur 21 bits : chaque bit \"1\" déclenche une étape de dérivation","3DES CBC avec IV nul pour le chiffrement du PIN block","Validation obligatoire par vecteurs de test ANSI X9.24"]'::jsonb,
1, 45) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.3.2-cvv-impl', 'mod-5.3-crypto', 'Génération et vérification CVV',
$$## Algorithme CVV (Visa)

### Principe

1. Concaténer **PAN + date expiration + code service**
2. Padding pour obtenir un multiple de 8 octets
3. Chiffrement **3DES CBC** avec la CVK (Card Verification Key)
4. Convertir le résultat hexadécimal en décimal
5. Extraire 3 chiffres

### CVV1 vs CVV2

| Type | Données d'entrée | Emplacement |
|------|------------------|-------------|
| CVV1 | PAN + expiry + service code (piste) | Bande magnétique |
| CVV2 | PAN + expiry + service code **différent** | Dos de la carte |

### Implémentation Java

```java
public class CVVGenerator {
    private byte[] cvk; // 16 octets

    public String generateCVV(String pan, String expDate,
                              String serviceCode) {
        String data = pan + expDate + serviceCode;
        byte[] input = padToMultipleOf8(hexStringToBytes(data));
        byte[] cipher = des3CbcEncrypt(cvk, input, new byte[8]);
        return extractDigits(bytesToHex(cipher), 3);
    }

    public boolean verifyCVV(String pan, String expDate,
                              String serviceCode, String cvv) {
        return generateCVV(pan, expDate, serviceCode).equals(cvv);
    }

    private String extractDigits(String hex, int count) {
        StringBuilder digits = new StringBuilder();
        // Pass 1 : extraire les chiffres
        for (char c : hex.toCharArray()) {
            if (Character.isDigit(c)) digits.append(c);
            if (digits.length() == count) return digits.toString();
        }
        // Pass 2 : convertir lettres (A=0, B=1, ...)
        for (char c : hex.toCharArray()) {
            if (!Character.isDigit(c)) digits.append(c - 'A');
            if (digits.length() == count) return digits.toString();
        }
        return digits.toString();
    }
}
```$$,
'["CVV = 3DES CBC du PAN+expiry+service code, extrait en 3 chiffres","CVV1 et CVV2 diffèrent par le code service utilisé","CVK = Card Verification Key, stockée dans le HSM","Extraction : d''abord les digits du hex, puis conversion des lettres"]'::jsonb,
2, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.3.3-arqc', 'mod-5.3-crypto', 'Simulateur ARQC/ARPC',
$$## ARQC : Authorization Request Cryptogram

### Principe EMV 4.3

La carte calcule un **MAC** sur les données de transaction :

| Donnée | Source |
|--------|--------|
| Montant | Terminal (CDOL) |
| Devise | Terminal |
| Pays | Terminal |
| ATC | Carte (compteur incrémenté) |
| Aléa terminal | Terminal |
| TVR | Terminal |

### Algorithme

```java
public class EMVCrypto {
    public byte[] generateARQC(byte[] sessionKey, byte[] data) {
        Cipher cipher = Cipher.getInstance("DESede/CBC/NoPadding");
        IvParameterSpec iv = new IvParameterSpec(new byte[8]);
        SecretKeySpec key = new SecretKeySpec(sessionKey, "DESede");
        cipher.init(Cipher.ENCRYPT_MODE, key, iv);
        byte[] result = cipher.doFinal(data);
        return Arrays.copyOf(result, 8); // MAC 8 octets
    }
}
```

### ARPC : Authorization Response Cryptogram

L'émetteur répond avec un ARPC :
```
ARPC = 3DES(sessionKey, ARQC XOR CSU)
```
CSU = Card Status Update (2 octets : autoriser, refuser, bloquer).

### Dérivation de la clé de session

```
IMK (Issuer Master Key)
  ↓ dérivation par PAN+PSN
ICC Key
  ↓ dérivation par ATC
Session Key → utilisée pour ARQC
```

> L'ARQC prouve que la carte est authentique et que les données n'ont pas été altérées.$$,
'["ARQC = MAC 3DES calculé par la carte sur les données de transaction","ARPC = réponse émetteur : 3DES(ARQC XOR CSU)","Clé de session dérivée de IMK → ICC Key → Session Key (via ATC)","L''ARQC prouve l''authenticité de la carte et l''intégrité des données"]'::jsonb,
3, 45) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.3.4-ecc', 'mod-5.3-crypto', 'Secure Channel ECC/AES (Kernel 8)',
$$## Secure Channel du Kernel 8

### Principe

Établir un canal chiffré entre la carte et le terminal via :
1. **ECDH** (échange de clés Diffie-Hellman sur courbe elliptique)
2. **Dérivation** d'une clé AES de session
3. **Chiffrement** AES-GCM de toutes les APDU sensibles

### Implémentation Java

```java
// 1. Génération de paire EC (secp256r1)
KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
kpg.initialize(new ECGenParameterSpec("secp256r1"));
KeyPair keyPair = kpg.generateKeyPair();

// 2. Échange ECDH
KeyAgreement ka = KeyAgreement.getInstance("ECDH");
ka.init(keyPair.getPrivate());
ka.doPhase(peerPublicKey, true);
byte[] secret = ka.generateSecret();

// 3. Dérivation clé AES (SHA-256)
MessageDigest sha = MessageDigest.getInstance("SHA-256");
byte[] aesKey = Arrays.copyOf(sha.digest(secret), 16);

// 4. Chiffrement AES-GCM
Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
c.init(Cipher.ENCRYPT_MODE,
       new SecretKeySpec(aesKey, "AES"));
byte[] ciphertext = c.doFinal(apduData);
byte[] iv = c.getIV();
```

### Flux complet

```
Carte                          Terminal
  │                                │
  │←── Clé publique terminal ──────│
  │                                │
  │──── Clé publique carte ───────→│
  │                                │
  │   [Chacun calcule le secret    │
  │    partagé via ECDH]           │
  │                                │
  │←─── APDU chiffrée AES-GCM ───→│
  │                                │
```

> AES-GCM fournit à la fois **confidentialité** (chiffrement) et **intégrité** (tag d'authentification).$$,
'["ECDH sur secp256r1 pour l''échange de clés sans canal sécurisé préalable","SHA-256 du secret partagé → clé AES 128 bits","AES-GCM = chiffrement + intégrité (authentifié)","Le secure channel protège contre l''écoute et les attaques MITM"]'::jsonb,
4, 50) ON CONFLICT (id) DO NOTHING;
