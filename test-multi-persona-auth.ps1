# ==========================================================
# PMP QA AUTOMATOR - MULTI-PERSONA AUTH & RBAC TEST
# Ingénieur QA - Plateforme Monétique Pédagogique
# ==========================================================

$BASE_URL = "http://localhost:8000"
$REPORT_PATH = "./qa-auth-report.html"
$RESULTS = @()

function Write-Step ($msg) { Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }
function Write-Pass ($msg) { Write-Host "  [PASS] $msg" -ForegroundColor Green }
function Write-Fail ($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red }

# ----------------------------------------------------------
# 1. VÉRIFICATION DES SERVICES
# ----------------------------------------------------------
Write-Step "Vérification de la santé des services..."
try {
    $health = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get -ErrorAction Stop
    Write-Pass "API Gateway est en ligne (Status: $($health.status))"
} catch {
    Write-Fail "Impossible de contacter l'API Gateway sur $BASE_URL. Vérifiez Docker."
    exit
}

# ----------------------------------------------------------
# 2. SUITE DE TESTS PERSONAS
# ----------------------------------------------------------
$Personas = @(
    @{ Name="Client"; Email="client@pmp.edu"; Role="ROLE_CLIENT"; Path="/api/client/cards" },
    @{ Name="Marchand"; Email="bakery@pmp.edu"; Role="ROLE_MARCHAND"; Path="/api/marchand/transactions" },
    @{ Name="Étudiant"; Email="student01@pmp.edu"; Role="ROLE_ETUDIANT"; Path="/api/etudiant/progression" },
    @{ Name="Formateur"; Email="trainer@pmp.edu"; Role="ROLE_FORMATEUR"; Path="/api/formateur/sessions-actives" }
)

foreach ($p in $Personas) {
    Write-Step "Testing Persona: $($p.Name)"
    
    # Login Test
    $loginBody = @{ email=$p.Email; password="qa-pass-123" } | ConvertTo-Json
    try {
        $loginRes = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
        $token = $loginRes.token
        
        if ($loginRes.user.role -eq $p.Role) {
            Write-Pass "Login réussi - Rôle $($p.Role) validé"
            $RESULTS += @{ Test="Login $($p.Name)"; Status="SUCCESS"; msg="Identifiants corrects et rôle vérifié." }
        } else {
            Write-Fail "Rôle incorrect retourné : $($loginRes.user.role)"
            $RESULTS += @{ Test="Login $($p.Name)"; Status="FAILED"; msg="Erreur de rôle inattendue." }
        }

        # Auth Access Test (Authorized)
        $headers = @{ Authorization = "Bearer $token" }
        $accessRes = Invoke-RestMethod -Uri "$BASE_URL$($p.Path)" -Method Get -Headers $headers
        Write-Pass "Accès autorisé à $($p.Path)"
        $RESULTS += @{ Test="Access View $($p.Name)"; Status="SUCCESS"; msg="Consommation de l'API métier réussie." }

        # RBAC Leak Test (Cross-access attempt)
        # On tente d'accéder à la vue Administrateur avec un token Client/Marchand/Etudiant
        if ($p.Role -ne "ROLE_FORMATEUR") {
            try {
                $leakRes = Invoke-RestMethod -Uri "$BASE_URL/api/formateur/sessions-actives" -Method Get -Headers $headers
                Write-Fail "FUITE DE SÉCURITÉ : Accès non autorisé permis à /api/formateur/sessions-actives !"
                $RESULTS += @{ Test="RBAC Leak Check ($($p.Name))"; Status="CRITICAL"; msg="Le client a pu accéder à une route Formateur." }
            } catch {
                Write-Pass "RBAC Bloqué - Accès interdit à la vue Formateur (Correct)"
                $RESULTS += @{ Test="RBAC Leak Check ($($p.Name))"; Status="SUCCESS"; msg="Étanchéité confirmée." }
            }
        }

    } catch {
        Write-Fail "Erreur lors du test $($p.Name): $($_.Exception.Message)"
        $RESULTS += @{ Test="$($p.Name) Suite"; Status="FAILED"; msg=$_.Exception.Message }
    }
}

# -----------------------------------------------------------
# 5. SECURITY CHECK: EXPIRED TOKEN
# -----------------------------------------------------------
Write-Step "Testing Security: Expired Token"

$expiredBody = @{ userId="client_test"; role="ROLE_CLIENT"; expired=$true } | ConvertTo-Json
$expiredToken = ""

try {
    $tokenRes = Invoke-RestMethod -Uri "$BASE_URL/api/auth/token" -Method Post -Body $expiredBody -ContentType "application/json"
    $expiredToken = $tokenRes.token
    Write-Pass "Expired Token Generated"
} catch {
    Write-Fail "Failed to generate expired token" -Error $_
}

if ($expiredToken) {
    try {
        Invoke-RestMethod -Uri "$BASE_URL/api/client/cards" -Method Get -Headers @{ Authorization = "Bearer $expiredToken" }
        Write-Fail "SECURITY LEAK: Expired token accepted!"
        $RESULTS += @{ Test="Expired Token Check"; Status="FAILED"; msg="Expired token was accepted (Security Leak)" }
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 401) {
             Write-Pass "Expired token blocked correctly (401)"
             $RESULTS += @{ Test="Expired Token Check"; Status="SUCCESS"; msg="Expired token blocked correctly (401)" }
        } else {
             Write-Fail "Unexpected Status Code: $($_.Exception.Response.StatusCode.value__)"
             $RESULTS += @{ Test="Expired Token Check"; Status="FAILED"; msg="Unexpected status: $($_.Exception.Response.StatusCode.value__)" }
        }
    }
}

# ----------------------------------------------------------
# 6. GÉNÉRATION DU RAPPORT HTML
# ----------------------------------------------------------
Write-Step "Génération du rapport HTML..."

$htmlRows = ""
$passCount = 0
$failCount = 0

foreach ($r in $RESULTS) {
    $color = if ($r.Status -eq "SUCCESS") { "text-green-600" } else { "text-red-600" }
    if ($r.Status -eq "SUCCESS") { $passCount++ } else { $failCount++ }
    
    $htmlRows += "
    <tr class='border-b hover:bg-gray-50 transition-colors'>
        <td class='p-4 font-semibold text-gray-700'>$($r.Test)</td>
        <td class='p-4'><span class='px-3 py-1 rounded-full text-xs font-bold $color bg-opacity-10 shadow-sm'>$($r.Status)</span></td>
        <td class='p-4 text-gray-500 text-sm italic'>$($r.msg)</td>
    </tr>"
}

$HtmlTemplate = @"
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>PMP QA - Auth Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Outfit', sans-serif; }</style>
</head>
<body class="bg-gray-50 p-10">
    <div class="max-w-5xl mx-auto space-y-8">
        <!-- Header -->
        <header class="flex justify-between items-end border-b-2 border-blue-500 pb-6">
            <div>
                <h1 class="text-4xl font-extrabold text-gray-900 tracking-tighter italic">PMP <span class="text-blue-600">QA AUTOMATOR</span></h1>
                <p class="text-gray-400 font-medium">Rapport d'audit d'authentification multi-vues</p>
            </div>
            <div class="text-right">
                <p class="text-sm font-bold text-gray-800">Date: $(Get-Date -Format "dd/MM/yyyy HH:mm")</p>
                <p class="text-xs text-gray-400 font-mono">Environment: LOCAL / DEV</p>
            </div>
        </header>

        <!-- Stats -->
        <div class="grid grid-cols-3 gap-6">
            <div class="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center">
                <span class="text-3xl font-black text-blue-600">$($RESULTS.Count)</span>
                <span class="text-xs uppercase font-bold text-gray-400">Total Tests</span>
            </div>
            <div class="bg-white p-6 rounded-3xl shadow-lg border border-green-100 flex flex-col items-center">
                <span class="text-3xl font-black text-green-600">$passCount</span>
                <span class="text-xs uppercase font-bold text-gray-400">Réussis</span>
            </div>
            <div class="bg-white p-6 rounded-3xl shadow-lg border border-red-100 flex flex-col items-center">
                <span class="text-3xl font-black text-red-600">$failCount</span>
                <span class="text-xs uppercase font-bold text-gray-400">Échecs</span>
            </div>
        </div>

        <!-- Table -->
        <div class="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            <table class="w-full text-left border-collapse">
                <thead class="bg-gray-100 bg-opacity-50">
                    <tr>
                        <th class="p-4 text-xs font-black uppercase text-gray-400 tracking-widest">Test</th>
                        <th class="p-4 text-xs font-black uppercase text-gray-400 tracking-widest">Statut</th>
                        <th class="p-4 text-xs font-black uppercase text-gray-400 tracking-widest">Observations</th>
                    </tr>
                </thead>
                <tbody>
                    $htmlRows
                </tbody>
            </table>
        </div>

        <!-- Recommendations -->
        <div class="bg-blue-600 rounded-3xl p-8 text-white shadow-2xl shadow-blue-200">
            <h2 class="text-xl font-bold mb-4 flex items-center gap-2">💡 Recommandations QA</h2>
            <ul class="text-sm space-y-2 opacity-90 font-medium">
                <li>• Maintenir une étanchéité stricte des routes API via le middleware de rôles.</li>
                <li>• Les tests de fuite (RBAC Leak) doivent être exécutés après chaque refonte du Gateway.</li>
                <li>• Pensez à tester les tokens expirés pour valider la redirection forcée.</li>
            </ul>
        </div>

        <footer class="text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
            Plateforme Monétique Pédagogique • Audit Automatisé v1.0
        </footer>
    </div>
</body>
</html>
"@

$HtmlTemplate | Out-File -FilePath $REPORT_PATH -Encoding utf8

Write-Pass "Rapport généré: $REPORT_PATH"
Write-Host "`n✅ Suite de tests terminée." -ForegroundColor Green
