# ==========================================================
# PMP QA - MULTI-PERSONA AUTH & RBAC TEST (Updated)
# ==========================================================

$ErrorActionPreference = "Stop"

$BASE_URL = "http://localhost:8000"
$REPORT_PATH = "./qa-auth-report.html"
$RESULTS = @()

function Write-Step ($msg) { Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }
function Write-Pass ($msg) { Write-Host "  [PASS] $msg" -ForegroundColor Green }
function Write-Fail ($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red }

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

Write-Step "Service health"
try {
    $health = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get -ErrorAction Stop
    Write-Pass "API Gateway online (status=$($health.status))"
    $RESULTS += @{ Test = "Health"; Status = "SUCCESS"; msg = "API Gateway online" }
} catch {
    Write-Fail "Cannot reach API Gateway ($BASE_URL)"
    $RESULTS += @{ Test = "Health"; Status = "FAILED"; msg = $_.Exception.Message }
    exit 1
}

$Personas = @(
    @{ Name = "Client"; Email = "client@pmp.edu"; Role = "ROLE_CLIENT"; Path = "/api/client/cards" },
    @{ Name = "Marchand"; Email = "bakery@pmp.edu"; Role = "ROLE_MARCHAND"; Path = "/api/merchant/dashboard" },
    @{ Name = "Etudiant"; Email = "student01@pmp.edu"; Role = "ROLE_ETUDIANT"; Path = "/api/progress" },
    @{ Name = "Formateur"; Email = "trainer@pmp.edu"; Role = "ROLE_FORMATEUR"; Path = "/api/progress/cohort" }
)

foreach ($p in $Personas) {
    Write-Step "Persona: $($p.Name)"

    $token = $null
    $loginRes = $null

    try {
        $loginBody = @{ email = $p.Email; password = "qa-pass-123" } | ConvertTo-Json
        $loginRes = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
        $token = Get-AuthToken $loginRes

        if (-not $token) {
            throw "Missing access token in login response"
        }

        if ($loginRes.user.role -eq $p.Role) {
            Write-Pass "Login OK (role=$($p.Role))"
            $RESULTS += @{ Test = "Login $($p.Name)"; Status = "SUCCESS"; msg = "Role OK" }
        } else {
            Write-Fail "Wrong role: $($loginRes.user.role)"
            $RESULTS += @{ Test = "Login $($p.Name)"; Status = "FAILED"; msg = "Wrong role: $($loginRes.user.role)" }
        }

        # Authorized access test
        $headers = @{ Authorization = "Bearer $token" }
        $accessRes = Invoke-RestMethod -Uri "$BASE_URL$($p.Path)" -Method Get -Headers $headers
        Write-Pass "Access OK: $($p.Path)"
        $RESULTS += @{ Test = "Access $($p.Name)"; Status = "SUCCESS"; msg = "Access OK" }

        # RBAC leak test: non-trainers must not access cohort analytics
        if ($p.Role -ne "ROLE_FORMATEUR") {
            try {
                Invoke-RestMethod -Uri "$BASE_URL/api/progress/cohort" -Method Get -Headers $headers | Out-Null
                Write-Fail "RBAC leak: non-trainer accessed /api/progress/cohort"
                $RESULTS += @{ Test = "RBAC Leak ($($p.Name))"; Status = "CRITICAL"; msg = "Access granted to /api/progress/cohort" }
            } catch {
                $status = $_.Exception.Response.StatusCode.value__
                if ($status -eq 403) {
                    Write-Pass "RBAC OK (403 on /api/progress/cohort)"
                    $RESULTS += @{ Test = "RBAC Leak ($($p.Name))"; Status = "SUCCESS"; msg = "Blocked (403)" }
                } else {
                    $body = Read-ErrorBody $_
                    Write-Fail "Unexpected status on RBAC check: $status"
                    $RESULTS += @{ Test = "RBAC Leak ($($p.Name))"; Status = "FAILED"; msg = "Unexpected status: $status $body" }
                }
            }
        }
    } catch {
        Write-Fail "Persona test failed: $($_.Exception.Message)"
        $RESULTS += @{ Test = "$($p.Name) Suite"; Status = "FAILED"; msg = $_.Exception.Message }
    }
}

Write-Step "Expired token blocked"
try {
    $expiredBody = @{ userId = "client_test"; role = "ROLE_CLIENT"; expired = $true } | ConvertTo-Json
    $tokenRes = Invoke-RestMethod -Uri "$BASE_URL/api/auth/token" -Method Post -Body $expiredBody -ContentType "application/json"
    $expiredToken = $tokenRes.token

    Invoke-RestMethod -Uri "$BASE_URL/api/client/cards" -Method Get -Headers @{ Authorization = "Bearer $expiredToken" } | Out-Null
    Write-Fail "SECURITY LEAK: expired token accepted"
    $RESULTS += @{ Test = "Expired Token"; Status = "FAILED"; msg = "Expired token accepted" }
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 401) {
        Write-Pass "Expired token rejected (401)"
        $RESULTS += @{ Test = "Expired Token"; Status = "SUCCESS"; msg = "Rejected (401)" }
    } else {
        $body = Read-ErrorBody $_
        Write-Fail "Unexpected status: $status"
        $RESULTS += @{ Test = "Expired Token"; Status = "FAILED"; msg = "Unexpected status: $status $body" }
    }
}

Write-Step "Generate HTML report"
$htmlRows = ""
foreach ($r in $RESULTS) {
    $color = if ($r.Status -eq "SUCCESS") { "green" } elseif ($r.Status -eq "CRITICAL") { "darkred" } else { "red" }
    $htmlRows += "<tr><td>$($r.Test)</td><td style='color:$color;font-weight:bold'>$($r.Status)</td><td>$($r.msg)</td></tr>"
}

$HtmlTemplate = @"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PMP QA - Auth Report</title>
  <style>
    body { font-family: sans-serif; padding: 24px; }
    table { border-collapse: collapse; width: 100%; max-width: 1200px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>PMP QA - Multi-Persona Auth & RBAC</h1>
  <p>Date: $(Get-Date)</p>
  <table>
    <tr><th>Test</th><th>Status</th><th>Notes</th></tr>
    $htmlRows
  </table>
</body>
</html>
"@

$HtmlTemplate | Out-File -FilePath $REPORT_PATH -Encoding utf8
Write-Pass "Report generated: $REPORT_PATH"

