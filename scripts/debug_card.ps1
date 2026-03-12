$ErrorActionPreference = "Stop"

try {
    Write-Host "Authenticating..."
    $AuthResp = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/token" -Method Post -Body '{"userId":"test-admin","role":"admin"}' -ContentType "application/json"
    $TOKEN = $AuthResp.token
    Write-Host "Token: $TOKEN"

    $Headers = @{ "Authorization" = "Bearer $TOKEN" }
    
    $CardBody = '{ "cardholderName": "JEAN DUPONT", "cardType": "VISA", "balance": 1000, "currency": "EUR", "issuerId": "ISSUER-001" }'
    
    Write-Host "Creating Card..."
    $CardResp = Invoke-RestMethod -Uri "http://localhost:8000/api/cards" -Method Post -Body $CardBody -Headers $Headers -ContentType "application/json"
    
    Write-Host "Success!"
    $CardResp | ConvertTo-Json -Depth 5 | Set-Content "card_data.json"
} catch {
    Write-Host "FALIED!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
         $stream = $_.Exception.Response.GetResponseStream()
         $reader = New-Object System.IO.StreamReader($stream)
         Write-Host "Body: $($reader.ReadToEnd())" -ForegroundColor Yellow
    }
}
