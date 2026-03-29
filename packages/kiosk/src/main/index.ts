import { app, ipcMain, BrowserWindow } from 'electron';
import { createKioskWindow, navigateKiosk, getKioskWindow, setKioskLocked, isKioskLocked, onUnlockRequested } from './window-manager';
import { initAutoRecovery } from './auto-recovery';
import { initLockScreen, destroyLockScreen } from './lock-screen';
import { getUnlockOverlayScript, getCheckActionScript } from './inject-overlay';
import { waitForBackend } from './backend-health';

const BACKEND_URL = process.env['BACKEND_URL'] ?? 'http://localhost:3000';
const CONTROL_PANEL_DEV_URL = process.env['CONTROL_PANEL_URL'] ?? 'http://localhost:5173';
// In dev mode, electron-vite sets ELECTRON_RENDERER_URL. If it's not set, we're in production.
const isDev = !!process.env['ELECTRON_RENDERER_URL'];

let actionPoller: ReturnType<typeof setInterval> | null = null;
let unlockPoller: ReturnType<typeof setInterval> | null = null;

app.whenReady().then(async () => {
  console.log('[kiosk] App ready, creating kiosk window...');

  const controlPanelUrl = isDev ? CONTROL_PANEL_DEV_URL : BACKEND_URL;
  const window = createKioskWindow();
  initAutoRecovery(window);
  initLockScreen(window, BACKEND_URL);
  registerIpcHandlers(window);
  registerUnlockShortcut(window);
  startUnlockPoller(window);

  console.log(`[kiosk] Waiting for backend at ${BACKEND_URL}...`);
  try {
    await waitForBackend(BACKEND_URL, 120000);
    console.log(`[kiosk] Backend ready, loading control panel from ${controlPanelUrl}`);
  } catch (err) {
    console.error('[kiosk] Backend wait timed out:', (err as Error).message);
    console.log(`[kiosk] Loading control panel anyway — auto-recovery will retry`);
  }
  navigateKiosk(controlPanelUrl);
});

function registerIpcHandlers(window: BrowserWindow): void {
  ipcMain.handle('kiosk:is-locked', () => isKioskLocked());
}

function registerUnlockShortcut(window: BrowserWindow): void {
  onUnlockRequested(() => {
    if (!window.isDestroyed()) {
      injectOverlay(window);
    }
  });
}

function startActionPoller(window: BrowserWindow): void {
  stopActionPoller();

  actionPoller = setInterval(() => {
    if (window.isDestroyed()) {
      stopActionPoller();
      return;
    }

    window.webContents.executeJavaScript(getCheckActionScript()).then((action: unknown) => {
      if (action === 'exit') {
        console.log('[kiosk] Exit action received');
        stopActionPoller();
        setKioskLocked(false);
        window.close();
      } else if (action === 'minimize') {
        console.log('[kiosk] Minimize action received');
        stopActionPoller();
        setKioskLocked(false);
      } else if (action === 'relock') {
        console.log('[kiosk] Relock action received');
        stopActionPoller();
        setKioskLocked(true);
      }
    }).catch(() => {});
  }, 200);
}

function stopActionPoller(): void {
  if (actionPoller) {
    clearInterval(actionPoller);
    actionPoller = null;
  }
}

function injectOverlay(window: BrowserWindow): void {
  console.log('[kiosk] Injecting unlock overlay...');
  window.webContents.executeJavaScript(getUnlockOverlayScript(BACKEND_URL)).catch((err: unknown) => {
    console.error('[kiosk] Failed to inject unlock overlay:', err);
  });
  startActionPoller(window);
}

function startUnlockPoller(window: BrowserWindow): void {
  if (unlockPoller) clearInterval(unlockPoller);

  unlockPoller = setInterval(() => {
    if (window.isDestroyed()) {
      if (unlockPoller) { clearInterval(unlockPoller); unlockPoller = null; }
      return;
    }

    window.webContents.executeJavaScript(`
      (function() { var u = window.__KIOSK_UNLOCK_REQUESTED__; window.__KIOSK_UNLOCK_REQUESTED__ = false; return !!u; })();
    `).then((requested: unknown) => {
      if (requested === true && !window.isDestroyed()) {
        console.log('[kiosk] Ctrl+Shift+K via injected keydown listener');
        injectOverlay(window);
      }
    }).catch(() => {});
  }, 200);
}

// Block window close when kiosk is locked
app.on('browser-window-created', (_event, window) => {
  window.on('close', (e) => {
    if (isKioskLocked()) {
      e.preventDefault();
    }
  });
});

// Prevent navigation to external URLs
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (navEvent, url) => {
    const allowed = [BACKEND_URL, CONTROL_PANEL_DEV_URL, 'file://'];
    const isAllowed = allowed.some((base) => url.startsWith(base));
    if (!isAllowed) {
      navEvent.preventDefault();
    }
  });

  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});

app.on('window-all-closed', () => {
  const win = getKioskWindow();
  if (win && !win.isDestroyed()) return;

  stopActionPoller();
  if (unlockPoller) { clearInterval(unlockPoller); unlockPoller = null; }
  destroyLockScreen();
  app.quit();
});

app.on('will-quit', () => {
  stopActionPoller();
  if (unlockPoller) { clearInterval(unlockPoller); unlockPoller = null; }
  destroyLockScreen();
});
