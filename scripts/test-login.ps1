# Test Student Login
$baseUrl = "http://localhost:8000"
$ProgressPreference = 'SilentlyContinue'

$body = @{
    email = "julie.student.1885620384@univ-lyon.fr"
    password = "StrongPass123!@#"
}

try {
    $response = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/auth/etudiant/login" -Body ($body | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
    Write-Host "Login SUCCESS!" -ForegroundColor Green
    Write-Host "Token: $($response.accessToken.Substring(0, 20))..."
} catch {
    Write-Error "Login Failed: $_"
    try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host $reader.ReadToEnd()
    } catch {}
}
