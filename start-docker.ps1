$env:DOCKER_BUILDKIT=0
$env:COMPOSE_DOCKER_CLI_BUILD=0

Write-Host "🚀 Starting PMP stack with Docker (BuildKit Disabled for Stability)..." -ForegroundColor Cyan

docker-compose up -d --build
