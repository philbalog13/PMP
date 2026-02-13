-- BLOC 5 – Quizzes and Exercises

-- Quiz 5.1 – Contact ISO 7816
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-5.1-contact', 'mod-5.1-contact', 'Quiz – ISO 7816 & PC/SC',
'[
  {"id":"q1","question":"Quelle API Java est utilisée pour communiquer avec une carte via PC/SC ?","options":["java.net","javax.smartcardio","java.security","javax.crypto"],"correct":1,"explanation":"javax.smartcardio fournit les classes TerminalFactory, CardTerminal, CardChannel pour la communication PC/SC."},
  {"id":"q2","question":"Que se passe-t-il en T=0 quand SW1=0x61 ?","options":["Erreur fatale","La carte a des données à envoyer (utiliser GET RESPONSE)","PIN incorrect","Carte non supportée"],"correct":1,"explanation":"SW1=61, SW2=nombre d''octets disponibles → envoyer GET RESPONSE (00 C0 00 00 xx)."},
  {"id":"q3","question":"Quel protocole est le plus efficace pour les échanges carte ?","options":["T=0","T=1","HTTP","SPI"],"correct":1,"explanation":"T=1 est orienté bloc (full-duplex), plus efficace que T=0 (orienté octet, half-duplex)."},
  {"id":"q4","question":"Le tag 84 dans une réponse FCI contient :","options":["Le nom du porteur","L''AID de l''application","Le montant","Le PIN"],"correct":1,"explanation":"Tag 84 = DF Name (AID), identifiant de l''application sélectionnée."},
  {"id":"q5","question":"La commande GET CHALLENGE (00 84) sert à :","options":["Vérifier le PIN","Obtenir un nombre aléatoire de la carte","Lire un fichier","Changer la clé"],"correct":1,"explanation":"GET CHALLENGE retourne un aléa généré par la carte, utilisé pour l''authentification externe."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 5.2 – Android HCE
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-5.2-android', 'mod-5.2-android', 'Quiz – Android NFC & HCE',
'[
  {"id":"q1","question":"Quelle est la différence entre HCE et Secure Element ?","options":["Aucune","HCE = logiciel pur, SE = matériel sécurisé dédié","HCE = plus sécurisé","SE = logiciel uniquement"],"correct":1,"explanation":"HCE = Host Card Emulation, purement logiciel. SE = puce matérielle inviolable (SIM, eSE)."},
  {"id":"q2","question":"Vrai/Faux : Une application HCE peut émuler plusieurs AID simultanément.","options":["Vrai","Faux"],"correct":0,"explanation":"Vrai : on peut déclarer un groupe d''AID dans apduservice.xml."},
  {"id":"q3","question":"Quel est le rôle du fichier apduservice.xml ?","options":["Configurer le réseau","Déclarer les AID supportés et la catégorie","Stocker les clés","Définir l''interface utilisateur"],"correct":1,"explanation":"apduservice.xml déclare les AID que le service HCE supporte et leur catégorie (payment, other)."},
  {"id":"q4","question":"Le Kernel 8 apporte :","options":["Rien de nouveau","Standardisation, ECC, secure channel, cloud-ready","Uniquement de la vitesse","De nouveaux types de carte"],"correct":1,"explanation":"Kernel 8 = kernel unifié remplaçant les propriétaires, avec ECC, canal chiffré, support cloud et biométrie."},
  {"id":"q5","question":"Quelle classe Android gère la connexion ISO avec une carte NFC ?","options":["NfcAdapter","IsoDep","BluetoothGatt","WifiDirect"],"correct":1,"explanation":"IsoDep permet de communiquer avec une carte ISO 14443-4 via transceive()."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 5.3 – Crypto
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-5.3-crypto', 'mod-5.3-crypto', 'Quiz – Cryptographie appliquée',
'[
  {"id":"q1","question":"Quelle est la taille du compteur dans le KSN DUKPT ?","options":["8 bits","16 bits","21 bits","32 bits"],"correct":2,"explanation":"21 bits → 2^21 ≈ 2 millions de transactions par BDK."},
  {"id":"q2","question":"Vrai/Faux : Le CVV2 est généré avec les mêmes données que le CVV1.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : le code service est différent entre CVV1 (piste) et CVV2 (dos de carte)."},
  {"id":"q3","question":"Quelle courbe elliptique est recommandée pour Kernel 8 ?","options":["secp192r1","secp256r1 (P-256)","secp384r1","secp521r1"],"correct":1,"explanation":"secp256r1 (NIST P-256) est la courbe recommandée pour EMV Kernel 8."},
  {"id":"q4","question":"Quelle est la différence entre ARQC et ARPC ?","options":["Même chose","ARQC = carte, ARPC = émetteur","ARQC = émetteur, ARPC = carte","ARQC = PIN, ARPC = montant"],"correct":1,"explanation":"ARQC = Authorization Request Cryptogram (généré par la carte). ARPC = Authorization Response Cryptogram (réponse émetteur)."},
  {"id":"q5","question":"AES-GCM fournit :","options":["Uniquement le chiffrement","Uniquement l''intégrité","Chiffrement + intégrité (authentifié)","Compression + chiffrement"],"correct":2,"explanation":"GCM = Galois/Counter Mode, fournit à la fois la confidentialité et l''intégrité des données."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 5.4 – JavaCard
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-5.4-javacard', 'mod-5.4-javacard', 'Quiz – JavaCard & GlobalPlatform',
'[
  {"id":"q1","question":"Quelle méthode doit être implémentée par tout applet JavaCard ?","options":["main()","run()","install() et process()","start()"],"correct":2,"explanation":"install() (static) crée l''instance et register(). process(APDU) traite chaque commande."},
  {"id":"q2","question":"Vrai/Faux : Les objets JavaCard sont alloués en RAM.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : les objets créés avec new sont persistants en EEPROM/Flash. Seules les variables locales sont en RAM."},
  {"id":"q3","question":"Quel est le rôle de l''Issuer Security Domain ?","options":["Stocker les données client","Gestionnaire de sécurité (clés, chargement d''applets)","Interface utilisateur","Protocole réseau"],"correct":1,"explanation":"L''ISD gère les clés GlobalPlatform, le chargement et la suppression des applets."},
  {"id":"q4","question":"Quelle commande GlobalPlatformPro installe un applet ?","options":["-info","-list","-install","-delete"],"correct":2,"explanation":"java -jar gp.jar -install MonApplet.cap installe l''applet sur la carte."},
  {"id":"q5","question":"Qu''est-ce que SCP03 ?","options":["Un protocole réseau","Secure Channel Protocol version 3 (AES)","Un format de fichier","Un type de carte"],"correct":1,"explanation":"SCP03 = canal sécurisé AES entre le PC et la carte, remplaçant SCP02 (3DES)."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 5.5 – Java embarqué
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-5.5-java', 'mod-5.5-java-embarque', 'Quiz – Java embarqué',
'[
  {"id":"q1","question":"Vrai/Faux : JavaCard supporte le garbage collector.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : pas de GC. Les objets persistent en EEPROM jusqu''à suppression explicite."},
  {"id":"q2","question":"Quel type primitif est recommandé pour les indices de boucle ?","options":["int","long","short","byte"],"correct":2,"explanation":"short (16 bits) est natif sur la plupart des cartes, nécessite moins de conversion."},
  {"id":"q3","question":"Pourquoi éviter new dans process() ?","options":["Erreur de compilation","Allocation EEPROM lente + usure + fragmentation","Interdit par le compilateur","Ralentit le réseau"],"correct":1,"explanation":"new alloue en EEPROM = lent (1-5 ms), usure (cycles limités), fragmentation (pas de GC)."},
  {"id":"q4","question":"Différence entre arrayCopy et arrayCopyNonAtomic ?","options":["Aucune","arrayCopyNonAtomic est plus rapide mais non transactionnelle","arrayCopy est plus rapide","arrayCopyNonAtomic est obsolète"],"correct":1,"explanation":"arrayCopyNonAtomic = plus rapide mais ne participe pas aux transactions JCSystem (pas de rollback)."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 5.6 – BDD
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-5.6-bdd', 'mod-5.6-bdd', 'Quiz – Base de données bancaire',
'[
  {"id":"q1","question":"Pourquoi ne doit-on pas stocker le CVV en base ?","options":["Trop long","Interdit par PCI DSS, même chiffré","Pas utile","Problème de performance"],"correct":1,"explanation":"PCI DSS interdit le stockage des SAD (CVV, PIN, Track) après autorisation, même chiffrées."},
  {"id":"q2","question":"Différence entre chiffrement TDE et chiffrement applicatif ?","options":["Aucune","TDE = niveau fichier (transparent), applicatif = avant envoi","TDE = plus sécurisé","Applicatif = plus lent"],"correct":1,"explanation":"TDE chiffre les fichiers sur disque (transparent). Applicatif chiffre dans le code avant l''envoi à la DB."},
  {"id":"q3","question":"Vrai/Faux : Le partitionnement améliore toujours les performances.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : dépend de la requête et de la clé de partition. Mauvaise clé = pire performance."},
  {"id":"q4","question":"Deux avantages de la tokenisation vs chiffrement :","options":["Plus rapide et plus simple","Réduction périmètre PCI + pas de clé côté commerçant","Moins cher et plus portable","Plus sécurisé et plus rapide"],"correct":1,"explanation":"Tokenisation : le commerçant est hors périmètre PCI (pas de données réelles) et n''a pas de clés à gérer."},
  {"id":"q5","question":"Volume de données pour 5000 TPS pendant un mois :","options":["100 Go","1 To","~6,6 To","50 To"],"correct":2,"explanation":"5000 × 512 octets × 86400 sec × 30 jours ≈ 6,6 To par mois."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXERCISES
-- =============================================================================

INSERT INTO learning.cursus_exercises (id, module_id, title, description, difficulty, exercise_type, instructions, expected_output, hints)
VALUES
('ex-5.1-apdu-trace', 'mod-5.1-contact', 'Parser de trace APDU en Python',
'Écrire un script Python qui parse une trace APDU et identifie les commandes, AID et status words.',
'3',
'practical',
jsonb_build_array($$Fichier trace_emv.log :

```
→ 00 A4 04 00 0E 32 50 41 59 2E 53 59 53 2E 44 44 46 30 31 00
← 6F 23 84 0E ... 90 00 [12ms]
→ 00 A4 04 00 07 A0 00 00 00 03 10 10 00
← 6F 1A 84 07 ... 90 00 [8ms]
→ 80 A8 00 00 04 83 02 00 00 00
← 77 12 82 02 19 80 ... 90 00 [45ms]
```

Écrire `apdu_parser.py` qui :
1. Parse chaque ligne (→ = commande, ← = réponse)
2. Identifie CLA, INS, P1, P2 pour chaque commande
3. Extrait les AID sélectionnés
4. Affiche le SW (status word) de chaque réponse
5. Calcule le temps de réponse total$$),
$$Sortie attendue :

```
Commande 1: SELECT PPSE (00 A4 04 00)
  AID: 2PAY.SYS.DDF01
  Status: 90 00 (OK)
  Temps: 12 ms

Commande 2: SELECT AID (00 A4 04 00)
  AID: A0000000031010 (Visa)
  Status: 90 00 (OK)
  Temps: 8 ms

Commande 3: GPO (80 A8 00 00)
  Status: 90 00 (OK)
  Temps: 45 ms

Temps total: 65 ms
```$$,
'["Utiliser re (regex) pour parser les lignes hexadécimales","INS A4 = SELECT, INS A8 = GET PROCESSING OPTIONS","Les 2 derniers octets de la réponse sont SW1 SW2","Convertir les octets hex en ASCII pour identifier le PPSE"]'::jsonb
),

('ex-5.3-dukpt-test', 'mod-5.3-crypto', 'Validation DUKPT par vecteurs de test',
'Implémenter DUKPT et valider avec les vecteurs ANSI X9.24.',
'4',
'practical',
jsonb_build_array($$Implémenter la classe DUKPT en Java et valider avec :

```
BDK = 0123456789ABCDEFFEDCBA9876543210
KSN = FFFF9876543210E00001
```

Étapes :
1. Implémenter l'algorithme de dérivation
2. Calculer la clé de session pour le KSN donné
3. Chiffrer un PIN block de test
4. Comparer avec le résultat attendu (vecteur ANSI)
5. Incrémenter le KSN et vérifier la nouvelle clé$$),
$$Le résultat doit correspondre exactement aux vecteurs de test publiés.
La clé dérivée doit être différente pour chaque KSN (compteur incrémenté).
Le PIN block chiffré doit être déchiffrable avec la même clé de session.$$,
'["Le compteur est dans les 21 derniers bits du KSN","Chaque bit 1 du compteur déclenche une étape de dérivation 3DES","La clé initiale est le BDK masqué avec les bits hauts du KSN","Utiliser javax.crypto.Cipher avec DESede pour le 3DES"]'::jsonb
),

('ex-5.4-wallet', 'mod-5.4-javacard', 'Développement d''un Wallet JavaCard complet',
'Développer une applet JavaCard de porte-monnaie électronique avec PIN et transactions atomiques.',
'5',
'practical',
jsonb_build_array($$Développer l'applet SecureWallet avec :

1. **4 commandes APDU** : VERIFY PIN, CREDIT, DEBIT, READ BALANCE
2. **PIN** : OwnerPIN avec 3 tentatives max
3. **Transactions** : JCSystem pour atomicité
4. **Sécurité** : PIN exigé avant toute opération financière

Contraintes :
- Pas de new dans process()
- Fichier .cap < 5 KB
- Utiliser Util.arrayCopy pour toutes les copies

Tester avec GlobalPlatformPro :
```bash
# Installer
java -jar gp.jar -install SecureWallet.cap

# Vérifier le PIN (1234)
java -jar gp.jar -a "00200000021234"

# Créditer 50 centimes
java -jar gp.jar -a "B04000000132"

# Lire solde
java -jar gp.jar -a "B050000002"
```$$),
$$L'applet doit :
- Retourner 90 00 après VERIFY PIN correct
- Retourner 63 C0 + tentatives restantes après PIN faux
- Retourner 69 83 si PIN bloqué (3 échecs)
- Retourner 69 82 si opération sensible sans PIN vérifié
- Retourner 6A 83 si débit > solde
- Retourner le solde sur 2 octets avec READ BALANCE$$,
'["OwnerPIN gère automatiquement le compteur de tentatives","JCSystem.beginTransaction() pour l''atomicité du transfert","selectingApplet() doit retourner immédiatement (pas de traitement)","Tester chaque status word individuellement"]'::jsonb
),

('ex-5.6-schema', 'mod-5.6-bdd', 'Conception du schéma complet d''un switch',
'Concevoir et implémenter le schéma SQL complet d''un switch monétique minimal.',
'4',
'practical',
jsonb_build_array($$Concevoir le schéma avec les tables :
1. **authorizations** : transactions (partitionnée par mois)
2. **merchants** : commerçants
3. **terminals** : terminaux de paiement
4. **bin_routing** : routage par BIN
5. **card_blocklist** : cartes en opposition
6. **sensitive_card_data** : PAN chiffrés

Exigences :
- Index sur les colonnes de recherche fréquente
- Clés étrangères
- Partitionnement par mois de la table authorizations
- Aucun PAN en clair
- Contraintes CHECK sur les montants (> 0) et codes réponse
- Le schéma doit supporter 10M transactions/mois$$),
$$Le schéma doit inclure :
- 6 tables avec colonnes appropriées
- Au minimum 5 index pertinents
- Clés étrangères entre terminals/merchants et authorizations
- Partitionnement RANGE par created_at
- Colonne pan_hash (pas de PAN en clair)
- CHECK constraints sur amount > 0
- ENUM ou CHECK sur response_code (2 caractères)$$,
'["pan_hash = SHA-256 pour la recherche rapide sans stocker le PAN","Partitionnement RANGE par YEAR et MONTH pour les performances","Index composé sur (merchant_id, created_at) pour les requêtes fréquentes","10M TX/mois ≈ 330 000/jour ≈ 3,8 TPS en moyenne"]'::jsonb
) ON CONFLICT (id) DO NOTHING;
