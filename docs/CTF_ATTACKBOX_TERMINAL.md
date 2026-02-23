# PMP CTF AttackBox (mode TryHackMe)

## Objectif
Donner a chaque etudiant un terminal d attaque reel dans le reseau PMP, accessible depuis chaque challenge CTF (`/student/ctf/[code]`).

## Acces
- URL terminal: `http://localhost:7681`
- Depuis un challenge CTF: bouton `Aller a la page terminal` (panneau `AttackBox reseau`)
- Route dediee portail: `/student/ctf/<CODE>/terminal` (ex: `/student/ctf/HSM-001/terminal`)

## Manifest officiel des outils
Source de verite:
- `docker/ctf-attackbox/TOOL_MANIFEST.md`

Smoke test outillage:
- `docker/ctf-attackbox/scripts/smoke-tools.sh`

## Outils preinstalles (garantis)
- Core: `bash`, `curl`, `jq`, `git`, `tmux`, `python3`, `pip3`, `docker`
- Reseau: `nc`, `nmap`, `masscan`, `hping3`, `tcpdump`, `nslookup`, `ping`, `traceroute`
- Web: `httpie`, `ffuf`, `dirb`, `nikto`, `sqlmap`
- Password/Crypto: `hydra`, `john`, `hashcat`, `openssl`
- Wordlists: `/usr/share/wordlists/pmp-api.txt`, `/usr/share/wordlists/common.txt`

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

## Usage par lab (catalogue complet)
Le terminal fournit un helper pour tous les challenges:

```bash
lab
lab HSM-001
lab HSM-002
lab HSM-003
...
lab CRYPTO-002
lab EMV-003
lab BOSS-004
```

Le helper `lab <CODE>` affiche:
- objectif blackbox du challenge
- commandes de recon/exploit realistes
- commandes de preuve/post-exploitation (quand applicable)
- extraction automatique des `commandTemplate` depuis les donnees CTF embarquees

## Regle blackbox
- Les commandes proposees doivent etre executables depuis le terminal AttackBox sans dependre de la lecture du code source host.
- Si une etape pedagogique mentionne une verification "code source", le helper `lab` affiche une alternative blackbox.

## Variables de configuration
- `NEXT_PUBLIC_CTF_ATTACKBOX_URL` (frontend portal)
- Valeur par defaut: `http://localhost:7681`

## Services Docker ajoutes
- `ctf-attackbox` dans `docker-compose.yml`
- `ctf-attackbox` dans `docker-compose-runtime.yml`
