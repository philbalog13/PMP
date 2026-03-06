# Evidence P2.1 - Coherence POS marchand / dashboard

Date: 2026-03-06

## Correctif applique

- `backend/api-gateway/src/controllers/merchant.controller.ts`
  - remplacement de la clause `buildRealTransactionIntegrityClause()` par `buildMerchantTransactionVisibilityClause()`
  - la nouvelle clause garde l'integrite cote marchand obligatoire
  - les references `client_id` et `card_id` ne sont verifiees que si elles existent
  - la clause est parenthesee pour etre reutilisable sans ambiguite dans toutes les requetes
- `backend/api-gateway/src/__tests__/merchant-visibility-clause.test.ts`
  - test de non-regression ajoute sur la nouvelle clause

## Validation source

```powershell
npm run build --prefix backend/api-gateway
npx jest backend/api-gateway/src/__tests__/merchant-visibility-clause.test.ts --runInBand
```

Resultat:

- Build `api-gateway`: OK
- Test `merchant-visibility-clause`: 2/2 OK

## Validation runtime

Base testee: `http://localhost:8000`

Compte marchand:

- `bakery@pmp.edu`

### 1. Vente POS externe visible partout

Scenario:

- login marchand reel
- lecture `GET /api/merchant/dashboard`
- creation POS `APPROVED` sans `client_id` ni `card_id`
- relecture de tous les endpoints marchands impactes

Transaction validee:

- DB id: `471980b1-02af-4f2f-ae0e-65e903ca4f2c`
- transaction id: `POS17728032768334Q9K`
- montant: `21.37`
- terminal: `HIST505060`

Resultats observes:

- dashboard avant:
  - `transactionCount=0`
  - `revenue=0`
  - `pendingBalance=8975.03`
- dashboard apres:
  - `transactionCount=1`
  - `revenue=21.37`
  - `pendingBalance=8996.40`
  - `recentTransactions` contient `POS17728032768334Q9K`
- `GET /api/merchant/transactions?search=POS17728032768334Q9K`
  - `total=1`
- `GET /api/merchant/transactions/471980b1-02af-4f2f-ae0e-65e903ca4f2c`
  - `200`
- `GET /api/merchant/transactions/471980b1-02af-4f2f-ae0e-65e903ca4f2c/timeline`
  - `200`
  - `9` etapes
  - premiere etape: `Transaction Initiated`
  - derniere etape: `Settlement Queued`
- `GET /api/merchant/pos/160fee75-c6b7-4c95-b762-7e59f808c6d0`
  - `recentTransactions` contient `POS17728032768334Q9K`
- `GET /api/merchant/reports/daily?date=2026-03-06`
  - `totalTransactions=1`
  - `totalAmount=21.37`
  - `approvedCount=1`
- `GET /api/merchant/reports/reconciliation?fromDate=2026-03-06&toDate=2026-03-06`
  - `totalTransactions=1`
  - `netAmount=21.37`
  - la transaction est presente dans la liste

Conclusion:

- une vente POS marchande externe alimente maintenant le dashboard, l'historique, le detail terminal et les rapports

### 2. Verification `void` sur transaction POS externe

Transaction:

- original id: `c4a544ce-7a4f-4c16-b615-1a7153f06c37`
- transaction id: `POS1772803325262KTI0`

Resultats observes:

- `POST /api/merchant/transactions/c4a544ce-7a4f-4c16-b615-1a7153f06c37/void` -> `200`
- `ledgerBooked=true`
- `GET /api/merchant/transactions/c4a544ce-7a4f-4c16-b615-1a7153f06c37` -> `status=CANCELLED`

Conclusion:

- la recherche initiale de la transaction par le backend ne bloque plus les POS externes

### 3. Verification `refund` sur transaction POS externe

Transaction originale:

- original id: `773a508f-240f-47bf-9ee3-74712be479a6`
- transaction id: `POS1772803325350QY2J`

Transaction de refund:

- refund id: `355886a8-4eab-4b7d-bae0-ce9214d9fb06`
- refund transaction id: `REF1772803325369RZ8A`
- montant refund: `5.25`

Resultats observes:

- `POST /api/merchant/transactions/773a508f-240f-47bf-9ee3-74712be479a6/refund` -> `200`
- `ledgerBooked=true`
- `GET /api/merchant/transactions/773a508f-240f-47bf-9ee3-74712be479a6` -> `status=REFUNDED`
- `GET /api/merchant/transactions/355886a8-4eab-4b7d-bae0-ce9214d9fb06` -> `status=APPROVED`
- `GET /api/merchant/transactions/355886a8-4eab-4b7d-bae0-ce9214d9fb06/timeline` -> `200`, `9` etapes

Conclusion:

- les remboursements fonctionnent aussi sur les POS externes et restent visibles cote marchand

### 4. Verification export

Commande:

- `POST /api/merchant/reports/export`

Body:

- `fromDate=2026-03-06`
- `toDate=2026-03-06`
- `format=json`

Resultats observes:

- `count=5`
- contient `POS1772803325262KTI0`
- contient `POS1772803325350QY2J`
- contient `REF1772803325369RZ8A`

## Point de vigilance restant

- La selection des transactions candidates au settlement est maintenant alignee sur la meme clause de visibilite, mais la preuve ciblee du settlement complet reste a consolider dans une recette plus large du parcours marchand.
