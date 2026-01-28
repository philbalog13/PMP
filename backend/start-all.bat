@echo off
REM Script pour démarrer tous les services backend PMP (Windows)

echo 🚀 Démarrage des services backend PMP...

REM Installer les dépendances
if "%1"=="install" (
    echo 📦 Installation des dépendances...
    
    for %%s in (api-gateway sim-card-service sim-pos-service sim-acquirer-service sim-issuer-service sim-fraud-detection crypto-service key-management) do (
        if exist "%%s\package.json" (
            echo Installing %%s...
            cd %%s
            call npm install
            cd ..
        )
    )
    echo ✅ Installation terminée!
    goto :eof
)

REM Démarrer les services dans des nouveaux terminaux
if "%1"=="start" (
    echo ▶️ Démarrage des services...
    
    start "api-gateway" cmd /k "cd api-gateway && npm run dev"
    timeout /t 2 /nobreak > nul
    
    start "sim-card-service" cmd /k "cd sim-card-service && npm run dev"
    start "sim-pos-service" cmd /k "cd sim-pos-service && npm run dev"
    start "sim-acquirer-service" cmd /k "cd sim-acquirer-service && npm run dev"
    start "sim-issuer-service" cmd /k "cd sim-issuer-service && npm run dev"
    start "sim-fraud-detection" cmd /k "cd sim-fraud-detection && npm run dev"
    start "crypto-service" cmd /k "cd crypto-service && npm run dev"
    start "key-management" cmd /k "cd key-management && npm run dev"
    
    echo ✅ Tous les services démarrés!
    echo.
    echo Services disponibles:
    echo   API Gateway:      http://localhost:8000
    echo   Card Service:     http://localhost:8001
    echo   POS Service:      http://localhost:8002
    echo   Acquirer:         http://localhost:8003
    echo   Issuer:           http://localhost:8005
    echo   Fraud Detection:  http://localhost:8007
    echo   Crypto Service:   http://localhost:8010
    echo   Key Management:   http://localhost:8012
    goto :eof
)

echo Usage: start-all.bat [install^|start]
echo   install - Installer les dépendances
echo   start   - Démarrer tous les services
