param(
    [string]$BaseUrl = "http://localhost:8000",
    [string]$Password = "StrongPass123!@#",
    [double]$StartingBalance = 10000,
    [Nullable[double]]$AmountMerchant1 = $null,
    [Nullable[double]]$AmountMerchant2 = $null,
    [Nullable[double]]$AmountMerchant3 = $null,
    [double]$AutoAmountMin = 120,
    [double]$AutoAmountMax = 8000,
    [int]$MaxPosRetries = 5,
    [int]$MaxThreeDSAttempts = 12,
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
    $OutputPath = Join-Path $outputDir "transaction-timeline-$timestamp.json"
}

$timeline = New-Object System.Collections.Generic.List[object]

function Add-Timeline {
    param([string]$Step, [object]$Data)

    $timeline.Add([pscustomobject]@{
        at = (Get-Date).ToString('o')
        step = $Step
        data = $Data
    })
}

function Invoke-Api {
    param(
        [ValidateSet('GET', 'POST', 'PATCH')][string]$Method,
        [string]$Path,
        [string]$Token = $null,
        [object]$Body = $null,
        [switch]$AllowHttpError
    )

    $headers = @{}
    if ($Token) {
        $headers.Authorization = "Bearer $Token"
    }

    $params = @{
        Method = $Method
        Uri = "$BaseUrl$Path"
        Headers = $headers
        ErrorAction = 'Stop'
    }

    if ($Body -ne $null) {
        $params.ContentType = 'application/json'
        $params.Body = ($Body | ConvertTo-Json -Depth 20)
    }

    try {
        return Invoke-RestMethod @params
    } catch {
        if ($AllowHttpError -and $_.ErrorDetails -and $_.ErrorDetails.Message) {
            try {
                return ($_.ErrorDetails.Message | ConvertFrom-Json)
            } catch {
                return [pscustomobject]@{
                    success = $false
                    error = $_.Exception.Message
                    raw = $_.ErrorDetails.Message
                }
            }
        }

        throw
    }
}

function Register-User {
    param(
        [string]$Username,
        [string]$Email,
        [string]$Role,
        [string]$First,
        [string]$Last
    )

    return Invoke-Api -Method 'POST' -Path '/api/auth/register' -Body @{
        username = $Username
        email = $Email
        password = $Password
        firstName = $First
        lastName = $Last
        role = $Role
    }
}

function Login-User {
    param([string]$Email)

    return Invoke-Api -Method 'POST' -Path '/api/auth/login' -Body @{
        email = $Email
        password = $Password
    }
}

function Write-Section {
    param([string]$Title)

    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
}

function Resolve-TransactionAmount {
    param(
        [Nullable[double]]$RequestedAmount,
        [double]$CardBalance,
        [double]$SingleTxnLimit,
        [double]$DailyRemaining,
        [double]$AutoAmountMin,
        [double]$AutoAmountMax
    )

    if ($RequestedAmount -ne $null -and $RequestedAmount -gt 0) {
        return [math]::Round([double]$RequestedAmount, 2)
    }

    $apiMax = [Math]::Min($CardBalance, $SingleTxnLimit)
    if ($DailyRemaining -gt 0) {
        $apiMax = [Math]::Min($apiMax, $DailyRemaining)
    }

    $maxCandidate = [Math]::Min(($apiMax * 0.7), $AutoAmountMax)
    if ($maxCandidate -lt 10) {
        throw "No room for auto amount: balance=$CardBalance singleLimit=$SingleTxnLimit dailyRemaining=$DailyRemaining"
    }

    $minCandidate = [Math]::Min($AutoAmountMin, [Math]::Max(10, ($maxCandidate * 0.35)))
    if ($minCandidate -gt $maxCandidate) {
        $minCandidate = [Math]::Max(10, ($maxCandidate * 0.5))
    }

    $ratio = (Get-Random -Minimum 0 -Maximum 10000) / 10000
    $value = $minCandidate + (($maxCandidate - $minCandidate) * $ratio)
    return [math]::Round($value, 2)
}

try {
    Write-Section "1) Health check"
    $health = Invoke-Api -Method 'GET' -Path '/health'
    Add-Timeline -Step 'Health check platform' -Data @{ status = $health.status }
    Write-Host "Gateway status: $($health.status)" -ForegroundColor Green

    Write-Section "2) Create personas"
    $suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

    $clientEmail = "client.timeline.$suffix@pmp.local"
    $merchant1Email = "merchant.alpha.$suffix@pmp.local"
    $merchant2Email = "merchant.beta.$suffix@pmp.local"
    $merchant3Email = "merchant.gamma.$suffix@pmp.local"

    $clientReg = Register-User -Username "client_tl_$suffix" -Email $clientEmail -Role 'ROLE_CLIENT' -First 'Client' -Last 'Timeline'
    $merchant1Reg = Register-User -Username "merchant_alpha_$suffix" -Email $merchant1Email -Role 'ROLE_MARCHAND' -First 'Alpha' -Last 'Merchant'
    $merchant2Reg = Register-User -Username "merchant_beta_$suffix" -Email $merchant2Email -Role 'ROLE_MARCHAND' -First 'Beta' -Last 'Merchant'
    $merchant3Reg = Register-User -Username "merchant_gamma_$suffix" -Email $merchant3Email -Role 'ROLE_MARCHAND' -First 'Gamma' -Last 'Merchant'

    Add-Timeline -Step 'Create personas' -Data @{
        client = @{ id = $clientReg.user.id; email = $clientEmail }
        merchants = @(
            @{ id = $merchant1Reg.user.id; email = $merchant1Email; name = 'Alpha Market' },
            @{ id = $merchant2Reg.user.id; email = $merchant2Email; name = 'Beta Electronics' },
            @{ id = $merchant3Reg.user.id; email = $merchant3Email; name = 'Gamma Travel' }
        )
    }

    Write-Host "Client:    $clientEmail" -ForegroundColor White
    Write-Host "Merchant1: $merchant1Email" -ForegroundColor White
    Write-Host "Merchant2: $merchant2Email" -ForegroundColor White
    Write-Host "Merchant3: $merchant3Email" -ForegroundColor White

    Write-Section "3) Login personas"
    $clientLogin = Login-User -Email $clientEmail
    $merchant1Login = Login-User -Email $merchant1Email
    $merchant2Login = Login-User -Email $merchant2Email
    $merchant3Login = Login-User -Email $merchant3Email

    $clientToken = $clientLogin.accessToken
    $merchants = @(
        [pscustomobject]@{
            name = 'Alpha Market'
            email = $merchant1Email
            token = $merchant1Login.accessToken
            userId = $merchant1Login.user.id
            mcc = '5411'
            requestedAmount = $AmountMerchant1
        },
        [pscustomobject]@{
            name = 'Beta Electronics'
            email = $merchant2Email
            token = $merchant2Login.accessToken
            userId = $merchant2Login.user.id
            mcc = '5732'
            requestedAmount = $AmountMerchant2
        },
        [pscustomobject]@{
            name = 'Gamma Travel'
            email = $merchant3Email
            token = $merchant3Login.accessToken
            userId = $merchant3Login.user.id
            mcc = '4722'
            requestedAmount = $AmountMerchant3
        }
    )

    Add-Timeline -Step 'Login personas' -Data @{
        client = $clientEmail
        merchants = @($merchant1Email, $merchant2Email, $merchant3Email)
    }

    Write-Section "4) Generate card + fund to target balance"
    $cardsBefore = Invoke-Api -Method 'GET' -Path '/api/client/cards' -Token $clientToken
    $card = $cardsBefore.cards[0]
    if (-not $card) {
        throw 'No card returned for client.'
    }

    $cardId = $card.id
    $maskedPan = $card.masked_pan

    Invoke-Api -Method 'PATCH' -Path "/api/client/cards/$cardId/limits" -Token $clientToken -Body @{
        dailyLimit = 30000
        monthlyLimit = 100000
        singleTxnLimit = 20000
    } | Out-Null

    $fundingSql = "UPDATE client.virtual_cards SET balance = $StartingBalance WHERE id = '$cardId' RETURNING id, balance;"
    $fundingRaw = & docker exec pmp-postgres psql -U pmp_user -d pmp_db -t -A -c $fundingSql
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to update client balance in PostgreSQL container pmp-postgres.'
    }

    $cardsAfterFunding = Invoke-Api -Method 'GET' -Path '/api/client/cards' -Token $clientToken
    $cardAfterFunding = ($cardsAfterFunding.cards | Where-Object { $_.id -eq $cardId })

    Add-Timeline -Step 'Client card generated and funded' -Data @{
        cardId = $cardId
        maskedPan = $maskedPan
        initialBalance = [double]$card.balance
        fundedBalance = [double]$cardAfterFunding.balance
        fundingSqlResult = $fundingRaw
    }

    Write-Host "Card: $maskedPan" -ForegroundColor Yellow
    Write-Host "Balance: $($card.balance) -> $($cardAfterFunding.balance)" -ForegroundColor Green

    Write-Section "5) Ensure merchant terminals + read initial balances from API"
    $merchantStartingBalances = New-Object System.Collections.Generic.List[object]
    foreach ($m in $merchants) {
        $pos = Invoke-Api -Method 'GET' -Path '/api/merchant/pos' -Token $m.token
        $terminalId = $pos.terminals[0].terminal_id
        if (-not $terminalId) {
            throw "No terminal for merchant $($m.name)"
        }
        $m | Add-Member -NotePropertyName terminalId -NotePropertyValue $terminalId -Force

        $account = Invoke-Api -Method 'GET' -Path '/api/merchant/account' -Token $m.token
        $m | Add-Member -NotePropertyName startingAvailableBalance -NotePropertyValue ([double]$account.account.availableBalance) -Force
        $m | Add-Member -NotePropertyName startingPendingBalance -NotePropertyValue ([double]$account.account.pendingBalance) -Force
        $m | Add-Member -NotePropertyName startingReserveBalance -NotePropertyValue ([double]$account.account.reserveBalance) -Force

        $merchantStartingBalances.Add([pscustomobject]@{
            merchant = $m.name
            email = $m.email
            availableBalance = [double]$account.account.availableBalance
            pendingBalance = [double]$account.account.pendingBalance
            reserveBalance = [double]$account.account.reserveBalance
            grossBalance = [double]$account.account.grossBalance
            terminalId = $terminalId
        })
    }

    Add-Timeline -Step 'Merchant initial balances from API' -Data $merchantStartingBalances

    Write-Section "6) Execute client + merchant transactions"
    $executedTransactions = New-Object System.Collections.Generic.List[object]

    foreach ($m in $merchants) {
        $cardBeforeTxn = Invoke-Api -Method 'GET' -Path "/api/client/cards/$cardId" -Token $clientToken
        $clientBalanceBefore = [double]$cardBeforeTxn.card.balance
        $singleTxnLimit = [double]$cardBeforeTxn.card.single_txn_limit
        $dailyRemaining = [double]$cardBeforeTxn.card.daily_limit - [double]$cardBeforeTxn.card.daily_spent

        $resolvedAmount = Resolve-TransactionAmount `
            -RequestedAmount $m.requestedAmount `
            -CardBalance $clientBalanceBefore `
            -SingleTxnLimit $singleTxnLimit `
            -DailyRemaining $dailyRemaining `
            -AutoAmountMin $AutoAmountMin `
            -AutoAmountMax $AutoAmountMax

        $merchantAccountBefore = Invoke-Api -Method 'GET' -Path '/api/merchant/account' -Token $m.token
        $pendingBefore = [double]$merchantAccountBefore.account.pendingBalance

        $clientTxn = Invoke-Api -Method 'POST' -Path '/api/client/transactions/simulate' -Token $clientToken -Body @{
            cardId = $cardId
            amount = $resolvedAmount
            merchantName = $m.name
            merchantMcc = $m.mcc
            paymentType = 'PURCHASE'
            use3DS = $true
        }

        $cardAfterClientTxn = Invoke-Api -Method 'GET' -Path "/api/client/cards/$cardId" -Token $clientToken
        $clientBalanceAfter = [double]$cardAfterClientTxn.card.balance

        $attempt = 0
        $posTxn = $null

        do {
            $attempt++
            $posTxn = Invoke-Api -Method 'POST' -Path '/api/merchant/pos/transaction' -Token $m.token -Body @{
                terminalId = $m.terminalId
                maskedPan = $maskedPan
                amount = $resolvedAmount
                paymentMethod = 'chip'
            }
        } while ((-not $posTxn.approved) -and ($attempt -lt $MaxPosRetries))

        if (-not $posTxn.approved) {
            throw "No approved POS transaction for $($m.name) after $MaxPosRetries attempts"
        }

        $merchantAccountAfter = Invoke-Api -Method 'GET' -Path '/api/merchant/account' -Token $m.token
        $pendingAfter = [double]$merchantAccountAfter.account.pendingBalance
        $pendingDelta = [math]::Round(($pendingAfter - $pendingBefore), 2)

        $executedTransactions.Add([pscustomobject]@{
            merchant = $m.name
            requestedAmount = if ($m.requestedAmount -ne $null) { [double]$m.requestedAmount } else { $null }
            amountUsed = [double]$resolvedAmount
            clientAmountRecorded = [double]$clientTxn.transaction.amount
            merchantAmountRecorded = [double]$posTxn.transaction.amount
            clientTransactionId = $clientTxn.transaction.transaction_id
            merchantTransactionId = $posTxn.transaction.transaction_id
            threeDSClientStatus = $clientTxn.transaction.threeds_status
            clientBalanceBefore = $clientBalanceBefore
            clientBalanceAfter = $clientBalanceAfter
            merchantPendingBefore = $pendingBefore
            merchantPendingAfter = $pendingAfter
            merchantPendingDelta = $pendingDelta
            merchantAvailableBalance = [double]$merchantAccountAfter.account.availableBalance
            posAttempts = $attempt
        })

        Add-Timeline -Step "Transaction executed for $($m.name)" -Data @{
            requestedAmount = if ($m.requestedAmount -ne $null) { [double]$m.requestedAmount } else { $null }
            amountUsed = [double]$resolvedAmount
            clientTxn = $clientTxn.transaction.transaction_id
            merchantTxn = $posTxn.transaction.transaction_id
            client3DS = $clientTxn.transaction.threeds_status
            clientBalanceBefore = $clientBalanceBefore
            clientBalanceAfter = $clientBalanceAfter
            merchantPendingBefore = $pendingBefore
            merchantPendingAfter = $pendingAfter
            merchantPendingDelta = $pendingDelta
        }

        Write-Host "[$($m.name)] amount=$resolvedAmount pendingBefore=$pendingBefore pendingAfter=$pendingAfter delta=$pendingDelta" -ForegroundColor White
    }

    $cardsAfterTx = Invoke-Api -Method 'GET' -Path '/api/client/cards' -Token $clientToken
    $cardAfterTx = ($cardsAfterTx.cards | Where-Object { $_.id -eq $cardId })

    Add-Timeline -Step 'Client balance after merchant transactions' -Data @{
        cardId = $cardId
        balance = [double]$cardAfterTx.balance
    }

    Write-Section "7) 3DS challenge flow (required)"
    $challengeResult = $null
    $threeDSAmount = [math]::Round([Math]::Min([Math]::Max(([double]$cardAfterTx.balance * 0.10), 100), 1200), 2)

    Add-Timeline -Step '3DS amount derived from client API balance' -Data @{
        amount = $threeDSAmount
        clientBalance = [double]$cardAfterTx.balance
    }

    for ($i = 1; $i -le $MaxThreeDSAttempts; $i++) {
        $candidate = Invoke-Api -Method 'POST' -Path '/api/transaction/process' -Token $clientToken -AllowHttpError -Body @{
            pan = '4111111111111111'
            amount = $threeDSAmount
            currency = 'EUR'
            merchantId = 'MERCH-3DS-CHALLENGE'
            terminalId = 'WEB001'
            mcc = '5999'
            country = 'FR'
            isEcommerce = $true
        }

        if ($candidate.responseCode -eq '65' -and $candidate.threeDSResult.transStatus -eq 'C') {
            $challengeResult = $candidate
            Add-Timeline -Step '3DS challenge required transaction' -Data @{
                attempt = $i
                responseCode = $candidate.responseCode
                challengeUrl = $candidate.threeDSResult.challengeUrl
                acsTransId = $candidate.threeDSResult.acsTransId
                processingTime = $candidate.processingTime
                flowSteps = $candidate.flowSteps
            }
            break
        }
    }

    if (-not $challengeResult) {
        throw "No 3DS challenge transaction after $MaxThreeDSAttempts attempts"
    }

    $verify3DS = Invoke-Api -Method 'POST' -Path '/api/transaction/verify-challenge' -Token $clientToken -Body @{
        acsTransId = $challengeResult.threeDSResult.acsTransId
        otp = '123456'
    }

    Add-Timeline -Step '3DS OTP validation' -Data @{
        acsTransId = $challengeResult.threeDSResult.acsTransId
        responseCode = $verify3DS.responseCode
        transStatus = $verify3DS.threeDSResult.transStatus
    }

    Write-Host "Challenge URL: $($challengeResult.threeDSResult.challengeUrl)" -ForegroundColor Yellow
    Write-Host "OTP verify: transStatus=$($verify3DS.threeDSResult.transStatus), code=$($verify3DS.responseCode)" -ForegroundColor Green

    Write-Section "8) Re-login merchants + read real balances from API"
    $merchantBalancesAfterLogin = New-Object System.Collections.Generic.List[object]

    foreach ($m in $merchants) {
        $loginAgain = Login-User -Email $m.email
        $account = Invoke-Api -Method 'GET' -Path '/api/merchant/account' -Token $loginAgain.accessToken

        $merchantBalancesAfterLogin.Add([pscustomobject]@{
            merchant = $m.name
            email = $m.email
            availableBalance = [double]$account.account.availableBalance
            pendingBalance = [double]$account.account.pendingBalance
            reserveBalance = [double]$account.account.reserveBalance
            grossBalance = [double]$account.account.grossBalance
        })
    }

    Add-Timeline -Step 'Merchant balances after relogin from API' -Data $merchantBalancesAfterLogin

    $merchantIdsSql = ($merchants | ForEach-Object { "'" + $_.userId + "'" }) -join ','
    $sqlCheck = "SELECT merchant_id, available_balance, pending_balance, reserve_balance FROM merchant.accounts WHERE merchant_id IN ($merchantIdsSql) ORDER BY merchant_id;"
    $dbAccountSnapshot = & docker exec pmp-postgres psql -U pmp_user -d pmp_db -t -A -F "|" -c $sqlCheck
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to fetch merchant.accounts snapshot in PostgreSQL container pmp-postgres.'
    }

    Write-Section "9) Build report"
    $final = [pscustomobject]@{
        scenario = 'Client card 10k + multi-merchant transactions + API-derived values + 3DS challenge'
        generatedAt = (Get-Date).ToString('o')
        baseUrl = $BaseUrl
        credentials = [pscustomobject]@{
            password = $Password
            clientEmail = $clientEmail
            merchantEmails = @($merchant1Email, $merchant2Email, $merchant3Email)
        }
        inputAmounts = [pscustomobject]@{
            amountMerchant1 = $AmountMerchant1
            amountMerchant2 = $AmountMerchant2
            amountMerchant3 = $AmountMerchant3
            autoAmountMin = $AutoAmountMin
            autoAmountMax = $AutoAmountMax
        }
        client = [pscustomobject]@{
            email = $clientEmail
            cardId = $cardId
            maskedPan = $maskedPan
            initialBalance = [double]$cardAfterFunding.balance
            finalBalance = [double]$cardAfterTx.balance
            totalSpent = [math]::Round(([double]$cardAfterFunding.balance - [double]$cardAfterTx.balance), 2)
        }
        merchantStartingBalances = $merchantStartingBalances
        transactions = $executedTransactions
        merchantBalancesAfterLogin = $merchantBalancesAfterLogin
        threeDSChallenge = [pscustomobject]@{
            amount = $threeDSAmount
            challengeUrl = $challengeResult.threeDSResult.challengeUrl
            acsTransId = $challengeResult.threeDSResult.acsTransId
            verifyTransStatus = $verify3DS.threeDSResult.transStatus
            verifyResponseCode = $verify3DS.responseCode
        }
        dbAccountSnapshot = $dbAccountSnapshot
        timeline = $timeline
    }

    $json = $final | ConvertTo-Json -Depth 40
    $json | Out-File -FilePath $OutputPath -Encoding utf8

    Write-Host "Report saved: $OutputPath" -ForegroundColor Green
    Write-Host "Client final balance: $([double]$cardAfterTx.balance)" -ForegroundColor Green
    Write-Host "Done." -ForegroundColor Cyan

    $final
} catch {
    Write-Host "Script failed: $($_.Exception.Message)" -ForegroundColor Red
    throw
}
