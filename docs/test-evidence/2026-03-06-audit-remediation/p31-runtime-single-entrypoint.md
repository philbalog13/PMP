# P3.1 - Procedure runtime standard unique

Date: 2026-03-06  
Environnement: Windows local, runtime Docker actif  
Objectif: supprimer la derive entre `Makefile`, PowerShell et la procedure runtime reelle en installant une source de verite unique, cross-platform.

## Zones modifiees

- `scripts/runtime-stack.mjs`
- `scripts/deploy-runtime-test-all.ps1`
- `Makefile`
- `README.md`
- `DOCKER_DEPLOYMENT.md`
- `docker-compose-runtime.yml`

## Decision retenue

- La source de verite runtime devient:
  - `node scripts/runtime-stack.mjs`
- Les wrappers suivants ne portent plus leur propre logique:
  - `Makefile`
  - `scripts/deploy-runtime-test-all.ps1`

## Commandes supportees par le CLI unique

```bash
node scripts/runtime-stack.mjs up
node scripts/runtime-stack.mjs down
node scripts/runtime-stack.mjs logs
node scripts/runtime-stack.mjs smoke
node scripts/runtime-stack.mjs frontend-smoke
node scripts/runtime-stack.mjs test-all
```

Options valides:

- `--no-build`
- `--skip-image-bootstrap`
- `--skip-frontend-smoke`

## Ce qui a ete corrige

- La logique de bootstrap d'images manquantes n'est plus dupliquee seulement dans PowerShell.
- `make runtime-*` delegue maintenant au meme CLI Node.
- `scripts/deploy-runtime-test-all.ps1` delegue maintenant au meme CLI Node.
- Le wrapper PowerShell conserve la compatibilite historique avec `-SkipSmoke`:
  - `-SkipSmoke` -> mappe vers `node scripts/runtime-stack.mjs up`
- Le warning `docker compose ... version is obsolete` a ete supprime du runtime en retirant `version: '3.8'` de `docker-compose-runtime.yml`.
- Le quick start README / Docker guide pointe maintenant vers une seule procedure officielle.

## Validation

### 1. Aide du CLI officiel

```powershell
node scripts/runtime-stack.mjs help
```

Resultat:

- aide CLI affichee correctement
- commandes `up/down/logs/smoke/frontend-smoke/test-all` visibles

### 2. Demarrage runtime via le point d'entree officiel

```powershell
node scripts/runtime-stack.mjs up --no-build --skip-image-bootstrap
```

Resultat:

- OK
- stack runtime demarree via le CLI unique
- plus aucun warning `version is obsolete`

### 3. Recette complete via le point d'entree officiel

```powershell
node scripts/runtime-stack.mjs test-all --no-build --skip-image-bootstrap
```

Resultat:

- OK
- `UA + CTF smoke`: OK
- `frontend smoke`: `8/8` OK
- conclusion CLI:
  - `Runtime deployment and smoke tests completed successfully.`

### 4. Compatibilite PowerShell

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-runtime-test-all.ps1 -SkipSmoke -NoBuild -SkipImageBootstrap
```

Resultat:

- OK
- le wrapper PowerShell continue a supporter le mode "demarrage seul"
- il delegue correctement au CLI unique

## Limite de validation locale

- `make` n'etait pas installe sur cette machine (`Get-Command make` introuvable).
- Je n'ai donc pas pu executer directement `make runtime-up` ou `make runtime-test-all`.
- Risque residuel faible:
  - les cibles `runtime-*` du `Makefile` sont maintenant des wrappers one-line vers `node scripts/runtime-stack.mjs`

## Conclusion

- `P3.1` est valide.
- La procedure runtime officielle est maintenant unique, cross-platform et testee en execution reelle.
- Le prochain chantier ops/doc est `P3.2`: nettoyer le reste de la doc obsolete et les contradictions de ports/services/mots de passe seed.
