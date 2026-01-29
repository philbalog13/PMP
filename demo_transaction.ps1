$ErrorActionPreference = "Stop"

function title {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  $args" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
}

title "DEMO PMP : TEST DE TRANSACTION (VIA API)"

# 1. GENERER UNE CARTE VERTE
# ===========================
title "ETAPE 1 : Génération d'une carte virtuelle"
Write-Host "Appel de POST http://localhost:8000/api/cards/generate..."

try {
    $cardResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/cards/generate" -Method Post -ContentType "application/json" -Body '{}'
    
    $pan = $cardResponse.pan
    $cvv = $cardResponse.cvv
    $expiryMonth = $cardResponse.expiryMonth.ToString("00")
    $expiryYear = $cardResponse.expiryYear
    $cardId = $cardResponse.id

    Write-Host "✅ Carte générée avec succès !" -ForegroundColor Green
    Write-Host "   PAN:  $pan" -ForegroundColor Yellow
    Write-Host "   CVV:  $cvv" -ForegroundColor Yellow
    Write-Host "   EXP:  $expiryMonth/$expiryYear" -ForegroundColor Yellow
    Write-Host "   ID:   $cardId"
}
catch {
    Write-Host "❌ Erreur lors de la génération de la carte :" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit
}

# 2. FAIRE UN PAIEMENT
# =====================
title "ETAPE 2 : Tentative de paiement (50.00 EUR)"

$transactionData = @{
    merchantId = "MERCH001"
    terminalId = "TERM001"
    amount = 50.00
    currency = "EUR"
    pan = $pan
    expiryDate = "$expiryMonth/$expiryYear"
    cvv = $cvv
    pin = "1234" # Dummy PIN for simulation
}

$jsonBody = $transactionData | ConvertTo-Json

Write-Host "Envoi de la transaction..."
Write-Host $jsonBody -ForegroundColor DarkGray

try {
    $txResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/pos/transaction" -Method Post -ContentType "application/json" -Body $jsonBody
    
    Write-Host ""
    if ($txResponse.status -eq "APPROVED") {
        Write-Host "✅ PAIEMENT ACCEPTÉ !" -ForegroundColor Green
    } else {
        Write-Host "❌ PAIEMENT REFUSÉ" -ForegroundColor Red
    }
    
    Write-Host "   Status: " $txResponse.status
    Write-Host "   Code de réponse: " $txResponse.responseCode
    Write-Host "   Auth Code: " $txResponse.authCode
    Write-Host "   Message: " $txResponse.message
}
catch {
    Write-Host "❌ Erreur lors du paiement :" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit
}

title "DEMO TERMINÉE AVEC SUCCÈS"
