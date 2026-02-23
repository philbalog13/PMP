# TODO Ultra-detaillee - Validation Refonte CTF (3 phases)

Objectif: executer et tracer 100% des verifications du plan de test sans omission.

## Regle de suivi (a appliquer a chaque test)

- [ ] `TRACK-01` Definir un responsable de run.
  - Action: nommer la personne qui execute la campagne.
  - Attendu: responsable unique confirme.
  - Preuve: nom + date dans le rapport de run.
- [ ] `TRACK-02` Definir une convention de statut.
  - Action: utiliser `PASS`, `FAIL`, `BLOCKED`, `N/A`.
  - Attendu: tous les tests tags avec un statut unique.
  - Preuve: colonne statut complete dans le rapport.
- [ ] `TRACK-03` Definir le format de preuve.
  - Action: archiver sortie commande + capture ecran + logs pertinents.
  - Attendu: chaque test reference au moins une preuve.
  - Preuve: dossier de preuves versionne.
- [ ] `TRACK-04` Creer un dossier de collecte.
  - Action: creer `docs/test-evidence/<date-run>/`.
  - Commande: `mkdir -p docs/test-evidence/$(Get-Date -Format yyyyMMdd-HHmmss)`
  - Attendu: dossier present.
  - Preuve: chemin cree et utilisable.

## 0) Prerequis techniques

- [ ] `PREP-01` Docker est fonctionnel et services redemarres.
  - Commande: `docker ps`
  - Attendu: les services CTF attendus sont UP.
  - Preuve: sortie `docker ps`.
- [ ] `PREP-02` Acces shell attackbox.
  - Commande: `docker exec -it pmp-ctf-attackbox bash`
  - Attendu: shell obtenu sans erreur.
  - Preuve: capture de session.
- [ ] `PREP-03` Redis accessible.
  - Commande: `docker exec pmp-redis redis-cli PING`
  - Attendu: `PONG`.
  - Preuve: sortie commande.
- [ ] `PREP-04` Comptes etudiants de test disponibles.
  - Action: preparer au minimum `studentA` et `studentB`.
  - Attendu: identifiants exploitables sur les appels API.
  - Preuve: requete API authentifiee valide pour chaque etudiant.
- [ ] `PREP-05` Outils locaux disponibles.
  - Commande: `curl --version; jq --version; nmap --version; docker --version`
  - Attendu: chaque binaire repond.
  - Preuve: sortie version.

## 1) Phase 1 - Tuer le Spoon-Feeding (Niveau 1)

### 1.1 Reecriture `lab.sh` (`docker/ctf-attackbox/scripts/lab.sh`)

- [ ] `P1-1.1-01` Absence de solutions explicites dans `lab.sh`.
  - Commande: `grep -c "jq .flag" docker/ctf-attackbox/scripts/lab.sh`
  - Attendu: `0`.
  - Preuve: sortie grep.
- [ ] `P1-1.1-02` Format mission `HSM-001` correct.
  - Commande: `docker exec pmp-ctf-attackbox lab.sh HSM-001`
  - Attendu: presence de `[MISSION]`, `[CATEGORY]`, `CONTEXT`, `TARGET ENVIRONMENT`, `OBJECTIVE`, mention `lab hint HSM-001`.
  - Attendu: aucune fuite endpoint, port, payload, valeur magique.
  - Preuve: sortie complete de la commande.
- [ ] `P1-1.1-03` Commande `lab hint` disponible et informative.
  - Commande: `docker exec pmp-ctf-attackbox lab hint HSM-001`
  - Attendu: hint niveau 1 + cout en points.
  - Preuve: sortie commande.

### 1.2 Reecriture Guided Steps (`backend/api-gateway/src/data/ctf/*Challenges.ts`)

- [ ] `P1-1.2-01` Pas de solution directe dans `stepDescription`.
  - Commande: `grep -r "stepDescription" backend/api-gateway/src/data/ctf/ | grep -E "(curl|jq|http://|/hsm/keys)"`
  - Attendu: aucune occurrence utile exploitable (hors commentaires techniques).
  - Preuve: sortie grep (vide ou justifiee).
- [ ] `P1-1.2-02` Sequence pedagogique coherentement respectee.
  - Action: verifier manuellement plusieurs fichiers `*Challenges.ts`.
  - Attendu: ordre reconnaissance -> enumeration -> identification vuln -> exploitation -> preuve -> post-exploit.
  - Attendu: taxonomie hints respectee (`Hint1=5`, `Hint2=12`, `Hint3=25`).
  - Preuve: notes de verification + references fichiers.

### 1.3 Masquage `targetEndpoint` (`backend/api-gateway/src/controllers/ctf.controller.ts`)

- [ ] `P1-1.3-01` Challenge non resolu sans auth refuse.
  - Commande: `curl -s -i http://localhost:8000/api/ctf/challenges/HSM-001`
  - Attendu: `401 Unauthorized` ou `403 Forbidden`.
  - Preuve: en-tetes + code HTTP.
- [ ] `P1-1.3-02` Etudiant non resolu ne voit pas endpoint/template.
  - Commande: `curl -s http://localhost:8000/api/ctf/challenges/HSM-001 -H "x-student-id: studentA"`
  - Attendu: JSON contient `"targetEndpoint": null` et `"commandTemplate": null`.
  - Preuve: payload JSON reponse.
- [ ] `P1-1.3-03` Apres resolution, endpoint visible pour l etudiant concerne.
  - Action: marquer `HSM-001` resolu pour `studentA` puis refaire l appel.
  - Attendu: `targetEndpoint` renseigne.
  - Preuve: avant/apres JSON.

### 1.4 Suppression toggle public `/hsm/config` (`backend/hsm-simulator/src/routes/hsm.routes.ts`)

- [ ] `P1-1.4-01` `POST /hsm/config` injoignable.
  - Commande: `curl -i -X POST http://localhost:8011/hsm/config -d "{}"`
  - Attendu: `404 Not Found`.
  - Preuve: code HTTP + body.
- [ ] `P1-1.4-02` `GET /hsm/config` injoignable.
  - Commande: `curl -i http://localhost:8011/hsm/config`
  - Attendu: `404 Not Found`.
  - Preuve: code HTTP + body.

### 1.5 VulnEngine per-student via Redis (`VulnEngine.ts`, `app.ts`, `ctf.controller.ts`, routes internes)

#### 1.5.1 Initialisation Redis

- [ ] `P1-1.5.1-01` Variable `REDIS_URL` presente dans HSM.
  - Commande: `docker exec pmp-hsm-simulator env | grep REDIS_URL`
  - Attendu: variable presente et non vide.
  - Preuve: sortie env.
- [ ] `P1-1.5.1-02` Aucun crash Redis au demarrage.
  - Commande: `docker logs pmp-hsm-simulator --tail 50`
  - Attendu: pas d erreur de connexion Redis.
  - Preuve: extrait logs.

#### 1.5.2 Isolation des configurations (scenario HSM-003)

- [ ] `P1-1.5.2-01` Demarrage challenge pour `studentA` cree la config Redis attendue.
  - Action: lancer `startChallenge` pour `HSM-003` avec `studentA`.
  - Commande: `redis-cli GET "ctf:vuln:studentA:HSM-003:config"`
  - Attendu: `{"keyLeakInLogs":true}`.
  - Preuve: sortie Redis + appel API de demarrage.
- [ ] `P1-1.5.2-02` `studentB` ne recupere pas la config de `studentA`.
  - Commande: `redis-cli GET "ctf:vuln:studentB:HSM-003:config"`
  - Attendu: `(nil)`.
  - Preuve: sortie Redis.
- [ ] `P1-1.5.2-03` Comportement vulnerable actif pour `studentA`.
  - Commande: `curl -i -H "x-student-id: studentA" http://10.10.10.11:8011/hsm/keys`
  - Attendu: comportement coherent avec la faille active (leak dans logs).
  - Preuve: reponse API + logs cibles.
- [ ] `P1-1.5.2-04` Comportement non vulnerable pour `studentB`.
  - Commande: `curl -i -H "x-student-id: studentB" http://10.10.10.11:8011/hsm/keys`
  - Attendu: comportement par defaut (pas de leak).
  - Preuve: reponse API + logs cibles.

#### 1.5.3 TTL

- [ ] `P1-1.5.3-01` TTL de la config `studentA` correct.
  - Commande: `redis-cli TTL "ctf:vuln:studentA:HSM-003:config"`
  - Attendu: proche de `86400`.
  - Preuve: valeur TTL.
- [ ] `P1-1.5.3-02` Apres expiration/suppression, retour comportement par defaut.
  - Commande: `redis-cli DEL "ctf:vuln:studentA:HSM-003:config"`
  - Action: rejouer la requete HSM precedente.
  - Attendu: comportement non vulnerable.
  - Preuve: sortie DEL + reponse API/logs.

#### 1.5.4 Autres services (switch/fraud/acs) via `REPLAY-001`

- [ ] `P1-1.5.4-01` Demarrage `REPLAY-001` pour `studentA` cree une config Redis.
  - Action: lancer `startChallenge` via API.
  - Attendu: cle Redis presente (meme vide si design).
  - Preuve: appel API + lecture Redis.
- [ ] `P1-1.5.4-02` Transaction rejouee acceptee pour `studentA`.
  - Commande: `curl -i -H "x-student-id: studentA" -d "{\"stan\":\"123\"}" http://10.10.10.12:8004/transaction`
  - Attendu: transaction acceptee (faille active).
  - Preuve: code HTTP + body.
- [ ] `P1-1.5.4-03` Transaction equivalente rejetee pour `studentB`.
  - Commande: `curl -i -H "x-student-id: studentB" -d "{\"stan\":\"123\"}" http://10.10.10.12:8004/transaction`
  - Attendu: transaction rejetee (faille inactive).
  - Preuve: code HTTP + body.

## 2) Phase 2 - Vrai Reseau (Niveau 2)

### 2.1 Reseau Docker CTF isole + IP statiques (`docker/docker-compose.yml`)

- [ ] `P2-2.1-01` Subnet `ctf-target-net` correct.
  - Commande: `docker network inspect ctf-target-net | jq '.[0].IPAM.Config'`
  - Attendu: subnet `10.10.10.0/24`.
  - Preuve: sortie inspect.
- [ ] `P2-2.1-02` IP statique HSM correcte.
  - Commande: `docker inspect pmp-hsm-simulator | jq '.[0].NetworkSettings.Networks."ctf-target-net".IPAddress'`
  - Attendu: `10.10.10.11`.
  - Preuve: sortie inspect.
- [ ] `P2-2.1-03` IP statique switch correcte.
  - Commande: `docker inspect pmp-sim-network-switch | jq '.[0].NetworkSettings.Networks."ctf-target-net".IPAddress'`
  - Attendu: `10.10.10.12`.
  - Preuve: sortie inspect.
- [ ] `P2-2.1-04` IP statique ACS correcte.
  - Commande: `docker inspect pmp-acs-simulator | jq '.[0].NetworkSettings.Networks."ctf-target-net".IPAddress'`
  - Attendu: `10.10.10.13`.
  - Preuve: sortie inspect.
- [ ] `P2-2.1-05` IP statique issuer correcte.
  - Commande: `docker inspect pmp-sim-issuer-service | jq '.[0].NetworkSettings.Networks."ctf-target-net".IPAddress'`
  - Attendu: `10.10.10.14`.
  - Preuve: sortie inspect.
- [ ] `P2-2.1-06` IP statique fraud correcte.
  - Commande: `docker inspect pmp-sim-fraud-detection | jq '.[0].NetworkSettings.Networks."ctf-target-net".IPAddress'`
  - Attendu: `10.10.10.15`.
  - Preuve: sortie inspect.
- [ ] `P2-2.1-07` IP statique auth-engine correcte.
  - Commande: `docker inspect pmp-sim-auth-engine | jq '.[0].NetworkSettings.Networks."ctf-target-net".IPAddress'`
  - Attendu: `10.10.10.16`.
  - Preuve: sortie inspect.
- [ ] `P2-2.1-08` IP attackbox correcte.
  - Commande: `docker inspect pmp-ctf-attackbox | jq '.[0].NetworkSettings.Networks."ctf-target-net".IPAddress'`
  - Attendu: `10.10.10.20`.
  - Preuve: sortie inspect.
- [ ] `P2-2.1-09` Attackbox garde acces `monetic-network`.
  - Commande: `docker exec pmp-ctf-attackbox ping -c 1 api-gateway`
  - Attendu: ping reussi.
  - Preuve: sortie ping.
- [ ] `P2-2.1-10` DNS desactive dans attackbox.
  - Commande: `docker exec pmp-ctf-attackbox cat /etc/resolv.conf`
  - Attendu: `nameserver 127.0.0.1` ou fichier vide.
  - Preuve: sortie resolv.conf.
- [ ] `P2-2.1-11` Resolution de noms bloquee depuis attackbox.
  - Commande: `docker exec pmp-ctf-attackbox nslookup hsm-simulator`
  - Attendu: `NXDOMAIN` (ou echec de resolution equivalent).
  - Preuve: sortie nslookup.
- [ ] `P2-2.1-12` Variables spoon-feeding supprimees de attackbox.
  - Commande: `docker inspect pmp-ctf-attackbox | jq '.[0].Config.Env'`
  - Attendu: absence `PMP_HSM_URL`, `PMP_SWITCH_URL`, `PMP_ACS_URL`.
  - Attendu: `PMP_GATEWAY_URL` peut rester.
  - Preuve: liste env.

### 2.2 Upgrade attackbox: tshark + Scapy (`docker/ctf-attackbox/Dockerfile`)

- [ ] `P2-2.2-01` `tshark` installe.
  - Commande: `docker exec pmp-ctf-attackbox which tshark`
  - Attendu: `/usr/bin/tshark`.
  - Preuve: sortie which.
- [ ] `P2-2.2-02` `scapy` importable.
  - Commande: `docker exec pmp-ctf-attackbox python3 -c "import scapy"`
  - Attendu: pas d erreur.
  - Preuve: code retour commande.
- [ ] `P2-2.2-03` `pyiso8583` importable.
  - Commande: `docker exec pmp-ctf-attackbox python3 -c "import pyiso8583"`
  - Attendu: pas d erreur.
  - Preuve: code retour commande.
- [ ] `P2-2.2-04` Capabilities `tshark` correctes.
  - Commande: `docker exec pmp-ctf-attackbox getcap /usr/bin/tshark`
  - Attendu: `cap_net_raw,cap_net_admin+eip`.
  - Preuve: sortie getcap.
- [ ] `P2-2.2-05` User `attacker` dans groupe `wireshark`.
  - Commande: `docker exec pmp-ctf-attackbox id attacker`
  - Attendu: groupe `wireshark` present.
  - Preuve: sortie id.

### 2.3 MITM-001 - Vraie capture trafic

#### 2.3.1 Generation auto de transactions

- [ ] `P2-2.3.1-01` Emission periodique visible dans logs switch.
  - Commande: `docker logs pmp-sim-network-switch --tail 100`
  - Attendu: traces d envoi transaction (cadence ~60s).
  - Preuve: extrait logs horodate.
- [ ] `P2-2.3.1-02` Traces de preuve Redis (optionnel) visibles si activees.
  - Commande: `redis-cli KEYS "ctf:proof:*"`
  - Attendu: eventuelles cles presentes.
  - Preuve: sortie Redis.

#### 2.3.2 Capture et soumission etudiant

- [ ] `P2-2.3.2-01` Capture `tshark` en arriere-plan demarree.
  - Commande: `docker exec -d pmp-ctf-attackbox bash -c "tshark -i ctf0 -f 'tcp port 8004' -T fields -e http.file_data > /tmp/cap.txt"`
  - Attendu: process capture lance.
  - Preuve: PID/process list.
- [ ] `P2-2.3.2-02` Fichier capture contient `cvv`.
  - Action: attendre >=60s puis lire le fichier.
  - Commande: `docker exec pmp-ctf-attackbox cat /tmp/cap.txt`
  - Attendu: ligne JSON contenant champ `cvv`.
  - Preuve: extrait fichier.
- [ ] `P2-2.3.2-03` Soumission du bon CVV valide le challenge.
  - Commande: `curl -i -X POST http://10.10.10.10:8000/api/ctf/prove-mitm -H "x-student-id: studentA" -H "Content-Type: application/json" -d "{\"challengeCode\":\"MITM-001\",\"capturedCvv\":\"123\"}"`
  - Attendu: `200 OK` + succes/flag.
  - Preuve: reponse API.
- [ ] `P2-2.3.2-04` Soumission d un mauvais CVV echoue.
  - Commande: `curl -i -X POST http://10.10.10.10:8000/api/ctf/prove-mitm -H "x-student-id: studentA" -H "Content-Type: application/json" -d "{\"challengeCode\":\"MITM-001\",\"capturedCvv\":\"999\"}"`
  - Attendu: `400` ou `403`.
  - Preuve: reponse API.

#### 2.3.3 Suppression ancien header flag

- [ ] `P2-2.3.3-01` Header `X-CTF-Flag-MITM001` absent.
  - Commande: `curl -v http://10.10.10.12:8004/transaction/recent-logs`
  - Attendu: aucun header `X-CTF-Flag-MITM001`.
  - Preuve: en-tetes HTTP.

### 2.4 HSM-005 - Timing attack reel

#### 2.4.1 Suppression flag inconditionnel

- [ ] `P2-2.4.1-01` Header `X-CTF-Flag-HSM005` absent.
  - Commande: `curl -v -X POST http://10.10.10.11:8011/hsm/verify-mac -H "x-student-id: studentA" -H "Content-Type: application/json" -d "{\"mac\":\"0000\"}"`
  - Attendu: header absent.
  - Preuve: en-tetes HTTP.

#### 2.4.2 Validation attaque temporelle

- [ ] `P2-2.4.2-01` Script timing detecte un delta exploitable.
  - Commande: `docker exec pmp-ctf-attackbox python3 /opt/attackbox/samples/timing-attack.py --target 10.10.10.11 --port 8011 --student studentA`
  - Attendu: octet trouve avec delta `>3ms` + generation JSON de preuve.
  - Preuve: sortie script + fichier preuve.
- [ ] `P2-2.4.2-02` Soumission preuve valide reussit.
  - Commande: `curl -i -X POST http://10.10.10.10:8000/api/ctf/prove-timing-attack -H "x-student-id: studentA" -H "Content-Type: application/json" -d "{\"challengeCode\":\"HSM-005\",\"timingData\":[...],\"discoveredByte\":\"a3\"}"`
  - Attendu: `200 OK` + succes/flag.
  - Preuve: reponse API.
- [ ] `P2-2.4.2-03` Soumission preuve invalide echoue.
  - Commande: `curl -i -X POST http://10.10.10.10:8000/api/ctf/prove-timing-attack -H "x-student-id: studentA" -H "Content-Type: application/json" -d "{\"challengeCode\":\"HSM-005\",\"timingData\":[{\"d\":1}],\"discoveredByte\":\"00\"}"`
  - Attendu: `400` ou `403`.
  - Preuve: reponse API.

#### 2.4.3 Isolation de la faille timing

- [ ] `P2-2.4.3-01` Seul l etudiant active voit la variance temporelle.
  - Action: comparer mesures `studentA` (active) vs `studentB` (inactive).
  - Attendu: variance sensible uniquement pour l etudiant cible.
  - Preuve: tableau comparatif des timings.

### 2.5 REPLAY-001 - Vulnerabilite toujours active

- [ ] `P2-2.5-01` Transaction legitime acceptee.
  - Commande: `curl -i -X POST http://10.10.10.12:8004/transaction -H "x-student-id: studentA" -H "Content-Type: application/json" -d "{\"stan\":\"123456\",\"amount\":100}"`
  - Attendu: `200 OK`.
  - Preuve: reponse API.
- [ ] `P2-2.5-02` Rejeu strict de la meme transaction accepte.
  - Commande: meme commande que test precedent, rejouee.
  - Attendu: acceptee (pas de blocage replay).
  - Preuve: seconde reponse API.
- [ ] `P2-2.5-03` Comportement independant d une config Redis specifique.
  - Action: verifier absence de dependance a une cle config dediee.
  - Attendu: challenge exploitable sans preconfig manuelle.
  - Preuve: inspection Redis + execution test.

## 3) Phase 3 - Vrais protocoles (Niveau 3)

### 3.1 Serveur TCP ISO 8583 binaire (`Iso8583Server.ts`, `MessageParser.ts`, `index.ts`)

- [ ] `P3-3.1-01` Port 8583 ouvert.
  - Commande: `nmap -p 8583 10.10.10.12`
  - Attendu: `8583/tcp open`.
  - Preuve: sortie nmap.
- [ ] `P3-3.1-02` Connexion TCP basique possible.
  - Commande: `nc -zv 10.10.10.12 8583`
  - Attendu: connexion reussie.
  - Preuve: sortie netcat.
- [ ] `P3-3.1-03` Message ISO 0100 valide repond.
  - Action: envoyer message via script Python `pyiso8583`.
  - Attendu: reponse ISO recue.
  - Preuve: log script + hexdump message/reponse.
- [ ] `P3-3.1-04` `NET-003` accepte MTI `0110` en requete.
  - Action: envoyer requete MTI `0110`.
  - Attendu: acceptee (vulnerabilite presente).
  - Preuve: reponse serveur.
- [ ] `P3-3.1-05` `NET-004` accepte reversal STAN previsible.
  - Action: apres transaction, envoyer reversal avec STAN incremente.
  - Attendu: acceptee.
  - Preuve: traces transaction/reversal.
- [ ] `P3-3.1-06` `NET-005` accepte 0100 sans DE64 (MAC).
  - Action: construire et envoyer message sans DE64.
  - Attendu: accepte.
  - Preuve: payload envoye + reponse.

### 3.2 Serveur TCP PKCS#11 simplifie HSM (`Pkcs11TcpServer.ts`, `index.ts`)

- [ ] `P3-3.2-01` Port 5959 ouvert.
  - Commande: `nmap -p 5959 10.10.10.11`
  - Attendu: `5959/tcp open`.
  - Preuve: sortie nmap.
- [ ] `P3-3.2-02` Commande `C_GetSlotList (0x0001)` repond.
  - Action: envoyer payload `[4B:0x0001][4B:0]`.
  - Attendu: retour donnees slot.
  - Preuve: hexdump requete/reponse.
- [ ] `P3-3.2-03` Variante `HSM-001` info leak sans auth.
  - Action: rejouer `C_GetSlotList` sans authentification.
  - Attendu: infos retournees.
  - Preuve: reponse brute.
- [ ] `P3-3.2-04` Variante `KEY-002` `C_FindObjects (0x0004)` sans auth.
  - Action: envoyer commande handle `0`.
  - Attendu: objets/cles listes.
  - Preuve: reponse brute.

### 3.3 Flow 3DS 2.2 complet (`ACSController.ts`)

- [ ] `P3-3.3-01` Endpoint AReq present.
  - Commande: `curl -I http://10.10.10.13:8013/acs/areq`
  - Attendu: `405 Method Not Allowed` (endpoint present).
  - Preuve: en-tetes HTTP.
- [ ] `P3-3.3-02` AReq valide retourne ARes avec `transStatus`.
  - Action: envoyer requete 3DS 2.2 conforme.
  - Attendu: ARes valide.
  - Preuve: payload req/res.
- [ ] `P3-3.3-03` `3DS-001` OTP fixe `123456` acceptee.
  - Action: soumettre CReq avec OTP `123456`.
  - Attendu: accepte.
  - Preuve: reponse API.
- [ ] `P3-3.3-04` `3DS-002` `threeDSServerTransID` previsible acceptee.
  - Action: forger CReq avec UUID predictible.
  - Attendu: accepte.
  - Preuve: payload forge + reponse.
- [ ] `P3-3.3-05` `3DS-003` injection `cardholderInfo` provoque anomalie.
  - Action: injecter dans email/cardholderInfo.
  - Attendu: bypass ou comportement anormal observable.
  - Preuve: requete + effet constate.

## 4) Verifications finales securite/isolation

- [ ] `FIN-01` Independence des configs etudiants.
  - Action: lancer 2 etudiants sur 2 challenges differents en parallele.
  - Attendu: aucune contamination inter-etudiant.
  - Preuve: logs Redis + reponses API comparees.
- [ ] `FIN-02` Preuves stockees par etudiant avec TTL.
  - Commande: `redis-cli KEYS "ctf:proof:*"` puis `redis-cli TTL <cle>`
  - Attendu: cles presentes + TTL coherent (`300s`, `3600s` selon design).
  - Preuve: sortie Redis.
- [ ] `FIN-03` Endpoints config publique toujours desactives.
  - Commande: `curl -i http://10.10.10.11:8011/hsm/config`
  - Attendu: `404`.
  - Preuve: reponse HTTP.
- [ ] `FIN-04` Variables spoon-feeding absentes en runtime.
  - Commande: `docker exec pmp-ctf-attackbox env | grep PMP_`
  - Attendu: uniquement `PMP_GATEWAY_URL` (si conservee).
  - Preuve: sortie env.
- [ ] `FIN-05` Rapport final complete et valide.
  - Action: compiler resultats, ecarts, causes, corrections proposees.
  - Attendu: 1 document final avec statut global de conformite.
  - Preuve: rapport `docs/test-evidence/<date-run>/REPORT.md`.

## 5) Criteres de cloture de campagne

- [ ] `CLOSE-01` 100% des tests executes (hors `N/A` justifies).
- [ ] `CLOSE-02` Chaque `FAIL` a un ticket de correction associe.
- [ ] `CLOSE-03` Re-test des correctifs effectue et trace.
- [ ] `CLOSE-04` Validation finale signee par responsable technique.
