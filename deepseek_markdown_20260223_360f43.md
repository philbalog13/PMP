# Plan de test complet – Refonte CTF (3 phases)

Ce document détaille les tests à effectuer pour valider l’implémentation de la refonte de la plateforme CTF, phase par phase, fichier par fichier.

---

## Prérequis

- Environnement Docker fonctionnel avec les services redémarrés après modifications.
- Accès à l’attackbox : `docker exec -it pmp-ctf-attackbox bash`
- Redis accessible : `docker exec pmp-redis redis-cli`
- Connaissance d’identifiants étudiants fictifs (ex. `studentA`, `studentB`).
- Outils installés localement : `curl`, `jq`, `nmap`, `docker`, `redis-cli`.

---

## Phase 1 – Tuer le Spoon-Feeding (Niveau 1)

### 1.1 Réécriture de `lab.sh`

**Fichier :** `docker/ctf-attackbox/scripts/lab.sh`

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Absence de solutions explicites | `grep -c "jq .flag" docker/ctf-attackbox/scripts/lab.sh` | `0` |
| Format mission pour HSM-001 | `docker exec pmp-ctf-attackbox lab.sh HSM-001` | Affiche un brief avec `[MISSION]`, `[CATEGORY]`, `CONTEXT`, `TARGET ENVIRONMENT`, `OBJECTIVE` et la mention `lab hint HSM-001`. Aucun endpoint, port, payload, valeur magique. |
| Commande `lab hint` | `docker exec pmp-ctf-attackbox lab hint HSM-001` | Affiche un indice de niveau 1 (catégorie d’attaque) avec son coût en points (simulé). |

### 1.2 Réécriture des Guided Steps (fichiers de challenges)

**Fichiers :** tous les `*Challenges.ts` dans `backend/api-gateway/src/data/ctf/`

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Plus de solutions dans les descriptions | `grep -r "stepDescription" backend/api-gateway/src/data/ctf/ \| grep -E "(curl\|jq\|http://\|/hsm/keys)"` | Aucune occurrence (sauf éventuellement dans des commentaires de code). |
| Séquence logique des étapes | (manuel) Ouvrir quelques fichiers | Chaque challenge suit : reconnaissance, énumération, identification vulnérabilité, exploitation, preuve, post‑exploit. Les hints suivent la taxonomie (Hint 1 = 5pts, Hint 2 = 12pts, Hint 3 = 25pts). |

### 1.3 Masquer `targetEndpoint` dans l’API

**Fichier :** `backend/api-gateway/src/controllers/ctf.controller.ts`

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Challenge non résolu sans authentification | `curl -s http://localhost:8000/api/ctf/challenges/HSM-001` | `401 Unauthorized` (ou `403`) |
| Avec authentification étudiant A (non résolu) | (commande avec JWT ou header `x-student-id`) | Le JSON doit contenir `"targetEndpoint": null` et `"commandTemplate": null` |
| Après résolution du challenge pour A | Marquer comme résolu (admin ou soumission flag) puis refaire la requête | `targetEndpoint` doit être renseigné (ex. `"http://hsm-simulator:8011/hsm/keys"`) |

### 1.4 Supprimer le Toggle Public `/hsm/config`

**Fichier :** `backend/hsm-simulator/src/routes/hsm.routes.ts`

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| POST `/hsm/config` | `curl -X POST http://localhost:8011/hsm/config -d '{}'` | `404 Not Found` |
| GET `/hsm/config` | `curl http://localhost:8011/hsm/config` | `404 Not Found` |

### 1.5 VulnEngine Per-Student via Redis

**Fichiers :** `backend/hsm-simulator/src/services/VulnEngine.ts`, `app.ts`, `ctf.controller.ts`, route interne `/internal/ctf/vuln-init`, etc.

#### 1.5.1 Initialisation Redis

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Variable Redis dans le HSM | `docker exec pmp-hsm-simulator env \| grep REDIS_URL` | Présente et non vide |
| Logs de démarrage | `docker logs pmp-hsm-simulator --tail 20` | Pas d’erreur Redis |

#### 1.5.2 Isolation des configurations

**Scénario :** HSM-003 a `initialVulnConfig: { keyLeakInLogs: true }`. Étudiant A démarre le challenge, B non.

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Démarrer HSM-003 pour A (via API `startChallenge`) | (appel à faire via frontend ou curl) | Dans Redis : `redis-cli GET "ctf:vuln:studentA:HSM-003:config"` → `{"keyLeakInLogs":true}` |
| Vérifier que B n’a rien | `redis-cli GET "ctf:vuln:studentB:HSM-003:config"` | `(nil)` |
| Requête HSM avec A authentifié sur endpoint vulnérable | `curl -H "x-student-id: studentA" http://10.10.10.11:8011/hsm/keys` | Le comportement doit refléter la config (logs contenant clé). |
| Requête identique pour B | Même curl avec `studentB` | Comportement par défaut (non vulnérable). |

#### 1.5.3 TTL

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Vérifier TTL de la clé A | `redis-cli TTL "ctf:vuln:studentA:HSM-003:config"` | 86400 (ou proche) |
| Après expiration (ou `DEL`) | `redis-cli DEL "ctf:vuln:studentA:HSM-003:config"` puis refaire requête HSM | Comportement par défaut |

#### 1.5.4 Autres services (sim-fraud-detection, acs-simulator, sim-network-switch)

Tester un challenge utilisant le switch, ex. REPLAY-001.

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Démarrer REPLAY-001 pour A | `startChallenge` via API | Redis doit contenir une config (même vide). |
| Envoyer transaction rejouée avec A | `curl -H "x-student-id: studentA" -d '{"stan":"123"}' http://10.10.10.12:8004/transaction` | Acceptée (faille active) |
| Même transaction avec B | `curl -H "x-student-id: studentB" ...` | Rejetée (faille inactive) |

---

## Phase 2 – Vrai Réseau (Niveau 2)

### 2.1 Réseau Docker CTF isolé avec IPs statiques

**Fichier :** `docker/docker-compose.yml`

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Subnet du réseau cible | `docker network inspect ctf-target-net \| jq '.[0].IPAM.Config'` | `"Subnet": "10.10.10.0/24"` |
| IP statique HSM | `docker inspect pmp-hsm-simulator \| jq '.[0].NetworkSettings.Networks.ctf-target-net.IPAddress'` | `"10.10.10.11"` |
| IP statique switch | `docker inspect pmp-sim-network-switch \| jq ...` | `"10.10.10.12"` |
| IP statique ACS | `docker inspect pmp-acs-simulator \| jq ...` | `"10.10.10.13"` |
| IP statique issuer | `docker inspect pmp-sim-issuer-service \| jq ...` | `"10.10.10.14"` |
| IP statique fraud | `docker inspect pmp-sim-fraud-detection \| jq ...` | `"10.10.10.15"` |
| IP statique auth engine | `docker inspect pmp-sim-auth-engine \| jq ...` | `"10.10.10.16"` |
| IP attackbox sur réseau cible | `docker inspect pmp-ctf-attackbox \| jq '.[0].NetworkSettings.Networks.ctf-target-net.IPAddress'` | `"10.10.10.20"` |
| Attackbox aussi sur monetic-network | `docker exec pmp-ctf-attackbox ping -c 1 api-gateway` (api-gateway sur monetic) | Succès |
| DNS désactivé dans attackbox | `docker exec pmp-ctf-attackbox cat /etc/resolv.conf` | `nameserver 127.0.0.1` ou vide |
| Résolution de nom échoue | `docker exec pmp-ctf-attackbox nslookup hsm-simulator` | NXDOMAIN |
| Variables spoon‑feeding supprimées | `docker inspect pmp-ctf-attackbox \| jq '.[0].Config.Env'` | Ne contient pas `PMP_HSM_URL`, `PMP_SWITCH_URL`, `PMP_ACS_URL` (sauf `PMP_GATEWAY_URL`) |

### 2.2 Upgrade Attackbox : tshark + Scapy

**Fichier :** `docker/ctf-attackbox/Dockerfile`

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| tshark présent | `docker exec pmp-ctf-attackbox which tshark` | `/usr/bin/tshark` |
| scapy présent | `docker exec pmp-ctf-attackbox python3 -c "import scapy"` | Pas d’erreur |
| pyiso8583 présent | `docker exec pmp-ctf-attackbox python3 -c "import pyiso8583"` | Pas d’erreur |
| Capabilities tshark | `docker exec pmp-ctf-attackbox getcap /usr/bin/tshark` | `cap_net_raw,cap_net_admin+eip` |
| Groupe wireshark pour attacker | `docker exec pmp-ctf-attackbox id attacker` | `attacker` dans groupe `wireshark` |

### 2.3 MITM-001 : Vraie Capture de Trafic

**Fichiers :** `sim-network-switch` modifié, `ctfProof.controller.ts`, route `/prove-mitm`

#### 2.3.1 Génération automatique de transactions

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Logs de transaction | `docker logs pmp-sim-network-switch --tail 50` | Présence de logs indiquant l’envoi d’une transaction (toutes les 60s) |
| CVV stocké en Redis (optionnel) | `redis-cli KEYS "ctf:proof:*"` | Peut montrer des clés mais le test principal est la capture. |

#### 2.3.2 Capture par l’étudiant

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Lancer tshark en arrière-plan | `docker exec -d pmp-ctf-attackbox bash -c "tshark -i ctf0 -f 'tcp port 8004' -T fields -e http.file_data > /tmp/cap.txt"` | PID créé |
| Attendre 60s, stopper capture, examiner fichier | `docker exec pmp-ctf-attackbox cat /tmp/cap.txt` | Doit contenir des lignes JSON avec un champ `cvv` (ex. `"cvv":"123"`) |
| Soumettre le CVV trouvé | `curl -X POST http://10.10.10.10:8000/api/ctf/prove-mitm -H "x-student-id: studentA" -d '{"challengeCode":"MITM-001","capturedCvv":"123"}'` | Retourne `200 OK` avec un flag (ou message de succès) |
| Soumettre un mauvais CVV | Même requête avec `"999"` | `400 Bad Request` ou `403` |

#### 2.3.3 Ancien header supprimé

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Vérifier réponse HTTP du switch | `curl -v http://10.10.10.12:8004/transaction/recent-logs` | Pas d’en‑tête `X-CTF-Flag-MITM001` |

### 2.4 HSM-005 : Timing Attack Réel

**Fichiers :** `hsm.controller.ts` (suppression header inconditionnel), `ctfProof.controller.ts` (validation timing)

#### 2.4.1 Flag inconditionnel supprimé

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Requête quelconque au HSM | `curl -v -X POST http://10.10.10.11:8011/hsm/verify-mac -H "x-student-id: studentA" -d '{"mac":"0000"}'` | Pas d’en‑tête `X-CTF-Flag-HSM005` |

#### 2.4.2 Test de la vulnérabilité temporelle

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Lancer le script d’attaque depuis attackbox (ex. `/opt/attackbox/samples/timing-attack.py`) | `python3 /opt/attackbox/samples/timing-attack.py --target 10.10.10.11 --port 8011 --student studentA` | Le script doit identifier un octet avec delta >3ms et produire un fichier JSON de preuve. |
| Soumettre la preuve | `curl -X POST http://10.10.10.10:8000/api/ctf/prove-timing-attack -H "x-student-id: studentA" -d '{"challengeCode":"HSM-005","timingData":[...],"discoveredByte":"a3"}'` | `200 OK` et flag |
| Soumettre une preuve invalide (mauvais octet ou delta faible) | Même requête avec données aléatoires | `400` / `403` |

#### 2.4.3 Isolation

Vérifier que seul l’étudiant avec la config HSM-005 activée a le délai variable.

### 2.5 REPLAY-001 : Vulnérabilité Toujours Active

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Envoyer transaction légitime | `curl -X POST http://10.10.10.12:8004/transaction -H "x-student-id: studentA" -d '{"stan":"123456","amount":100}'` | `200 OK` |
| Renvoyer exactement la même | Même commande | Acceptée (pas de blocage) |
| Vérifier que cela fonctionne sans config Redis particulière | Aucune clé Redis nécessaire pour ce challenge | |

---

## Phase 3 – Vrais Protocoles (Niveau 3)

### 3.1 Serveur TCP ISO 8583 Binaire

**Fichiers :** `Iso8583Server.ts`, `MessageParser.ts`, modifications de `index.ts`

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Port 8583 ouvert | `nmap -p 8583 10.10.10.12` | `8583/tcp open` |
| Connexion TCP basique | `nc -zv 10.10.10.12 8583` | Succès |
| Envoi d’un message ISO 8583 valide (0100) | (script Python avec pyiso8583) | Réponse ISO |
| NET-003 : MTI 0110 en requête | Envoyer message avec MTI 0110 | Accepté (vulnérabilité) |
| NET-004 : STAN prévisible | Après une transaction, envoyer un reversal avec STAN incrémenté | Accepté |
| NET-005 : 0100 sans DE64 (MAC) | Construire message sans MAC | Accepté |

### 3.2 Serveur TCP PKCS#11 Simplifié pour le HSM

**Fichiers :** `Pkcs11TcpServer.ts`, modifications de `index.ts`

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Port 5959 ouvert | `nmap -p 5959 10.10.10.11` | `5959/tcp open` |
| Envoi commande C_GetSlotList (0x0001) | Construire payload `[4B:0x0001][4B:0]` | Réponse avec données de slot |
| HSM-001 variant : info leak sans auth | Même commande sans authentification préalable | Doit retourner des infos |
| KEY-002 variant : C_FindObjects (0x0004) sans auth | Envoyer commande avec handle 0 | Doit lister des objets (clés) |

### 3.3 Flow 3DS 2.2 Complet

**Fichier :** `ACSController.ts` modifié

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Endpoints existent | `curl -I http://10.10.10.13:8013/acs/areq` | `405 Method Not Allowed` (indique présence) |
| AReq valide | Envoyer requête conforme 3DS 2.2 | Retourne ARes avec transStatus |
| 3DS-001 : OTP fixe | Après ARes, soumettre CReq avec OTP=123456 | Accepté |
| 3DS-002 : threeDSServerTransID prévisible | Forger CReq avec UUID basé sur `Math.random()` | Accepté |
| 3DS-003 : injection dans cardholderInfo | Inclure tentative d’injection dans email | Provoque un bypass ou un comportement anormal |

---

## Vérifications finales de sécurité et d’isolation

| Test | Commande | Résultat attendu |
|------|----------|------------------|
| Indépendance des configs | Lancer deux étudiants sur des challenges différents en parallèle | Les comportements sont indépendants (logs Redis, réponses) |
| Preuves stockées par étudiant avec TTL | `redis-cli KEYS "ctf:proof:*"` puis `TTL <clé>` | Clés existent, TTL cohérent (300s, 3600s) |
| Anciens endpoints de config publique désactivés | `curl http://10.10.10.11:8011/hsm/config` | `404` |
| Variables spoon‑feeding absentes | `docker exec pmp-ctf-attackbox env \| grep PMP_` | Seulement `PMP_GATEWAY_URL` |

---

Ce plan de test couvre l’intégralité des modifications. Les résultats doivent être documentés pour valider la conformité de l’implémentation.