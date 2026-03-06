# Evidence P1.1 - Suites Jest racine executables

Date: 2026-03-06

## Correctifs appliques

- `jest.config.js` et `jest.integration.js` rebranches sur le `ts-jest` versionne dans `tests/integration/node_modules`.
- `tsconfig.jest.json` ajoute pour donner une resolution TypeScript stable depuis la racine a:
  - `@jest/globals`
  - `axios`
  - `@/*` utilise par `frontend/tpe-web`
- Mapping explicite `axios` et `@jest/globals` ajoute dans les configs Jest racine.
- Tests reellement en echec corriges:
  - `tests/unit/backend/blockchain-service/settlement.test.ts`
  - `tests/integration/boot-sequence/tpe-health-check.test.ts`
  - `tests/integration/issuer-flow-full.test.ts`
- Ajustement minimal de compilation dans `frontend/tpe-web/lib/api-client.ts` pour ce contexte Jest strict.

## Strategie retenue

- Les suites restent a la racine.
- Le repo ne depend plus d'un `node_modules` racine qui n'existe pas.
- Le tooling partage est explicitement reutilise depuis `tests/integration`.

## Validation source

```powershell
npx jest -c jest.config.js --runInBand
npx jest -c jest.integration.js --runInBand
```

Resultat:

- Suite unitaire racine: `17/17` suites OK, `51/51` tests OK
- Suite integration racine: `8/8` suites OK, `13/13` tests OK

## Points notables

- Le blocage initial etait bien un probleme de resolution/tooling, pas un simple oubli de commande.
- Une fois la couche outillage reparee, les vraies erreurs de suite sont devenues visibles et ont ete corrigees.
- Les logs console verbeux de `issuer-flow-full.test.ts` restent presents mais la commande officielle sort bien en code `0`.
