-- BLOC 4 chapters: Module 4.1 – PCI DSS & Module 4.2 – Anti-fraude

-- Module 4.1 – PCI DSS (4 chapters)

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.1.1-exigences', 'mod-4.1-pcidss', 'Les 12 exigences PCI DSS v4.0.1',
$$## Qu'est-ce que PCI DSS ?

Le **Payment Card Industry Data Security Standard** est un ensemble d'exigences de sécurité obligatoire pour toute entité qui stocke, traite ou transmet des données de carte.

### Les 12 exigences

| # | Exigence | Domaine |
|---|----------|---------|
| 1 | Installer et maintenir des contrôles d'accès réseau | Réseau |
| 2 | Appliquer des configurations sécurisées à tous les composants | Réseau |
| 3 | Protéger les données de compte stockées | Données |
| 4 | Protéger les données en transit (chiffrement fort) | Données |
| 5 | Protéger tous les systèmes contre les malwares | Vulnérabilités |
| 6 | Développer et maintenir des systèmes sécurisés | Vulnérabilités |
| 7 | Restreindre l'accès aux données selon le besoin métier | Accès |
| 8 | Identifier les utilisateurs et authentifier l'accès | Accès |
| 9 | Restreindre l'accès physique aux données de carte | Accès |
| 10 | Journaliser et surveiller tous les accès | Monitoring |
| 11 | Tester régulièrement les systèmes de sécurité | Tests |
| 12 | Mettre en place une politique de sécurité de l'information | Gouvernance |

> **v4.0.1** (juin 2024) : corrections mineures de la v4.0. Objectifs de sécurité vs contrôles prescriptifs = approche personnalisée.$$,
'["PCI DSS = obligatoire pour toute entité traitant des données de carte","12 exigences couvrant réseau, données, accès, monitoring, tests, gouvernance","v4.0.1 = version actuelle (juin 2024)","Approche personnalisée : objectif de sécurité plutôt que contrôle prescriptif"]'::jsonb,
1, 60) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.1.2-perimetre', 'mod-4.1-pcidss', 'Périmètre et segmentation',
$$## Le périmètre PCI DSS

### Données concernées

| Type | Exemples | Stockage autorisé |
|------|----------|-------------------|
| **PAN** | 4970 1234 5678 9012 | Oui, chiffré |
| **CHD** (Cardholder Data) | Nom, date expiration, code service | Oui, protégé |
| **SAD** (Sensitive Auth Data) | CVV, PIN, Track 1/2 complète | **NON** (jamais après autorisation) |

> **Règle fondamentale** : les SAD (CVV, PIN) ne doivent **jamais** être stockées après l'autorisation, même chiffrées.

### CDE (Cardholder Data Environment)

Le CDE comprend :
- Tous les systèmes qui stockent, traitent ou transmettent des données de carte
- Tous les systèmes connectés à ces systèmes (sauf segmentation)

### Segmentation

La segmentation réduit le périmètre PCI DSS :
- **Pare-feu** entre CDE et le reste du réseau
- **VLAN** dédié avec contrôle d'accès
- **DMZ** pour les composants exposés

```
[Internet] → [DMZ] → [Pare-feu] → [CDE]
                                      ↑
                                   [Segmenté]
                                      ↕ INTERDIT
                              [Réseau bureautique]
```

### SAQ (Self-Assessment Questionnaire)

| SAQ | Pour qui | Taille |
|-----|----------|--------|
| SAQ A | E-commerce sans données | ~30 questions |
| SAQ B | Terminaux autonomes | ~60 questions |
| SAQ C | Applications de paiement | ~140 questions |
| SAQ D | Tout le reste | ~400 questions |
| SAQ P2PE | P2PE validé | ~35 questions |$$,
'["SAD (CVV, PIN, Track) jamais stockées après autorisation","CDE = tous systèmes touchant des données de carte","Segmentation = réduction du périmètre PCI (pare-feu, VLAN)","SAQ A = le plus simple (e-commerce externalisé), SAQ D = le plus complet"]'::jsonb,
2, 60) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.1.3-approche-perso', 'mod-4.1-pcidss', 'L''approche personnalisée v4.0',
$$## Deux approches de conformité

### Approche définie (prescriptive)
Méthode traditionnelle : chaque exigence a un contrôle précis à implémenter.
- Exemple : *« Les mots de passe doivent avoir au moins 12 caractères »*
- **Avantage** : clair, auditable
- **Inconvénient** : rigide, peut être inadapté

### Approche personnalisée (customized)
Nouveauté v4.0 : l'entité définit **comment** atteindre l'objectif de sécurité.
- Exemple : objectif = *« Les facteurs d'authentification sont suffisamment complexes pour résister aux attaques »*
- L'entité peut utiliser MFA sans mot de passe, biométrie, etc.
- **Avantage** : flexible, innovation possible
- **Inconvénient** : documentation lourde, QSA doit valider

### Documentation requise (approche personnalisée)

1. Objectif de sécurité de l'exigence
2. Description du contrôle personnalisé
3. Risques adressés
4. Analyse de risque ciblée (Targeted Risk Analysis)
5. Tests de validation
6. Preuve que le contrôle atteint l'objectif

## Nouvelles exigences v4.0.1 (mars 2025)

| Exigence | Nouveauté |
|----------|-----------|
| 3.3.3 | Masquage du PAN en affichage (BIN + 4 derniers) |
| 6.4.3 | Scripts côté client (JavaScript) inventoriés et autorisés |
| 8.3.6 | MFA pour tous les accès au CDE |
| 11.6.1 | Détection des modifications sur les pages de paiement |
| 12.3.1 | Analyse de risque ciblée pour la fréquence des tests |$$,
'["Approche définie = contrôles prescriptifs, Approche personnalisée = objectifs de sécurité","v4.0.1 : scripts JS inventoriés (6.4.3), MFA obligatoire (8.3.6)","Targeted Risk Analysis = justification documentée des contrôles","11.6.1 = détection des modifications sur les pages de paiement (anti-skimming web)"]'::jsonb,
3, 50) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.1.4-evaluation', 'mod-4.1-pcidss', 'Évaluation et certification PCI',
$$## Processus d'évaluation

### Niveaux de conformité (Visa)

| Niveau | Critère | Évaluation |
|--------|---------|-----------|
| 1 | > 6 millions de TX/an | Audit sur site par QSA |
| 2 | 1-6 millions | SAQ + scan + audit optionnel |
| 3 | 20 000-1 million | SAQ + scan |
| 4 | < 20 000 | SAQ |

### QSA (Qualified Security Assessor)

Le QSA est un auditeur certifié par le PCI SSC :
- Examine les politiques, procédures, configurations
- Teste les contrôles techniques
- Rédige le ROC (Report on Compliance)
- Résultat : conforme ou avec findings

### AOC (Attestation of Compliance)

Document résumant le résultat de l'évaluation :
- Signé par le QSA et l'entité
- Fourni aux acquéreurs et aux schémas
- Validité : 1 an

### ASV (Approved Scanning Vendor)

Scans de vulnérabilité trimestriels des composants exposés :
- IP publiques
- Applications web
- Résultat : PASS (aucune vulnérabilité critique) ou FAIL

## Sanctions en cas de non-conformité

| Conséquence | Impact |
|------------|--------|
| Amendes | 5 000 à 100 000 $/mois |
| Augmentation des frais | Interchange majoré |
| Restriction | Interdiction de traiter des cartes |
| Responsabilité | En cas de breach, coûts de notification + damages |$$,
'["4 niveaux de conformité selon le volume de transactions","QSA = auditeur certifié, rédige le ROC (Report on Compliance)","AOC = attestation de conformité, valide 1 an","ASV = scans trimestriels des composants exposés"]'::jsonb,
4, 50) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Module 4.2 – Anti-fraude (4 chapters)
-- =============================================================================

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.2.1-typologies', 'mod-4.2-antifraude', 'Typologies de fraude bancaire',
$$## Classification de la fraude

### Par canal

| Canal | Type de fraude | Tendance |
|-------|---------------|----------|
| **Carte présente** | Skimming, shimming, contrefaçon | ↓ (grâce à EMV) |
| **Carte non présente** | CNP fraud, phishing, account takeover | ↑↑↑ |
| **Mobile** | Malware, SIM swap, man-in-the-middle | ↑↑ |
| **Virement** | BEC (Business Email Compromise), fraude au président | ↑ |

### Types principaux

- **Fraude au paiement** : transaction non autorisée par le porteur
- **Account takeover** : vol d'identifiants bancaires
- **Fraude à l'identité** : ouverture de compte avec identité volée
- **Fraude friendly** : le porteur conteste une transaction légitime
- **Blanchiment** : utilisation du système de paiement pour LCB-FT

> **Statistique** : La fraude CNP représente **70%** de la fraude carte en France (2024).

### Le triangle de la fraude

```
       [Opportunité]
          /    \
         /      \
  [Motivation]—[Rationalisation]
```

Réduire l'**opportunité** = rôle principal de la technologie (EMV, 3DS, scoring).$$,
'["CNP fraud = 70% de la fraude carte en France","EMV a réduit la fraude carte présente, CNP en augmentation","Account takeover = vol d''identifiants bancaires","Triangle de la fraude : opportunité, motivation, rationalisation"]'::jsonb,
1, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.2.2-scoring', 'mod-4.2-antifraude', 'Scoring temps réel : règles et ML',
$$## Architecture d'un système anti-fraude

```
[Transaction] → [Enrichissement] → [Moteur de règles] → [ML Model] → [Décision]
                      ↓                    ↓                  ↓           ↓
                [Géoloc, device,    [Règles métier    [Score 0-100]  [Accepter/
                 historique]         déterministes]                   Refuser/
                                                                     Reviewer]
```

### Moteur de règles

| Règle | Seuil | Action |
|-------|-------|--------|
| Montant > 5 000 € | Fixe | Review manuel |
| > 3 transactions en 5 min | Vélocité | Blocage |
| Pays différent de résidence | Géoloc | Score +30 |
| Nouveau device | Device | Score +20 |
| Commerçant à risque (MCC 7995) | Catégorie | Score +15 |

### Machine Learning

| Modèle | Type | Avantage | Inconvénient |
|--------|------|----------|-------------|
| Random Forest | Supervisé | Rapide, interprétable | Adaptation lente |
| XGBoost | Supervisé | Haute précision | Complexe à tuner |
| Autoencoder | Non supervisé | Détecte anomalies inconnues | Faux positifs |
| Réseau de neurones | Deep learning | Patterns complexes | Boîte noire |

### Features clés pour le scoring

| Feature | Type | Description |
|---------|------|-------------|
| Montant relatif | Numérique | Ratio montant / montant moyen |
| Heure de la journée | Catégoriel | Nuit vs jour |
| Distance géographique | Numérique | km entre transactions consécutives |
| Fréquence | Vélocité | Nombre de TX dans les N dernières minutes |
| Device fingerprint | Catégoriel | Nouveau device ? |$$,
'["Double approche : règles métier (déterministes) + ML (probabiliste)","Score 0-100 : < 30 accepter, 30-70 review, > 70 refuser","Features clés : montant relatif, géoloc, vélocité, device","Random Forest et XGBoost = modèles les plus utilisés en anti-fraude"]'::jsonb,
2, 50) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.2.3-metriques', 'mod-4.2-antifraude', 'Métriques et optimisation anti-fraude',
$$## KPI d'un système anti-fraude

| KPI | Formule | Objectif |
|-----|---------|---------|
| **Taux de détection** (TPR) | Fraudes détectées / Fraudes totales | > 90% |
| **Taux de faux positifs** (FPR) | Légitimes bloquées / Légitimes totales | < 2% |
| **Précision** | Vrais positifs / (VP + FP) | > 70% |
| **Montant sauvé** | Somme des fraudes bloquées | Maximiser |
| **Friction client** | Challenges inutiles / Transactions totales | < 5% |

## Le dilemme fraude vs friction

```
[Sécurité maximale] ←————————————→ [Expérience optimale]
    Tout bloquer                        Tout accepter
    FPR = 50%                           TPR = 0%
```

### Courbe ROC

La courbe ROC (Receiver Operating Characteristic) trace :
- Axe X : taux de faux positifs (FPR)
- Axe Y : taux de vrais positifs (TPR)
- AUC > 0.95 = excellent modèle

### Optimisation des seuils

| Seuil de refus | TPR | FPR | Impact business |
|----------------|-----|-----|----------------|
| Score > 90 | 70% | 0,5% | Peu de fraude détectée, pas de friction |
| Score > 70 | 85% | 2% | Bon compromis |
| Score > 50 | 95% | 8% | Trop de faux positifs |
| Score > 30 | 99% | 20% | Expérience catastrophique |

> **Objectif** : trouver le seuil qui **maximise le montant sauvé** tout en maintenant un FPR acceptable.$$,
'["TPR > 90%, FPR < 2% = objectifs typiques anti-fraude","Courbe ROC : AUC > 0.95 = excellent modèle","Dilemme fraude vs friction : trouver le bon seuil de score","Le seuil optimal maximise le montant sauvé avec un FPR acceptable"]'::jsonb,
3, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.2.4-cas-pratiques', 'mod-4.2-antifraude', 'Cas pratiques d''investigation',
$$## Cas 1 : Fraude CNP par phishing

**Scénario** : Un client appelle pour signaler 3 achats de 299 € chez des marchands en ligne qu'il ne connaît pas.

### Investigation

1. **Vérifier les transactions** : même BIN, commerçants différents, montant juste sous le seuil 3DS
2. **Analyser la source** : le client a cliqué sur un lien de phishing 2 jours avant
3. **IP des transactions** : même IP (VPN) pour les 3 achats
4. **Décision** : chargebacks + alerte fraude + blocage carte

### Leçons
- L'attaquant a contourné 3DS en restant sous le seuil d'exemption
- Solution : règle de vélocité (montant cumulé > 500 € en 24h → challenge)

## Cas 2 : Account takeover via SIM swap

**Scénario** : Changement de numéro de téléphone, puis virement de 15 000 €.

### Signaux d'alerte
- Changement de numéro de téléphone + virement dans les 48h
- Virement vers un compte jamais utilisé
- Connexion depuis un nouvel appareil

### Action en temps réel
Le système de scoring doit : **score +50** pour SIM change récent + **score +30** pour nouveau bénéficiaire = **score 80** → **blocage automatique**.

## Cas 3 : Bot de test de cartes

**Scénario** : 500 transactions de 1 € en 2 minutes sur un site de dons.

### Détection
- Vélocité extrême (250 TX/min depuis même IP)
- Montant identique (1 €)
- Taux de refus anormal (80% = cartes volées)

### Action
- Rate limiting par IP
- CAPTCHA après 3 échecs
- Alerte au commerçant$$,
'["Fraude CNP : contournement 3DS par montants sous seuil d''exemption","SIM swap : changement de tel + virement immédiat = alerte critique","Bot de test : vélocité extrême + montant fixe + taux de refus élevé","Chaque cas nécessite des règles anti-fraude spécifiques"]'::jsonb,
4, 50) ON CONFLICT (id) DO NOTHING;
