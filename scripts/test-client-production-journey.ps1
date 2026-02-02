# PMP Client Production Journey Simulation

$baseUrl = "http://localhost:8000"
$ProgressPreference = 'SilentlyContinue'

function Log {
    param([string]$Message, [string]$Color = "White")
    Write-Host "$Message" -ForegroundColor $Color
}

function Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "   $Title" 
    Write-Host "==================================================" -ForegroundColor Cyan
}

function Invoke-Api {
    param ([string]$Method, [string]$Uri, [string]$Token, [object]$Body = $null)
    $params = @{
        Method = $Method
        Uri = "$baseUrl$Uri"
        Headers = @{ Authorization = "Bearer $Token" }
        ContentType = "application/json"
        ErrorAction = "Stop"
    }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10) }
    
    try {
        return Invoke-RestMethod @params
    } catch {
        $errorMsg = $_.Exception.Message
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $respBody = $reader.ReadToEnd() | ConvertFrom-Json
            if ($respBody.error) { $errorMsg = $respBody.error }
        } catch {}
        Write-Error "API Call Failed ($Method $Uri): $errorMsg"
        throw "API Call Failed: $errorMsg"
    }
}

$suffix = Get-Random

# 1. Registration
Section "1. INSCRIPTION CLIENT"
$clientUser = @{
    username = "alice.client.$suffix"
    email = "alice.client.$suffix@test.com"
    password = "StrongPass123!@#"
    firstName = "Alice"
    lastName = "Client"
    role = "ROLE_CLIENT"
}

Log "Inscription du client: $($clientUser.email)..." "Yellow"

try {
    $regResponse = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/auth/register" -Body ($clientUser | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
    $token = $regResponse.token
    $userId = $regResponse.user.id
    Log "Succès! Compte créé. ID: $userId" "Green"
} catch {
    Log "Erreur inscription: $_" "Red"
    exit
}

# 2. Card Management
Section "2. GESTION DES CARTES"
Log "Récupération des cartes..." "Yellow"
$cardsResp = Invoke-Api "GET" "/api/client/cards" $token
$cards = $cardsResp.cards

if ($cards.Count -eq 0) {
    Log "Aucune carte trouvée. Le système devrait en créer une par défaut." "Red"
} else {
    $myCard = $cards[0]
    Log "Carte trouvée: $($myCard.masked_pan) ($($myCard.network) $($myCard.card_type))" "Green"
    Log "Solde initial: $($myCard.balance) $($myCard.currency)" "White"
}

# 3. Transaction Simulation
Section "3. SIMULATION PAIEMENT"
Log "Tentative de paiement de 50.00 EUR chez 'FNAC Paris'..." "Yellow"

$paymentBody = @{
    cardId = $myCard.id
    amount = 50.00
    merchantName = "FNAC Paris"
    merchantMcc = "5732"
    paymentType = "PURCHASE"
    use3DS = $true
}

try {
    $txnResp = Invoke-Api "POST" "/api/client/transactions/simulate" $token $paymentBody
    Log "Paiement APPROUVÉ!" "Green"
    Log "Auth Code: $($txnResp.transaction.authorization_code)" "White"
    Log "STAN: $($txnResp.transaction.stan)" "White"
} catch {
    Log "Échec du paiement." "Red"
}

# 4. Verify Transactions
Section "4. VÉRIFICATION HISTORIQUE"
Log "Consultation du relevé de compte..." "Yellow"
$history = Invoke-Api "GET" "/api/client/transactions" $token

$lastTxn = $history.transactions | Select-Object -First 1
if ($lastTxn) {
    Log "Dernière transaction: $($lastTxn.merchant_name) - $($lastTxn.amount) $($lastTxn.currency) [$($lastTxn.status)]" "Green"
} else {
    Log "Aucune transaction trouvée." "Red"
}

# 5. Dashboard
Section "5. DASHBOARD"
Log "Vérification du dashboard global..." "Yellow"
$dash = Invoke-Api "GET" "/api/client/dashboard" $token
Log "Cartes actives: $($dash.dashboard.cards.active)" "White"
Log "Dépenses aujourd'hui: $($dash.dashboard.today.totalSpent) EUR" "White"

Log ""
Log "PARCOURS CLIENT TERMINE AVEC SUCCES" "Cyan"
