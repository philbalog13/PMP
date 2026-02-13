-- Chapters for Module 1.1 – Principes du paiement électronique

-- Chapter 1: Introduction au paiement électronique
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.1.1-intro', 'mod-1.1-principes', 'Introduction au paiement électronique',
$$## Définition générale

Un **paiement électronique** (ou e-paiement) est une transaction financière effectuée au moyen d'un dispositif électronique (carte, smartphone, ordinateur) qui transmet une instruction de transfert de fonds entre le compte du payeur et celui du bénéficiaire, sans circulation de monnaie fiduciaire (billets, pièces) ni d'effet de commerce papier (chèque).

### À distinguer
- **Paiement digital** : terme marketing, souvent synonyme mais insiste sur l'expérience utilisateur.
- **Monétique** : science et technique des paiements par carte.

## Brève histoire

| Année | Événement |
|-------|-----------|
| 1950 | Diners Club, première carte en carton |
| 1967 | Premier distributeur automatique |
| 1974 | Piste magnétique |
| 1985 | Carte à puce (CP8) inventée par Roland Moreno |
| 2002 | EMV (Europay, MasterCard, Visa) norme mondiale |
| 2010 | NFC et sans contact |
| 2018 | DSP2, authentification forte |

> **Pourquoi c'est important ?** Les failles de sécurité d'hier expliquent les normes d'aujourd'hui.$$,
'["Un paiement électronique transfère des fonds via un dispositif électronique, sans espèces","La monétique est la science et technique des paiements par carte","EMV (2002) est la norme mondiale pour la puce","DSP2 (2018) impose l''authentification forte"]'::jsonb,
1, 30
) ON CONFLICT (id) DO NOTHING;

-- Chapter 2: L'écosystème – Les acteurs
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.1.2-acteurs', 'mod-1.1-principes', 'L''écosystème – Les acteurs',
$$## Le carré magique : les 4 acteurs obligatoires

```
[Porteur]  ←→  [Commerçant]
    ↑              ↑
    |              |
[Émetteur] ←→ [Acquéreur]
    ↓              ↓
    └── [Schéma] ──┘
```

### A. Le porteur (cardholder)
Personne physique ou morale titulaire de la carte. Il initie le paiement et est lié à son émetteur par un contrat de carte bancaire.

### B. Le commerçant (merchant)
Personne physique ou morale qui vend un bien ou un service. Il accepte la carte et est lié à son acquéreur par un contrat de VAD ou de TPE.

### C. L'émetteur (issuer)
Établissement bancaire qui émet la carte, gère son cycle de vie (fabrication, opposition, renouvellement), autorise ou refuse la transaction selon le solde/plafond, et supporte le risque de non-paiement.

### D. L'acquéreur (acquirer)
Établissement de paiement agréé qui fournit au commerçant le TPE ou la passerelle e-commerce, garantit le paiement au commerçant (sous réserve de conformité) et transmet la demande d'autorisation.

## Les acteurs « satellites »

### Schémas (schemes)
Visa, MasterCard, CB, Amex, JCB, UnionPay. Amex est à la fois émetteur, acquéreur et schéma (système tripartite). Les schémas ne manipulent pas les fonds ; ils définissent les règles techniques et commerciales.

### PSP (Prestataires de services de paiement)
Exemples : Stripe, Adyen, Worldline, Ingenico, PayZen. Ils se substituent souvent à l'acquéreur pour le volet technique.

### Centres d'autorisation / processeurs
Sociétés (souvent filiales de banques) qui traitent les flux en temps réel, hébergent les HSM, gèrent les bases d'opposition et appliquent les règles de scoring.$$,
'["4 acteurs obligatoires : porteur, commerçant, émetteur, acquéreur","L''émetteur autorise et supporte le risque de non-paiement","L''acquéreur garantit le paiement au commerçant","Les schémas définissent les règles, ne manipulent pas les fonds","Amex = système tripartite (émetteur + acquéreur + schéma)"]'::jsonb,
2, 45
) ON CONFLICT (id) DO NOTHING;

-- Chapter 3: Les flux d'une transaction
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.1.3-flux', 'mod-1.1-principes', 'Les flux d''une transaction',
$$## Les 3 phases d'une transaction

### Phase 1 : Autorisation (temps réel, < 2 secondes)
1. Le commerçant (via TPE ou site web) envoie une demande à son acquéreur.
2. L'acquéreur formate un **message ISO 8583**.
3. Le message transite par le schéma qui le route vers le bon émetteur.
4. L'émetteur vérifie : solde, plafond, opposition, cryptogramme, etc.
5. Réponse : « 00 » (accepté) ou « 05 » (refus).

> **À ce stade, aucun argent n'a été déplacé !** Seulement une réservation d'encours.

### Phase 2 : Clearing (différé, J+1)
1. Le commerçant transmet tous les tickets de vente à son acquéreur (batch).
2. L'acquéreur envoie les transactions au schéma.
3. Le schéma ventile par émetteur et produit des fichiers de compensation.

> Le clearing est un **échange d'informations**, pas encore d'argent.

### Phase 3 : Règlement (settlement, J+1 à J+3)
1. Le schéma calcule la **position nette** de chaque banque.
2. L'acquéreur crédite le compte du commerçant (net des commissions).
3. L'émetteur débite le compte du porteur.

```
Commerçant → Acquéreur → Schéma → Émetteur → Porteur
  |--- autorisation (temps réel) ---|
  |--- clearing (J+1, batch) -------|
  |--- règlement (J+1 à J+3) ------|
```$$,
'["Autorisation = temps réel, réservation d''encours, pas de mouvement de fonds","Clearing = échange d''informations en batch J+1","Règlement = mouvements financiers nets J+1 à J+3","Message ISO 8583 = norme internationale pour les transactions"]'::jsonb,
3, 45
) ON CONFLICT (id) DO NOTHING;

-- Chapter 4: Modèles économiques et commissions
INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.1.4-commissions', 'mod-1.1-principes', 'Modèles économiques et commissions',
$$## L'interchange
Commission interbancaire payée par l'acquéreur à l'émetteur. Elle rémunère l'émetteur pour le risque de crédit, la garantie de paiement et la mise à disposition de la carte.

**Régulation DSP2/IFR** : plafonnement à **0,2%** pour les cartes de débit et **0,3%** pour les cartes de crédit.

Le taux varie selon : type de carte, type de transaction (CP/CNP), pays, secteur d'activité.

## Les frais acquéreur
- **TAF** (Terminal Authorization Fee) : commission fixe par transaction
- **MDR** (Merchant Discount Rate) : taux global prélevé par l'acquéreur

> **MDR = Interchange + Frais schéma + Marge acquéreur**

## Exemple complet de calcul

| Élément | Montant / Taux |
|---------|---------------|
| Prix d'achat | 100,00 € |
| Interchange (débit) | 0,20 € (0,2%) |
| Frais schéma | 0,05 € (0,05%) |
| Marge acquéreur | 0,10 € (0,1%) |
| **Total prélevé** | **0,35 €** |
| **Net perçu commerçant** | **99,65 €** |

### Répartition
- Émetteur : 0,20 € — Schéma : 0,05 € — Acquéreur : 0,10 €$$,
'["Interchange = commission payée par l''acquéreur à l''émetteur","Plafonds DSP2 : 0,2% débit / 0,3% crédit","MDR = interchange + frais schéma + marge acquéreur","Le commerçant perçoit le montant net des commissions"]'::jsonb,
4, 30
) ON CONFLICT (id) DO NOTHING;
