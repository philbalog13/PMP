$ErrorActionPreference = "Stop"

$services = @(
    @{ Name = "API Gateway"; Url = "http://localhost:8000/health" }
    @{ Name = "Sim Card Service"; Url = "http://localhost:8001/health" }
    @{ Name = "Sim POS Service"; Url = "http://localhost:8002/health" }
    @{ Name = "Sim Auth Engine"; Url = "http://localhost:8006/health" }
    @{ Name = "Crypto Service"; Url = "http://localhost:8010/health" }
    @{ Name = "HSM Simulator"; Url = "http://localhost:8011/health" }
)

function Get-OptionalProperty {
    param(
        [object]$Object,
        [string]$Name,
        $Default = $null
    )

    if ($null -eq $Object) {
        return $Default
    }

    if ($Object -is [System.Collections.IDictionary]) {
        if ($Object.Contains($Name)) {
            return $Object[$Name]
        }
        return $Default
    }

    if ($Object.PSObject.Properties.Name -contains $Name) {
        return $Object.$Name
    }

    return $Default
}

function Assert-ServiceHealth {
    param(
        [string]$Name,
        [object]$Body
    )

    switch ($Name) {
        "API Gateway" {
            $gateway = Get-OptionalProperty $Body "gateway"
            if (-not (Get-OptionalProperty $gateway "healthy" $false)) {
                throw "gateway.healthy=false"
            }

            $dependencies = Get-OptionalProperty $Body "services" @{}
            $criticalDependencies = @(
                "sim-card-service",
                "sim-pos-service",
                "sim-acquirer-service",
                "sim-issuer-service",
                "sim-auth-engine",
                "sim-network-switch",
                "crypto-service",
                "hsm-simulator"
            )

            foreach ($dependencyName in $criticalDependencies) {
                $dependency = Get-OptionalProperty $dependencies $dependencyName
                if (-not (Get-OptionalProperty $dependency "healthy" $false)) {
                    throw "critical dependency unhealthy: $dependencyName"
                }
            }
            return
        }
        "Sim Auth Engine" {
            if (-not (Get-OptionalProperty $Body "success" $false)) {
                throw "success=false"
            }
            $data = Get-OptionalProperty $Body "data"
            if ((Get-OptionalProperty $data "status" "") -ne "healthy") {
                throw "data.status is not healthy"
            }
            return
        }
        "HSM Simulator" {
            if ((Get-OptionalProperty $Body "status" "") -ne "OK") {
                throw "status is not OK"
            }
            return
        }
        default {
            $status = [string](Get-OptionalProperty $Body "status" "")
            if ($status -ne "healthy") {
                throw "status is not healthy"
            }
            return
        }
    }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   CURRENT WORKFLOW - RUNTIME HEALTH"
Write-Host "==================================================" -ForegroundColor Cyan

$allUp = $true

foreach ($service in $services) {
    try {
        $response = Invoke-RestMethod -Uri $service.Url -Method Get -ErrorAction Stop
        Assert-ServiceHealth -Name $service.Name -Body $response
        Write-Host "  [OK] $($service.Name) - healthy" -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] $($service.Name) - $($_.Exception.Message)" -ForegroundColor Red
        $allUp = $false
    }
}

if (-not $allUp) {
    Write-Host ""
    Write-Host "Le runtime courant n'est pas suffisamment sain pour les workflows current." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Tous les services critiques du workflow current sont joignables." -ForegroundColor Green
exit 0
