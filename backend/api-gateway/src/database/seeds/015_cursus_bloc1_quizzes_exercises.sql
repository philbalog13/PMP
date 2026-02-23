-- Quizzes and exercises for BLOC 1 — Expanded (10 questions per quiz)

-- =============================================================================
-- QUIZZES (one per module + final evaluation)
-- =============================================================================

-- Quiz Module 1.1 – Principes du paiement
INSERT INTO learning.cursus_quizzes (id, cursus_id, module_id, title, pass_percentage, time_limit_minutes, is_final_evaluation)
VALUES ('quiz-1.1', 'bloc-1-fondamentaux-paiements', 'mod-1.1-principes', 'Quiz – Principes du paiement', 80, 15, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-1.1.1', 'quiz-1.1', 'Quelle est la principale source de revenus de l''émetteur sur une transaction ?',
 '["La location du TPE","L''interchange","Les frais de dossier du commerçant","La vente des données"]'::jsonb,
 1, 'L''interchange est la commission payée par l''acquéreur à l''émetteur pour chaque transaction.', 1),
('qq-1.1.2', 'quiz-1.1', 'À quel moment l''acquéreur est-il certain d''être payé par l''émetteur ?',
 '["Dès l''autorisation","À la fin du clearing","Lors du règlement interbancaire","Jamais"]'::jsonb,
 2, 'C''est lors du règlement (settlement) que les fonds sont effectivement transférés.', 2),
('qq-1.1.3', 'quiz-1.1', 'Le schéma Visa garantit le paiement au commerçant en cas de faillite de l''émetteur.',
 '["Vrai","Faux"]'::jsonb,
 1, 'Faux : le risque de contrepartie reste entre banques, Visa ne se porte pas garant.', 3),
('qq-1.1.4', 'quiz-1.1', 'Quel acteur transmet la demande d''autorisation au réseau du schéma ?',
 '["Le porteur","Le commerçant","L''acquéreur","Le processeur émetteur"]'::jsonb,
 2, 'L''acquéreur (ou son processeur) transmet la demande d''autorisation au réseau (Visa, MC).', 4),
('qq-1.1.5', 'quiz-1.1', 'Qu''est-ce que le clearing en monétique ?',
 '["La vérification du code PIN","L''échange des fichiers de transactions entre banques","L''émission de la carte","La destruction des données PAN"]'::jsonb,
 1, 'Le clearing est l''échange en batch (J+1) des fichiers de transactions entre acquéreur et émetteur pour préparer le règlement.', 5),
('qq-1.1.6', 'quiz-1.1', 'Quelle différence existe entre autorisation et capture ?',
 '["Aucune","L''autorisation bloque les fonds, la capture déclenche le débit réel","L''autorisation est offline, la capture est online","La capture précède l''autorisation"]'::jsonb,
 1, 'L''autorisation réserve le montant sur le compte du porteur, la capture confirme la transaction pour le règlement.', 6),
('qq-1.1.7', 'quiz-1.1', 'Quel est le rôle d''un PSP (Payment Service Provider) ?',
 '["Émettre des cartes bancaires","Agréger les flux de paiement pour les commerçants","Gérer les distributeurs de billets","Fabriquer les terminaux de paiement"]'::jsonb,
 1, 'Un PSP agrège les flux de paiement, fournit une interface unifiée aux commerçants et route vers les acquéreurs.', 7),
('qq-1.1.8', 'quiz-1.1', 'Qu''est-ce qu''un chargeback ?',
 '["Une fraude commise par le commerçant","Une contestation du porteur qui inverse la transaction","Un bonus accordé par la banque","Un type de carte prépayée"]'::jsonb,
 1, 'Le chargeback est le mécanisme de contestation par lequel le porteur demande le remboursement d''une transaction qu''il conteste.', 8),
('qq-1.1.9', 'quiz-1.1', 'Le quatre-coins (four-party scheme) implique quels acteurs ?',
 '["Porteur, Émetteur, Acquéreur, Commerçant","Porteur, Banque, Visa, État","Commerçant, PSP, Processeur, Schéma","Émetteur, Acquéreur, Régulateur, Assureur"]'::jsonb,
 0, 'Le modèle 4 coins : le porteur (et son émetteur) d''un côté, le commerçant (et son acquéreur) de l''autre, reliés par le schéma.', 9),
('qq-1.1.10', 'quiz-1.1', 'L''interchange en Europe est plafonné à combien pour les cartes de débit (règlement UE 2015/751) ?',
 '["0,1%","0,2%","0,3%","1%"]'::jsonb,
 1, 'Le règlement européen plafonne l''interchange à 0,2% pour les cartes de débit et 0,3% pour les cartes de crédit.', 10)
ON CONFLICT (id) DO NOTHING;

-- Quiz Module 1.2 – Cybersécurité / PCI DSS
INSERT INTO learning.cursus_quizzes (id, cursus_id, module_id, title, pass_percentage, time_limit_minutes, is_final_evaluation)
VALUES ('quiz-1.2', 'bloc-1-fondamentaux-paiements', 'mod-1.2-cybersecurite', 'Quiz – PCI DSS', 80, 15, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-1.2.1', 'quiz-1.2', 'Un commerçant utilise un PSP hébergeant le formulaire de paiement. Quel SAQ doit-il remplir ?',
 '["SAQ A","SAQ A-EP","SAQ D","Aucun"]'::jsonb,
 0, 'SAQ A pour les sites redirigeant vers un prestataire conforme PCI.', 1),
('qq-1.2.2', 'quiz-1.2', 'Combien d''exigences principales comporte le standard PCI DSS v4.0 ?',
 '["6","10","12","15"]'::jsonb,
 2, 'PCI DSS comporte 12 exigences principales regroupées en 6 objectifs de contrôle.', 2),
('qq-1.2.3', 'quiz-1.2', 'Le CVV peut-il être stocké après autorisation selon PCI DSS ?',
 '["Oui, chiffré","Oui, hashé","Non, jamais","Oui, pendant 90 jours"]'::jsonb,
 2, 'Le CVV/CVC ne doit JAMAIS être stocké après autorisation, même chiffré. C''est une exigence absolue de PCI DSS.', 3),
('qq-1.2.4', 'quiz-1.2', 'Quel niveau PCI DSS s''applique à un commerçant traitant plus de 6 millions de transactions Visa/an ?',
 '["Niveau 1","Niveau 2","Niveau 3","Niveau 4"]'::jsonb,
 0, 'Niveau 1 : plus de 6 millions de transactions par an, audit on-site obligatoire par un QSA.', 4),
('qq-1.2.5', 'quiz-1.2', 'Qu''est-ce qu''un QSA ?',
 '["Un logiciel antivirus","Un auditeur certifié PCI","Un protocole de chiffrement","Un type de pare-feu"]'::jsonb,
 1, 'QSA = Qualified Security Assessor, un auditeur certifié par le PCI SSC pour évaluer la conformité PCI DSS.', 5),
('qq-1.2.6', 'quiz-1.2', 'L''exigence PCI DSS 3 concerne :',
 '["Le pare-feu","Les antivirus","La protection des données de carte stockées","La gestion des accès"]'::jsonb,
 2, 'L''exigence 3 traite de la protection des données de carte stockées (chiffrement, masquage, troncature).', 6),
('qq-1.2.7', 'quiz-1.2', 'Qu''est-ce que la troncature du PAN ?',
 '["Chiffrer le PAN en AES","Afficher uniquement les 4 derniers chiffres (ex: **** **** **** 1234)","Supprimer le PAN de la base","Hasher le PAN en SHA-256"]'::jsonb,
 1, 'La troncature consiste à masquer une partie du PAN, typiquement ne montrer que les 4 derniers ou les 6 premiers chiffres.', 7),
('qq-1.2.8', 'quiz-1.2', 'PCI DSS exige que les mots de passe aient au minimum combien de caractères (v4.0) ?',
 '["6","8","12","16"]'::jsonb,
 2, 'PCI DSS v4.0 exige un minimum de 12 caractères pour les mots de passe (contre 7 dans les versions précédentes).', 8),
('qq-1.2.9', 'quiz-1.2', 'Quelle est la fréquence minimale des scans de vulnérabilité externe requis par PCI DSS ?',
 '["Mensuelle","Trimestrielle","Semestrielle","Annuelle"]'::jsonb,
 1, 'PCI DSS exige des scans de vulnérabilité externe trimestriels par un ASV (Approved Scanning Vendor).', 9),
('qq-1.2.10', 'quiz-1.2', 'Le périmètre PCI (CDE) inclut :',
 '["Uniquement le serveur de base de données","Tous les systèmes qui stockent, traitent ou transmettent des données de carte","Le site web entier","Uniquement le terminal de paiement"]'::jsonb,
 1, 'Le CDE (Cardholder Data Environment) inclut tout composant qui stocke, traite ou transmet des données de carte, plus les systèmes connectés.', 10)
ON CONFLICT (id) DO NOTHING;

-- Quiz Module 1.3 – CP / CNP (EMV & 3DS)
INSERT INTO learning.cursus_quizzes (id, cursus_id, module_id, title, pass_percentage, time_limit_minutes, is_final_evaluation)
VALUES ('quiz-1.3', 'bloc-1-fondamentaux-paiements', 'mod-1.3-cp-cnp', 'Quiz – EMV / 3DS', 80, 15, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-1.3.1', 'quiz-1.3', 'Dans EMV, que signifie CDA ?',
 '["Card Dynamic Authentication","Combined Data Authentication","Chip Data Analysis","Cardholder Data Authentication"]'::jsonb,
 1, 'CDA = Combined Data Authentication : authentification dynamique de la carte + signature du terminal.', 1),
('qq-1.3.2', 'quiz-1.3', 'Quelle est la différence fondamentale entre un paiement CP et CNP ?',
 '["CP est plus cher","CP implique la présence physique de la carte, CNP est à distance","CNP est plus sécurisé","CP ne nécessite pas d''autorisation"]'::jsonb,
 1, 'CP (Card Present) = carte physiquement présente (TPE, DAB). CNP (Card Not Present) = paiement à distance (e-commerce, MOTO).', 2),
('qq-1.3.3', 'quiz-1.3', 'Le liability shift en 3DS signifie que :',
 '["Le commerçant est toujours responsable","L''émetteur supporte la fraude si l''authentification a réussi","Le schéma rembourse la fraude","Le porteur ne peut jamais contester"]'::jsonb,
 1, 'Avec une authentification 3DS réussie (ECI=05), la responsabilité de la fraude passe du commerçant à l''émetteur.', 3),
('qq-1.3.4', 'quiz-1.3', 'Que signifie ECI 07 pour Visa ?',
 '["Authentification complète","Tentative d''authentification (ou non inscrit)","Pas de 3DS","Erreur technique"]'::jsonb,
 1, 'ECI 07 (Visa) = authentification tentée mais non réalisée, ou porteur non inscrit. Liability shift partiel.', 4),
('qq-1.3.5', 'quiz-1.3', 'Quel est le rôle de l''ACS dans le flux 3DS2 ?',
 '["Router les transactions","Authentifier le porteur côté émetteur","Chiffrer le PAN","Valider le CVV"]'::jsonb,
 1, 'L''ACS (Access Control Server) est le serveur côté émetteur qui évalue le risque et gère l''authentification du porteur.', 5),
('qq-1.3.6', 'quiz-1.3', 'Qu''est-ce que le mode frictionless en 3DS2 ?',
 '["Le porteur entre son PIN","L''ACS authentifie sans interaction du porteur","Le paiement est refusé","Le commerçant est vérifié"]'::jsonb,
 1, 'Frictionless = l''ACS évalue le risque et authentifie le porteur de façon transparente, sans challenge (OTP, biométrie).', 6),
('qq-1.3.7', 'quiz-1.3', 'En EMV, quel cryptogramme indique un refus offline par la carte ?',
 '["TC","ARQC","AAC","ARPC"]'::jsonb,
 2, 'AAC = Application Authentication Cryptogram = la carte refuse la transaction offline.', 7),
('qq-1.3.8', 'quiz-1.3', 'Que contient le CAVV généré lors d''une authentification 3DS ?',
 '["Le PAN chiffré","Une preuve cryptographique d''authentification","Le code CVV","Le PIN du porteur"]'::jsonb,
 1, 'Le CAVV (Cardholder Authentication Verification Value) est une preuve cryptographique que l''authentification 3DS a eu lieu.', 8),
('qq-1.3.9', 'quiz-1.3', 'Quel champ ISO 8583 transporte les données EMV (tags TLV) ?',
 '["DE 2","DE 39","DE 52","DE 55"]'::jsonb,
 3, 'DE 55 (ICC System Related Data) transporte les données EMV au format TLV dans le message ISO 8583.', 9),
('qq-1.3.10', 'quiz-1.3', 'Le Directory Server en 3DS2 sert à :',
 '["Stocker les cartes","Router les AReq vers l''ACS de l''émetteur concerné","Chiffrer les transactions","Générer les OTP"]'::jsonb,
 1, 'Le Directory Server route les Authentication Request (AReq) vers l''ACS de l''émetteur correspondant au BIN de la carte.', 10)
ON CONFLICT (id) DO NOTHING;

-- Quiz Module 1.4 – Émetteur / Acquéreur
INSERT INTO learning.cursus_quizzes (id, cursus_id, module_id, title, pass_percentage, time_limit_minutes, is_final_evaluation)
VALUES ('quiz-1.4', 'bloc-1-fondamentaux-paiements', 'mod-1.4-emetteur-acquereur', 'Quiz – Émetteur/Acquéreur', 80, 15, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-1.4.1', 'quiz-1.4', 'Qu''appelle-t-on la personnalisation dans le cycle de vie d''une carte ?',
 '["L''activation par le client","L''écriture des données dans la puce et sur la bande","La première transaction","L''opposition de la carte"]'::jsonb,
 1, 'La personnalisation = fabrication + gravure PAN + encodage puce (clés, certificats).', 1),
('qq-1.4.2', 'quiz-1.4', 'Quel est le rôle de l''émetteur (issuer) ?',
 '["Fournir des terminaux de paiement","Émettre les cartes et gérer les comptes des porteurs","Agréger les paiements des commerçants","Gérer le réseau Visa/MC"]'::jsonb,
 1, 'L''émetteur crée les cartes, gère les comptes porteurs, autorise ou refuse les transactions et supporte le risque de crédit.', 2),
('qq-1.4.3', 'quiz-1.4', 'Quel fichier l''acquéreur envoie-t-il au schéma pour le clearing ?',
 '["Un fichier PDF","Un fichier de transactions au format TC33/IPM","Un email récapitulatif","Un fichier Excel"]'::jsonb,
 1, 'L''acquéreur envoie des fichiers de clearing standardisés (TC33 pour Visa, IPM pour Mastercard).', 3),
('qq-1.4.4', 'quiz-1.4', 'L''opposition d''une carte signifie :',
 '["La carte est activée","La carte est bloquée suite à perte/vol/fraude","La carte est renouvelée","La carte change de BIN"]'::jsonb,
 1, 'L''opposition = blocage de la carte par l''émetteur suite à une déclaration de perte, vol ou fraude par le porteur.', 4),
('qq-1.4.5', 'quiz-1.4', 'Qu''est-ce qu''un BIN (Bank Identification Number) ?',
 '["Le code secret de la carte","Les 6-8 premiers chiffres du PAN identifiant l''émetteur","Le numéro de compte bancaire","Le code de la banque centrale"]'::jsonb,
 1, 'Le BIN (ou IIN) = les 6 à 8 premiers chiffres du PAN, qui identifient l''émetteur et le schéma.', 5),
('qq-1.4.6', 'quiz-1.4', 'L''acquéreur supporte quel type principal de risque ?',
 '["Le risque de crédit du porteur","Le risque de fraude du commerçant (risque acquéreur)","Le risque de change","Le risque systémique"]'::jsonb,
 1, 'L''acquéreur supporte le risque que le commerçant soit frauduleux ou fasse faillite après les transactions.', 6),
('qq-1.4.7', 'quiz-1.4', 'Combien de temps dure généralement la validité d''une carte bancaire ?',
 '["1 an","2-3 ans","5 ans","10 ans"]'::jsonb,
 1, 'La validité standard est de 2 à 3 ans, après quoi la carte doit être renouvelée avec de nouvelles clés.', 7),
('qq-1.4.8', 'quiz-1.4', 'Que signifie ARPC dans le contexte émetteur ?',
 '["Application Request Processing Code","Authorization Response Cryptogram","Automated Response Protocol Check","Authentication Result Processing Center"]'::jsonb,
 1, 'ARPC = Authorization Response Cryptogram, la réponse cryptographique de l''émetteur prouvant qu''il a bien autorisé la transaction.', 8),
('qq-1.4.9', 'quiz-1.4', 'Quel document contractuel lie le commerçant à l''acquéreur ?',
 '["Le contrat d''émission","Le contrat d''acceptation (merchant agreement)","Le règlement PCI","La licence de schéma"]'::jsonb,
 1, 'Le contrat d''acceptation (ou merchant agreement) définit les conditions, commissions et obligations du commerçant envers l''acquéreur.', 9),
('qq-1.4.10', 'quiz-1.4', 'Qu''est-ce que le re-issuance ?',
 '["Changer de banque","Renouveler la carte avec un nouveau PAN et de nouvelles clés","Augmenter le plafond","Changer le code PIN"]'::jsonb,
 1, 'Le re-issuance = renouvellement de la carte (nouveau PAN possible, nouvelles clés, nouvelle date d''expiration).', 10)
ON CONFLICT (id) DO NOTHING;

-- Quiz Module 1.5 – Cryptographie
INSERT INTO learning.cursus_quizzes (id, cursus_id, module_id, title, pass_percentage, time_limit_minutes, is_final_evaluation)
VALUES ('quiz-1.5', 'bloc-1-fondamentaux-paiements', 'mod-1.5-crypto', 'Quiz – Cryptographie', 80, 15, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-1.5.1', 'quiz-1.5', 'Quelle est la longueur de bloc de 3DES ?',
 '["56 bits","64 bits","128 bits","168 bits"]'::jsonb,
 1, '3DES a un bloc de 64 bits (même si la clé fait 112 bits effectifs).', 1),
('qq-1.5.2', 'quiz-1.5', 'Qu''est-ce que l''algorithme de Luhn ?',
 '["Un algorithme de chiffrement","Un algorithme de vérification de la validité d''un PAN","Un protocole réseau","Un algorithme de hachage"]'::jsonb,
 1, 'L''algorithme de Luhn (mod 10) vérifie la validité mathématique d''un numéro de carte bancaire.', 2),
('qq-1.5.3', 'quiz-1.5', 'Le PIN block ISO 9564 format 0 est calculé comment ?',
 '["PIN en clair concaténé au PAN","XOR entre le champ PIN et le champ PAN","Hashage SHA-256 du PIN","Chiffrement AES du PIN seul"]'::jsonb,
 1, 'Format ISO-0 : XOR entre le champ PIN (04 + PIN + padding FF) et le champ PAN (00 + 12 chiffres du PAN).', 3),
('qq-1.5.4', 'quiz-1.5', 'Qu''est-ce que DUKPT ?',
 '["Un protocole d''échange de clés","Un système dérivant une clé unique par transaction à partir d''une BDK","Un algorithme de hachage","Un format de message"]'::jsonb,
 1, 'DUKPT (Derived Unique Key Per Transaction) dérive une clé unique pour chaque transaction à partir d''une BDK et d''un KSN.', 4),
('qq-1.5.5', 'quiz-1.5', 'AES-256 utilise une clé de combien de bits ?',
 '["128","192","256","512"]'::jsonb,
 2, 'AES-256 utilise une clé de 256 bits, avec un bloc de 128 bits.', 5),
('qq-1.5.6', 'quiz-1.5', 'Pourquoi RSA est-il utilisé en EMV ?',
 '["Pour chiffrer le PIN","Pour l''authentification offline de la carte (SDA/DDA/CDA)","Pour le hachage des transactions","Pour la compression des données"]'::jsonb,
 1, 'RSA en EMV sert à l''authentification offline : la carte prouve son authenticité via des certificats signés par la CA du schéma.', 6),
('qq-1.5.7', 'quiz-1.5', 'Qu''est-ce qu''un MAC en cryptographie ?',
 '["Un identifiant matériel","Un code d''authentification de message garantissant l''intégrité","Un type de chiffrement asymétrique","Un protocole réseau"]'::jsonb,
 1, 'MAC (Message Authentication Code) = code calculé avec une clé secrète garantissant l''intégrité et l''authenticité du message.', 7),
('qq-1.5.8', 'quiz-1.5', 'Quelle est la différence entre chiffrement symétrique et asymétrique ?',
 '["Aucune","Symétrique = même clé pour chiffrer/déchiffrer, Asymétrique = paire clé publique/privée","Symétrique est plus lent","Asymétrique utilise des blocs plus petits"]'::jsonb,
 1, 'Symétrique (AES, 3DES) : une seule clé partagée. Asymétrique (RSA, ECC) : paire clé publique (diffusée) / clé privée (secrète).', 8),
('qq-1.5.9', 'quiz-1.5', 'Le KSN dans DUKPT contient :',
 '["Le PIN chiffré","L''identifiant du device + un compteur de transactions","La clé maître","Le numéro de carte"]'::jsonb,
 1, 'KSN (Key Serial Number) = identifiant initial du device (BDK ID + TRSM ID) + compteur incrémenté à chaque transaction.', 9),
('qq-1.5.10', 'quiz-1.5', 'Pourquoi 3DES est-il considéré comme obsolète ?',
 '["Il est trop rapide","Sa taille de bloc de 64 bits le rend vulnérable au birthday attack","Il utilise trop de mémoire","Il n''est pas implémenté en Java"]'::jsonb,
 1, 'Le bloc de 64 bits de 3DES le rend vulnérable aux attaques par anniversaire (Sweet32) après 2^32 blocs, et il est 3x plus lent qu''AES.', 10)
ON CONFLICT (id) DO NOTHING;

-- Quiz Module 1.6 – Schémas
INSERT INTO learning.cursus_quizzes (id, cursus_id, module_id, title, pass_percentage, time_limit_minutes, is_final_evaluation)
VALUES ('quiz-1.6', 'bloc-1-fondamentaux-paiements', 'mod-1.6-schemas', 'Quiz – Schémas', 80, 15, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-1.6.1', 'quiz-1.6', 'Qu''est-ce qu''un schéma fermé ?',
 '["Un schéma limité à une banque","Un schéma où émetteur et acquéreur sont la même entité","Un schéma réservé aux transactions nationales","Un schéma sans frais"]'::jsonb,
 1, 'Schéma fermé = l''émetteur et l''acquéreur sont la même entité (ex. Amex).', 1),
('qq-1.6.2', 'quiz-1.6', 'Quel schéma est un exemple de schéma ouvert (four-party) ?',
 '["American Express","Visa","Diners Club","Discover"]'::jsonb,
 1, 'Visa et Mastercard sont des schémas ouverts : émetteur et acquéreur sont des entités distinctes.', 2),
('qq-1.6.3', 'quiz-1.6', 'Qu''est-ce que le co-badging ?',
 '["Avoir deux cartes","Une carte portant deux marques de schéma (ex: CB + Visa)","Partager un terminal","Utiliser deux PIN"]'::jsonb,
 1, 'Le co-badging permet à une carte de porter deux marques (ex: CB domestique + Visa international) offrant le choix du réseau.', 3),
('qq-1.6.4', 'quiz-1.6', 'Le règlement européen sur l''interchange (IFR) s''applique à :',
 '["Tous les schémas dans le monde","Les schémas four-party en Europe (Visa, MC)","Uniquement les schémas américains","Les schémas three-party uniquement"]'::jsonb,
 1, 'L''IFR s''applique aux schémas quadripartites (four-party) en Europe, plafonnant l''interchange.', 4),
('qq-1.6.5', 'quiz-1.6', 'Quel est le rôle principal d''un schéma de paiement ?',
 '["Émettre des cartes","Définir les règles, standards et infrastructure de routage des transactions","Prêter de l''argent","Fabriquer des terminaux"]'::jsonb,
 1, 'Le schéma définit les règles opérationnelles, les standards techniques, l''arbitrage des litiges et le routage des transactions.', 5),
('qq-1.6.6', 'quiz-1.6', 'Quelle est la différence entre assessment fee et interchange ?',
 '["Synonymes","Assessment = frais du schéma, Interchange = frais acquéreur → émetteur","Assessment = frais émetteur, Interchange = frais schéma","Aucune différence"]'::jsonb,
 1, 'Assessment fee = commission versée au schéma (Visa/MC). Interchange = commission versée par l''acquéreur à l''émetteur.', 6),
('qq-1.6.7', 'quiz-1.6', 'CB (Cartes Bancaires) est un schéma :',
 '["International ouvert","Domestique français","Fermé américain","Européen exclusivement"]'::jsonb,
 1, 'CB est le schéma domestique français, souvent co-badgé avec Visa ou Mastercard pour l''usage international.', 7),
('qq-1.6.8', 'quiz-1.6', 'Qu''est-ce que le cross-border fee ?',
 '["Un frais de change","Un surcoût appliqué quand la transaction traverse les frontières du schéma","Un frais de livraison","Un impôt bancaire"]'::jsonb,
 1, 'Le cross-border fee est appliqué quand l''émetteur et l''acquéreur sont dans des pays/régions différents.', 8),
('qq-1.6.9', 'quiz-1.6', 'Vrai ou Faux : UnionPay est le plus grand schéma mondial par volume de transactions.',
 '["Vrai","Faux"]'::jsonb,
 0, 'Vrai : UnionPay (Chine) dépasse Visa et Mastercard en volume de transactions grâce au marché domestique chinois.', 9),
('qq-1.6.10', 'quiz-1.6', 'Qu''est-ce que la représentation dans un litige de chargeback ?',
 '["Le commerçant conteste le chargeback en fournissant des preuves","Le porteur retire sa plainte","La banque rembourse automatiquement","Le schéma arbitre en faveur de l''acquéreur"]'::jsonb,
 0, 'La représentation (representment) est le droit du commerçant de contester un chargeback en fournissant des preuves (signature, livraison, etc.).', 10)
ON CONFLICT (id) DO NOTHING;

-- Final evaluation – BLOC 1
INSERT INTO learning.cursus_quizzes (id, cursus_id, module_id, title, pass_percentage, time_limit_minutes, is_final_evaluation)
VALUES ('quiz-final-bloc1', 'bloc-1-fondamentaux-paiements', NULL, 'Évaluation finale – BLOC 1', 70, 30, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-f1.1', 'quiz-final-bloc1', 'Lors de quelle phase le compte du porteur est-il débité ?',
 '["Autorisation","Clearing","Règlement","Capture"]'::jsonb,
 2, 'Le débit réel se fait lors du règlement (settlement), pas de l''autorisation.', 1),
('qq-f1.2', 'quiz-final-bloc1', 'Quelle technique remplace le PAN par un jeton sans valeur mathématique ?',
 '["Chiffrement","Tokenisation","Masquage","Hachage"]'::jsonb,
 1, 'La tokenisation remplace le PAN par un jeton inutilisable hors contexte.', 2),
('qq-f1.3', 'quiz-final-bloc1', 'Avec 3DS2, si l''authentification réussit (ECI=05), qui supporte la fraude ?',
 '["Le commerçant","L''acquéreur","L''émetteur","Le schéma"]'::jsonb,
 2, 'Liability shift : avec authentification forte réussie, l''émetteur porte la responsabilité.', 3),
('qq-f1.4', 'quiz-final-bloc1', 'Quel plafond d''interchange s''applique aux cartes de crédit en Europe ?',
 '["0,1%","0,2%","0,3%","0,5%"]'::jsonb,
 2, 'Le règlement européen plafonne l''interchange à 0,3% pour les cartes de crédit consumer.', 4),
('qq-f1.5', 'quiz-final-bloc1', 'Quel algorithme vérifie la validité mathématique d''un numéro de carte ?',
 '["SHA-256","AES","Luhn (mod 10)","RSA"]'::jsonb,
 2, 'L''algorithme de Luhn vérifie le dernier chiffre (check digit) du PAN.', 5),
('qq-f1.6', 'quiz-final-bloc1', 'En PCI DSS, que signifie SAQ ?',
 '["Secure Authentication Query","Self-Assessment Questionnaire","Standard Application Qualification","Security Audit Quality"]'::jsonb,
 1, 'SAQ = Self-Assessment Questionnaire, le formulaire d''auto-évaluation PCI DSS.', 6),
('qq-f1.7', 'quiz-final-bloc1', 'Quel DE ISO 8583 contient le PAN ?',
 '["DE 2","DE 39","DE 52","DE 55"]'::jsonb,
 0, 'DE 2 = Primary Account Number (PAN) au format LLVAR.', 7),
('qq-f1.8', 'quiz-final-bloc1', 'Qu''est-ce que DUKPT apporte par rapport à un chiffrement à clé fixe ?',
 '["Plus de vitesse","Une clé unique par transaction, limitant l''impact d''une compromission","Un meilleur algorithme","Une compatibilité avec tous les terminaux"]'::jsonb,
 1, 'DUKPT dérive une clé unique par transaction : si une clé est compromise, seule cette transaction est impactée.', 8),
('qq-f1.9', 'quiz-final-bloc1', 'Un schéma fermé (three-party) signifie que :',
 '["Trois banques participent","L''émetteur, l''acquéreur et le schéma sont la même entité","Le porteur a trois cartes","Trois autorisations sont requises"]'::jsonb,
 1, 'Dans un schéma fermé (ex: Amex), l''entité est à la fois émetteur, acquéreur et réseau.', 9),
('qq-f1.10', 'quiz-final-bloc1', 'En EMV, le cryptogramme ARQC est envoyé :',
 '["Au porteur","Au commerçant directement","À l''émetteur via le réseau pour autorisation online","Au terminal uniquement"]'::jsonb,
 2, 'L''ARQC (Authorization Request Cryptogram) est calculé par la carte et transmis à l''émetteur via le réseau pour validation online.', 10)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXERCISES (one per module) — unchanged
-- =============================================================================
INSERT INTO learning.cursus_exercises (id, module_id, title, type, description, instructions, hints, estimated_minutes) VALUES
('ex-1.1', 'mod-1.1-principes', 'Mission Cartographie', 'ANALYSE',
 'Identifier les acteurs et calculer les commissions sur des scénarios réels.',
 '["Lire le scénario A : M. Martin achète un livre à 25€ sur Librairie en ligne, carte Visa Premium (Banque Postale), PSP Stripe, acquéreur BNP Paribas, routage Visa Europe.","Identifier émetteur, acquéreur, rôle de Stripe, percepteur de l''interchange.","Calculer le taux de commission effectif sur une transaction de 42€ avec 0,57€ de commission.","Calculer la part interchange vs marge acquéreur sachant interchange plafonné à 0,2%."]'::jsonb,
 '["L''émetteur est la banque du porteur","Stripe est un PSP, pas un acquéreur","Taux = commission / montant × 100","Interchange = montant × 0,002"]'::jsonb,
 60),
('ex-1.2', 'mod-1.2-cybersecurite', 'Lab PCI DSS', 'CAS_ETUDE',
 'Identifier les violations PCI DSS dans des architectures e-commerce et proposer des corrections.',
 '["Analyser le cas d''un artisan utilisant HTTP (pas HTTPS) et stockant PAN + CVV en clair dans MySQL.","Lister toutes les violations PCI DSS.","Déterminer le niveau SAQ requis.","Proposer un plan de remédiation immédiat.","Analyser une architecture Client → Serveur Web (TLS) → Serveur Applicatif → BDD (AES-256) → Processeur (mTLS) et identifier les expositions."]'::jsonb,
 '["Le CVV ne doit JAMAIS être stocké après autorisation","HTTPS (TLS) est obligatoire pour toute transmission de données de carte","Le périmètre PCI inclut tout serveur voyant le PAN"]'::jsonb,
 90),
('ex-1.3', 'mod-1.3-cp-cnp', 'Analyse de trames CP et CNP', 'PRATIQUE',
 'Lire des messages ISO 8583 avec données EMV et simuler un flux 3DS2.',
 '["Analyser un extrait ISO 8583 : Field 22=05 (puce), Field 55 contenant ARQC, compteur, etc.","Identifier le mode d''entrée, la fonction de l''ARQC, importance du compteur.","Simuler un flux 3DS2 : AReq → Directory → ACS → challenge → CAVV.","Exercice liability shift : comparer 3 scénarios (3DS OK, pas de 3DS, 3DS timeout)."]'::jsonb,
 '["Field 22 indique le mode d''entrée (05=puce)","Le compteur empêche les rejeux","ECI=05 implique le liability shift vers l''émetteur"]'::jsonb,
 90),
('ex-1.4', 'mod-1.4-emetteur-acquereur', 'Simulation de cycle complet', 'SIMULATION',
 'Jeu de rôle émetteur/acquéreur/schéma et calculs de commissions avancés.',
 '["Former 3 groupes : Émetteur, Acquéreur, Schéma. Le formateur joue porteur et commerçant.","Simuler les 9 étapes d''une transaction complète (de l''autorisation au règlement).","Calculer les commissions sur un CA mensuel de 50 000€ (interchange 0,25%, schéma 0,04%, marge 0,08%, TPE 25€/mois, passerelle 50€/mois).","Analyser un extrait de contrat acquéreur."]'::jsonb,
 '["Commissions proportionnelles = CA × taux total","Ajouter les abonnements fixes (TPE + passerelle)","TEG = total commissions / CA"]'::jsonb,
 120),
('ex-1.5', 'mod-1.5-crypto', 'Atelier Cryptographie', 'PRATIQUE',
 'Calcul du Luhn, formation de PIN block ISO-0, simulation DUKPT et vérification ARQC.',
 '["Vérifier un PAN avec l''algorithme de Luhn (doubler positions paires, sommer, multiple de 10).","Construire un PIN block ISO-0 : PIN=1234, PAN=4970123456789012. Former champ PIN (04 12 34 FF FF FF FF FF), champ PAN (00 00 00 67 89 01 20 00), XOR les deux.","Simuler DUKPT : observer que chaque KSN incrémenté génère une clé différente.","Vérifier un ARQC avec le simulateur HSM."]'::jsonb,
 '["Luhn : doubler, si ≥10 soustraire 9, sommer, mod 10 = 0","PIN block ISO-0 = XOR(champ PIN, champ PAN)","DUKPT : BDK + KSN → clé unique, chaque incrémentation change la clé"]'::jsonb,
 120),
('ex-1.6', 'mod-1.6-schemas', 'Simulation de litige', 'CAS_ETUDE',
 'Identifier les codes raison de chargeback et simuler un processus complet de contestation.',
 '["Cas : client conteste un achat de chaussures non reçu. Identifier le code raison Visa.","Évaluer si le commerçant peut gagner la représentation avec une preuve de livraison.","Jeu de rôle : porteur déclare fraude 150€, chargeback 10.2, débattre du liability shift.","Analyser une facture de frais de schéma (Assessment, Acquirer Fee, Cross-Border, pénalité PCI)."]'::jsonb,
 '["12.1 = marchandise non reçue","Preuve de livraison signée = argument fort pour la représentation","Liability shift avec 3DS : l''émetteur supporte la fraude"]'::jsonb,
 90)
ON CONFLICT (id) DO NOTHING;
