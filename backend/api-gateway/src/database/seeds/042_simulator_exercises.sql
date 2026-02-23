-- =================================================================
-- Phase 5 : Exercises Connected to Live Simulators
-- 4 new immersive exercises with automated verification
-- =================================================================

-- Exercise 1: HSM Key Rotation Lab
INSERT INTO learning.cursus_exercises (id, module_id, title, description, difficulty, exercise_type, instructions, expected_output, hints) VALUES
('ex-sim-1', 'mod-3.2-hsm', 'Lab HSM : Rotation de Clé ZPK',
'Connectez-vous au simulateur HSM, identifiez la ZPK de test, et effectuez une rotation de clé sécurisée. Vérifiez que l''ancienne clé est invalidée.',
'3',
'SIMULATION',
jsonb_build_array(
    'Étape 1 : Récupérez la liste des clés actuelles via GET http://localhost:8011/hsm/keys',
    'Étape 2 : Identifiez la clé ZPK_TEST et notez sa valeur actuelle (entropie zéro = 1111...)',
    'Étape 3 : Générez une nouvelle clé aléatoire via POST /hsm/generate-key avec label ZPK_NEW et algorithm AES-256',
    'Étape 4 : Vérifiez que la nouvelle clé a une entropie correcte (pas de motif répété)',
    'Étape 5 : Effectuez un chiffrement de test avec ZPK_NEW pour valider qu''elle fonctionne',
    'Étape 6 : Documentez la différence entre ZPK_TEST (faible) et ZPK_NEW (forte) dans votre rapport'
),
'["Utilisez curl pour interagir avec le HSM simulator","L''endpoint /hsm/generate-key accepte un body JSON avec label et algorithm","Comparez les valeurs hex : une vraie clé AES-256 a 64 caractères hex aléatoires","La réponse de /hsm/generate-key contient la nouvelle clé et son KCV"]'::jsonb,
45)
ON CONFLICT (id) DO NOTHING;

-- Exercise 2: Transaction Flow Analysis
INSERT INTO learning.cursus_exercises (id, module_id, title, description, difficulty, exercise_type, instructions, expected_output, hints) VALUES
('ex-sim-2', 'mod-3.3-switch', 'Lab Switch : Analyse de Flux Transactionnel',
'Envoyez 5 transactions de test via le switch et analysez les logs pour tracer le parcours complet POS→Switch→Issuer→Réponse.',
'3',
'SIMULATION',
jsonb_build_array(
    'Étape 1 : Envoyez une transaction d''autorisation via POST http://localhost:8010/transaction/authorize avec PAN, montant, devise, merchantId',
    'Étape 2 : Notez le STAN (DE 11), le RRN (DE 37) et le code de réponse (DE 39) retournés',
    'Étape 3 : Consultez les logs via GET http://localhost:8010/transaction/recent-logs et tracez votre transaction par STAN',
    'Étape 4 : Identifiez les 4 étapes du flux : réception, routage BIN, décision émetteur, réponse',
    'Étape 5 : Envoyez une transaction avec un montant > 9999 EUR et observez le comportement du switch (validation ou pas)',
    'Étape 6 : Documentez les champs ISO 8583 clés et leur rôle dans votre rapport'
),
'["Le switch écoute sur le port 8010","Le body attend les champs: pan, amount, currency, merchantId, posEntryMode","Utilisez jq pour formater les réponses JSON","Les logs contiennent les messages ISO bruts avec tous les Data Elements"]'::jsonb,
40)
ON CONFLICT (id) DO NOTHING;

-- Exercise 3: 3D Secure Flow Audit
INSERT INTO learning.cursus_exercises (id, module_id, title, description, difficulty, exercise_type, instructions, expected_output, hints) VALUES
('ex-sim-3', 'mod-2.5-3ds', 'Lab ACS : Audit du Flux 3D Secure',
'Testez le flux 3D Secure complet : initiation du challenge, vérification OTP, et analyse des failles potentielles. Documentez vos findings.',
'4',
'SIMULATION',
jsonb_build_array(
    'Étape 1 : Initiez un challenge 3DS via POST http://localhost:8013/acs/challenge avec PAN, montant, devise, merchantName',
    'Étape 2 : Testez le flow OTP via POST /acs/verify-otp avec challengeId et un OTP au hasard — observez le refus',
    'Étape 3 : Testez le risk-check via POST /acs/risk-check pour différents montants (100, 499, 500, 501) — identifiez le seuil SCA',
    'Étape 4 : Testez l''endpoint /acs/authenticate avec différentes valeurs de transStatus — cherchez des valeurs qui bypass le challenge',
    'Étape 5 : Documentez les 3 vulnérabilités potentielles : OTP statique, seuil fixe, valeurs magiques',
    'Étape 6 : Proposez des corrections concrètes pour chaque vulnérabilité identifiée'
),
'["L''ACS (Access Control Server) écoute sur le port 8013","Le champ transStatus contrôle le résultat de l''authentification","Le seuil SCA est un montant fixe — cherchez la transition false→true","Pensez aux implications DSP2 de chaque vulnérabilité trouvée"]'::jsonb,
50)
ON CONFLICT (id) DO NOTHING;

-- Exercise 4: Fraud Engine Calibration
INSERT INTO learning.cursus_exercises (id, module_id, title, description, difficulty, exercise_type, instructions, expected_output, hints) VALUES
('ex-sim-4', 'mod-4.2-antifraud', 'Lab Fraude : Calibration du Moteur Anti-Fraude',
'Testez et cartographiez le scoring du moteur de fraude. Identifiez les poids des features, le seuil de blocage, et proposez des améliorations.',
'4',
'SIMULATION',
jsonb_build_array(
    'Étape 1 : Envoyez une transaction baseline via POST http://localhost:8012/fraud/check avec PAN, montant=100, country=FR, mcc=5411 — notez le score',
    'Étape 2 : Testez chaque feature isolément : montant élevé (5000), pays à risque (NG), MCC gambling (7995), heure nocturne — mesurez l''impact sur le score',
    'Étape 3 : Identifiez le seuil de blocage exact — à quel score passe-t-on de APPROVE à DECLINE ?',
    'Étape 4 : Construisez une transaction "évasive" : montant élevé mais score juste sous le seuil en optimisant les autres features',
    'Étape 5 : Testez le comportement fail-open : que se passe-t-il si le moteur est en mode failure ? (via /fraud/config)',
    'Étape 6 : Rédigez un rapport avec le mapping des features, le seuil identifié, et 3 recommandations d''amélioration'
),
'["Le moteur de fraude écoute sur le port 8012","Testez une seule variable à la fois pour isoler les poids","Le seuil est autour de 70 points","Essayez les paramètres : isRecurring, deviceFingerprint, hour pour réduire le score"]'::jsonb,
60)
ON CONFLICT (id) DO NOTHING;
