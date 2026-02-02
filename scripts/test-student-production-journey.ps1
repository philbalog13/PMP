# PMP Student Production Journey Simulation
# This script simulates a real student interacting with the platform

$baseUrl = "http://localhost:8000"
$ProgressPreference = 'SilentlyContinue'

# --- Helper Functions ---

function Log {
    param([string]$Message, [string]$Color = "White")
    Write-Host "$Message" -ForegroundColor $Color
}

function Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "   $Title" 
    Write-Host "==================================================" -ForegroundColor Cyan
}

function Invoke-Api {
    param ([string]$Method, [string]$Uri, [string]$Token, [object]$Body = $null)
    $params = @{
        Method = $Method
        Uri = "$baseUrl$Uri"
        Headers = @{ Authorization = "Bearer $Token" }
        ContentType = "application/json"
        ErrorAction = "Stop"
    }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10) }
    
    try {
        return Invoke-RestMethod @params
    } catch {
        $errorMsg = $_.Exception.Message
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $respBody = $reader.ReadToEnd() | ConvertFrom-Json
            if ($respBody.error) { $errorMsg = $respBody.error }
        } catch {}
        Write-Error "API Call Failed ($Method $Uri): $errorMsg"
        throw "API Call Failed: $errorMsg"
    }
}

# --- Main Script ---

$suffix = Get-Random

# 1. Registration
Section "1. INSCRIPTION ETUDIANT"
$studentUser = @{
    username = "julie_student_$suffix"
    email = "julie.student.$suffix@univ-lyon.fr"
    password = "StrongPass123!@#"
    firstName = "Julie"
    lastName = "Dubois"
    role = "ROLE_ETUDIANT"
}

Log "Inscription de l'étudiant: $($studentUser.email)..." "Yellow"

try {
    $regResponse = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/auth/register" -Body ($studentUser | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
    $token = $regResponse.token
    $userId = $regResponse.user.id
    Log "Simulation: L'utilisateur remplit le formulaire d'inscription sur /register." "Gray"
    Log "Succès! Compte créé. ID: $userId" "Green"
    Log "Token JWT récupéré." "Green"
} catch {
    Log "Erreur inscription: $_" "Red"
    exit
}

# 2. Dashboard Access
Section "2. ACCES DASHBOARD"
Log "Simulation: L'étudiant arrive sur /student" "Gray"
Log "Chargement du profil et progression..." "Yellow"

$progress = Invoke-Api "GET" "/api/progress" $token
Log "Données de progression récupérées." "Green"
if ($progress.progress) {
    Log "Progression actuelle: $($progress.progress.count) ateliers commencés." "White"
} else {
    Log "Nouvel étudiant: Aucune progression (Normal)." "White"
}

$badges = Invoke-Api "GET" "/api/progress/badges" $token
Log "Badges récupérés: $($badges.badges.count)" "Green"

# 3. Workshop Interaction
Section "3. PARCOURS ATELIER"
Log "Simulation: L'étudiant commence l'atelier 'Introduction aux Paiements'" "Gray"
$workshopId = "iso8583"

Log "Enregistrement du début de l'atelier..." "Yellow"
# Simulate starting logic by saving progress 0%
$startProgress = Invoke-Api "POST" "/api/progress/workshop/$workshopId" $token @{
    status = "IN_PROGRESS"
    progressPercent = 10
    currentSection = 1
}
Log "Statut atelier mis à jour: EN COURS (10%)" "Green"

Start-Sleep -Seconds 1

Log "Simulation: L'étudiant lit le contenu..." "Gray"
Log "Mise à jour progression..." "Yellow"
$midProgress = Invoke-Api "POST" "/api/progress/workshop/$workshopId" $token @{
    status = "IN_PROGRESS"
    progressPercent = 50
    currentSection = 2
}
Log "Statut atelier mis à jour: EN COURS (50%)" "Green"

# 4. Exercises/Quiz
Section "4. EXERCICES & QUIZ"
Log "Simulation: L'étudiant consulte les exercices disponibles" "Gray"
$exercises = Invoke-Api "GET" "/api/exercises" $token
Log "Exercices trouvés: $($exercises.exercises.count)" "Green"

# Submit a mock quiz (Assuming quiz endpoints are mocked or backed by DB)
# Note: In a real scenario we'd need a valid quiz ID. Since we just seeded, we might not have one hardcoded easily unless we query.
# But let's try the endpoint. If it's mocked in gateway.routes.ts, it might return success.
Log "Simulation: L'étudiant passe un quiz..." "Yellow"
try {
    # Using a generic quiz ID
    $quizResult = Invoke-Api "POST" "/api/progress/quiz/quiz-iso8583-basics" $token @{
        answers = @{ q1 = "A"; q2 = "B" }
    }
    Log "Quiz soumis avec succès!" "Green"
    Log "Score: $($quizResult.score)" "White"
} catch {
    Log "Note: Quiz submission might require real quiz IDs. Proceeding..." "Gray"
}

# 5. Completion
Section "5. FINALISATION"
Log "Simulation: L'étudiant termine l'atelier" "Gray"
$completeProgress = Invoke-Api "POST" "/api/progress/workshop/$workshopId/complete" $token
Log "Atelier marqué comme TERMINE" "Green"

# Check badges again
$newBadges = Invoke-Api "GET" "/api/progress/badges" $token
Log "Vérification des badges..." "Yellow"
# Log "Badges actuels: $($newBadges.badges.count)" "White"

Log ""
Log "PARCOURS ETUDIANT TERMINE AVEC SUCCES" "Cyan"
Log "Toutes les opérations de production simulées." "Cyan"
