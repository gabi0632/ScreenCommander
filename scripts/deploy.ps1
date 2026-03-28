# ScreenCommander — Deploy to Production
# Builds all packages, installs auto-start, and creates desktop shortcut

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "=== ScreenCommander Deploy ===" -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot" -ForegroundColor Gray
Write-Host ""

# Step 1: Build all packages
Write-Host "[1/4] Building all packages..." -ForegroundColor Yellow
Push-Location $ProjectRoot
try {
    pnpm build
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }
    Write-Host "Build complete!" -ForegroundColor Green
} finally {
    Pop-Location
}

# Step 2: Run database migrations
Write-Host "`n[2/4] Running database migrations..." -ForegroundColor Yellow
Push-Location "$ProjectRoot\packages\backend"
try {
    npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw "Migration failed" }
    Write-Host "Migrations complete!" -ForegroundColor Green
} finally {
    Pop-Location
}

# Step 3: Install auto-start (VBS in Startup folder)
Write-Host "`n[3/4] Installing auto-start..." -ForegroundColor Yellow
node "$ProjectRoot\packages\service\dist\install-kiosk-startup.js"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Auto-start installation failed" -ForegroundColor Yellow
} else {
    Write-Host "Auto-start installed!" -ForegroundColor Green
}

# Step 4: Create desktop shortcut
Write-Host "`n[4/4] Creating desktop shortcut..." -ForegroundColor Yellow
cscript //nologo "$ProjectRoot\scripts\create-shortcut.vbs"
Write-Host "Desktop shortcut created!" -ForegroundColor Green

Write-Host ""
Write-Host "=== Deploy Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "How it works:" -ForegroundColor White
Write-Host "  - On login: backend + kiosk start automatically (Startup folder)"
Write-Host "  - Desktop shortcut: double-click 'ScreenCommander' to launch manually"
Write-Host "  - Kiosk unlock: Ctrl+Shift+K, password: admin"
Write-Host "  - Both processes run under your user account"
Write-Host ""
Write-Host "To launch now:" -ForegroundColor White
Write-Host "  cscript scripts\start-screencommander.vbs"
Write-Host ""
