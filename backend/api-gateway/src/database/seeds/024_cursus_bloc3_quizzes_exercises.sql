-- BLOC 3 – Quizzes and Exercises

-- Quiz 3.1 – Architecture
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-3.1-archi', 'mod-3.1-architecture', 'Quiz – Architecture des systèmes de paiement',
'[
  {"id":"q1","question":"Quelle est la différence entre middle-office et back-office ?","options":["Même chose","Middle = temps réel, Back = différé","Middle = batch, Back = temps réel","Middle = front-end, Back = base de données"],"correct":1,"explanation":"Middle-office = traitement transactionnel temps réel (<500ms). Back-office = traitement différé (J+1, batch)."},
  {"id":"q2","question":"Vrai/Faux : Un système actif/actif est toujours plus résilient qu''actif/passif.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : actif/actif apporte complexité, coût et synchronisation inter-site. Ce n''est pas toujours plus résilient."},
  {"id":"q3","question":"Quel est le principal défi des microservices dans le paiement ?","options":["Le coût réseau","La gestion des transactions distribuées et de l''état","L''interface utilisateur","La formation des équipes"],"correct":1,"explanation":"Les transactions financières nécessitent des garanties ACID difficiles à maintenir dans un environnement distribué."},
  {"id":"q4","question":"Qu''est-ce qu''un SPOF ?","options":["Un protocole de sécurité","Un point de défaillance unique","Un type de switch","Un format de message"],"correct":1,"explanation":"SPOF = Single Point Of Failure : composant dont la panne arrête tout le système."},
  {"id":"q5","question":"Objectif de disponibilité typique pour un switch monétique :","options":["99%","99,9%","99,99%","99,999%"],"correct":3,"explanation":"99,999% = 5 minutes d''arrêt par an maximum."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 3.2 – Switch
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-3.2-switch', 'mod-3.2-switch', 'Quiz – Switch monétique & routage',
'[
  {"id":"q1","question":"Quelle est la différence entre un switch et un schéma ?","options":["Synonymes","Switch = technique, Schéma = gouvernance + routage global","Switch = routage, Schéma = chiffrement","Aucune"],"correct":1,"explanation":"Switch = équipement technique (routeur). Schéma = entité de gouvernance (Visa, MC) + routage global."},
  {"id":"q2","question":"Vrai/Faux : Le switch stocke les données de carte pour accélérer le routage.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : le switch ne stocke pas les données de carte (sauf logs temporaires pour traçabilité)."},
  {"id":"q3","question":"Qu''est-ce qu''un message orphelin ?","options":["Message sans en-tête","Message dont la transaction d''origine n''est pas retrouvée","Message chiffré","Message en erreur"],"correct":1,"explanation":"Message orphelin = réponse arrivée après timeout, la requête d''origine n''est plus en mémoire."},
  {"id":"q4","question":"Le code réponse 91 signifie :","options":["Succès","Format error","Émetteur indisponible","PIN incorrect"],"correct":2,"explanation":"Code 91 = émetteur non disponible (timeout ou panne)."},
  {"id":"q5","question":"Le routage BIN utilise les premiers chiffres du :","options":["CVV","PIN","PAN","Montant"],"correct":2,"explanation":"BIN = 6 à 8 premiers chiffres du PAN, identifiant l''émetteur et le schéma."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 3.3 – HSM
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-3.3-hsm', 'mod-3.3-hsm', 'Quiz – HSM & Cryptographie matérielle',
'[
  {"id":"q1","question":"Quelle est la différence entre LMK et TMK ?","options":["Synonymes","LMK = clé maître du HSM, TMK = clé maître des terminaux","LMK = clé de transport, TMK = clé locale","LMK = temporaire, TMK = permanente"],"correct":1,"explanation":"LMK = Local Master Key (clé racine du HSM). TMK = Terminal Master Key (clé maître d''un parc de TPE)."},
  {"id":"q2","question":"Vrai/Faux : Un HSM FIPS 140-2 niveau 3 résiste aux attaques par canaux auxiliaires.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : le niveau 3 ne couvre pas les side-channel attacks. Le niveau 4 les adresse partiellement."},
  {"id":"q3","question":"À quoi sert la commande GG d''un HSM Thales ?","options":["Générer une clé","Exporter une clé chiffrée sous LMK","Vérifier un PIN","Générer un ARQC"],"correct":1,"explanation":"GG = exporter une clé, chiffrée sous la LMK, pour transfert sécurisé."},
  {"id":"q4","question":"Combien de transactions le DUKPT supporte-t-il avant re-injection ?","options":["1 000","100 000","~2 millions","Illimité"],"correct":2,"explanation":"Compteur DUKPT = 21 bits = 2^21 ≈ 2 097 152 transactions."},
  {"id":"q5","question":"Citez 3 types de clés dans un HSM :","options":["PVK, CVK, BDK","HTTP, FTP, SSH","AES, DES, RSA","GET, POST, PUT"],"correct":0,"explanation":"PVK (PIN Verification Key), CVK (Card Verification Key), BDK (Base Derivation Key) sont des clés stockées dans le HSM."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 3.4 – Messagerie
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-3.4-messaging', 'mod-3.4-messaging', 'Quiz – ISO 8583 & ISO 20022',
'[
  {"id":"q1","question":"Quelle est la signification de pacs.008 ?","options":["Prélèvement","Relevé de compte","Virement client interbancaire","Notification"],"correct":2,"explanation":"pacs.008 = FI To FI Customer Credit Transfer = virement interbancaire."},
  {"id":"q2","question":"Vrai/Faux : ISO 20022 impose le format XML.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : JSON est également accepté depuis 2025."},
  {"id":"q3","question":"Quel message ISO 20022 utilise-t-on pour un relevé de compte ?","options":["pain.001","pacs.008","camt.053","pacs.003"],"correct":2,"explanation":"camt.053 = Bank To Customer Statement (relevé de compte)."},
  {"id":"q4","question":"Quelle est la longueur maximale du DE2 en ISO 8583 ?","options":["10","16","19","32"],"correct":2,"explanation":"DE2 = PAN, longueur maximale 19 chiffres (LLVAR, max 99 mais PAN limité à 19)."},
  {"id":"q5","question":"Comment gérer les champs ISO 20022 sans équivalent ISO 8583 ?","options":["Ignorer","Stocker dans DE48 ou DE62","Créer un nouveau DE","Convertir en binaire"],"correct":1,"explanation":"Les données non mappables sont souvent stockées dans les DE à usage libre (DE48, DE62) ou rejetées."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 3.5 – Tokenisation/P2PE
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-3.5-token', 'mod-3.5-tokenisation', 'Quiz – Tokenisation & P2PE',
'[
  {"id":"q1","question":"Vrai/Faux : Un jeton EMV peut être utilisé chez n''importe quel commerçant.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : le jeton est limité à un domaine (un commerçant, un wallet, un device)."},
  {"id":"q2","question":"Que signifie PAR ?","options":["Payment Authentication Request","Payment Account Reference","Personal Access Right","PIN Authentication Response"],"correct":1,"explanation":"PAR = Payment Account Reference : identifiant de 29 caractères liant le token au PAN."},
  {"id":"q3","question":"Quelle est la principale différence entre P2PE et E2EE ?","options":["Le protocole","P2PE est validé PCI, E2EE ne l''est pas","Le format des données","La vitesse"],"correct":1,"explanation":"P2PE = solution validée PCI SSC, auditée. E2EE = chiffrement maison, non validé."},
  {"id":"q4","question":"Qui attribue les TSP Codes ?","options":["Visa","PCI SSC","EMVCo","SWIFT"],"correct":2,"explanation":"EMVCo gère le programme d''enregistrement des Token Service Providers."},
  {"id":"q5","question":"Avec P2PE, quels champs ISO 8583 sont chiffrés ?","options":["Tous","DE2, DE35, DE45, DE52","Uniquement DE52","Aucun"],"correct":1,"explanation":"DE2 (PAN), DE35 (Track 2), DE45 (Track 1), DE52 (PIN block) sont chiffrés. Le reste est en clair pour le routage."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXERCISES
-- =============================================================================

INSERT INTO learning.cursus_exercises (id, module_id, title, description, difficulty, exercise_type, instructions, expected_output, hints)
VALUES
('ex-3.1-cartographie', 'mod-3.1-architecture', 'Cartographie d''une infrastructure existante',
'Analysez un descriptif textuel d''infrastructure et identifiez les composants, SPOF et améliorations.',
'3',
'analysis',
jsonb_build_array($$Document d'analyse :

*« Le système d'autorisation reçoit les messages du switch via IBM MQ. Chaque message est traité par un pool de 20 workers Java. Le worker consulte le cache Redis pour les plafonds, interroge la base Oracle pour les oppositions, et appelle le HSM via une API C++. La réponse est renvoyée au switch. Les logs sont écrits dans Elasticsearch. Un batch quotidien exporte les transactions vers le data warehouse. »*

Questions :
1. Identifiez les composants **temps réel** vs **batch**
2. Identifiez le **SPOF** potentiel
3. Proposez des **améliorations** de résilience$$),
$$Réponses :

**Temps réel** : Switch, IBM MQ, Workers Java, Redis, Oracle, HSM, Elasticsearch
**Batch** : Export data warehouse (quotidien)

**SPOF** : Base Oracle unique (si elle tombe, plus d'autorisation)

**Améliorations** :
- Clustering Oracle Data Guard (actif/passif ou actif/actif)
- HSM en redondance (N+1)
- Redis en cluster (Sentinel ou Redis Cluster)
- IBM MQ en cluster haute disponibilité
- Circuit breaker sur chaque appel (Redis, Oracle, HSM)$$,
'["Les composants impliqués dans chaque requête sont temps réel","Le SPOF est le composant unique dont la panne bloque tout","Oracle Data Guard = solution de HA pour Oracle","Circuit breaker = pattern de résilience pour les appels externes"]'::jsonb
),

('ex-3.2-routage', 'mod-3.2-switch', 'Configuration d''une table de routage',
'Configurez une table de routage pour un switch monétique et validez le comportement.',
'3',
'practical',
jsonb_build_array($$Complétez la table de routage CSV pour router :

- BIN 4970xx → Émetteur 001 (IP 10.0.0.1:15000)
- BIN 4123xx → Émetteur 002 (IP 10.0.0.2:15000)
- Défaut → Schéma Visa (IP 172.16.0.1:18000)

Format CSV :
```
bin_prefix,issuer_id,scheme,target_ip,target_port,priority,fallback
```

Questions :
1. Que se passe-t-il si l'émetteur 001 est down ?
2. Si un PAN commence par 5398, où est-il routé ?
3. Quelle règle gère la haute disponibilité ?$$),
$$Table de routage :
```csv
bin_prefix,issuer_id,scheme,target_ip,target_port,priority,fallback
4970,001,VISA,10.0.0.1,15000,1,172.16.0.1:18000
4123,002,VISA,10.0.0.2,15000,1,172.16.0.1:18000
*,000,VISA,172.16.0.1,18000,99,
```

Réponses :
1. Fallback vers schéma Visa (172.16.0.1:18000)
2. Routé vers défaut = Schéma Visa
3. La colonne fallback permet un routage secondaire en cas d'indisponibilité$$,
'["Le routage par BIN utilise les 4-8 premiers chiffres","Le défaut (*) attrape tous les BIN non explicitement routés","Le fallback est la route secondaire en cas de timeout","La priorité permet d''ordonner les routes"]'::jsonb
),

('ex-3.4-iso20022', 'mod-3.4-messaging', 'Construction d''un message pain.001',
'Construisez un message ISO 20022 pain.001 (virement) à partir des données fournies.',
'3',
'practical',
jsonb_build_array($$Données du virement :

- **Donneur d'ordre** : MoneticLab SARL
- **IBAN** : FR7630001007941234567890185
- **BIC** : AGRIFRPP
- **Bénéficiaire** : Fournisseur X
- **IBAN bénéficiaire** : DE89370400440532013000
- **Montant** : 1 250,00 EUR
- **Référence** : FACT-2026-0212

Questions :
1. Complétez le XML pain.001 avec les balises correctes
2. Pourquoi utilise-t-on pain.001 et non pacs.008 ?
3. Comment valider le XML contre le schéma XSD officiel ?$$),
$$Réponses :

1. Le XML doit contenir : CstmrCdtTrfInitn > GrpHdr (MsgId, CreDtTm, NbOfTxs) > PmtInf > Dbtr > DbtrAcct > CdtTrfTxInf > Amt > Cdtr > CdtrAcct

2. pain = Payment Initiation = initié par le client. pacs = Payment Clearing and Settlement = interbancaire. Le client initie avec pain.001, la banque transforme en pacs.008 pour l'envoi interbancaire.

3. Validation : xmllint --schema pain.001.001.09.xsd fichier.xml$$,
'["pain = initié par le client, pacs = interbancaire","Les balises structurent les données (Dbtr, Cdtr, Amt...)","Validation par schéma XSD = contrôle de conformité","Le BIC identifie la banque, l''IBAN identifie le compte"]'::jsonb
) ON CONFLICT (id) DO NOTHING;
