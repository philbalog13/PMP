-- BLOC 3 – Quizzes and Exercises (Expanded – 10 questions per quiz)

-- Quiz 3.1 – Architecture
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-3.1-archi', 'mod-3.1-architecture', 'Quiz – Architecture des systèmes de paiement',
'[
  {"id":"q1","question":"Quelle est la différence entre middle-office et back-office ?","options":["Même chose","Middle = temps réel, Back = différé","Middle = batch, Back = temps réel","Middle = front-end, Back = base de données"],"correct":1,"explanation":"Middle-office = traitement transactionnel temps réel (<500ms). Back-office = traitement différé (J+1, batch)."},
  {"id":"q2","question":"Vrai/Faux : Un système actif/actif est toujours plus résilient qu''actif/passif.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : actif/actif apporte complexité, coût et synchronisation inter-site. Ce n''est pas toujours plus résilient."},
  {"id":"q3","question":"Quel est le principal défi des microservices dans le paiement ?","options":["Le coût réseau","La gestion des transactions distribuées et de l''état","L''interface utilisateur","La formation des équipes"],"correct":1,"explanation":"Les transactions financières nécessitent des garanties ACID difficiles à maintenir dans un environnement distribué."},
  {"id":"q4","question":"Qu''est-ce qu''un SPOF ?","options":["Un protocole de sécurité","Un point de défaillance unique","Un type de switch","Un format de message"],"correct":1,"explanation":"SPOF = Single Point Of Failure : composant dont la panne arrête tout le système."},
  {"id":"q5","question":"Objectif de disponibilité typique pour un switch monétique :","options":["99%","99,9%","99,99%","99,999%"],"correct":3,"explanation":"99,999% = 5 minutes d''arrêt par an maximum."},
  {"id":"q6","question":"Qu''est-ce que le pattern circuit breaker ?","options":["Un disjoncteur électrique","Un mécanisme qui coupe les appels vers un service défaillant pour éviter la cascade","Un type de chiffrement","Un protocole de routage"],"correct":1,"explanation":"Le circuit breaker détecte les échecs répétés vers un service et coupe les appels pendant un délai, évitant la propagation de la panne."},
  {"id":"q7","question":"Que signifie RPO et RTO dans un PRA ?","options":["Protocoles réseau","RPO = perte de données acceptable, RTO = temps de reprise","RPO = temps de réponse, RTO = temps de transfert","Indicateurs de performance"],"correct":1,"explanation":"RPO (Recovery Point Objective) = volume de données qu''on accepte de perdre. RTO (Recovery Time Objective) = temps maximum pour restaurer le service."},
  {"id":"q8","question":"Le pattern CQRS dans un système de paiement sépare :","options":["Le front et le back","Les lectures des écritures","Les données chiffrées des données en clair","Les transactions des remboursements"],"correct":1,"explanation":"CQRS (Command Query Responsibility Segregation) sépare le modèle d''écriture (transactions) du modèle de lecture (reporting, requêtes) pour optimiser les deux."},
  {"id":"q9","question":"Quel est le rôle d''un message broker (MQ) dans l''architecture monétique ?","options":["Chiffrer les messages","Découpler les composants et garantir la livraison asynchrone des messages","Authentifier les utilisateurs","Stocker les transactions"],"correct":1,"explanation":"Le message broker (IBM MQ, RabbitMQ, Kafka) découple les producteurs des consommateurs, garantit la livraison et absorbe les pics de charge."},
  {"id":"q10","question":"Le scaling horizontal dans un système de paiement consiste à :","options":["Augmenter la RAM du serveur","Ajouter des instances supplémentaires derrière un load balancer","Migrer vers un serveur plus puissant","Compresser les données"],"correct":1,"explanation":"Scaling horizontal = ajouter des nœuds (instances) identiques derrière un load balancer, contrairement au scaling vertical (plus de ressources sur un seul serveur)."}
]''::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 3.2 – Switch
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-3.2-switch', 'mod-3.2-switch', 'Quiz – Switch monétique & routage',
'[
  {"id":"q1","question":"Quelle est la différence entre un switch et un schéma ?","options":["Synonymes","Switch = technique, Schéma = gouvernance + routage global","Switch = routage, Schéma = chiffrement","Aucune"],"correct":1,"explanation":"Switch = équipement technique (routeur). Schéma = entité de gouvernance (Visa, MC) + routage global."},
  {"id":"q2","question":"Vrai/Faux : Le switch stocke les données de carte pour accélérer le routage.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : le switch ne stocke pas les données de carte (sauf logs temporaires pour traçabilité)."},
  {"id":"q3","question":"Qu''est-ce qu''un message orphelin ?","options":["Message sans en-tête","Message dont la transaction d''origine n''est pas retrouvée","Message chiffré","Message en erreur"],"correct":1,"explanation":"Message orphelin = réponse arrivée après timeout, la requête d''origine n''est plus en mémoire."},
  {"id":"q4","question":"Le code réponse 91 signifie :","options":["Succès","Format error","Émetteur indisponible","PIN incorrect"],"correct":2,"explanation":"Code 91 = émetteur non disponible (timeout ou panne)."},
  {"id":"q5","question":"Le routage BIN utilise les premiers chiffres du :","options":["CVV","PIN","PAN","Montant"],"correct":2,"explanation":"BIN = 6 à 8 premiers chiffres du PAN, identifiant l''émetteur et le schéma."},
  {"id":"q6","question":"Le STAN (System Trace Audit Number) sert à :","options":["Chiffrer la transaction","Identifier de manière unique une transaction dans le switch","Stocker le montant","Authentifier le terminal"],"correct":1,"explanation":"Le STAN (DE 11) est un numéro séquentiel unique attribué par l''acquéreur pour tracer chaque transaction dans les systèmes."},
  {"id":"q7","question":"Qu''est-ce que le stand-in processing ?","options":["Un mode de test","Le switch prend la décision d''autorisation quand l''émetteur est indisponible","Un protocole de sécurité","Le backup d''un terminal"],"correct":1,"explanation":"Stand-in = le switch (ou le schéma) approuve/refuse la transaction en l''absence de l''émetteur, selon des paramètres prédéfinis."},
  {"id":"q8","question":"Le timeout standard pour une autorisation online est de :","options":["1 seconde","5 secondes","30 secondes","2 minutes"],"correct":2,"explanation":"Le timeout standard est de 30 secondes pour recevoir la réponse de l''émetteur, après quoi le switch peut faire un stand-in ou retourner un code 91."},
  {"id":"q9","question":"Le MAC (Message Authentication Code) dans ISO 8583 se trouve dans :","options":["DE 52","DE 55","DE 64 / DE 128","DE 39"],"correct":2,"explanation":"DE 64 (bitmap primaire) ou DE 128 (bitmap secondaire) transportent le MAC assurant l''intégrité du message ISO 8583."},
  {"id":"q10","question":"Qu''est-ce que la reconciliation en fin de journée ?","options":["Le nettoyage des logs","La vérification que toutes les transactions sont cohérentes entre switch, acquéreur et émetteur","La mise à jour des taux de change","Le redémarrage des serveurs"],"correct":1,"explanation":"La réconciliation compare les totaux de transactions (nombre, montants) entre les différents acteurs pour détecter les écarts."}
]''::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 3.3 – HSM
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-3.3-hsm', 'mod-3.3-hsm', 'Quiz – HSM & Cryptographie matérielle',
'[
  {"id":"q1","question":"Quelle est la différence entre LMK et TMK ?","options":["Synonymes","LMK = clé maître du HSM, TMK = clé maître des terminaux","LMK = clé de transport, TMK = clé locale","LMK = temporaire, TMK = permanente"],"correct":1,"explanation":"LMK = Local Master Key (clé racine du HSM). TMK = Terminal Master Key (clé maître d''un parc de TPE)."},
  {"id":"q2","question":"Vrai/Faux : Un HSM FIPS 140-2 niveau 3 résiste aux attaques par canaux auxiliaires.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : le niveau 3 ne couvre pas les side-channel attacks. Le niveau 4 les adresse partiellement."},
  {"id":"q3","question":"À quoi sert la commande GG d''un HSM Thales ?","options":["Générer une clé","Exporter une clé chiffrée sous LMK","Vérifier un PIN","Générer un ARQC"],"correct":1,"explanation":"GG = exporter une clé, chiffrée sous la LMK, pour transfert sécurisé."},
  {"id":"q4","question":"Combien de transactions le DUKPT supporte-t-il avant re-injection ?","options":["1 000","100 000","~2 millions","Illimité"],"correct":2,"explanation":"Compteur DUKPT = 21 bits = 2^21 ≈ 2 097 152 transactions."},
  {"id":"q5","question":"Citez 3 types de clés dans un HSM :","options":["PVK, CVK, BDK","HTTP, FTP, SSH","AES, DES, RSA","GET, POST, PUT"],"correct":0,"explanation":"PVK (PIN Verification Key), CVK (Card Verification Key), BDK (Base Derivation Key) sont des clés stockées dans le HSM."},
  {"id":"q6","question":"La cérémonie de clés (key ceremony) sert à :","options":["Tester le HSM","Charger la LMK dans le HSM de manière sécurisée avec des custodians","Supprimer les clés expirées","Configurer le réseau"],"correct":1,"explanation":"La cérémonie de clés est un processus formalisé où plusieurs custodians (porteurs de composants) chargent la LMK dans le HSM en salle sécurisée."},
  {"id":"q7","question":"Qu''est-ce que la ZPK (Zone PIN Key) ?","options":["Une clé de chiffrement de fichier","La clé de chiffrement du PIN block échangée entre deux nœuds","Un identifiant de zone géographique","Une clé de signature"],"correct":1,"explanation":"La ZPK chiffre le PIN block lors du transit entre deux nœuds (acquéreur ↔ switch, switch ↔ émetteur). Changée à chaque session."},
  {"id":"q8","question":"FIPS 140-2 niveau 4 apporte quoi de plus que le niveau 3 ?","options":["Uniquement plus de vitesse","Protection contre les attaques environnementales (température, tension, etc.)","Support de plus d''algorithmes","Compatibilité réseau"],"correct":1,"explanation":"Niveau 4 ajoute la détection d''attaques environnementales (glitching, température extrême) avec zéroïsation immédiate des clés."},
  {"id":"q9","question":"Le key wrapping consiste à :","options":["Détruire une clé","Chiffrer une clé avec une autre clé (KEK) pour le transport sécurisé","Diviser une clé en composants","Générer une nouvelle clé"],"correct":1,"explanation":"Le key wrapping chiffre une clé (ex: ZPK) sous une KEK (Key Encryption Key) pour la transporter en toute sécurité entre HSMs."},
  {"id":"q10","question":"Un HSM peut-il être cloné ?","options":["Oui, facilement","Oui, via sauvegarde chiffrée de la LMK sur un HSM jumelé","Non, jamais","Uniquement par le fabricant"],"correct":1,"explanation":"Un HSM peut être répliqué via un mécanisme de sauvegarde/restauration de la LMK, mais uniquement sur un HSM du même type, autorisé par la cérémonie de clés."}
]''::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 3.4 – Messagerie
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-3.4-messaging', 'mod-3.4-messaging', 'Quiz – ISO 8583 & ISO 20022',
'[
  {"id":"q1","question":"Quelle est la signification de pacs.008 ?","options":["Prélèvement","Relevé de compte","Virement client interbancaire","Notification"],"correct":2,"explanation":"pacs.008 = FI To FI Customer Credit Transfer = virement interbancaire."},
  {"id":"q2","question":"Vrai/Faux : ISO 20022 impose le format XML.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : JSON est également accepté depuis 2025."},
  {"id":"q3","question":"Quel message ISO 20022 utilise-t-on pour un relevé de compte ?","options":["pain.001","pacs.008","camt.053","pacs.003"],"correct":2,"explanation":"camt.053 = Bank To Customer Statement (relevé de compte)."},
  {"id":"q4","question":"Quelle est la longueur maximale du DE2 en ISO 8583 ?","options":["10","16","19","32"],"correct":2,"explanation":"DE2 = PAN, longueur maximale 19 chiffres (LLVAR, max 99 mais PAN limité à 19)."},
  {"id":"q5","question":"Comment gérer les champs ISO 20022 sans équivalent ISO 8583 ?","options":["Ignorer","Stocker dans DE48 ou DE62","Créer un nouveau DE","Convertir en binaire"],"correct":1,"explanation":"Les données non mappables sont souvent stockées dans les DE à usage libre (DE48, DE62) ou rejetées."},
  {"id":"q6","question":"Que signifie pain.001 ?","options":["Un message de douleur","Payment Initiation – Customer Credit Transfer Initiation","Payment Authorization","Payment Information"],"correct":1,"explanation":"pain.001 = Payment Initiation, initié par le client (entreprise) vers sa banque pour déclencher un virement."},
  {"id":"q7","question":"SWIFT MX est basé sur :","options":["ISO 8583","ISO 20022","Protocole propriétaire","JSON-RPC"],"correct":1,"explanation":"SWIFT MX est la nouvelle norme de messagerie SWIFT basée sur ISO 20022, remplaçant progressivement les messages MT (FIN)."},
  {"id":"q8","question":"La migration SWIFT MT → MX est :","options":["Terminée depuis 2020","En cours avec une coexistence MT/MX","Annulée","Prévue pour 2030"],"correct":1,"explanation":"La migration est en cours, avec une période de coexistence où les banques peuvent envoyer en MT et recevoir en MX (et vice versa) via la translation."},
  {"id":"q9","question":"Quel est l''avantage principal d''ISO 20022 sur ISO 8583 pour les paiements ?","options":["Plus rapide","Des données plus riches et structurées (remittance info, structured addresses)","Moins coûteux","Plus simple"],"correct":1,"explanation":"ISO 20022 permet des données beaucoup plus riches : adresses structurées, informations de remise détaillées, références end-to-end."},
  {"id":"q10","question":"Le SEPA utilise quels messages ISO 20022 ?","options":["pain.001 et pain.008","pacs.008 et pacs.004","Tous les messages ISO 20022","pain.001/002/008 et pacs.002/003/004/008"],"correct":3,"explanation":"Le SEPA utilise un sous-ensemble d''ISO 20022 : pain.001 (virement initiation), pain.008 (prélèvement initiation), pacs.008 (interbancaire), etc."}
]''::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 3.5 – Tokenisation/P2PE
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-3.5-token', 'mod-3.5-tokenisation', 'Quiz – Tokenisation & P2PE',
'[
  {"id":"q1","question":"Vrai/Faux : Un jeton EMV peut être utilisé chez n''importe quel commerçant.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : le jeton est limité à un domaine (un commerçant, un wallet, un device)."},
  {"id":"q2","question":"Que signifie PAR ?","options":["Payment Authentication Request","Payment Account Reference","Personal Access Right","PIN Authentication Response"],"correct":1,"explanation":"PAR = Payment Account Reference : identifiant de 29 caractères liant le token au PAN."},
  {"id":"q3","question":"Quelle est la principale différence entre P2PE et E2EE ?","options":["Le protocole","P2PE est validé PCI, E2EE ne l''est pas","Le format des données","La vitesse"],"correct":1,"explanation":"P2PE = solution validée PCI SSC, auditée. E2EE = chiffrement maison, non validé."},
  {"id":"q4","question":"Qui attribue les TSP Codes ?","options":["Visa","PCI SSC","EMVCo","SWIFT"],"correct":2,"explanation":"EMVCo gère le programme d''enregistrement des Token Service Providers."},
  {"id":"q5","question":"Avec P2PE, quels champs ISO 8583 sont chiffrés ?","options":["Tous","DE2, DE35, DE45, DE52","Uniquement DE52","Aucun"],"correct":1,"explanation":"DE2 (PAN), DE35 (Track 2), DE45 (Track 1), DE52 (PIN block) sont chiffrés. Le reste est en clair pour le routage."},
  {"id":"q6","question":"La détokenisation est réalisée par :","options":["Le commerçant","Le Token Service Provider (TSP)","Le porteur","Le terminal"],"correct":1,"explanation":"Seul le TSP (Token Vault) peut convertir un token en PAN réel. Le commerçant ne voit jamais le PAN."},
  {"id":"q7","question":"Le format préservant (FPE) dans la tokenisation signifie :","options":["Le token est chiffré","Le token a le même format que le PAN (longueur, passes Luhn)","Le token est identique au PAN","Le format est propriétaire"],"correct":1,"explanation":"FPE (Format Preserving Encryption/Tokenisation) génère un token qui ressemble à un PAN valide (même longueur, passe Luhn) pour compatibilité avec les systèmes legacy."},
  {"id":"q8","question":"L''avantage principal de P2PE pour le commerçant est :","options":["Des transactions plus rapides","Une réduction massive du périmètre PCI (SAQ P2PE)","Un meilleur taux d''autorisation","Des frais réduits"],"correct":1,"explanation":"P2PE réduit drastiquement le périmètre PCI car les données sont chiffrées dès le terminal, le commerçant ne les voit jamais en clair."},
  {"id":"q9","question":"Quel est le rôle du Token Vault ?","options":["Stocker les mots de passe","Stocker la correspondance bidirectionnelle token ↔ PAN","Générer les clés HSM","Authentifier les utilisateurs"],"correct":1,"explanation":"Le Token Vault est la base sécurisée qui stocke le mapping token → PAN et permet la tokenisation/détokenisation."},
  {"id":"q10","question":"Apple Pay et Google Pay utilisent quel type de tokenisation ?","options":["Tokenisation acquéreur","Tokenisation commerçant","Tokenisation de réseau (EMV Token)","Tokenisation statique"],"correct":2,"explanation":"Les wallets mobiles utilisent la tokenisation de réseau (EMV Token) : le schéma (Visa/MC) gère le TSP, le token remplace le PAN dans le SE/HCE."}
]''::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXERCISES (unchanged)
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
