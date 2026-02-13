-- Chapters for Module 3.1 – Architecture des systèmes de paiement

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.1.1-couches', 'mod-3.1-architecture', 'Les 3 couches d''un SI bancaire',
$$## Vue macroscopique

| Couche | Rôle | Exemples | Contrainte temps |
|--------|------|----------|-----------------|
| **Front-office** | Interaction client | TPE, GAB, app mobile, site e-commerce | < 2s |
| **Middle-office** | Traitement, routage, scoring | Switch monétique, autorisation, 3DS Server | < 500 ms |
| **Back-office** | Comptabilité, reporting, litiges | Core banking, clearing, data warehouse | J+1, hebdo |

## Architecture fonctionnelle

```
[Terminal] ←→ [Acquéreur] ←→ [Switch] ←→ [Schéma] ←→ [Switch Émetteur] ←→ [Autorisation]
                    ↓              ↓          ↓              ↓
               [PSP/P2PE]    [Files       [Bases de       [HSM]
                              d'attente]   données]
```

### Composants critiques

- **Switch monétique** : aiguilleur ISO 8583, doit gérer 10 000+ TPS
- **Base temps réel** : plafonds, compteurs d'opposition, clés
- **HSM** : coffre-fort matériel crypto (PIN, CVV, ARQC)
- **Files d'attente** : buffers pour pics et indisponibilités aval$$,
'["3 couches : front-office (<2s), middle-office (<500ms), back-office (J+1)","Switch monétique = aiguilleur central des messages ISO 8583","HSM = coffre-fort matériel pour toutes les opérations crypto","Files d''attente = résilience face aux pics et pannes"]'::jsonb,
1, 60) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.1.2-contraintes', 'mod-3.1-architecture', 'Contraintes opérationnelles et haute disponibilité',
$$## Exigences non fonctionnelles

| Contrainte | Objectif |
|-----------|---------|
| Disponibilité | 99,999 % (5 min d'arrêt/an max) |
| Temps de réponse | < 300 ms bout en bout (autorisation) |
| Traçabilité | Horodatage, conservation 13 mois (réglementaire) |
| Non-répudiation | Signature des messages, journaux d'audit |

## Topologies de déploiement

### Actif/Passif
- Site principal + site de secours (reprise d'activité)
- Bascule manuelle ou automatique
- RPO (Recovery Point Objective) : quelques secondes à minutes
- RTO (Recovery Time Objective) : minutes à heures

### Actif/Actif
- Répartition de charge géographique
- Les deux sites traitent des transactions simultanément
- Coût élevé, latence inter-site à gérer
- RPO ≈ 0, RTO ≈ 0

### Microservices
- Architecture moderne (NGINX, Kafka, Kubernetes)
- Adoptée par les néobanques et fintechs
- Scaling horizontal, déploiement continu
- Gestion de l'état = défi majeur$$,
'["99,999% = 5 minutes d''arrêt par an maximum","< 300 ms de bout en bout pour une autorisation","Actif/Passif = site de secours, Actif/Actif = charge répartie","Microservices : scaling horizontal mais gestion d''état complexe"]'::jsonb,
2, 60) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.1.3-spof', 'mod-3.1-architecture', 'Analyse de défaillance et tendances 2026',
$$## Points de défaillance unique (SPOF)

Un SPOF est un composant dont la panne entraîne l'arrêt de tout le système.

### SPOF typiques en paiement

| Composant | Risque | Solution |
|-----------|--------|----------|
| Base de données unique | Arrêt total | Clustering (Oracle RAC, PostgreSQL Patroni) |
| HSM unique | Plus de crypto = plus de transactions | HSM en cluster actif/actif |
| Switch unique | Plus de routage | Redondance N+1 |
| Lien réseau unique | Isolation du site | Double raccordement opérateur |

### Pattern Circuit Breaker

Principe : si un composant aval est en panne, le système arrête de l'appeler et utilise un fallback.

```
[Transaction] → [Circuit Breaker] → [Base de données]
                       ↓ (si panne)
                  [Cache local]
                  [Réponse dégradée]
```

## Tendances 2026

### Agentic Payments
Les agents IA deviennent des acteurs transactionnels. EMVCo travaille sur l'extension des spécifications pour intégrer ces nouveaux entrants.

### Cloud hybride
Déplacement des workloads sensibles vers des HSM-as-a-Service certifiés. Le contrôle physique est perdu mais la certification du fournisseur atteste de la sécurité.

### Event-driven architecture
Kafka, Apache Pulsar pour le traitement asynchrone des flux de paiement, avec capacité de rejeu et analytics temps réel.$$,
'["SPOF = point dont la panne arrête tout le système","Circuit Breaker = pattern de résilience avec fallback","Agentic Payments = agents IA acteurs transactionnels (EMVCo 2026)","Cloud hybride : HSM-as-a-Service certifiés"]'::jsonb,
3, 60) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Chapters for Module 3.2 – Switch monétique (4 chapters)
-- =============================================================================

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.2.1-role', 'mod-3.2-switch', 'Le switch : chef d''orchestre invisible',
$$## Fonctions du switch monétique

Un switch monétique est un système logiciel/matériel qui :

1. **Reçoit** les messages de transaction des acquéreurs
2. **Analyse** le message (MTI, PAN, montant, etc.)
3. **Route** vers le bon destinataire (émetteur, schéma, autre switch)
4. **Traduit** si nécessaire (versions ISO 8583, champs propriétaires)
5. **Répond** à l'expéditeur

## Tables de routage

Le routage repose sur le **BIN** (Bank Identification Number) :
- 6 à 8 premiers chiffres du PAN
- Associé à un émetteur, un schéma, un pays

| Plage BIN | Émetteur | Schéma | Adresse switch cible | Priorité |
|-----------|----------|--------|---------------------|----------|
| 4970xx | Banque A | Visa | 10.1.2.3:15000 | 1 |
| 4123xx | Banque B | Visa | 10.2.3.4:15000 | 1 |
| 5398xx | Banque C | MC | 10.3.4.5:16000 | 1 |

### Autres critères de routage
- **MCC** : commerçants routés vers processeurs spécialisés
- **Devise** : transactions en USD routées différemment
- **Disponibilité** : fallback si primaire indisponible$$,
'["Switch = concentrateur, routeur, traducteur de messages","Routage BIN : 6-8 premiers chiffres du PAN → émetteur/schéma","Table de routage : plage BIN, adresse, priorité, fallback","Autres critères : MCC, devise, disponibilité"]'::jsonb,
1, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.2.2-traduction', 'mod-3.2-switch', 'Traduction de messages et gestion des erreurs',
$$## Traduction de messages

**Problème** : l'acquéreur utilise ISO 8583:1993, l'émetteur utilise une version propriétaire.

Le switch doit :
- Réordonner les champs
- Convertir les formats (BCD ↔ ASCII)
- Adapter les bitmaps (ajout/suppression de DE)
- Gérer les champs interprétés différemment (ex: DE48)

### Exemple de conversion

```
Entrée (BCD) : DE4 = 0x00 0x00 0x00 0x01 0x23 0x45
= 12345 centimes = 123,45 €

Sortie (ASCII) : DE4 = "000000012345" (12 caractères)
```

## Gestion des erreurs et rejeux

| Erreur | Action du switch |
|--------|-----------------|
| **Timeout** | Émetteur ne répond pas → refus 91 ou second routage |
| **Rejet syntaxique** | Message mal formé → réponse 30 (format error) |
| **Perte de message** | File d'attente persistante |
| **Doublon** | Détection par DE11 (trace number) + DE7 (date) |

### Mécanisme de fallback

```
1. [Transaction] → [Route primaire: Émetteur]
2. Si timeout (750 ms) → retry (2/2)
3. Si échec → [Route secondaire: Schéma]
4. Si échec → refus code 91
```$$,
'["Le switch traduit entre versions ISO 8583 et formats propriétaires","Conversion BCD ↔ ASCII nécessaire pour certains DE","Timeout typique : 750 ms, 2 tentatives avant fallback","Code 91 = émetteur indisponible"]'::jsonb,
2, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.2.3-securite', 'mod-3.2-switch', 'Sécurité et monitoring du switch',
$$## Sécurité du switch

| Mesure | Description |
|--------|-------------|
| Filtrage IP | Seuls les acquéreurs autorisés peuvent se connecter |
| Authentification mutuelle | Certificats TLS entre tous les participants |
| Détection d'intrusion | Analyse des patterns anormaux (même PAN, fréquences élevées) |
| Chiffrement | TLS 1.3 pour toutes les connexions |
| Rate limiting | Limitation du nombre de messages par acquéreur/seconde |

## Attaque par BIN flooding

**Scénario** : Un attaquant envoie 10 000 requêtes/seconde avec des BIN aléatoires via un acquéreur compromis.

**Impact** : Le switch rejette des messages légitimes.

**Contre-mesures** :
- Rate limiting par acquéreur (ex: 1000 msg/s max)
- Blacklist IP dynamique
- Détection d'anomalie sur la distribution des BIN
- Règle iptables : limitation par IP source

```bash
iptables -A INPUT -p tcp --dport 15000 -m hashlimit \\
  --hashlimit-name SWITCH --hashlimit 1000/sec \\
  --hashlimit-burst 500 --hashlimit-mode srcip -j ACCEPT
```

## Monitoring opérationnel

- **Latence** : temps de réponse P50/P95/P99
- **TPS** : transactions par seconde en temps réel
- **Taux de refus** : par code réponse
- **File d'attente** : profondeur, temps d'attente moyen$$,
'["Filtrage IP + TLS mutuel + rate limiting = sécurité de base du switch","BIN flooding : attaque par saturation, contre-mesure = rate limiting par acquéreur","Monitoring : latence P99, TPS, taux de refus, profondeur de file","iptables hashlimit pour limiter le trafic par IP source"]'::jsonb,
3, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-3.2.4-analyse-logs', 'mod-3.2-switch', 'Analyse de logs de routage',
$$## Lecture d'une trace de switch

Extrait de log :

```
14:32:01.123 [RX] FROM acquirer01:0100 PAN=4970... BIN=4970 MTI=0100
14:32:01.124 [ROUTE] BIN=4970 → issuer01 (10.0.0.1:15000) via table primaire
14:32:01.125 [TX] TO issuer01:0100 (forward)
14:32:01.892 [TIMEOUT] issuer01 (no response)
14:32:01.893 [RETRY] Tentative 2/2 → issuer01
14:32:02.481 [TIMEOUT] issuer01
14:32:02.482 [FALLBACK] BIN=4970 → scheme_visa (172.16.0.1:18000)
14:32:02.483 [TX] TO scheme_visa:0100
14:32:02.921 [RX] FROM scheme_visa:0110 code=00
14:32:02.922 [TX] TO acquirer01:0110
```

### Analyse

1. **Timeout à ~770 ms** : configuré à 750 ms (marge réseau)
2. **2 tentatives** vers issuer01 avant fallback
3. **Fallback vers schéma Visa** : route secondaire
4. **Temps total** : 1.8 secondes (long mais transaction sauvée)
5. **Code réponse final** : 00 (accepté)

## Messages « orphelins »

Un message orphelin est une transaction dont l'origine n'est pas retrouvée :
- Le switch a envoyé la requête mais la réponse arrive après le timeout
- Résultat : la transaction est potentiellement autorisée deux fois
- Solution : **stan matching** (DE11 + DE7 + DE41 pour corréler)

## Calcul de capacité

```
5 000 TPS × 512 octets/msg = 2,56 Mo/s = 221 Go/jour
×2 (fêtes) = 5 Mo/s ≈ 40 Mbit/s
```

> Le goulot n'est pas le réseau mais la **CPU** et les **I/O vers la base de données**.$$,
'["Logs de switch : horodatage précis pour chaque étape (RX, ROUTE, TX, TIMEOUT)","Message orphelin = réponse arrivée après timeout, risque de double autorisation","Stan matching : DE11+DE7+DE41 pour corréler requêtes et réponses","Calcul capacité : 5000 TPS × 512 octets = 2,56 Mo/s"]'::jsonb,
4, 40) ON CONFLICT (id) DO NOTHING;
