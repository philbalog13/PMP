-- Chapters for Module 1.4 – Émetteur & Acquéreur

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.4.1-emetteur', 'mod-1.4-emetteur-acquereur', 'L''émetteur – Côté banque du porteur',
$$## Cycle de vie de la carte
1. **Personnalisation** : fabrication, gravure PAN, encodage puce (clés crypto, certificats)
2. **Activation** : première transaction ou appel téléphonique
3. **Utilisation** : autorisations quotidiennes, gestion des plafonds
4. **Opposition** : perte/vol/fraude, transmission aux fichiers d'opposition
5. **Renouvellement** : envoi automatique avant expiration

**Systèmes supports** : CAMS, HSM pour clés et PIN, bases d'opposition.

## Processus d'autorisation
Chaque transaction est analysée par le module d'autorisation :
1. **Vérification technique** : PAN existe, carte non expirée, cryptogramme valide (HSM)
2. **Vérification financière** : solde disponible, plafond de carte
3. **Scoring** : algorithme anti-fraude (vitesse, zone géo, montant)
4. **Décision** : code 00 (accepté), 05 (refus), 55 (PIN incorrect)

> Temps de réponse attendu : **< 500 ms**.

## Facturation et recouvrement
L'émetteur avance les fonds au règlement (J+1) mais ne débite le porteur qu'à la date de valeur (souvent J+2).$$,
'["5 étapes du cycle de vie : personnalisation, activation, utilisation, opposition, renouvellement","Autorisation : vérification technique + financière + scoring < 500ms","L''émetteur avance les fonds avant de débiter le porteur"]'::jsonb,
1, 50) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.4.2-acquereur', 'mod-1.4-emetteur-acquereur', 'L''acquéreur – Côté banque du commerçant',
$$## Contrat commerçant
- **MDR** négocié, engagements PCI DSS, pas de montant minimum imposé
- **Règlement** : J+1 ou J+2
- **Types** : commerçants physiques (TPE), e-commerçants, MOTO

## Gestion des terminaux
- **TPE** : terminal physique, certifié EMV
- **Soft-POS** : application sur smartphone (Tap to Pay, NFC du téléphone)
- **Passerelle e-commerce** : interface API
- L'acquéreur fournit le logiciel, gère les mises à jour, injecte les clés de cryptage

## Traitement
- **Autorisation** : temps réel
- **Capture** : batch en fin de journée, envoyé au schéma pour clearing
- **Capture automatique** : pour e-commerce, immédiate ou différée (à l'expédition)$$,
'["MDR = taux global négocié avec le commerçant","TPE, Soft-POS et passerelle = 3 types de terminaux","Capture en batch en fin de journée, envoyée au schéma"]'::jsonb,
2, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.4.3-interactions', 'mod-1.4-emetteur-acquereur', 'Interactions émetteur / acquéreur',
$$## ISO 8583 – Le langage commun
Un message ISO 8583 est composé de :
- **MTI** : ex. 0100 (demande), 0110 (réponse), 0420 (chargeback)
- **Bitmap** : indique les champs présents
- **Champs** : 2 (PAN), 3 (code traitement), 4 (montant), 32 (code acquéreur), 52 (PIN block), 55 (données EMV)

## Fichiers de clearing
Format standardisé par les schémas (Visa IPS, MC ICAR). Liste toutes les transactions de la journée pour la compensation.

## Gestion des litiges (chargebacks)
1. **1er chargeback** : l'émetteur conteste (raison codifiée)
2. **Représentation** : l'acquéreur fournit des preuves
3. **Arbitrage** : le schéma tranche (frais supplémentaires)

Délais : jusqu'à 120 jours.$$,
'["ISO 8583 = norme pour les messages de transaction (MTI + bitmap + champs)","Clearing via fichiers standardisés (Visa IPS, MC ICAR)","Chargeback : contestation → représentation → arbitrage","Délai max : 120 jours"]'::jsonb,
3, 40) ON CONFLICT (id) DO NOTHING;

-- Chapters for Module 1.5 – Cryptographie

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.5.1-donnees', 'mod-1.5-crypto', 'Classification des données sensibles',
$$## PAN (Primary Account Number)
Structure : BIN (6–8 chiffres) + compte + clé de Luhn. Longueur : jusqu'à 19 chiffres (souvent 16).
PCI DSS : chiffrement obligatoire si stocké, masquage obligatoire à l'affichage.

## Données de piste magnétique
- **Track 1** : IATA, alphanumériques (PAN, nom, date, code service)
- **Track 2** : ABA, chiffres (PAN, date, code service, CVV de piste)
- **PCI DSS interdit** le stockage des données de piste après autorisation.

## CVV / CVC
- **CVV1** : sur la bande magnétique
- **CVV2** : imprimé au dos (3 chiffres)
- **iCVV** : pour le sans contact
- Calculé avec 3DES, PAN, date, code service et clé CVK.

## PIN
Code secret (4–12 chiffres), **jamais stocké en clair**. Format ISO 9564 : PIN block = PIN ⊕ PAN (tronqué).$$,
'["PAN = BIN + compte + clé Luhn, jusqu''à 19 chiffres","Stockage des pistes magnétiques interdit après autorisation","CVV1 (piste), CVV2 (verso), iCVV (NFC) : 3 variantes","PIN block ISO 9564 = PIN XOR PAN tronqué"]'::jsonb,
1, 30) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.5.2-crypto-base', 'mod-1.5-crypto', 'Cryptographie fondamentale',
$$## Symétrique – 3DES et AES
- **3DES** : standard historique (EMV, DUKPT). Bloc 64 bits, clé 112 bits.
- **AES** : recommandé. Bloc 128 bits, clés 128/192/256 bits.
- **Modes** : ECB (dangereux), CBC (chaînage), CTR (compteur).

## Asymétrique – RSA, ECC
- **RSA** : certificats de carte, transport de clés
- **ECC** : plus récent, signatures et certaines cartes EMV

## Hachage et MAC
- SHA-1 (obsolète), SHA-2 (recommandé)
- **MAC** : basé sur 3DES ou AES (CMAC), garantit l'intégrité$$,
'["3DES : bloc 64 bits, encore utilisé en EMV et DUKPT","AES : bloc 128 bits, recommandé pour le stockage","RSA pour les certificats, ECC pour les signatures","MAC = code d''authentification garantissant l''intégrité"]'::jsonb,
2, 30) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.5.3-applications', 'mod-1.5-crypto', 'Applications dans les paiements',
$$## Calcul du CVV
Algorithme : concaténer PAN + date + code service → appliquer 3DES avec clé CVK → extraire certains digits.
CVV2 utilise un code service différent (généralement 111).

## PIN offset
PIN natif (aléatoire, dans la puce) → le client choisit son code → offset = PIN client ⊕ PIN natif.
Vérification off-line : carte calcule PIN natif + offset, compare avec PIN saisi.

## ARQC – Cryptogramme EMV
Entrée : montant, pays, devise, compteur de transaction. Clé dérivée de la clé maître de la carte. Algorithme : 3DES/CBC, dernier bloc tronqué.

## DUKPT (Derived Unique Key Per Transaction)
Norme ANSI X9.24. Chaque transaction génère une clé unique à partir du BDK et d'un compteur (KSN). Avantage : compromission d'une clé n'affecte pas les autres transactions.$$,
'["CVV calculé par 3DES avec clé CVK sur PAN + date + service code","PIN offset = XOR entre PIN client et PIN natif","ARQC = cryptogramme EMV dynamique par transaction","DUKPT = clé unique par transaction, isolation des compromissions"]'::jsonb,
3, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.5.4-hsm', 'mod-1.5-crypto', 'Les HSM (Hardware Security Modules)',
$$## Qu'est-ce qu'un HSM ?
Matériel dédié, **inviolable**, certifié FIPS 140-2/140-3. Stocke les clés en sécurité ; elles ne sortent jamais en clair. Exécute des commandes cryptographiques via API.

## Commandes courantes (Thales payShield)
| Commande | Fonction |
|----------|----------|
| FM | Générer une clé |
| GG | Exporter une clé (chiffrée) |
| PV | Vérifier un PIN (PIN bloc) |
| M | Générer un MAC |
| EA | Générer un ARQC |
| EE | Vérifier un ARQC |

## Modèle de sécurité
Les clés sont divisées en composants (smartcards) et chargées dans le HSM. Accessibles uniquement via des Key Identifiers.$$,
'["HSM = matériel inviolable certifié FIPS 140","Les clés ne sortent jamais en clair du HSM","Commandes Thales : FM (générer), PV (vérifier PIN), EA/EE (ARQC)","Clés chargées par composants via smartcards"]'::jsonb,
4, 30) ON CONFLICT (id) DO NOTHING;

-- Chapters for Module 1.6 – Schémas & Règles

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.6.1-schemas', 'mod-1.6-schemas', 'Les grands schémas de paiement',
$$## Schémas ouverts (4 parties)
- **Visa, MasterCard** : plus grands réseaux mondiaux. Émetteur et acquéreur sont des banques distinctes. Le schéma ne prend pas de risque de crédit.
- **CB** : réseau domestique français, adossé à Visa/MC pour l'international.

## Schémas fermés (tripartites)
- **American Express** : émet les cartes, acquiert les commerçants, ET est le schéma. Commission unique, pas d'interchange au sens classique.
- **Discover** (sauf partenaires)

## Cartes privatives
Cartes de grands magasins (ex. Pass). L'émetteur est souvent une filiale financière de l'enseigne. Parfois co-badgé avec Visa/MC.$$,
'["Schéma ouvert (Visa/MC) : 4 parties, le schéma ne porte pas le risque","Schéma fermé (Amex) : tripartite, émetteur + acquéreur + schéma","CB : réseau domestique français adossé à Visa/MC"]'::jsonb,
1, 30) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.6.2-frais', 'mod-1.6-schemas', 'Frais et facturation des schémas',
$$## Assessment fee
Frais prélevé sur le volume total de transactions de l'acquéreur (ex. Visa : ~0,11%).

## Acquirer fee
Frais fixe par transaction (ex. MasterCard : ~0,0195 $).

## Cross-border fee
Transaction où le pays du commerçant ≠ pays de l'émetteur. Frais additionnel (~0,45% + 0,05 €).

## Programme de conformité
Amendes si le commerçant est hors-PCI : **jusqu'à 100 000 $ par mois**. Frais refacturés par l'acquéreur.$$,
'["Assessment fee : pourcentage sur le volume total","Acquirer fee : montant fixe par transaction","Cross-border fee : supplément pour transactions internationales","Non-conformité PCI : amendes jusqu''à 100K$/mois"]'::jsonb,
2, 25) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.6.3-regles', 'mod-1.6-schemas', 'Règles marchand',
$$## Honneur toutes cartes
Un commerçant qui accepte Visa **doit accepter toutes les cartes Visa**, sans discrimination d'émetteur.

## Surtaxe et escompte
- **Surtaxe** : supplément pour paiement par carte. Autorisé mais plafonné au coût d'acceptation.
- **Escompte** : réduction pour paiement en espèces. Autorisé si clairement indiqué.

## Montant minimum
Le commerçant peut imposer un montant minimum (ex. 10 €). Pas de maximum (sauf fraude évidente).

## Descripteurs de transaction
Le nom du commerçant sur le relevé bancaire doit être reconnaissable. Les e-commerçants doivent fournir un numéro de téléphone en cas de litige.$$,
'["Honor All Cards : obligation d''accepter toutes les cartes de la marque","Surtaxe plafonnée au coût réel d''acceptation","Descripteur clair obligatoire sur les relevés bancaires"]'::jsonb,
3, 25) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-1.6.4-chargebacks', 'mod-1.6-schemas', 'Gestion des litiges – Chargebacks',
$$## Cycle du chargeback
1. **1er chargeback** : l'émetteur envoie la contestation (raison codifiée)
2. **Représentation** : l'acquéreur fournit des preuves (signature, preuve de livraison)
3. **Arbitrage** : le schéma tranche (frais supplémentaires)

## Codes raison Visa
| Code | Motif |
|------|-------|
| 10.1 | EMV liability shift |
| 10.2 | Fraude (non autorisée) |
| 12.1 | Marchandise non reçue |
| 13.1 | Montant incorrect |
| 30 | Services non fournis |

Délais : **120 jours maximum** après la transaction.$$,
'["Chargeback : contestation → représentation → arbitrage","Codes raison Visa : 10.x (fraude), 12.x (marchandise), 13.x (montant)","Délai max de contestation : 120 jours"]'::jsonb,
4, 25) ON CONFLICT (id) DO NOTHING;
