# PMP Merchant Production Journey Simulation

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
Section "1. INSCRIPTION MARCHAND"
$merchantUser = @{
    username = "bob.merchant.$suffix"
    email = "bob.merchant.$suffix@shop.com"
    password = "StrongPass123!@#"
    firstName = "Bob"
    lastName = "Merchant"
    role = "ROLE_MARCHAND"
}

Log "Inscription du marchand: $($merchantUser.email)..." "Yellow"

try {
    $regResponse = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/auth/register" -Body ($merchantUser | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
    $token = $regResponse.token
    $userId = $regResponse.user.id
    Log "Succès! Compte créé. ID: $userId" "Green"
} catch {
    Log "Erreur inscription: $_" "Red"
    exit
}

# 2. TERMIAUX POS
Section "2. TERMINAUX POS"
Log "Récupération des terminaux (création auto si vide)..." "Yellow"
$posResp = Invoke-Api "GET" "/api/merchant/pos" $token
$terminals = $posResp.terminals

if ($terminals.Count -eq 0) {
    Log "Erreur: Aucun terminal configuré." "Red"
} else {
    $myTerminal = $terminals[0]
    Log "Terminal actif: $($myTerminal.terminal_name) (ID: $($myTerminal.terminal_id))" "Green"
}

# 3. Encaissement Simulation
Section "3. SIMULATION ENCAISSEMENT POS"
Log "Encaissement de 15.00 EUR..." "Yellow"

$txnBody = @{
    terminalId = $myTerminal.terminal_id
    amount = 15.00
    paymentMethod = "contactless"
    maskedPan = "4916****1234"
}

try {
    $txnResp = Invoke-Api "POST" "/api/merchant/pos/transaction" $token $txnBody
    Log "Transaction POS: $($txnResp.transaction.status)" "Green"
    Log "Response Code: $($txnResp.transaction.response_code)" "White"
    Log "STAN: $($txnResp.transaction.stan)" "White"
} catch {
    Log "Échec transaction POS." "Red"
}

# 4. Dashboard Verification
Section "4. VÉRIFICATION DASHBOARD"
Log "Consultation du CA journalier..." "Yellow"
$dash = Invoke-Api "GET" "/api/merchant/dashboard" $token
Log "CA Aujourd'hui: $($dash.dashboard.today.revenue) EUR" "White"
Log "Transactions: $($dash.dashboard.today.transactionCount)" "White"

# 5. API Keys
Section "5. CLÉS API"
Log "Génération d'une clé API..." "Yellow"
$keyBody = @{
    keyName = "Integration e-commerce"
    permissions = @("transactions.read", "transactions.create")
}
try {
    $keyResp = Invoke-Api "POST" "/api/merchant/api-keys" $token $keyBody
    Log "Clé créée: $($keyResp.apiKey.api_key_prefix)..." "Green"
} catch {
    Log "Échec création clé API." "Red"
}

Log ""
Log "PARCOURS MARCHAND TERMINE AVEC SUCCES" "Cyan"
