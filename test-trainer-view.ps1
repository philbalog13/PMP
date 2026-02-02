# test-trainer-view.ps1
# Automated Validation for TRAINER (FORMATEUR) VIEW CHECKLIST PMP

$ErrorActionPreference = "Stop"
$BASE_URL = "http://localhost:8000"
$REPORT_PATH = "./trainer-view-report.html"

# Colors
function Write-Pass ($msg) { Write-Host "[PASS] $msg" -ForegroundColor Green }
function Write-Fail ($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }
function Write-Step ($msg) { Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }

$RESULTS = @()

Write-Host "🚀 Démarrage de la Validation VUE FORMATEUR..." -ForegroundColor Cyan

# -----------------------------------------------------------
# 1. 2FA OBLIGATOIRE FONCTIONNE
# -----------------------------------------------------------
Write-Step "1. Test 2FA Obligatoire"
$credsNo2FA = @{ email="trainer@pmp.edu"; password="qa-pass-123" } 
try {
    Invoke-RestMethod -Uri "$BASE_URL/api/auth/formateur/login" -Method Post -Body ($credsNo2FA | ConvertTo-Json) -ContentType "application/json"
    Write-Fail "SECURITY LEAK: Trainer login without 2FA succeeded!"
    $RESULTS += @{ Check="Mandatory 2FA"; Status="FAIL"; Note="Security Leak (Missing 2FA)" }
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Pass "Login sans 2FA bloqué (403)"
        $RESULTS += @{ Check="Mandatory 2FA"; Status="PASS"; Note="Correctly blocked (403)" }
    } else {
        Write-Fail "Unexpected Status: $($_.Exception.Response.StatusCode.value__)"
        $RESULTS += @{ Check="Mandatory 2FA"; Status="FAIL"; Note="Unexpected status" }
    }
}

Write-Step "1b. Login avec 2FA Correct"
$credsWith2FA = @{ email="trainer@pmp.edu"; password="qa-pass-123"; use2fa=$true; code2fa="ADMIN_SECRET" }
try {
    $res = Invoke-RestMethod -Uri "$BASE_URL/api/auth/formateur/login" -Method Post -Body ($credsWith2FA | ConvertTo-Json) -ContentType "application/json"
    $token = $res.token
    if ($res.success -and $token) {
        Write-Pass "Login avec 2FA Admin réussi"
        $RESULTS += @{ Check="Admin Login Success"; Status="PASS"; Note="Token received" }
    } else { throw "Login failed" }
} catch {
    Write-Fail "Login with 2FA failed: $($_.Exception.Message)"
    $RESULTS += @{ Check="Admin Login Success"; Status="FAIL"; Note=$_.Exception.Message }
}

# -----------------------------------------------------------
# 2. ACCÈS COMPLET À TOUTES LES DONNÉES
# -----------------------------------------------------------
Write-Step "2. Vérification Accès Global (Sessions)"
try {
    $sessions = Invoke-RestMethod -Uri "$BASE_URL/api/formateur/sessions-actives" -Method Get -Headers @{ Authorization="Bearer $token" }
    if ($sessions.success) {
        Write-Pass "Accès Sessions Actives OK"
        $RESULTS += @{ Check="Global Access"; Status="PASS"; Note="Access granted" }
    }
} catch {
    Write-Fail "Access Sessions Failed"
    $RESULTS += @{ Check="Global Access"; Status="FAIL"; Note=$_.Exception.Message }
}

# -----------------------------------------------------------
# 3. PEUT CRÉER/MODIFIER DES EXERCICES
# -----------------------------------------------------------
Write-Step "3. Gestion Exercices"
try {
    Invoke-RestMethod -Uri "$BASE_URL/api/formateur/exercises" -Method Get -Headers @{ Authorization="Bearer $token" }
    Invoke-RestMethod -Uri "$BASE_URL/api/formateur/exercises" -Method Post -Headers @{ Authorization="Bearer $token" }
    Write-Pass "Lecture/Création Exercices OK"
    $RESULTS += @{ Check="Manage Exercises"; Status="PASS"; Note="CRUD Operations OK" }
} catch {
    Write-Fail "Manage Exercises Failed"
    $RESULTS += @{ Check="Manage Exercises"; Status="FAIL"; Note=$_.Exception.Message }
}

# -----------------------------------------------------------
# 4. VOIR LES LOGS DE SÉCURITÉ
# -----------------------------------------------------------
Write-Step "4. Accès Logs Sécurité"
try {
    $logs = Invoke-RestMethod -Uri "$BASE_URL/api/admin/logs" -Method Get -Headers @{ Authorization="Bearer $token" }
    if ($logs.success) {
        Write-Pass "Logs de sécurité accessibles"
        $RESULTS += @{ Check="View Security Logs"; Status="PASS"; Note="Logs accessed" }
    }
} catch {
    Write-Fail "Access Logs Failed"
    $RESULTS += @{ Check="View Security Logs"; Status="FAIL"; Note=$_.Exception.Message }
}

# -----------------------------------------------------------
# 5. GÉRER LES UTILISATEURS
# -----------------------------------------------------------
Write-Step "5. Gestion Utilisateurs"
try {
    $users = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users" -Method Get -Headers @{ Authorization="Bearer $token" }
    if ($users.success) {
        Write-Pass "Liste utilisateurs accessible"
        $RESULTS += @{ Check="Manage Users"; Status="PASS"; Note="Users list retrieved" }
    }
} catch {
    Write-Fail "Access Users Failed"
    $RESULTS += @{ Check="Manage Users"; Status="FAIL"; Note=$_.Exception.Message }
}

# -----------------------------------------------------------
# 6. SESSION ADMIN SÉCURISÉE (1H MAX)
# -----------------------------------------------------------
Write-Step "6. Vérification Expiration Admin (1h)"
if ($res.expiresIn -eq "1h") {
    Write-Pass "Expiration Admin configurée à 1h"
    $RESULTS += @{ Check="Secure Session (1h)"; Status="PASS"; Note="Confirmed by Server Response" }
} else {
    Write-Fail "Expiration incorrecte: $($res.expiresIn)"
    $RESULTS += @{ Check="Secure Session (1h)"; Status="FAIL"; Note="Got $($res.expiresIn), expected 1h" }
}

# -----------------------------------------------------------
# GENERATE REPORT
# -----------------------------------------------------------
$htmlContent = @"
<!DOCTYPE html>
<html>
<head>
<title>PMP Trainer Validation</title>
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
<h1>✅ Audit PMP - Vue Formateur</h1>
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
