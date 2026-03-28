# ScreenCommander — Uninstall Backend Service + Kiosk Auto-Start
# Run as Administrator

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "=== ScreenCommander Service Uninstaller ===" -ForegroundColor Cyan

# Step 1: Stop the service
Write-Host "`n[1/3] Stopping backend service..." -ForegroundColor Yellow
$svc = Get-Service -Name "screencommanderbackend" -ErrorAction SilentlyContinue
if ($svc) {
    Stop-Service "ScreenCommander Backend" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "Service stopped" -ForegroundColor Green
} else {
    Write-Host "Service not found (may already be uninstalled)" -ForegroundColor Gray
}

# Step 2: Uninstall the service
Write-Host "`n[2/3] Uninstalling backend service..." -ForegroundColor Yellow
node "$ProjectRoot\packages\service\dist\uninstall-service.js"

# Step 3: Remove kiosk auto-start
Write-Host "`n[3/3] Removing kiosk auto-start..." -ForegroundColor Yellow
node "$ProjectRoot\packages\service\dist\remove-kiosk-startup.js"

Write-Host "`n=== Uninstallation Complete ===" -ForegroundColor Cyan
