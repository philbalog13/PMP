-- BLOC 2 – Quizzes and Exercises

-- =============================================================================
-- QUIZZES
-- =============================================================================

-- Quiz 2.1 – ISO 7816
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-2.1-iso7816', 'mod-2.1-iso7816', 'Quiz – ISO/IEC 7816 & APDU',
'[
  {"id":"q1","question":"Quel octet de la C-APDU identifie l''instruction ?","options":["CLA","INS","P1","Lc"],"correct":1,"explanation":"INS (octet 2) identifie l''instruction : A4=SELECT, B0=READ BINARY, 20=VERIFY..."},
  {"id":"q2","question":"Quel status word indique que le PIN est bloqué ?","options":["90 00","63 C0","69 83","6A 82"],"correct":2,"explanation":"69 83 = méthode d''authentification bloquée (PIN bloqué définitivement)."},
  {"id":"q3","question":"Combien de cas de figure APDU existent ?","options":["2","3","4","5"],"correct":2,"explanation":"4 cas selon la présence/absence de Lc, Data et Le."},
  {"id":"q4","question":"Quel est le rôle de la commande GET RESPONSE (C0) ?","options":["Réinitialiser la carte","Récupérer les données restantes en T=0","Changer le PIN","Sélectionner un fichier"],"correct":1,"explanation":"En T=0, si SW1=61, GET RESPONSE récupère les octets restants."},
  {"id":"q5","question":"Que signifie CLA=0x80 ?","options":["Commande ISO standard","Commande propriétaire (EMV)","Erreur de classe","Commande étendue"],"correct":1,"explanation":"CLA 0x80 indique une commande propriétaire, souvent utilisée en EMV."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 2.2 – NFC
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-2.2-nfc', 'mod-2.2-nfc', 'Quiz – NFC & ISO 14443',
'[
  {"id":"q1","question":"Quelle est la fréquence utilisée par ISO 14443 ?","options":["125 kHz","13,56 MHz","2,4 GHz","900 MHz"],"correct":1,"explanation":"ISO 14443 utilise 13,56 MHz pour la communication sans contact."},
  {"id":"q2","question":"Quel type ISO 14443 est dominant en paiement ?","options":["Type A","Type B","Les deux également","Ni l''un ni l''autre"],"correct":0,"explanation":"Type A (100% ASK, Modified Miller) est massivement utilisé : Visa, MC, CB sans contact."},
  {"id":"q3","question":"Qu''est-ce que HCE ?","options":["Un protocole de sécurité","Host Card Emulation – émulation carte par logiciel","Un type de carte NFC","Un standard de chiffrement"],"correct":1,"explanation":"HCE permet au téléphone de simuler une carte sans Secure Element matériel."},
  {"id":"q4","question":"Que signifie SAK bit 5 = 1 ?","options":["Carte multi-application","Support ISO 14443-4 (APDU)","Carte expirée","Type B uniquement"],"correct":1,"explanation":"SAK bit 5 à 1 indique le support du protocole ISO 14443-4 pour les APDU."},
  {"id":"q5","question":"Apple Pay utilise quel mécanisme de sécurité ?","options":["HCE seul","Secure Element matériel + tokenisation","Bande magnétique virtuelle","PIN par SMS"],"correct":1,"explanation":"Apple Pay utilise un SE matériel intégré dans l''iPhone avec tokenisation EMV."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 2.3 – ISO 8583
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-2.3-iso8583', 'mod-2.3-iso8583', 'Quiz – ISO 8583 & Flux monétiques',
'[
  {"id":"q1","question":"Que signifie le MTI 0100 ?","options":["Demande financière","Réponse d''autorisation","Demande d''autorisation acquéreur","Reversement"],"correct":2,"explanation":"0100 = version 1993, classe autorisation, requête, origine acquéreur."},
  {"id":"q2","question":"Quel DE contient les données EMV (TLV) ?","options":["DE 2","DE 39","DE 52","DE 55"],"correct":3,"explanation":"DE 55 contient les données EMV au format TLV (ARQC, TVR, etc.)."},
  {"id":"q3","question":"Quel DE contient le code réponse ?","options":["DE 38","DE 39","DE 41","DE 49"],"correct":1,"explanation":"DE 39 = code réponse (00=accepté, 05=refusé, 91=émetteur indisponible)."},
  {"id":"q4","question":"Que contient le bitmap primaire ISO 8583 ?","options":["Les données brutes","64 bits indiquant les DE présents","Le PAN chiffré","Le code d''authentification"],"correct":1,"explanation":"Le bitmap primaire = 64 bits, chaque bit à 1 indique la présence du DE correspondant."},
  {"id":"q5","question":"Le DE 52 contient :","options":["Le montant","Le PAN","Le PIN block chiffré","La date de transaction"],"correct":2,"explanation":"DE 52 = PIN block (8 octets binaires), chiffré 3DES/AES."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 2.4 – EMV
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-2.4-emv', 'mod-2.4-emv', 'Quiz – EMV Carte & Terminal',
'[
  {"id":"q1","question":"Que signifie ARQC ?","options":["Application Request Query Code","Authorization Request Cryptogram","Application Response Query Cipher","Automated Request Query Control"],"correct":1,"explanation":"ARQC = Authorization Request Cryptogram, MAC calculé par la carte pour authentification online."},
  {"id":"q2","question":"Combien d''octets fait le TVR ?","options":["2","4","5","8"],"correct":2,"explanation":"Le TVR (Terminal Verification Results) fait 5 octets = 40 bits de tests."},
  {"id":"q3","question":"Quelle est la première commande d''une transaction EMV ?","options":["VERIFY PIN","GET PROCESSING OPTIONS","SELECT PPSE","GENERATE AC"],"correct":2,"explanation":"SELECT PPSE (2PAY.SYS.DDF01) est toujours la première commande pour découvrir les applications."},
  {"id":"q4","question":"Que signifie un cryptogramme AAC ?","options":["Transaction acceptée offline","Demande d''autorisation online","Transaction refusée offline","Erreur de carte"],"correct":2,"explanation":"AAC = Application Authentication Cryptogram = refus offline par la carte."},
  {"id":"q5","question":"Le CDOL définit :","options":["Les clés de la carte","Les données à fournir pour le calcul du cryptogramme","L''identifiant du terminal","Le format du PIN"],"correct":1,"explanation":"Le CDOL (Card Risk Management Data Object List) liste les données que le terminal doit envoyer pour GENERATE AC."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 2.5 – PCI PTS
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-2.5-pcipts', 'mod-2.5-pcipts', 'Quiz – Terminaux & PCI PTS',
'[
  {"id":"q1","question":"Que signifie SRED dans PCI PTS ?","options":["Secure Remote Electronic Device","Secure Reading and Exchange of Data","Standard Remote Encryption Device","Smart Reader Electronic Data"],"correct":1,"explanation":"SRED = Secure Reading and Exchange of Data : chiffrement des données dès la lecture sur le terminal."},
  {"id":"q2","question":"Que fait le terminal si un tamper est détecté ?","options":["Redémarre","Efface toutes les clés cryptographiques","Envoie une alerte","Continue normalement"],"correct":1,"explanation":"Anti-tampering : détection → zéroïsation immédiate des clés pour protéger les données."},
  {"id":"q3","question":"Qu''est-ce que le TMS ?","options":["Transaction Management Server","Terminal Management System","Token Mapping Service","Trusted Module Security"],"correct":1,"explanation":"TMS = Terminal Management System, serveur central de gestion du parc de TPE."},
  {"id":"q4","question":"Quelle est la durée de validité d''une certification PCI PTS ?","options":["1 an","2 ans","3 ans","5 ans"],"correct":2,"explanation":"La certification PCI PTS est valable 3 ans, puis renouvellement nécessaire."},
  {"id":"q5","question":"Qu''est-ce que le shimming ?","options":["Attaque par caméra","Insertion d''un PCB ultra-fin dans le lecteur puce","Attaque réseau","Phishing téléphonique"],"correct":1,"explanation":"Shimming = insertion d''un circuit imprimé très fin entre la carte et le lecteur pour intercepter les données."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 2.6 – 3DS
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-2.6-3dsecure', 'mod-2.6-3dsecure', 'Quiz – 3-D Secure & SCA',
'[
  {"id":"q1","question":"Quel ECI Visa indique une authentification 3DS réussie ?","options":["02","05","06","07"],"correct":1,"explanation":"ECI 05 (Visa) = authentification réussie → liability shift vers l''émetteur."},
  {"id":"q2","question":"Que signifie ''frictionless'' en 3DS2 ?","options":["Le paiement est refusé","L''authentification se fait sans interaction du porteur","Le commerçant n''a pas implémenté 3DS","La transaction est annulée"],"correct":1,"explanation":"Frictionless = l''ACS authentifie le porteur de manière transparente, basé sur l''analyse de risque."},
  {"id":"q3","question":"Quel composant côté émetteur gère l''authentification 3DS ?","options":["3DS Server","Directory Server","Access Control Server (ACS)","Payment Gateway"],"correct":2,"explanation":"L''ACS (Access Control Server) côté émetteur évalue le risque et gère le challenge."},
  {"id":"q4","question":"La DSP2 impose la SCA pour les paiements en ligne supérieurs à combien ?","options":["10 €","30 €","50 €","100 €"],"correct":1,"explanation":"La SCA est obligatoire au-delà de 30 € (avec cumul limité pour les exemptions petit montant)."},
  {"id":"q5","question":"Vrai ou Faux : Le CAVV est transmis dans le message d''autorisation ISO 8583.","options":["Vrai","Faux"],"correct":0,"explanation":"Vrai : le CAVV (preuve cryptographique 3DS) est transmis dans le DE 48 ou DE 55 du message d''autorisation."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXERCISES
-- =============================================================================

INSERT INTO learning.cursus_exercises (id, module_id, title, description, difficulty, exercise_type, instructions, expected_output, hints)
VALUES
('ex-2.1-apdu-decode', 'mod-2.1-iso7816', 'Décodage de trace APDU',
'Analysez la trace APDU suivante et identifiez chaque commande, ses paramètres et le résultat.',
'2',
'analysis',
jsonb_build_array($$Trace à analyser :

```
<= 00 A4 04 00 0E 32 50 41 59 2E 53 59 53 2E 44 44 46 30 31 00
=> 6F 23 84 0E 32 50 41 59 2E 53 59 53 2E 44 44 46 30 31 A5 11 BF 0C 0E 61 0C 4F 07 A0 00 00 00 03 10 10 50 02 56 49 90 00

<= 00 A4 04 00 07 A0 00 00 00 03 10 10 00
=> 6F 1A 84 07 A0 00 00 00 03 10 10 A5 0F 50 04 56 49 53 41 87 01 01 9F 38 03 9F 66 04 90 00

<= 80 A8 00 00 04 83 02 00 00 00
=> 77 12 82 02 19 80 94 0C 08 01 01 00 10 01 01 00 18 01 02 01 90 00
```

Questions :
1. Identifiez les 3 commandes (CLA INS P1 P2)
2. Quelle application est sélectionnée ? (AID)
3. Quel est le nom de l'application en ASCII ?
4. Que contient le GPO response (Tag 82, Tag 94) ?$$),
$$Réponses attendues :

1. Commande 1 : SELECT PPSE (00 A4 04 00), Commande 2 : SELECT AID (00 A4 04 00), Commande 3 : GPO (80 A8 00 00)
2. AID = A0 00 00 00 03 10 10 (Visa International)
3. Tag 50 = 56 49 53 41 = "VISA" en ASCII
4. Tag 82 (AIP) = 19 80 → SDA supporté, terminal risk management requis
   Tag 94 (AFL) = 08 01 01 00 10 01 01 00 18 01 02 01 → 3 fichiers à lire (SFI 1, 2, 3)$$,
'["Rappel : CLA 00 = ISO, CLA 80 = propriétaire EMV","Tag 50 contient le label de l''application en ASCII","L''AFL (Tag 94) se lit par groupes de 4 octets : SFI, premier record, dernier record, records pour authentification offline"]'::jsonb
),

('ex-2.3-iso8583-build', 'mod-2.3-iso8583', 'Construction d''un message ISO 8583',
'Construisez manuellement un message ISO 8583 d''autorisation à partir des données fournies.',
'3',
'practical',
jsonb_build_array($$Données de la transaction :

- Type : Demande d'autorisation (acquéreur)
- PAN : 4970 1234 5678 9012
- Montant : 42,50 EUR
- Mode d'entrée : Puce avec PIN online
- Terminal ID : TERM0001
- Merchant ID : MERCHANT0001234

Construisez le message avec :
1. Le MTI correct
2. Le bitmap (identifiez les DE nécessaires)
3. Les DE suivants : DE2, DE3, DE4, DE22, DE41, DE42, DE49

Format de sortie attendu : hexadécimal$$),
$$Message attendu :

MTI : 0100
Bitmap : bits 2, 3, 4, 22, 41, 42, 49 positionnés

DE2  = 16 4970123456789012 (LLVAR, 16 chiffres)
DE3  = 003000 (achat)
DE4  = 000000004250 (42,50 EUR en centimes)
DE22 = 051 (puce + PIN online)
DE41 = TERM0001
DE42 = MERCHANT0001234
DE49 = 978 (EUR)$$,
'["MTI 0100 = demande d''autorisation acquéreur","Le bitmap doit avoir les bits correspondant aux DE inclus","DE4 est en centimes sur 12 positions","DE22 : 05 = puce, 1 = PIN saisi"]'::jsonb
),

('ex-2.4-tvr-analysis', 'mod-2.4-emv', 'Analyse de TVR et décision terminale',
'Interprétez les TVR donnés et déterminez la décision du terminal.',
'3',
'analysis',
jsonb_build_array($$Analysez les TVR suivants et expliquez la décision du terminal (TC, ARQC ou AAC) :

**Cas 1** : TVR = 00 00 00 00 00
**Cas 2** : TVR = 00 00 00 80 00
**Cas 3** : TVR = 04 00 40 00 00
**Cas 4** : TVR = 00 00 00 00 01

Pour chaque cas :
1. Identifiez les bits positionnés
2. Expliquez leur signification
3. Déterminez la décision probable du terminal$$),
$$**Cas 1** : TVR = 00 00 00 00 00
- Aucun bit positionné → tous les tests OK
- Décision : TC (accepté offline) si sous le floor limit

**Cas 2** : TVR = 00 00 00 80 00
- Octet 4, bit 8 = 1 → transaction dépasse le floor limit
- Décision : ARQC (envoi online obligatoire)

**Cas 3** : TVR = 04 00 40 00 00
- Octet 1, bit 3 = 1 → ICC data missing
- Octet 3, bit 7 = 1 → CVM failed
- Décision : AAC (refus offline) ou ARQC selon la politique

**Cas 4** : TVR = 00 00 00 00 01
- Octet 5, bit 1 = 1 → script non exécuté après GENERATE AC
- Décision : TC possible (bit mineur)$$,
'["Chaque octet du TVR contrôle un domaine : auth, data, CVM, risque, script","Bit = 1 signifie test échoué ou condition non remplie","Floor limit dépassé = online obligatoire (ARQC)","CVM failed peut entraîner un refus selon la politique du terminal"]'::jsonb
),

('ex-2.6-3ds-flow', 'mod-2.6-3dsecure', 'Diagramme de flux 3DS2',
'Dessinez le diagramme de séquence complet d''une transaction 3DS2 avec challenge.',
'2',
'practical',
jsonb_build_array($$Créez un diagramme de séquence montrant tous les échanges entre :
- Porteur (navigateur)
- Commerçant (3DS Server)
- Directory Server
- ACS (émetteur)
- Autorisation

Le scénario : achat de 150 € sur un site de vêtements. L'ACS décide un challenge par OTP push.

Identifiez pour chaque flèche :
1. Le message (AReq, ARes, CReq, CRes, Autorisation)
2. Les données clés échangées
3. Le résultat final (ECI, CAVV)$$),
$$Diagramme attendu :

1. Porteur → Commerçant : Clic "Payer" (PAN, montant, browser info)
2. Commerçant → DS : AReq (PAN, montant=150€, device info, merchant)
3. DS → ACS : AReq (routé vers l'émetteur du PAN)
4. ACS analyse risque → Décision : CHALLENGE
5. ACS → DS → Commerçant : ARes (transStatus=C, acsURL)
6. Commerçant → Porteur : Redirection vers ACS
7. Porteur → ACS : CReq (navigation)
8. ACS → Porteur : Envoi OTP push sur mobile
9. Porteur → ACS : CRes (saisie OTP)
10. ACS vérifie OTP → OK
11. ACS → Commerçant : RReq (transStatus=Y, CAVV, ECI=05)
12. Commerçant → Autorisation : ISO 8583 0100 avec CAVV+ECI
13. Autorisation → Commerçant : 0110 code=00$$,
'["Le flux 3DS2 challenge implique AReq/ARes puis CReq/CRes","L''ACS décide du type de challenge (OTP, push, biométrie)","Le résultat final contient ECI=05 et CAVV","Le message d''autorisation 0100 intègre les données 3DS"]'::jsonb
) ON CONFLICT (id) DO NOTHING;
