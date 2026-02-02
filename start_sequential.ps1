
Write-Host "⚠️ Docker Compose Crash Detected - Switching to Native Docker Build ⚠️" -ForegroundColor Yellow

# Function to safely start a service
function Start-Safe {
    param(
        [string]$Service,
        [string]$Path,
        [string]$ImageName,
        [string]$DockerfilePath = ""
    )
    Write-Host "------------------------------------------------"
    Write-Host "🚀 Processing: $Service" -ForegroundColor Cyan
    
    # 1. Native Build
    if ($Path) {
        Write-Host "   Building (Native Docker)..."
        if ($DockerfilePath) {
             # Custom Dockerfile and Context (Path is Context)
             docker build -t $ImageName -f $DockerfilePath $Path
        } else {
             # Default behavior (Path is Context, Dockerfile inside)
             docker build -t $ImageName $Path
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Build Failed for $Service" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "   Skipping build (Image based)"
    }

    # 2. Start
    Write-Host "   Starting..."
    # We use --no-build to force using the image we just built
    docker-compose up -d --no-deps --no-build $Service
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Start Failed for $Service" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ $Service is UP" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

# 1. Databases (No build needed)
Write-Host "📦 Phase 1: Infrastructure" -ForegroundColor Magenta
Start-Safe -Service "postgres" -ImageName "postgres:15-alpine"
Start-Safe -Service "redis" -ImageName "redis:7-alpine"
Start-Safe -Service "prometheus" -ImageName "prom/prometheus"
Start-Safe -Service "grafana" -ImageName "grafana/grafana"

# Wait for DB
Write-Host "⏳ Waiting 10s for Database initialization..."
Start-Sleep -Seconds 10

# 2. Security Layer
Write-Host "🔒 Phase 2: Security Services" -ForegroundColor Magenta
Start-Safe -Service "hsm-simulator" -Path "backend/hsm-simulator" -ImageName "pmp-hsm-simulator"
Start-Safe -Service "key-management" -Path "backend/key-management" -ImageName "pmp-key-management"
Start-Safe -Service "crypto-service" -Path "backend/crypto-service" -ImageName "pmp-crypto-service"

# 3. Core Business Layer
Write-Host "💳 Phase 3: Core Business Services" -ForegroundColor Magenta
Start-Safe -Service "sim-card-service" -Path "backend/sim-card-service" -ImageName "pmp-sim-card-service"
Start-Safe -Service "sim-acquirer-service" -Path "backend/sim-acquirer-service" -ImageName "pmp-sim-acquirer-service"
Start-Safe -Service "sim-issuer-service" -Path "backend/sim-issuer-service" -ImageName "pmp-sim-issuer-service"
Start-Safe -Service "sim-network-switch" -Path "backend/sim-network-switch" -ImageName "pmp-sim-network-switch"

# 4. Logic & Gateway
Write-Host "🧠 Phase 4: Logic & Gateway" -ForegroundColor Magenta
Start-Safe -Service "sim-fraud-detection" -Path "backend/sim-fraud-detection" -ImageName "pmp-sim-fraud-detection"
Start-Safe -Service "sim-auth-engine" -Path "backend/sim-auth-engine" -ImageName "pmp-sim-auth-engine"
Start-Safe -Service "api-gateway" -Path "backend/api-gateway" -ImageName "pmp-api-gateway"

# 5. Frontend
Write-Host "💻 Phase 5: Frontends" -ForegroundColor Magenta
Start-Safe -Service "client-interface" -Path "frontend" -DockerfilePath "frontend/tpe-web/Dockerfile" -ImageName "pmp-client-interface"


Write-Host "========================================"
Write-Host "✅ All services processed sequentially (Native Build)." -ForegroundColor Green
Write-Host "Check status with: docker-compose ps"
