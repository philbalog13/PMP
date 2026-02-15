# test-trainer-view.ps1
# Validation for TRAINER (FORMATEUR) view (API gateway).

$ErrorActionPreference = "Stop"

$BASE_URL = "http://localhost:8000"
$REPORT_PATH = "./trainer-view-report.html"

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

function Convert-Base32ToBytes([string]$Base32) {
    $alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
    $clean = ($Base32.ToUpper() -replace "[^A-Z2-7]", "")

    $buffer = 0
    $bitsLeft = 0
    $bytes = New-Object System.Collections.Generic.List[byte]

    foreach ($ch in $clean.ToCharArray()) {
        $val = $alphabet.IndexOf($ch)
        if ($val -lt 0) { continue }

        $buffer = ($buffer -shl 5) -bor $val
        $bitsLeft += 5

        while ($bitsLeft -ge 8) {
            $bitsLeft -= 8
            $byteVal = ($buffer -shr $bitsLeft) -band 0xFF
            $bytes.Add([byte]$byteVal) | Out-Null
        }
    }

    return $bytes.ToArray()
}

function Get-TotpCode([string]$SecretBase32, [int]$Digits = 6, [int]$Period = 30) {
    $key = Convert-Base32ToBytes $SecretBase32
    $unixTime = [int][Math]::Floor(([DateTimeOffset]::UtcNow.ToUnixTimeSeconds()))
    $counter = [Int64][Math]::Floor($unixTime / $Period)

    $msg = New-Object byte[] 8
    for ($i = 7; $i -ge 0; $i--) {
        $msg[$i] = [byte]($counter -band 0xFF)
        $counter = $counter -shr 8
    }

    $hmac = New-Object System.Security.Cryptography.HMACSHA1 -ArgumentList (, $key)
    $hash = $hmac.ComputeHash($msg)

    $offset = $hash[$hash.Length - 1] -band 0x0F
    $binary = (($hash[$offset] -band 0x7F) -shl 24) -bor (($hash[$offset + 1] -band 0xFF) -shl 16) -bor (($hash[$offset + 2] -band 0xFF) -shl 8) -bor ($hash[$offset + 3] -band 0xFF)

    $mod = [int][Math]::Pow(10, $Digits)
    $otp = $binary % $mod

    return $otp.ToString().PadLeft($Digits, '0')
}

Write-Host "Starting TRAINER view validation..." -ForegroundColor Cyan

# -----------------------------------------------------------
# 1. LOGIN (SEEDED TRAINER)
# -----------------------------------------------------------
Write-Step "1. Login (Seeded Trainer)"
$trainerCreds = @{ email = "trainer@pmp.edu"; password = "qa-pass-123" }
$res = $null
$token = $null

try {
    $res = Invoke-RestMethod -Uri "$BASE_URL/api/auth/formateur/login" -Method Post -Body ($trainerCreds | ConvertTo-Json) -ContentType "application/json"
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

Write-Step "1b. JWT Role Check"
if ($res -and $res.user -and $res.user.role -eq "ROLE_FORMATEUR") {
    Write-Pass "Role confirmed: ROLE_FORMATEUR"
    $RESULTS += @{ Check = "JWT Role"; Status = "PASS"; Note = "ROLE_FORMATEUR" }
} else {
    $got = if ($res -and $res.user) { $res.user.role } else { "<missing>" }
    Write-Fail "Wrong role: $got"
    $RESULTS += @{ Check = "JWT Role"; Status = "FAIL"; Note = "Got: $got" }
}

# -----------------------------------------------------------
# 2. COHORT ANALYTICS
# -----------------------------------------------------------
Write-Step "2. Cohort Analytics"
try {
    $cohort = Invoke-RestMethod -Uri "$BASE_URL/api/progress/cohort" -Method Get -Headers @{ Authorization = "Bearer $token" }
    if ($cohort.success -eq $true) {
        Write-Pass "Access /api/progress/cohort OK"
        $RESULTS += @{ Check = "Cohort Analytics"; Status = "PASS"; Note = "OK" }
    } else {
        throw "cohort.success=false"
    }
} catch {
    Write-Fail "Cohort analytics failed: $($_.Exception.Message)"
    $RESULTS += @{ Check = "Cohort Analytics"; Status = "FAIL"; Note = $_.Exception.Message }
}

# -----------------------------------------------------------
# 3. LIST STUDENTS + VIEW ONE STUDENT PROGRESS
# -----------------------------------------------------------
Write-Step "3. Students List + Student Progress"
$studentId = $null
try {
    $students = Invoke-RestMethod -Uri "$BASE_URL/api/users/students" -Method Get -Headers @{ Authorization = "Bearer $token" }
    if ($students.success -eq $true -and $students.students -and $students.students.Count -gt 0) {
        $studentId = $students.students[0].id
        Write-Pass "Students list OK (count=$($students.students.Count))"
        $RESULTS += @{ Check = "List Students"; Status = "PASS"; Note = "Count=$($students.students.Count)" }
    } else {
        throw "students list empty or success=false"
    }

    $progress = Invoke-RestMethod -Uri "$BASE_URL/api/progress/student/$studentId" -Method Get -Headers @{ Authorization = "Bearer $token" }
    if ($progress.success -eq $true) {
        Write-Pass "Student progress OK"
        $RESULTS += @{ Check = "Student Progress"; Status = "PASS"; Note = "OK" }
    } else {
        throw "student progress success=false"
    }
} catch {
    Write-Fail "Students/progress failed: $($_.Exception.Message)"
    $RESULTS += @{ Check = "Students + Progress"; Status = "FAIL"; Note = $_.Exception.Message }
}

# -----------------------------------------------------------
# 4. EXERCISES: CREATE + ASSIGN
# -----------------------------------------------------------
Write-Step "4. Exercise Create + Assign"
try {
    $exerciseBody = @{
        title = "QA Exercise $(Get-Random)"
        description = "Validation exercise created by QA script"
        type = "PRACTICAL"
        difficulty = "INTERMEDIATE"
        workshopId = "intro"
        points = 50
        timeLimitMinutes = 20
        content = @{ summary = "Do X"; steps = @("Step 1", "Step 2") }
        solution = @{ expected = "Y" }
    } | ConvertTo-Json -Depth 6

    $created = Invoke-RestMethod -Uri "$BASE_URL/api/exercises" -Method Post -Headers @{ Authorization = "Bearer $token" } -Body $exerciseBody -ContentType "application/json"
    if ($created.success -ne $true -or -not $created.exercise.id) {
        throw "exercise create failed"
    }

    $exerciseId = $created.exercise.id
    Write-Pass "Exercise created (id=$exerciseId)"
    $RESULTS += @{ Check = "Create Exercise"; Status = "PASS"; Note = "id=$exerciseId" }

    if (-not $studentId) {
        throw "No studentId available for assignment"
    }

    $assignBody = @{ studentIds = @($studentId) } | ConvertTo-Json
    $assigned = Invoke-RestMethod -Uri "$BASE_URL/api/exercises/$exerciseId/assign" -Method Post -Headers @{ Authorization = "Bearer $token" } -Body $assignBody -ContentType "application/json"
    if ($assigned.success -eq $true) {
        Write-Pass "Exercise assigned"
        $RESULTS += @{ Check = "Assign Exercise"; Status = "PASS"; Note = $assigned.message }
    } else {
        throw "exercise assign success=false"
    }
} catch {
    Write-Fail "Exercise workflow failed: $($_.Exception.Message)"
    $RESULTS += @{ Check = "Exercises Workflow"; Status = "FAIL"; Note = $_.Exception.Message }
}

# -----------------------------------------------------------
# 5. RBAC: TRAINER MUST NOT ACCESS CLIENT ROUTES
# -----------------------------------------------------------
Write-Step "5. RBAC: Block Client Cards"
try {
    Invoke-RestMethod -Uri "$BASE_URL/api/client/cards" -Method Get -Headers @{ Authorization = "Bearer $token" } | Out-Null
    Write-Fail "SECURITY LEAK: Trainer accessed /api/client/cards"
    $RESULTS += @{ Check = "RBAC Client Isolation"; Status = "FAIL"; Note = "Trainer accessed client endpoint" }
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
# 6. 2FA BEHAVIOR: ENABLED USERS MUST PROVIDE code2fa
# -----------------------------------------------------------
Write-Step "6. 2FA Behavior (Dedicated Trainer)"
try {
    $twoFaEmail = "trainer2fa_$(Get-Random)@pmp.edu"
    $twoFaPassword = "P@ssword123!Safe"

    $registerBody = @{
        username  = $twoFaEmail.Split("@")[0]
        email     = $twoFaEmail
        password  = $twoFaPassword
        firstName = "TwoFA"
        lastName  = "Trainer"
        role      = "ROLE_FORMATEUR"
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$BASE_URL/api/auth/register" -Method Post -Body $registerBody -ContentType "application/json" | Out-Null

    $loginBody = @{ email = $twoFaEmail; password = $twoFaPassword } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $twoFaToken = Get-AuthToken $loginRes
    if (-not $twoFaToken) { throw "Missing token for 2FA trainer test" }

    $setupRes = Invoke-RestMethod -Uri "$BASE_URL/api/auth/2fa/setup" -Method Post -Headers @{ Authorization = "Bearer $twoFaToken" }
    $secret = $setupRes.secret
    if (-not $secret) { throw "Missing secret on 2FA setup" }

    $code = Get-TotpCode $secret
    $verifyBody = @{ code = $code } | ConvertTo-Json
    Invoke-RestMethod -Uri "$BASE_URL/api/auth/2fa/verify" -Method Post -Headers @{ Authorization = "Bearer $twoFaToken" } -Body $verifyBody -ContentType "application/json" | Out-Null

    # Login without code2fa must be blocked.
    try {
        Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" | Out-Null
        Write-Fail "SECURITY LEAK: Trainer login succeeded without code2fa while 2FA enabled"
        $RESULTS += @{ Check = "2FA Enforced"; Status = "FAIL"; Note = "Login without code2fa succeeded" }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($status -eq 403) {
            Write-Pass "Login without code2fa blocked (403)"
            $RESULTS += @{ Check = "2FA Enforced"; Status = "PASS"; Note = "Blocked (403)" }
        } else {
            $body = Read-ErrorBody $_
            Write-Fail "Unexpected status: $status"
            $RESULTS += @{ Check = "2FA Enforced"; Status = "FAIL"; Note = "Unexpected status: $status $body" }
        }
    }

    $code2 = Get-TotpCode $secret
    $login2FaBody = @{ email = $twoFaEmail; password = $twoFaPassword; code2fa = $code2 } | ConvertTo-Json
    $login2FaRes = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post -Body $login2FaBody -ContentType "application/json"
    $token2Fa = Get-AuthToken $login2FaRes
    if ($login2FaRes.success -and $token2Fa) {
        Write-Pass "Login with code2fa succeeded"
        $RESULTS += @{ Check = "2FA Login Works"; Status = "PASS"; Note = "OK" }
    } else {
        throw "2FA login did not return token"
    }
} catch {
    Write-Fail "2FA trainer test failed: $($_.Exception.Message)"
    $RESULTS += @{ Check = "2FA Behavior"; Status = "FAIL"; Note = $_.Exception.Message }
}

# -----------------------------------------------------------
# REPORT
# -----------------------------------------------------------
$htmlContent = @"
<!DOCTYPE html>
<html>
<head>
<title>PMP Trainer Validation</title>
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
<h1>PMP - Trainer View Validation</h1>
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
