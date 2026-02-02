$services = [ordered]@{
    "API Gateway" = "http://localhost:8000/health"
    "Card Service" = "http://localhost:8001/health"
    "POS Service" = "http://localhost:8002/health"
    "Acquirer Service" = "http://localhost:8003/health"
    "Network Switch" = "http://localhost:8004/health"
    "Issuer Service" = "http://localhost:8005/health"
    "Auth Engine" = "http://localhost:8006/health"
    "Fraud Detection" = "http://localhost:8007/health"
    "Crypto Service" = "http://localhost:8010/health"
    "HSM Simulator" = "http://localhost:8011/health"
    "Key Management" = "http://localhost:8012/health"
    "Client Web (Store)" = "http://localhost:3003"
    "Portal" = "http://localhost:3000"
    "User Cards Web" = "http://localhost:3004"
    "Monitoring Dashboard" = "http://localhost:3005/health"
}

Write-Host "Checking Service Health..." -ForegroundColor Cyan
$failed = $false

foreach ($name in $services.Keys) {
    $url = $services[$name]
    try {
        $response = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 207) {
            Write-Host "[OK] $name ($($response.StatusCode))" -ForegroundColor Green
        } else {
            Write-Host "[FAIL] $name ($($response.StatusCode))" -ForegroundColor Red
            $failed = $true
        }
    } catch {
        Write-Host "[DOWN] $name ($($_.Exception.Message))" -ForegroundColor Red
        $failed = $true
    }
}

if ($failed) {
    exit 1
} else {
    exit 0
}
