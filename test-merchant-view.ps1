# test-merchant-view.ps1
# Validation for MERCHANT (MARCHAND) view (API gateway).

$ErrorActionPreference = "Stop"

$BASE_URL = "http://localhost:8000"
$REPORT_PATH = "./merchant-view-report.html"

function Write-Pass ($msg) { Write-Host "[PASS] $msg" -ForegroundColor Green }
function Write-Fail ($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }
function Write-Step ($msg) { Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }

$RESULTS = @()

function Get-AuthToken($AuthResponse) {
    if ($null -eq $AuthResponse) { return $null }
    if ($AuthResponse.accessToken) { return $AuthResponse.accessToken }
    if ($AuthResponse.token) { return $AuthResponse.token }
    return $null
}

function Read-ErrorBody($ErrorRecord) {
    try {
        $stream = $ErrorRecord.Exception.Response.GetResponseStream()
        $reader = New-Object IO.StreamReader $stream
        return $reader.ReadToEnd()
    } catch {
        return ""
    }
}

Write-Host "Starting MERCHANT view validation..." -ForegroundColor Cyan

# -----------------------------------------------------------
# 1. LOGIN (SEEDED MERCHANT)
# -----------------------------------------------------------
Write-Step "1. Login (Seeded Merchant)"
$merchantCreds = @{ email = "bakery@pmp.edu"; password = "qa-pass-123" }
$res = $null
$token = $null

try {
    $res = Invoke-RestMethod -Uri "$BASE_URL/api/auth/marchand/login" -Method Post -Body ($merchantCreds | ConvertTo-Json) -ContentType "application/json"
    $token = Get-AuthToken $res

    if ($res.success -and $token) {
        Write-Pass "Login succeeded"
        $RESULTS += @{ Check = "Login"; Status = "PASS"; Note = "Access token received" }
    } else {
        throw "Login response missing token"
    }
} catch {
    Write-Fail "Login failed: $($_.Exception.Message)"
    $RESULTS += @{ Check = "Login"; Status = "FAIL"; Note = $_.Exception.Message }
}

# -----------------------------------------------------------
# 2. WRONG PASSWORD MUST FAIL (AUTHN SANITY)
# -----------------------------------------------------------
Write-Step "2. Wrong Password Must Fail"
try {
    $badCreds = @{ email = "bakery@pmp.edu"; password = "wrong-pass" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$BASE_URL/api/auth/marchand/login" -Method Post -Body $badCreds -ContentType "application/json" | Out-Null
    Write-Fail "SECURITY LEAK: Wrong password accepted"
    $RESULTS += @{ Check = "Wrong Password Rejected"; Status = "FAIL"; Note = "Wrong password accepted" }
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 401) {
        Write-Pass "Wrong password rejected (401)"
        $RESULTS += @{ Check = "Wrong Password Rejected"; Status = "PASS"; Note = "Rejected (401)" }
    } else {
        $body = Read-ErrorBody $_
        Write-Fail "Unexpected status: $status"
        $RESULTS += @{ Check = "Wrong Password Rejected"; Status = "FAIL"; Note = "Unexpected status: $status $body" }
    }
}

# -----------------------------------------------------------
# 3. TOKEN EXPIRATION (CONFIG)
# -----------------------------------------------------------
Write-Step "3. Token Expiration Config"
if ($res -and $res.expiresIn -eq "15m") {
    Write-Pass "expiresIn=15m"
    $RESULTS += @{ Check = "Token TTL"; Status = "PASS"; Note = "15m" }
} else {
    $got = if ($res) { $res.expiresIn } else { "<missing>" }
    Write-Fail "Unexpected expiresIn: $got"
    $RESULTS += @{ Check = "Token TTL"; Status = "FAIL"; Note = "Got: $got, expected: 15m" }
}

# -----------------------------------------------------------
# 4. ACCESS OWN TRANSACTIONS
# -----------------------------------------------------------
Write-Step "4. Access Own Transactions"
try {
    $tx = Invoke-RestMethod -Uri "$BASE_URL/api/merchant/transactions" -Method Get -Headers @{ Authorization = "Bearer $token" }
    if ($tx.success -eq $true) {
        Write-Pass "Access /api/merchant/transactions OK"
        $RESULTS += @{ Check = "Access Own Transactions"; Status = "PASS"; Note = "OK" }
    } else {
        throw "transactions.success=false"
    }
} catch {
    Write-Fail "Access transactions failed: $($_.Exception.Message)"
    $RESULTS += @{ Check = "Access Own Transactions"; Status = "FAIL"; Note = $_.Exception.Message }
}

# -----------------------------------------------------------
# 5. DAILY REPORT
# -----------------------------------------------------------
Write-Step "5. Generate Daily Report"
try {
    $report = Invoke-RestMethod -Uri "$BASE_URL/api/merchant/reports/daily" -Method Get -Headers @{ Authorization = "Bearer $token" }
    if ($report.success -eq $true) {
        Write-Pass "Daily report OK"
        $RESULTS += @{ Check = "Daily Report"; Status = "PASS"; Note = "OK" }
    } else {
        throw "report.success=false"
    }
} catch {
    Write-Fail "Daily report failed: $($_.Exception.Message)"
    $RESULTS += @{ Check = "Daily Report"; Status = "FAIL"; Note = $_.Exception.Message }
}

# -----------------------------------------------------------
# 6. RBAC: MERCHANT MUST NOT ACCESS CLIENT ROUTES
# -----------------------------------------------------------
Write-Step "6. RBAC: Block Client Cards"
try {
    Invoke-RestMethod -Uri "$BASE_URL/api/client/cards" -Method Get -Headers @{ Authorization = "Bearer $token" } | Out-Null
    Write-Fail "SECURITY LEAK: Merchant accessed /api/client/cards"
    $RESULTS += @{ Check = "RBAC Client Isolation"; Status = "FAIL"; Note = "Merchant accessed client endpoint" }
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403) {
        Write-Pass "Blocked correctly (403)"
        $RESULTS += @{ Check = "RBAC Client Isolation"; Status = "PASS"; Note = "Blocked (403)" }
    } else {
        $body = Read-ErrorBody $_
        Write-Fail "Unexpected status: $status"
        $RESULTS += @{ Check = "RBAC Client Isolation"; Status = "FAIL"; Note = "Unexpected status: $status $body" }
    }
}

# -----------------------------------------------------------
# 7. EXPIRED TOKEN MUST BE REJECTED
# -----------------------------------------------------------
Write-Step "7. Expired Token Rejected"
try {
    $expiredBody = @{ userId = "merchant_test"; role = "ROLE_MARCHAND"; expired = $true } | ConvertTo-Json
    $tokenRes = Invoke-RestMethod -Uri "$BASE_URL/api/auth/token" -Method Post -Body $expiredBody -ContentType "application/json"
    $expiredToken = $tokenRes.token

    Invoke-RestMethod -Uri "$BASE_URL/api/merchant/transactions" -Method Get -Headers @{ Authorization = "Bearer $expiredToken" } | Out-Null
    Write-Fail "SECURITY LEAK: Expired token accepted"
    $RESULTS += @{ Check = "Expired Token Blocked"; Status = "FAIL"; Note = "Expired token accepted" }
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 401) {
        Write-Pass "Expired token blocked (401)"
        $RESULTS += @{ Check = "Expired Token Blocked"; Status = "PASS"; Note = "Blocked (401)" }
    } else {
        $body = Read-ErrorBody $_
        Write-Fail "Unexpected status: $status"
        $RESULTS += @{ Check = "Expired Token Blocked"; Status = "FAIL"; Note = "Unexpected status: $status $body" }
    }
}

# -----------------------------------------------------------
# REPORT
# -----------------------------------------------------------
$htmlContent = @"
<!DOCTYPE html>
<html>
<head>
<title>PMP Merchant Validation</title>
<style>
body { font-family: sans-serif; padding: 20px; }
table { border-collapse: collapse; width: 100%; max-width: 1000px; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background-color: #f2f2f2; }
.PASS { color: green; font-weight: bold; }
.FAIL { color: red; font-weight: bold; }
</style>
</head>
<body>
<h1>PMP - Merchant View Validation</h1>
<p>Date: $(Get-Date)</p>
<table>
<tr><th>Checklist Item</th><th>Status</th><th>Note</th></tr>
"@

foreach ($r in $RESULTS) {
    $htmlContent += "<tr><td>$($r.Check)</td><td class='$($r.Status)'>$($r.Status)</td><td>$($r.Note)</td></tr>"
}

$htmlContent += "</table></body></html>"
$htmlContent | Out-File -FilePath $REPORT_PATH -Encoding utf8

Write-Host "Report generated: $REPORT_PATH" -ForegroundColor Green

