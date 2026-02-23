param(
    [Parameter(Mandatory = $true)]
    [string]$Domain,

    [Parameter(Mandatory = $true)]
    [string]$Email,

    [switch]$Runtime,

    [switch]$Staging,

    [switch]$StartPlatform,

    [switch]$BuildPlatform
)

$ErrorActionPreference = "Stop"

function Set-EnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Key,
        [Parameter(Mandatory = $true)][string]$Value
    )

    $lines = [System.Collections.Generic.List[string]]::new()
    if (Test-Path $Path) {
        foreach ($line in (Get-Content -Path $Path)) {
            $lines.Add($line)
        }
    }

    $updated = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^\s*$([regex]::Escape($Key))=") {
            $lines[$i] = "$Key=$Value"
            $updated = $true
            break
        }
    }

    if (-not $updated) {
        $lines.Add("$Key=$Value")
    }

    Set-Content -Path $Path -Value $lines -Encoding ASCII
}

function Ensure-FirewallRule {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][int]$Port
    )

    if (-not (Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $Name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port | Out-Null
        Write-Host "Firewall rule added: $Name"
    }
    else {
        Write-Host "Firewall rule already exists: $Name"
    }
}

$script:ComposeBaseArgs = @()
$script:UseDockerComposePlugin = $false

function Initialize-ComposeCommand {
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        & docker compose version *> $null
        if ($LASTEXITCODE -eq 0) {
            $script:UseDockerComposePlugin = $true
            return
        }
    }

    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        $script:UseDockerComposePlugin = $false
        return
    }

    throw "Neither 'docker compose' nor 'docker-compose' is available."
}

function Invoke-Compose {
    param(
        [Parameter(Mandatory = $true)][string[]]$Args
    )

    if ($script:UseDockerComposePlugin) {
        & docker compose @script:ComposeBaseArgs @Args
        if ($LASTEXITCODE -ne 0) {
            throw "docker compose failed: docker compose $(@($script:ComposeBaseArgs + $Args) -join ' ')"
        }
        return
    }

    & docker-compose @script:ComposeBaseArgs @Args
    if ($LASTEXITCODE -ne 0) {
        throw "docker-compose failed: docker-compose $(@($script:ComposeBaseArgs + $Args) -join ' ')"
    }
}

function Get-PausedComposeServices {
    $rawOutput = @()

    if ($script:UseDockerComposePlugin) {
        $rawOutput = & docker compose @script:ComposeBaseArgs ps --all --status paused --services 2>$null
        if ($LASTEXITCODE -ne 0) {
            return @()
        }
    }
    else {
        $rawOutput = & docker-compose @script:ComposeBaseArgs ps --all --status paused --services 2>$null
        if ($LASTEXITCODE -ne 0) {
            return @()
        }
    }

    return @(
        $rawOutput |
        ForEach-Object { "$_".Trim() } |
        Where-Object {
            $_ -and
            $_ -notmatch '^time=' -and
            $_ -notmatch '^\[?\s*warn' -and
            $_ -notmatch '^\[?\s*avertissement'
        }
    )
}

function Unpause-ComposeServicesIfNeeded {
    $pausedServices = Get-PausedComposeServices
    if ($pausedServices.Count -eq 0) {
        return
    }

    Write-Warning "Paused services detected: $($pausedServices -join ', ')"
    Write-Host "Unpausing paused services before startup ..."
    Invoke-Compose -Args (@("unpause") + $pausedServices)
}

function Invoke-LetsEncryptRequest {
    if (Get-Command make -ErrorAction SilentlyContinue) {
        Write-Host "Running: make ssl-init"
        & make ssl-init
        if ($LASTEXITCODE -ne 0) {
            throw "make ssl-init failed."
        }
        return
    }

    if (Get-Command bash -ErrorAction SilentlyContinue) {
        Write-Host "make not found. Running: bash scripts/ssl/request-letsencrypt.sh"
        & bash "scripts/ssl/request-letsencrypt.sh"
        if ($LASTEXITCODE -ne 0) {
            throw "bash scripts/ssl/request-letsencrypt.sh failed."
        }
        return
    }

    throw "Neither 'make' nor 'bash' was found."
}

if ($Domain -notmatch "\.") {
    throw "Let's Encrypt requires a public FQDN (example: monetic.com). Current value '$Domain' is not valid."
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..\..")
Set-Location $repoRoot

$envPath = Join-Path $repoRoot ".env"
if (-not (Test-Path $envPath)) {
    throw ".env not found at $envPath"
}

$baseDomain = $Domain.Trim().ToLowerInvariant()
$wwwDomain = if ($baseDomain.StartsWith("www.")) { $baseDomain } else { "www.$baseDomain" }
$publicHost = if ($baseDomain.StartsWith("www.")) { $baseDomain.Substring(4) } else { $baseDomain }

Write-Host "Updating .env for domain $publicHost ..."
Set-EnvValue -Path $envPath -Key "CORS_ORIGIN" -Value "https://$publicHost"
Set-EnvValue -Path $envPath -Key "NEXT_PUBLIC_API_URL" -Value "https://$publicHost"
Set-EnvValue -Path $envPath -Key "NEXT_PUBLIC_PORTAL_URL" -Value "https://$publicHost/merchant"
Set-EnvValue -Path $envPath -Key "NEXT_PUBLIC_TPE_URL" -Value "https://$publicHost"
Set-EnvValue -Path $envPath -Key "LETSENCRYPT_EMAIL" -Value $Email
Set-EnvValue -Path $envPath -Key "LETSENCRYPT_DOMAINS" -Value "$publicHost,$wwwDomain"
Set-EnvValue -Path $envPath -Key "LETSENCRYPT_CERT_NAME" -Value "pmp"
Set-EnvValue -Path $envPath -Key "LETSENCRYPT_STAGING" -Value ($(if ($Staging) { "1" } else { "0" }))

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
    IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host "Opening firewall ports 80 and 443 ..."
    Ensure-FirewallRule -Name "PMP HTTP 80" -Port 80
    Ensure-FirewallRule -Name "PMP HTTPS 443" -Port 443
}
else {
    Write-Warning "PowerShell is not elevated. Firewall rules were not changed. Re-run as Administrator to open ports 80/443."
}

$publicIp = $null
try {
    $publicIp = (Invoke-RestMethod -Uri "https://api64.ipify.org?format=json" -TimeoutSec 10).ip
    Write-Host "Detected public IP: $publicIp"
}
catch {
    Write-Warning "Could not detect public IP automatically: $($_.Exception.Message)"
}

$dnsMap = @{}
Write-Host "Checking DNS resolution ..."
foreach ($d in @($publicHost, $wwwDomain)) {
    $dnsMap[$d] = @{
        A = @()
        AAAA = @()
    }

    try {
        $a = @(Resolve-DnsName -Name $d -Type A -ErrorAction Stop | Select-Object -ExpandProperty IPAddress)
        $dnsMap[$d].A = $a
        Write-Host "$d A -> $($a -join ', ')"
    }
    catch {
        Write-Warning "$d A record not found."
    }

    try {
        $aaaa = @(Resolve-DnsName -Name $d -Type AAAA -ErrorAction Stop | Select-Object -ExpandProperty IPAddress)
        $dnsMap[$d].AAAA = $aaaa
        Write-Host "$d AAAA -> $($aaaa -join ', ')"
    }
    catch {
        Write-Warning "$d AAAA record not found."
    }
}

if ($publicIp) {
    $allARecords = @()
    foreach ($entry in $dnsMap.GetEnumerator()) {
        $allARecords += $entry.Value.A
    }

    if ($allARecords.Count -gt 0 -and -not ($allARecords -contains $publicIp)) {
        Write-Warning "DNS A records do not currently match your detected public IP ($publicIp). Let's Encrypt challenge may fail until DNS propagates."
    }
}

if ($Runtime) {
    $env:PMP_COMPOSE_FILE = "docker-compose-runtime.yml"
    $script:ComposeBaseArgs = @("-f", "docker-compose-runtime.yml")
    Write-Host "Runtime stack enabled (PMP_COMPOSE_FILE=docker-compose-runtime.yml)."
}
else {
    Remove-Item Env:PMP_COMPOSE_FILE -ErrorAction SilentlyContinue
    $script:ComposeBaseArgs = @()
}

Initialize-ComposeCommand

if ($BuildPlatform -and -not $StartPlatform) {
    Write-Warning "-BuildPlatform is ignored unless -StartPlatform is also provided."
}

if ($StartPlatform) {
    Write-Host "Starting platform containers ..."
    Unpause-ComposeServicesIfNeeded
    $composeUpArgs = @("up", "-d")
    if ($BuildPlatform) {
        $composeUpArgs += "--build"
    }
    try {
        Invoke-Compose -Args $composeUpArgs
    }
    catch {
        Write-Warning "Full platform startup failed ($($_.Exception.Message)). Continuing with HTTPS setup only."
        Write-Host "Ensuring Nginx is running for ACME challenge ..."
        try {
            Invoke-Compose -Args @("up", "-d", "--no-deps", "nginx")
        }
        catch {
            Write-Warning "Could not start Nginx in isolated mode. Certbot may fail if Nginx is down."
        }
    }
}

Invoke-LetsEncryptRequest

Write-Host "Verifying Nginx and certbot-renew containers ..."
Invoke-Compose -Args @("ps", "nginx", "certbot-renew")

if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
    Write-Host "Running local HTTPS smoke-check (Host: $publicHost) ..."
    & curl.exe "-ksS" "--resolve" "${publicHost}:443:127.0.0.1" "https://${publicHost}/health" | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Local HTTPS smoke-check failed. Check Nginx logs: docker compose logs nginx"
    }
}
else {
    Write-Warning "curl.exe not found; skipping local HTTPS smoke-check."
}

Write-Host "Setup complete."
Write-Host "Reminder: configure your router/NAT to forward TCP ports 80 and 443 to this machine."
