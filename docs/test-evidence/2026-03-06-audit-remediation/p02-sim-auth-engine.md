# Evidence P0.2 - `sim-auth-engine`

Date: 2026-03-06

## Correctifs appliques

- Typage du helper mTLS corrige dans `backend/sim-auth-engine/src/utils/mtls.helper.ts` en utilisant `Application` au lieu de `Express`.
- Separation du bootstrap et de l'app HTTP avec ajout de `backend/sim-auth-engine/src/app.ts`.
- `backend/sim-auth-engine/src/index.ts` mis a jour pour consommer `createApp()`.
- Ajout de la configuration manquante `backend/sim-auth-engine/jest.integration.config.js`.
- Ajout d'un setup commun `backend/sim-auth-engine/tests/setup.ts`.
- Ajout de tests integration reels:
  - `backend/sim-auth-engine/tests/integration/health.routes.test.ts`
  - `backend/sim-auth-engine/tests/integration/authorization.routes.test.ts`

## Validation source

```powershell
npm run build --prefix backend/sim-auth-engine
npm test --prefix backend/sim-auth-engine -- --runInBand
npm run test:integration --prefix backend/sim-auth-engine -- --runInBand
```

Resultat:

- Build `backend/sim-auth-engine`: OK
- Tests package `backend/sim-auth-engine`: OK
- Tests integration `backend/sim-auth-engine`: OK

## Portee validee par les tests integration

- `GET /health`
- `GET /health/live`
- `GET /health/ready`
- `POST /authorize`
- `GET /transactions/:pan`
- `POST /simulate/:scenario`

## Point de vigilance restant

- Les executions de test emettent encore du bruit console pendant certains cas negatifs, mais les commandes officielles sortent bien en code `0`. Le nettoyage du bruit de logs est secondaire par rapport a la reproductibilite et pourra etre traite plus tard si necessaire.
