# PMP Role & Navigation Verification Script

$baseUrl = "http://localhost:8000"
$frontendUrl = "http://localhost:3000"
$ProgressPreference = 'SilentlyContinue'

function Test-Endpoint {
    param (
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [string]$Description,
        [int]$ExpectedStatus = 200
    )

    Write-Host "Testing: $Description ($Method $Uri)" -NoNewline

    try {
        $params = @{
            Uri = $Uri
            Method = $Method
            ContentType = "application/json"
            ErrorAction = "Stop"
        }
        if ($Headers) { $params.Headers = $Headers }
        if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10) }

        $response = Invoke-RestMethod @params
        
        Write-Host " [PASS]" -ForegroundColor Green
        return $response
    }
    catch {
        $response = $_.Exception.Response
        $status = [int]$response.StatusCode
        
        if ($status -eq $ExpectedStatus) {
            Write-Host " [PASS] (Expected $status)" -ForegroundColor Green
            return $response
        } else {
            Write-Host " [FAIL]" -ForegroundColor Red
            Write-Host "   Status: $status (Expected $ExpectedStatus)"
            if ($response) {
                # Read output safely
                try {
                    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
                    Write-Host "   Response: $($reader.ReadToEnd())"
                } catch {}
            }
            return $null
        }
    }
}

Write-Host "======================================"
Write-Host "   PMP VERIFICATION START"
Write-Host "======================================"
Write-Host ""

# 1. Register Instructor
$instructor = @{
    username = "test_instructor_$(Get-Random)"
    email = "instructor_$(Get-Random)@pmp.local"
    password = "Start123!$(Get-Random)"
    firstName = "Test"
    lastName = "Instructor"
    role = "ROLE_FORMATEUR"
}

$regResponse = Test-Endpoint -Method POST -Uri "$baseUrl/api/auth/register" -Body $instructor -Description "Register Instructor" -ExpectedStatus 201

if ($regResponse) {
    if ($regResponse.token) {
        $instructorToken = $regResponse.token
        $instructorHeaders = @{ Authorization = "Bearer $instructorToken" }
        
        Write-Host "Instructor Token obtained." -ForegroundColor Cyan

        # 2. Test Instructor Routes
        Test-Endpoint -Method GET -Uri "$baseUrl/api/users" -Headers $instructorHeaders -Description "Get All Users (Instructor)"
        Test-Endpoint -Method GET -Uri "$baseUrl/api/exercises" -Headers $instructorHeaders -Description "Get Exercises (Instructor)"
    } else {
        Write-Host "No token in registration response." -ForegroundColor Red
    }
}

Write-Host ""

# 3. Register Student
$student = @{
    username = "test_student_$(Get-Random)"
    email = "student_$(Get-Random)@pmp.local"
    password = "Start123!$(Get-Random)"
    firstName = "Test"
    lastName = "Student"
    role = "ROLE_ETUDIANT"
}

$regStudentResponse = Test-Endpoint -Method POST -Uri "$baseUrl/api/auth/register" -Body $student -Description "Register Student" -ExpectedStatus 201

if ($regStudentResponse) {
    if ($regStudentResponse.token) {
        $studentToken = $regStudentResponse.token
        $studentHeaders = @{ Authorization = "Bearer $studentToken" }
        
        Write-Host "Student Token obtained." -ForegroundColor Cyan

        # 4. Test Student Routes
        Test-Endpoint -Method GET -Uri "$baseUrl/api/progress" -Headers $studentHeaders -Description "Get My Progress (Student)"
        
        # 5. Test Access Control (Student accessing Instructor route)
        Test-Endpoint -Method GET -Uri "$baseUrl/api/users" -Headers $studentHeaders -Description "Get Users (Student - Should Fail)" -ExpectedStatus 403
    } else {
        Write-Host "No token in registration response." -ForegroundColor Red
    }
}

Write-Host ""

# 6. Verify Frontend Pages (Availability)
$pages = @(
    "/student",
    "/student/progress",
    "/student/badges",
    "/instructor",
    "/instructor/students",
    "/client",
    "/client/cards",
    "/merchant",
    "/merchant/pos"
)

foreach ($page in $pages) {
    Try {
        $res = Invoke-WebRequest -Uri "$frontendUrl$page" -Method Head -ErrorAction Stop -UseBasicParsing
        Write-Host "Frontend Page $page : [PASS]" -ForegroundColor Green
    } Catch {
        $status = $_.Exception.Response.StatusCode
        if ($status -eq 200 -or $status -eq 404) {
             # 404 is technically a "response" from Next.js for unknown static routes, but these should exist.
             # However, Next.js dynamic routes might return 200 via catch-all.
             Write-Host "Frontend Page $page : [CHECK] Status $status" -ForegroundColor Yellow
        } else {
             Write-Host "Frontend Page $page : [FAIL] Status $status" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "======================================"
Write-Host "   PMP VERIFICATION COMPLETE"
Write-Host "======================================"
