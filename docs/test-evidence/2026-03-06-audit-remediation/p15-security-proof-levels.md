# Evidence P1.5 - Niveaux de preuve `tests/security`

## Objet

Rendre explicite la difference entre:

- tests `mock` purement pedagogiques
- tests `service` executes sur du vrai code repo isole
- tests `live` executes contre la plateforme running

## Changements appliques

- Scripts `tests/security/package.json` separes:
  - `npm test` -> gate offline `mock + service`
  - `npm run test:mock`
  - `npm run test:service`
  - `npm run test:live`
  - `npm run test:all`
- Configs Jest dediees ajoutees:
  - `tests/security/jest.mock.config.js`
  - `tests/security/jest.service.config.js`
  - `tests/security/jest.live.config.js`
- Suite `service` ajoutee:
  - `tests/security/service/pan-masking.test.ts`
  - cible le vrai code `backend/monitoring-service/src/utils/pan-masking.ts`
- Suites pedagogiques re-etiquetees avec `(mock)` dans leur nom.
- Documentation de taxonomie ajoutee:
  - `tests/security/README.md`
- Documentation best-practices corrigee:
  - `docs/security/best-practices.md`

## Commandes executees

```powershell
npm run test:mock --prefix tests/security
npm run test:service --prefix tests/security
npm run test:live --prefix tests/security
npm test --prefix tests/security
npm run test:all --prefix tests/security
```

## Resultats

- `test:mock`: OK
  - `6/6` suites
  - `44/44` tests
- `test:service`: OK
  - `1/1` suite
  - `3/3` tests
- `test:live`: OK
  - `1/1` suite
  - `7/7` tests
- `npm test`: OK
  - gate offline uniquement
  - `7/7` suites
  - `47/47` tests
- `test:all`: OK
  - enchainement explicite des trois niveaux

## Conclusion

- Un lecteur peut maintenant voir rapidement quelle commande donne un fast feedback local et quelle commande constitue une preuve runtime.
- La suite `penetration.test.ts` n'est plus interpretable comme preuve live.
- La premiere preuve `service` de securite est ancree sur un vrai composant du repo, sans dependre d'une stack complete.
