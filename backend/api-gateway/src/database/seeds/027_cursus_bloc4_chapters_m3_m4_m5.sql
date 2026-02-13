-- BLOC 4 chapters: Module 4.3 – Conformité, Module 4.4 – Audit, Module 4.5 – Risques

-- Module 4.3 – Conformité (4 chapters)

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.3.1-dsp2', 'mod-4.3-conformite', 'DSP2 : obligations et acteurs',
$$## La Directive sur les Services de Paiement 2

La **DSP2** (2015/2366/UE) est entrée en vigueur le 13 janvier 2018.

### Objectifs

1. **Ouverture** du marché des services de paiement (Open Banking)
2. **Sécurité** renforcée des paiements en ligne (SCA)
3. **Protection** des consommateurs

### Nouveaux acteurs

| Acteur | Sigle | Rôle |
|--------|-------|------|
| **Prestataire d'Initiation de Paiement** | PISP | Initie un paiement depuis le compte du client (ex: virement) |
| **Prestataire d'Information sur les Comptes** | AISP | Agrège les données de comptes (ex: apps budget) |
| **Prestataire d'Émission d'Instruments de Paiement** | PIISP | Vérifie la disponibilité des fonds |

### APIs d'accès aux comptes

Les banques doivent fournir des APIs sécurisées (XS2A) :
- **Consultation de comptes** : solde, historique
- **Initiation de paiements** : virements
- **Confirmation de fonds** : oui/non

> **SCA** (Strong Customer Authentication) : authentification forte obligatoire pour les opérations sensibles (cf. module 2.6).$$,
'["DSP2 = ouverture du marché (Open Banking) + sécurité (SCA)","PISP = initiation de paiement, AISP = agrégation de comptes","Banques obligées de fournir des APIs XS2A","SCA = 2 facteurs parmi connaissance, possession, inhérence"]'::jsonb,
1, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.3.2-rgpd', 'mod-4.3-conformite', 'RGPD et données de paiement',
$$## Le RGPD appliqué au paiement

Le **Règlement Général sur la Protection des Données** (2016/679) s'applique à toutes les données personnelles, y compris les données de paiement.

### Données de paiement = données personnelles

| Donnée | Personnel ? | Base légale |
|--------|------------|------------|
| PAN | Oui | Exécution contrat |
| Nom du porteur | Oui | Exécution contrat |
| Montant de transaction | Oui (indirect) | Exécution contrat |
| Adresse IP | Oui | Intérêt légitime (anti-fraude) |
| Historique d'achat | Oui | Intérêt légitime (anti-fraude) |

### Principes RGPD

| Principe | Application paiement |
|----------|---------------------|
| **Minimisation** | Ne collecter que le nécessaire |
| **Limitation de conservation** | Purger après 13 mois (réglementaire CB) |
| **Sécurité** | Chiffrement, accès restreint |
| **Droit d'accès** | Le client peut demander ses données |
| **Droit à l'effacement** | Complexe : obligations légales de conservation |
| **Privacy by design** | Tokenisation, pseudonymisation |

### Conflit RGPD vs obligations bancaires

- **Conservation** : RGPD dit minimiser, LCB-FT dit conserver 5 ans
- **Solution** : conservation minimum légal, accès restreint, chiffrement
- **DPO** (Data Protection Officer) : obligatoire pour les établissements de paiement$$,
'["Données de paiement = données personnelles au sens du RGPD","Minimisation : ne collecter que le strict nécessaire","Conflit : RGPD (minimiser) vs LCB-FT (conserver 5 ans)","Privacy by design : tokenisation et pseudonymisation"]'::jsonb,
2, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.3.3-lcbft', 'mod-4.3-conformite', 'LCB-FT : Lutte contre le blanchiment',
$$## Cadre réglementaire

La **LCB-FT** (Lutte Contre le Blanchiment de capitaux et le Financement du Terrorisme) est transposée en droit national depuis les directives européennes (6ème directive, 2024).

### Obligations des établissements de paiement

| Obligation | Description |
|-----------|-------------|
| **KYC** (Know Your Customer) | Identification et vérification de l'identité |
| **Vigilance continue** | Surveillance des transactions |
| **Déclaration de soupçon** | Vers Tracfin (France) si anomalie |
| **Gel des avoirs** | Sur instruction des autorités |
| **Conservation** | Documents 5 ans après fin de relation |

### Signaux d'alerte

- Transactions fractionnées juste sous les seuils
- Virements vers des pays à risque
- Structures complexes sans justification économique
- Incohérence entre profil client et activité

### Scoring LCB-FT

| Critère | Score |
|---------|-------|
| Pays à risque (liste GAFI) | +30 |
| PEP (Personne Politiquement Exposée) | +25 |
| Transactions fragmentées | +20 |
| Nouveau client + gros montant | +15 |
| Secteur sensible (crypto, jeux) | +15 |

> Seuil d'alerte typique : score > 60 → investigation manuelle.$$,
'["KYC = Know Your Customer, identification obligatoire","Déclaration de soupçon vers Tracfin (autorité française)","Conservation 5 ans après fin de relation client","PEP + pays à risque + fractionnement = signaux d''alerte"]'::jsonb,
3, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.3.4-interactions', 'mod-4.3-conformite', 'Interactions entre cadres réglementaires',
$$## La jungle réglementaire du paiement

| Cadre | Émetteur | Portée |
|-------|----------|--------|
| PCI DSS | PCI SSC (industrie) | Mondial, données de carte |
| DSP2/SCA | UE | EEE, services de paiement |
| RGPD | UE | EEE, données personnelles |
| LCB-FT | UE/national | EEE, lutte blanchiment |
| NIS2 | UE | EEE, cybersécurité |
| DORA | UE | EEE, résilience numérique (finance) |

### Interactions

```
     PCI DSS ←→ RGPD
       ↑   ↘      ↑
       |    DSP2   |
       ↓   ↗      ↓
    NIS2  ←→  LCB-FT
       ↑
       |
     DORA
```

### Exemples de conflits et synergies

| Sujet | PCI DSS | RGPD | Résolution |
|-------|---------|------|-----------|
| Stockage PAN | Chiffré OK | Minimiser | Tokenisation (satisfait les deux) |
| Logs | Traçabilité complète | Minimisation | Anonymiser les données personnelles dans les logs |
| Conservation | Pas de limite | 13 mois (CB) / 5 ans (LCB-FT) | Appliquer la plus longue obligation légale |
| Notification breach | Pas d'obligation directe | 72h CNIL | Notification CNIL + schémas + clients |

### DORA (Digital Operational Resilience Act)

Depuis janvier 2025, DORA impose aux établissements financiers :
- Tests de résilience réguliers
- Gestion des risques ICT
- Notification d'incidents graves
- Gestion des fournisseurs tiers critiques$$,
'["6+ cadres réglementaires s''appliquent simultanément au paiement","Tokenisation résout conflit PCI DSS (chiffrer) vs RGPD (minimiser)","DORA (2025) = résilience numérique obligatoire pour les institutions financières","Notification breach : 72h CNIL (RGPD) + schémas + clients"]'::jsonb,
4, 40) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Module 4.4 – Audit & Tests d'intrusion (4 chapters)
-- =============================================================================

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.4.1-methode', 'mod-4.4-audit', 'Méthode d''audit PCI DSS',
$$## L'audit PCI DSS

### Phases de l'audit

1. **Cadrage** : définir le périmètre (CDE), les flux de données, les intervenants
2. **Collecte** : politiques, procédures, configurations, logs
3. **Tests** : scans de vulnérabilité, tests d'intrusion, interviews
4. **Rédaction** : ROC (Report on Compliance) ou SAQ
5. **Remédiation** : plan d'action pour les non-conformités
6. **Certification** : AOC (Attestation of Compliance)

### Types de tests

| Test | Outil | Fréquence |
|------|-------|-----------|
| Scan ASV | Qualys, Nessus | Trimestriel |
| Test d'intrusion external | Pentest | Annuel |
| Test d'intrusion interne | Pentest | Annuel |
| Test de segmentation | Pentest | Biannuel |
| Revue de code | SAST (Fortify, Checkmarx) | À chaque release |

### Pièges courants

- Sous-estimer le périmètre (oublier le WiFi guest, les logs)
- Ne pas documenter l'approche personnalisée
- Considérer la conformité comme un projet vs un processus continu$$,
'["Audit PCI = cadrage → collecte → tests → ROC → remédiation → AOC","Scan ASV trimestriel + pentest annuel = minimum","La conformité est un processus continu, pas un projet ponctuel","Périmètre souvent sous-estimé : WiFi, logs, backups"]'::jsonb,
1, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.4.2-owasp', 'mod-4.4-audit', 'OWASP Top 10 et vulnérabilités paiement',
$$## OWASP Top 10 (2021) appliqué au paiement

| # | Vulnérabilité | Exemple en paiement |
|---|--------------|---------------------|
| A01 | Broken Access Control | Accès admin au backoffice sans MFA |
| A02 | Cryptographic Failures | PAN stocké en clair dans les logs |
| A03 | Injection | SQL injection sur la page de paiement |
| A04 | Insecure Design | Architecture sans segmentation |
| A05 | Security Misconfiguration | TLS 1.0 encore actif sur le serveur |
| A06 | Vulnerable Components | Log4j dans le middleware |
| A07 | Auth Failures | Session fixation après authentification |
| A08 | Software/Data Integrity | Plugin JS modifié sur la page checkout |
| A09 | Logging Failures | Pas de log des accès aux données de carte |
| A10 | SSRF | Le serveur de paiement peut requêter des URLs internes |

### Focus : A08 – Intégrité des scripts de paiement

PCI DSS v4.0.1 exigence **6.4.3** impose :
- Inventaire de tous les scripts JavaScript sur les pages de paiement
- Vérification d'intégrité (hash SRI)
- Autorisation explicite de chaque script

```html
<script src="https://gateway.example.com/checkout.js"
        integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K..."
        crossorigin="anonymous">
</script>
```

> **Attaque Magecart** : injection de JavaScript malveillant sur les pages de paiement pour voler les données de carte en temps réel.$$,
'["OWASP Top 10 : guide des vulnérabilités web les plus critiques","A02 : PAN en clair dans les logs = non-conformité PCI DSS immédiate","Exigence 6.4.3 : inventaire et hash SRI de tous les scripts JS","Magecart : skimming JavaScript sur les pages de paiement"]'::jsonb,
2, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.4.3-pentest', 'mod-4.4-audit', 'Tests d''intrusion sur composants de paiement',
$$## Méthodologie de pentest monétique

### Cibles spécifiques

| Composant | Tests |
|-----------|-------|
| Page de paiement | XSS, injection, Magecart, bypass 3DS |
| API de paiement | Authentification, autorisation, rate limiting |
| Backoffice | Accès admin, élévation de privilèges |
| Switch/HSM | Tests réseau, fuzzing de protocole |
| Mobile app | Reverse engineering, MitM, stockage local |

### Outils

| Outil | Usage |
|-------|-------|
| Burp Suite | Proxy web, scanner, intruder |
| Nmap | Scan de ports, OS fingerprinting |
| SQLMap | Injection SQL automatisée |
| Wireshark | Analyse de trafic réseau |
| Frida | Instrumentation dynamique (mobile) |
| OWASP ZAP | Scanner de vulnérabilités web |

### Scénario type : bypass du montant

```
1. Intercepter la requête de paiement (Burp Suite)
2. Modifier le champ "amount" de 100.00 à 0.01
3. Transmettre au serveur
4. Vérifier si le serveur valide le montant côté serveur
```

**Si le montant est modifiable** → vulnérabilité critique (validation côté client uniquement).

### Rapport de pentest

- Classification des vulnérabilités (CVSS 3.1)
- Impact business
- Preuve d'exploitation (screenshots, logs)
- Recommandations de remédiation
- Plan de remédiation priorisé$$,
'["Pentest monétique : page de paiement, API, backoffice, switch, mobile","Burp Suite = outil principal pour les tests web","Bypass montant = vulnérabilité critique si validation côté client","Rapport : CVSS, impact business, preuve, recommandations"]'::jsonb,
3, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.4.4-incident', 'mod-4.4-audit', 'Réponse à incident et forensics',
$$## Plan de réponse à incident (PRI)

### Les 6 phases NIST

| Phase | Actions |
|-------|---------|
| 1. **Préparation** | Formation, outils, procédures, contacts |
| 2. **Identification** | Détecter l'incident, évaluer la gravité |
| 3. **Containment** | Isoler les composants compromis |
| 4. **Éradication** | Supprimer la menace (malware, accès) |
| 5. **Recovery** | Restaurer les services, surveiller |
| 6. **Leçons apprises** | Post-mortem, amélioration continue |

### Forensics en environnement de paiement

| Étape | Action |
|-------|--------|
| Préservation | Image disque, copie des logs (lecture seule) |
| Analyse timeline | Reconstituer la chronologie des événements |
| Analyse mémoire | Volatility pour extraire les artefacts RAM |
| Analyse réseau | pcap, flux DNS, connexions sortantes |
| Analyse malware | Sandbox, reverse engineering |

### Notifications obligatoires

| Destinataire | Délai | Cadre |
|-------------|-------|-------|
| CNIL | 72h | RGPD |
| Schémas (Visa, MC) | Immédiat | Règles schéma |
| Acquéreur | Immédiat | Contrat |
| Clients affectés | Sans délai injustifié | RGPD |
| ANSSI | 24h (NIS2) | NIS2 |

### Exemple de timeline d'incident

```
J-30 : Injection de Magecart JS sur page checkout (non détecté)
J-0  : Détection par le schéma Visa (alertes de fraude)
J+1  : Containment (retrait du script, isolation serveur)
J+2  : Forensics (analyse des logs, timeline)
J+3  : Notification CNIL + schémas + acquéreur
J+7  : Notification clients
J+30 : Rapport final + plan de remédiation
```

> **Statistique** : Le temps moyen de détection d'une breach est de **197 jours** (IBM Cost of a Data Breach 2024).$$,
'["6 phases NIST : préparation, identification, containment, éradication, recovery, leçons","Notification CNIL sous 72h (RGPD), ANSSI sous 24h (NIS2)","Forensics : image disque, timeline, analyse RAM, pcap","Temps moyen de détection d''une breach = 197 jours"]'::jsonb,
4, 40) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Module 4.5 – Gestion des risques (3 chapters)
-- =============================================================================

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.5.1-methodo', 'mod-4.5-risques', 'Méthodologies d''analyse de risques',
$$## ISO 27005 et EBIOS RM

### ISO 27005

Standard international pour la gestion des risques de sécurité de l'information :
1. **Établir le contexte** : périmètre, critères de risque
2. **Identifier les risques** : menaces × vulnérabilités × actifs
3. **Analyser les risques** : probabilité × impact
4. **Évaluer les risques** : comparer aux critères d'acceptation
5. **Traiter les risques** : accepter, réduire, transférer, éviter

### EBIOS RM (ANSSI, 2018)

| Atelier | Objectif |
|---------|---------|
| 1. Cadrage | Missions, valeurs métier, périmètre |
| 2. Sources de risques | Qui veut nous attaquer ? (profils d'attaquants) |
| 3. Scénarios stratégiques | Chemins d'attaque de haut niveau |
| 4. Scénarios opérationnels | Techniques et tactiques détaillées |
| 5. Traitement du risque | Mesures de sécurité, risque résiduel |

### Matrice de risque

| Probabilité \ Impact | Faible | Moyen | Élevé | Critique |
|----------------------|--------|-------|-------|----------|
| **Très probable** | Moyen | Élevé | Critique | **Inacceptable** |
| **Probable** | Faible | Moyen | Élevé | Critique |
| **Peu probable** | Faible | Faible | Moyen | Élevé |
| **Rare** | Faible | Faible | Faible | Moyen |$$,
'["ISO 27005 : identifier → analyser → évaluer → traiter les risques","EBIOS RM : 5 ateliers, méthode française (ANSSI)","Risque = probabilité × impact","4 traitements : accepter, réduire, transférer, éviter"]'::jsonb,
1, 45) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.5.2-cartographie', 'mod-4.5-risques', 'Cartographie des risques monétiques',
$$## Les 10 risques majeurs en monétique

| # | Risque | Probabilité | Impact | Niveau |
|---|--------|------------|--------|--------|
| R1 | Breach de données de carte | Probable | Critique | **Critique** |
| R2 | Fraude organisée (CNP) | Très probable | Élevé | **Critique** |
| R3 | Indisponibilité du switch | Peu probable | Critique | **Élevé** |
| R4 | Compromission HSM | Rare | Critique | **Élevé** |
| R5 | Magecart (skimming web) | Probable | Élevé | **Élevé** |
| R6 | Fraud as a Service (FaaS) | Probable | Moyen | **Moyen** |
| R7 | Insider threat | Peu probable | Élevé | **Moyen** |
| R8 | Supply chain attack | Peu probable | Élevé | **Moyen** |
| R9 | Ransomware | Probable | Élevé | **Élevé** |
| R10 | Erreur de configuration | Très probable | Moyen | **Élevé** |

### Pour chaque risque : traitement

| Risque | Traitement | Mesure |
|--------|-----------|--------|
| R1 | Réduire | Chiffrement, tokenisation, segmentation |
| R2 | Réduire | 3DS2, scoring ML, vélocité |
| R3 | Réduire | HA actif/actif, circuit breaker |
| R4 | Transférer | Assurance + certification PCI HSM |
| R5 | Réduire | SRI, CSP, exigence 6.4.3 |
| R9 | Réduire + Transférer | Backups, assurance cyber |
| R10 | Réduire | IaC, revue de configuration, SCCM |$$,
'["10 risques majeurs cartographiés avec probabilité et impact","R1 (breach) et R2 (fraude CNP) = risques critiques","Chaque risque mappé à un traitement : réduire, transférer, accepter, éviter","Magecart = risque élevé, adressé par SRI + CSP + PCI 6.4.3"]'::jsonb,
2, 45) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-4.5.3-gouvernance', 'mod-4.5-risques', 'Gouvernance et indicateurs de risque',
$$## Le comité des risques

### Composition typique

| Rôle | Responsabilité |
|------|---------------|
| RSSI / CISO | Pilotage de la politique de sécurité |
| DPO | Conformité RGPD |
| Risk Manager | Analyse et suivi des risques |
| CTO | Architecture et choix techniques |
| Compliance Officer | PCI DSS, DSP2, LCB-FT |
| Représentant métier | Contexte business, appétence au risque |

### KRI (Key Risk Indicators)

| KRI | Seuil d'alerte | Source |
|-----|----------------|--------|
| Taux de fraude (bps) | > 5 bps | Transactions |
| Temps de détection breach | > 72h | SOC |
| Vulnérabilités critiques non corrigées | > 0 après 30 jours | Scanner |
| Taux de conformité PCI | < 100% | Audit |
| Temps de résolution incident (MTTR) | > 4h | ITSM |
| Nombre de Finding d'audit ouverts | > 5 | QSA |

### Appétence au risque

L'**appétence au risque** définit le niveau de risque acceptable :
- Risque critique → jamais acceptable
- Risque élevé → réduction obligatoire dans les 90 jours
- Risque moyen → plan d'action dans les 6 mois
- Risque faible → accepté et monitoré

### Reporting

Le comité des risques produit un **tableau de bord trimestriel** :
- Cartographie mise à jour
- KRI avec tendances
- État de remédiation des non-conformités
- Incidents de la période
- Évolution du paysage de menaces$$,
'["Comité des risques : RSSI, DPO, Risk Manager, CTO, Compliance","KRI = indicateurs clés de risque (taux de fraude, MTTR, conformité PCI)","Appétence au risque : seuils d''acceptation par niveau de risque","Tableau de bord trimestriel avec cartographie et tendances"]'::jsonb,
3, 40) ON CONFLICT (id) DO NOTHING;
