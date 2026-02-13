param(
    [string]$BaseUrl = "http://localhost:8000",
    [string]$Email = "bakery@pmp.edu",
    [string]$Password = "qa-pass-123",
    [string]$Certificate = "SIMULATED_CERT_001",
    [int]$Days = 10,
    [int]$TransactionsPerDay = 9,
    [switch]$NoRefunds,
    [switch]$NoVoids,
    [switch]$NoSettlements,
    [switch]$NoPayouts
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
}

function Get-ApiError {
    param([System.Management.Automation.ErrorRecord]$ErrorRecord)
    $message = $ErrorRecord.Exception.Message
    try {
        if ($ErrorRecord.Exception.Response -and $ErrorRecord.Exception.Response.GetResponseStream()) {
            $reader = [System.IO.StreamReader]::new($ErrorRecord.Exception.Response.GetResponseStream())
            $bodyText = $reader.ReadToEnd()
            if (-not [string]::IsNullOrWhiteSpace($bodyText)) {
                try {
                    $bodyJson = $bodyText | ConvertFrom-Json
                    if ($bodyJson.error) {
                        return "$message | API: $($bodyJson.error)"
                    }
                    return "$message | API: $bodyText"
                } catch {
                    return "$message | API: $bodyText"
                }
            }
        }
    } catch {}
    return $message
}

function Invoke-Api {
    param(
        [ValidateSet("GET", "POST")]
        [string]$Method,
        [string]$Path,
        [string]$Token = "",
        [hashtable]$Body = $null
    )

    $uri = "$BaseUrl$Path"
    $headers = @{}
    if (-not [string]::IsNullOrWhiteSpace($Token)) {
        $headers.Authorization = "Bearer $Token"
    }

    $params = @{
        Method = $Method
        Uri = $uri
        ContentType = "application/json"
        Headers = $headers
    }

    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 20)
    }

    try {
        return Invoke-RestMethod @params
    } catch {
        throw (Get-ApiError $_)
    }
}

function Format-Money {
    param([object]$Value)
    $number = 0.0
    [void][double]::TryParse("$Value", [ref]$number)
    return ("{0:N2}" -f $number)
}

Write-Section "PMP Merchant Real History Generator"
Write-Host "Base URL: $BaseUrl" -ForegroundColor DarkGray
Write-Host "Merchant: $Email" -ForegroundColor DarkGray

try {
    Write-Section "1) Merchant Login"
    $loginBody = @{
        email = $Email
        password = $Password
    }
    if (-not [string]::IsNullOrWhiteSpace($Certificate)) {
        $loginBody.certificate = $Certificate
    }

    $login = Invoke-Api -Method "POST" -Path "/api/auth/marchand/login" -Body $loginBody
    if (-not $login.accessToken) {
        throw "Missing accessToken in login response."
    }
    $token = $login.accessToken
    Write-Host "Login OK." -ForegroundColor Green

    Write-Section "2) Generate Historical Transactions + Ledger"
    $historyBody = @{
        days = $Days
        transactionsPerDay = $TransactionsPerDay
        includeRefunds = (-not $NoRefunds.IsPresent)
        includeVoids = (-not $NoVoids.IsPresent)
        includeSettlements = (-not $NoSettlements.IsPresent)
        includePayouts = (-not $NoPayouts.IsPresent)
    }

    $history = Invoke-Api -Method "POST" -Path "/api/merchant/account/generate-history" -Token $token -Body $historyBody
    $summary = $history.summary
    Write-Host "History generated successfully." -ForegroundColor Green

    Write-Section "3) Fetch Account + Recent Data"
    $accountResponse = Invoke-Api -Method "GET" -Path "/api/merchant/account" -Token $token
    $transactionsResponse = Invoke-Api -Method "GET" -Path "/api/merchant/transactions?limit=5&page=1" -Token $token
    $entriesResponse = Invoke-Api -Method "GET" -Path "/api/merchant/account/entries?limit=5&page=1" -Token $token
    $dashboardResponse = Invoke-Api -Method "GET" -Path "/api/merchant/dashboard" -Token $token

    $account = $accountResponse.account
    $dashboard = $dashboardResponse.dashboard

    Write-Section "Result Summary"
    Write-Host ("Generated transactions : {0}" -f $summary.createdTransactions) -ForegroundColor White
    Write-Host ("Approved / Declined    : {0} / {1}" -f $summary.approvedTransactions, $summary.declinedTransactions) -ForegroundColor White
    Write-Host ("Refunds / Voids        : {0} / {1}" -f $summary.refunds, $summary.voids) -ForegroundColor White
    Write-Host ("Settlements / Payouts  : {0} / {1}" -f $summary.settlements, $summary.payouts) -ForegroundColor White
    Write-Host ""
    Write-Host ("Account Available      : {0} {1}" -f (Format-Money $account.availableBalance), $account.currency) -ForegroundColor Yellow
    Write-Host ("Account Pending        : {0} {1}" -f (Format-Money $account.pendingBalance), $account.currency) -ForegroundColor Yellow
    Write-Host ("Account Reserve        : {0} {1}" -f (Format-Money $account.reserveBalance), $account.currency) -ForegroundColor Yellow
    Write-Host ""
    Write-Host ("Recent transactions    : {0} (total={1})" -f $transactionsResponse.transactions.Count, $transactionsResponse.pagination.total) -ForegroundColor Gray
    Write-Host ("Recent ledger entries  : {0} (total={1})" -f $entriesResponse.entries.Count, $entriesResponse.pagination.total) -ForegroundColor Gray
    Write-Host ("Today's Tx / Revenue   : {0} / {1}" -f $dashboard.today.transactionCount, (Format-Money $dashboard.today.revenue)) -ForegroundColor Gray

    Write-Host ""
    Write-Host "Done. Your merchant has realistic transactions and ledger history." -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "Script failed." -ForegroundColor Red
    Write-Host $_ -ForegroundColor Red
    exit 1
}
