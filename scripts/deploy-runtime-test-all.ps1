param(
    [switch]$NoBuild,
    [switch]$SkipSmoke,
    [switch]$SkipFrontendSmoke,
    [switch]$SkipImageBootstrap
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$command = if ($SkipSmoke) { "up" } else { "test-all" }
$args = @("scripts/runtime-stack.mjs", $command)

if ($NoBuild) {
    $args += "--no-build"
}
if ($SkipFrontendSmoke) {
    $args += "--skip-frontend-smoke"
}
if ($SkipImageBootstrap) {
    $args += "--skip-image-bootstrap"
}

& node @args
if ($LASTEXITCODE -ne 0) {
    throw "runtime-stack.mjs test-all failed"
}
