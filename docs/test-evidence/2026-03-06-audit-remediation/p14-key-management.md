# Evidence P1.4 - `key-management` stabilise

Date: 2026-03-06

## Correctifs appliques

- Ajout de `backend/key-management/src/services/__tests__/pki.service.test.ts` avec couverture reelle de:
  - generation initiale de la Root CA
  - rechargement d'une CA existante
  - certificat microservice
  - certificat EMV card
  - erreurs `CA not initialized`
- Extension de `backend/key-management/src/services/__tests__/key.service.test.ts` pour couvrir:
  - generation `DES`
  - fallback algorithme inconnu
  - `getKeyData`
  - `updateKeyStatus`
  - `exportKey`
  - KCV `000000` sur materiel invalide

## Validation source

```powershell
npm test --prefix backend/key-management -- --runInBand
```

Resultat:

- Commande: OK
- Suites: `2/2` OK
- Tests: `25/25` OK

## Coverage finale

- statements: `100%`
- branches: `100%`
- functions: `100%`
- lines: `100%`

## Conclusion

- Le package `backend/key-management` sort maintenant proprement en code `0`.
- Les seuils n'ont pas ete abaisses; la couverture a ete remontee par de vrais tests utiles.
