# PMP CTF AttackBox Tool Manifest

Version: 1.0  
Last updated: 2026-02-22

This manifest is the source of truth for tools guaranteed in the AttackBox image.

## Runtime model
- Base image: `debian:bookworm`
- Shell: `/bin/bash`
- User: `attacker`
- Docker CLI: available (`docker`) to interact with lab containers through mounted socket.

## Core utilities
- `bash`, `coreutils`, `findutils`, `grep`, `sed`, `gawk`
- `less`, `vim`, `nano`, `tree`, `htop`, `file`
- `wget`, `curl`, `ca-certificates`
- `git`, `tmux`, `sudo`, `unzip`, `xxd`

## Network and traffic tools
- `net-tools`, `iproute2`, `iputils-ping`, `traceroute`, `dnsutils`
- `netcat-openbsd` (`nc`), `socat`
- `tcpdump`, `nmap`, `masscan`, `hping3`

## Web testing tools
- `httpie` (`http`)
- `jq`
- `ffuf`
- `dirb`
- `nikto`
- `sqlmap`

## Password and crypto tools
- `hydra`
- `john`
- `hashcat`
- `openssl`

## Scripting
- `python3`, `pip3`, `python3-venv`
- `perl`

## Wordlists (guaranteed paths)
- `/usr/share/wordlists/pmp-api.txt`
- `/usr/share/wordlists/common.txt`

## Operational commands in AttackBox
- `tools`: print available tools and shortcuts
- `lab`: print challenge walkthroughs
- `targets`, `healthcheck`, `scanall`, `recon`, `fuzz`

## Explicitly out of scope
- Local source code browsing from the host repository is not guaranteed in AttackBox.
- Challenge instructions must remain executable in blackbox mode from network/API access.

## Validation
- Smoke script: `docker/ctf-attackbox/scripts/smoke-tools.sh`
- Expected result: exit code `0` when all manifest commands and paths are present.
