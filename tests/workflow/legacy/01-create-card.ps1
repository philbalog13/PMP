$ErrorActionPreference = "Stop"

# Archived legacy workflow script.
# Kept for historical reference only; do not use for current runtime validation.

Write-Host "1. Legacy virtual card creation..."

$body = @{
    type = "VISA"
    holder = "JEAN DUPONT"
    balance = 1000.00
    currency = "EUR"
    limits = @{
        daily = 2000.00
        transaction = 500.00
    }
} | ConvertTo-Json -Depth 5

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3004/api/cards/generate" -Method Post -Body $body -ContentType "application/json"

    $cardId = $response.cardId
    $pan = $response.pan
    $expiry = $response.expiry

    Write-Host "   Card created: PAN=$pan, Expiry=$expiry, ID=$cardId" -ForegroundColor Green

    $state = @{
        cardId = $cardId
        pan = $pan
        expiry = $expiry
        holder = "JEAN DUPONT"
    }

    $state | ConvertTo-Json | Out-File -FilePath "c:\Users\ASUS-GEORGES-GXT\Downloads\PMP\tests\workflow\state.json" -Encoding utf8
    Write-Host "   State saved in tests\workflow\state.json" -ForegroundColor Gray
} catch {
    Write-Host "   [FAIL] Card creation error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
