# PMP Frontend Audit Script
# Scans for hardcoded URLs, simulation modes, and dependency issues.

$frontendPath = "c:\Users\ASUS-GEORGES-GXT\Downloads\PMP\frontend"
$apps = Get-ChildItem -Path $frontendPath -Directory | Where-Object { $_.Name -ne "shared" -and $_.Name -ne "node_modules" }

$results = @()

foreach ($app in $apps) {
    $appName = $app.Name
    $appRoot = $app.FullName
    
    # 1. Detect Hardcoded localhost
    $hardcoded = Get-ChildItem -Path $appRoot -Recurse -Include *.ts, *.tsx -Exclude node_modules, .next | 
                 Select-String -Pattern "http://localhost:[0-9]+"
    
    # 2. Detect Simulation Flags
    $simFlags = Get-ChildItem -Path $appRoot -Recurse -Include *.ts, *.tsx -Exclude node_modules, .next | 
                Select-String -Pattern "IS_SIMULATION = true|startSimulation"
    
    # 3. Check for dedicated API Client
    $hasApiClient = (Test-Path "$appRoot\lib\api-client.ts") -or (Test-Path "$appRoot\src\lib\api-client.ts")
    
    # 4. Check for Zustand
    $packageJson = Get-Content "$appRoot\package.json" | ConvertFrom-Json
    $usesZustand = $packageJson.dependencies.zustand -ne $null
    
    $results += [PSCustomObject]@{
        App = $appName
        HardcodedCount = $hardcoded.Count
        SimFlagsCount = $simFlags.Count
        HasApiClient = $hasApiClient
        UsesZustand = $usesZustand
    }
}

$results | Format-Table -AutoSize
