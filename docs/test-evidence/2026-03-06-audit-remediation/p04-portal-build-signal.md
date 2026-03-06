# Evidence P0.4 - `portal` build fiable

Date: 2026-03-06

## Correctifs appliques

- Suppression du bypass `typescript.ignoreBuildErrors` dans `frontend/portal/next.config.ts`.
- Correction des contrats UI partages trop etroits:
  - `frontend/shared/components/notion/NotionPill.tsx`
  - `frontend/shared/components/notion/NotionProgress.tsx`
  - `frontend/shared/components/notion/NotionBadge.tsx`
  - `frontend/shared/components/notion/NotionSkeleton.tsx`
- Correction du composant banking `frontend/shared/components/banking/data-display/StatCard.tsx` pour accepter un delta explicite et un affichage textuel.
- Corrections portail ciblees:
  - `frontend/portal/src/app/merchant/api/page.tsx`
  - `frontend/portal/src/app/merchant/page.tsx`
  - `frontend/portal/src/components/Navbar.tsx`
  - `frontend/portal/src/app/student/cursus/[cursusId]/[moduleId]/ua/page.tsx`

## Erreurs TypeScript reellement corrigees

- Contrats Notion incomplets par rapport a leur usage reel dans le portail:
  - `NotionPill` ne gerait pas `danger`
  - `NotionProgress` ne gerait pas `default`, `max`, `style`
  - `NotionBadge` et `NotionSkeleton` ne geraient pas `style`
- `merchant/api` appelait `formatDateTime(Date)` avec une chaine.
- `merchant/page` passait un delta non conforme a `StatCard`.
- `Navbar` laissait TypeScript inferer une union de liens avec et sans `dropdown`.
- La route dynamique UA n'etait pas alignee sur le contrat Next 16 `params: Promise<...>`.

## Validation source

```powershell
npx tsc --noEmit
npm run build
```

Commandes executees dans `frontend/portal`.

Resultat:

- `npx tsc --noEmit`: OK
- `npm run build`: OK
- Le build Next execute maintenant une vraie phase `Running TypeScript ...`

## Verification complementaire

```powershell
rg -n "ignoreBuildErrors" frontend -g "next.config.*"
```

Resultat:

- Aucun autre `ignoreBuildErrors` trouve dans les apps frontend critiques.

## Conclusion

- Le build vert de `frontend/portal` redevient un signal fiable.
- Le lot `P0.4` peut etre considere ferme.
