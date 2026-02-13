# 🎓 Programme Complet de Formation Monétique — Blocs 1 à 5

> **Approche pédagogique** : TryHackMe — Combinaison de théorie approfondie et exercices pratiques (« Tasks ») dans l'environnement simulé **MoneticLab**.

---

## BLOC 1 — Fondamentaux des Paiements Électroniques (69h)

> Ce bloc couvre l'écosystème de base, les acteurs, les flux et les premières notions de sécurité.

### Module 1.1 — Principes du paiement électronique (10h)

**Objectifs pédagogiques** : Définir le paiement électronique, identifier les acteurs, expliquer les 3 phases d'une transaction, calculer les commissions.

| Chapitre | Contenu |
|----------|---------|
| **1. Introduction au paiement électronique** | Définition générale du e-paiement, distinction paiement digital / monétique. Brève histoire (Diners Club 1950, piste magnétique 1974, carte à puce CP8 1985, EMV 2002, NFC 2010, DSP2 2018). |
| **2. L'écosystème — Les acteurs** | Le carré magique : Porteur, Commerçant, Émetteur, Acquéreur. Acteurs satellites : Schémas (Visa, MC, CB, Amex — système tripartite), PSP (Stripe, Adyen, Worldline), Centres d'autorisation / processeurs. |
| **3. Les flux d'une transaction** | Les 3 phases : **Autorisation** (temps réel, < 2s, réservation d'encours), **Clearing** (J+1, batch, échange d'informations), **Règlement** (J+1 à J+3, mouvements financiers nets). Message ISO 8583. |
| **4. Modèles économiques et commissions** | Interchange (acquéreur → émetteur), plafonds DSP2/IFR (0,2% débit / 0,3% crédit). Frais acquéreur : TAF, MDR = Interchange + Frais schéma + Marge acquéreur. Exemple de calcul complet. |

**Task 1** : Cartographier les flux d'une transaction réelle et calculer les commissions interbancaires.

---

### Module 1.2 — Cybersécurité appliquée aux paiements (10h)

**Objectifs pédagogiques** : Identifier les menaces, appliquer les 12 exigences PCI DSS, comprendre la tokenisation et les HSM.

| Chapitre | Contenu |
|----------|---------|
| **1. Typologie des fraudes** | Skimming (copie de la piste magnétique), Phishing, Carding (tests de masse de numéros de carte), Account Takeover. Vecteurs d'attaque : terminal compromis, malware POS, MiTM. |
| **2. PCI DSS — Les 12 exigences** | Présentation de la norme PCI DSS : pare-feu, mots de passe, chiffrement, antivirus, RBAC, tests d'intrusion, politique de sécurité. Niveaux de conformité (1 à 4), SAQ (A à D). |
| **3. Protection des données** | Tokenisation (remplacement du PAN par un token non réversible), Chiffrement (AES-256, 3DES), HSM (Hardware Security Module) : coffre-fort cryptographique. |
| **4. Violations de sécurité et remédiation** | Étude de cas : Target (2013), Equifax (2017). Processus de réponse à incident. Conformité vs sécurité réelle. |

**Task 2** : Audit de conformité PCI DSS d'un site fictif — scan de vulnérabilités (ports ouverts, mots de passe par défaut).

---

### Module 1.3 — Paiements Carte Présente (CP) / Carte Non Présente (CNP) (12h)

**Objectifs pédagogiques** : Maîtriser les détails techniques de la puce EMV et du protocole 3-D Secure.

| Chapitre | Contenu |
|----------|---------|
| **1. EMV — Carte à puce** | Cryptogrammes : ARQC (Authorization Request), TC (Transaction Certificate), AAC (Application Authentication Cryptogram). Processus d'authentification carte/terminal. |
| **2. 3-D Secure** | V1 (pop-up, friction élevée) vs V2 (frictionless, intégré). Architecture : ACS (Access Control Server), DS (Directory Server), 3DS Server. Critères du mode frictionless. |
| **3. Liability Shift** | Bascule de responsabilité : si le commerçant n'active pas 3DS, il porte la responsabilité en cas de fraude. Cas de figure et implications. |

**Task 3** : Analyse de trames ISO 8583 et simulation de flux 3DS avec notification push.

---

### Module 1.4 — Fonctions monétiques : Émetteur & Acquéreur (10h)

**Objectifs pédagogiques** : Comprendre le cycle de vie de la carte, le scoring d'autorisation, la gestion des terminaux et des litiges.

| Chapitre | Contenu |
|----------|---------|
| **1. Cycle de vie de la carte bancaire** | Fabrication (personnalisation électrique et graphique), activation, utilisation, opposition (liste noire), renouvellement, destruction. |
| **2. Scoring d'autorisation** | Règles de l'émetteur : solde, plafond, opposition, géolocalisation, vélocité. Scoring en temps réel. |
| **3. Gestion des terminaux et chargebacks** | TPE / Soft-POS, contrats VAD, contrat commerçant. Chargebacks : processus, codes raison (fraude, marchandise non reçue, double débit), arbitrage. |

**Task 4** : Jeu de rôle sur le traitement d'une transaction et calcul de commissions complexes incluant les frais de schéma.

---

### Module 1.5 — Données sensibles & Cryptographie appliquée (15h)

**Objectifs pédagogiques** : Classifier les données sensibles, comprendre les algorithmes cryptographiques, implémenter le DUKPT.

| Chapitre | Contenu |
|----------|---------|
| **1. Classification des données** | PAN (Primary Account Number), PIN (Personal Identification Number), CVV/CVC/CVV2 (Card Verification Value), date d'expiration. Données de piste (Track 1 & 2). |
| **2. Algorithmes cryptographiques** | 3DES (Triple DES, héritage bancaire), AES (AES-128/256, standard actuel), RSA (chiffrement asymétrique, PKI). Chaînes de confiance et certificats. |
| **3. DUKPT** | Derived Unique Key Per Transaction. Clé BDK (Base Derivation Key), génération de clés uniques par transaction. Avantage : compromission d'une clé n'affecte pas les autres. |
| **4. PIN block et Luhn** | Formation du PIN block ISO-0 (format 0). Algorithme de Luhn pour validation de numéro de carte. Calcul manuel et vérification. |

**Task 5** : Calcul manuel de la clé de Luhn, formation d'un PIN block ISO-0 et simulation de dérivation de clés DUKPT.

---

### Module 1.6 — Schémas & Règles marchand (Visa, MC, CB) (12h)

**Objectifs pédagogiques** : Distinguer les schémas ouverts et fermés, comprendre les frais de schéma et les règles du commerçant.

| Chapitre | Contenu |
|----------|---------|
| **1. Schémas ouverts vs fermés** | Visa/Mastercard (quadripartite : émetteur ≠ acquéreur) vs Amex/Diners (tripartite : émetteur = acquéreur). UnionPay, JCB. |
| **2. Frais de schéma** | Assessment fees, schéma fees, cross-border fees. Impact sur le MDR. Exemples de grilles tarifaires Visa et Mastercard. |
| **3. Règles du commerçant** | Honor All Cards, No Surcharge Rule (interdiction de surtaxe abusive), règles d'affichage des logos. |
| **4. Chargebacks et codes raison** | Processus de litige, arbitrage, pré-arbitrage. Codes raison principaux par schéma. Délais et preuves. |

**Task 6** : Analyse d'une facture de frais de réseau et gestion d'un cas de litige pour marchandise non reçue.

---

## BLOC 2 — Transactions Sécurisées (67h)

> Approfondissement technique des protocoles de communication entre la carte, le terminal et le réseau. 60% pratique.

### Module 2.1 — Transactions contact : ISO/IEC 7816 (4h)

**Objectifs pédagogiques** : Maîtriser le dialogue maître-esclave terminal/carte, la structure des APDU et les protocoles T=0/T=1.

| Chapitre | Contenu |
|----------|---------|
| **1. Architecture APDU** | Structure Command APDU (CLA, INS, P1, P2, Lc, Data, Le) et Response APDU (Data, SW1, SW2). Les 4 cas de figure (Case 1 à 4). |
| **2. Status Words et dialogue EMV** | 9000 (succès), 6985 (conditions non remplies), 6700 (longueur incorrecte). Commandes SELECT (par AID), READ RECORD, GET PROCESSING OPTIONS. |
| **3. Protocoles T=0 et T=1** | T=0 : orienté octet, half-duplex. T=1 : orienté bloc (prologue, information, epilogue). Différences et cas d'usage. |

**Task** : Rejeu d'une vérification de PIN et construction manuelle de commandes SELECT par AID.

---

### Module 2.2 — Transactions sans contact : NFC, ISO 14443 (10h)

**Objectifs pédagogiques** : Comprendre les couches physiques et protocolaires ISO 14443, le NFC et l'émulation de carte.

| Chapitre | Contenu |
|----------|---------|
| **1. ISO 14443 : couche physique** | Modulation ASK (Amplitude Shift Keying), fréquence 13,56 MHz, distance < 10 cm. Énergie par induction. |
| **2. Anti-collision Type A / Type B** | ATQA/SAK (Type A), ATQB/ATTRIB (Type B). Processus de sélection de carte en champ multi-cartes. |
| **3. Émulation de carte : Android HCE** | Host Card Emulation (HCE). Le smartphone simule une carte sans Secure Element matériel. API NFC Android, IsoDep, HostApduService. |

**Task** : Capture et analyse de trames NFC reniflées entre un smartphone et un terminal.

---

### Module 2.3 — Flux monétiques : APDU → ISO 8583 (8h)

**Objectifs pédagogiques** : Comprendre le mapping des données EMV vers ISO 8583.

| Chapitre | Contenu |
|----------|---------|
| **1. Du TLV EMV au message réseau** | Extraction des données de la puce (TLV : Tag-Length-Value). Tags EMV critiques : 9F26 (AC), 9F27 (CID), 9F10 (IAD), 9F37 (Unpredictable Number). |
| **2. Structure ISO 8583** | MTI (Message Type Indicator), Primary/Secondary Bitmap, Data Elements. Exemple : 0100 (Authorization Request), 0110 (Response), 0200 (Financial), 0400 (Reversal). |
| **3. Mapping TLV → DE 55** | Le Data Element 55 contient les données EMV ICC sous forme TLV. Construction et parsing du DE 55. |
| **4. Décodage pratique** | Décodage d'un message 0100 binaire complet en champs lisibles (PAN, montant, devise, terminal ID, etc.). |

**Task** : Décodage d'un message 0100 binaire en champs lisibles.

---

### Module 2.4 — EMV — Carte & Terminal (18h)

**Objectifs pédagogiques** : Maîtriser le cycle de vie complet d'une transaction EMV, les analyses de risques terminal et les modes offline/online.

| Chapitre | Contenu |
|----------|---------|
| **1. Architecture EMV (Books 1-4)** | Book 1 (mécanique, électrique), Book 2 (sécurité, authentification), Book 3 (spécifications applicatives), Book 4 (interface cardholder/terminal). Kernels Contactless (K1-K8). |
| **2. Cycle de vie transaction** | Application Selection → GPO → Read Records → ODA (SDA/DDA/CDA) → Processing Restrictions → CVM → Terminal Risk Management → Terminal Action Analysis → Card Action Analysis → Online/Offline Decision. |
| **3. TVR, TSI et analyse de risques** | Terminal Verification Results (TVR) : 5 octets de flags. Transaction Status Information (TSI). Interprétation bit-à-bit. |
| **4. ARQC, TC, AAC et CVM** | Application Cryptogram : ARQC (demande en ligne), TC (transaction approuvée offline), AAC (refus). Cardholder Verification Methods : PIN online, PIN offline, signature, no CVM. |

**Task** : Développement d'un script Python simulant un noyau EMV (Kernel) pour générer un ARQC.

---

### Module 2.5 — Terminaux & PCI PTS (15h)

**Objectifs pédagogiques** : Comprendre l'architecture interne d'un TPE, les certifications PCI PTS et l'injection de clés.

| Chapitre | Contenu |
|----------|---------|
| **1. Architecture interne d'un TPE** | Processeur sécurisé, lecteurs (contact, sans contact, piste magnétique), écran, clavier, imprimante. Firmware signé, attestation à distance. |
| **2. PCI PTS POI v7.0** | Point of Interaction, Open Protocols, SRED (Secure Reading and Exchange of Data), EPP (Encryption PIN Pad), mécanismes anti-tamper. |
| **3. Injection de clés** | Key Ceremony, KIF (Key Injection Facility), Remote Key Injection (RKI), TR-34 (asymétrique). |
| **4. Soft-POS et nouvelles architectures** | COTS (Commercial Off-The-Shelf), SPoC, CPoC. Le smartphone comme terminal de paiement. Forward secrecy. Biométrie. |

**Task** : Simulation d'injection de clés dans un PIN Pad sécurisé.

---

### Module 2.6 — 3-D Secure & Authentification forte (12h)

**Objectifs pédagogiques** : Maîtriser le protocole 3DS v2.2, les rôles ACS/DS et la conformité DSP2/SCA.

| Chapitre | Contenu |
|----------|---------|
| **1. Architecture 3DS v2.2** | 3DS Server (Merchant plugin), DS (Directory Server), ACS (Access Control Server). Flux complet : AReq/ARes, CReq/CRes. |
| **2. Frictionless vs Challenge** | Critères du frictionless : IP connu, appareil enregistré, montant faible, TRA (Transaction Risk Analysis). Taux d'exemption. |
| **3. ECI et CAVV** | Electronic Commerce Indicator (ECI 05, 06, 07). Cardholder Authentication Verification Value (CAVV). Interprétation des résultats. |
| **4. Conformité DSP2 et SCA** | Strong Customer Authentication : 2 facteurs parmi (possession, connaissance, inhérence). Exemptions : faibles montants, bénéficiaires de confiance, TRA. |

**Task** : Mise en œuvre d'un défi d'authentification par empreinte digitale.

---

## BLOC 3 — Infrastructure & Systèmes de Paiement (70h)

> Architecture des serveurs bancaires, routage massif et nouvelles technologies. 60% pratique.

### Module 3.1 — Architecture des systèmes de paiement (12h)

**Objectifs pédagogiques** : Cartographier l'infrastructure bancaire, comprendre les contraintes de haute disponibilité et les topologies de déploiement.

| Chapitre | Contenu |
|----------|---------|
| **1. Front/Middle/Back-office bancaire** | Front : automates, TPE, applications mobiles. Middle : switch, moteur de scoring, HSM. Back : compensation, règlement, réconciliation, ledger. |
| **2. Haute disponibilité** | SLA 99,999% (< 5 min de downtime/an). Architectures Actif/Actif, Actif/Passif. SPOF (Single Point of Failure). |
| **3. Tendances 2026** | Paiement agentique (IA), tokenisation universelle, ISO 20022 natif, cloud hybride bancaire. |

**Task** : Calcul de capacité de charge pour un switch traitant 5000 TPS (transactions par seconde).

---

### Module 3.2 — Switch monétique & Routage (15h)

**Objectifs pédagogiques** : Comprendre le fonctionnement du switch, configurer les tables de routage et sécuriser le switch.

| Chapitre | Contenu |
|----------|---------|
| **1. Fonction du switch** | Concentrateur : agrège les flux provenant des terminaux. Routeur : dirige vers l'émetteur via les schémas. Traducteur : convertit les formats (ISO 8583 ↔ propriétaire). |
| **2. Tables de routage par BIN** | BIN (Bank Identification Number, 6 à 8 chiffres). Routage par plage de BIN → émetteur. Fallback, rejet par BIN inconnu, re-routage. |
| **3. Gestion des timeouts et rejeux** | Timeout standard : 30s. Rejeu automatique : max 3 tentatives. Idempotence (STAN, RRN). Mécanismes anti-doublon. |
| **4. Sécurité du switch** | Protection contre BIN flooding (iptables, rate limiting), détection d'anomalies (spike de TPS), pare-feu applicatif, journalisation temps réel. |

**Task** : Configuration d'une table de routage et protection contre les attaques de type « BIN flooding » via iptables.

---

### Module 3.3 — HSM — Hardware Security Modules (15h)

**Objectifs pédagogiques** : Comprendre l'architecture interne d'un HSM bancaire, le cycle de vie des clés et les commandes Thales payShield.

| Chapitre | Contenu |
|----------|---------|
| **1. Architecture interne** | Thales payShield 10K : tamper-responsive, processeur ARM sécurisé, FIPS 140-2 Level 3, batterie lithium (zéroisation). |
| **2. Hiérarchie des clés** | LMK (Local Master Key), ZMK (Zone Master Key), ZPK (Zone PIN Key), TMK (Terminal Master Key). Key Ceremony (séparation des composantes, double contrôle). |
| **3. Commandes Thales** | A0/A1 (Generate Key), BU/BV (Translate PIN), CA/CB (Verify Interchange PIN), FA/FB (Translate ZPK to LMK). Codes de réponse (00 = succès, 01 = erreur de clé). |
| **4. DUKPT en profondeur et HSM Cloud** | IPEK (Initial PIN Encryption Key), KSN (Key Serial Number), dérivation bitwise, future keys. Cloud HSM (AWS CloudHSM, Azure Managed HSM). |

**Task** : Programmation de commandes HSM pour vérifier un PIN et générer une clé DUKPT.

---

### Module 3.4 — Migration ISO 20022 (18h)

**Objectifs pédagogiques** : Comprendre la transition de l'ISO 8583 vers ISO 20022, les messages MX et la coexistence des formats.

| Chapitre | Contenu |
|----------|---------|
| **1. ISO 8583 avancé** | Bitmaps (primary 64 bits, secondary 64 bits, tertiary). Data Elements critiques : DE 2 (PAN), DE 3 (Processing Code), DE 38 (Auth Code), DE 39 (Response Code), DE 55 (ICC Data). |
| **2. ISO 20022 — Principes** | Messages MX en XML/JSON. Familles : pain (Payment Initiation), pacs (Payment Clearing & Settlement), camt (Cash Management). Structure : Business Application Header + Document. |
| **3. Messages clés** | pain.001 (Customer Credit Transfer Initiation), pacs.008 (FI to FI Customer Credit Transfer), camt.054 (Bank-to-Customer Debit/Credit Notification). Migration SWIFT 2025. |
| **4. Passerelle de traduction** | Mapping bidirectionnel ISO 8583 ↔ ISO 20022. Coexistence des formats pendant la transition. Enrichissement des données. |

**Task** : Développement d'une passerelle de traduction entre un virement XML et un message carte binaire.

---

### Module 3.5 — Tokenisation & P2PE (10h)

**Objectifs pédagogiques** : Différencier tokenisation acquéreur et réseau, comprendre le standard P2PE et réduire le périmètre PCI DSS.

| Chapitre | Contenu |
|----------|---------|
| **1. Tokenisation vs Chiffrement** | Tokenisation : remplacement irréversible (sans clé). Chiffrement : réversible avec clé. Avantages de la tokenisation : réduction du périmètre PCI. |
| **2. EMV Payment Tokenisation** | TSP (Token Service Provider), Token Requestor, PAR (Payment Account Reference). Cryptogramme dynamique par transaction. |
| **3. P2PE — PCI P2PE v3.1** | Point-to-Point Encryption. Chiffrement dès la saisie (PIN Pad) jusqu'au HSM de l'acquéreur. Domaines P2PE : Application, POI, Decryption. |
| **4. Réduction du périmètre PCI** | Avant P2PE : tout le réseau commerçant dans le scope. Après P2PE : seul le terminal certifié. Impact sur les coûts d'audit. |

**Task** : Déploiement d'un moteur de tokenisation et réduction du périmètre PCI d'un réseau commerçant.

---

## BLOC 4 — Sécurité & Gestion des Risques (112h)

> Défense, détection des fraudes sophistiquées et investigation forensique. 50% travaux dirigés.

### Module 4.1 — PCI DSS v4.0.1 : le référentiel complet (18h)

**Objectifs pédagogiques** : Maîtriser les 12 exigences, l'approche personnalisée, les SAQ et l'évaluation QSA.

| Chapitre | Contenu |
|----------|---------|
| **1. Les 12 exigences PCI DSS v4.0.1** | Exigences 1-6 (Build & Maintain) : pare-feu, mots de passe, données stockées, chiffrement en transit, antivirus, systèmes sécurisés. Exigences 7-12 (Access Control, Monitoring, Policy) : RBAC, authentification, accès physique, journalisation, tests, politique. |
| **2. Approche personnalisée** | Objective-based vs prescriptive controls. Customized approach : démontrer que l'objectif de sécurité est atteint par des moyens alternatifs. Documentation requise. |
| **3. Périmètre CDE et SAQ** | Cardholder Data Environment (CDE). Segmentation réseau. SAQ A (e-commerce externalisé), SAQ B (TPE uniquement), SAQ C (application de paiement), SAQ D (tout). |
| **4. Évaluation QSA et niveaux** | QSA (Qualified Security Assessor). Niveau 1 (> 6M transactions), Niveau 2 (1-6M), Niveau 3 (20K-1M), Niveau 4 (< 20K). ROC vs SAQ. |

**Task** : Simulation d'un audit QSA avec examen de preuves (logs, certificats, schémas réseau).

---

### Module 4.2 — Détection et prévention de la fraude (15h)

**Objectifs pédagogiques** : Comprendre les typologies de fraude, le scoring temps réel et le Machine Learning appliqué.

| Chapitre | Contenu |
|----------|---------|
| **1. Typologies de fraude** | CNP fraud, Skimming, BIN attacks (carding), Account Takeover, Ingénierie sociale (vishing, smishing). Friendly fraud (chargeback abusif). |
| **2. Scoring temps réel** | Règles déterministes : vélocité, montant inhabituel, géo-impossibilité. Score composite (0-1000). Seuils : accept / review / decline. |
| **3. Machine Learning appliqué** | Random Forest, XGBoost, réseaux de neurones. Features : fréquence, Device ID, IP reputation. Métriques : recall, precision, F1-score. |
| **4. Transaction Risk Analysis (TRA)** | Critères DSP2 pour exemption SCA. Taux de fraude de référence par tranche de montant. Monitoring continu et reporting. |

**Task** : Configuration de règles de détection du « carding » (tests de masse de numéros de carte).

---

### Module 4.3 — Conformité : DSP2, RGPD, LCB-FT (12h)

**Objectifs pédagogiques** : Maîtriser les obligations DSP2, RGPD et LCB-FT dans le contexte des paiements.

| Chapitre | Contenu |
|----------|---------|
| **1. DSP2 — Open Banking** | Accès aux comptes (XS2A) : PISP, AISP, PIISP. SCA (Strong Customer Authentication) : 2 facteurs parmi possession, connaissance, inhérence. API PSD2 et agrégateurs. |
| **2. RGPD et données de paiement** | Données personnelles vs données de paiement. Base légale (exécution du contrat vs consentement). Droits des personnes (accès, rectification, effacement). DPO et DPIA. |
| **3. LCB-FT** | Lutte Contre le Blanchiment et le Financement du Terrorisme. KYC (Know Your Customer), screening (listes de sanctions, PEP). Déclaration de soupçon Tracfin. |
| **4. Interactions réglementaires** | Articulation DSP2/RGPD/LCB-FT. Conflits potentiels (ex : conservation des données vs droit à l'effacement). Rôle de l'ACPR et de la CNIL. |

**Task** : Rédaction d'une déclaration de soupçon pour Tracfin suite à un virement fractionné suspect.

---

### Module 4.4 — Audit, pentesting & réponse à incident (12h)

**Objectifs pédagogiques** : Conduire un audit PCI DSS, réaliser des tests d'intrusion et gérer un incident de sécurité.

| Chapitre | Contenu |
|----------|---------|
| **1. Méthode d'audit PCI DSS** | Planification, collecte de preuves, entretiens, tests techniques. Workflow QSA : scoping → assessment → ROC → AOC. |
| **2. Tests d'intrusion** | Pentest interne et externe. OWASP Top 10 appliqué aux composants de paiement. Méthodologie PTES. Outils : Burp Suite, nmap, Wireshark. |
| **3. Forensic & DFIR** | Methodology DFIR (Digital Forensics & Incident Response). Collecte de preuves numériques, chaîne de custody. Analyse de logs (SSH, Apache, firewall). |
| **4. Investigation avancée** | Analyse d'emails frauduleux (BEC — Business Email Compromise). Traçage de fonds sur la Blockchain. Rédaction d'un rapport forensique pour la police. |

**Task** : Investigation sur une transaction crypto frauduleuse et rédaction d'un rapport forensique.

---

### Module 4.5 — Analyse et gestion des risques (8h)

**Objectifs pédagogiques** : Appliquer les méthodologies d'analyse de risques au contexte monétique.

| Chapitre | Contenu |
|----------|---------|
| **1. Méthodologies** | ISO 27005, EBIOS RM (Expression des Besoins et Identification des Objectifs de Sécurité). Workshops EBIOS : socle de sécurité, sources de risque, scénarios stratégiques, scénarios opérationnels, traitement. |
| **2. Cartographie des risques monétiques** | Risques spécifiques : fraude, compromission de clés, indisponibilité du switch, fuite de PAN. Matrice impact × probabilité. |
| **3. Plan de traitement et gouvernance** | Accepter, transférer, réduire, éviter. KRI (Key Risk Indicators). Reporting au comité des risques. Plan de continuité d'activité (PCA). |

**Task** : Cartographie des risques d'un système de paiement et rédaction d'un plan de traitement.

---

## BLOC 5 — Option : Maîtrise d'Œuvre en Monétique (92h)

> Spécialisation pour les développeurs souhaitant créer leurs propres briques monétiques. 85% coding.

### Module 5.1 — Transactions Contact : ISO/IEC 7816 (TP) (4h)

**Objectifs pédagogiques** : Implémenter un émulateur de terminal en Java (PC/SC), tracer et analyser des échanges APDU.

| Chapitre | Contenu |
|----------|---------|
| **1. API PC/SC Java** | javax.smartcardio (TerminalFactory, Card, CardChannel). Établissement de session, envoi d'APDU, réception de réponse. |
| **2. Émulateur de terminal** | Construction d'un outil CLI qui : se connecte à une carte, envoie SELECT par AID, lit les enregistrements EMV, affiche les tags TLV. |
| **3. Traçage APDU** | Journalisation en temps réel de chaque commande/réponse avec horodatage et décodage des status words. |

**Task** : Développement d'un émulateur de terminal EMV en Java avec PC/SC.

---

### Module 5.2 — Android et Applications Smartphone (15,5h)

**Objectifs pédagogiques** : Maîtriser l'API NFC Android, développer une app de lecture EMV et implémenter HCE.

| Chapitre | Contenu |
|----------|---------|
| **1. API NFC Android** | NfcAdapter, IsoDep, NfcA, NfcB. Intent filters, enableForegroundDispatch. Lecture vs écriture de tags. |
| **2. Application de lecture EMV** | Scanner une carte bancaire en NFC. Parser les TLV (Tag-Length-Value). Extraire : PAN, date d'expiration, Application Label, AID. |
| **3. HCE — Host Card Emulation** | Service HostApduService. Émulation de carte de fidélité ou de paiement. Routage AID. |
| **4. Bridge NFC et EMV Kernel 8** | Architecture Kernel 8 (contactless). Secure Channel ECC/AES. Relay Attack mitigation (distance bounding). |

**Task** : Création d'une application Android simulant une carte de fidélité sécurisée crédit/débit.

---

### Module 5.3 — Cryptographie appliquée (TD & TP) (12,5h)

**Objectifs pédagogiques** : Implémenter DUKPT, CVV/CVV2, ARQC/ARPC en code et comprendre le Secure Channel ECC/AES.

| Chapitre | Contenu |
|----------|---------|
| **1. DUKPT — Implémentation** | Dérivation bitwise du BDK vers les session keys. KSN (Key Serial Number) : 10 octets. Compteur de transactions (21 bits). Code Java/Python complet. |
| **2. CVV / CVV2** | Génération du CVV1 (piste magnétique) et CVV2 (dos de la carte). Algorithme : 3DES avec la clé CVK sur PAN + date + code service. |
| **3. ARQC / ARPC** | Application Cryptogram : calcul via Master Key → ICC Master Key → Session Key → MAC (CBC). Vérification par l'émetteur. ARPC : réponse de l'émetteur à la carte. |
| **4. ECC appliquée** | Elliptic Curve Cryptography. ECDH (Diffie-Hellman) pour key agreement. ECDSA pour signature. Application au Kernel 8 EMV Contactless. |

**Task** : Implémentation complète du calcul de CVV et de la dérivation ARQC en Java.

---

### Module 5.4 — JavaCard et GlobalPlatform (22h)

**Objectifs pédagogiques** : Développer des applets JavaCard, les déployer et gérer les cartes avec GlobalPlatformPro.

| Chapitre | Contenu |
|----------|---------|
| **1. Architecture JavaCard** | JCVM (Java Card Virtual Machine), JCRE (Java Card Runtime Environment), API JavaCard. Restrictions : pas de float, pas de String, pas de garbage collection. |
| **2. Cycle de vie d'un applet** | install() → select() → process() → deselect(). APDU handling : receiveBytes(), sendBytes(). ISOException et status words. |
| **3. GlobalPlatformPro** | Outil gp.jar : list, install, delete, lock, unlock. Authenticated sessions (SCP02, SCP03). Key diversification. |
| **4. Applet EMV simplifié** | Développement d'un applet qui : répond au SELECT par AID, fournit des données TLV simulées, implémente un mécanisme de PIN. |
| **5. Sécurité et contremesures** | Side-channel attacks (DPA, SPA, timing). Contremesures : randomisation, masking, constant-time operations. Fault injection. |

**Task** : Compilation et installation d'un applet « Simple Wallet » sur une carte physique, avec gestion des clés GlobalPlatform.

---

### Module 5.5 — Java pour Embarqué (prérequis JavaCard) (12h)

**Objectifs pédagogiques** : Comprendre les spécificités Java embarqué et les restrictions de la VM JavaCard.

| Chapitre | Contenu |
|----------|---------|
| **1. Spécificités Java embarqué** | JavaCard vs Java SE. Restrictions : pas de threads, pas de classloader dynamique, mémoire limitée (EEPROM ≈ 72 Ko). Types supportés : byte, short, boolean. |
| **2. Optimisation et transactions** | Gestion de la mémoire EEPROM vs RAM transiente. Transactions atomiques JCRE (beginTransaction, commitTransaction, abortTransaction). |
| **3. Adaptation du code** | Patterns JavaCard : Singleton, Factory Method (sans reflection). Arrays au lieu d'objets complexes. Utilisation de Util.arrayCopy, Util.arrayFillNonAtomic. |

**Task** : Développement d'un gestionnaire de portefeuille optimisé pour JavaCard avec transactions atomiques.

---

### Module 5.6 — Base de Données bancaire (26h)

**Objectifs pédagogiques** : Concevoir un schéma de persistance pour les transactions, implémenter une couche d'accès sécurisée avec chiffrement.

| Chapitre | Contenu |
|----------|---------|
| **1. Schéma SQL haute performance** | Tables : transactions, cards, merchants, terminals, auths. Partitionnement par date. Index composites. Colonnes calculées. |
| **2. Chiffrement applicatif** | Chiffrement du PAN au repos (AES-256-GCM). Tokenisation en base. Interface HSM pour le chiffrement/déchiffrement. Gestion des clés en transit. |
| **3. Couche DAO sécurisée** | Data Access Object : abstraction JDBC/JPA. Requêtes préparées (protection SQL injection). Connection pooling (HikariCP). Audit logging. |
| **4. Haute disponibilité** | Réplication PostgreSQL (streaming, logical). Failover automatique (Patroni). Backup & restore. Schéma de switch monétique avec partitionnement. |

**Task** : Implémentation d'une couche d'accès aux données (DAO) sécurisée avec interface HSM pour le chiffrement des PANs.

---

## Récapitulatif

| Bloc | Thème | Heures | Modules |
|------|-------|--------|---------|
| **1** | Fondamentaux des Paiements Électroniques | 69h | 6 modules (1.1 → 1.6) |
| **2** | Transactions Sécurisées | 67h | 6 modules (2.1 → 2.6) |
| **3** | Infrastructure & Systèmes de Paiement | 70h | 5 modules (3.1 → 3.5) |
| **4** | Sécurité & Gestion des Risques | 112h | 5 modules (4.1 → 4.5) |
| **5** | Maîtrise d'Œuvre en Monétique (Option) | 92h | 6 modules (5.1 → 5.6) |
| | **Total** | **410h** | **28 modules** |
