# test-client-view.ps1
# Validation for CLIENT view (API gateway).

$ErrorActionPreference = "Stop"

$BASE_URL = "http://localhost:8000"
$REPORT_PATH = "./client-view-report.html"

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

    # 8-byte big-endian counter
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

Write-Host "Starting CLIENT view validation..." -ForegroundColor Cyan

# -----------------------------------------------------------
# 1. LOGIN (SEEDED CLIENT)
# -----------------------------------------------------------
Write-Step "1. Login (Seeded Client)"
$clientCreds = @{ email = "client@pmp.edu"; password = "qa-pass-123" }
$res = $null
$token = $null

try {
    $res = Invoke-RestMethod -Uri "$BASE_URL/api/auth/client/login" -Method Post -Body ($clientCreds | ConvertTo-Json) -ContentType "application/json"
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
# 2. ROLE CHECK
# -----------------------------------------------------------
Write-Step "2. JWT Role Check"
if ($res -and $res.user -and $res.user.role -eq "ROLE_CLIENT") {
    Write-Pass "Role confirmed: ROLE_CLIENT"
    $RESULTS += @{ Check = "JWT Role"; Status = "PASS"; Note = "Role: $($res.user.role)" }
} else {
    $got = if ($res -and $res.user) { $res.user.role } else { "<missing>" }
    Write-Fail "Wrong role: $got"
    $RESULTS += @{ Check = "JWT Role"; Status = "FAIL"; Note = "Got: $got" }
}

# -----------------------------------------------------------
# 3. ACCESS OWN CARDS
# -----------------------------------------------------------
Write-Step "3. Access Own Cards"
try {
    $cards = Invoke-RestMethod -Uri "$BASE_URL/api/client/cards" -Method Get -Headers @{ Authorization = "Bearer $token" }
    if ($cards.success -eq $true) {
        Write-Pass "Access /api/client/cards OK"
        $RESULTS += @{ Check = "Access Own Cards"; Status = "PASS"; Note = "OK" }
    } else {
        throw "cards.success=false"
    }
} catch {
    Write-Fail "Access own cards failed: $($_.Exception.Message)"
    $RESULTS += @{ Check = "Access Own Cards"; Status = "FAIL"; Note = $_.Exception.Message }
}

# -----------------------------------------------------------
# 4. RBAC: CLIENT MUST NOT ACCESS MERCHANT ROUTES
# -----------------------------------------------------------
Write-Step "4. RBAC: Block Merchant Transactions"
try {
    Invoke-RestMethod -Uri "$BASE_URL/api/merchant/transactions" -Method Get -Headers @{ Authorization = "Bearer $token" } | Out-Null
    Write-Fail "SECURITY LEAK: Client accessed /api/merchant/transactions"
    $RESULTS += @{ Check = "RBAC Merchant Isolation"; Status = "FAIL"; Note = "Client accessed merchant endpoint" }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 403) {
        Write-Pass "Blocked correctly (403)"
        $RESULTS += @{ Check = "RBAC Merchant Isolation"; Status = "PASS"; Note = "Blocked (403)" }
    } else {
        $body = Read-ErrorBody $_
        Write-Fail "Unexpected status: $code"
        $RESULTS += @{ Check = "RBAC Merchant Isolation"; Status = "FAIL"; Note = "Unexpected status: $code $body" }
    }
}

# -----------------------------------------------------------
# 5. TOKEN EXPIRATION (CONFIG)
# -----------------------------------------------------------
Write-Step "5. Token Expiration Config"
if ($res -and $res.expiresIn -eq "15m") {
    Write-Pass "expiresIn=15m"
    $RESULTS += @{ Check = "Token TTL"; Status = "PASS"; Note = "15m" }
} else {
    $got = if ($res) { $res.expiresIn } else { "<missing>" }
    Write-Fail "Unexpected expiresIn: $got"
    $RESULTS += @{ Check = "Token TTL"; Status = "FAIL"; Note = "Got: $got, expected: 15m" }
}

# -----------------------------------------------------------
# 6. OPTIONAL 2FA (END-TO-END) ON A DEDICATED TEST USER
# -----------------------------------------------------------
Write-Step "6. Optional 2FA Flow (Dedicated User)"
try {
    $twoFaEmail = "client2fa_$(Get-Random)@pmp.edu"
    $twoFaPassword = "P@ssword123!Safe"

    $registerBody = @{
        username  = $twoFaEmail.Split("@")[0]
        email     = $twoFaEmail
        password  = $twoFaPassword
        firstName = "TwoFA"
        lastName  = "Client"
        role      = "ROLE_CLIENT"
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$BASE_URL/api/auth/register" -Method Post -Body $registerBody -ContentType "application/json" | Out-Null

    $loginBody = @{ email = $twoFaEmail; password = $twoFaPassword } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $twoFaToken = Get-AuthToken $loginRes
    if (-not $twoFaToken) { throw "Missing access token on 2FA test login" }

    $setupRes = Invoke-RestMethod -Uri "$BASE_URL/api/auth/2fa/setup" -Method Post -Headers @{ Authorization = "Bearer $twoFaToken" }
    $secret = $setupRes.secret
    if (-not $secret) { throw "Missing secret on 2FA setup" }

    $code = Get-TotpCode $secret
    $verifyBody = @{ code = $code } | ConvertTo-Json
    $verifyRes = Invoke-RestMethod -Uri "$BASE_URL/api/auth/2fa/verify" -Method Post -Headers @{ Authorization = "Bearer $twoFaToken" } -Body $verifyBody -ContentType "application/json"
    if ($verifyRes.success -ne $true) { throw "2FA verify returned success=false" }

    # Login without code2fa must be blocked.
    try {
        Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" | Out-Null
        Write-Fail "SECURITY LEAK: Login succeeded without code2fa after enabling 2FA"
        $RESULTS += @{ Check = "2FA Enforced"; Status = "FAIL"; Note = "Login without code2fa succeeded" }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($status -eq 403) {
            Write-Pass "2FA enforced on login (403 without code2fa)"
            $RESULTS += @{ Check = "2FA Enforced"; Status = "PASS"; Note = "Blocked (403) without code2fa" }
        } else {
            $body = Read-ErrorBody $_
            Write-Fail "Unexpected status on login without 2FA: $status"
            $RESULTS += @{ Check = "2FA Enforced"; Status = "FAIL"; Note = "Unexpected status: $status $body" }
        }
    }

    $code2 = Get-TotpCode $secret
    $login2FaBody = @{ email = $twoFaEmail; password = $twoFaPassword; code2fa = $code2 } | ConvertTo-Json
    $login2FaRes = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post -Body $login2FaBody -ContentType "application/json"
    $token2Fa = Get-AuthToken $login2FaRes

    if ($login2FaRes.success -and $token2Fa) {
        Write-Pass "Login with code2fa succeeded"
        $RESULTS += @{ Check = "2FA Login"; Status = "PASS"; Note = "OK" }
    } else {
        throw "2FA login did not return token"
    }
} catch {
    Write-Fail "2FA flow failed: $($_.Exception.Message)"
    $RESULTS += @{ Check = "2FA Flow"; Status = "FAIL"; Note = $_.Exception.Message }
}

# -----------------------------------------------------------
# 7. LOGOUT + TOKEN REVOCATION
# -----------------------------------------------------------
Write-Step "7. Logout + Token Revocation"
try {
    $logout = Invoke-RestMethod -Uri "$BASE_URL/api/auth/logout" -Method Post -Headers @{ Authorization = "Bearer $token" }
    if ($logout.success -eq $true) {
        Write-Pass "Logout succeeded"
        $RESULTS += @{ Check = "Logout"; Status = "PASS"; Note = "OK" }
    } else {
        throw "logout.success=false"
    }
} catch {
    Write-Fail "Logout failed: $($_.Exception.Message)"
    $RESULTS += @{ Check = "Logout"; Status = "FAIL"; Note = $_.Exception.Message }
}

try {
    Invoke-RestMethod -Uri "$BASE_URL/api/client/cards" -Method Get -Headers @{ Authorization = "Bearer $token" } | Out-Null
    Write-Fail "SECURITY LEAK: revoked token still accepted after logout"
    $RESULTS += @{ Check = "Token Revocation"; Status = "FAIL"; Note = "Revoked token accepted" }
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 401) {
        Write-Pass "Revoked token rejected (401)"
        $RESULTS += @{ Check = "Token Revocation"; Status = "PASS"; Note = "Rejected (401)" }
    } else {
        $body = Read-ErrorBody $_
        Write-Fail "Unexpected status after logout: $status"
        $RESULTS += @{ Check = "Token Revocation"; Status = "FAIL"; Note = "Unexpected status: $status $body" }
    }
}

# -----------------------------------------------------------
# REPORT
# -----------------------------------------------------------
$htmlContent = @"
<!DOCTYPE html>
<html>
<head>
<title>PMP Client Validation</title>
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
<h1>PMP - Client View Validation</h1>
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
