# ScreenCommander — Install Backend Service + Kiosk Auto-Start
# Run as Administrator

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "=== ScreenCommander Service Installer ===" -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot" -ForegroundColor Gray

# Step 1: Build all packages
Write-Host "`n[1/5] Building all packages..." -ForegroundColor Yellow
Push-Location $ProjectRoot
try {
    pnpm build
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }
} finally {
    Pop-Location
}

# Step 2: Run Prisma migrations
Write-Host "`n[2/5] Running database migrations..." -ForegroundColor Yellow
Push-Location "$ProjectRoot\packages\backend"
try {
    npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw "Migration failed" }
} finally {
    Pop-Location
}

# Step 3: Install the backend as a Windows service
Write-Host "`n[3/5] Installing backend service..." -ForegroundColor Yellow
$DbPath = "$ProjectRoot\packages\backend\prisma\dev.db"
node "$ProjectRoot\packages\service\dist\install-service.js" --db-path "$DbPath"
if ($LASTEXITCODE -ne 0) { throw "Service installation failed" }

# Step 4: Start the service
Write-Host "`n[4/5] Starting service..." -ForegroundColor Yellow
Start-Service "ScreenCommander Backend" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Verify
$svc = Get-Service -Name "screencommanderbackend" -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -eq "Running") {
    Write-Host "Backend service is running!" -ForegroundColor Green
} else {
    Write-Host "Warning: Service may not have started. Check services.msc" -ForegroundColor Yellow
}

# Step 5: Install kiosk auto-start
Write-Host "`n[5/5] Installing kiosk auto-start..." -ForegroundColor Yellow
node "$ProjectRoot\packages\service\dist\install-kiosk-startup.js"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Kiosk auto-start installation failed" -ForegroundColor Yellow
} else {
    Write-Host "Kiosk auto-start installed!" -ForegroundColor Green
}

Write-Host "`n=== Installation Complete ===" -ForegroundColor Cyan
Write-Host "Backend service: running as Windows service (auto-starts on boot)"
Write-Host "Kiosk app: will launch on next login"
Write-Host ""
Write-Host "To manage:"
Write-Host "  Service status:    pnpm service:status"
Write-Host "  Uninstall:         powershell scripts\uninstall-service.ps1"
