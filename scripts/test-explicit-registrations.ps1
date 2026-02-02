# Test Explicit Registrations for Each Role

$baseUrl = "http://localhost:8000"
$ProgressPreference = 'SilentlyContinue'

function Register-User {
    param (
        [string]$Username,
        [string]$Email,
        [string]$Role,
        [string]$FirstName,
        [string]$LastName
    )

    Write-Host "Registering $Role ($Email)... " -NoNewline

    $body = @{
        username = $Username
        email = $Email
        password = "StrongPass123!@#"
        firstName = $FirstName
        lastName = $LastName
        role = $Role
    }

    try {
        $response = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/auth/register" -Body ($body | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
        
        if ($response.success) {
            Write-Host "[SUCCESS]" -ForegroundColor Green
            Write-Host "   ID: $($response.user.id)"
            Write-Host "   Role: $($response.user.role)"
        } else {
            Write-Host "[FAILED]" -ForegroundColor Red
            Write-Host "   Error: $($response.error)"
        }
    } catch {
        Write-Host "[FAILED]" -ForegroundColor Red
        $errorMsg = $_.Exception.Message
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $respBody = $reader.ReadToEnd() | ConvertFrom-Json
            if ($respBody.error) { $errorMsg = $respBody.error }
        } catch {}
        Write-Host "   Error: $errorMsg"
    }
}

Write-Host "========================================"
Write-Host "   EXPLICIT REGISTRATION TEST"
Write-Host "========================================"
Write-Host ""

# Unique suffix to ensure we don't collide if run multiple times
$suffix = Get-Random

# 1. Student
Register-User -Username "jean_dupont_$suffix" -Email "jean.dupont.$suffix@univ-test.fr" -Role "ROLE_ETUDIANT" -FirstName "Jean" -LastName "Dupont"

# 2. Instructor
Register-User -Username "marie_curie_$suffix" -Email "marie.curie.$suffix@academy-test.com" -Role "ROLE_FORMATEUR" -FirstName "Marie" -LastName "Curie"

# 3. Client
Register-User -Username "sophie_martin_$suffix" -Email "sophie.martin.$suffix@gmail-test.com" -Role "ROLE_CLIENT" -FirstName "Sophie" -LastName "Martin"

# 4. Merchant
Register-User -Username "boulangerie_paris_$suffix" -Email "contact.$suffix@boulangerie-test.fr" -Role "ROLE_MARCHAND" -FirstName "Pierre" -LastName "Boulanger"

Write-Host ""
Write-Host "========================================"
Write-Host "   TEST COMPLETE"
Write-Host "========================================"
