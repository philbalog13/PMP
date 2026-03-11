# PMP Student Production Journey Simulation
# This script exercises a real student path against current APIs.

$baseUrl = if ($env:PMP_BASE_URL) { $env:PMP_BASE_URL.TrimEnd('/') } else { "http://localhost:8000" }
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

function Fail {
    param([string]$Message)
    Log $Message "Red"
    exit 1
}

function Assert-True {
    param(
        [bool]$Condition,
        [string]$SuccessMessage,
        [string]$FailureMessage
    )

    if (-not $Condition) {
        Fail $FailureMessage
    }

    if ($SuccessMessage) {
        Log $SuccessMessage "Green"
    }
}

function Get-OptionalProperty {
    param(
        [object]$Object,
        [string]$Name,
        $Default = $null
    )

    if ($null -eq $Object) {
        return $Default
    }

    if ($Object -is [System.Collections.IDictionary]) {
        if ($Object.Contains($Name)) {
            return $Object[$Name]
        }
        return $Default
    }

    if ($Object.PSObject.Properties.Name -contains $Name) {
        return $Object.$Name
    }

    return $Default
}

function Invoke-JsonRequest {
    param(
        [string]$Method,
        [string]$Uri,
        [string]$Token = $null,
        [object]$Body = $null
    )

    $params = @{
        Method = $Method
        Uri = "$baseUrl$Uri"
        ContentType = "application/json"
        ErrorAction = "Stop"
    }

    if ($Token) {
        $params.Headers = @{ Authorization = "Bearer $Token" }
    }

    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }

    try {
        return Invoke-RestMethod @params
    } catch {
        $errorMsg = $_.Exception.Message
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                $respBody = $reader.ReadToEnd() | ConvertFrom-Json
                $apiError = Get-OptionalProperty $respBody "error"
                if ($apiError) {
                    $errorMsg = $apiError
                }
            }
        } catch {}

        Write-Error "API Call Failed ($Method $Uri): $errorMsg"
        throw "API Call Failed ($Method $Uri): $errorMsg"
    }
}

function Register-User {
    param([hashtable]$UserPayload)

    $response = Invoke-JsonRequest "POST" "/api/auth/register" $null $UserPayload
    $token = Get-OptionalProperty $response "accessToken"
    if (-not $token) {
        $token = Get-OptionalProperty $response "token"
    }

    $user = Get-OptionalProperty $response "user"
    $userId = Get-OptionalProperty $user "id"

    Assert-True ([string]::IsNullOrWhiteSpace($token) -eq $false) "Token JWT recupere." "Token manquant dans la reponse d'inscription."
    Assert-True ([string]::IsNullOrWhiteSpace($userId) -eq $false) "Compte cree. ID: $userId" "Identifiant utilisateur manquant dans la reponse d'inscription."

    return @{
        Response = $response
        Token = $token
        UserId = $userId
    }
}

function Build-CorrectedQuizAnswers {
    param([object[]]$ReviewItems)

    $answers = @()
    foreach ($item in $ReviewItems) {
        $questionId = Get-OptionalProperty $item "questionId"
        $correctOptionIndex = Get-OptionalProperty $item "correctOptionIndex"

        if ([string]::IsNullOrWhiteSpace([string]$questionId)) {
            Fail "Le review quiz ne contient pas de questionId exploitable."
        }

        if ($null -eq $correctOptionIndex) {
            Fail "Le review quiz ne contient pas de correctOptionIndex exploitable."
        }

        $answers += @{
            questionId = $questionId
            selectedOptionIndex = [int]$correctOptionIndex
        }
    }

    return $answers
}

function New-InstructorExerciseAssignment {
    param(
        [string]$StudentId,
        [string]$WorkshopId
    )

    $suffix = Get-Random
    $instructorPayload = @{
        username = "mentor_student_flow_$suffix"
        email = "mentor.student.flow.$suffix@academy-tech.io"
        password = "StrongPass123!@#"
        firstName = "Mentor"
        lastName = "Flow"
        role = "ROLE_FORMATEUR"
    }

    Log "Aucun exercice assigne. Bootstrap d'un exercice reel via un formateur temporaire..." "Yellow"
    $instructor = Register-User $instructorPayload
    $instructorToken = $instructor.Token

    $exercisePayload = @{
        title = "Analyse de logs ISO 8583 - Smoke Student"
        description = "Identifier le code reponse et resumer la cause probable du refus."
        type = "PRACTICAL"
        difficulty = "INTERMEDIATE"
        workshopId = $WorkshopId
        points = 50
        timeLimitMinutes = 20
        content = @{
            logSample = "MTI=0210 DE39=05 STAN=123456"
            prompt = "Analysez ce log et expliquez le refus."
        }
        solution = @{
            expectedResponseCode = "05"
            expectedMeaning = "Do not honor"
        }
    }

    $createdExercise = Invoke-JsonRequest "POST" "/api/exercises" $instructorToken $exercisePayload
    $exercise = Get-OptionalProperty $createdExercise "exercise"
    $exerciseId = Get-OptionalProperty $exercise "id"

    Assert-True ([string]::IsNullOrWhiteSpace([string]$exerciseId) -eq $false) "Exercice bootstrap cree: $exerciseId" "Creation de l'exercice bootstrap invalide."

    $assignPayload = @{
        studentIds = @($StudentId)
        dueDate = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ssZ")
    }

    $assignmentResponse = Invoke-JsonRequest "POST" "/api/exercises/$exerciseId/assign" $instructorToken $assignPayload
    $assignments = @(Get-OptionalProperty $assignmentResponse "assignments" @())
    Assert-True ($assignments.Count -ge 1) "Exercice bootstrap assigne a l'etudiant." "Le bootstrap n'a assigne aucun exercice a l'etudiant."

    return $exerciseId
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
    $studentRegistration = Register-User $studentUser
    $token = $studentRegistration.Token
    $userId = $studentRegistration.UserId
    Log "Simulation: l'utilisateur remplit le formulaire d'inscription sur /register." "Gray"
} catch {
    Fail "Erreur inscription: $_"
}

Section "2. ACCES DASHBOARD"
Log "Simulation: l'etudiant arrive sur /student" "Gray"
Log "Chargement du profil et de la progression..." "Yellow"

$progress = Invoke-JsonRequest "GET" "/api/progress" $token
Assert-True ((Get-OptionalProperty $progress "success" $false) -eq $true) "Donnees de progression recuperees." "GET /api/progress n'a pas retourne success=true."

$stats = Invoke-JsonRequest "GET" "/api/progress/stats" $token
Assert-True ((Get-OptionalProperty $stats "success" $false) -eq $true) "Statistiques etudiant recuperees." "GET /api/progress/stats n'a pas retourne success=true."

$badges = Invoke-JsonRequest "GET" "/api/progress/badges" $token
Assert-True ((Get-OptionalProperty $badges "success" $false) -eq $true) "Badges recuperes." "GET /api/progress/badges n'a pas retourne success=true."
Log ("Badges au depart: {0}/{1}" -f (Get-OptionalProperty $badges "earned" 0), (Get-OptionalProperty $badges "total" 0)) "White"

$workshopsResponse = Invoke-JsonRequest "GET" "/api/progress/workshops" $token
$workshops = @(Get-OptionalProperty $workshopsResponse "workshops" @())
Assert-True ($workshops.Count -ge 1) "Catalogue ateliers charge: $($workshops.Count) atelier(s)." "Aucun atelier disponible pour ce compte."

$workshop = $workshops | Where-Object { (Get-OptionalProperty $_ "quizId") } | Select-Object -First 1
if (-not $workshop) {
    $workshop = $workshops | Select-Object -First 1
}

$workshopId = Get-OptionalProperty $workshop "id"
$workshopTitle = Get-OptionalProperty $workshop "title" $workshopId
$quizId = Get-OptionalProperty $workshop "quizId"
Assert-True ([string]::IsNullOrWhiteSpace([string]$workshopId) -eq $false) "Atelier cible selectionne: $workshopId" "Impossible de determiner un atelier cible."

$workshopContent = Invoke-JsonRequest "GET" "/api/progress/workshops/$workshopId/content" $token
$content = Get-OptionalProperty $workshopContent "content"
$contentSections = @(Get-OptionalProperty $content "sections" @())
Assert-True ((Get-OptionalProperty $workshopContent "success" $false) -eq $true) "Contenu atelier charge." "GET /api/progress/workshops/$workshopId/content n'a pas retourne success=true."
Assert-True ($contentSections.Count -ge 1) "Atelier $workshopId expose $($contentSections.Count) section(s) reelles." "L'atelier $workshopId ne contient aucune section exploitable."

$nonEmptySection = $contentSections | Where-Object { [string]::IsNullOrWhiteSpace([string](Get-OptionalProperty $_ "content")) -eq $false } | Select-Object -First 1
Assert-True ($null -ne $nonEmptySection) "Le contenu pedagogique de l'atelier est non vide." "Toutes les sections de l'atelier $workshopId sont vides."

Section "3. PARCOURS ATELIER"
Log "Simulation: l'etudiant commence l'atelier $workshopId - $workshopTitle" "Gray"

$workshopSectionCount = [int](Get-OptionalProperty $workshop "sections" 1)
if ($workshopSectionCount -lt 1) {
    $workshopSectionCount = 1
}

$firstSection = 1
$secondSection = [Math]::Min([Math]::Max(2, 1), $workshopSectionCount)

Log "Enregistrement du debut de l'atelier..." "Yellow"
$progressStart = Invoke-JsonRequest "POST" "/api/progress/workshop/$workshopId" $token @{
    currentSection = $firstSection
    timeSpentMinutes = 5
}

$progressStartPayload = Get-OptionalProperty $progressStart "progress"
$progressStartPercent = [int](Get-OptionalProperty $progressStartPayload "progress_percent" 0)
Assert-True ($progressStartPercent -gt 0) "Progression atelier enregistree: $progressStartPercent%." "La premiere progression atelier n'a pas fait avancer le pourcentage."

Start-Sleep -Seconds 1

Log "Simulation: l'etudiant lit le contenu et continue l'atelier..." "Gray"
$progressMid = Invoke-JsonRequest "POST" "/api/progress/workshop/$workshopId" $token @{
    currentSection = $secondSection
    timeSpentMinutes = 7
}

$progressMidPayload = Get-OptionalProperty $progressMid "progress"
$progressMidPercent = [int](Get-OptionalProperty $progressMidPayload "progress_percent" 0)
Assert-True ($progressMidPercent -ge $progressStartPercent) "Progression atelier mise a jour: $progressMidPercent%." "La progression atelier a recule ou n'a pas ete persistante."

Section "4. EXERCICES ET QUIZ"
Log "Simulation: l'etudiant consulte les exercices assignes" "Gray"
$exercisesResponse = Invoke-JsonRequest "GET" "/api/exercises" $token
$assignedExercises = @(Get-OptionalProperty $exercisesResponse "exercises" @())

if ($assignedExercises.Count -eq 0) {
    $null = New-InstructorExerciseAssignment -StudentId $userId -WorkshopId $workshopId
    $exercisesResponse = Invoke-JsonRequest "GET" "/api/exercises" $token
    $assignedExercises = @(Get-OptionalProperty $exercisesResponse "exercises" @())
}

Assert-True ($assignedExercises.Count -ge 1) "Exercices assignes disponibles: $($assignedExercises.Count)." "Le parcours etudiant reste vide: aucun exercice assigne."

$exercise = $assignedExercises | Select-Object -First 1
$exerciseId = Get-OptionalProperty $exercise "id"
Assert-True ([string]::IsNullOrWhiteSpace([string]$exerciseId) -eq $false) "Exercice cible selectionne: $exerciseId" "Impossible de determiner l'exercice assigne a tester."

$exerciseDetail = Invoke-JsonRequest "GET" "/api/exercises/$exerciseId" $token
$exercisePayload = Get-OptionalProperty $exerciseDetail "exercise"
Assert-True ((Get-OptionalProperty $exerciseDetail "success" $false) -eq $true) "Detail exercice charge." "GET /api/exercises/$exerciseId n'a pas retourne success=true."
Assert-True ($exercisePayload.PSObject.Properties.Name -contains "assignment") "L'exercice expose bien son affectation etudiante." "Le detail exercice ne contient pas l'affectation etudiante."
Assert-True (-not ($exercisePayload.PSObject.Properties.Name -contains "solution")) "La solution n'est pas exposee a l'etudiant." "La solution de l'exercice est exposee a l'etudiant."

$exerciseSubmission = Invoke-JsonRequest "POST" "/api/exercises/$exerciseId/submit" $token @{
    submission = @{
        answer = "Le code reponse 05 signifie un refus de type do not honor."
        summary = "Analyse effectuee par le smoke test etudiant."
    }
}

$assignmentResult = Get-OptionalProperty $exerciseSubmission "assignment"
$assignmentStatus = Get-OptionalProperty $assignmentResult "status"
Assert-True ($assignmentStatus -eq "SUBMITTED") "Exercice soumis avec statut SUBMITTED." "La soumission de l'exercice n'a pas abouti au statut SUBMITTED."

Log "Simulation: l'etudiant passe un quiz..." "Yellow"
if (-not $quizId) {
    $quizId = Get-OptionalProperty (Get-OptionalProperty $workshopContent "workshop") "quizId"
}
Assert-True ([string]::IsNullOrWhiteSpace([string]$quizId) -eq $false) "Quiz cible trouve: $quizId" "Aucun quiz exploitable trouve pour l'atelier $workshopId."

$quizPayload = Invoke-JsonRequest "GET" "/api/progress/quiz/$quizId" $token
$quiz = Get-OptionalProperty $quizPayload "quiz"
$questions = @(Get-OptionalProperty $quiz "questions" @())
$questionCount = [int](Get-OptionalProperty $quiz "questionCount" 0)
$passPercentage = [int](Get-OptionalProperty $quiz "passPercentage" 0)

Assert-True ((Get-OptionalProperty $quizPayload "success" $false) -eq $true) "Definition quiz chargee." "GET /api/progress/quiz/$quizId n'a pas retourne success=true."
Assert-True ($questions.Count -ge 1) "Quiz exploitable: $($questions.Count) question(s)." "Le quiz $quizId ne contient aucune question exploitable."
Assert-True ($questionCount -eq $questions.Count) "QuestionCount coherent avec le payload quiz." "Le quiz $quizId a un questionCount incoherent avec la liste de questions."

$firstAttemptAnswers = @()
foreach ($question in $questions) {
    $questionId = Get-OptionalProperty $question "id"
    Assert-True ([string]::IsNullOrWhiteSpace([string]$questionId) -eq $false) "" "Une question du quiz $quizId n'a pas d'identifiant."

    $firstAttemptAnswers += @{
        questionId = $questionId
        selectedOptionIndex = 0
    }
}

$quizAttempt1 = Invoke-JsonRequest "POST" "/api/progress/quiz/$quizId" $token @{
    answers = $firstAttemptAnswers
    timeTakenSeconds = 120
    workshopId = $workshopId
}

$quizAttempt1Result = Get-OptionalProperty $quizAttempt1 "result"
$quizAttempt1Percent = [int](Get-OptionalProperty $quizAttempt1Result "percentage" 0)
$quizAttempt1Review = @(Get-OptionalProperty $quizAttempt1 "review" @())
Assert-True ((Get-OptionalProperty $quizAttempt1 "success" $false) -eq $true) "Premiere tentative quiz soumise." "La premiere soumission du quiz $quizId a echoue."
Assert-True ($quizAttempt1Review.Count -eq $questions.Count) "La correction quiz couvre toutes les questions." "Le review du quiz $quizId ne couvre pas toutes les questions."

$reviewHasCorrectionMetadata = $true
foreach ($reviewItem in $quizAttempt1Review) {
    if ($null -eq (Get-OptionalProperty $reviewItem "correctOptionIndex")) {
        $reviewHasCorrectionMetadata = $false
        break
    }
}
Assert-True ($quizAttempt1Percent -gt 0 -or $reviewHasCorrectionMetadata) "Le quiz produit soit un score non nul, soit une correction explicite exploitable." "Le quiz ne donne ni score exploitable ni correction explicite."
Log "Tentative 1: score $quizAttempt1Percent% (seuil $passPercentage%)" "White"

$correctedAnswers = Build-CorrectedQuizAnswers -ReviewItems $quizAttempt1Review
$quizAttempt2 = Invoke-JsonRequest "POST" "/api/progress/quiz/$quizId" $token @{
    answers = $correctedAnswers
    timeTakenSeconds = 180
    workshopId = $workshopId
}

$quizAttempt2Result = Get-OptionalProperty $quizAttempt2 "result"
$quizAttempt2Percent = [int](Get-OptionalProperty $quizAttempt2Result "percentage" 0)
$quizPassed = [bool](Get-OptionalProperty $quizAttempt2 "passed" $false)
$quizAttempt2Number = [int](Get-OptionalProperty $quizAttempt2Result "attempt_number" 0)

Assert-True ((Get-OptionalProperty $quizAttempt2 "success" $false) -eq $true) "Deuxieme tentative quiz soumise." "La deuxieme soumission du quiz $quizId a echoue."
Assert-True ($quizAttempt2Percent -ge $quizAttempt1Percent) "Le score s'ameliore apres correction: $quizAttempt2Percent%." "La deuxieme tentative quiz n'ameliore pas le score."
Assert-True ($quizAttempt2Percent -ge $passPercentage) "Le quiz est reellement reussi apres correction." "Le quiz reste sous le seuil de reussite apres correction."
Assert-True ($quizPassed) "Le backend marque bien le quiz comme passed." "Le quiz n'est pas marque passed malgre le score obtenu."
Assert-True ($quizAttempt2Number -ge 2) "Le compteur de tentatives quiz est incremente." "Le quiz n'a pas incremente son attempt_number."

$quizResults = Invoke-JsonRequest "GET" "/api/progress/quiz/$quizId/results" $token
$quizAttempts = [int](Get-OptionalProperty $quizResults "attempts" 0)
$quizBestScore = [int](Get-OptionalProperty $quizResults "bestScore" 0)
Assert-True ((Get-OptionalProperty $quizResults "success" $false) -eq $true) "Historique du quiz recupere." "GET /api/progress/quiz/$quizId/results a echoue."
Assert-True ($quizAttempts -ge 2) "L'historique du quiz conserve au moins 2 tentatives." "L'historique du quiz ne conserve pas les tentatives attendues."
Assert-True ($quizBestScore -ge $quizAttempt2Percent) "Le bestScore du quiz est coherent." "Le bestScore du quiz n'est pas coherent avec la meilleure tentative."

Section "5. FINALISATION"
Log "Verification de la persistence du parcours..." "Gray"

$progressAfterQuiz = Invoke-JsonRequest "GET" "/api/progress" $token
$progressMap = Get-OptionalProperty $progressAfterQuiz "progress"
$workshopProgress = Get-OptionalProperty $progressMap $workshopId
$workshopStatus = Get-OptionalProperty $workshopProgress "status"
$workshopsCompleted = [int](Get-OptionalProperty $progressAfterQuiz "workshopsCompleted" 0)
Assert-True ($workshopStatus -eq "COMPLETED") "Le quiz reussi complete bien l'atelier cote serveur." "L'atelier $workshopId n'est pas COMPLETE apres quiz reussi."
Assert-True ($workshopsCompleted -ge 1) "Le compteur global de workshops completed est incremente." "Le compteur workshopsCompleted n'a pas augmente."

$completionResponse = Invoke-JsonRequest "POST" "/api/progress/workshop/$workshopId/complete" $token
Assert-True ((Get-OptionalProperty $completionResponse "success" $false) -eq $true) "Endpoint de completion atelier verifie." "POST /api/progress/workshop/$workshopId/complete a echoue."

$finalStats = Invoke-JsonRequest "GET" "/api/progress/stats" $token
$finalStatsPayload = Get-OptionalProperty $finalStats "stats"
$quizStats = Get-OptionalProperty $finalStatsPayload "quizzes"
$workshopStats = Get-OptionalProperty $finalStatsPayload "workshops"
$badgeStats = Get-OptionalProperty $finalStatsPayload "badges"
$recentQuizResults = @(Get-OptionalProperty $finalStatsPayload "quizResults" @())

Assert-True ([int](Get-OptionalProperty $quizStats "total" 0) -ge 2) "Les stats quiz enregistrent les tentatives." "Les stats quiz ne remontent pas les tentatives executees."
Assert-True ([int](Get-OptionalProperty $quizStats "passed" 0) -ge 1) "Les stats quiz comptent au moins un quiz passe." "Les stats quiz n'indiquent aucun quiz passe."
Assert-True ([int](Get-OptionalProperty $quizStats "bestScore" 0) -ge $quizAttempt2Percent) "Le bestScore des stats est coherent." "Le bestScore dans /api/progress/stats n'est pas coherent."
Assert-True ([int](Get-OptionalProperty $workshopStats "completed" 0) -ge 1) "Les stats ateliers comptent au moins un atelier termine." "Les stats ateliers n'indiquent aucun atelier complete."

$recentQuizMatch = $recentQuizResults | Where-Object { (Get-OptionalProperty $_ "quiz_id") -eq $quizId } | Select-Object -First 1
Assert-True ($null -ne $recentQuizMatch) "Le quiz apparait dans l'historique recent." "Le quiz $quizId n'apparait pas dans les quiz recents."

$finalBadges = Invoke-JsonRequest "GET" "/api/progress/badges" $token
$earnedBadgeCount = [int](Get-OptionalProperty $finalBadges "earned" 0)
Assert-True ($earnedBadgeCount -ge 1) "Au moins un badge a ete gagne pendant le parcours." "Aucun badge n'a ete gagne pendant le parcours etudiant."
Log ("Badges finaux: {0}/{1}" -f $earnedBadgeCount, (Get-OptionalProperty $badgeStats "total" (Get-OptionalProperty $finalBadges "total" 0))) "White"

Log ""
Log "PARCOURS ETUDIANT TERMINE AVEC SUCCES" "Cyan"
Log "Le gate a valide atelier, exercice, quiz, correction et persistence serveur." "Cyan"
