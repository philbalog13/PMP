$ErrorActionPreference = "Stop"

function Run-Step {
    param(
        [string]$Name,
        [string]$RelativePath
    )

    $target = Join-Path $PSScriptRoot $RelativePath
    Write-Host "`n--- $Name ---" -ForegroundColor Cyan
    Write-Host "Running: $target" -ForegroundColor DarkGray

    if (-not (Test-Path $target)) {
        Write-Host "[FAILED] $Name (missing script)" -ForegroundColor Red
        return $false
    }

    & powershell -ExecutionPolicy Bypass -File $target
    $code = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }

    if ($code -eq 0) {
        Write-Host "[OK] $Name" -ForegroundColor Green
        return $true
    }

    Write-Host "[FAILED] $Name (exit=$code)" -ForegroundColor Red
    return $false
}

Write-Host "========================================"
Write-Host "   CURRENT WORKFLOW SUITE"
Write-Host "========================================"

$steps = @(
    @{ Name = "Runtime Health"; Path = "00-runtime-health.ps1" }
    @{ Name = "Client Production Journey"; Path = "10-client-production-journey.ps1" }
    @{ Name = "Merchant Production Journey"; Path = "20-merchant-production-journey.ps1" }
    @{ Name = "Student Production Journey"; Path = "30-student-production-journey.ps1" }
    @{ Name = "Instructor Production Journey"; Path = "40-instructor-production-journey.ps1" }
)

$failed = 0
foreach ($step in $steps) {
    if (-not (Run-Step -Name $step.Name -RelativePath $step.Path)) {
        $failed++
    }
}

Write-Host "`n========================================"
Write-Host "   SUMMARY"
Write-Host "========================================"

if ($failed -eq 0) {
    Write-Host "All current workflow checks passed." -ForegroundColor Green
    exit 0
}

Write-Host "$failed current workflow check(s) failed." -ForegroundColor Red
exit 1
