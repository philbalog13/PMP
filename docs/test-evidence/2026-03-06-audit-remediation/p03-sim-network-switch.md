# Evidence P0.3 - `sim-network-switch`

Date: 2026-03-06

## Correctifs appliques

- Typage du helper mTLS corrige dans `backend/sim-network-switch/src/utils/mtls.helper.ts` en utilisant `Application`.
- Normalisation de la reponse issuer dans `backend/sim-network-switch/src/services/routing.service.ts` pour exposer un `TransactionResponse` top-level stable.
- Mapping explicite ajoute pour:
  - `stan`
  - `acquirerReferenceNumber`
  - `responseCode`
  - `responseMessage`
  - `authorizationCode`
  - `networkId`
  - `issuerRoutingInfo`
  - `processedAt`
  - `responseTime`
- Les champs issuer hors contrat sont conserves dans `additionalData`.
- Le mock `axios` de `backend/sim-network-switch/tests/integration/phase8-audit-bi.test.ts` a ete corrige pour supporter `axios.create()` et les reponses attendues par la Phase 8.

## Validation source

```powershell
npm run build --prefix backend/sim-network-switch
npm test --prefix backend/sim-network-switch -- --runInBand
npm run test:integration --prefix backend/sim-network-switch -- --runInBand
```

Resultat:

- Build `backend/sim-network-switch`: OK
- Tests package `backend/sim-network-switch`: OK
- Tests integration `backend/sim-network-switch`: OK

## Contrat retenu

- Le switch publie un `TransactionResponse` normalise au niveau top-level.
- Les details issuer non contractuels restent disponibles dans `additionalData`.

## Point de vigilance restant

- Les suites d'integration produisent encore des logs pour certains cas invalides et peuvent signaler ponctuellement des handles asynchrones ouverts dans des runs larges. Le chemin de reference valide pour l'audit reste vert sur la commande officielle `npm run test:integration --prefix backend/sim-network-switch -- --runInBand`.
