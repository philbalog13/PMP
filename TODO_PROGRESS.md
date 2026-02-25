# TODO — Suivi de progression (CTF Lab Bugs)

> Dernière mise à jour : 2026-02-24
> Branche : `bef-prod`

---

## Contexte général

L'utilisateur a demandé à Claude de se comporter comme un étudiant (Thomas Dupont) pour :
1. S'inscrire sur la plateforme MoneTIC
2. Accéder à la room CTF **PAY-001**
3. La compléter et soumettre le flag

Avant de reprendre le test étudiant, deux bugs ont été signalés à corriger.

---

## Bugs à corriger

### Bug 1 — IP affichée comme `10.10.x.x` au lieu de la vraie IP  ✅ PARTIELLEMENT FIXÉ

**Symptôme** : Quand on clique sur "Lancer la room", la section "Machine Cible" affiche
`10.10.x.x` (valeur placeholder) au lieu de l'IP réelle (ex : `10.60.199.114`).

**Cause racine identifiée** :
- La fonction `getMachineIp(targetService)` retourne `'10.10.x.x'` quand le service
  (`pos-terminal`) n'est pas dans `TARGET_HOST_MAP`
- `vm.machineIp = labSession?.machineIp || getMachineIp(room.targetService)`
  → si `labSession` est null au moment du rendu, le fallback `getMachineIp()` s'active
- `fetchRoom()` reçoit bien `labSession.machineIp = '10.60.199.114'` de l'API
  **MAIS** le console.log dans `fetchRoom()` n'est jamais apparu → HMR n'appliquait
  pas les changements / le server tournait sur du vieux code

**Fix appliqué (partiel)** :
- Dans `startRoom()`, après `await fetchRoom()`, on applique maintenant `data.session`
  directement via `setRoom((prev) => ...)` pour que l'IP s'affiche immédiatement après
  le clic sur "Lancer la room"
- Fichier : `frontend/portal/src/app/student/ctf/[code]/page.tsx`

**Fix non vérifié** (serveur pas redémarré) :
- Un `console.log('[fetchRoom] labSession:', ...)` temporaire a été ajouté à `fetchRoom()`
  pour tracer pourquoi l'IP reste en `10.10.x.x` même au chargement initial de la page
- Ce log doit DISPARAÎTRE une fois le bug résolu (à supprimer impérativement)

**État** : Fix appliqué dans le code MAIS non vérifié car le serveur frontend n'a pas pu
être redémarré (voir Bug serveur ci-dessous).

---

### Bug 2 — Timer affiche `--:--` et ne démarre jamais  ✅ PARTIELLEMENT FIXÉ

**Symptôme** : Après clic sur "Lancer la room", le timer en haut à droite reste à `--:--`.

**Cause racine** : Même cause que Bug 1 — `vm.labSession` est null donc
`{vm.labSession ? formatRemainingTime(vm.sessionRemainingSec) : '--:--'}` affiche `--:--`.

**Fix** : Corrigé en même temps que Bug 1 via le fix de `startRoom()`.

**État** : Partiellement fixé (non vérifié).

---

### Bug serveur — Port 3000 impossible à libérer  🔴 BLOQUANT

**Symptôme** : Tentative de redémarrage du serveur Next.js portal échoue avec :
```
Error: listen EADDRINUSE: address already in use :::3000
```

**PIDs occupant le port** :
- PID 13540 → `0.0.0.0:3000` et `[::]:3000`
- PID 19372 → `[::1]:3000`
- `taskkill /PID 13540 /F` et `taskkill /PID 19372 /F` n'ont pas libéré le port

**À faire** :
1. Identifier ces processus avec `tasklist | findstr "13540"`
2. Forcer kill avec des droits admin si nécessaire
3. Ou utiliser un autre port (ex: `npm run dev -- --port 3001`)
4. Redémarrer le serveur proprement
5. Recharger la page et vérifier que le console.log `[fetchRoom]` apparaît
6. Valider que l'IP `10.60.199.114` s'affiche correctement
7. Supprimer le `console.log` temporaire dans `fetchRoom()`

---

## Tâches restantes (dans l'ordre)

- [x] **1. Libérer le port 3000** → le container Docker occupait le port (pas un serveur Node local)
- [x] **2. Rebuild + redémarrer le container portal** → `docker compose build portal && docker compose up -d --no-deps portal`
- [x] **3. Valider Bug 1 fix** → IP affiche `10.60.199.114` ✅
- [x] **4. Valider Bug 2 fix** → Timer affiche `57:51` et décompte ✅
- [x] **5. Supprimer le `console.log` temporaire** → supprimé avant le rebuild
- [x] **6. Reprendre le test étudiant** → Room PAY-001 complétée, flag soumis, +168 pts ✅ TERMINÉ

---

## Informations clés pour reprendre

### Compte étudiant de test
- **Nom** : Thomas Dupont
- **Email** : `thomas.dupont@test.com` (ou similaire — vérifier dans DB)
- **Student ID** : `4023f1d1-2725-436d-99a3-6419c1470b1f`
- **Session CTF active** : `sess-pay001-942475db` (status=RUNNING, expire 2026-02-24 16:57:59)
- **IP machine** : `10.60.199.114`

### URLs clés
- Portal : `http://localhost:3000`
- API : `http://localhost:8000`
- Room PAY-001 : `http://localhost:3000/student/ctf/PAY-001`

### Fichiers modifiés (non commités)
- `frontend/portal/src/app/student/ctf/[code]/page.tsx`
  - Fix `startRoom()` → applique `data.session` après `fetchRoom()`
  - Console.log temporaire dans `fetchRoom()` à supprimer

### Commande pour vérifier le port
```bash
netstat -ano | grep ":3000"
```

### Requête DB pour vérifier la session
```sql
SELECT session_code, status, machine_ip, expires_at
FROM learning.ctf_lab_sessions
WHERE student_id = '4023f1d1-2725-436d-99a3-6419c1470b1f';
```

---

## Historique des modifications

| Date | Fichier | Changement |
|------|---------|------------|
| 2026-02-24 | `page.tsx` | Fix `startRoom()` : applique `data.session` après `fetchRoom()` |
| 2026-02-24 | `page.tsx` | Ajout console.log temporaire dans `fetchRoom()` (à supprimer) |

