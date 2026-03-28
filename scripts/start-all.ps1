# ScreenCommander — Start All Services
Write-Host "Starting ScreenCommander..." -ForegroundColor Cyan

# Start backend
Write-Host "Starting backend server..." -ForegroundColor Yellow
$backend = Start-Process -FilePath "pnpm" -ArgumentList "--filter", "@screen-commander/backend", "dev" -PassThru -NoNewWindow

# Wait for backend to be ready
Write-Host "Waiting for backend (port 3000)..." -ForegroundColor Yellow
$maxRetries = 30
$retries = 0
while ($retries -lt $maxRetries) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/system/health" -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "Backend is ready!" -ForegroundColor Green
            break
        }
    } catch {
        Start-Sleep -Seconds 1
        $retries++
    }
}

if ($retries -eq $maxRetries) {
    Write-Host "Backend failed to start after $maxRetries seconds" -ForegroundColor Red
    exit 1
}

# Start control panel
Write-Host "Starting control panel..." -ForegroundColor Yellow
$controlPanel = Start-Process -FilePath "pnpm" -ArgumentList "--filter", "@screen-commander/control-panel", "dev" -PassThru -NoNewWindow

# Open control panel in browser
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host "ScreenCommander is running!" -ForegroundColor Green
Write-Host "  Control Panel: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend API:   http://localhost:3000/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow

# Wait for user to stop
Wait-Process -Id $backend.Id
