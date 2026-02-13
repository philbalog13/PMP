# PMP CTF AttackBox (mode TryHackMe)

## Objectif
Donner a chaque etudiant un terminal d'attaque reel dans le reseau PMP, directement accessible depuis chaque page challenge CTF (`/student/ctf/[code]`).

## Acces
- URL terminal: `http://localhost:7681`
- Depuis un challenge CTF: bouton `Aller a la page terminal` (panneau `AttackBox reseau`).
- Route dediee dans le portail: `/student/ctf/<CODE>/terminal` (ex: `/student/ctf/HSM-001/terminal`).

## Outils preinstalles
- `bash`, `curl`, `jq`
- `nc`, `nmap`, `tcpdump`
- `nslookup`, `ping`, `traceroute`
- `openssl`, `python3`, `pip3`
- `git`, `vim`, `docker` (lecture des logs conteneurs lab)

Commande utile:
```bash
tools
```

## Cibles reseau disponibles
- `http://api-gateway:8000`
- `http://hsm-simulator:8011`
- `http://sim-network-switch:8004`
- `http://sim-issuer-service:8005`
- `http://sim-pos-service:8002`
- `http://acs-simulator:8013`
- `http://sim-fraud-detection:8007`

## Usage par lab (20/20)
Le terminal fournit un helper pour tous les challenges:

```bash
lab
lab HSM-001
lab HSM-002
lab HSM-003
...
lab CRYPTO-002
```

Le helper `lab <CODE>` affiche:
- objectif blackbox du challenge
- commandes de recon/exploit realistes
- commandes de preuve/post-exploitation (quand applicable)

## Variables de configuration
- `NEXT_PUBLIC_CTF_ATTACKBOX_URL` (frontend portal)
- Valeur par defaut: `http://localhost:7681`

## Services Docker ajoutes
- `ctf-attackbox` dans `docker-compose.yml`
- `ctf-attackbox` dans `docker-compose-runtime.yml`
