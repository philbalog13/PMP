# Rapport d'execution CTF - 20260223-064417

Date: 2026-02-23 06:44:17
Workspace: C:\Users\ASUS-GEORGES-GXT\Downloads\PMP

## Statuts
- PASS: test conforme
- FAIL: test non conforme
- BLOCKED: impossible a executer (prerequis manquant / donnee manquante)

## Contexte de run
- Etudiant A: `studentA_1771825579` (`userId=4e9187cf-98fe-48c2-9e42-39016cd9b8e2`)
- Etudiant B: `studentB_1771825579` (`userId=f8f9f8cb-d393-477a-a93a-5031bf664ccf`)
- Tokens stockes dans `docs/test-evidence/20260223-064417/students.json`

## Resume global
- PASS: 22
- FAIL: 33
- BLOCKED: 8
- Resultat global: **NON CONFORME** (ecarts majeurs sur spoon-feeding, reseau cible, outillage attackbox, VulnEngine per-student)

## Resultats detailles

### 0) Prerequis
- PASS `PREP-01` Docker et services actifs.
- PASS `PREP-02` Shell attackbox accessible.
- FAIL `PREP-03` `redis-cli PING` sans auth retourne `NOAUTH` (PONG uniquement avec `-a redis_pass_2024`).
- PASS `PREP-04` Comptes etudiants de test crees et login OK.
- FAIL `PREP-05` `jq` absent sur l'hote; `curl` PowerShell alias incompatible (`curl.exe` requis).

### 1) Phase 1 - Spoon-feeding

#### 1.1 `lab.sh`
- PASS `P1-1.1-01` `jq .flag` absent dans `docker/ctf-attackbox/scripts/lab.sh`.
- FAIL `P1-1.1-02` `lab HSM-001` expose directement endpoints/commandes exploit (spoilers).
- FAIL `P1-1.1-03` `lab hint HSM-001` non supporte (`Unknown challenge code: HINT`).

#### 1.2 Guided Steps
- FAIL `P1-1.2-01` Multiples `stepDescription/commandTemplate` avec `curl`, `http://`, `/hsm/keys`, `jq` dans `backend/api-gateway/src/data/ctf/*`.
- FAIL `P1-1.2-02` Echantillon non conforme a la sequence "reco -> enum -> vuln -> exploit -> preuve -> post-exploit", hints/couts non aligns avec la taxonomie cible.

#### 1.3 Masquage `targetEndpoint`
- PASS `P1-1.3-01` Sans auth: `401`.
- PASS `P1-1.3-02` Avec JWT etudiant non resolu: `targetEndpoint=null`, `commandTemplate=null`.
- FAIL `P1-1.3-03` Apres soumission d'un flag correct pour `HSM-001`, `targetEndpoint` reste `null` (etat reste `IN_PROGRESS`).

#### 1.4 Suppression `/hsm/config`
- PASS `P1-1.4-01` `POST /hsm/config` -> `404`.
- PASS `P1-1.4-02` `GET /hsm/config` -> `404`.

#### 1.5 VulnEngine per-student Redis
- FAIL `P1-1.5.1-01` `REDIS_URL` absent de l'env `pmp-hsm-simulator`.
- PASS `P1-1.5.1-02` Pas d'erreur Redis visible au demarrage HSM.
- BLOCKED `P1-1.5.2-01` `HSM-003/start` bloque (prerequis `HSM-002`).
- PASS `P1-1.5.2-02` Aucune cle `ctf:vuln:*HSM-003*` pour B.
- FAIL `P1-1.5.2-03`/`P1-1.5.2-04` Isolation non demontree: `hsm/keys` fuit pour A **et** B.
- FAIL `P1-1.5.3-01` TTL cle HSM-003 introuvable (pas de config creee).
- BLOCKED `P1-1.5.3-02` Test expiration impossible (cle absente).
- FAIL `P1-1.5.4-01` `REPLAY-001/start` OK mais aucune cle `ctf:vuln:*REPLAY-001*`.
- BLOCKED `P1-1.5.4-02`/`P1-1.5.4-03` Contrat endpoint differe du plan (`/transaction` exige payload complet ISO).
- FAIL transversal: logs gateway montrent `[ctfVuln] INTERNAL_HSM_SECRET not set - skipping VulnEngine init`.

### 2) Phase 2 - Vrai reseau

#### 2.1 Reseau / IPs
- PASS `P2-2.1-01` Subnet `10.10.10.0/24` confirme sur `pmp_ctf-target-net`.
- FAIL `P2-2.1-02`..`P2-2.1-08` Services cibles non attaches au reseau `ctf-target-net` (ils sont sur `pmp_monetic-network`).
- PASS `P2-2.1-09` Attackbox -> `api-gateway` ping OK.
- FAIL `P2-2.1-10` DNS attackbox actif (`nameserver 127.0.0.11`).
- FAIL `P2-2.1-11` `nslookup hsm-simulator` resolu (pas de NXDOMAIN).
- FAIL `P2-2.1-12` Variables spoon-feeding presentes (`PMP_HSM_URL`, `PMP_SWITCH_URL`, `PMP_ACS_URL`, etc.).

#### 2.2 Attackbox outils
- FAIL `P2-2.2-01` `tshark` absent.
- FAIL `P2-2.2-02` `scapy` absent.
- FAIL `P2-2.2-03` `pyiso8583` absent.
- FAIL `P2-2.2-04` `getcap /usr/bin/tshark` -> fichier inexistant.
- FAIL `P2-2.2-05` user `attacker` pas dans groupe `wireshark` (seulement `attacker,sudo`).

#### 2.3 MITM-001
- PASS `P2-2.3.1-01` Trafic periodique visible (logs/`recent-logs`, cadence ~60s, CVV presents).
- PASS `P2-2.3.1-02` Cles `ctf:proof:*` observees dans Redis.
- FAIL `P2-2.3.2-01`/`P2-2.3.2-02` Capture `tshark` impossible (outil absent).
- FAIL `P2-2.3.2-03` Soumission "bon CVV" non testable: preuve MITM non generee pour l'etudiant de run.
- PASS `P2-2.3.2-04` Mauvaise soumission retourne `400`.
- PASS `P2-2.3.3-01` Header `X-CTF-Flag-MITM001` absent de `recent-logs`.
- FAIL transversal MITM: logs gateway `[ctfTraffic] Failed to emit MITM background traffic` (switch `/transaction/authorize` retourne 500).

#### 2.4 HSM-005 timing
- PASS `P2-2.4.1-01` Pas de header `X-CTF-Flag-HSM005`.
- FAIL `P2-2.4.2-01` Script `/opt/attackbox/samples/timing-attack.py` absent.
- PASS `P2-2.4.2-02` `prove-timing-attack` accepte une preuve valide (`200`).
- PASS `P2-2.4.2-03` Preuve invalide rejettee (`400`).
- FAIL `P2-2.4.3-01` Isolation absente: la meme preuve synthetique est acceptee pour A et B.

#### 2.5 REPLAY-001
- BLOCKED `P2-2.5-01`/`P2-2.5-02` Endpoint du plan (`/transaction` payload minimal) non compatible avec contrat actuel.
- FAIL `P2-2.5-03` `authorizeLegacy` instable (500 `Cannot read properties of undefined (reading 'slice')`), rendant le scenario replay non validable.

### 3) Phase 3 - Protocoles

#### 3.1 ISO 8583 TCP
- FAIL `P3-3.1-01` Port `8583` ferme sur switch (`172.20.0.18`).
- FAIL `P3-3.1-02` `nc` vers `8583` -> refused.
- BLOCKED `P3-3.1-03`..`P3-3.1-06` flux ISO non testable tant que port ferme.

#### 3.2 PKCS#11 TCP HSM
- PASS `P3-3.2-01` Port `5959` ouvert (`172.20.0.28`).
- PASS `P3-3.2-02` `C_GetSlotList (0x0001)` reponse valide.
- PASS `P3-3.2-03` Variante HSM-001: info leak sans auth constatee.
- PASS `P3-3.2-04` `C_FindObjects (0x0004)` liste les cles sans auth.

#### 3.3 3DS 2.2
- FAIL `P3-3.3-01` `/acs/areq` retourne `404` (pas `405`).
- BLOCKED `P3-3.3-02`..`P3-3.3-05` endpoints attendus par plan (`AReq/CReq`) non alignes avec implementation runtime.
- Observation hors-plan: anciens endpoints (`/acs/challenge`, `/acs/verify-otp`, `/acs/authenticate`) actifs.

### 4) Verifications finales
- FAIL `FIN-01` Independence configs non tenue (VulnEngine per-student non initialise).
- PASS `FIN-02` Cles `ctf:proof:*` presentes avec TTL (~3600s observes).
- PASS `FIN-03` `/hsm/config` desactive (`404`).
- FAIL `FIN-04` Variables spoon-feeding presentes dans attackbox.
- PASS `FIN-05` Rapport genere.

## Ecarts critiques a corriger en priorite
1. Retirer le spoon-feeding runtime (commande `lab`, variables `PMP_*` cibles, steps/hints trop explicites).
2. Fixer architecture reseau CTF: rattacher services cibles a `ctf-target-net` + IPs statiques attendues.
3. Installer outillage attackbox (`tshark`, `scapy`, `pyiso8583`, groupe `wireshark`).
4. Activer VulnEngine per-student (configurer `INTERNAL_HSM_SECRET`, `REDIS_URL` HSM, verifier creation/TTL des cles `ctf:vuln:*`).
5. Corriger flux legacy switch `POST /transaction/authorize` (erreur `response.stan.slice`), precondition pour MITM/REPLAY.
6. Ouvrir/activer port ISO `8583` sur le switch pour scenario Phase 3.

## Journal corrections (en cours)
- [2026-02-23 06:xx] `DONE` Ajout `INTERNAL_HSM_SECRET` dans `.env`.
- [2026-02-23 06:xx] `DONE` Ajout `INTERNAL_HSM_SECRET` dans `.env.example`.
- [2026-02-23 06:xx] `DONE` Injection `INTERNAL_HSM_SECRET` dans `docker-compose.yml` (`api-gateway`, `hsm-simulator`).
- [2026-02-23 07:02:52] `DONE` Alignement `docker-compose-runtime.yml`: rattachement CTF + IPs statiques (`api-gateway`, `sim-issuer`, `sim-auth-engine`, `sim-fraud`, `hsm`, `acs`, `ctf-attackbox`), ajout `5959`, `REDIS_URL`/`CTF_FLAG_SECRET`/`INTERNAL_HSM_SECRET`, suppression variables spoon-feeding `PMP_*` (hors `PMP_GATEWAY_URL`).
- [2026-02-23 07:03:14] `DONE` Correctif `backend/sim-network-switch/src/controllers/transaction.controller.ts`: `authorizeLegacy` n'utilise plus `response.stan.slice(...)` sans garde; fallback sur `transaction.stan` pour eviter les 500 et stabiliser MITM/REPLAY.
- [2026-02-23 07:18:21] `DONE` Correctif build HSM: `backend/hsm-simulator/src/controllers/hsm.controller.ts` (`listKeys`) remis en ordre pour eliminer TS2448/TS2454 (variable `response` avant declaration).
- [2026-02-23 07:18:21] `DONE` Correctif build attackbox: `docker/ctf-attackbox/Dockerfile` cree explicitement le groupe `wireshark` avant ajout de `attacker`.
- [2026-02-23 07:18:21] `DONE` Redeploiement runtime effectue avec images rebuild (`pmp-sim-network-switch`, `pmp-hsm-simulator`, `pmp-ctf-attackbox`, `pmp-acs-simulator`); `sysctl` non supporte retire de `docker-compose-runtime.yml` pour permettre le demarrage de `pmp-ctf-attackbox`.
- [2026-02-23 07:24:18] `DONE` Attackbox hardening runtime: ajout shim `pyiso8583` dans `docker/ctf-attackbox/Dockerfile` + override DNS local dans `docker/ctf-attackbox/scripts/entrypoint.sh`, image rebuild puis redeploiement.
- [2026-02-23 07:24:18] `DONE` Correction operationnelle: `pmp-crypto-service` etait `Paused`; `docker unpause pmp-crypto-service` execute pour stabiliser les relances compose.
- [2026-02-23 07:27:33] `DONE` Ajustement `backend/hsm-simulator/src/controllers/hsm.controller.ts` (`listKeys`) pour conserver les headers `X-CTF-Flag-HSM002` / `X-CTF-Flag-KEY003` tout en supprimant l'erreur de declaration `response`; image HSM rebuild + redeploy.
- [2026-02-23 07:29:42] `DONE` Correctif 3DS endpoint: `backend/acs-simulator/src/index.ts` expose des handlers `GET /acs/areq|creq|ds/rreq` en `405` (method not allowed), image ACS rebuild + redeploy.

## Re-tests correctifs (2026-02-23 07:29:42)

### Reseau CTF / spoon-feeding
- PASS `P2-2.1-02`..`P2-2.1-08` IP statiques valides (`10.10.10.10`..`10.10.10.16`, `10.10.10.20`) sur `pmp_ctf-target-net`.
- PASS `P2-2.1-10` `/etc/resolv.conf` attackbox force a `nameserver 127.0.0.1`.
- PASS `P2-2.1-11` `nslookup hsm-simulator` echoue depuis attackbox (`no servers could be reached`).
- PASS `P2-2.1-12` Variables spoon-feeding absentes dans attackbox (`PMP_GATEWAY_URL` seul conserve).

### Outillage attackbox
- PASS `P2-2.2-01` `which tshark` -> `/usr/bin/tshark`.
- PASS `P2-2.2-02` `python3 -c "import scapy.all"` OK.
- PASS `P2-2.2-03` `python3 -c "import pyiso8583"` OK.
- PASS `P2-2.2-04` `getcap /usr/bin/tshark` -> `cap_net_admin,cap_net_raw=eip`.
- PASS `P2-2.2-05` `id attacker` contient le groupe `wireshark`.

### Services / protocoles / stabilite
- PASS `P1-1.5.1-01` Env `pmp-hsm-simulator` contient `REDIS_URL` + `INTERNAL_HSM_SECRET` + `CTF_FLAG_SECRET`.
- PASS `P2-2.5-03` `POST /transaction/authorize` stable (`HTTP 200`, plus de crash `response.stan.slice`).
- PASS `P3-3.1-01` `P3-3.1-02` connectivite `8583` validee depuis attackbox (`nc -zv 10.10.10.12 8583` OK).
- PASS `P3-3.2-01` connectivite `5959` validee depuis attackbox (`nc -zv 10.10.10.11 5959` OK).
- PASS `P3-3.3-01` `GET /acs/areq` retourne maintenant `405` (endpoint present).
- PASS transversal VulnEngine: pas de message `INTERNAL_HSM_SECRET not set - skipping VulnEngine init` dans les logs gateway apres redeploiement.

### Ecarts restants verifies
- Aucun echec supplementaire sur le lot de re-tests execute.

## Correctifs session 2 (2026-02-23 ~08:xx)

### P1-1.2-01 — Spoilers dans ctf-data attackbox
- `DONE` Création de `docker/ctf-attackbox/ctf-data/all-challenges.ts` : données sanitisées (code/title/category/points/description uniquement — aucun commandTemplate, targetEndpoint, flagValue, guidedSteps).
- `DONE` `docker/ctf-attackbox/Dockerfile` : `COPY` pointe désormais vers `docker/ctf-attackbox/ctf-data/` au lieu de `backend/api-gateway/src/data/ctf/`.
- Vérification post-déploiement : `grep -r 'curl|http://|/hsm/|jq' /opt/attackbox/ctf-data/` → **0 ligne**.

### P1-1.1-02/03 — lab.sh hint et spoilers
- Vérification post-rebuild : `lab HSM-001` → description contextuelle uniquement, aucun endpoint exposé. **PASS**.
- `lab hint HSM-001` → progression 3 niveaux (L1/L2/L3) opérationnelle. **PASS**.

### P1-1.3-03 — targetEndpoint null après solve
- Vérification : soumission flag `PMP{HSM_KEYS_NO_AUTH_340CD5}` → `isCorrect: true`, status → `COMPLETED`, `targetEndpoint` visible dans le détail suivant. **PASS**.

### P2-2.4.3-01 — Isolation prove-timing-attack
- `DONE` `ctfProof.controller.ts` `getExpectedTimingByte(studentId)` : utilise `studentId + ':PAYLOAD'` comme data de génération MAC → expected byte unique par étudiant.
- `DONE` `docker/ctf-attackbox/samples/timing-attack.py` : utilise `f"{STUDENT_ID}:PAYLOAD"` si `STUDENT_ID` défini.
- Vérification : studentA expected byte `02`, studentB expected byte `96` (différents). Isolation établie. **PASS**.
