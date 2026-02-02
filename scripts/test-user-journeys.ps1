# PMP Comprehensive User Journey Test Script

$baseUrl = "http://localhost:8000"
$ProgressPreference = 'SilentlyContinue'

function Test-Step {
    param (
        [string]$Name,
        [scriptblock]$Action
    )
    Write-Host "[$Name]..." -NoNewline
    try {
        $result = & $Action
        Write-Host " [OK]" -ForegroundColor Green
        return $result
    } catch {
        Write-Host " [FAILED]" -ForegroundColor Red
        Write-Host "   Error: $_"
        return $null
    }
}

function Get-Token {
    param ([string]$Username, [string]$Role)
    $url = "$baseUrl/api/auth/token"
    # Create a dev token directly to bypass login complexity for testing if needed, 
    # OR use the register/login flow. Let's use register to be authentic.
    
    $random = Get-Random
    $userBody = @{
        username = "${Username}_${random}"
        email = "${Username}_${random}@test.local"
        password = "StrongPass123!@#"
        firstName = "Test"
        lastName = $Username
        role = $Role
    }
    
    try {
        $response = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/auth/register" -Body ($userBody | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
        return $response.token
    } catch {
        Write-Error "Failed to register $Username : $($_.Exception.Message)"
        return $null
    }
}

function Invoke-Api {
    param ([string]$Method, [string]$Uri, [string]$Token, [object]$Body = $null)
    $params = @{
        Method = $Method
        Uri = "$baseUrl$Uri"
        Headers = @{ Authorization = "Bearer $Token" }
        ContentType = "application/json"
        ErrorAction = "Stop"
    }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10) }
    
    return Invoke-RestMethod @params
}

Write-Host "========================================"
Write-Host "   PMP USER JOURNEY TESTING"
Write-Host "========================================"
Write-Host ""

# ==========================================
# 1. STUDENT JOURNEY
# ==========================================
Write-Host "--- 1. STUDENT JOURNEY ---" -ForegroundColor Cyan
$studentToken = Test-Step "Authentication (Register Student)" { Get-Token "student" "ROLE_ETUDIANT" }

if ($studentToken) {
    Test-Step "View Dashboard (Get Progress)" { 
        Invoke-Api "GET" "/api/etudiant/progression" $studentToken 
    }
    Test-Step "View Quizzes (Get Quiz List)" { 
        Invoke-Api "GET" "/api/etudiant/quiz" $studentToken 
    }
    Test-Step "View Exercises (Get Exercises)" { 
        Invoke-Api "GET" "/api/etudiant/exercises" $studentToken 
    }
    Test-Step "View Docs (Get Documentation)" { 
        Invoke-Api "GET" "/api/etudiant/docs" $studentToken 
    }
    Test-Step "Save Progress (Simulate)" { 
        Invoke-Api "POST" "/api/etudiant/progression/save" $studentToken @{ workshopId = "1"; sectionId = "2" }
    }
}
Write-Host ""

# ==========================================
# 2. INSTRUCTOR JOURNEY
# ==========================================
Write-Host "--- 2. INSTRUCTOR JOURNEY ---" -ForegroundColor Cyan
$instructorToken = Test-Step "Authentication (Register Instructor)" { Get-Token "instructor" "ROLE_FORMATEUR" }

if ($instructorToken) {
    Test-Step "View Dashboard (Get Active Sessions)" { 
        Invoke-Api "GET" "/api/formateur/sessions-actives" $instructorToken 
    }
    Test-Step "Manage Exercises (List Exercises)" { 
        Invoke-Api "GET" "/api/formateur/exercises" $instructorToken 
    }
    Test-Step "Create Exercise (Defaut)" { 
        Invoke-Api "POST" "/api/formateur/exercises" $instructorToken @{ title = "New Exercise"; type = "quiz" }
    }
    Test-Step "View Users (Admin view)" { 
        Invoke-Api "GET" "/api/admin/users" $instructorToken 
    }
}
Write-Host ""

# ==========================================
# 3. CLIENT JOURNEY
# ==========================================
Write-Host "--- 3. CLIENT JOURNEY ---" -ForegroundColor Cyan
$clientToken = Test-Step "Authentication (Register Client)" { Get-Token "client" "ROLE_CLIENT" }

if ($clientToken) {
    Test-Step "View Cards (Get My Cards)" { 
        Invoke-Api "GET" "/api/client/cards" $clientToken 
    }
    # Note: Transactions are proxied to sim-pos-service/transactions usually
    # But checking if Client has specific mock endpoints or if we use the generic
    # For now, let's assume client access to their own transaction history might be via /api/client/transactions (if it existed)
    # The routes file showed mocked /api/client/cards but verify others.
    # We will skip transaction history if not explicitly mocked in gateway.routes.ts for demo.
}
Write-Host ""

# ==========================================
# 4. MERCHANT JOURNEY
# ==========================================
Write-Host "--- 4. MERCHANT JOURNEY ---" -ForegroundColor Cyan
$merchantToken = Test-Step "Authentication (Register Merchant)" { Get-Token "merchant" "ROLE_MARCHAND" }

if ($merchantToken) {
    Test-Step "View Dashboard (Get Daily Report)" { 
        Invoke-Api "GET" "/api/marchand/reports/daily" $merchantToken 
    }
    Test-Step "View Transactions (Get Recent)" { 
        Invoke-Api "GET" "/api/marchand/transactions" $merchantToken 
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "   TESTING UPDATE COMPLETE "
Write-Host "========================================"
