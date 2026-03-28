---
description: Rebuild ScreenCommander for production and restart the Windows backend service
---

# ScreenCommander Production Deploy

Rebuild all packages, run migrations, and restart the backend service.

## Steps

### 1. Build All Packages

```bash
cd C:/Users/Kahlon/Desktop/ScreenCommander && pnpm build
```

Wait for all 6 packages to build successfully (shared, backend, control-panel, player, kiosk, service).

### 2. Run Database Migrations

```bash
cd C:/Users/Kahlon/Desktop/ScreenCommander/packages/backend && npx prisma migrate deploy
```

### 3. Restart Backend Windows Service

```bash
powershell -Command "Restart-Service 'screencommanderbackend.exe'"
```

### 4. Verify

```bash
curl -s http://localhost:3000/api/system/health
```

Should return `{"status":"ok",...}`.

Also run:
```bash
powershell -ExecutionPolicy Bypass -File C:/Users/Kahlon/Desktop/ScreenCommander/scripts/service-status.ps1
```

## Notes

- The kiosk picks up kiosk package changes on next login/restart
- Player instances reconnect automatically after service restart
- Settings and database are preserved
- Build takes ~3-4 minutes total

## If Service Is Not Installed Yet

Run the full installer (as Administrator):
```bash
powershell -ExecutionPolicy Bypass -File C:/Users/Kahlon/Desktop/ScreenCommander/scripts/install-service.ps1
```

## Troubleshooting

If service won't restart:
```bash
powershell -Command "Stop-Service -Name 'screencommanderbackend.exe' -Force; Start-Sleep 2; Start-Service -Name 'screencommanderbackend.exe'"
```

If service is missing:
```bash
pnpm service:install
```
