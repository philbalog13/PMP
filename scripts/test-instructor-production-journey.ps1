# PMP Instructor Production Journey Simulation

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

$suffix = Get-Random

# 1. Registration
Section "1. INSCRIPTION FORMATEUR"
$instructorUser = @{
    username = "prof_turing_$suffix"
    email = "alan.turing.$suffix@academy-tech.io"
    password = "StrongPass123!@#"
    firstName = "Alan"
    lastName = "Turing"
    role = "ROLE_FORMATEUR"
}

Log "Inscription du formateur: $($instructorUser.email)..." "Yellow"

try {
    $regResponse = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/auth/register" -Body ($instructorUser | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
    $token = $regResponse.token
    $userId = $regResponse.user.id
    Log "Succès! Compte créé. ID: $userId" "Green"
} catch {
    Log "Erreur inscription: $_" "Red"
    exit
}

# 2. Dashboard & Analytics
Section "2. VUE D'ENSEMBLE & ANALYTICS"
Log "Chargement des analytics de la cohorte..." "Gray"
try {
    $cohort = Invoke-Api "GET" "/api/progress/cohort" $token
    Log "Statistiques récupérées:" "Green"
    Log "- Total Étudiants: $($cohort.analytics.totalStudents)" "White"
    Log "- Taux de réussite moyen: $($cohort.analytics.quizPerformance[0].passRate)%" "White"
} catch {
    Log "Info: Pas d'analytics disponibles ou erreur mineure." "Gray"
}

# 3. Student Management
Section "3. GESTION DES ETUDIANTS"
Log "Récupération de la liste des étudiants..." "Yellow"
$students = Invoke-Api "GET" "/api/users/students" $token
$studentList = $students.students # Controller returns { success: true, students: [...] }
Log "Étudiants trouvés: $($studentList.count)" "Green"

if ($studentList.count -gt 0) {
    $targetStudent = $studentList[0]
    Log "Sélection de l'étudiant: $($targetStudent.username)" "Cyan"
    
    Log "Consultation progression individuelle..." "Gray"
    $prog = Invoke-Api "GET" "/api/progress/student/$($targetStudent.id)" $token
    Log "Progression consultée avec succès." "Green"
} else {
    Log "Aucun étudiant trouvé pour tester l'assignation." "Red"
}

# 4. Exercise Creation
Section "4. CREATION D'EXERCICE"
Log "Création d'un nouvel exercice pratique..." "Yellow"

$newExercise = @{
    title = "Analyse de logs ISO 8583"
    description = "Décoder le champ 39 et identifier la cause du refus."
    type = "PRACTICAL"
    difficulty = "INTERMEDIATE"
    workshopId = "iso8583"
    points = 50
    timeLimitMinutes = 30
    content = @{
        logSample = "0210...00393035..."
        question = "Quel est le code réponse ?"
    }
}

$createdEx = Invoke-Api "POST" "/api/exercises" $token $newExercise
Log "Exercice créé! ID: $($createdEx.exercise.id)" "Green"

# 5. Assign Exercise
Section "5. ASSIGNATION"
if ($studentList.count -gt 0) {
    Log "Assignation de l'exercice à $($targetStudent.username)..." "Yellow"
    $assignBody = @{
        studentIds = @($targetStudent.id)
        dueDate = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    
    $assignResult = Invoke-Api "POST" "/api/exercises/$($createdEx.exercise.id)/assign" $token $assignBody
    Log "Résultat: $($assignResult.message)" "Green"
}

Log ""
Log "PARCOURS FORMATEUR TERMINE AVEC SUCCES" "Cyan"
