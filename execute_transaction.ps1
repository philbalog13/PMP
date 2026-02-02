# Execute Transaction
$cardFile = "demo_card.json"

if (-not (Test-Path $cardFile)) {
    Write-Host "Error: $cardFile not found. Run create_card.ps1 first." -ForegroundColor Red
    exit 1
}

$card = Get-Content $cardFile | ConvertFrom-Json
$url = "http://localhost:8002/transactions"

# Define transaction details
$body = @{
    merchantId = "MERCHANT001"
    amount = 50.00
    currency = "EUR"
    pan = $card.pan
    cvv = $card.cvv
    expiryMonth = $card.expiryMonth
    expiryYear = $card.expiryYear
    transactionType = "PURCHASE"
} | ConvertTo-Json

Write-Host "Submitting Transaction..." -ForegroundColor Cyan
Write-Host "Merchant: MERCH01"
Write-Host "Amount: 50.00 EUR"
Write-Host "Card: $($card.maskedPan)"

try {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    $sw.Stop()
    $durationMs = $sw.ElapsedMilliseconds
    
    if ($response.success) {
        $txn = $response.data
        Write-Host "✅ Transaction APPROVED" -ForegroundColor Green
        Write-Host "-------------------------------------------"
        Write-Host "⏱️ Response Time: $durationMs ms" -ForegroundColor Magenta
        Write-Host "Auth Code: $($txn.authorizationCode)" -ForegroundColor Yellow
        Write-Host "Response Code: $($txn.responseCode)"
        Write-Host "Status: $($txn.status)"
        Write-Host "Transaction ID: $($txn.transactionId)"
        Write-Host "Time: $($txn.timestamp)"
        Write-Host "-------------------------------------------"
    } else {
        Write-Host "❌ Transaction DECLINED/FAILED" -ForegroundColor Red
        Write-Host "Reason: $($response.error)"
        Write-Host "Response Code: $($response.data.responseCode)"
        Write-Host "Status: $($response.data.status)"
    }
} catch {
    Write-Host "❌ Error executing transaction: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
        $errBody = $reader.ReadToEnd()
        Write-Host "Server Response: $errBody" -ForegroundColor Red
    }
}
