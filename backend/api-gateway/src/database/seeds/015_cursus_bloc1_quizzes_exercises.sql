-- Quizzes and exercises for BLOC 1

-- =============================================================================
-- QUIZZES (one per module + final evaluation)
-- =============================================================================

-- Quiz Module 1.1
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
 1, 'Faux : le risque de contrepartie reste entre banques, Visa ne se porte pas garant.', 3)
ON CONFLICT (id) DO NOTHING;

-- Quiz Module 1.2
INSERT INTO learning.cursus_quizzes (id, cursus_id, module_id, title, pass_percentage, time_limit_minutes, is_final_evaluation)
VALUES ('quiz-1.2', 'bloc-1-fondamentaux-paiements', 'mod-1.2-cybersecurite', 'Quiz – PCI DSS', 80, 10, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-1.2.1', 'quiz-1.2', 'Un commerçant utilise un PSP hébergeant le formulaire de paiement. Quel SAQ doit-il remplir ?',
 '["SAQ A","SAQ A-EP","SAQ D","Aucun"]'::jsonb,
 0, 'SAQ A pour les sites redirigeant vers un prestataire conforme PCI.', 1)
ON CONFLICT (id) DO NOTHING;

-- Quiz Module 1.3
INSERT INTO learning.cursus_quizzes (id, cursus_id, module_id, title, pass_percentage, time_limit_minutes, is_final_evaluation)
VALUES ('quiz-1.3', 'bloc-1-fondamentaux-paiements', 'mod-1.3-cp-cnp', 'Quiz – EMV / 3DS', 80, 15, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-1.3.1', 'quiz-1.3', 'Dans EMV, que signifie CDA ?',
 '["Card Dynamic Authentication","Combined Data Authentication","Chip Data Analysis","Cardholder Data Authentication"]'::jsonb,
 1, 'CDA = Combined Data Authentication : authentification dynamique de la carte + signature du terminal.', 1)
ON CONFLICT (id) DO NOTHING;

-- Quiz Module 1.4
INSERT INTO learning.cursus_quizzes (id, cursus_id, module_id, title, pass_percentage, time_limit_minutes, is_final_evaluation)
VALUES ('quiz-1.4', 'bloc-1-fondamentaux-paiements', 'mod-1.4-emetteur-acquereur', 'Quiz – Émetteur/Acquéreur', 80, 10, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-1.4.1', 'quiz-1.4', 'Qu''appelle-t-on la personnalisation dans le cycle de vie d''une carte ?',
 '["L''activation par le client","L''écriture des données dans la puce et sur la bande","La première transaction","L''opposition de la carte"]'::jsonb,
 1, 'La personnalisation = fabrication + gravure PAN + encodage puce (clés, certificats).', 1)
ON CONFLICT (id) DO NOTHING;

-- Quiz Module 1.5
INSERT INTO learning.cursus_quizzes (id, cursus_id, module_id, title, pass_percentage, time_limit_minutes, is_final_evaluation)
VALUES ('quiz-1.5', 'bloc-1-fondamentaux-paiements', 'mod-1.5-crypto', 'Quiz – Cryptographie', 80, 15, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-1.5.1', 'quiz-1.5', 'Quelle est la longueur de bloc de 3DES ?',
 '["56 bits","64 bits","128 bits","168 bits"]'::jsonb,
 1, '3DES a un bloc de 64 bits (même si la clé fait 112 bits effectifs).', 1)
ON CONFLICT (id) DO NOTHING;

-- Quiz Module 1.6
INSERT INTO learning.cursus_quizzes (id, cursus_id, module_id, title, pass_percentage, time_limit_minutes, is_final_evaluation)
VALUES ('quiz-1.6', 'bloc-1-fondamentaux-paiements', 'mod-1.6-schemas', 'Quiz – Schémas', 80, 10, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-1.6.1', 'quiz-1.6', 'Qu''est-ce qu''un schéma fermé ?',
 '["Un schéma limité à une banque","Un schéma où émetteur et acquéreur sont la même entité","Un schéma réservé aux transactions nationales","Un schéma sans frais"]'::jsonb,
 1, 'Schéma fermé = l''émetteur et l''acquéreur sont la même entité (ex. Amex).', 1)
ON CONFLICT (id) DO NOTHING;

-- Final evaluation
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
 2, 'Liability shift : avec authentification forte réussie, l''émetteur porte la responsabilité.', 3)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXERCISES (one per module)
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
