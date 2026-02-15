# PMP Comprehensive User Journey Test Script (Updated)
# Runs the maintained end-to-end journey scripts to avoid drift.

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Resolve-Path (Join-Path $scriptDir "..")

function Run-Test {
    param(
        [string]$Name,
        [string]$Path
    )

    Write-Host "`n--- $Name ---" -ForegroundColor Cyan
    Write-Host "Running: $Path" -ForegroundColor DarkGray

    & powershell -ExecutionPolicy Bypass -File $Path
    $code = $LASTEXITCODE

    if ($code -eq 0) {
        Write-Host "[OK] $Name" -ForegroundColor Green
        return $true
    }

    Write-Host "[FAILED] $Name (exit=$code)" -ForegroundColor Red
    return $false
}

Write-Host "========================================"
Write-Host "   PMP USER JOURNEY TESTING (UPDATED)"
Write-Host "========================================"

$tests = @(
    @{ Name = "Student Production Journey"; Path = (Join-Path $scriptDir "test-student-production-journey.ps1") }
    @{ Name = "Instructor Production Journey"; Path = (Join-Path $scriptDir "test-instructor-production-journey.ps1") }
    @{ Name = "Client Production Journey"; Path = (Join-Path $scriptDir "test-client-production-journey.ps1") }
    @{ Name = "Merchant Production Journey"; Path = (Join-Path $scriptDir "test-merchant-production-journey.ps1") }
    @{ Name = "Vuln Sandbox Journey"; Path = (Join-Path $rootDir "test-vuln-sandbox.ps1") }
)

$failed = 0
foreach ($t in $tests) {
    $ok = Run-Test -Name $t.Name -Path $t.Path
    if (-not $ok) { $failed++ }
}

Write-Host "`n========================================"
Write-Host "   SUMMARY"
Write-Host "========================================"
if ($failed -eq 0) {
    Write-Host "All journeys passed." -ForegroundColor Green
    exit 0
}

Write-Host "$failed journey(s) failed." -ForegroundColor Red
exit 1

