$ErrorActionPreference = "Stop"

function Test-Endpoint {
    param (
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [string]$Token,
        [hashtable]$Body = @{},
        [bool]$ExpectFailure = $false
    )

    Write-Host "Testing: $Name ($Url)" -NoNewline

    try {
        $headers = @{
            "Content-Type"  = "application/json"
            "Authorization" = "Bearer $Token"
        }

        $params = @{
            Uri     = $Url
            Method  = $Method
            Headers = $headers
        }

        if ($Method -eq "POST" -or $Method -eq "PUT" -or $Method -eq "PATCH") {
            $params.Body = ($Body | ConvertTo-Json -Depth 8)
        }

        $response = Invoke-RestMethod @params

        if ($response.success -eq $true) {
            if ($ExpectFailure) {
                Write-Host " -> [FAIL] Expected failure but got Success" -ForegroundColor Red
                return $false
            }
            Write-Host " -> [PASS]" -ForegroundColor Green
            return $true
        }

        if ($ExpectFailure) {
            Write-Host " -> [PASS] (Got expected error: $($response.error))" -ForegroundColor Green
            return $true
        }

        Write-Host " -> [FAIL] API success=false. Error: $($response.error)" -ForegroundColor Red
        return $false
    } catch {
        if ($ExpectFailure) {
            Write-Host " -> [PASS] (Caught expected exception)" -ForegroundColor Green
            return $true
        }
        Write-Host " -> [FAIL] Exception: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Get-AuthToken($AuthResponse) {
    if ($null -eq $AuthResponse) { return $null }
    if ($AuthResponse.accessToken) { return $AuthResponse.accessToken }
    if ($AuthResponse.token) { return $AuthResponse.token }
    return $null
}

$BASE_URL = "http://localhost:8000"

# 1. Register a fresh student
$studentEmail = "student_ver2_$(Get-Random)@pmp.edu"
$password = "TestPass123!Safe"

Write-Host "`n=== 1. Registering Student ($studentEmail) ===" -ForegroundColor Cyan
$registerUrl = "$BASE_URL/api/auth/register"
$registerBody = @{
    username  = $studentEmail.Split("@")[0]
    email     = $studentEmail
    password  = $password
    firstName = "Test"
    lastName  = "Student"
    role      = "ROLE_ETUDIANT"
}

try {
    Invoke-RestMethod -Uri $registerUrl -Method POST -Body ($registerBody | ConvertTo-Json) -ContentType "application/json" | Out-Null
    Write-Host "Registration OK" -ForegroundColor Green

    # 2. Login
    Write-Host "`n=== 2. Logging in ===" -ForegroundColor Cyan
    $loginUrl = "$BASE_URL/api/auth/etudiant/login"
    $loginBody = @{ email = $studentEmail; password = $password }
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body ($loginBody | ConvertTo-Json) -ContentType "application/json"
    $token = Get-AuthToken $loginResponse

    if (-not $token) {
        throw "Login did not return access token"
    }

    Write-Host "Login OK" -ForegroundColor Green

    # 3. Verify student endpoints (current API)
    Write-Host "`n=== 3. Verifying Student Endpoints ===" -ForegroundColor Cyan
    Test-Endpoint -Name "Get Progress" -Url "$BASE_URL/api/progress" -Token $token | Out-Null
    Test-Endpoint -Name "Get Workshops Catalog" -Url "$BASE_URL/api/progress/workshops" -Token $token | Out-Null
    Test-Endpoint -Name "Save Workshop Progress (intro)" -Url "$BASE_URL/api/progress/workshop/intro" -Method "POST" -Token $token -Body @{ currentSection = 1; timeSpentMinutes = 1 } | Out-Null
    Test-Endpoint -Name "Get Badges" -Url "$BASE_URL/api/progress/badges" -Token $token | Out-Null

    # 4. Verify forbidden access to client routes
    Write-Host "`n=== 4. Verifying Access Control ===" -ForegroundColor Cyan
    Test-Endpoint -Name "Access Client Cards (Should Fail)" -Url "$BASE_URL/api/client/cards" -Token $token -ExpectFailure $true | Out-Null
} catch {
    Write-Host "CRITICAL ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

