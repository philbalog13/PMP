# test-student-view.ps1
# Automated validation for current PMP student journey APIs.

$ErrorActionPreference = "Stop"
$BASE_URL = "http://localhost:8000"
$REPORT_PATH = "./student-view-report.html"

function Write-Pass ($msg) { Write-Host "[PASS] $msg" -ForegroundColor Green }
function Write-Fail ($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }
function Write-Step ($msg) { Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }

$RESULTS = @()
$token = $null
$workshopId = $null
$quizId = $null

Write-Host "Starting student view validation..." -ForegroundColor Cyan

# 1. Register + Login
Write-Step "1. Register and login student"
$rand = Get-Random
$studentEmail = "student.journey.$rand@pmp.edu"
$password = "StrongPass123!@#"
$registerBody = @{
    username = "student_journey_$rand"
    email = $studentEmail
    password = $password
    firstName = "Student"
    lastName = "Journey"
    role = "ROLE_ETUDIANT"
}

try {
    $reg = Invoke-RestMethod -Uri "$BASE_URL/api/auth/register" -Method Post -Body ($registerBody | ConvertTo-Json) -ContentType "application/json"
    if (-not $reg.success) { throw "Registration response success=false" }

    $loginBody = @{ email = $studentEmail; password = $password }
    $login = Invoke-RestMethod -Uri "$BASE_URL/api/auth/etudiant/login" -Method Post -Body ($loginBody | ConvertTo-Json) -ContentType "application/json"
    $token = if ($login.accessToken) { $login.accessToken } else { $login.token }

    if (-not $login.success -or -not $token) {
        throw "Login failed or token missing"
    }

    Write-Pass "Student login succeeded"
    $RESULTS += @{ Check = "Login with student role"; Status = "PASS"; Note = "Access token received" }
} catch {
    Write-Fail "Login failed: $($_.Exception.Message)"
    $RESULTS += @{ Check = "Login with student role"; Status = "FAIL"; Note = $_.Exception.Message }
}

# 2. Access student dashboard data
Write-Step "2. Access student progression"
try {
    $prog = Invoke-RestMethod -Uri "$BASE_URL/api/progress" -Method Get -Headers @{ Authorization = "Bearer $token" }
    if (-not $prog.success) { throw "Progress endpoint returned success=false" }

    Write-Pass "Student progression accessible"
    $RESULTS += @{ Check = "Access student progression"; Status = "PASS"; Note = "GET /api/progress OK" }
} catch {
    Write-Fail "Progress access failed"
    $RESULTS += @{ Check = "Access student progression"; Status = "FAIL"; Note = $_.Exception.Message }
}

# 3. Save progression
Write-Step "3. Save workshop progression"
try {
    $workshops = Invoke-RestMethod -Uri "$BASE_URL/api/progress/workshops" -Method Get -Headers @{ Authorization = "Bearer $token" }
    if (-not $workshops.success -or -not $workshops.workshops -or $workshops.workshops.Count -eq 0) {
        throw "No workshops returned"
    }

    $first = $workshops.workshops | Select-Object -First 1
    $workshopId = $first.id
    $quizId = $first.quizId

    $saveBody = @{
        status = "IN_PROGRESS"
        progressPercent = 30
        currentSection = 1
        timeSpentMinutes = 10
    }

    $save = Invoke-RestMethod -Uri "$BASE_URL/api/progress/workshop/$workshopId" -Method Post -Headers @{ Authorization = "Bearer $token" } -Body ($saveBody | ConvertTo-Json) -ContentType "application/json"
    if (-not $save.success) { throw "Workshop progress update returned success=false" }

    Write-Pass "Workshop progression saved"
    $RESULTS += @{ Check = "Save progression"; Status = "PASS"; Note = "POST /api/progress/workshop/$workshopId OK" }
} catch {
    Write-Fail "Save progression failed"
    $RESULTS += @{ Check = "Save progression"; Status = "FAIL"; Note = $_.Exception.Message }
}

# 4. RBAC check
Write-Step "4. RBAC: block client endpoints"
try {
    Invoke-RestMethod -Uri "$BASE_URL/api/client/cards" -Method Get -Headers @{ Authorization = "Bearer $token" } | Out-Null
    Write-Fail "Security leak: student can access /api/client/cards"
    $RESULTS += @{ Check = "RBAC block client cards"; Status = "FAIL"; Note = "Unexpected 200 response" }
} catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Pass "RBAC enforced (403)"
        $RESULTS += @{ Check = "RBAC block client cards"; Status = "PASS"; Note = "Correctly blocked with 403" }
    } else {
        $status = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "unknown" }
        Write-Fail "Unexpected status: $status"
        $RESULTS += @{ Check = "RBAC block client cards"; Status = "FAIL"; Note = "Unexpected status $status" }
    }
}

# 5. Quiz and workshop content
Write-Step "5. Access quiz and workshop content"
try {
    if (-not $quizId) {
        $all = Invoke-RestMethod -Uri "$BASE_URL/api/progress/workshops" -Method Get -Headers @{ Authorization = "Bearer $token" }
        $withQuiz = $all.workshops | Where-Object { $_.quizId } | Select-Object -First 1
        if ($withQuiz) {
            $quizId = $withQuiz.quizId
            $workshopId = $withQuiz.id
        }
    }

    if ($quizId) {
        $quiz = Invoke-RestMethod -Uri "$BASE_URL/api/progress/quiz/$quizId" -Method Get -Headers @{ Authorization = "Bearer $token" }
        if (-not $quiz.success) { throw "Quiz endpoint returned success=false" }
    }

    if (-not $workshopId) {
        throw "No workshop id available for content check"
    }

    $content = Invoke-RestMethod -Uri "$BASE_URL/api/progress/workshops/$workshopId/content" -Method Get -Headers @{ Authorization = "Bearer $token" }
    if (-not $content.success) { throw "Workshop content endpoint returned success=false" }

    Write-Pass "Quiz and content endpoints accessible"
    $RESULTS += @{ Check = "Access quiz and content"; Status = "PASS"; Note = "Quiz/content APIs OK" }
} catch {
    Write-Fail "Quiz/content access failed"
    $RESULTS += @{ Check = "Access quiz and content"; Status = "FAIL"; Note = $_.Exception.Message }
}

# 6. Badges
Write-Step "6. Access badges"
try {
    $badges = Invoke-RestMethod -Uri "$BASE_URL/api/progress/badges" -Method Get -Headers @{ Authorization = "Bearer $token" }
    if (-not $badges.success) { throw "Badges endpoint returned success=false" }

    Write-Pass "Badges accessible"
    $RESULTS += @{ Check = "Access badges"; Status = "PASS"; Note = "GET /api/progress/badges OK" }
} catch {
    Write-Fail "Badges access failed"
    $RESULTS += @{ Check = "Access badges"; Status = "FAIL"; Note = $_.Exception.Message }
}

# HTML report
$htmlContent = @"
<!DOCTYPE html>
<html>
<head>
<title>PMP Student Validation</title>
<style>
body { font-family: sans-serif; padding: 20px; }
table { border-collapse: collapse; width: 100%; max-width: 980px; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background-color: #f2f2f2; }
.PASS { color: green; font-weight: bold; }
.FAIL { color: red; font-weight: bold; }
</style>
</head>
<body>
<h1>Student Journey Validation</h1>
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
