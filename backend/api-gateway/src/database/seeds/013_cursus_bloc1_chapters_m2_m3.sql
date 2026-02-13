-- Chapters for Module 1.2 – Cybersécurité appliquée aux paiements

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.2.1-fraudes', 'mod-1.2-cybersecurite', 'La menace – Typologie des fraudes',
$$## Fraude carte présente
- **Skimming** : copie des données de la bande magnétique via superposeur de lecteur sur DAB/TPE.
- **Shimming** : lame électronique dans le lecteur de puce EMV pour capturer les échanges carte/terminal.
- **Vol physique** : carte dérobée, utilisée avant opposition (risque réduit par le PIN, mais le sans contact reste vulnérable).

## Fraude carte non présente (CNP)
- **Phishing** : email usurpant une banque, redirigeant vers un faux site de paiement.
- **Carding** : logiciels testant des milliers de numéros de carte sur des sites de faible montant.
- **BIN attack** : les 6 premiers chiffres (BIN) sont publics ; les fraudeurs génèrent les suivants et brute-forcent le CVV.
- **MITM** : interception de la communication (solution : TLS/HTTPS).

## Fraude interne
Employés de centres d'appel, processeurs ou commerçants ayant accès aux données de carte. Détournement à des fins personnelles ou revente.$$,
'["Skimming = copie de la bande magnétique, Shimming = attaque la puce","Phishing et carding = principales fraudes CNP","BIN attack exploite les 6 premiers chiffres publics","La fraude interne reste un risque majeur"]'::jsonb,
1, 30) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.2.2-securite', 'mod-1.2-cybersecurite', 'Principes fondamentaux de la sécurité',
$$## CID appliqué aux paiements
- **Confidentialité** : seules les parties autorisées lisent le PAN, le PIN, etc.
- **Intégrité** : garantir que montant, numéro de carte, cryptogramme n'ont pas été modifiés en transit.
- **Disponibilité** : systèmes d'autorisation répondent 24/7 en < 2 secondes.

## Authentification, Autorisation, Non-répudiation
- **Authentification** : vérifier l'identité du porteur (PIN, biométrie, 3DS).
- **Autorisation** : vérifier que le porteur a le droit d'utiliser ce moyen (solde, plafond).
- **Non-répudiation** : prouver qu'une transaction a bien été effectuée (logs, signature électronique).$$,
'["CID = Confidentialité, Intégrité, Disponibilité","Authentification vérifie l''identité, autorisation vérifie les droits","Non-répudiation = preuve irréfutable de la transaction"]'::jsonb,
2, 20) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.2.3-pcidss', 'mod-1.2-cybersecurite', 'La norme PCI DSS',
$$## Qu'est-ce que le PCI DSS ?
**PCI DSS** = Payment Card Industry Data Security Standard. Créé en 2006 par Visa, MC, Amex, JCB, Discover. Applicable à toute entité qui stocke, traite ou transmet des données de cartes.

## Les 12 exigences (6 objectifs)

| Objectif | Exigences |
|----------|-----------|
| 1. Réseau sécurisé | 1. Pare-feu — 2. Pas de mots de passe par défaut |
| 2. Protéger les données | 3. Chiffrer les données stockées — 4. Chiffrer les transmissions |
| 3. Vulnérabilités | 5. Antivirus — 6. Applications sécurisées |
| 4. Contrôle d'accès | 7. Restreindre l'accès — 8. Authentifier — 9. Accès physique |
| 5. Surveiller/tester | 10. Tracer les accès — 11. Tests de sécurité |
| 6. Politique | 12. Politique de sécurité |

## Niveaux de conformité
- **Niveau 1** : +6M transactions → audit QSA sur site
- **Niveau 2** : 1–6M → ROC ou SAQ
- **Niveau 3** : 20K–1M → SAQ annuel
- **Niveau 4** : <20K → SAQ

**SAQ** = questionnaire d'auto-évaluation (types : A, A-EP, B, C, D).$$,
'["PCI DSS = standard obligatoire pour protéger les données de carte","12 exigences regroupées en 6 objectifs","4 niveaux de conformité selon le volume de transactions","SAQ = questionnaire d''auto-évaluation pour les petits commerçants"]'::jsonb,
3, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.2.4-protection', 'mod-1.2-cybersecurite', 'Techniques de protection',
$$## Chiffrement
- **Symétrique (AES, 3DES)** : même clé pour chiffrer/déchiffrer. Rapide, pour données en base et communications internes.
- **Asymétrique (RSA, ECC)** : clé publique/privée. Pour échange de clés, signatures, TLS.

## Tokenisation
Remplacement du PAN par un **jeton** sans valeur mathématique. Le vrai PAN est stocké dans un coffre sécurisé. Avantage : même si la base est volée, les jetons sont inutilisables.

## Masquage et troncature
- **Masquage** : affichage partiel (`**** **** **** 1234`). Obligatoire sur tickets et interfaces.
- **Troncature** : suppression définitive. PCI DSS interdit le stockage du CVV après autorisation.

## HSM (Hardware Security Module)
Appliance matérielle dédiée aux opérations cryptographiques. Stocke les clés de manière inviolable. Génère des PIN, vérifie des cryptogrammes, signe des messages. **Les clés ne sortent jamais en clair du HSM.**$$,
'["Chiffrement symétrique (AES) pour les données, asymétrique (RSA) pour les clés","Tokenisation remplace le PAN par un jeton inutilisable","PCI DSS interdit le stockage du CVV après autorisation","HSM = coffre-fort matériel, les clés ne sortent jamais en clair"]'::jsonb,
4, 30) ON CONFLICT (id) DO NOTHING;

-- Chapters for Module 1.3 – CP / CNP

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.3.1-cp', 'mod-1.3-cp-cnp', 'Carte présente – Le monde physique',
$$## La bande magnétique
3 pistes : Track 1 (IATA), Track 2 (ABA), Track 3 (rare). Données statiques, copie facile (skimmer). Encore présente pour compatibilité.

## La révolution EMV
**EMV** = Europay, MasterCard, Visa. Puce infalsifiable, cryptogramme dynamique par transaction (ARQC).

### Transaction EMV simplifiée
```
Terminal (TPE)              Carte (Puce)
  |---- SELECT PPSE ------->|
  |<--- liste des AID ------|
  |---- SELECT AID -------->|
  |<--- données carte ------|
  |---- GENERATE AC ------->|
  |<--- ARQC (cryptogramme)-|
  |---- (envoi banque) ---->|
  |<--- ARPC (réponse) -----|
```

**Termes clés** : AID (Application Identifier), TVR (Terminal Verification Results), ARQC (Authorization Request Cryptogram), ARPC (Authorization Response Cryptogram).

### Authentification de la carte
- **SDA** (Static Data Authentication) : signature statique, rejouable – faible.
- **DDA** (Dynamic Data Authentication) : signature dynamique – forte.
- **CDA** (Combined DDA + AC) : le plus sécurisé.

### Vérification du porteur
- PIN off-line : vérifié par la puce
- PIN on-line : chiffré (PIN block) envoyé à l'émetteur
- Sans vérification : petits montants sans contact

## Le sans-contact (NFC)
ISO 14443, extension EMV. Distance < 4 cm. Limite 50 € en France. Cryptogramme à usage unique.$$,
'["EMV = puce infalsifiable + cryptogramme dynamique","ARQC = preuve cryptographique que la carte est authentique","SDA < DDA < CDA : niveaux croissants de sécurité","NFC : mêmes mécanismes EMV, limite de montant, sans vérification porteur"]'::jsonb,
1, 60) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.3.2-cnp', 'mod-1.3-cp-cnp', 'Carte non présente – Le monde e-commerce',
$$## Problème fondamental
Le commerçant ne voit ni la carte ni le porteur. PAN, date, CVV sont des données statiques, faciles à revendre.

### Solutions historiques
- **CVV** : 3 chiffres, plus difficile à capturer mais statique.
- **AVS** : vérification d'adresse (peu utilisé hors US).

## 3-D Secure

### Version 1.0 (3DS1)
Redirection vers la banque, mot de passe statique ou SMS. Lourd, taux d'abandon élevé.

### Version 2.x (3DS2) — Obligatoire depuis DSP2
- **Données contextuelles** : adresse IP, empreinte appareil, historique.
- **Frictionless** : pas d'interruption si le score est bon.
- **Challenge** : push notification, biométrie, OTP.

```
1. Commerçant → 3DS Server (AReq)
2. 3DS Server → Directory Server → ACS (émetteur)
3. ACS évalue le risque
4. Frictionless → CAVV immédiat
5. Challenge → porteur s'authentifie
6. Résultat (CAVV, ECI) → commerçant
```

**CAVV** = preuve d'authentification. **ECI** = niveau de sécurité (05 = forte, 06 = tentative, 07 = non authentifié).$$,
'["CNP = données statiques, vulnérable à la fraude","3DS1 : redirection + mot de passe, taux d''abandon élevé","3DS2 : basé sur le risque, frictionless ou challenge","CAVV = preuve d''authentification, ECI indique le niveau de sécurité"]'::jsonb,
2, 50) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.3.3-liability', 'mod-1.3-cp-cnp', 'Responsabilité et bascule de risque',
$$## Liability Shift
Mécanisme des schémas qui transfère la responsabilité en cas de fraude :

| Situation | Responsable |
|-----------|-------------|
| 3DS authentifié (CAVV valide) | **Émetteur** |
| Pas de 3DS (ECI = 07) | **Commerçant** |
| 3DS échoué / timeout | **Commerçant** |

## DSP2 et authentification forte
DSP2 rend obligatoire l'authentification forte dans l'EEE. Le non-respect peut entraîner la responsabilité du commerçant, même s'il est conforme PCI.

## Pourquoi ne pas toujours utiliser 3DS ?
3DS peut faire perdre des ventes (abandon de panier). Certains commerçants préfèrent prendre le risque de fraude plutôt que de perdre un client.$$,
'["Liability shift : avec 3DS → émetteur paie ; sans 3DS → commerçant paie","DSP2 rend l''authentification forte obligatoire dans l''EEE","Le commerçant peut choisir de ne pas utiliser 3DS pour réduire l''abandon de panier"]'::jsonb,
3, 30) ON CONFLICT (id) DO NOTHING;
