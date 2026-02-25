# Analyse Comparative : Plateforme MoneTIC vs Document PMP (ENSICAEN)

Ce rapport évalue dans quelle mesure la plateforme actuelle "MoneTIC" répond aux exigences et architectures décrites dans l'article "Mise en œuvre et sécurisation d'une plateforme monétique pédagogique" (Sulmont, Pasquet, Reynaud - ENSICAEN).

## 1. Architecture de Base et Cinématique (✅ Couvert / Amélioré)
**Document :** Exige une transaction de bout en bout simulant une banque émettrice (ENSIBANK A) et une banque acquéreur (ENSIBANK B), avec routage, acquisition et autorisation.
**MoneTIC :** Fait exactement cela de manière **très détaillée** via une architecture microservices (Node.js/TypeScript) :
- `sim-pos-service` + Gateway (Point d'acceptation)
- `sim-acquirer-service` (Banque Acquéreur)
- `sim-network-switch` (Routage réseau comme le GCB)
- `sim-issuer-service` + `sim-auth-engine` (Banque Émettrice & Autorisation avec contrôles de solde/limites)
- La cinématique de transaction (ISO 8583) est strictement respectée avec les bons codes de retour (00, 51, 14, etc.).

## 2. Les 3 Domaines de Sécurité (✅ Couvert)
**Document :** Sécurité aux points d'acceptation, sécurité acquéreur, sécurité émetteur.
**MoneTIC :** 
- **Point d'acceptation :** Couvert par `tpe-web`. Le PIN est crypté dès l'interface en format PIN Block ISO-9564-1.
- **Acquéreur :** Protégé au niveau du routage et des logs avec un système d'API Gateway et circuit breacking.
- **Émetteur :** Géré par le `sim-auth-engine` couplé au `sim-fraud-detection` pour l'authentification forte, le scoring de risque et l'autorisation.

## 3. Personnalisation de Cartes et PKI (✅ Couvert / Simulé)
**Document :** Atelier de personnalisation de cartes et PKI propre pour générer des certificats intégrés aux TPE.
**MoneTIC :**
- Totalement géré par le `hsm-web` (interface) et les services `sim-card-service`, `crypto-service` et `hsm-simulator`. 
- MoneTIC génère des cartes virtuelles (PAN Luhn, CVV, PIN hash) et simule le HSM pour la gestion des clés cryptographiques et opérations de PIN/MAC.

## 4. Sécurité Logique et Physiques (⚠️ Différence Conceptuelle)
**Document :** Décrit un environnement ISO27002, des salles serveurs isolées, et du matériel lourd (GAB physiques de 750kg, embosseuses physiques).
**MoneTIC :**
- MoneTIC est un **écosystème 100% logiciel**. Elle n'inclut pas les GAB physiques, les lecteurs physiques ni les "vrai-faux billets". 
- Cependant, la **sécurité logique** (normes PCI/PA-DSS) est extrêmement bien simulée : l'isolation est faite via un réseau Docker sécurisé (`pmp-network`), les communications entre services utilisent gRPC, et l'API Gateway agit comme pare-feu/routeur restrictif (Rate Limiting, Helmet, validation de Token JWT).

## 5. Aspects Pédagogiques (🌟 Fortement Amélioré)
**Document :** Travaux pratiques manipulatoires, manuels utilisateurs, analyse d'une trame serveur.
**MoneTIC :** 
- Dépasse les concepts du document de base en intégrant une dimension ludique et moderne avec un **réel portail étudiant complet** (`Cusus`, `portal/student`).
- Les étudiants disposent de "Labs", d'exercices avec hints, d'un terminal d'attaque (AttackBox pour des CTFs), et de validation automatique de scores (≥80% passe au module suivant). 
- Le formateur dispose d'un **Monitoring Live** sur WebSockets pour superviser la promotion et peut injecter de la latence ou de la fraude sur le réseau de laboratoire (`Portal/instructor/lab-control`) - ce qui est bien plus dynamique que le concept de base ENSICAEN.

---

### Conclusion Générale
La plateforme **MoneTIC fait tout ce que le document décrit d'un point de vue logiciel, architectural, et cryptographique.** Elle respecte rigoureusement la logique des transactions et des couches de sécurité.
La seule différence réside dans l'abstraction du "matériel" : là où l'ENSICAEN utilisait de vrais terminaux et de vrais automates, MoneTIC virtualise ces équipements (Web POS, Cartes Virtuelles, Simulateur HSM). En contrepartie, **l'aspect pédagogique de MoneTIC est beaucoup plus automatisé, moderne, distribué et interactif (CTF, Parcours en ligne, Monitoring temps réel).**
