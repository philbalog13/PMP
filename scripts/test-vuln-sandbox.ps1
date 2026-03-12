# Test Script: Per-Student Vulnerability Sandbox
# Scenario: Login -> Exploit IDOR -> Submit Flag -> Fix via Quiz -> Verify Security

$BaseUrl = "http://localhost:8000"
$Email = "etudiant.sandbox@test.com"
$Password = "P@ssword123!Safe"
$VulnCode = "IDOR_CARDS_NO_AUTH"
$FlagValue = $null

function Read-ErrorBody($ErrorRecord) {
    try {
        $stream = $ErrorRecord.Exception.Response.GetResponseStream()
        $reader = New-Object IO.StreamReader $stream
        return $reader.ReadToEnd()
    } catch {
        return ""
    }
}

Write-Host "`n[0] Initialisation..." -ForegroundColor Cyan

Write-Host "`n[1] Connexion Etudiant & Initialisation Sandbox..." -ForegroundColor Cyan
try {
    $loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "$BaseUrl/api/auth/etudiant/login" -Method Post -Body $loginBody -ContentType "application/json" -ErrorAction Stop
} catch {
    Write-Host "Compte non trouve, creation..." -ForegroundColor Yellow
    $regBody = @{ email = $Email; password = $Password; username = "sandbox_tester"; role = "ROLE_ETUDIANT"; firstName = "Sandbox"; lastName = "Tester" } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$BaseUrl/api/auth/register" -Method Post -Body $regBody -ContentType "application/json" -ErrorAction Stop | Out-Null
    } catch {
        Write-Host "Creation compte: erreur non bloquante (compte peut deja exister)." -ForegroundColor Yellow
    }

    $loginRes = Invoke-RestMethod -Uri "$BaseUrl/api/auth/etudiant/login" -Method Post -Body $loginBody -ContentType "application/json" -ErrorAction Stop
}

$Token = if ($loginRes.accessToken) { $loginRes.accessToken } elseif ($loginRes.token) { $loginRes.token } else { $null }
if (-not $Token) {
    Write-Host "Token non recu. Arret." -ForegroundColor Red
    exit 1
}
Write-Host "Token obtenu." -ForegroundColor Green

$headers = @{ Authorization = "Bearer $Token" }

Write-Host "`n[2] Reset Sandbox (Attente: OK)..." -ForegroundColor Cyan
try {
    $resetBody = @{ vulnCode = $VulnCode } | ConvertTo-Json
    Invoke-RestMethod -Uri "$BaseUrl/api/defense/reset" -Headers $headers -Method Post -Body $resetBody -ContentType "application/json" -ErrorAction Stop | Out-Null
    Write-Host "Reset OK." -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $body = Read-ErrorBody $_
    Write-Host "Erreur reset sandbox. Code: $statusCode" -ForegroundColor Red
    if ($body) { Write-Host "Body: $body" -ForegroundColor Gray }
    exit 1
}

Write-Host "`n[3] Verification Etat Initial (Attente: VULNERABLE)..." -ForegroundColor Cyan
$statusRes = Invoke-RestMethod -Uri "$BaseUrl/api/defense/status" -Headers $headers -Method Get -ErrorAction Stop
$isVuln = $statusRes.status.vulnerabilities.$VulnCode

if ($isVuln -eq $true) {
    Write-Host "Etat confirme: VULNERABLE." -ForegroundColor Green
} else {
    Write-Host "Etat inattendu: SECURISE (reset non applique ?)." -ForegroundColor Red
    exit 1
}

Write-Host "`n[4] Tentative d'Exploitation IDOR (Attente: SUCCES 200)..." -ForegroundColor Cyan
try {
    # PowerShell 5.1: use Invoke-WebRequest -UseBasicParsing to read response headers.
    $resp = Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/api/cards" -Headers $headers -Method Get -ErrorAction Stop
    $cardsRes = $resp.Content | ConvertFrom-Json

    if ($cardsRes.data -is [System.Array]) {
        $count = $cardsRes.data.Count
    } elseif ($cardsRes -is [System.Array]) {
        $count = $cardsRes.Count
    } elseif ($cardsRes) {
        $count = 1
    } else {
        $count = 0
    }
    Write-Host "Exploit reussi. Acces aux cartes permis ($count element(s))." -ForegroundColor Green

    # Flag is exposed via response header when vuln is active and request demonstrates weakness.
    if ($resp -and $resp.Headers) {
        $FlagValue = $resp.Headers['X-Defense-Flag']
        if (-not $FlagValue) { $FlagValue = $resp.Headers['x-defense-flag'] }
    }

    if ($FlagValue) {
        Write-Host "Flag recupere via header: $FlagValue" -ForegroundColor Green
    } else {
        Write-Host "Aucun flag dans les headers (verifiez que la faille est active pour cet etudiant)." -ForegroundColor Yellow
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $body = Read-ErrorBody $_
    Write-Host "Exploit echoue. Code: $statusCode" -ForegroundColor Red
    if ($body) { Write-Host "Body: $body" -ForegroundColor Gray }
    exit 1
}

Write-Host "`n[5] Soumission du Flag Offensif (Attente: SUCCES)..." -ForegroundColor Cyan
try {
    if (-not $FlagValue) {
        Write-Host "FlagValue introuvable. Arret." -ForegroundColor Red
        exit 1
    }
    $flagBody = @{ vulnCode = $VulnCode; flag = $FlagValue } | ConvertTo-Json
    $flagRes = Invoke-RestMethod -Uri "$BaseUrl/api/defense/submit-flag" -Headers $headers -Method Post -Body $flagBody -ContentType "application/json" -ErrorAction Stop

    if ($flagRes.success -eq $true) {
        Write-Host "Flag valide. Defense debloquee." -ForegroundColor Green
    } else {
        Write-Host "Flag refuse." -ForegroundColor Red
        Write-Host ($flagRes | ConvertTo-Json -Depth 5)
        exit 1
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $body = Read-ErrorBody $_
    Write-Host "Erreur soumission flag. Code: $statusCode" -ForegroundColor Red
    if ($body) { Write-Host "Body: $body" -ForegroundColor Gray }
    exit 1
}

Write-Host "`n[6] Application du Correctif (Quiz) ..." -ForegroundColor Cyan
try {
    $quizBody = @{ vulnCode = $VulnCode; selectedOptionIndex = 1 } | ConvertTo-Json
    $fixRes = Invoke-RestMethod -Uri "$BaseUrl/api/defense/fix" -Headers $headers -Method Post -Body $quizBody -ContentType "application/json" -ErrorAction Stop

    if ($fixRes.success -eq $true -and $fixRes.correction.correct -eq $true) {
        Write-Host "Correctif applique avec succes." -ForegroundColor Green
    } else {
        Write-Host "Echec de l'application du correctif." -ForegroundColor Red
        Write-Host ($fixRes | ConvertTo-Json -Depth 5)
        exit 1
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $body = Read-ErrorBody $_
    Write-Host "Erreur quiz defense. Code: $statusCode" -ForegroundColor Red
    if ($body) { Write-Host "Body: $body" -ForegroundColor Gray }
    exit 1
}

Write-Host "`n[7] Verification de la Securite (Attente: ECHEC 403)..." -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "$BaseUrl/api/cards" -Headers $headers -Method Get -ErrorAction Stop | Out-Null
    Write-Host "FAIL: l'acces est toujours permis. Correctif non applique." -ForegroundColor Red
    exit 1
} catch {
    $errCode = $_.Exception.Response.StatusCode.value__
    $body = Read-ErrorBody $_

    if ($errCode -eq 403) {
        Write-Host "SUCCES: acces bloque (403). Systeme securise pour cet etudiant." -ForegroundColor Green
    } else {
        Write-Host "Erreur inattendue: $errCode" -ForegroundColor Yellow
        if ($body) { Write-Host "Body: $body" -ForegroundColor Gray }
        exit 1
    }
}

Write-Host "`n--- TEST TERMINE AVEC SUCCES ---" -ForegroundColor Green
