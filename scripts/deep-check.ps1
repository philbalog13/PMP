param(
    [string]$OutputFile = ("deep-check-report-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".json")
)

$ErrorActionPreference = "Stop"

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
    param(
        [string]$Service,
        [string]$Category,
        [string]$Check,
        [string]$Status,
        [string]$Detail,
        [double]$DurationMs = 0
    )

    $results.Add([pscustomobject]@{
        timestamp   = (Get-Date).ToString("o")
        service     = $Service
        category    = $Category
        check       = $Check
        status      = $Status
        detail      = $Detail
        duration_ms = [math]::Round($DurationMs, 2)
    })

    $color = switch ($Status) {
        "pass" { "Green" }
        "warn" { "Yellow" }
        default { "Red" }
    }
    Write-Host ("[{0}] {1} - {2}: {3}" -f $Status.ToUpper(), $Service, $Check, $Detail) -ForegroundColor $color
}

function Invoke-WebCheck {
    param(
        [string]$Service,
        [string]$Category,
        [string]$Check,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [int[]]$ExpectedStatus = @(200),
        [int]$TimeoutSec = 15
    )

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        if ($null -ne $Body) {
            $payload = $Body | ConvertTo-Json -Depth 10
            $resp = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -Body $payload -ContentType "application/json" -UseBasicParsing -TimeoutSec $TimeoutSec
        }
        else {
            $resp = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -UseBasicParsing -TimeoutSec $TimeoutSec
        }
        $sw.Stop()

        $statusCode = [int]$resp.StatusCode
        $ok = $ExpectedStatus -contains $statusCode

        if ($ok) {
            Add-Result -Service $Service -Category $Category -Check $Check -Status "pass" -Detail ("HTTP {0}" -f $statusCode) -DurationMs $sw.Elapsed.TotalMilliseconds
        }
        else {
            Add-Result -Service $Service -Category $Category -Check $Check -Status "fail" -Detail ("HTTP {0} (expected: {1})" -f $statusCode, ($ExpectedStatus -join ",")) -DurationMs $sw.Elapsed.TotalMilliseconds
        }

        $json = $null
        try { $json = $resp.Content | ConvertFrom-Json -ErrorAction Stop } catch {}

        return [pscustomobject]@{
            ok       = $ok
            response = $resp
            json     = $json
            status   = $statusCode
            ms       = $sw.Elapsed.TotalMilliseconds
        }
    }
    catch {
        $sw.Stop()
        $msg = $_.Exception.Message

        $statusCode = $null
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            if ($ExpectedStatus -contains $statusCode) {
                Add-Result -Service $Service -Category $Category -Check $Check -Status "pass" -Detail ("HTTP {0}" -f $statusCode) -DurationMs $sw.Elapsed.TotalMilliseconds
                return [pscustomobject]@{
                    ok       = $true
                    response = $null
                    json     = $null
                    status   = $statusCode
                    ms       = $sw.Elapsed.TotalMilliseconds
                }
            }
        }

        Add-Result -Service $Service -Category $Category -Check $Check -Status "fail" -Detail $msg -DurationMs $sw.Elapsed.TotalMilliseconds
        return [pscustomobject]@{
            ok       = $false
            response = $null
            json     = $null
            status   = $statusCode
            ms       = $sw.Elapsed.TotalMilliseconds
        }
    }
}

function Measure-Endpoint {
    param(
        [string]$Service,
        [string]$Url,
        [int]$Samples = 20,
        [double]$P95ThresholdMs = 600
    )

    $times = New-Object System.Collections.Generic.List[double]
    $errors = 0

    for ($i = 0; $i -lt $Samples; $i++) {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $r = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec 10
            if ([int]$r.StatusCode -ne 200) { $errors++ } else { $times.Add($sw.Elapsed.TotalMilliseconds) }
        }
        catch {
            $errors++
        }
        finally {
            $sw.Stop()
        }
    }

    if ($times.Count -eq 0) {
        Add-Result -Service $Service -Category "performance" -Check ("latency " + $Url) -Status "fail" -Detail ("0/{0} successful calls" -f $Samples)
        return
    }

    $sorted = $times | Sort-Object
    $avg = ($times | Measure-Object -Average).Average
    $idx = [math]::Floor(0.95 * ($sorted.Count - 1))
    $p95 = $sorted[$idx]
    $errorRate = ($errors / $Samples) * 100.0

    $ok = ($errorRate -le 0) -and ($p95 -le $P95ThresholdMs)
    $detail = ("samples={0}, avg={1}ms, p95={2}ms, errorRate={3}%" -f $Samples, [math]::Round($avg, 2), [math]::Round($p95, 2), [math]::Round($errorRate, 2))
    Add-Result -Service $Service -Category "performance" -Check ("latency " + $Url) -Status ($(if ($ok) { "pass" } else { "fail" })) -Detail $detail
}

Write-Host "=== PMP Deep Check Started ===" -ForegroundColor Cyan

# 1) Container-level checks
$composeRows = docker compose ps --format json | ForEach-Object { $_ | ConvertFrom-Json }
foreach ($row in $composeRows) {
    $isRunning = $row.State -eq "running"
    $health = if ([string]::IsNullOrWhiteSpace($row.Health)) { "n/a" } else { $row.Health }
    $healthyOrNA = ($health -eq "healthy" -or $health -eq "n/a")
    $status = if ($isRunning -and $healthyOrNA) { "pass" } elseif ($isRunning) { "warn" } else { "fail" }
    Add-Result -Service $row.Service -Category "container" -Check "docker state/health" -Status $status -Detail ("state={0}, health={1}" -f $row.State, $health)
}

foreach ($row in $composeRows) {
    try {
        $restartCount = [int](docker inspect --format "{{.RestartCount}}" $row.Name)
        $status = if ($restartCount -eq 0) { "pass" } elseif ($restartCount -le 2) { "warn" } else { "fail" }
        Add-Result -Service $row.Service -Category "container" -Check "restart count" -Status $status -Detail ("restarts={0}" -f $restartCount)
    }
    catch {
        Add-Result -Service $row.Service -Category "container" -Check "restart count" -Status "fail" -Detail $_.Exception.Message
    }
}

# 2) Infrastructure deep checks
try {
    $pgReady = docker exec pmp-postgres pg_isready -U pmp_user -d pmp_db 2>&1
    if ($LASTEXITCODE -eq 0) {
        Add-Result -Service "postgres" -Category "infra" -Check "pg_isready" -Status "pass" -Detail ($pgReady -join " ")
    } else {
        Add-Result -Service "postgres" -Category "infra" -Check "pg_isready" -Status "fail" -Detail ($pgReady -join " ")
    }
}
catch {
    Add-Result -Service "postgres" -Category "infra" -Check "pg_isready" -Status "fail" -Detail $_.Exception.Message
}

try {
    $redisPing = docker exec pmp-redis redis-cli -a redis_pass_2024 ping
    if ($LASTEXITCODE -eq 0) {
        Add-Result -Service "redis" -Category "infra" -Check "redis ping" -Status "pass" -Detail ($redisPing -join " ")
    } else {
        Add-Result -Service "redis" -Category "infra" -Check "redis ping" -Status "fail" -Detail ($redisPing -join " ")
    }
}
catch {
    Add-Result -Service "redis" -Category "infra" -Check "redis ping" -Status "fail" -Detail $_.Exception.Message
}

$es = Invoke-WebCheck -Service "elasticsearch" -Category "infra" -Check "cluster health endpoint" -Url "http://localhost:9200/_cluster/health"
if ($es.ok -and $es.json) {
    $clusterStatus = [string]$es.json.status
    if ($clusterStatus -in @("green", "yellow")) {
        Add-Result -Service "elasticsearch" -Category "infra" -Check "cluster status semantic" -Status "pass" -Detail ("status={0}" -f $clusterStatus)
    } else {
        Add-Result -Service "elasticsearch" -Category "infra" -Check "cluster status semantic" -Status "fail" -Detail ("status={0}" -f $clusterStatus)
    }
}

$null = Invoke-WebCheck -Service "pgadmin" -Category "infra" -Check "UI availability" -Url "http://localhost:5050" -ExpectedStatus @(200, 302)
$null = Invoke-WebCheck -Service "kibana" -Category "infra" -Check "UI availability" -Url "http://localhost:5601" -ExpectedStatus @(200, 302)
$null = Invoke-WebCheck -Service "prometheus" -Category "infra" -Check "health endpoint" -Url "http://localhost:9090/-/healthy"
$graf = Invoke-WebCheck -Service "grafana" -Category "infra" -Check "api health endpoint" -Url "http://localhost:3002/api/health"
if ($graf.ok -and $graf.json) {
    if ($graf.json.database -eq "ok") {
        Add-Result -Service "grafana" -Category "infra" -Check "database connectivity semantic" -Status "pass" -Detail "database=ok"
    } else {
        Add-Result -Service "grafana" -Category "infra" -Check "database connectivity semantic" -Status "fail" -Detail ("database={0}" -f $graf.json.database)
    }
}
$null = Invoke-WebCheck -Service "nginx" -Category "infra" -Check "reverse proxy health endpoint" -Url "http://localhost/health"

# 3) Frontend checks
$null = Invoke-WebCheck -Service "portal" -Category "frontend" -Check "api health" -Url "http://localhost:3000/api/health"
$null = Invoke-WebCheck -Service "client-interface" -Category "frontend" -Check "api health" -Url "http://localhost:3001/api/health"
$null = Invoke-WebCheck -Service "user-cards-web" -Category "frontend" -Check "api health" -Url "http://localhost:3004/api/health"
$null = Invoke-WebCheck -Service "hsm-web" -Category "frontend" -Check "api health" -Url "http://localhost:3006/api/health"
$null = Invoke-WebCheck -Service "monitoring-dashboard" -Category "frontend" -Check "ui root" -Url "http://localhost:3082"
$null = Invoke-WebCheck -Service "threeds-challenge-ui" -Category "frontend" -Check "ui root" -Url "http://localhost:3088"

# 4) Core health endpoints
$null = Invoke-WebCheck -Service "api-gateway" -Category "health" -Check "/health" -Url "http://localhost:8000/health"
$null = Invoke-WebCheck -Service "api-gateway" -Category "health" -Check "/api/health" -Url "http://localhost:8000/api/health"
$null = Invoke-WebCheck -Service "sim-card-service" -Category "health" -Check "/health" -Url "http://localhost:8001/health"
$null = Invoke-WebCheck -Service "sim-pos-service" -Category "health" -Check "/health" -Url "http://localhost:8002/health"
$null = Invoke-WebCheck -Service "sim-acquirer-service" -Category "health" -Check "/health" -Url "http://localhost:8003/health"
$null = Invoke-WebCheck -Service "sim-network-switch" -Category "health" -Check "/health" -Url "http://localhost:8004/health" -ExpectedStatus @(200, 503)
$null = Invoke-WebCheck -Service "sim-network-switch" -Category "health" -Check "/health/live" -Url "http://localhost:8004/health/live"
$null = Invoke-WebCheck -Service "sim-network-switch" -Category "health" -Check "/health/ready" -Url "http://localhost:8004/health/ready"
$null = Invoke-WebCheck -Service "sim-network-switch" -Category "health" -Check "/health/dependencies" -Url "http://localhost:8004/health/dependencies"
$null = Invoke-WebCheck -Service "sim-issuer-service" -Category "health" -Check "/health" -Url "http://localhost:8005/health"
$null = Invoke-WebCheck -Service "sim-auth-engine" -Category "health" -Check "/health" -Url "http://localhost:8006/health"
$null = Invoke-WebCheck -Service "sim-auth-engine" -Category "health" -Check "/health/live" -Url "http://localhost:8006/health/live"
$null = Invoke-WebCheck -Service "sim-auth-engine" -Category "health" -Check "/health/ready" -Url "http://localhost:8006/health/ready"
$null = Invoke-WebCheck -Service "sim-fraud-detection" -Category "health" -Check "/health" -Url "http://localhost:8007/health"
$null = Invoke-WebCheck -Service "crypto-service" -Category "health" -Check "/health" -Url "http://localhost:8010/health"
$null = Invoke-WebCheck -Service "hsm-simulator" -Category "health" -Check "/health" -Url "http://localhost:8011/health"
$null = Invoke-WebCheck -Service "key-management" -Category "health" -Check "/health" -Url "http://localhost:8012/health"
$null = Invoke-WebCheck -Service "acs-simulator" -Category "health" -Check "/health" -Url "http://localhost:8013/health"
$null = Invoke-WebCheck -Service "tokenization-service" -Category "health" -Check "/health" -Url "http://localhost:8014/health"
$null = Invoke-WebCheck -Service "directory-server" -Category "health" -Check "/health" -Url "http://localhost:8015/health"
$null = Invoke-WebCheck -Service "sim-monitoring-service" -Category "health" -Check "/health" -Url "http://localhost:3005/health"

# 5) Service-level functional checks

# 5.1 sim-card-service lifecycle
$createdPan = $null
$createdCvv = $null
$createdExpMonth = $null
$createdExpYear = $null

$cardCreate = Invoke-WebCheck -Service "sim-card-service" -Category "functional" -Check "create card" -Url "http://localhost:8001/cards" -Method "POST" -Body @{
    cardholderName = "DEEP CHECK USER"
    cardType       = "VISA"
    issuerId       = "ISS001"
    balance        = 500
} -ExpectedStatus @(201)

if ($cardCreate.ok -and $cardCreate.json -and $cardCreate.json.success) {
    $createdPan = $cardCreate.json.data.pan
    $createdCvv = $cardCreate.json.data.cvv
    $createdExpMonth = $cardCreate.json.data.expiryMonth
    $createdExpYear = $cardCreate.json.data.expiryYear
    Add-Result -Service "sim-card-service" -Category "functional" -Check "create card semantic" -Status "pass" -Detail ("pan={0}" -f $createdPan)

    $null = Invoke-WebCheck -Service "sim-card-service" -Category "functional" -Check "validate PAN" -Url "http://localhost:8001/cards/validate" -Method "POST" -Body @{ pan = $createdPan }
    $null = Invoke-WebCheck -Service "sim-card-service" -Category "functional" -Check "validate card for transaction" -Url "http://localhost:8001/cards/validate-transaction" -Method "POST" -Body @{
        pan         = $createdPan
        cvv         = $createdCvv
        expiryMonth = $createdExpMonth
        expiryYear  = $createdExpYear
    }
    $null = Invoke-WebCheck -Service "sim-card-service" -Category "functional" -Check "get card by pan" -Url ("http://localhost:8001/cards/" + $createdPan)
    $null = Invoke-WebCheck -Service "sim-card-service" -Category "functional" -Check "set status BLOCKED" -Url ("http://localhost:8001/cards/" + $createdPan + "/status") -Method "PATCH" -Body @{ status = "BLOCKED" }
    $null = Invoke-WebCheck -Service "sim-card-service" -Category "functional" -Check "set status ACTIVE" -Url ("http://localhost:8001/cards/" + $createdPan + "/status") -Method "PATCH" -Body @{ status = "ACTIVE" }
    $null = Invoke-WebCheck -Service "sim-card-service" -Category "functional" -Check "delete card" -Url ("http://localhost:8001/cards/" + $createdPan) -Method "DELETE"
}
else {
    Add-Result -Service "sim-card-service" -Category "functional" -Check "create card semantic" -Status "fail" -Detail "Could not create card; lifecycle skipped"
}

# 5.2 sim-pos-service transaction
$posTx = Invoke-WebCheck -Service "sim-pos-service" -Category "functional" -Check "create transaction" -Url "http://localhost:8002/transactions" -Method "POST" -Body @{
    pan             = "4111111111111111"
    amount          = 15.50
    currency        = "EUR"
    merchantId      = "MERCHANT001"
    transactionType = "PURCHASE"
    cvv             = "123"
    expiryMonth     = 12
    expiryYear      = 2028
}

if ($posTx.ok -and $posTx.json -and $posTx.json.data.transactionId) {
    $posTxId = $posTx.json.data.transactionId
    Add-Result -Service "sim-pos-service" -Category "functional" -Check "create transaction semantic" -Status "pass" -Detail ("txId={0}, status={1}, code={2}" -f $posTxId, $posTx.json.data.status, $posTx.json.data.responseCode)
    $null = Invoke-WebCheck -Service "sim-pos-service" -Category "functional" -Check "get transaction by id" -Url ("http://localhost:8002/transactions/" + $posTxId)
}
else {
    Add-Result -Service "sim-pos-service" -Category "functional" -Check "create transaction semantic" -Status "fail" -Detail "Transaction ID missing"
}

# 5.3 sim-acquirer-service
$null = Invoke-WebCheck -Service "sim-acquirer-service" -Category "functional" -Check "list merchants" -Url "http://localhost:8003/merchants"
$null = Invoke-WebCheck -Service "sim-acquirer-service" -Category "functional" -Check "process transaction" -Url "http://localhost:8003/process" -Method "POST" -Body @{
    transactionId   = ("ACQ_DEEP_" + (Get-Date -Format "yyyyMMddHHmmss"))
    pan             = "4111111111111111"
    amount          = 12.30
    currency        = "EUR"
    merchantId      = "MERCHANT001"
    transactionType = "PURCHASE"
    cvv             = "123"
    expiryMonth     = 12
    expiryYear      = 2028
    terminalId      = "POS001"
    timestamp       = (Get-Date).ToString("o")
}

# 5.4 sim-network-switch
$null = Invoke-WebCheck -Service "sim-network-switch" -Category "functional" -Check "supported networks" -Url "http://localhost:8004/transaction/networks"
$null = Invoke-WebCheck -Service "sim-network-switch" -Category "functional" -Check "identify network" -Url "http://localhost:8004/transaction/network/4111111111111111"

$now = Get-Date
$mmddhhmmss = $now.ToString("MMddHHmmss")
$hhmmss = $now.ToString("HHmmss")
$mmdd = $now.ToString("MMdd")

$null = Invoke-WebCheck -Service "sim-network-switch" -Category "functional" -Check "route transaction" -Url "http://localhost:8004/transaction" -Method "POST" -Body @{
    mti                     = "0100"
    pan                     = "4111111111111111"
    processingCode          = "000000"
    amount                  = 9.99
    currency                = "EUR"
    transmissionDateTime    = $mmddhhmmss
    localTransactionTime    = $hhmmss
    localTransactionDate    = $mmdd
    stan                    = "123456"
    terminalId              = "POS0001"
    merchantId              = "MERCHANT001"
    merchantCategoryCode    = "5411"
    expiryDate              = "2812"
    posEntryMode            = "010"
    acquirerReferenceNumber = "ARN12345678901234567890"
}

$null = Invoke-WebCheck -Service "sim-network-switch" -Category "security" -Check "invalid payload rejected" -Url "http://localhost:8004/transaction" -Method "POST" -Body @{
    pan = "4111"
} -ExpectedStatus @(400)

# 5.5 sim-issuer-service
$null = Invoke-WebCheck -Service "sim-issuer-service" -Category "functional" -Check "list accounts" -Url "http://localhost:8005/accounts"
$null = Invoke-WebCheck -Service "sim-issuer-service" -Category "functional" -Check "authorize transaction" -Url "http://localhost:8005/authorize" -Method "POST" -Body @{
    transactionId   = ("ISSUER_DEEP_" + (Get-Date -Format "yyyyMMddHHmmss"))
    pan             = "4111111111111111"
    amount          = 11.10
    currency        = "EUR"
    merchantId      = "MERCHANT001"
    mcc             = "5411"
    transactionType = "PURCHASE"
}

# 5.6 sim-auth-engine
$null = Invoke-WebCheck -Service "sim-auth-engine" -Category "functional" -Check "list rules" -Url "http://localhost:8006/rules"
$null = Invoke-WebCheck -Service "sim-auth-engine" -Category "functional" -Check "authorize request" -Url "http://localhost:8006/authorize" -Method "POST" -Body @{
    stan        = "654321"
    pan         = "4111111111111111"
    amount      = 8.75
    currency    = "EUR"
    merchantId  = "MERCHANT001"
    terminalId  = "POS0001"
    mcc         = "5411"
    posEntryMode = "051"
    location    = @{
        country = "FR"
        city    = "Paris"
    }
}
$null = Invoke-WebCheck -Service "sim-auth-engine" -Category "security" -Check "invalid payload rejected" -Url "http://localhost:8006/authorize" -Method "POST" -Body @{ pan = "1" } -ExpectedStatus @(400)

# 5.7 sim-fraud-detection
$null = Invoke-WebCheck -Service "sim-fraud-detection" -Category "functional" -Check "fraud check" -Url "http://localhost:8007/check" -Method "POST" -Body @{
    pan        = "4111111111111111"
    amount     = 42.00
    merchantId = "MERCHANT001"
    mcc        = "5411"
    country    = "FR"
    ip         = "127.0.0.1"
}
$null = Invoke-WebCheck -Service "sim-fraud-detection" -Category "functional" -Check "fraud stats" -Url "http://localhost:8007/stats"

# 5.8 crypto-service
$macGen = Invoke-WebCheck -Service "crypto-service" -Category "functional" -Check "generate MAC" -Url "http://localhost:8010/mac/generate" -Method "POST" -Body @{
    data = "DEEP_CHECK_MESSAGE"
    key  = "1234567890ABCDEF1234567890ABCDEF"
}
if ($macGen.ok -and $macGen.json -and $macGen.json.mac) {
    $null = Invoke-WebCheck -Service "crypto-service" -Category "functional" -Check "verify MAC" -Url "http://localhost:8010/mac/verify" -Method "POST" -Body @{
        data = "DEEP_CHECK_MESSAGE"
        mac  = $macGen.json.mac
        key  = "1234567890ABCDEF1234567890ABCDEF"
    }
}
$null = Invoke-WebCheck -Service "crypto-service" -Category "security" -Check "invalid payload rejected" -Url "http://localhost:8010/mac/generate" -Method "POST" -Body @{ data = "" } -ExpectedStatus @(400)

# 5.9 hsm-simulator
$null = Invoke-WebCheck -Service "hsm-simulator" -Category "functional" -Check "get config" -Url "http://localhost:8011/hsm/config"
$null = Invoke-WebCheck -Service "hsm-simulator" -Category "functional" -Check "list keys" -Url "http://localhost:8011/hsm/keys"

# 5.10 key-management
$keyCreate = Invoke-WebCheck -Service "key-management" -Category "functional" -Check "generate key" -Url "http://localhost:8012/keys" -Method "POST" -Body @{
    name      = ("DEEPKEY_" + (Get-Date -Format "HHmmss"))
    type      = "DEK"
    algorithm = "AES-256"
} -ExpectedStatus @(201)

if ($keyCreate.ok -and $keyCreate.json -and $keyCreate.json.data.id) {
    $keyId = $keyCreate.json.data.id
    $null = Invoke-WebCheck -Service "key-management" -Category "functional" -Check "rotate key" -Url ("http://localhost:8012/keys/" + $keyId + "/rotate") -Method "POST" -Body @{}
    $null = Invoke-WebCheck -Service "key-management" -Category "functional" -Check "delete key" -Url ("http://localhost:8012/keys/" + $keyId) -Method "DELETE"
}

$null = Invoke-WebCheck -Service "key-management" -Category "security" -Check "invalid payload rejected" -Url "http://localhost:8012/keys" -Method "POST" -Body @{ name = "X" } -ExpectedStatus @(400)

# 5.11 ACS + Directory + Tokenization + Monitoring
$acsAuth = Invoke-WebCheck -Service "acs-simulator" -Category "functional" -Check "authenticate flow" -Url "http://localhost:8013/authenticate" -Method "POST" -Body @{
    pan            = "4111111111111111"
    amount         = 20.00
    currency       = "EUR"
    merchantId     = "MERCHANT001"
    transactionId  = ("3DS_" + (Get-Date -Format "yyyyMMddHHmmss"))
    cardholderName = "SUCCESS"
}
$null = Invoke-WebCheck -Service "acs-simulator" -Category "functional" -Check "challenge verify flow" -Url "http://localhost:8013/challenge/verify" -Method "POST" -Body @{
    acsTransId = ("ACS_" + (Get-Date -Format "HHmmss"))
    otp        = "123456"
}

$tok = Invoke-WebCheck -Service "tokenization-service" -Category "functional" -Check "tokenize pan" -Url "http://localhost:8014/tokenize" -Method "POST" -Body @{
    pan = "4111111111111111"
    ttl = 300
}
if ($tok.ok -and $tok.json -and $tok.json.token) {
    $token = $tok.json.token
    $null = Invoke-WebCheck -Service "tokenization-service" -Category "functional" -Check "token info" -Url ("http://localhost:8014/token/" + $token + "/info")
    $null = Invoke-WebCheck -Service "tokenization-service" -Category "functional" -Check "detokenize token" -Url "http://localhost:8014/detokenize" -Method "POST" -Body @{ token = $token }
    $null = Invoke-WebCheck -Service "tokenization-service" -Category "functional" -Check "refresh token" -Url "http://localhost:8014/token/refresh" -Method "POST" -Body @{ token = $token; ttl = 600 }
}
$null = Invoke-WebCheck -Service "tokenization-service" -Category "security" -Check "invalid PAN rejected" -Url "http://localhost:8014/tokenize" -Method "POST" -Body @{ pan = "123" } -ExpectedStatus @(400)

$dir = Invoke-WebCheck -Service "directory-server" -Category "functional" -Check "3ds authenticate route" -Url "http://localhost:8015/3ds/authenticate" -Method "POST" -Body @{
    pan           = "4111111111111111"
    amount        = 30.00
    merchantId    = "MERCHANT001"
    transactionId = ("DIR_" + (Get-Date -Format "yyyyMMddHHmmss"))
}

$null = Invoke-WebCheck -Service "sim-monitoring-service" -Category "functional" -Check "list transactions api" -Url "http://localhost:3005/api/transactions"
$null = Invoke-WebCheck -Service "sim-monitoring-service" -Category "functional" -Check "prometheus metrics endpoint" -Url "http://localhost:3005/metrics"

# 6) API Gateway auth + RBAC + orchestrated transaction
$loginBody = Get-Content "test-login-client.json" | ConvertFrom-Json
$loginCheck = Invoke-WebCheck -Service "api-gateway" -Category "security" -Check "client login" -Url "http://localhost:8000/api/auth/client/login" -Method "POST" -Body @{
    email    = $loginBody.email
    password = $loginBody.password
}

$null = Invoke-WebCheck -Service "api-gateway" -Category "security" -Check "protected route denied without token" -Url "http://localhost:8000/api/client/cards" -ExpectedStatus @(401, 403)

$null = Invoke-WebCheck -Service "api-gateway" -Category "security" -Check "SQLi-like login attempt handled safely" -Url "http://localhost:8000/api/auth/login" -Method "POST" -Body @{
    email    = "' OR 1=1 --"
    password = "x"
} -ExpectedStatus @(400, 401, 403)

if ($loginCheck.ok -and $loginCheck.json -and $loginCheck.json.accessToken) {
    $tokenHeader = @{ Authorization = ("Bearer " + $loginCheck.json.accessToken) }
    $null = Invoke-WebCheck -Service "api-gateway" -Category "security" -Check "client route allowed with client token" -Url "http://localhost:8000/api/client/cards" -Headers $tokenHeader
    $null = Invoke-WebCheck -Service "api-gateway" -Category "security" -Check "merchant route denied with client token" -Url "http://localhost:8000/api/marchand/transactions" -Headers $tokenHeader -ExpectedStatus @(401, 403)
    $null = Invoke-WebCheck -Service "api-gateway" -Category "functional" -Check "orchestrated transaction process (authed)" -Url "http://localhost:8000/api/transaction/process" -Method "POST" -Headers $tokenHeader -Body @{
        pan        = "4111111111111111"
        amount     = 19.90
        currency   = "EUR"
        merchantId = "MERCHANT001"
        terminalId = "TERM0001"
        mcc        = "5411"
        country    = "FR"
    } -ExpectedStatus @(200, 402)

    if ($loginCheck.json.refreshToken) {
        $null = Invoke-WebCheck -Service "api-gateway" -Category "security" -Check "refresh token rotation" -Url "http://localhost:8000/api/auth/refresh" -Method "POST" -Body @{
            refreshToken = $loginCheck.json.refreshToken
        }
    }
}
else {
    Add-Result -Service "api-gateway" -Category "security" -Check "RBAC token checks" -Status "warn" -Detail "Login token missing; protected-route checks partially skipped"
}

# 7) Performance smoke
Measure-Endpoint -Service "api-gateway" -Url "http://localhost:8000/health" -Samples 20 -P95ThresholdMs 500
Measure-Endpoint -Service "sim-network-switch" -Url "http://localhost:8004/health/live" -Samples 20 -P95ThresholdMs 500
Measure-Endpoint -Service "portal" -Url "http://localhost:3000/api/health" -Samples 20 -P95ThresholdMs 700

# 8) Resilience smoke: restart tokenization-service and verify recovery
try {
    docker compose restart tokenization-service | Out-Null
    $up = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:8014/health" -UseBasicParsing -TimeoutSec 5
            if ([int]$r.StatusCode -eq 200) { $up = $true; break }
        } catch {}
    }
    if ($up) {
        Add-Result -Service "tokenization-service" -Category "resilience" -Check "restart and recover" -Status "pass" -Detail "Recovered after restart"
    } else {
        Add-Result -Service "tokenization-service" -Category "resilience" -Check "restart and recover" -Status "fail" -Detail "Did not recover within timeout"
    }
}
catch {
    Add-Result -Service "tokenization-service" -Category "resilience" -Check "restart and recover" -Status "fail" -Detail $_.Exception.Message
}

# 9) Monitoring/observability semantic checks
$prom = Invoke-WebCheck -Service "prometheus" -Category "observability" -Check "query up metric" -Url "http://localhost:9090/api/v1/query?query=up"
if ($prom.ok -and $prom.json) {
    $count = 0
    try { $count = $prom.json.data.result.Count } catch {}
    if ($count -gt 0) {
        Add-Result -Service "prometheus" -Category "observability" -Check "up metric has samples" -Status "pass" -Detail ("samples={0}" -f $count)
    } else {
        Add-Result -Service "prometheus" -Category "observability" -Check "up metric has samples" -Status "warn" -Detail "No samples returned"
    }
}

$svcLogs = Invoke-WebCheck -Service "sim-monitoring-service" -Category "observability" -Check "service logs latest endpoint" -Url "http://localhost:3005/api/logs/services/latest"
if ($svcLogs.ok -and $svcLogs.json) {
    $count = 0
    try { $count = [int]$svcLogs.json.meta.count } catch {}
    if ($count -gt 0) {
        Add-Result -Service "sim-monitoring-service" -Category "observability" -Check "service logs latest semantic" -Status "pass" -Detail ("count={0}" -f $count)
    } else {
        Add-Result -Service "sim-monitoring-service" -Category "observability" -Check "service logs latest semantic" -Status "fail" -Detail "No service snapshots returned"
    }
}

$dashLogs = Invoke-WebCheck -Service "monitoring-dashboard" -Category "observability" -Check "api proxy service logs endpoint" -Url "http://localhost:3082/api/logs/services/latest"
if ($dashLogs.ok) {
    if ($dashLogs.json) {
        $count = 0
        try { $count = [int]$dashLogs.json.meta.count } catch {}
        Add-Result -Service "monitoring-dashboard" -Category "observability" -Check "api proxy semantic" -Status "pass" -Detail ("json=true, count={0}" -f $count)
    } else {
        Add-Result -Service "monitoring-dashboard" -Category "observability" -Check "api proxy semantic" -Status "fail" -Detail "Response is not JSON (likely SPA HTML fallback)"
    }
}

$esLogs = Invoke-WebCheck -Service "elasticsearch" -Category "observability" -Check "service logs index count" -Url "http://localhost:9200/pmp-service-logs/_count"
if ($esLogs.ok -and $esLogs.json) {
    $count = 0
    try { $count = [int]$esLogs.json.count } catch {}
    if ($count -gt 0) {
        Add-Result -Service "elasticsearch" -Category "observability" -Check "service logs index semantic" -Status "pass" -Detail ("docs={0}" -f $count)
    } else {
        Add-Result -Service "elasticsearch" -Category "observability" -Check "service logs index semantic" -Status "fail" -Detail "Index exists but has no documents"
    }
}

$promTargets = Invoke-WebCheck -Service "prometheus" -Category "observability" -Check "targets endpoint" -Url "http://localhost:9090/api/v1/targets"
if ($promTargets.ok -and $promTargets.json) {
    $active = @()
    try { $active = @($promTargets.json.data.activeTargets) } catch {}
    $down = @($active | Where-Object { $_.health -ne "up" }).Count
    if ($down -eq 0) {
        Add-Result -Service "prometheus" -Category "observability" -Check "targets health semantic" -Status "pass" -Detail ("active={0}, down={1}" -f $active.Count, $down)
    } else {
        Add-Result -Service "prometheus" -Category "observability" -Check "targets health semantic" -Status "warn" -Detail ("active={0}, down={1}" -f $active.Count, $down)
    }
}

$promService = Invoke-WebCheck -Service "prometheus" -Category "observability" -Check "query pmp_service_up metric" -Url "http://localhost:9090/api/v1/query?query=pmp_service_up"
if ($promService.ok -and $promService.json) {
    $count = 0
    try { $count = [int]$promService.json.data.result.Count } catch {}
    if ($count -gt 0) {
        Add-Result -Service "prometheus" -Category "observability" -Check "pmp_service_up metric semantic" -Status "pass" -Detail ("samples={0}" -f $count)
    } else {
        Add-Result -Service "prometheus" -Category "observability" -Check "pmp_service_up metric semantic" -Status "fail" -Detail "No service health samples in Prometheus"
    }
}

$gfUser = $env:GF_SECURITY_ADMIN_USER
$gfPass = $env:GF_SECURITY_ADMIN_PASSWORD
if ([string]::IsNullOrWhiteSpace($gfUser) -or [string]::IsNullOrWhiteSpace($gfPass)) {
    try {
        foreach ($line in (Get-Content ".env")) {
            if ($line -match "^GF_SECURITY_ADMIN_USER=(.+)$" -and [string]::IsNullOrWhiteSpace($gfUser)) { $gfUser = $Matches[1] }
            if ($line -match "^GF_SECURITY_ADMIN_PASSWORD=(.+)$" -and [string]::IsNullOrWhiteSpace($gfPass)) { $gfPass = $Matches[1] }
        }
    } catch {}
}

if (-not [string]::IsNullOrWhiteSpace($gfUser) -and -not [string]::IsNullOrWhiteSpace($gfPass)) {
    $pair = "{0}:{1}" -f $gfUser, $gfPass
    $basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
    $grafanaHeaders = @{ Authorization = "Basic $basic" }

    $grafDs = Invoke-WebCheck -Service "grafana" -Category "observability" -Check "datasources api" -Url "http://localhost:3002/api/datasources" -Headers $grafanaHeaders
    if ($grafDs.ok -and $grafDs.json) {
        $count = @($grafDs.json).Count
        if ($count -gt 0) {
            Add-Result -Service "grafana" -Category "observability" -Check "datasources semantic" -Status "pass" -Detail ("count={0}" -f $count)
        } else {
            Add-Result -Service "grafana" -Category "observability" -Check "datasources semantic" -Status "fail" -Detail "No datasource provisioned"
        }
    }

    $grafDash = Invoke-WebCheck -Service "grafana" -Category "observability" -Check "dashboards search api" -Url "http://localhost:3002/api/search?type=dash-db" -Headers $grafanaHeaders
    if ($grafDash.ok) {
        $dashboards = @()
        try { $dashboards = @($grafDash.json) } catch {}
        $count = $dashboards.Count
        $hasPmpDashboard = @($dashboards | Where-Object { $_.uid -eq "pmp-observability" -or $_.title -eq "PMP Observability" }).Count -gt 0
        if ($count -gt 0 -and $hasPmpDashboard) {
            Add-Result -Service "grafana" -Category "observability" -Check "dashboards semantic" -Status "pass" -Detail ("count={0}, has_pmp_dashboard=true" -f $count)
        } else {
            Add-Result -Service "grafana" -Category "observability" -Check "dashboards semantic" -Status "fail" -Detail ("count={0}, has_pmp_dashboard={1}" -f $count, $hasPmpDashboard)
        }
    }
}
else {
    Add-Result -Service "grafana" -Category "observability" -Check "grafana auth variables" -Status "warn" -Detail "GF_SECURITY_ADMIN_USER/PASSWORD not found; Grafana API semantic checks skipped"
}

$kibHeaders = @{ "kbn-xsrf" = "true" }
$kibPatterns = Invoke-WebCheck -Service "kibana" -Category "observability" -Check "index patterns api" -Url "http://localhost:5601/api/saved_objects/_find?type=index-pattern&per_page=100" -Headers $kibHeaders
if ($kibPatterns.ok -and $kibPatterns.json) {
    $total = 0
    $pmpPattern = $false
    try {
        $total = [int]$kibPatterns.json.total
        foreach ($obj in @($kibPatterns.json.saved_objects)) {
            if ($obj.attributes.title -eq "pmp-*") {
                $pmpPattern = $true
                break
            }
        }
    } catch {}

    if ($total -gt 0 -and $pmpPattern) {
        Add-Result -Service "kibana" -Category "observability" -Check "index patterns semantic" -Status "pass" -Detail ("total={0}, has_pmp_pattern=true" -f $total)
    } else {
        Add-Result -Service "kibana" -Category "observability" -Check "index patterns semantic" -Status "fail" -Detail ("total={0}, has_pmp_pattern={1}" -f $total, $pmpPattern)
    }
}

# 10) Final summary
$passCount = @($results | Where-Object { $_.status -eq "pass" }).Count
$warnCount = @($results | Where-Object { $_.status -eq "warn" }).Count
$failCount = @($results | Where-Object { $_.status -eq "fail" }).Count
$total = $results.Count

$report = [pscustomobject]@{
    generatedAt = (Get-Date).ToString("o")
    totals      = [pscustomobject]@{
        total = $total
        pass  = $passCount
        warn  = $warnCount
        fail  = $failCount
    }
    failures    = @($results | Where-Object { $_.status -eq "fail" })
    warnings    = @($results | Where-Object { $_.status -eq "warn" })
    results     = $results
}

$reportJson = $report | ConvertTo-Json -Depth 8
$reportJson | Out-File -FilePath $OutputFile -Encoding utf8

Write-Host ("=== Deep Check Done: total={0}, pass={1}, warn={2}, fail={3} ===" -f $total, $passCount, $warnCount, $failCount) -ForegroundColor Cyan
Write-Host ("Report: {0}" -f $OutputFile) -ForegroundColor Cyan

if ($failCount -gt 0) {
    exit 1
}

exit 0
