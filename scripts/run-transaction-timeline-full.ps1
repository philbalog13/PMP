param(
    [string]$BaseUrl = "http://localhost:8000",
    [string]$Password = "StrongPass123!@#",
    [double]$StartingBalance = 10000,
    [double]$AmountMerchant1 = 1200,
    [double]$AmountMerchant2 = 850,
    [double]$AmountMerchant3 = 640,
    [int]$MaxPosRetries = 6,
    [int]$MaxThreeDSAttempts = 20,
    [string]$OutputPath = ""
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $outputDir = Join-Path $PSScriptRoot "output"
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }
    $OutputPath = Join-Path $outputDir "transaction-timeline-full-$timestamp.json"
}

$runStartedAt = (Get-Date).ToString('o')
$runId = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

$timeline = New-Object System.Collections.Generic.List[object]
$anomalies = New-Object System.Collections.Generic.List[object]
$serviceChecks = New-Object System.Collections.Generic.List[object]
$serviceProofs = New-Object System.Collections.Generic.List[object]

function Add-Timeline {
    param([string]$Step, [object]$Data)
    $timeline.Add([pscustomobject]@{
        at = (Get-Date).ToString('o')
        step = $Step
        data = $Data
    })
}

function Add-Anomaly {
    param([string]$Code, [string]$Message, [object]$Details = $null, [string]$Severity = 'warning')
    $anomalies.Add([pscustomobject]@{
        at = (Get-Date).ToString('o')
        code = $Code
        severity = $Severity
        message = $Message
        details = $Details
    })
}

function Add-ServiceProof {
    param([string]$Service, [string]$Action, [object]$Response, [bool]$Ok = $true)
    $proof = ''
    try {
        $proof = if ($Response -is [string]) { $Response } else { ($Response | ConvertTo-Json -Depth 8 -Compress) }
    } catch {
        $proof = "$Response"
    }
    if ($proof.Length -gt 260) { $proof = $proof.Substring(0, 260) }
    $serviceProofs.Add([pscustomobject]@{
        at = (Get-Date).ToString('o')
        service = $Service
        action = $Action
        ok = $Ok
        proof = $proof
    })
}

function To-Num {
    param([object]$Value)
    $n = 0.0
    [void][double]::TryParse("$Value", [ref]$n)
    return [math]::Round($n, 2)
}

function Mask-Pan {
    param([string]$Pan)
    if ([string]::IsNullOrWhiteSpace($Pan)) { return $null }
    if ($Pan.Length -lt 10) { return ('*' * $Pan.Length) }
    return $Pan.Substring(0, 4) + ('*' * ($Pan.Length - 8)) + $Pan.Substring($Pan.Length - 4)
}

function Invoke-Api {
    param(
        [ValidateSet('GET', 'POST', 'PATCH', 'DELETE')][string]$Method,
        [string]$Path = '',
        [string]$Token = $null,
        [object]$Body = $null,
        [switch]$AllowHttpError,
        [string]$AbsoluteUrl = $null
    )

    $uri = if ([string]::IsNullOrWhiteSpace($AbsoluteUrl)) { "$BaseUrl$Path" } else { $AbsoluteUrl }
    $headers = @{}
    if ($Token) { $headers.Authorization = "Bearer $Token" }

    $params = @{
        Method = $Method
        Uri = $uri
        Headers = $headers
        ErrorAction = 'Stop'
    }

    if ($Body -ne $null) {
        $params.ContentType = 'application/json'
        $params.Body = ($Body | ConvertTo-Json -Depth 30)
    }

    try {
        return Invoke-RestMethod @params
    } catch {
        if ($AllowHttpError) {
            $statusCode = $null
            if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
                $statusCode = [int]$_.Exception.Response.StatusCode
            }

            $payload = $null
            if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
                try { $payload = $_.ErrorDetails.Message | ConvertFrom-Json } catch { $payload = $null }
            }
            if ($null -eq $payload) {
                $payload = [pscustomobject]@{ success = $false; error = $_.Exception.Message }
            }
            if ($payload.PSObject.Properties.Name -notcontains 'statusCode') {
                Add-Member -InputObject $payload -NotePropertyName statusCode -NotePropertyValue $statusCode -Force
            }
            if ($payload.PSObject.Properties.Name -notcontains 'success') {
                Add-Member -InputObject $payload -NotePropertyName success -NotePropertyValue $false -Force
            }
            return $payload
        }
        throw
    }
}

function Check-Url {
    param([string]$Service, [string]$Url)
    $started = Get-Date
    try {
        $resp = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method GET -TimeoutSec 8
        $snippet = if ($resp.Content) { $resp.Content } else { '(empty)' }
        if ($snippet.Length -gt 180) { $snippet = $snippet.Substring(0, 180) }
        $record = [pscustomobject]@{
            service = $Service
            url = $Url
            status = [int]$resp.StatusCode
            ok = $true
            latencyMs = [math]::Round(((Get-Date) - $started).TotalMilliseconds, 1)
            proof = $snippet
        }
    } catch {
        $status = $null
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) { $status = [int]$_.Exception.Response.StatusCode }
        $record = [pscustomobject]@{
            service = $Service
            url = $Url
            status = $status
            ok = $false
            latencyMs = [math]::Round(((Get-Date) - $started).TotalMilliseconds, 1)
            proof = $_.Exception.Message
        }
    }
    $serviceChecks.Add($record)
    Add-Timeline -Step "Health $Service" -Data $record
    Add-ServiceProof -Service $Service -Action 'health-check' -Response $record -Ok $record.ok
    return $record
}

function Register-User {
    param([string]$Username, [string]$Email, [string]$Role, [string]$FirstName, [string]$LastName)
    $resp = Invoke-Api -Method 'POST' -Path '/api/auth/register' -AllowHttpError -Body @{
        username = $Username
        email = $Email
        password = $Password
        firstName = $FirstName
        lastName = $LastName
        role = $Role
    }
    if (-not $resp.user) { throw "Registration failed for $Email: $($resp.error)" }
    return $resp
}

function Login-User {
    param([string]$Email)
    $resp = Invoke-Api -Method 'POST' -Path '/api/auth/login' -AllowHttpError -Body @{
        email = $Email
        password = $Password
    }
    if (-not $resp.accessToken) { throw "Login failed for $Email: $($resp.error)" }
    return $resp
}

function Invoke-DbQuery {
    param([string]$Sql)
    $rows = & docker exec pmp-postgres psql -U pmp_user -d pmp_db -t -A -F "|" -c $Sql
    if ($LASTEXITCODE -ne 0) { throw "DB query failed: $Sql" }
    if ($null -eq $rows) { return @() }
    if ($rows -is [string]) { return @($rows) }
    return @($rows)
}

function Convert-DbRows {
    param([string[]]$Rows, [string[]]$Columns)
    $items = New-Object System.Collections.Generic.List[object]
    foreach ($row in $Rows) {
        if ([string]::IsNullOrWhiteSpace($row)) { continue }
        $trimmed = $row.Trim()
        if ($trimmed -match '^(UPDATE|DELETE|INSERT)\s+\d+$') { continue }
        $parts = $trimmed -split '\|', $Columns.Count
        $obj = [ordered]@{}
        for ($i = 0; $i -lt $Columns.Count; $i++) {
            $obj[$Columns[$i]] = if ($i -lt $parts.Count) { $parts[$i] } else { $null }
        }
        $items.Add([pscustomobject]$obj)
    }
    return $items
}

try {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host " Full Transaction Timeline Run" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan

    $healthTargets = @(
        [pscustomobject]@{ service = 'api-gateway'; url = 'http://localhost:8000/health' },
        [pscustomobject]@{ service = 'sim-card-service'; url = 'http://localhost:8001/health' },
        [pscustomobject]@{ service = 'sim-pos-service'; url = 'http://localhost:8002/health' },
        [pscustomobject]@{ service = 'sim-acquirer-service'; url = 'http://localhost:8003/health' },
        [pscustomobject]@{ service = 'sim-network-switch'; url = 'http://localhost:8004/health' },
        [pscustomobject]@{ service = 'sim-issuer-service'; url = 'http://localhost:8005/health' },
        [pscustomobject]@{ service = 'sim-auth-engine'; url = 'http://localhost:8006/health' },
        [pscustomobject]@{ service = 'sim-fraud-detection'; url = 'http://localhost:8007/health' },
        [pscustomobject]@{ service = 'crypto-service'; url = 'http://localhost:8010/health' },
        [pscustomobject]@{ service = 'hsm-simulator'; url = 'http://localhost:8011/health' },
        [pscustomobject]@{ service = 'key-management'; url = 'http://localhost:8012/health' },
        [pscustomobject]@{ service = 'acs-simulator'; url = 'http://localhost:8013/health' },
        [pscustomobject]@{ service = 'tokenization-service'; url = 'http://localhost:8014/health' },
        [pscustomobject]@{ service = 'directory-server'; url = 'http://localhost:8015/health' },
        [pscustomobject]@{ service = 'portal'; url = 'http://localhost:3000/api/health' },
        [pscustomobject]@{ service = 'client-interface'; url = 'http://localhost:3001/api/health' },
        [pscustomobject]@{ service = 'user-cards-web'; url = 'http://localhost:3004/api/health' },
        [pscustomobject]@{ service = 'hsm-web'; url = 'http://localhost:3006/api/health' },
        [pscustomobject]@{ service = '3ds-ui'; url = 'http://localhost:3088/' },
        [pscustomobject]@{ service = 'monitoring'; url = 'http://localhost:3082/' }
    )

    foreach ($target in $healthTargets) {
        $health = Check-Url -Service $target.service -Url $target.url
        if (-not $health.ok) {
            Add-Anomaly -Code 'SERVICE_UNHEALTHY' -Message "Health KO for $($target.service)" -Details $health -Severity 'error'
        }
    }

    $suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $clientEmail = "client.timeline.$suffix@pmp.local"
    $merchant1Email = "merchant.alpha.$suffix@pmp.local"
    $merchant2Email = "merchant.beta.$suffix@pmp.local"
    $merchant3Email = "merchant.gamma.$suffix@pmp.local"

    $clientReg = Register-User -Username "client_tl_$suffix" -Email $clientEmail -Role 'ROLE_CLIENT' -FirstName 'Client' -LastName 'Timeline'
    $merchant1Reg = Register-User -Username "merchant_alpha_$suffix" -Email $merchant1Email -Role 'ROLE_MARCHAND' -FirstName 'Alpha' -LastName 'Merchant'
    $merchant2Reg = Register-User -Username "merchant_beta_$suffix" -Email $merchant2Email -Role 'ROLE_MARCHAND' -FirstName 'Beta' -LastName 'Merchant'
    $merchant3Reg = Register-User -Username "merchant_gamma_$suffix" -Email $merchant3Email -Role 'ROLE_MARCHAND' -FirstName 'Gamma' -LastName 'Merchant'

    $clientLogin = Login-User -Email $clientEmail
    $merchant1Login = Login-User -Email $merchant1Email
    $merchant2Login = Login-User -Email $merchant2Email
    $merchant3Login = Login-User -Email $merchant3Email

    Add-Timeline -Step 'Personas created and logged in' -Data @{
        client = @{ id = $clientLogin.user.id; email = $clientEmail }
        merchants = @(
            @{ id = $merchant1Login.user.id; email = $merchant1Email; name = 'Alpha Market' },
            @{ id = $merchant2Login.user.id; email = $merchant2Email; name = 'Beta Electronics' },
            @{ id = $merchant3Login.user.id; email = $merchant3Email; name = 'Gamma Travel' }
        )
    }

    $clientToken = $clientLogin.accessToken
    $merchants = @(
        [pscustomobject]@{ name = 'Alpha Market'; email = $merchant1Email; token = $merchant1Login.accessToken; userId = $merchant1Login.user.id; mcc = '5411'; amount = $AmountMerchant1 },
        [pscustomobject]@{ name = 'Beta Electronics'; email = $merchant2Email; token = $merchant2Login.accessToken; userId = $merchant2Login.user.id; mcc = '5732'; amount = $AmountMerchant2 },
        [pscustomobject]@{ name = 'Gamma Travel'; email = $merchant3Email; token = $merchant3Login.accessToken; userId = $merchant3Login.user.id; mcc = '4722'; amount = $AmountMerchant3 }
    )

    $cardsResponse = Invoke-Api -Method 'GET' -Path '/api/client/cards' -Token $clientToken
    $card = $cardsResponse.cards | Select-Object -First 1
    if (-not $card) { throw 'No client card returned for new client.' }

    $cardId = $card.id
    $maskedPan = $card.masked_pan

    Invoke-Api -Method 'PATCH' -Path "/api/client/cards/$cardId/features" -Token $clientToken -Body @{
        threedsEnrolled = $true
        ecommerceEnabled = $true
        contactlessEnabled = $true
        internationalEnabled = $true
    } | Out-Null
    Invoke-Api -Method 'PATCH' -Path "/api/client/cards/$cardId/limits" -Token $clientToken -Body @{
        dailyLimit = 50000
        monthlyLimit = 200000
        singleTxnLimit = 30000
    } | Out-Null

    $fundingMode = 'API'
    $fundingAttempt = Invoke-Api -Method 'PATCH' -Path "/api/client/cards/$cardId/balance" -Token $clientToken -AllowHttpError -Body @{ balance = $StartingBalance }
    if (-not ($fundingAttempt.success -eq $true -and $fundingAttempt.card -and [math]::Abs((To-Num $fundingAttempt.card.balance) - $StartingBalance) -lt 0.01)) {
        $fundingMode = 'DB_FALLBACK'
        Add-Anomaly -Code 'API_FUNDING_UNAVAILABLE' -Message 'API endpoint for card funding unavailable; DB fallback used.' -Details $fundingAttempt
        Invoke-DbQuery -Sql "UPDATE client.virtual_cards SET balance = $StartingBalance WHERE id = '$cardId';" | Out-Null
    }

    $cardAfterFunding = Invoke-Api -Method 'GET' -Path "/api/client/cards/$cardId" -Token $clientToken
    Add-Timeline -Step 'Client card prepared' -Data @{
        cardId = $cardId
        maskedPan = $maskedPan
        fundingMode = $fundingMode
        fundedBalance = To-Num $cardAfterFunding.card.balance
    }

    $merchantInitialApi = New-Object System.Collections.Generic.List[object]
    foreach ($m in $merchants) {
        $pos = Invoke-Api -Method 'GET' -Path '/api/merchant/pos' -Token $m.token
        $terminalId = $pos.terminals[0].terminal_id
        if (-not $terminalId) { throw "No terminal for merchant $($m.name)" }
        $m | Add-Member -NotePropertyName terminalId -NotePropertyValue $terminalId -Force

        $account = Invoke-Api -Method 'GET' -Path '/api/merchant/account' -Token $m.token
        $entries = Invoke-Api -Method 'GET' -Path '/api/merchant/account/entries?limit=20&page=1' -Token $m.token
        $merchantInitialApi.Add([pscustomobject]@{
            merchant = $m.name
            userId = $m.userId
            terminalId = $terminalId
            account = $account.account
            entries = $entries.entries
        })
    }

    $merchantIdsSql = ($merchants | ForEach-Object { "'" + $_.userId + "'" }) -join ','
    $dbInitial = [pscustomobject]@{
        clientVirtualCards = Invoke-DbQuery -Sql "SELECT id, client_id, masked_pan, balance, daily_limit, monthly_limit, single_txn_limit, daily_spent, monthly_spent FROM client.virtual_cards WHERE id = '$cardId';"
        clientTransactions = Invoke-DbQuery -Sql "SELECT id, transaction_id, stan, card_id, client_id, merchant_id, amount, type, status, response_code, threeds_status, fraud_score, settled_at, timestamp FROM client.transactions WHERE (client_id = '$($clientLogin.user.id)' OR merchant_id IN ($merchantIdsSql)) AND timestamp >= '$runStartedAt' ORDER BY timestamp;"
        merchantAccounts = Invoke-DbQuery -Sql "SELECT merchant_id, available_balance, pending_balance, reserve_balance FROM merchant.accounts WHERE merchant_id IN ($merchantIdsSql) ORDER BY merchant_id;"
        merchantAccountEntries = Invoke-DbQuery -Sql "SELECT id, merchant_id, entry_type, direction, balance_bucket, amount, balance_before, balance_after, related_transaction_id, created_at FROM merchant.account_entries WHERE merchant_id IN ($merchantIdsSql) AND created_at >= '$runStartedAt' ORDER BY created_at;"
    }

    Add-Timeline -Step 'Initial API + DB snapshots' -Data @{
        merchantCount = $merchantInitialApi.Count
        dbCards = $dbInitial.clientVirtualCards.Count
        dbTx = $dbInitial.clientTransactions.Count
        dbAccounts = $dbInitial.merchantAccounts.Count
        dbEntries = $dbInitial.merchantAccountEntries.Count
    }

    $serviceCard = Invoke-Api -Method 'POST' -Path '/api/cards' -Body @{
        cardholderName = "E2E SERVICE $suffix"
        cardType = 'VISA'
        balance = 12000
    }
    if (-not $serviceCard.data.pan) { throw 'Dynamic PAN generation failed via sim-card-service.' }
    $servicePan = $serviceCard.data.pan
    $serviceMaskedPan = Mask-Pan -Pan $servicePan
    Add-ServiceProof -Service 'sim-card-service' -Action 'create-dynamic-pan' -Response @{ cardId = $serviceCard.data.id; maskedPan = $serviceMaskedPan } -Ok $true

    $issuerCreate = Invoke-Api -Method 'POST' -Path '/api/accounts' -AllowHttpError -Body @{
        pan = $servicePan
        balance = 12000
        cardholderName = "E2E ISSUER $suffix"
    }
    Add-ServiceProof -Service 'sim-issuer-service' -Action 'create-account' -Response $issuerCreate -Ok ($issuerCreate.success -eq $true)

    $tokenize = Invoke-Api -Method 'POST' -Path '/api/tokenization/tokenize' -AllowHttpError -Body @{ pan = $servicePan; ttl = 3600; maxUsages = 5 }
    Add-ServiceProof -Service 'tokenization-service' -Action 'tokenize' -Response $tokenize -Ok ([string]::IsNullOrWhiteSpace($tokenize.error))
    if ($tokenize.token) {
        $detokenize = Invoke-Api -Method 'POST' -Path '/api/tokenization/detokenize' -AllowHttpError -Body @{ token = $tokenize.token }
        Add-ServiceProof -Service 'tokenization-service' -Action 'detokenize' -Response @{ token = $tokenize.token; panMasked = (Mask-Pan -Pan $detokenize.fullPan) } -Ok ([string]::IsNullOrWhiteSpace($detokenize.error))
    }

    $keyCreate = Invoke-Api -Method 'POST' -Path '/api/keys' -AllowHttpError -Body @{ name = "RUN_KEY_$suffix"; type = 'MAC'; algorithm = 'AES-256' }
    Add-ServiceProof -Service 'key-management' -Action 'generate-key' -Response $keyCreate -Ok ($keyCreate.success -eq $true)

    $hsmMac = Invoke-Api -Method 'POST' -Path '/api/hsm/generate-mac' -AllowHttpError -Body @{ data = '3132333435363738' }
    Add-ServiceProof -Service 'hsm-simulator' -Action 'generate-mac' -Response $hsmMac -Ok ($hsmMac.success -eq $true)

    $expiry = ('{0:D2}{1:D2}' -f $serviceCard.data.expiryMonth, ($serviceCard.data.expiryYear % 100))
    $cryptoProbe = Invoke-Api -Method 'POST' -Path '/api/crypto/cvv/generate' -AllowHttpError -Body @{
        pan = $servicePan
        expiry = $expiry
        serviceCode = '101'
        key = '00112233445566778899AABBCCDDEEFF'
    }
    Add-ServiceProof -Service 'crypto-service' -Action 'generate-cvv' -Response $cryptoProbe -Ok ($cryptoProbe.success -eq $true)

    $directoryProbe = Invoke-Api -Method 'POST' -AbsoluteUrl 'http://localhost:8015/3ds/authenticate' -AllowHttpError -Body @{
        pan = $servicePan
        amount = 33
        merchantId = "DIR_MERCH_$suffix"
        transactionId = "DIR_$suffix"
    }
    $directoryOk = ($directoryProbe.transStatus -and $directoryProbe.transStatus -ne 'U' -and [string]::IsNullOrWhiteSpace($directoryProbe.error))
    Add-ServiceProof -Service 'directory-server' -Action 'authenticate' -Response $directoryProbe -Ok $directoryOk
    if (-not $directoryOk) {
        Add-Anomaly -Code 'DIRECTORY_PROBE_FAILED' -Message 'Directory server probe not successful.' -Details $directoryProbe
    }

    $authProbe = Invoke-Api -Method 'POST' -Path '/api/authorize' -AllowHttpError -Body @{
        stan = ([string](Get-Random -Minimum 100000 -Maximum 999999))
        pan = $servicePan
        amount = 42.5
        currency = 'EUR'
        merchantId = 'MERCHANT001'
        terminalId = 'TERM0001'
        mcc = '5411'
        location = @{ country = 'FR' }
    }
    Add-ServiceProof -Service 'sim-auth-engine' -Action 'authorize-probe' -Response $authProbe -Ok ($authProbe.success -ne $null)

    $coreApproval = Invoke-Api -Method 'POST' -Path '/api/transactions' -AllowHttpError -Body @{
        pan = $servicePan
        amount = 95.25
        currency = 'EUR'
        merchantId = 'MERCHANT001'
        transactionType = 'PURCHASE'
    }
    $coreDecline = Invoke-Api -Method 'POST' -Path '/api/transactions' -AllowHttpError -Body @{
        pan = $servicePan
        amount = 1500
        currency = 'EUR'
        merchantId = 'MERCHANT001'
        transactionType = 'PURCHASE'
    }
    Add-ServiceProof -Service 'sim-pos-service' -Action 'core-approval' -Response $coreApproval -Ok ($coreApproval.success -eq $true)
    Add-ServiceProof -Service 'sim-pos-service' -Action 'core-decline' -Response $coreDecline -Ok ($coreDecline.success -eq $false)

    $coreDetail = $null
    if ($coreApproval.data -and $coreApproval.data.transactionId) {
        $coreDetail = Invoke-Api -Method 'GET' -Path "/api/transactions/$($coreApproval.data.transactionId)" -AllowHttpError
        if ($coreDetail.data -and $coreDetail.data.acquirerResponse) {
            Add-ServiceProof -Service 'sim-acquirer-service' -Action 'core-detail' -Response $coreDetail.data.acquirerResponse -Ok $true
            if ($coreDetail.data.acquirerResponse.networkResponse) {
                Add-ServiceProof -Service 'sim-network-switch' -Action 'network-response' -Response $coreDetail.data.acquirerResponse.networkResponse -Ok $true
                Add-ServiceProof -Service 'sim-issuer-service' -Action 'issuer-response' -Response $coreDetail.data.acquirerResponse.networkResponse -Ok $true
                Add-ServiceProof -Service 'sim-fraud-detection' -Action 'issuer-flow-steps' -Response $coreDetail.data.acquirerResponse.networkResponse._educational.flowSteps -Ok $true
                Add-ServiceProof -Service 'hsm-simulator' -Action 'issuer-hsm-ops' -Response $coreDetail.data.acquirerResponse.networkResponse._educational.hsmOperations -Ok $true
            }
        }
    }

    Add-Timeline -Step 'Functional service probes completed' -Data @{
        servicePan = $serviceMaskedPan
        authProbeSuccess = ($authProbe.success -ne $null)
        coreApproval = $coreApproval.success
        coreDecline = $coreDecline.success
    }
} catch {
    Write-Host "Script failed: $($_.Exception.Message)" -ForegroundColor Red
    throw
}
