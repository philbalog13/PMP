@echo off
echo 🚀 Starting PMP stack with Docker (BuildKit Disabled for Stability)...

set DOCKER_BUILDKIT=0
set COMPOSE_DOCKER_CLI_BUILD=0

docker-compose up -d --build
