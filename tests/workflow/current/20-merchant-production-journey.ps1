$ErrorActionPreference = "Stop"

$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$target = Join-Path $rootDir "scripts\test-merchant-production-journey.ps1"

if (-not (Test-Path $target)) {
    Write-Error "Script cible introuvable: $target"
    exit 1
}

& powershell -ExecutionPolicy Bypass -File $target
exit $LASTEXITCODE
