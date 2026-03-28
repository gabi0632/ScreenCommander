# ScreenCommander — Check Service Status

$svc = Get-Service -Name "screencommanderbackend.exe" -ErrorAction SilentlyContinue

if ($svc) {
    Write-Host "=== ScreenCommander Backend Service ===" -ForegroundColor Cyan
    Write-Host "Name:         $($svc.DisplayName)"
    Write-Host "Status:       $($svc.Status)" -ForegroundColor $(if ($svc.Status -eq "Running") { "Green" } else { "Yellow" })
    Write-Host "Start Type:   $($svc.StartType)"
} else {
    Write-Host "ScreenCommander Backend service is not installed." -ForegroundColor Yellow
    Write-Host "Run 'powershell scripts\install-service.ps1' to install."
}

# Check kiosk auto-start
$startupPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\ScreenCommander-Kiosk.vbs"
if (Test-Path $startupPath) {
    Write-Host "`nKiosk auto-start: Installed" -ForegroundColor Green
} else {
    Write-Host "`nKiosk auto-start: Not installed" -ForegroundColor Yellow
}

# Check if backend is responding
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/system/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "`nBackend health: OK" -ForegroundColor Green
    }
} catch {
    Write-Host "`nBackend health: Not responding" -ForegroundColor Red
}
