# test-student-view.ps1
# Automated Validation for STUDENT VIEW CHECKLIST PMP

$ErrorActionPreference = "Stop"
$BASE_URL = "http://localhost:8000"
$REPORT_PATH = "./student-view-report.html"

# Colors
function Write-Pass ($msg) { Write-Host "[PASS] $msg" -ForegroundColor Green }
function Write-Fail ($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }
function Write-Step ($msg) { Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }

$RESULTS = @()

Write-Host "🚀 Démarrage de la Validation VUE ÉTUDIANT..." -ForegroundColor Cyan

# -----------------------------------------------------------
# 1. LOGIN AVEC ID PÉDAGOGIQUE (USERNAME/EMAIL)
# -----------------------------------------------------------
Write-Step "1. Login (Email Pédagogique)"
$studentCreds = @{ email="student01@pmp.edu"; password="qa-pass-123" } 
try {
    $res = Invoke-RestMethod -Uri "$BASE_URL/api/auth/etudiant/login" -Method Post -Body ($studentCreds | ConvertTo-Json) -ContentType "application/json"
    $token = $res.token
    if ($res.success -and $token) {
        Write-Pass "Login étudiant réussi"
        $RESULTS += @{ Check="Login with ID"; Status="PASS"; Note="Token received" }
    } else { throw "Login failed response" }
} catch {
    Write-Fail "Login failed: $($_.Exception.Message)"
    $RESULTS += @{ Check="Login with ID"; Status="FAIL"; Note=$_.Exception.Message }
}

# -----------------------------------------------------------
# 2. ACCÈS AUX ATELIERS SEULEMENT
# -----------------------------------------------------------
Write-Step "2. Vérification Accès Ateliers (Progression)"
try {
    $prog = Invoke-RestMethod -Uri "$BASE_URL/api/etudiant/progression" -Method Get -Headers @{ Authorization="Bearer $token" }
    if ($prog.success) {
        Write-Pass "Accès Ateliers OK"
        $RESULTS += @{ Check="Access Workshops"; Status="PASS"; Note="Access granted" }
    }
} catch {
    Write-Fail "Access Workshops Failed"
    $RESULTS += @{ Check="Access Workshops"; Status="FAIL"; Note=$_.Exception.Message }
}

# -----------------------------------------------------------
# 3. PROGRESSION SAUVEGARDÉE
# -----------------------------------------------------------
Write-Step "3. Sauvegarde Progression"
try {
    $save = Invoke-RestMethod -Uri "$BASE_URL/api/etudiant/progression/save" -Method Post -Headers @{ Authorization="Bearer $token" }
    if ($save.success) {
        Write-Pass "Progression sauvegardée avec succès"
        $RESULTS += @{ Check="Save Progression"; Status="PASS"; Note="Endpoint OK" }
    }
} catch {
    Write-Fail "Save Progression Failed"
    $RESULTS += @{ Check="Save Progression"; Status="FAIL"; Note=$_.Exception.Message }
}

# -----------------------------------------------------------
# 4. NE PEUT PAS ACCÉDER AU MONITORING (FORMATEUR)
# -----------------------------------------------------------
Write-Step "4. RBAC Check: No Access to Monitoring"
try {
    Invoke-RestMethod -Uri "$BASE_URL/api/formateur/sessions-actives" -Method Get -Headers @{ Authorization="Bearer $token" }
    Write-Fail "SECURITY LEAK: Student can access Monitoring!"
    $RESULTS += @{ Check="No Access to Monitoring"; Status="FAIL"; Note="Security Leak Detected" }
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Pass "Accès monitoring bloqué (403)"
        $RESULTS += @{ Check="No Access to Monitoring"; Status="PASS"; Note="Correctly blocked (403)" }
    } else {
        Write-Fail "Unexpected Status: $($_.Exception.Response.StatusCode.value__)"
        $RESULTS += @{ Check="No Access to Monitoring"; Status="FAIL"; Note="Unexpected status" }
    }
}

# -----------------------------------------------------------
# 5. QUIZ ET EXERCICES ACCESSIBLES
# -----------------------------------------------------------
Write-Step "5. Accès Quiz & Exercices"
try {
    $quiz = Invoke-RestMethod -Uri "$BASE_URL/api/etudiant/quiz" -Method Get -Headers @{ Authorization="Bearer $token" }
    $ex = Invoke-RestMethod -Uri "$BASE_URL/api/etudiant/exercises" -Method Get -Headers @{ Authorization="Bearer $token" }
    
    if ($quiz.success -and $ex.success) {
        Write-Pass "Quiz et Exercices accessibles"
        $RESULTS += @{ Check="Access Quiz & Exercises"; Status="PASS"; Note="Endpoints returned 200 OK" }
    }
} catch {
    Write-Fail "Access Quiz/Exercises Failed"
    $RESULTS += @{ Check="Access Quiz & Exercises"; Status="FAIL"; Note=$_.Exception.Message }
}

# -----------------------------------------------------------
# 6. DOCUMENTATION PÉDAGOGIQUE DISPONIBLE
# -----------------------------------------------------------
Write-Step "6. Accès Documentation"
try {
    $docs = Invoke-RestMethod -Uri "$BASE_URL/api/etudiant/docs" -Method Get -Headers @{ Authorization="Bearer $token" }
    if ($docs.success) {
        Write-Pass "Documentation accessible"
        $RESULTS += @{ Check="Access Documentation"; Status="PASS"; Note="Docs found" }
    }
} catch {
    Write-Fail "Access Documentation Failed"
    $RESULTS += @{ Check="Access Documentation"; Status="FAIL"; Note=$_.Exception.Message }
}

# -----------------------------------------------------------
# GENERATE REPORT
# -----------------------------------------------------------
$htmlContent = @"
<!DOCTYPE html>
<html>
<head>
<title>PMP Student Validation</title>
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
<h1>✅ Audit PMP - Vue Étudiant</h1>
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
