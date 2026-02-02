# test-merchant-view.ps1
# Automated Validation for MERCHANT VIEW CHECKLIST PMP

$ErrorActionPreference = "Stop"
$BASE_URL = "http://localhost:8000"
$REPORT_PATH = "./merchant-view-report.html"

# Colors
function Write-Pass ($msg) { Write-Host "[PASS] $msg" -ForegroundColor Green }
function Write-Fail ($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }
function Write-Step ($msg) { Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }

$RESULTS = @()

Write-Host "🚀 Démarrage de la Validation VUE MARCHAND..." -ForegroundColor Cyan

# -----------------------------------------------------------
# 1. LOGIN AVEC CERTIFICAT SIMULÉ
# -----------------------------------------------------------
Write-Step "1. Login avec Certificat"
$validCreds = @{ email="bakery@pmp.edu"; password="qa-pass-123"; certificate="SIMULATED_CERT_001" } 
try {
    $res = Invoke-RestMethod -Uri "$BASE_URL/api/auth/marchand/login" -Method Post -Body ($validCreds | ConvertTo-Json) -ContentType "application/json"
    $token = $res.token
    if ($res.success -and $token) {
        Write-Pass "Login avec certificat réussi"
        $RESULTS += @{ Check="Login with Certificate"; Status="PASS"; Note="Token received" }
    } else { throw "Login failed response" }
} catch {
    Write-Fail "Login with Certificate failed: $($_.Exception.Message)"
    $RESULTS += @{ Check="Login with Certificate"; Status="FAIL"; Note=$_.Exception.Message }
}

Write-Step "1b. Login SANS Certificat (Security)"
$noCertCreds = @{ email="bakery@pmp.edu"; password="qa-pass-123" } 
try {
    Invoke-RestMethod -Uri "$BASE_URL/api/auth/marchand/login" -Method Post -Body ($noCertCreds | ConvertTo-Json) -ContentType "application/json"
    Write-Fail "Login without certificate should fail!"
    $RESULTS += @{ Check="Block No-Cert Login"; Status="FAIL"; Note="Security Leak" }
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Pass "Login sans certificat bloqué (403)"
        $RESULTS += @{ Check="Block No-Cert Login"; Status="PASS"; Note="Correctly blocked" }
    }
}

# -----------------------------------------------------------
# 2. SESSION COURTE (15MIN)
# -----------------------------------------------------------
Write-Step "2. Vérification Expiration (Config)"
if ($res.expiresIn -eq "15m") {
    Write-Pass "Expiration configurée à 15m"
    $RESULTS += @{ Check="Short Session (15m)"; Status="PASS"; Note="Confirmed by Server Response" }
} else {
    Write-Fail "Expiration incorrecte: $($res.expiresIn)"
    $RESULTS += @{ Check="Short Session (15m)"; Status="FAIL"; Note="Got $($res.expiresIn), expected 15m" }
}

# -----------------------------------------------------------
# 3. PEUT VOIR SES TRANSACTIONS
# -----------------------------------------------------------
Write-Step "3. Accès Transactions Marchand"
try {
    Invoke-RestMethod -Uri "$BASE_URL/api/marchand/transactions" -Method Get -Headers @{ Authorization="Bearer $token" }
    Write-Pass "Accès Transactions OK"
    $RESULTS += @{ Check="Access Own Transactions"; Status="PASS"; Note="Access granted" }
} catch {
    Write-Fail "Access Transactions Failed"
    $RESULTS += @{ Check="Access Own Transactions"; Status="FAIL"; Note=$_.Exception.Message }
}

# -----------------------------------------------------------
# 4. PEUT GÉNÉRER DES RAPPORTS JOURNALIERS
# -----------------------------------------------------------
Write-Step "4. Génération Rapport Journalier"
try {
    $report = Invoke-RestMethod -Uri "$BASE_URL/api/marchand/reports/daily" -Method Get -Headers @{ Authorization="Bearer $token" }
    if ($report.success) {
        Write-Pass "Rapport généré (Date: $($report.report.date))"
        $RESULTS += @{ Check="Generate Daily Report"; Status="PASS"; Note="Report generated successfully" }
    }
} catch {
    Write-Fail "Generate Report Failed"
    $RESULTS += @{ Check="Generate Daily Report"; Status="FAIL"; Note=$_.Exception.Message }
}

# -----------------------------------------------------------
# 5. NE PEUT PAS ACCÉDER AUX CARTES CLIENTS
# -----------------------------------------------------------
Write-Step "5. RBAC Check: No Access to Client Cards"
try {
    Invoke-RestMethod -Uri "$BASE_URL/api/client/cards" -Method Get -Headers @{ Authorization="Bearer $token" }
    Write-Fail "SECURITY LEAK: Merchant can access Client Cards!"
    $RESULTS += @{ Check="No Access to Client Data"; Status="FAIL"; Note="Security Leak Detected" }
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Pass "Accès cartes client bloqué (403)"
        $RESULTS += @{ Check="No Access to Client Data"; Status="PASS"; Note="Correctly blocked (403)" }
    } else {
        Write-Fail "Unexpected Status: $($_.Exception.Response.StatusCode.value__)"
        $RESULTS += @{ Check="No Access to Client Data"; Status="FAIL"; Note="Unexpected status" }
    }
}

# -----------------------------------------------------------
# 6. RECONNEXION NÉCESSAIRE APRÈS EXPIRATION
# -----------------------------------------------------------
Write-Step "6. Test Token Expiré (Force Re-Login)"
$expiredBody = @{ userId="marchand_boulangerie"; role="ROLE_MARCHAND"; expired=$true } | ConvertTo-Json
$expiredToken = (Invoke-RestMethod -Uri "$BASE_URL/api/auth/token" -Method Post -Body $expiredBody -ContentType "application/json").token

try {
    Invoke-RestMethod -Uri "$BASE_URL/api/marchand/transactions" -Method Get -Headers @{ Authorization="Bearer $expiredToken" }
    Write-Fail "Expired token still working!"
    $RESULTS += @{ Check="Force Re-Login on Expiry"; Status="FAIL"; Note="Expired token accepted" }
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Pass "Token expiré rejeté (401)"
        $RESULTS += @{ Check="Force Re-Login on Expiry"; Status="PASS"; Note="Re-login enforced" }
    }
}

# -----------------------------------------------------------
# GENERATE REPORT
# -----------------------------------------------------------
$htmlContent = @"
<!DOCTYPE html>
<html>
<head>
<title>PMP Merchant Validation</title>
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
<h1>✅ Audit PMP - Vue Marchand</h1>
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
