$ErrorActionPreference = "SilentlyContinue"

function Start-Service-Window {
    param (
        [string]$Name,
        [string]$Path,
        [int]$Port
    )
    Write-Host "Starting $Name..." -ForegroundColor Cyan
    Start-Process cmd -ArgumentList "/k cd $Path && npm run dev" -WindowStyle Minimized
    
    # Wait for port to be open
    Write-Host "  Waiting for port $Port..." -NoNewline
    for ($i=0; $i -lt 30; $i++) {
        $tcpConnection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($tcpConnection) {
            Write-Host " OK" -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds 2
    }
    Write-Host " TIMEOUT (Proceeding anyway)" -ForegroundColor Yellow
}

Write-Host "==========================================" -ForegroundColor Magenta
Write-Host "   PMP ROBUST LAUNCHER" -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host ""

# 1. INFRASTRUCTURE
Write-Host "[1/5] Starting Infrastructure (Docker)..." -ForegroundColor White
docker run -d --name pmp-postgres -e POSTGRES_DB=pmp_db -e POSTGRES_USER=pmp_user -e POSTGRES_PASSWORD=pmp_secure_pass_2024 -p 5432:5432 -v "c:\Users\ASUS-GEORGES-GXT\Downloads\PMP\scripts\init-databases.sh:/docker-entrypoint-initdb.d/01-init-databases.sh" postgres:15-alpine
docker run -d --name pmp-redis -p 6379:6379 redis:7-alpine redis-server --requirepass redis_pass_2024

Write-Host "Waiting 10s for databases..."
Start-Sleep -Seconds 10
Write-Host "Infrastructure Ready." -ForegroundColor Green
Write-Host ""

# 2. SECURITY LAYER
Write-Host "[2/5] Starting Security Services..." -ForegroundColor White
Start-Service-Window -Name "HSM Simulator" -Path "backend\hsm-simulator" -Port 8011
Start-Service-Window -Name "Key Management" -Path "backend\key-management" -Port 8012
Start-Service-Window -Name "Crypto Service" -Path "backend\crypto-service" -Port 8010
Write-Host ""

# 3. BUSINESS CORE
Write-Host "[3/5] Starting Business Core..." -ForegroundColor White
Start-Service-Window -Name "Card Service" -Path "backend\sim-card-service" -Port 8001
Start-Service-Window -Name "POS Service" -Path "backend\sim-pos-service" -Port 8002
Start-Service-Window -Name "Acquirer Service" -Path "backend\sim-acquirer-service" -Port 8003
Start-Service-Window -Name "Network Switch" -Path "backend\sim-network-switch" -Port 8004
Start-Service-Window -Name "Issuer Service" -Path "backend\sim-issuer-service" -Port 8005
Write-Host ""

# 4. VALIDATION & GATEWAY
Write-Host "[4/5] Starting Validation & Gateway..." -ForegroundColor White
Start-Service-Window -Name "Auth Engine" -Path "backend\sim-auth-engine" -Port 8006
Start-Service-Window -Name "Fraud Detection" -Path "backend\sim-fraud-detection" -Port 8007
Start-Service-Window -Name "API Gateway" -Path "backend\api-gateway" -Port 8000
Write-Host ""

# 5. FRONTEND
Write-Host "[5/5] Starting Frontends..." -ForegroundColor White
Start-Process cmd -ArgumentList "/c set NEXT_PUBLIC_API_URL=http://localhost:8000 && cd frontend\user-cards-web && npm run dev -- -p 3000" -WindowStyle Minimized
Write-Host "  Client Interface started on port 3000"

Start-Process cmd -ArgumentList "/c set NEXT_PUBLIC_API_URL=http://localhost:8000 && cd frontend\tpe-web && npm run dev -- -p 3001" -WindowStyle Minimized
Write-Host "  Merchant Interface started on port 3001"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   PLATFORM FULLY LAUNCHED!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Client:   http://localhost:3000"
Write-Host "Merchant: http://localhost:3001"
Write-Host "Gateway:  http://localhost:8000"
Write-Host ""
