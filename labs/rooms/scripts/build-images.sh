#!/usr/bin/env bash
set -euo pipefail

NO_CACHE=""
if [[ "${1:-}" == "--no-cache" ]]; then
  NO_CACHE="--no-cache"
fi

echo "[rooms] building PAY-001 images"
docker build ${NO_CACHE} -t pmp-ctf-pay001-pos labs/rooms/PAY-001/pos-terminal
docker build ${NO_CACHE} -t pmp-ctf-pay001-bank labs/rooms/PAY-001/bank-backend

echo "[rooms] building PCI-001 images"
docker build ${NO_CACHE} -t pmp-ctf-pci001-web labs/rooms/PCI-001/web

echo "[rooms] building API-001 images"
docker build ${NO_CACHE} -t pmp-ctf-api001 labs/rooms/API-001/api

echo "[rooms] building DORA-001 images"
docker build ${NO_CACHE} -t pmp-ctf-dora001-frontend labs/rooms/DORA-001/frontend
docker build ${NO_CACHE} -t pmp-ctf-dora001-backend labs/rooms/DORA-001/backend
docker build ${NO_CACHE} -t pmp-ctf-dora001-core labs/rooms/DORA-001/core

echo "[rooms] build complete"

