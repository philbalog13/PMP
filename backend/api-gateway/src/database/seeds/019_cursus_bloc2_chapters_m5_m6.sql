-- Chapters for Module 2.5 – PCI PTS (4 chapters)

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.5.1-archi-tpe', 'mod-2.5-pcipts', 'Architecture interne d''un TPE',
$$## Le terminal de paiement électronique

Un TPE est un **micro-ordinateur durci** spécialisé dans le traitement sécurisé des paiements.

### Composants internes

| Composant | Rôle |
|-----------|------|
| Processeur ARM | Exécution du logiciel (noyau temps réel) |
| Lecteur puce (ICC) | ISO 7816, contacts C1-C8 |
| Lecteur NFC | ISO 14443, bobine 13,56 MHz |
| Lecteur magnétique | Piste 1, 2, 3 (legacy) |
| Clavier PIN | Touches sécurisées (mesh anti-intrusion) |
| Écran | LCD/TFT, affichage sécurisé |
| Module crypto (SAM/HSM) | Stockage clés, 3DES/AES |
| Modem/réseau | Ethernet, Wi-Fi, 4G/5G, RS-232 |
| Imprimante | Ticket thermique |

### Architecture logicielle

```
[Application de paiement]
     ↓
[Middleware EMV / Kernel]
     ↓
[Couche crypto (HSM interne)]
     ↓
[Drivers matériels (ICC, NFC, PIN)]
     ↓
[OS temps réel (Linux durci, propriétaire)]
```

Le middleware EMV gère le dialogue avec la carte (kernels 1-8) et la construction du message ISO 8583.$$,
'["TPE = micro-ordinateur durci avec lecteurs ICC/NFC/magnétique","Module crypto interne (SAM) stocke les clés de chiffrement","OS temps réel (Linux durci ou propriétaire)","Middleware EMV pilote les kernels contact/contactless"]'::jsonb,
1, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.5.2-pcipts', 'mod-2.5-pcipts', 'PCI PTS POI v7.0 : le référentiel',
$$## PCI PTS : Payment Card Industry – PIN Transaction Security

Le standard PCI PTS régit la sécurité des **terminaux de paiement** (POI – Point of Interaction).

### Modules d'évaluation

| Module | Objet |
|--------|-------|
| POI Core | Exigences de base (intégrité, authentification) |
| SRED | Secure Reading and Exchange of Data (chiffrement dès la lecture) |
| PED | PIN Entry Device (sécurité du clavier PIN) |
| Communication | Sécurité des transmissions |
| Integration | Exigences d'intégration |

### Exigences clés

- **Anti-tampering** : le terminal doit détecter toute tentative d'ouverture physique et effacer les clés
- **SRED** : les données de carte sont chiffrées immédiatement après lecture (DUKPT ou AES)
- **PIN Block** : le PIN est chiffré au format ISO 9564 dans le module sécurisé
- **Mesh** : grille conductrice autour du clavier, détecte le perçage
- **Zéroïsation** : effacement instantané des clés si tamper détecté

### Certification

1. Le fabricant soumet le terminal à un laboratoire PCI
2. Tests physiques (radiographie, analyse chimique)
3. Tests logiciels (fuzzing, analyse de code)
4. Certification valable 3 ans (puis renouvellement)
5. Mise sur la liste PTS des terminaux approuvés$$,
'["PCI PTS = standard de sécurité pour les terminaux de paiement","SRED = chiffrement des données dès la lecture sur le terminal","Anti-tampering : détection physique → effacement des clés","Certification par laboratoire PCI, valable 3 ans"]'::jsonb,
2, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.5.3-injection', 'mod-2.5-pcipts', 'Injection de clés et gestion du parc',
$$## Le processus d'injection de clés

L'injection de clés est le processus qui installe les **clés cryptographiques** dans le terminal de manière sécurisée.

### Méthodes d'injection

| Méthode | Description | Sécurité |
|---------|-------------|----------|
| Injection physique | Salle sécurisée, câble série, 2 opérateurs | Très élevée |
| Remote Key Loading (RKL) | Via réseau chiffré (TLS + certificats) | Élevée |
| TR-34 | Standard ANSI pour injection distante | Élevée |

### Hiérarchie des clés

```
TMK (Terminal Master Key)
  ├── TPK (Terminal PIN Key) → chiffrement du PIN
  ├── TAK (Terminal Authentication Key) → MAC des messages
  └── TDK (Terminal Data Key) → chiffrement des données
```

Ou avec **DUKPT** :
```
BDK (Base Derivation Key)
  └── KSN → clé de session unique par transaction
```

### Gestion du parc de TPE

- **TMS** (Terminal Management System) : serveur central qui gère la configuration, les mises à jour logicielles et les clés
- **Inventaire** : chaque terminal est identifié par son TID (Terminal ID) et son numéro de série
- **Mise à jour** : les mises à jour firmware sont signées cryptographiquement
- **Monitoring** : état de santé, alertes de tampering$$,
'["Injection de clés : physique (salle sécurisée) ou distante (RKL, TR-34)","TMK → TPK/TAK/TDK ou BDK → DUKPT","TMS = serveur central de gestion du parc de terminaux","Firmware signé cryptographiquement pour les mises à jour"]'::jsonb,
3, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.5.4-antifraude', 'mod-2.5-pcipts', 'Mécanismes anti-fraude du terminal',
$$## Protections physiques

### Mesh (grille conductrice)
- Réseau de fils conducteurs autour du clavier PIN
- Si un fil est coupé → détection → effacement des clés
- Protection contre le **skimming** (ajout de lecteur parasite)

### Capteurs environnementaux
- **Tension** : variation = tentative d'injection de faute
- **Température** : gel pour ralentir et analyser les puces
- **Lumière** : ouverture du boîtier

### Protections logicielles

| Protection | Description |
|------------|-------------|
| Secure Boot | Vérification de signature au démarrage |
| Code signing | Tout logiciel doit être signé |
| Whitelist | Seules les applications autorisées s'exécutent |
| Logs | Journal des événements de sécurité |

## Attaques connues sur les TPE

| Attaque | Méthode | Contre-mesure |
|---------|---------|---------------|
| Skimming | Surcouche sur le lecteur | Anti-tamper, inspection visuelle |
| Shimming | PCB ultra-fin dans lecteur puce | Détection électrique |
| RAM scraping | Malware lit la mémoire | SRED, chiffrement immédiat |
| PIN capture | Caméra miniature | Cache PIN, clavier à touches plates |
| Replay | Rejeu de transaction | Cryptogramme EMV unique |

> **Statistique** : L'introduction d'EMV a réduit la fraude par contrefaçon de 76 % en Europe entre 2008 et 2019.$$,
'["Mesh conductrice : détection de perçage → effacement des clés","Capteurs environnementaux : tension, température, lumière","Secure Boot + code signing obligatoires","Skimming, shimming, RAM scraping = attaques principales sur les TPE"]'::jsonb,
4, 40) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Chapters for Module 2.6 – 3-D Secure (4 chapters)
-- =============================================================================

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.6.1-3ds-archi', 'mod-2.6-3dsecure', 'Architecture 3-D Secure v2',
$$## Qu'est-ce que 3-D Secure ?

3-D Secure est un protocole d'**authentification du porteur** pour les transactions en ligne (Card Not Present – CNP).

### Les 3 domaines

| Domaine | Acteur | Composant |
|---------|--------|-----------|
| Acquéreur | Commerçant, PSP | 3DS Server (MPI) |
| Interopérabilité | Schéma (Visa, MC) | Directory Server (DS) |
| Émetteur | Banque émettrice | Access Control Server (ACS) |

### Flux simplifié v2.x

```
[Porteur] → [Commerçant] → [3DS Server] → [DS] → [ACS]
                                                      ↓
                                              [Challenge ?]
                                                      ↓
                                              [Résultat]
```

1. Le commerçant collecte les données de transaction
2. Le 3DS Server envoie une requête d'authentification (AReq) au DS
3. Le DS route vers l'ACS de l'émetteur
4. L'ACS évalue le risque et décide : **frictionless** ou **challenge**
5. Résultat envoyé au commerçant (ARes)
6. Le commerçant procède à l'autorisation avec le résultat 3DS$$,
'["3DS = 3 domaines : acquéreur, interopérabilité (schéma), émetteur","3DS Server (MPI) côté commerçant, DS côté schéma, ACS côté émetteur","AReq/ARes = messages d''authentification entre 3DS Server et ACS","L''ACS décide : frictionless (transparent) ou challenge (interaction)"]'::jsonb,
1, 30) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.6.2-frictionless', 'mod-2.6-3dsecure', 'Frictionless vs Challenge',
$$## Le flux frictionless

L'ACS peut authentifier le porteur **sans interaction** si le risque est faible.

### Données d'évaluation du risque

| Donnée | Source | Utilisation |
|--------|--------|-------------|
| Device fingerprint | Navigateur/mobile | Reconnaissance appareil |
| Historique | Base ACS | Client habituel ? |
| IP géolocalisation | Requête | Pays cohérent ? |
| Montant | Transaction | Sous le seuil ? |
| Heure | Horloge | Habituel ? |
| Type de marchandise | Commerçant | Catégorie risquée ? |

Si l'ACS estime le risque **faible** → authentification frictionless (pas d'interaction porteur).

## Le flux challenge

Si le risque est **élevé**, l'ACS envoie un challenge :

| Type | Description |
|------|-------------|
| OTP SMS | Code envoyé par SMS |
| OTP Push | Notification dans l'app bancaire |
| Biométrie | Empreinte ou reconnaissance faciale |
| Code secret | Mot de passe statique (obsolète) |

### ECI (Electronic Commerce Indicator)

| ECI | Signification |
|-----|---------------|
| 05 (Visa) / 02 (MC) | Authentification réussie |
| 06 (Visa) / 01 (MC) | Tentative d'authentification (ACS indisponible) |
| 07 (Visa) / 00 (MC) | Pas d'authentification |

> **ECI 05 + CAVV valide** = liability shift vers l'émetteur (le commerçant ne porte pas la fraude).$$,
'["Frictionless = authentification sans interaction, basée sur l''analyse de risque","Challenge = interaction porteur (OTP, push, biométrie)","ECI 05 (Visa) = authentification réussie → liability shift","CAVV = Cardholder Authentication Verification Value, preuve cryptographique"]'::jsonb,
2, 30) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.6.3-dsp2', 'mod-2.6-3dsecure', '3DS et conformité DSP2/SCA',
$$## L'obligation d'authentification forte (SCA)

La **DSP2** (Directive sur les Services de Paiement 2) impose l'authentification forte (SCA) pour les paiements en ligne dans l'Espace Économique Européen.

### Définition SCA

Au moins **deux facteurs** parmi :
- **Connaissance** : mot de passe, PIN
- **Possession** : téléphone, carte, token
- **Inhérence** : empreinte, visage, voix

### 3DS2 et SCA

3DS2 est le mécanisme technique principal pour appliquer la SCA :
- L'ACS vérifie deux facteurs (ex: possession du mobile + biométrie)
- Le résultat est transmis cryptographiquement (CAVV)

### Exemptions DSP2

| Exemption | Condition | Qui décide ? |
|-----------|-----------|--------------|
| Faible montant | < 30 € (cumul limité) | Émetteur |
| Bénéficiaire de confiance | Liste blanche du porteur | Émetteur |
| Transaction récurrente | Même montant, même bénéficiaire | Émetteur |
| TRA (Transaction Risk Analysis) | Score de risque faible | Acquéreur ou émetteur |
| Vente par correspondance (MOTO) | Téléphone, courrier | Hors périmètre SCA |

### Plafonds TRA

| Seuil d'exemption | Taux de fraude maximum |
|-------------------|----------------------|
| ≤ 100 € | 0,13 % |
| ≤ 250 € | 0,06 % |
| ≤ 500 € | 0,01 % |

> Les acquéreurs et émetteurs qui dépassent ces taux de fraude perdent le droit d'appliquer l'exemption TRA.$$,
'["DSP2 impose SCA = 2 facteurs (connaissance, possession, inhérence)","3DS2 est le mécanisme technique pour appliquer SCA en e-commerce","Exemptions : faible montant, bénéficiaire confiance, TRA, MOTO","TRA : seuils de taux de fraude à respecter pour exempter"]'::jsonb,
3, 30) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-2.6.4-implementation', 'mod-2.6-3dsecure', 'Implémentation technique 3DS2',
$$## Intégration côté commerçant

### Le 3DS Server (ex-MPI)

Le 3DS Server est le composant côté commerçant qui :
1. Collecte les données de la transaction et du navigateur
2. Envoie l'AReq (Authentication Request) au DS
3. Reçoit l'ARes (Authentication Response)
4. Gère le challenge si nécessaire (CReq/CRes)
5. Transmet le résultat à l'autorisation (CAVV, ECI)

### Messages principaux

| Message | Direction | Contenu |
|---------|-----------|---------|
| AReq | 3DS Server → DS | Données carte, montant, device info |
| ARes | DS → 3DS Server | Résultat (frictionless/challenge), ACS URL |
| CReq | Navigateur → ACS | Données du challenge |
| CRes | ACS → Navigateur | Résultat du challenge |

### Données collectées (browser fingerprint)

```json
{
  "browserAcceptHeader": "text/html",
  "browserJavascriptEnabled": true,
  "browserLanguage": "fr-FR",
  "browserScreenHeight": "1080",
  "browserScreenWidth": "1920",
  "browserTZ": "-60",
  "browserUserAgent": "Mozilla/5.0...",
  "browserIP": "192.168.1.50"
}
```

### Dans le message d'autorisation ISO 8583

Le résultat 3DS est transmis dans le DE 48 ou DE 55 :
- **CAVV** : Cardholder Authentication Verification Value (20 octets)
- **ECI** : Electronic Commerce Indicator
- **XID** : Transaction Identifier (3DS1) ou **dsTransID** (3DS2)

### Liability shift

| Scénario | Responsable fraude |
|----------|-------------------|
| 3DS2 réussi (ECI 05) | Émetteur |
| 3DS2 échoué ou non tenté | Commerçant |
| Exemption TRA commerçant | Commerçant |
| Exemption émetteur | Émetteur |$$,
'["3DS Server envoie AReq, reçoit ARes, gère CReq/CRes si challenge","CAVV + ECI + dsTransID transmis dans le message d''autorisation","Browser fingerprint collecté pour évaluation du risque","Liability shift : ECI 05 = émetteur responsable, sinon commerçant"]'::jsonb,
4, 30) ON CONFLICT (id) DO NOTHING;
