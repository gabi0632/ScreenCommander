import * as path from 'path';
import * as fs from 'fs';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const STARTUP_DIR = process.env['APPDATA']
  ? `${process.env['APPDATA']}\\Microsoft\\Windows\\Start Menu\\Programs\\Startup`
  : 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Startup';
const VBS_FILENAME = 'ScreenCommander-Kiosk.vbs';
const VBS_PATH = path.join(STARTUP_DIR, VBS_FILENAME);

function findElectronExe(): string {
  const candidates = [
    path.join(PROJECT_ROOT, 'node_modules', 'electron', 'dist', 'electron.exe'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  const pnpmDir = path.join(PROJECT_ROOT, 'node_modules', '.pnpm');
  if (fs.existsSync(pnpmDir)) {
    const entries = fs.readdirSync(pnpmDir);
    for (const entry of entries) {
      if (entry.startsWith('electron@')) {
        const candidate = path.join(pnpmDir, entry, 'node_modules', 'electron', 'dist', 'electron.exe');
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }

  throw new Error('Could not find electron.exe. Run "pnpm install" first.');
}

function main(): void {
  const electronExe = findElectronExe();
  const kioskMainScript = path.join(PROJECT_ROOT, 'packages', 'kiosk', 'dist', 'main', 'index.js');
  const backendScript = path.join(PROJECT_ROOT, 'packages', 'backend', 'dist', 'index.js');
  const nodeExe = process.execPath;

  if (!fs.existsSync(kioskMainScript)) {
    console.error(`[kiosk-startup] Kiosk main script not found: ${kioskMainScript}`);
    console.error('[kiosk-startup] Run "pnpm build" first.');
    process.exit(1);
  }

  if (!fs.existsSync(backendScript)) {
    console.error(`[kiosk-startup] Backend script not found: ${backendScript}`);
    console.error('[kiosk-startup] Run "pnpm build" first.');
    process.exit(1);
  }

  // VBS launches both the backend (as a hidden Node process) and the kiosk (Electron).
  // Both run under the current user's session so they have access to display hardware.
  const vbsContent = [
    "' ScreenCommander Auto-Start",
    "' Starts backend server + kiosk control panel on login",
    "' Auto-generated - do not edit manually",
    "",
    'Set WshShell = CreateObject("WScript.Shell")',
    `WshShell.CurrentDirectory = "${PROJECT_ROOT}"`,
    "",
    "' Set environment variables for the backend",
    `WshShell.Environment("Process")("NODE_ENV") = "production"`,
    `WshShell.Environment("Process")("PORT") = "3000"`,
    `WshShell.Environment("Process")("HOST") = "0.0.0.0"`,
    `WshShell.Environment("Process")("DATABASE_URL") = "file:${path.join(PROJECT_ROOT, 'packages', 'backend', 'prisma', 'dev.db')}"`,
    "",
    "' Start the backend server (hidden window, don't wait)",
    `WshShell.Run """${nodeExe}"" ""${backendScript}""", 0, False`,
    "",
    "' Wait for the backend to start",
    "WScript.Sleep 5000",
    "",
    "' Start the kiosk electron app (hidden window, don't wait)",
    `WshShell.Run """${electronExe}"" ""${kioskMainScript}""", 0, False`,
    "",
  ].join('\r\n');

  if (!fs.existsSync(STARTUP_DIR)) {
    console.error(`[kiosk-startup] Startup directory not found: ${STARTUP_DIR}`);
    process.exit(1);
  }

  fs.writeFileSync(VBS_PATH, vbsContent, 'utf8');
  console.log(`[kiosk-startup] Created startup script: ${VBS_PATH}`);
  console.log(`[kiosk-startup] Node: ${nodeExe}`);
  console.log(`[kiosk-startup] Backend: ${backendScript}`);
  console.log(`[kiosk-startup] Electron: ${electronExe}`);
  console.log(`[kiosk-startup] Kiosk: ${kioskMainScript}`);
}

main();
