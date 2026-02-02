# scripts/fix-nextjs-config.ps1
Write-Host "🔧 CORRECTION DES CONFIGURATIONS NEXT.JS" -ForegroundColor Cyan
Write-Host "=======================================`n"

$nextjsApps = @("portal", "tpe-web", "user-cards-web", "hsm-web")

foreach ($app in $nextjsApps) {
    $configPath = "frontend/$app/next.config.ts"
    
    if (Test-Path $configPath) {
        Write-Host "🔍 Correction de $app..." -ForegroundColor Yellow
        $content = Get-Content $configPath -Raw
        
        # Supprimer 'turbo' config
        $content = $content -replace 'turbo\s*:\s*\{[\s\S]*?\},?' , ''
        
        # S'assurer que externalDir et proxy sont là
        if ($content -match "experimental\s*:\s*\{") {
             $content = $content -replace "experimental\s*:\s*\{", "experimental: {`n    externalDir: true,`n    proxy: true,"
        }
        
        # Ajouter webpack alias si absent
        if ($content -notmatch "webpack\s*:") {
            $webpackPart = "`n  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {`n    config.resolve.alias = {`n      ...config.resolve.alias,`n      '@shared': path.resolve(__dirname, '../shared'),`n    }`n    return config`n  },"
            $content = $content -replace "const nextConfig: NextConfig = \{", "const nextConfig: NextConfig = {$webpackPart"
        }
        
        $content | Out-File $configPath -Encoding UTF8
        Write-Host "✅ $app config corrigée" -ForegroundColor Green
        
        # Migration middleware
        $locations = @("frontend/$app/src/middleware.ts", "frontend/$app/middleware.ts")
        foreach ($loc in $locations) {
            if (Test-Path $loc) {
                $proxyLoc = $loc -replace "middleware.ts", "proxy.ts"
                Move-Item $loc $proxyLoc -Force
                Write-Host "✅ $loc → $proxyLoc" -ForegroundColor Green
            }
        }
    }
}

Write-Host "`n🧹 NETTOYAGE DES LOCKFILES" -ForegroundColor Magenta
Remove-Item frontend/*/package-lock.json -ErrorAction SilentlyContinue
Write-Host "✅ Lockfiles nettoyés" -ForegroundColor Green
