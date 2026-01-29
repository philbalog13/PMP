@echo off
echo Starting Frontend...

echo Starting Client Interface (User Cards)...
start "Client Interface" cmd /k "cd user-cards-web && npm install && set PORT=3000 && npm run dev"

timeout /t 5 /nobreak > nul

echo Starting Merchant Interface (TPE)...
start "Merchant Interface" cmd /k "cd tpe-web && npm install && set PORT=3001 && npm run dev"

echo Frontend services started!
echo Client: http://localhost:3000
echo Merchant: http://localhost:3001
