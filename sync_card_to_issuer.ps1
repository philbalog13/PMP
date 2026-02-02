# Sync Card to Issuer
$cardFile = "demo_card.json"

if (-not (Test-Path $cardFile)) {
    Write-Host "Error: $cardFile not found. Run create_card.ps1 first." -ForegroundColor Red
    exit 1
}

$card = Get-Content $cardFile | ConvertFrom-Json
$url = "http://localhost:8005/accounts"

$body = @{
    pan = $card.pan
    balance = $card.balance
    cardholderName = $card.cardholderName
} | ConvertTo-Json

Write-Host "Registering Card in Issuer Service..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    
    if ($response.success) {
        Write-Host "✅ Card Synchronized Successfully!" -ForegroundColor Green
        Write-Host "Account ID: $($response.data.id)"
    } else {
        Write-Host "❌ Failed to sync card. Response: $($response | ConvertTo-Json)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error syncing card: $($_.Exception.Message)" -ForegroundColor Red
}
