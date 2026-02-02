$ErrorActionPreference = "Stop"

Write-Host "1. 💳 Création carte virtuelle de test..."

$Body = @{
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
    $Response = Invoke-RestMethod -Uri "http://localhost:3004/api/cards/generate" -Method Post -Body $Body -ContentType "application/json"
    
    $CardId = $Response.cardId
    $Pan = $Response.pan
    $Expiry = $Response.expiry
    
    Write-Host "   Carte créée: PAN=$Pan, Expiry=$Expiry, ID=$CardId" -ForegroundColor Green
    
    # Save state
    $State = @{
        cardId = $CardId
        pan = $Pan
        expiry = $Expiry
        holder = "JEAN DUPONT"
    }
    
    $State | ConvertTo-Json | Out-File -FilePath "c:\Users\ASUS-GEORGES-GXT\Downloads\PMP\tests\workflow\state.json" -Encoding utf8
    Write-Host "   État sauvegardé dans tests\workflow\state.json" -ForegroundColor Gray

} catch {
    Write-Host "   ❌ Erreur lors de la création de la carte: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
         $stream = $_.Exception.Response.GetResponseStream()
         $reader = New-Object System.IO.StreamReader($stream)
         Write-Host "   Body: $($reader.ReadToEnd())" -ForegroundColor Yellow
    }
    exit 1
}
