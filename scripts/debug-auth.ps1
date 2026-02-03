$API_URL = "http://localhost:8000"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$email = "debug_student_$timestamp@pmp.edu"
$password = "S3cur3!Student#2026_PMP"

Write-Host "1. Registering new user: $email"
$registerBody = @{
    username = "debug_student_$timestamp"
    email = $email
    password = $password
    firstName = "Debug"
    lastName = "Student"
    role = "ROLE_ETUDIANT"
} | ConvertTo-Json

try {
    $regResponse = Invoke-RestMethod -Method Post -Uri "$API_URL/api/auth/register" -ContentType "application/json" -Body $registerBody
    Write-Host "Registration Response: $($regResponse | ConvertTo-Json -Depth 2)"
} catch {
    Write-Error "Registration failed: $_"
    exit
}

Write-Host "`n2. Logging in..."
$loginBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Method Post -Uri "$API_URL/api/auth/etudiant/login" -ContentType "application/json" -Body $loginBody
    Write-Host "Login Response: $($loginResponse | ConvertTo-Json -Depth 2)"
    
    if ($loginResponse.accessToken) {
        Write-Host "`n3. Decoding Token..."
        $token = $loginResponse.accessToken
        $parts = $token -split "\."
        if ($parts.Count -eq 3) {
            # Fix base64 padding
            $payloadEncoded = $parts[1]
            $padLength = 4 - ($payloadEncoded.Length % 4)
            if ($padLength -lt 4) {
                $payloadEncoded += "=" * $padLength
            }
            
            $payloadBytes = [System.Convert]::FromBase64String($payloadEncoded)
            $payloadJson = [System.Text.Encoding]::UTF8.GetString($payloadBytes)
            $payload = $payloadJson | ConvertFrom-Json
            
            Write-Host "Token Payload:"
            Write-Host ($payload | ConvertTo-Json -Depth 3)
            
            Write-Host "`n--- DIAGNOSIS ---"
            Write-Host "Role in payload: $($payload.role)"
            
            if ($payload.role -ne "ROLE_ETUDIANT") {
                Write-Host "MISMATCH! Expected ROLE_ETUDIANT" -ForegroundColor Red
            } else {
                Write-Host "Role matches. Token structure looks correct." -ForegroundColor Green
            }
        } else {
            Write-Host "Invalid token format"
        }
    }
} catch {
    Write-Error "Login failed: $_"
}
