$ErrorActionPreference = "Stop"

Write-Host "Testing Fraud Service Direct..."

$Url = "http://localhost:8000/api/fraud/check"

Write-Host "Authenticating..."
$AuthResp = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/token" -Method Post -Body '{"userId":"test-admin","role":"admin"}' -ContentType "application/json"
$TOKEN = $AuthResp.token
$Headers = @{ 
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $TOKEN"
}

# Test 1: Full Payload
Write-Host "`nTest 1: Full payload"
$Body1 = '{
    "pan": "4556098759966843",
    "amount": 75.50,
    "merchantId": "MERCHANT001",
    "mcc": "5411",
    "country": "FR"
}'
try {
    $Resp1 = Invoke-RestMethod -Uri $Url -Method Post -Body $Body1 -Headers $Headers
    Write-Host "Success: $($Resp1 | ConvertTo-Json -Depth 2)" -ForegroundColor Green
} catch {
    Write-Host "Failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
         $stream = $_.Exception.Response.GetResponseStream()
         $reader = New-Object System.IO.StreamReader($stream)
         Write-Host "Body: $($reader.ReadToEnd())" -ForegroundColor Yellow
    }
}

# Test 2: Minimal Payload
Write-Host "`nTest 2: Minimal payload (pan, amount)"
$Body2 = '{
    "pan": "4556098759966843",
    "amount": 75.50
}'
try {
    $Resp2 = Invoke-RestMethod -Uri $Url -Method Post -Body $Body2 -Headers $Headers
    Write-Host "Success: $($Resp2 | ConvertTo-Json -Depth 2)" -ForegroundColor Green
} catch {
    Write-Host "Failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
         $stream = $_.Exception.Response.GetResponseStream()
         $reader = New-Object System.IO.StreamReader($stream)
         Write-Host "Body: $($reader.ReadToEnd())" -ForegroundColor Yellow
    }
}
