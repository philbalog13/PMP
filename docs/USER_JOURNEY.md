# 🗺️ Parcours Utilisateur - Plateforme Monétique Pédagogique (PMP)

Ce document décrit le parcours typique d'un utilisateur sur la plateforme, de la création d'une carte virtuelle jusqu'au paiement chez un commerçant.

---

## 🎭 Les Rôles

Il existe deux interfaces principales qui simulent deux acteurs du monde réel :

1.  **Le Client (Porteur de carte)** : Utilise l'application bancaire ("PMP Bank") pour gérer ses cartes.
    *   📍 URL : `http://localhost:3000`
2.  **Le Commerçant (Acquéreur)** : Utilise le Terminal de Paiement Électronique (TPE) pour encaisser.
    *   📍 URL : `http://localhost:3001`

---

## 🚀 Étape 1 : Le Client génère sa carte

**Objectif** : Obtenir un moyen de paiement valide.

1.  **Connexion** : L'utilisateur accède à son espace client (`http://localhost:3000`).
2.  **Tableau de Bord** : Il arrive sur son dashboard "PMP Bank" (style Néo-banque).
3.  **Action** : Il clique sur le bouton **"Nouvelle Carte"** (ou le bouton `+`).
4.  **Résultat** :
    *   Une carte virtuelle 3D apparaît à l'écran.
    *   Elle contient :
        *   Un **PAN** (Primary Account Number) à 16 chiffres (ex: `4100 1234 5678 9010`).
        *   Une **Date d'expiration** (ex: `12/28`).
        *   Un **CVV** (Code de sécurité) au dos (ex: `123`).
    *   *Note Technique* : La carte est générée par le backend (`sim-card-service`), chiffrée, et stockée en base de données.

---

## 🛍️ Étape 2 : Le Commerçant initie une vente

**Objectif** : Encaisser un paiement pour un bien ou un service.

1.  **Initialisation** : Le commerçant allume son TPE (`http://localhost:3001`).
2.  **Saisie** : Sur le pavé numérique du terminal, il tape le montant de la transaction (ex: `42.50 €`).
3.  **Validation** : Il appuie sur la touche **VALIDER** (Verte).
4.  **Attente** : L'écran du TPE affiche "PRÉSENTEZ CARTE".

---

## 💳 Étape 3 : Le Paiement (La "Rencontre")

**Objectif** : Utiliser la carte client sur le terminal commerçant.

*Dans la vraie vie, on insère la carte ou on utilise le sans-contact. Sur la PMP, on simule cette étape :*

1.  **Saisie des données** : Sur l'interface du TPE (à droite, dans le panneau "Simulation"), l'utilisateur (jouant le rôle du client) entre les informations de sa carte fraîchement générée :
    *   Numéro de carte (PAN)
    *   Date d'expiration
    *   CVV
2.  **Action** : Il clique sur **"Simuler Insertion Carte"**.
3.  **Traitement** :
    *   Le TPE affiche "TRAITEMENT EN COURS...".
    *   Une requête part vers le Backend (API Gateway).

---

## ⚙️ Ce qui se passe en coulisses (Invisible pour l'utilisateur)

Pendant les quelques secondes de traitement, la plateforme exécute un flux monétique complexe :

1.  **TPE → API Gateway** : La demande arrive.
2.  **Gateway → Switch** : Le routeur identifie la banque du client (BIN).
3.  **Switch → Issuer (Banque Client)** : La banque reçoit la demande d'autorisation.
4.  **Vérifications** :
    *   🛑 **Fraude ?** Le module `Fraud Detection` analyse le risque (Montant inhabituel ? Pays étrange ?).
    *   🔑 **Sécurité ?** Le `HSM` vérifie le code PIN (si saisi) et le cryptogramme (CVV).
    *   💰 **Solde ?** Le `Card Service` vérifie s'il y a assez d'argent sur le compte.
5.  **Réponse** : La banque renvoie `APPROUVÉ` ou `REFUSÉ` (avec un code raison).

---

## ✅ Étape 4 : Résultat et Ticket

**Objectif** : Confirmer la transaction.

1.  **Sur le TPE** :
    *   Si **Succès** : L'écran devient VERT et affiche "PAIEMENT ACCEPTÉ".
    *   Si **Échec** : L'écran devient ROUGE et affiche "REFUSÉ" (ex: "Fonds insuffisants").
2.  **Ticket** : La transaction s'ajoute à l'historique du TPE ("Journal des transactions").

---

## 📜 Étape 5 : Vérification Client

**Objectif** : Le client vérifie son débit.

1.  **Retour Banque** : Le client retourne sur son interface (`http://localhost:3000`).
2.  **Actualisation** : Son solde a diminué du montant de la transaction.
3.  **Historique** : Une nouvelle ligne apparaît dans ses "Dernières Transactions" (ex: `Supermarché Bio - 42.50 €`).

---

## 🎓 Résumé pour la Démonstration

Pour faire une démo fluide :
1.  Ouvrez **deux fenêtres** côte à côte (Client à gauche, Marchand à droite).
2.  Générez la carte à gauche.
3.  Copiez le numéro.
4.  Tapez un montant à droite.
5.  Collez le numéro et validez.
6.  Montrez le succès sur le TPE, puis le débit sur le compte client.
