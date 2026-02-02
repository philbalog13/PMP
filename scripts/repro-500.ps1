$baseUrl = "http://localhost:8000"
try {
    # register/login instructor
    $suffix = Get-Random
    $user = @{
        username = "debug_prof_$suffix"
        email = "debug.prof.$suffix@test.com"
        password = "StrongPass123!@#"
        firstName = "Debug"
        lastName = "Prof"
        role = "ROLE_FORMATEUR"
    }
    $reg = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/auth/register" -Body ($user | ConvertTo-Json) -ContentType "application/json"
    $token = $reg.token
    Write-Host "Token obtained."

    # Call getStudents
    Write-Host "Calling GET /api/users/students ..."
    $response = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/users/students" -Headers @{ Authorization = "Bearer $token" }
    Write-Host "Success: $($response.success)"
} catch {
    Write-Host "Error: $_"
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body: $($reader.ReadToEnd())"
}
