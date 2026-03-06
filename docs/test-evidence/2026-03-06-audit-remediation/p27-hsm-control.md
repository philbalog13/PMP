# P2.7 - Pilotage HSM reel

Date: 2026-03-06

## Correctif applique

- `backend/hsm-simulator/src/services/VulnEngine.ts`
  - ajout d'une configuration globale runtime persistante
  - lecture/ecriture Redis si disponible, repli memoire sinon
  - resolution effective de config dans le middleware
- `backend/hsm-simulator/src/controllers/hsm.controller.ts`
  - `GET /hsm/config` renvoie la config effective du contexte courant
  - `POST /hsm/config` ecrit vraiment la config globale et renvoie l'etat persiste

## Validations executees

### 1. Build backend

```powershell
npm run build --prefix backend/hsm-simulator
```

Resultat:
- OK

### 2. Runtime API: lecture -> ecriture -> lecture

Scenario:
- login formateur via `POST /api/auth/formateur/login`
- lecture initiale `GET /api/hsm/config`
- ecriture `POST /api/hsm/config` avec `simulateDown=true`
- relecture `GET /api/hsm/config`

Resultat observe:
- initial:
  - `simulateDown=false`
- apres `POST`:
  - `simulateDown=true`
- relecture:
  - `simulateDown=true`

### 3. Effet reel sur le HSM

Commande fonctionnelle:
- `POST http://localhost:8011/pin/verify`
- body: `{"pinBlock":"9999999999999999"}`

Resultat observe apres activation:
- `success=true`
- `verified=true`
- `mode=FAIL_OPEN`

Resultat observe apres remise a zero:
- `success=true`
- `verified=false`

Conclusion:
- le toggle `simulateDown` ne change plus seulement un affichage
- il modifie bien le comportement reel du HSM

### 4. Persistance apres restart service

Commande:

```powershell
docker restart pmp-hsm-simulator
```

Resultat observe apres restart:
- `GET /api/hsm/config` retourne encore `simulateDown=true`
- `POST /pin/verify` reste en `FAIL_OPEN`

Conclusion:
- la configuration globale persiste bien au redemarrage du service runtime

### 5. Validation parcours formateur dans le portail

Validation navigateur Playwright sur `http://localhost:3000/instructor/lab-control`:
- session formateur injectee via token reel
- clic UI sur `allowReplay`
- clic sur `Appliquer CTF`
- verification backend: `GET /api/hsm/config` retourne `allowReplay=true`
- clic sur `Reset CTF`
- verification backend: `GET /api/hsm/config` retourne `allowReplay=false`

Resultat:
- OK

## Etat final laisse en runtime

- configuration HSM remise a zero:
  - `allowReplay=false`
  - `weakKeysEnabled=false`
  - `verboseErrors=false`
  - `keyLeakInLogs=false`
  - `simulateDown=false`
  - `timingAttackEnabled=false`
