# P2.8 - Faux etats UI retires

Date: 2026-03-06

## Objectif

Verifier que le portail n'injecte plus de donnees metier fictives quand les APIs critiques tombent.

## Pages corrigees

- `frontend/portal/src/app/merchant/api/page.tsx`
- `frontend/portal/src/app/instructor/students/[id]/page.tsx`

## Correctifs appliques

- `merchant/api`
  - suppression des faux fallbacks `Production Key` et `https://example.com/webhooks/pmp`
  - ajout d'un etat `indisponible` distinct d'un vrai `empty state`
  - compteurs `StatCard` rendus veridiques (`Indisponible` si la source n'est pas lisible)
- `instructor/students/[id]`
  - suppression du faux profil `Jean Dupont`
  - distinction explicite entre:
    - `404` -> etudiant non trouve
    - autre erreur API -> fiche etudiant indisponible
  - ajout d'un bouton `Reessayer`

## Validation statique

Commande:

```powershell
rg -n "Jean|Dupont|example\.com|pmp_prod_a1b2|etudiant@pmp\.edu|FIRST_LOGIN|WORKSHOP_COMPLETE" frontend/portal/src
```

Resultat:

- aucun fallback fictif residuel dans les deux pages cibles
- seules restent des donnees d'exemple non critiques dans:
  - `admin/page.tsx`
  - placeholders du formulaire `instructor/students/add`

## Validation build

Commande:

```powershell
npm run build --prefix frontend/portal
```

Resultat:

- OK
- Next a execute sa phase `Running TypeScript ...`

## Validation runtime

Contexte:

- `http://localhost:3000` pointait encore vers une instance runtime plus ancienne, donc non fiable pour prouver le correctif courant
- une instance locale du build courant a ete lancee sur `http://127.0.0.1:3010`

Methodologie:

- authentification avec vrais tokens marchand et formateur
- interception Playwright des endpoints en panne
- lecture du texte rendu sur la page

Scenarios verifies:

1. `merchant/api`
   - `GET /api/merchant/api-keys` force en `500`
   - `GET /api/merchant/webhooks` force en `503`
   - attendu:
     - `Cles API indisponibles`
     - `Webhooks indisponibles`
     - absence de `Production Key`
     - absence de `pmp_prod_a1b2`
     - absence de `https://example.com/webhooks/pmp`
2. `instructor/students/[id]`
   - `GET /api/users/:id/progress` force en `500`
   - attendu:
     - `Fiche etudiant indisponible`
     - bouton `Reessayer`
     - absence de `Jean Dupont`
     - absence de `etudiant_01`

Resultat brut:

```json
{
  "merchantProof": {
    "hasKeysUnavailable": true,
    "hasWebhooksUnavailable": true,
    "hasFakeKey": false,
    "hasFakeWebhook": false
  },
  "instructorProof": {
    "hasUnavailable": true,
    "hasRetry": true,
    "hasFakeStudent": false
  }
}
```

## Conclusion

Le correctif `P2.8` est valide:

- plus aucune donnee metier fictive n'est injectee dans les deux ecrans critiques identifies
- une panne API se traduit maintenant par un etat d'indisponibilite explicite
- la verite runtime est preservee
