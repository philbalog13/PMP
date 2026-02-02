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
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $Token"
        }

        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $headers
        }

        if ($Method -eq "POST") {
            $params.Body = ($Body | ConvertTo-Json)
        }

        $response = Invoke-RestMethod @params
        
        if ($response.success -eq $true) {
            if ($ExpectFailure) {
                Write-Host " -> [FAIL] Expected failure but got Success" -ForegroundColor Red
                return $false
            }
            Write-Host " -> [PASS]" -ForegroundColor Green
            return $true
        } else {
             # API returned success: false
            if ($ExpectFailure) {
                 Write-Host " -> [PASS] (Got expected error: $($response.error))" -ForegroundColor Green
                 return $true
            }
            Write-Host " -> [FAIL] API success=false. Error: $($response.error)" -ForegroundColor Red
            return $false
        }
    } catch {
        # HTTP Error (403, 500 etc) triggers catch
        if ($ExpectFailure) {
            Write-Host " -> [PASS] (Caught expected exception)" -ForegroundColor Green
            return $true
        }
        Write-Host " -> [FAIL] Exception: $_" -ForegroundColor Red
        return $false
    }
}

# 1. Register
$studentEmail = "student_ver2_$(Get-Random)@pmp.edu"
$password = "TestPass123!"

Write-Host "`n=== 1. Registering Student ($studentEmail) ===" -ForegroundColor Cyan
$registerUrl = "http://localhost:8000/api/auth/register"
$registerBody = @{
    username = $studentEmail.Split("@")[0]
    email = $studentEmail
    password = $password
    firstName = "Test"
    lastName = "Student"
    role = "ROLE_ETUDIANT"
}

try {
    $registerResponse = Invoke-RestMethod -Uri $registerUrl -Method POST -Body ($registerBody | ConvertTo-Json) -ContentType "application/json"
    Write-Host "Registration OK" -ForegroundColor Green

    # 2. Login
    Write-Host "`n=== 2. Logging in ===" -ForegroundColor Cyan
    $loginUrl = "http://localhost:8000/api/auth/etudiant/login"
    $loginBody = @{ email = $studentEmail; password = $password }
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body ($loginBody | ConvertTo-Json) -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "Login OK" -ForegroundColor Green

    # 3. Verify Endpoints
    Write-Host "`n=== 3. Verifying Student Endpoints ===" -ForegroundColor Cyan
    Test-Endpoint -Name "Get Progression" -Url "http://localhost:8000/api/etudiant/progression" -Token $token
    Test-Endpoint -Name "Save Progression" -Url "http://localhost:8000/api/etudiant/progression/save" -Method "POST" -Token $token
    Test-Endpoint -Name "Get Quiz" -Url "http://localhost:8000/api/etudiant/quiz" -Token $token
    Test-Endpoint -Name "Get Exercises" -Url "http://localhost:8000/api/etudiant/exercises" -Token $token
    Test-Endpoint -Name "Get Docs" -Url "http://localhost:8000/api/etudiant/docs" -Token $token

    # 4. Verify Forbidden
    Write-Host "`n=== 4. Verifying Access Control ===" -ForegroundColor Cyan
    Test-Endpoint -Name "Access Client Cards (Should Fail)" -Url "http://localhost:8000/api/client/cards" -Token $token -ExpectFailure $true

} catch {
    Write-Host "CRITICAL ERROR: $_" -ForegroundColor Red
}
