$ErrorActionPreference = "Stop"

# Archived legacy workflow script.
# Kept for historical reference only; do not use for current runtime validation.

Write-Host "2. Legacy transaction submission..."

$statePath = "c:\Users\ASUS-GEORGES-GXT\Downloads\PMP\tests\workflow\state.json"
if (-not (Test-Path $statePath)) {
    Write-Host "[FAIL] Missing state.json. Run step 1 first." -ForegroundColor Red
    exit 1
}

$state = Get-Content $statePath | ConvertFrom-Json
$transactionData = @{
    transactionId = "TEST_TXN_$(Get-Date -Format 'yyyyMMddHHmmss')"
    amount = 75.50
    currency = "EUR"
    pan = $state.pan
    expiry = $state.expiry
    cvv = "123"
    pin = "1234"
    merchantId = "MARCHAND_TEST_001"
    terminalId = "TPE_TEST_001"
    location = @{
        country = "FR"
        city = "Paris"
    }
    metadata = @{
        test = $true
        workflowValidation = $true
    }
}

$params = @{
    Uri = "http://localhost:3003/api/transaction/process"
    Method = "Post"
    Body = ($transactionData | ConvertTo-Json -Depth 5)
    ContentType = "application/json"
    Headers = @{ "X-Test-Mode" = "true" }
}

try {
    $submitResponse = Invoke-RestMethod @params
    Write-Host "   Response: Transaction ID=$($submitResponse.transactionId), Status=$($submitResponse.status)" -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] Submission error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
