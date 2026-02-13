# PMP Student Production Journey Simulation
# This script simulates a real student journey against current APIs.

$baseUrl = "http://localhost:8000"
$ProgressPreference = 'SilentlyContinue'

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

    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }

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

$suffix = Get-Random

Section "1. INSCRIPTION ETUDIANT"
$studentUser = @{
    username = "julie_student_$suffix"
    email = "julie.student.$suffix@univ-lyon.fr"
    password = "StrongPass123!@#"
    firstName = "Julie"
    lastName = "Dubois"
    role = "ROLE_ETUDIANT"
}

Log "Inscription de l'etudiant: $($studentUser.email)..." "Yellow"

try {
    $regResponse = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/auth/register" -Body ($studentUser | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
    $token = if ($regResponse.accessToken) { $regResponse.accessToken } else { $regResponse.token }
    if (-not $token) {
        throw "Token manquant dans la reponse d'inscription"
    }
    $userId = $regResponse.user.id
    Log "Simulation: l'utilisateur remplit le formulaire d'inscription sur /register." "Gray"
    Log "Succes! Compte cree. ID: $userId" "Green"
    Log "Token JWT recupere." "Green"
} catch {
    Log "Erreur inscription: $_" "Red"
    exit 1
}

Section "2. ACCES DASHBOARD"
Log "Simulation: l'etudiant arrive sur /student" "Gray"
Log "Chargement du profil et progression..." "Yellow"

$progress = Invoke-Api "GET" "/api/progress" $token
Log "Donnees de progression recuperees." "Green"

$badges = Invoke-Api "GET" "/api/progress/badges" $token
Log "Badges recuperes: $($badges.badges.count)" "Green"

$workshopsResponse = Invoke-Api "GET" "/api/progress/workshops" $token
$workshop = $workshopsResponse.workshops | Select-Object -First 1
if (-not $workshop) {
    Log "Aucun atelier disponible pour ce compte." "Red"
    exit 1
}
$workshopId = $workshop.id
Log "Atelier cible: $workshopId" "White"

Section "3. PARCOURS ATELIER"
Log "Simulation: l'etudiant commence l'atelier $workshopId" "Gray"

Log "Enregistrement du debut de l'atelier..." "Yellow"
$null = Invoke-Api "POST" "/api/progress/workshop/$workshopId" $token @{
    status = "IN_PROGRESS"
    progressPercent = 10
    currentSection = 1
    timeSpentMinutes = 5
}
Log "Statut atelier mis a jour: EN COURS (10%)" "Green"

Start-Sleep -Seconds 1

Log "Simulation: l'etudiant lit le contenu..." "Gray"
Log "Mise a jour progression..." "Yellow"
$null = Invoke-Api "POST" "/api/progress/workshop/$workshopId" $token @{
    status = "IN_PROGRESS"
    progressPercent = 50
    currentSection = 2
    timeSpentMinutes = 12
}
Log "Statut atelier mis a jour: EN COURS (50%)" "Green"

Section "4. EXERCICES ET QUIZ"
Log "Simulation: l'etudiant consulte les exercices disponibles" "Gray"
try {
    $exercises = Invoke-Api "GET" "/api/exercises" $token
    $exerciseCount = if ($exercises.exercises) { $exercises.exercises.count } else { 0 }
    Log "Exercices trouves: $exerciseCount" "Green"
} catch {
    Log "Endpoint /api/exercises indisponible, on continue." "Gray"
}

Log "Simulation: l'etudiant passe un quiz..." "Yellow"
try {
    $quizId = $workshop.quizId
    if (-not $quizId) {
        $quizWorkshop = $workshopsResponse.workshops | Where-Object { $_.quizId } | Select-Object -First 1
        if ($quizWorkshop) {
            $quizId = $quizWorkshop.quizId
            $workshopId = $quizWorkshop.id
        }
    }

    if (-not $quizId) {
        Log "Aucun quiz disponible dans le catalogue." "Gray"
    } else {
        $quizPayload = Invoke-Api "GET" "/api/progress/quiz/$quizId" $token
        $questions = @($quizPayload.quiz.questions)

        if ($questions.Count -eq 0) {
            Log "Quiz sans questions, etape ignoree." "Gray"
        } else {
            $answers = @()
            foreach ($question in $questions) {
                $answers += @{
                    questionId = $question.id
                    selectedOptionIndex = 0
                }
            }

            $quizResult = Invoke-Api "POST" "/api/progress/quiz/$quizId" $token @{
                answers = $answers
                timeTakenSeconds = 120
                workshopId = $workshopId
            }

            Log "Quiz soumis avec succes!" "Green"
            if ($quizResult.result -and $quizResult.result.percentage -ne $null) {
                Log "Score: $($quizResult.result.percentage)%" "White"
            }
        }
    }
} catch {
    Log "Erreur quiz: $_" "Gray"
}

Section "5. FINALISATION"
Log "Simulation: l'etudiant termine l'atelier" "Gray"
$null = Invoke-Api "POST" "/api/progress/workshop/$workshopId/complete" $token
Log "Atelier marque comme TERMINE" "Green"

$newBadges = Invoke-Api "GET" "/api/progress/badges" $token
Log "Verification des badges: $($newBadges.badges.count)" "Yellow"

Log ""
Log "PARCOURS ETUDIANT TERMINE AVEC SUCCES" "Cyan"
Log "Toutes les operations de production ont ete simulees." "Cyan"
