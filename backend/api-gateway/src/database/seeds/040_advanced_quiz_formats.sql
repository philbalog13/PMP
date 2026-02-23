-- =================================================================
-- Phase 6 : Advanced Quiz Formats (ORDERING, MATCHING, CODE_ANALYSIS, SCENARIO)
-- =================================================================

-- Insert advanced quiz questions for all blocs
-- These supplement the existing multiple-choice questions

-- ================================================================
-- Bloc 1 - ORDERING Questions
-- ================================================================
INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-adv-1.1', 'quiz-1.1', 
 'Remettez dans l''ordre les étapes d''une transaction de paiement par carte bancaire :',
 '["1. Le porteur présente sa carte","2. Le terminal lit la puce EMV","3. Le terminal envoie un message ISO 8583 à l''acquéreur","4. L''acquéreur route vers le réseau (Visa/Mastercard)","5. L''émetteur autorise ou refuse","6. La réponse redescend jusqu''au terminal"]'::jsonb,
 0, 'Le flux complet d''une transaction suit cette séquence : présentation → lecture puce → message ISO → routage réseau → décision émetteur → réponse. Chaque étape est critique pour la sécurité et la rapidité du paiement.', 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-adv-1.2', 'quiz-1.1', 
 'Remettez dans l''ordre les couches de sécurité appliquées à une transaction en ligne (e-commerce) :',
 '["1. Chiffrement TLS du navigateur au serveur marchand","2. Tokenisation du PAN par le PSP","3. Challenge 3D Secure envoyé au porteur","4. Vérification OTP par l''ACS de l''émetteur","5. Autorisation envoyée au réseau interbancaire","6. Compensation et règlement en fin de journée"]'::jsonb,
 0, 'Les couches se superposent : TLS protège le canal, la tokenisation protège le PAN, le 3DS authentifie le porteur, puis le flux classique d''autorisation/compensation s''applique.', 21)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- Bloc 2 - MATCHING Questions
-- ================================================================
INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-adv-2.1', 'quiz-2.1',
 'Associez chaque commande APDU à sa fonction EMV :',
 '["SELECT → Sélectionner l''application de paiement sur la carte","GET PROCESSING OPTIONS → Initier la transaction et obtenir l''AFL","READ RECORD → Lire les données de la puce (PAN, dates, certificats)","GENERATE AC → Demander un cryptogramme (TC/ARQC/AAC)","VERIFY → Soumettre le code PIN en ligne ou hors ligne","INTERNAL AUTHENTICATE → Demander une preuve cryptographique DDA"]'::jsonb,
 0, 'Chaque commande APDU a un rôle précis dans le flux EMV. SELECT identifie l''applet, GPO initialise, READ RECORD récupère les données, GENERATE AC produit le cryptogramme, VERIFY valide le PIN, et INTERNAL AUTHENTICATE prouve l''authenticité de la carte.', 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-adv-2.2', 'quiz-2.1',
 'Associez chaque champ ISO 8583 (Data Element) à sa signification :',
 '["DE 2 → PAN (Primary Account Number)","DE 4 → Montant de la transaction","DE 11 → STAN (System Trace Audit Number)","DE 39 → Code de réponse (00=approuvé)","DE 43 → Nom et adresse du commerçant","DE 64 → MAC (Message Authentication Code)"]'::jsonb,
 0, 'ISO 8583 utilise des Data Elements numérotés. DE 2 porte le PAN, DE 4 le montant, DE 11 le STAN pour le traçage, DE 39 le code réponse, DE 43 l''identité du commerçant, et DE 64 le MAC d''intégrité.', 21)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- Bloc 3 - CODE_ANALYSIS Questions
-- ================================================================
INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-adv-3.1', 'quiz-3.1',
 'Analysez ce code de vérification de PIN. Quelle est la vulnérabilité de sécurité ?

```javascript
function verifyPin(submittedPin, storedPin) {
  for (let i = 0; i < submittedPin.length; i++) {
    if (submittedPin[i] !== storedPin[i]) {
      return false;
    }
  }
  return true;
}
```',
 '["Timing side-channel : la comparaison return false dès le premier caractère différent, révélant la position du mauvais caractère","Pas de vulnérabilité, le code est correct","Buffer overflow potentiel","Injection SQL dans le PIN"]'::jsonb,
 0, 'Cette comparaison séquentielle (early-return) crée un timing side-channel. Un PIN commençant par les bons chiffres prend plus de temps à vérifier. La correction est d''utiliser crypto.timingSafeEqual() pour une comparaison en temps constant.', 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-adv-3.2', 'quiz-3.1',
 'Analysez cette configuration HSM. Identifiez le problème critique :

```json
{
  "keys": [
    {"label": "ZPK_PROD", "value": "A1B2C3...", "algorithm": "3DES"},
    {"label": "ZPK_TEST", "value": "11111111111111111111111111111111", "algorithm": "AES-256"}
  ],
  "config": {
    "keyLeakInLogs": true,
    "allowWeakKeys": true
  }
}
```',
 '["Trois problèmes : clé ZPK_TEST avec entropie zéro (motif 1111...), logging de matériel sensible activé (keyLeakInLogs:true), et clés faibles autorisées (allowWeakKeys:true)","Un seul problème : la clé ZPK_TEST est faible","Pas de problème, c''est une config de test","Le problème est l''utilisation de 3DES au lieu d''AES"]'::jsonb,
 0, 'Trois vulnérabilités critiques coexistent : (1) ZPK_TEST a une entropie de 0 bit — toute la valeur est "1" répété, (2) keyLeakInLogs=true viole PCI DSS Exigence 3 en loggant du matériel crypto en clair, (3) allowWeakKeys=true désactive la validation de force des clés.', 21)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- Bloc 4 - SCENARIO Questions
-- ================================================================
INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-adv-4.1', 'quiz-4.1',
 'SCÉNARIO : Vous êtes RSSI d''une banque émettrice. Le SOC détecte 500 micro-transactions (1€) sur 200 PAN différents en 3 minutes, toutes chez le même e-commerçant. Quelle est votre priorité ?',
 '["Bloquer immédiatement le MID commerçant, alerter l''acquéreur, activer le monitoring renforcé sur les 200 PAN, et lancer une investigation card-testing","Attendre 24h pour confirmer le pattern avant d''agir","Envoyer un email au commerçant pour demander des explications","Augmenter le seuil de scoring fraude pour réduire les faux positifs"]'::jsonb,
 0, 'Un burst de 500 micro-TX sur 200 PAN différents chez un seul commerçant est un pattern classique de card testing. L''action immédiate consiste à bloquer le MID, alerter l''acquéreur (qui peut suspendre le contrat commerçant), monitorer les 200 PAN (qui risquent d''être utilisés pour de la fraude réelle), et investiguer.', 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-adv-4.2', 'quiz-4.1',
 'SCÉNARIO : Un audit PCI DSS révèle que votre HSM de production utilise une clé ZPK qui n''a jamais été rotée depuis 18 mois. La norme PCI PIN Security exige une rotation annuelle. Quelles actions prenez-vous ?',
 '["Planifier une rotation d''urgence avec double période de validité (ancienne + nouvelle ZPK), mettre à jour la politique de rotation avec alertes automatiques, documenter l''écart et le plan de remédiation pour l''auditeur QSA","Changer la clé immédiatement sans période de transition","Ignorer la recommandation car la clé est toujours fonctionnelle","Demander une exemption au conseil d''administration de PCI SSC"]'::jsonb,
 0, 'La rotation de clé doit être planifiée avec une période de transition (dual-key) pour éviter les interruptions de service. Il faut documenter l''écart et le plan de remédiation pour satisfaire l''auditeur QSA, et surtout automatiser les alertes pour éviter que cela se reproduise.', 21)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- Bloc 5 - CODE_ANALYSIS + SCENARIO mix
-- ================================================================
INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-adv-5.1', 'quiz-5.1',
 'Analysez ce code JavaCard de vérification de PIN :

```java
public void verify(APDU apdu) {
    byte[] buffer = apdu.getBuffer();
    byte pinLength = buffer[ISO7816.OFFSET_CDATA];
    if (pin.check(buffer, (short)(ISO7816.OFFSET_CDATA+1), pinLength)) {
        pinTriesRemaining = MAX_TRIES;
    } else {
        pinTriesRemaining--;
        if (pinTriesRemaining <= 0) {
            // BLOQUER LA CARTE
            cardBlocked = true;
        }
        ISOException.throwIt(SW_WRONG_PIN);
    }
}
```
Quel est le problème de sécurité ?',
 '["Le compteur pinTriesRemaining est décrémenté APRÈS la vérification. Si la carte est retirée entre check() et la décrémentation (tear attack), le compteur n''est jamais décrémenté, permettant un brute-force infini.","Le code est sécurisé et bien implémenté","Le problème est que pinLength vient du buffer APDU sans validation","Le MAX_TRIES devrait être plus grand"]'::jsonb,
 0, 'C''est un tear attack (ou tearing attack). La JCF (Java Card Framework) ne garantit pas l''atomicité entre pin.check() et la décrémentation. Si on coupe l''alimentation de la carte au bon moment (entre les deux), le PIN est vérifié mais le compteur reste intact. On peut ainsi brute-forcer le PIN en 10000 tentatives (pour un PIN 4 chiffres). La correction : décrémenter le compteur AVANT pin.check() et le restaurer uniquement en cas de succès, le tout en utilisant les transactions JCF (JCSystem.beginTransaction/commitTransaction).', 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_quiz_questions (id, quiz_id, question, options, correct_option_index, explanation, question_order) VALUES
('qq-adv-5.2', 'quiz-5.1',
 'SCÉNARIO : Vous développez une application HCE (Host Card Emulation) pour mobile. L''application doit stocker le token de paiement et les clés de session. Quelle est l''approche la plus sécurisée ?',
 '["Stocker les clés dans le TEE (Trusted Execution Environment) via Android Keystore avec attestation matérielle, et limiter les transactions HCE avec un compteur ATC vérifié côté serveur","Stocker les clés en SharedPreferences chiffrées avec AES","Utiliser le Secure Element intégré au téléphone","Stocker les clés dans une base SQLite chiffrée avec SQLCipher"]'::jsonb,
 0, 'Sans SE physique (le cas HCE), le TEE via Android Keystore est la meilleure option. L''attestation matérielle prouve que les clés sont dans le TEE. Le compteur ATC côté serveur empêche le replay de transactions même si le device est compromis. SharedPreferences ou SQLCipher sont des solutions logicielles qui ne protègent pas contre un device rooté.', 21)
ON CONFLICT (id) DO NOTHING;
