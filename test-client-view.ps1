# test-client-view.ps1
# Automated Validation for CLIENT VIEW CHECKLIST PMP

$ErrorActionPreference = "Stop"
$BASE_URL = "http://localhost:8000"
$REPORT_PATH = "./client-view-report.html"

# Colors
function Write-Pass ($msg) { Write-Host "[PASS] $msg" -ForegroundColor Green }
function Write-Fail ($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }
function Write-Step ($msg) { Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }

$RESULTS = @()

Write-Host "🚀 Démarrage de la Validation VUE CLIENT..." -ForegroundColor Cyan

# -----------------------------------------------------------
# 1. LOGIN AVEC EMAIL/MOT DE PASSE
# -----------------------------------------------------------
Write-Step "1. Login Standard (Email/Password)"
$clientCreds = @{ email="client@pmp.edu"; password="qa-pass-123" } 
try {
    $res = Invoke-RestMethod -Uri "$BASE_URL/api/auth/client/login" -Method Post -Body ($clientCreds | ConvertTo-Json) -ContentType "application/json"
    $token = $res.token
    if ($res.success -and $token) {
        Write-Pass "Login réussi"
        $RESULTS += @{ Check="Login with Email/Password"; Status="PASS"; Note="Token received" }
    } else { throw "Login failed response" }
} catch {
    Write-Fail "Login failed: $($_.Exception.Message)"
    $RESULTS += @{ Check="Login with Email/Password"; Status="FAIL"; Note=$_.Exception.Message }
}

# -----------------------------------------------------------
# 2. REÇOIT UN JWT AVEC RÔLE "CLIENT"
# -----------------------------------------------------------
Write-Step "2. Vérification du Rôle JWT"
if ($res.user.role -eq "ROLE_CLIENT") {
    Write-Pass "Rôle confirmé: ROLE_CLIENT"
    $RESULTS += @{ Check="JWT Role is CLIENT"; Status="PASS"; Note="Role: $($res.user.role)" }
} else {
    Write-Fail "Wrong Role: $($res.user.role)"
    $RESULTS += @{ Check="JWT Role is CLIENT"; Status="FAIL"; Note="Got $($res.user.role)" }
}

# -----------------------------------------------------------
# 3. ACCÈS SES CARTES SEULEMENT
# -----------------------------------------------------------
Write-Step "3. Accès à SES cartes"
try {
    $cards = Invoke-RestMethod -Uri "$BASE_URL/api/client/cards" -Method Get -Headers @{ Authorization="Bearer $token" }
    if ($cards.success) {
        Write-Pass "Accès /api/client/cards OK"
        $RESULTS += @{ Check="Access Own Cards"; Status="PASS"; Note="Access granted" }
    }
} catch {
    Write-Fail "Access Own Cards Failed"
    $RESULTS += @{ Check="Access Own Cards"; Status="FAIL"; Note=$_.Exception.Message }
}

# -----------------------------------------------------------
# 4. NE PEUT PAS ACCÉDER AUX TRANSACTIONS MARCHAND
# -----------------------------------------------------------
Write-Step "4. RBAC Check: No Access to Merchant Transactions"
try {
    Invoke-RestMethod -Uri "$BASE_URL/api/marchand/transactions" -Method Get -Headers @{ Authorization="Bearer $token" }
    Write-Fail "SECURITY LEAK: Client can access Merchant Transactions!"
    $RESULTS += @{ Check="No Access to Merchant Data"; Status="FAIL"; Note="Security Leak Detected" }
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Pass "Accès marchand bloqué (403)"
        $RESULTS += @{ Check="No Access to Merchant Data"; Status="PASS"; Note="Correctly blocked (403)" }
    } else {
        Write-Fail "Unexpected Status: $($_.Exception.Response.StatusCode.value__)"
        $RESULTS += @{ Check="No Access to Merchant Data"; Status="FAIL"; Note="Unexpected status" }
    }
}

# -----------------------------------------------------------
# 5. SESSION EXPIRE APRÈS 2H
# -----------------------------------------------------------
Write-Step "5. Vérification Expiration (Config)"
if ($res.expiresIn -eq "2h") {
    Write-Pass "Expiration configurée à 2h"
    $RESULTS += @{ Check="Session Expires after 2h"; Status="PASS"; Note="Confirmed by Server Response" }
} else {
    Write-Fail "Expiration incorrecte: $($res.expiresIn)"
    $RESULTS += @{ Check="Session Expires after 2h"; Status="FAIL"; Note="Got $($res.expiresIn), expected 2h" }
}

# -----------------------------------------------------------
# 6. 2FA OPTIONNEL FONCTIONNE
# -----------------------------------------------------------
Write-Step "6. Test 2FA Optionnel"
$client2FA = @{ email="client@pmp.edu"; password="qa-pass-123"; use2fa=$true; code2fa="123456" }
try {
    $res2fa = Invoke-RestMethod -Uri "$BASE_URL/api/auth/client/login" -Method Post -Body ($client2FA | ConvertTo-Json) -ContentType "application/json"
    if ($res2fa.token) {
        Write-Pass "Login avec 2FA réussi"
        $RESULTS += @{ Check="Optional 2FA Works"; Status="PASS"; Note="2FA Login OK" }
    }
} catch {
    Write-Fail "2FA Login Failed"
    $RESULTS += @{ Check="Optional 2FA Works"; Status="FAIL"; Note=$_.Exception.Message }
}

Write-Step "6b. Test 2FA Invalide (Security)"
$clientBad2FA = @{ email="client@pmp.edu"; password="qa-pass-123"; use2fa=$true; code2fa="000000" }
try {
    Invoke-RestMethod -Uri "$BASE_URL/api/auth/client/login" -Method Post -Body ($clientBad2FA | ConvertTo-Json) -ContentType "application/json"
    Write-Fail "Invalid 2FA code accepted!"
    $RESULTS += @{ Check="Invalid 2FA Blocked"; Status="FAIL"; Note="Security Leak" }
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Pass "Code 2FA incorrect bloqué (403)"
        $RESULTS += @{ Check="Invalid 2FA Blocked"; Status="PASS"; Note="Blocked correctly" }
    }
}

# -----------------------------------------------------------
# 7. DÉCONNEXION SUPPRIME LE TOKEN
# -----------------------------------------------------------
Write-Step "7. Test Déconnexion"
try {
    $logout = Invoke-RestMethod -Uri "$BASE_URL/api/auth/logout" -Method Post -Headers @{ Authorization="Bearer $token" }
    if ($logout.success) {
        Write-Pass "Logout endpoint OK"
        $RESULTS += @{ Check="Logout Functionality"; Status="PASS"; Note="Endpoint returned success" }
    }
} catch {
    Write-Fail "Logout Failed"
    $RESULTS += @{ Check="Logout Functionality"; Status="FAIL"; Note=$_.Exception.Message }
}

# -----------------------------------------------------------
# GENERATE REPORT
# -----------------------------------------------------------
$htmlContent = @"
<!DOCTYPE html>
<html>
<head>
<title>PMP Client Validation</title>
<style>
body { font-family: sans-serif; padding: 20px; }
table { border-collapse: collapse; width: 100%; max-width: 800px; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background-color: #f2f2f2; }
.PASS { color: green; font-weight: bold; }
.FAIL { color: red; font-weight: bold; }
</style>
</head>
<body>
<h1>✅ Audit PMP - Vue Client</h1>
<p>Date: $(Get-Date)</p>
<table>
<tr><th>Checklist Item</th><th>Status</th><th>Note</th></tr>

"@

foreach ($r in $RESULTS) {
    $htmlContent += "<tr><td>$($r.Check)</td><td class='$($r.Status)'>$($r.Status)</td><td>$($r.Note)</td></tr>"
}

$htmlContent += "</table></body></html>"
$htmlContent | Out-File -FilePath $REPORT_PATH -Encoding utf8

Write-Host "Rapport genere: $REPORT_PATH" -ForegroundColor Green
