$ErrorActionPreference = "Stop"

# Archived legacy workflow script.
# Kept for historical reference only; do not use for current runtime validation.

Write-Host "0. Legacy workflow health check..."

$services = @(
    @{ Url = "http://localhost:3003/health"; Name = "TPE Web" }
    @{ Url = "http://localhost:8080/api/health"; Name = "API Gateway" }
    @{ Url = "http://localhost:3001/health"; Name = "Auth Engine" }
    @{ Url = "http://localhost:3002/health"; Name = "Crypto Service" }
    @{ Url = "http://localhost:3004/health"; Name = "HSM Simulator" }
)

$allUp = $true

foreach ($service in $services) {
    try {
        $response = Invoke-RestMethod -Uri $service.Url -Method Get -ErrorAction Stop
        $status = if ($response.status) { $response.status } else { "UNKNOWN" }

        if ($status -eq "UP") {
            Write-Host "  [OK] $($service.Name) - UP" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] $($service.Name) - status=$status" -ForegroundColor Red
            $allUp = $false
        }
    } catch {
        Write-Host "  [FAIL] $($service.Name) - $($_.Exception.Message)" -ForegroundColor Red
        $allUp = $false
    }
}

if (-not $allUp) {
    exit 1
}

exit 0
