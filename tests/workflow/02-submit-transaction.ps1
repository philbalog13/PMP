$ErrorActionPreference = "Stop"

Write-Host "2. 📝 Préparation de la transaction..."

# Read state
if (-not (Test-Path "c:\Users\ASUS-GEORGES-GXT\Downloads\PMP\tests\workflow\state.json")) {
    Write-Host "❌ Fichier d'état introuvable. Veuillez exécuter l'étape 1 avant." -ForegroundColor Red
    exit 1
}

$State = Get-Content "c:\Users\ASUS-GEORGES-GXT\Downloads\PMP\tests\workflow\state.json" | ConvertFrom-Json
$Pan = $State.pan
$Expiry = $State.expiry

# 30 days later for unique ID
$TxId = "TEST_TXN_$(Get-Date -Format 'yyyyMMddHHmmss')"

$TransactionData = @{
    transactionId = $TxId
    amount = 75.50
    currency = "EUR"
    pan = $Pan
    expiry = $Expiry
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

Write-Host "3. 🚀 Soumission de la transaction..."
Write-Host "   Données: $($TransactionData | ConvertTo-Json -Depth 5)" -ForegroundColor Gray

$Params = @{
    Uri = "http://localhost:3003/api/transaction/process"
    Method = "Post"
    Body = ($TransactionData | ConvertTo-Json -Depth 5)
    ContentType = "application/json"
    Headers = @{ "X-Test-Mode" = "true" }
}

$StartTime = Get-Date

try {
    $SubmitResponse = Invoke-RestMethod @Params
    
    $EndTime = Get-Date
    $Duration = ($EndTime - $StartTime).TotalMilliseconds
    
    $TransactionId = $SubmitResponse.transactionId
    $Status = $SubmitResponse.status
    
    Write-Host "   Réponse: Transaction ID=$TransactionId, Status=$Status" -ForegroundColor Green
    Write-Host "   Temps de soumission: $($Duration)ms" -ForegroundColor Gray
    
    # Update state
    $State | Add-Member -MemberType NoteProperty -Name "transactionId" -Value $TransactionId -Force
    $State | ConvertTo-Json | Out-File -FilePath "c:\Users\ASUS-GEORGES-GXT\Downloads\PMP\tests\workflow\state.json" -Encoding utf8
    Write-Host "   État mis à jour avec Transaction ID." -ForegroundColor Gray

} catch {
    Write-Host "   ❌ Erreur lors de la soumission: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
         $stream = $_.Exception.Response.GetResponseStream()
         $reader = New-Object System.IO.StreamReader($stream)
         Write-Host "   Body: $($reader.ReadToEnd())" -ForegroundColor Yellow
    }
    exit 1
}
