$ErrorActionPreference = "Stop"

try {
    Write-Host "Authenticating..."
    $AuthResp = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/token" -Method Post -Body '{"userId":"test-admin","role":"admin"}' -ContentType "application/json"
    $TOKEN = $AuthResp.token
    Write-Host "Token: $TOKEN"

    $Headers = @{ 
        "Authorization" = "Bearer $TOKEN";
        "X-Test-Mode" = "true"
    }
    
    $TxBody = '{
        "merchantId": "MERCHANT001",
        "terminalId": "TPE_TEST_001",
        "amount": 75.50,
        "currency": "EUR",
        "pan": "4556098759966843",
        "expiryMonth": 1,
        "expiryYear": 2029,
        "cvv": "164",
        "pin": "1234",
        "country": "FR",
        "mcc": "5411",
        "isEcommerce": false
    }'
    
    Write-Host "Submitting Transaction..."
    $SubmitResp = Invoke-RestMethod -Uri "http://localhost:8000/api/transaction/process" -Method Post -Body $TxBody -Headers $Headers -ContentType "application/json"
    
    Write-Host "Success!"
    $SubmitResp | ConvertTo-Json -Depth 5
} catch {
    Write-Host "FAILED!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
         $stream = $_.Exception.Response.GetResponseStream()
         $reader = New-Object System.IO.StreamReader($stream)
         Write-Host "Body: $($reader.ReadToEnd())" -ForegroundColor Yellow
    }
}
