# Create Virtual Card
$url = "http://localhost:8001/cards"
$body = @{
    cardholderName = "Demo User"
    cardType = "VISA"
    issuerId = "pmp-issuer"
    balance = 1000
} | ConvertTo-Json

Write-Host "Creating Virtual Card for 'Demo User'..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    
    if ($response.success) {
        $data = $response.data
        Write-Host "✅ Card Created Successfully!" -ForegroundColor Green
        Write-Host "-------------------------------------------"
        Write-Host "PAN: $($data.pan)" -ForegroundColor Yellow
        Write-Host "CVV: $($data.cvv)" -ForegroundColor Yellow
        Write-Host "Expiry: $($data.expiryMonth)/$($data.expiryYear)"
        Write-Host "Cardholder: $($data.cardholderName)"
        Write-Host "Status: $($data.status)"
        Write-Host "-------------------------------------------"
        
        # Save card details to a file for later phases
        $data | ConvertTo-Json | Out-File "demo_card.json"
        Write-Host "Card details saved to demo_card.json" -ForegroundColor Gray
    } else {
        Write-Host "❌ Failed to create card. Status: $($response.StatusCode)" -ForegroundColor Red
        Write-Host $response.Content
    }
} catch {
    Write-Host "❌ Error creating card: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
        $errBody = $reader.ReadToEnd()
        Write-Host "Server Response: $errBody" -ForegroundColor Red
    }
}
