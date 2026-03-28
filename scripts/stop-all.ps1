# ScreenCommander — Stop All Services
Write-Host "Stopping ScreenCommander services..." -ForegroundColor Yellow

# Stop node processes related to ScreenCommander
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -match "screen-commander"
} | Stop-Process -Force

# Stop electron processes
Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "All services stopped." -ForegroundColor Green
