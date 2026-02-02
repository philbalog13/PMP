
$ignoreContent = @"
node_modules
dist
build
coverage
.git
.gitignore
*.log
.env
.DS_Store
npm-debug.log
yarn-debug.log
yarn-error.log
"@

# List of service directories
$dirs = @(
    "backend/hsm-simulator",
    "backend/key-management",
    "backend/crypto-service",
    "backend/sim-card-service",
    "backend/sim-acquirer-service",
    "backend/sim-issuer-service",
    "backend/sim-network-switch",
    "backend/sim-fraud-detection",
    "backend/sim-auth-engine",
    "backend/api-gateway",
    "frontend/tpe-web",
    "frontend/merchant",
    "frontend/portal",
    "frontend/user-cards-web",
    "frontend/monitoring-dashboard",
    "frontend/hsm-web"
)

foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        $path = "$dir/.dockerignore"
        if (-not (Test-Path $path)) {
            Write-Host "Creating .dockerignore in $dir" -ForegroundColor Green
            Set-Content -Path $path -Value $ignoreContent
        } else {
             Write-Host "Updating .dockerignore in $dir" -ForegroundColor Yellow
             Set-Content -Path $path -Value $ignoreContent
        }
    }
}
Write-Host "✅ .dockerignore files generated."
