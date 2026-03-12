# Analyse Complète des Services Frontend

Ce document présente une analyse détaillée de l'architecture frontend du projet PMP, en identifiant chaque service, son rôle et ses objectifs spécifiques au sein de l'écosystème.

## 1. Vue d'Ensemble de l'Architecture

Le frontend est structuré en **Micro-Frontends** distincts, chacun ayant une responsabilité métier précise, orchestrés ou reliés par un **Portail Central**.

*   **`portal`** : Le tableau de bord principal unifiant l'accès.
*   **`tpe-web`** : Le terminal de paiement électronique (interface vendeur).
*   **`user-cards-web`** : Service de gestion et de création de cartes.
*   **`hsm-web`** : Interface d'administration du module de sécurité hardware.
*   **`3ds-challenge-ui`** : Interface de simulation pour l'authentification forte (ACS).

---

## 2. Analyse Détaillée par Application

### A. TPE Web (Terminal de Paiement)
**Localisation** : `frontend/tpe-web/lib`

Ce module simule un terminal de paiement physique. Il contient la logique la plus complexe du frontend pour gérer le cycle de vie d'une transaction.

| Service | Fichier | But & Objectifs |
| :--- | :--- | :--- |
| **Transaction Preparation Service** | `TransactionPreparation.service.ts` | **But :** Simuler le comportement "Offline" et matériel d'un TPE avant toute connexion réseau.<br><br>**Objectifs :**<br>• **Simulation Matériel** : Simuler la lecture de carte (Puce/Piste).<br>• **Contrôles Locaux** : Valider le PAN (Date, Luhn) sans appeler la banque.<br>• **Gestion PIN** : Déterminer si un code PIN est requis (CVM Limit).<br>• **Construction ISO** : Créer le message ISO 8583 standard pour l'envoi. |
| **API Client & Orchestrator** | `api-client.ts` | **But :** Gérer la couche "Online" et l'orchestration des appels vers le backend.<br><br>**Objectifs :**<br>• **Orchestration** : Coordonner le flux complet : *Detection Fraude* → *3D-Secure* → *Autorisation*.<br>• **Mode Hybride** : Basculer dynamiquement entre le mode "Simulation" (démo sans backend) et le mode "Connecté".<br>• **Vérification 3DS** : Gérer la validation des challenges OTP. |

### B. User Cards Web (Gestion Cartes)
**Localisation** : `frontend/user-cards-web/lib` et `app/api`

Ce module est dédié à la création pédagogique de cartes bancaires valides pour les tests.

| Service | Fichier | But & Objectifs |
| :--- | :--- | :--- |
| **Card Generator Engine** | `card-engine/generator.ts` | **But :** Produire des données cartes mathématiquement valides pour différents réseaux et gammes.<br><br>**Objectifs :**<br>• **Support Multi-Scheme** : Générer des BINs spécifiques pour VISA et MASTERCARD.<br>• **Typologie** : Gérer les gammes (Debit, Credit, Gold, Corporate) avec leurs règles BIN associées.<br>• **Validité Crypto** : Calculer le checksum de Luhn correct et générer des CVV déterministes.<br>• **Styling** : Assigner des attributs visuels (couleurs, gradients) selon le type de carte. |
| **Card API Route** | `app/api/generate-card/route.ts` | **But :** Exposer le moteur de génération via une API accessible au frontend.<br><br>**Objectifs :**<br>• Recevoir les configurations de génération (Nom, Type, Scheme).<br>• Renvoyer un objet carte complet et formaté. |

### C. HSM Web (Hardware Security Module)
**Localisation** : `frontend/hsm-web`

Interface sécurisée pour visualiser et gérer les clés et certificats.

| Service | Fichier | But & Objectifs |
| :--- | :--- | :--- |
| **HSM Proxy Guard** | `proxy.ts` | **But :** Sécuriser et segmenter l'accès aux fonctions cryptographiques sensibles.<br><br>**Objectifs :**<br>• **Segmentation par Rôle** :<br>&nbsp;&nbsp;- *Marchand* : Accès limité aux certificats.<br>&nbsp;&nbsp;- *Étudiant* : Accès aux scénarios pédagogiques.<br>&nbsp;&nbsp;- *Formateur* : Accès administrateur complet. |

### D. 3DS Challenge UI (Authentification Forte)
**Localisation** : `frontend/3ds-challenge-ui`

Simulateur de la page "Banque" qui demande le code OTP.

| Service | Fichier | But & Objectifs |
| :--- | :--- | :--- |
| **Challenge Logic** | `ChallengeUI.tsx` | **But :** Simuler l'intersection avec l'ACS (Access Control Server) de la banque émettrice.<br><br>**Objectifs :**<br>• **Interactive Flow** : Guider l'utilisateur à travers les étapes (Auth Initiale -> Challenge -> Validation).<br>• **Validation OTP** : Envoyer l'OTP saisi au simulateur ACS backend (`/challenge/verify`).<br>• **Feedback Visuel** : Afficher le succès/échec avec des explications pédagogiques. |

### E. Portal (Tableau de Bord Unifié)
**Localisation** : `frontend/portal/src`

Le point d'entrée central qui agrège les différentes vues.

| Service | Fichier | But & Objectifs |
| :--- | :--- | :--- |
| **Role Middleware** | `middleware.ts` | **But :** Contrôleur d'accès centralisé pour l'application principale.<br><br>**Objectifs :**<br>• **Routing Intelligent** : Rediriger les utilisateurs vers leurs espaces dédiés (`/student`, `/merchant`, `/admin`) dès l'arrivée.<br>• **Protection** : Bloquer l'accès aux routes non autorisées pour le rôle courant. |

### F. Shared Services (Transverse)
**Localisation** : `frontend/shared/lib`

Bibliothèques partagées pour assurer la cohérence.

| Service | Fichier | But & Objectifs |
| :--- | :--- | :--- |
| **Validation & Formatting** | `validation.ts`, `formatting.ts` | **But :** Standardiser l'affichage et la validation des données financières.<br><br>**Objectifs :**<br>• **Formatage** : Affichage cohérent des montants (Devises) et des dates.<br>• **Sécurité** : Masquage des PANs (ex: `**** 1234`) pour l'affichage logs/UI. |

---

## Conclusion Technique

Le frontend du PMP ne se contente pas d'afficher des données ; il intègre une véritable **intelligence métier déportée**, notamment dans le **TPE Web** (préparation offline) et le **Générateur de Cartes**. L'architecture en micro-services frontend permet de séparer clairement les responsabilités :

1.  **Simulation Matériel** (TPE Web)
2.  **Gestion de Données** (User Cards Web)
3.  **Simulation Bancaire** (3DS UI)
4.  **Orchestration & Sécurité** (Portal & HSM)
