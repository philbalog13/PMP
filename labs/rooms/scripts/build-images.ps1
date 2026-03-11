param(
  [switch]$NoCache
)

$ErrorActionPreference = 'Stop'

$buildArg = ''
if ($NoCache) {
  $buildArg = '--no-cache'
}

Write-Host '[rooms] building PAY-001 images'
docker build $buildArg -t pmp-ctf-pay001-pos labs/rooms/PAY-001/pos-terminal
docker build $buildArg -t pmp-ctf-pay001-bank labs/rooms/PAY-001/bank-backend

Write-Host '[rooms] building PCI-001 images'
docker build $buildArg -t pmp-ctf-pci001-web labs/rooms/PCI-001/web

Write-Host '[rooms] building API-001 images'
docker build $buildArg -t pmp-ctf-api001 labs/rooms/API-001/api

Write-Host '[rooms] building DORA-001 images'
docker build $buildArg -t pmp-ctf-dora001-frontend labs/rooms/DORA-001/frontend
docker build $buildArg -t pmp-ctf-dora001-backend labs/rooms/DORA-001/backend
docker build $buildArg -t pmp-ctf-dora001-core labs/rooms/DORA-001/core

Write-Host '[rooms] build complete'
