
je veux que tu teste une transaction , tu crees un client  qui va generer une carte avec une somme de 10000 il va effectuer des transactions vers differents marchants , on va pouvoir voir le solde reel des marchands quand on va se connecter en tant qu'eux, on va aussi pouvoir effectuer une transaction qui requiert le 3DS, on va pouvoir faire toute une time line de tout le processus à la fin

 je veux que tu fasses different cas qui impliqueent tous tout mes services , c'est pour voir la coherence et le chemin que parcourt une transaction.




## Regles de donnees
- Aucune valeur PAN statique en dur.
- API-first: lecture via API en priorite.
- Si donnees absentes, generation via API (ou fallback BDD seulement en cas de blocage technique type rate-limit), puis stockage persistant en BDD.
- Toutes les entites creees dans ce run sont tracees (IDs, emails, transaction IDs).

## Etapes

### 1) Preparation des entites reelles
- Creer nouveaux clients et marchands.
- Creer/recuperer cartes client, terminaux marchands, comptes marchands.
- Alimenter les soldes necessaires pour les tests de gros montants.
- Capturer l'etat initial API + BDD.

### 2) Scenarios transactionnels end-to-end
- Paiements approuves multi-marchands (gros montants).
- 3DS challenge: succes OTP + echec OTP.
- Refus: fonds insuffisants, limites depassees, risque fraude eleve.
- Operations post-autorisation: refund, void, settlement, payout.
- Reconnexion en tant que marchand pour verifier soldes reels.

### 3) Couverture de tous les services
- API Gateway (8000)
- sim-card-service (8001)
- sim-pos-service (8002)
- sim-acquirer-service (8003)
- sim-network-switch (8004)
- sim-issuer-service (8005)
- sim-auth-engine (8006)
- sim-fraud-detection (8007)
- crypto-service (8010)
- hsm-simulator (8011)
- key-management (8012)
- acs-simulator (8013)
- tokenization-service (8014)
- directory-server (8015)
- Fronts (health/disponibilite): portal, client-interface, user-cards-web, hsm-web, 3ds-ui, monitoring

### 4) Verifications de coherence
- API vs BDD:
  - `client.virtual_cards`
  - `client.transactions`
  - `merchant.accounts`
  - `merchant.account_entries`
- Coherence des liens de flux:
  - transactionId / stan / responseCode
  - deltas de soldes avant/apres
  - statuts 3DS et fraude

### 5) Livrables
- Rapport JSON complet du run.
- Timeline chronologique horodatee.
- Resume par service (OK/KO + preuve d'appel).
- Liste des anomalies et ecarts de coherence.

## Mode d'execution propose
- API-first strict.
- Fallback BDD uniquement si blocage technique (ex: rate-limit 429 sur register), en conservant l'auditabilite du run.
