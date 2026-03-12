# Explication Intégrale de la Stack Technique (Projet PMP)

La **Plateforme Monétique Pédagogique (PMP)** est un écosystème bancaire 100% logiciel. Son but est de simuler, pour des étudiants/apprenants, le fonctionnement complet d'une carte bancaire, d'un terminal de paiement (TPE), des banques (Acquéreur et Émetteur), du réseau (Switch), et des mécanismes de sécurité matérielle (HSM) et anti-fraude.

Le projet suit une architecture résolument orientée **Microservices** et **Multi-Applications Frontend**, le tout orchestré avec **Docker**. 

Voici le détail complet de la stack, du rôle de chaque fonction, et comment tout interagit. 

---

## 1. La Stack Frontend (Interfaces Utilisateurs)

Le projet utilise une approche moderne, principalement orientée autour de l'écosystème **React** et **Next.js**, avec un design system commun appelé "Dark Neon Glassmorphism" (utilisant TailwindCSS).

### Technologies Principales :
*   **Next.js 14 / React 18** : Framework principal pour le rendu, l'optimisation, et le routage des applications.
*   **Vue.js 3 / Vite** : Utilisé pour certaines applications spécifiques (comme le Terminal de paiement marchand ou les dashboard monitorings) pour des raisons de réactivité ou de légèreté.
*   **Tailwind CSS** : Framework utilitaire pour le design system.
*   **TypeScript** : Utilisé partout pour garantir le typage fort de bout en bout.

### Les Applications (Dossier `frontend/`) :
1.  **Portal (`portal` - Port 3001)** : Le cœur du système. C'est un Hub Multi-rôles en Next.js. Il gère la navigation entre les différents profils (Client, Marchand, Étudiant, Formateur).
2.  **TPE-Web (`tpe-web` / `merchant` - Port 3000)** : Simulateur de Terminal de Paiement (POS). Next.js ou Vue.js. C'est ici qu'on insère virtuellement la carte et tape le code PIN.
3.  **User-Cards-Web (`user-cards-web` - Port 3004)** : Interface Next.js pour l'utilisateur final (Client). Permet de créer des cartes virtuelles, voir son solde, etc.
4.  **HSM-Web (`hsm-web` - Port 3006)** : Dashboard Next.js de sécurité. Simule l'accès à un Hardware Security Module (module de sécurité matériel), pour gérer les clés de chiffrement et voir les vulnérabilités.
5.  **3DS Challenge UI (`3ds-challenge-ui` - Port 3088)** : Petite app Vite/React simulant la page de sécurité "3D Secure" (le code OTP reçu par SMS pour valider un achat internet).
6.  **Monitoring Dashboard (`monitoring-dashboard` - Port 3082)** : Interface temps-réel avec des graphiques D3.js pour surveiller les flux de la plateforme.

---

## 2. La Stack Backend (Microservices Core)

Le backend est découpé en près de 20 petits services (Microservices), chacun simulant une étape du processus bancaire réel.

### Technologies Principales :
*   **Node.js & Express.js** : La vaste majorité (voire l'intégralité) des microservices sont écrits en Node.js avec Express, le tout typé en **TypeScript**.
*   **gRPC & REST API** : Les communications inter-services se font par API REST HTTP standards (via une Gateway) ou par gRPC pour les communications très rapides et internes (ex: entre le POS et l'Acquéreur).

### Rôle et Fonctionnement des Services (Dossier `backend/`) :

*   **L'Entrée Principale :**
    *   `api-gateway` (Port 8000) : Le point d'entrée unique. Tout le trafic Frontend passe par lui. Il gère la sécurité (Rate Limiting, CORS), l'authentification (JWT), et dispatche la requête vers le bon microservice.

*   **Les Services "Métiers" (Banque et E-commerce) :**
    *   `sim-card-service` (Port 8001) : Génère et gère les cartes virtuelles (génération des numéros de cartes PAN selon l'algorithme de Luhn).
    *   `sim-pos-service` (Port 8002) : Reçoit la requête du Terminal TPE (ex: "Le client veut payer 50€"), vérifie le format des données, et transmet à la banque du marchand.
    *   `sim-acquirer-service` (Port 8003) : La Banque cible (celle du marchand). Elle logge la transaction et la route vers le réseau mondial.
    *   `sim-network-switch` (Port 8004) : Simule le réseau mondial (type Visa/Mastercard). Il lit les 6 premiers numéros de la carte (BIN) pour savoir à quelle banque émettrice envoyer la requête.
    *   `sim-issuer-service` (Port 8005) : La Banque de l'utilisateur. Elle va vérifier si le compte a les fonds nécessaires.

*   **Les Services de Moteur (Décisionnels) :**
    *   `sim-auth-engine` (Port 8006) : C'est le cerveau de la banque de l'utilisateur. C'est lui qui dit "Oui" ou "Non" à la transaction en checkant la base de données, le code PIN et le moteur de fraude.
    *   `sim-fraud-detection` (Port 8007) : Analyse ultra-rapide (souvent via Redis) pour détecter si la transaction est frauduleuse.

*   **Les Services de Sécurité & Cryptographie :**
    *   `crypto-service` (Port 8010) : Chiffre et déchiffre les blocs PIN.
    *   `hsm-simulator` (Port 8011) : Apporte les clés de chiffrement "infalsifiables".
    *   `key-management` (Port 8012) : Gère le cycle de vie des clés cryptographiques.
    *   `acs-simulator` : Gère le protocole 3D Secure.

---

## 3. La Stack Data & Infrastructure (Bases de données & Ops)

Pour faire tourner et communiquer tout cela, plusieurs outils d'infrastructure open-source sont mobilisés.

### Bases de Données & Caches :
*   **PostgreSQL 14** : La base de données principale (persistante). Elle stocke les utilisateurs, le statut des cartes virtuelles, l'historique des transactions refusées ou approuvées, et la configuration.
*   **Redis 7** : Base de données clé-valeur en mémoire cache. Utilisée pour le "Rate limiting", les sessions utilisateurs, les vérifications ultra-rapides du système de détection de fraude.

### Monitoring & Logs :
*   **Elasticsearch & Kibana (ELK)** : Utilisés par le `monitoring-service` pour stocker et analyser les logs massifs des transactions et fournir des données au dashboard frontal.
*   **Prometheus & Grafana** : Scrappent les différents microservices (via le path `/metrics`) pour afficher la santé serveur (CPU, Ram, requêtes par seconde, etc.). Outils vitaux pour les étudiants "sysadmins".

### Sécurité Spécifique (CTF) :
*   `ctf-attackbox` : Un conteneur spécial conçu pour l'apprentissage. Il permet aux étudiants de lancer des attaques (sniffing réseau) sur la plateforme isolée.

---

## 4. Comment elles fonctionnent toutes ensemble ? (Le Flux)

Imaginons qu'un client achète un cookie à 5€ sur un simulateur marchand.

1.  **Frontend** : Le client tape son PAN (numéro de carte), sa date d'expiration, et son PIN sur `tpe-web` (React/Vue).
2.  **Routage** : La requête HTTP part à l'`api-gateway` (Express), qui vérifie le jeton de sécurité puis l'envoie au `sim-pos-service`.
3.  **Chiffrement** : Le POS n'envoie JAMAIS le code PIN en clair. Il demande d'abord au `crypto-service` de le chiffrer avec une clé fournie par le `hsm-simulator`. 
4.  **Routage Bancaire** : Le message formaté (norme bancaire ISO 8583) passe du POS à l'`acquirer` (Banque marchand), qui l'envoie au `network-switch` (Visa/Mastercard). Le Switch l'envoie à l'`issuer` (Banque Client).
5.  **Autorisation** : L'issuer demande à l'`auth-engine` de valider. L'`auth-engine` demande au `crypto-service` de déchiffrer le PIN, demande à la DB **PostgreSQL** s'il y a 5€ sur le compte, et demande au `fraud-detection` (qui checke **Redis**) si ce n'est pas bizarre d'acheter ça à cette heure-là.
6.  **Réponse** : Tout est OK. L'autorisation passe à VERTE. La réponse fait le trajet inverse : Auth -> Issuer -> Switch -> Acquirer -> Gateway -> Frontend. Le TPE affiche "Paiement Accepté".

---

## 5. Recommandations pour la réorganisation (CI/CD)

Puisque tu dois mettre en place un pipeline CI/CD et avoir un dossier propre, voici le diagnostic de la structure actuelle et nos recommandations :

### Le problème actuel du monorepo :
Pour l'instant, c'est un "monorepo" géant. Tous les microservices backend sont dans `backend/`, tous les frontends dans `frontend/`, et Docker à la racine. Le fichier `docker-compose.yml` est gargantuesque (1400 lignes !). Si tu pousses un changement uniquement sur le `sim-card-service`, un CI mal configuré va re-builder tous les frontends et les 20 backends. C'est lourd et coûteux.

### Pistes de réorganisation de l'arborescence :

```text
/PMP-Platform
│
├─ .github/workflows/          <-- (Tes futurs pipelines CI/CD : un pipeline par domaine)
│
├─ frontend/                   <-- Espace Frontends
│  ├─ shared-ui/               <-- (À créer : regrouper le Design System pour factoriser)
│  ├─ apps/
│  │  ├─ portal/
│  │  ├─ pos-terminal/         <-- (Anciennement tpe-web)
│  │  ├─ user-cards/
│  │  └─ monitoring-dashboard/
│  └─ docker/                  <-- Dockerfiles spécifiques aux fronts
│
├─ backend/                    <-- Espace Backends (Microservices)
│  ├─ shared-libs/             <-- (Utilitaires partagés, ex: types TS, parsing ISO 8583)
│  ├─ gateway/                 <-- api-gateway
│  ├─ core-banking/            <-- issuer, acquirer, switch, pos
│  ├─ security/                <-- hsm, crypto, key-management, acs
│  ├─ data-analytics/          <-- paramétrage fraud et auth engine
│  └─ docker/                  <-- Dockerfiles du backend
│
├─ infrastructure/             <-- Déploiement et DevOps (Le cœur de ta CI/CD)
│  ├─ local/                   <-- docker-compose pour le dev (splité !)
│  │  ├─ docker-compose.db.yml <-- Postgres, Redis
│  │  ├─ docker-compose.observability.yml <-- ELK, Prometheus, Grafana
│  │  └─ docker-compose.app.yml <-- Frontends + Backends
│  ├─ kubernetes/              <-- (Si vous prévoyez de passer sur K8s plus tard)
│  └─ scripts/                 <-- Tes scripts bash `start-all.sh`, `check_health.ps1`
│
├─ docs/                       <-- Documentation (Architecture, Readme, etc)
└─ tests/                      <-- Tests E2E globaux (Playwright, Jest intégration globale)
```

### Stratégie CI/CD recommandée :
1.  **Pipeline Lint & Tests Unitaires** : Doit tourner en parallèle sur TOUT le dépôt à chaque Pull Request (PR).
2.  **Pipeline de Build Séparé** : Utiliser la détection de chemins (`paths: ['backend/core-banking/**']` dans GitHub Actions ou GitLab CI) pour ne re-builder l'image Docker que du microservice qui a été modifié.
3.  **Docker Registry** : Pousse chaque microservice avec un tag spécifique (ex: `pmp-sim-acquirer:v1.2.0`) dans un repo Docker (DockerHub, GHCR).
4.  **Tests E2E (Déploiement éphémère)** : Sur la branche `developpement-thomas`, le pipeline pourrait monter tout le `docker-compose` dans une VM temporaire, faire tourner tes tests automatiques Playwright (qui doivent être à la racine ou dans `/tests`), puis tout détruire si c'est OK, garantissant la non-régression de ton écosystème bancaire !
