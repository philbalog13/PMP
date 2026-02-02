$ErrorActionPreference = "Stop"

Write-Host "0. 🏗️  Vérification des services..."

$SERVICES = @(
    @{ Url = "http://localhost:3003/health"; Name = "TPE Web" },
    @{ Url = "http://localhost:8080/api/health"; Name = "API Gateway" },
    @{ Url = "http://localhost:3001/health"; Name = "Auth Engine" },
    @{ Url = "http://localhost:3002/health"; Name = "Crypto Service" },
    @{ Url = "http://localhost:3004/health"; Name = "HSM Simulator" }
)

$AllUp = $true

foreach ($service in $SERVICES) {
    try {
        $response = Invoke-RestMethod -Uri $service.Url -Method Get -ErrorAction Stop
        
        # Check if status is "UP" (case insensitive) or if the object has a status property equal to "UP"
        $status = if ($response.status) { $response.status } else { "UNKNOWN" }
        
        if ($status -eq "UP") {
            Write-Host "  ✅ $($service.Name) - EN LIGNE" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $($service.Name) - STATUS: $status" -ForegroundColor Red
            $AllUp = $false
        }
    } catch {
        Write-Host "  ❌ $($service.Name) - HORS LIGNE ($($_.Exception.Message))" -ForegroundColor Red
        $AllUp = $false
    }
}

if (-not $AllUp) {
    Write-Host "`nCertains services ne sont pas disponibles. Veuillez les démarrer." -ForegroundColor Yellow
    exit 1
}

Write-Host "`nTous les services sont opérationnels." -ForegroundColor Green
