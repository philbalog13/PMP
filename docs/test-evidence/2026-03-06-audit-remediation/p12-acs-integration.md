# Evidence P1.2 - Integration ACS executable

Date: 2026-03-06

## Correctifs appliques

- `backend/acs-simulator/src/index.ts` exporte maintenant:
  - `createApp()`
  - `startServer()`
- `backend/acs-simulator/src/__tests__/acs.test.ts` ne depend plus d'un service externe sur `localhost:8088`.
- Les tests integration ACS demarrent leur propre app Express sur un port ephemere, puis ferment le serveur en `afterAll`.
- Le repli par defaut reste coherent avec le runtime reel (`127.0.0.1:8013`) si un `ACS_BASE_URL` est fourni.
- Le cas "challenge requis" est rendu deterministe en envoyant `cardholderName: 'TEST USER'`, ce qui force le score de risque au-dessus du seuil.
- Les assertions d'URL ont ete alignees sur la vraie `challengeBaseUrl` du service (`http://localhost:3088` avec query params).

## Validation source

```powershell
npm run build --prefix backend/acs-simulator
npm run test:integration --prefix backend/acs-simulator -- --runInBand
npm test --prefix backend/acs-simulator -- --runInBand
```

Resultat:

- Build `backend/acs-simulator`: OK
- `test:integration`: OK, `12/12` tests
- `test`: OK, avec les tests integration skippees hors mode dedie et les tests unitaires/legacy verts

## Conclusion

- Les tests d'integration ACS ne supposent plus un port obsolete ni un service externe deja lance.
- La commande officielle du package est maintenant executable localement sans modification manuelle du port.
