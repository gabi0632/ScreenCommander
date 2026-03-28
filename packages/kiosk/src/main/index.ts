import { app, ipcMain, BrowserWindow } from 'electron';
import { createKioskWindow, getKioskWindow, setKioskLocked, isKioskLocked, onUnlockRequested } from './window-manager';
import { initAutoRecovery } from './auto-recovery';
import { waitForBackend } from './backend-health';
import { initLockScreen, destroyLockScreen } from './lock-screen';
import { getUnlockOverlayScript, getCheckActionScript } from './inject-overlay';

const BACKEND_URL = process.env['BACKEND_URL'] ?? 'http://localhost:3000';
const CONTROL_PANEL_DEV_URL = process.env['CONTROL_PANEL_URL'] ?? 'http://localhost:5173';
// In dev mode, electron-vite sets ELECTRON_RENDERER_URL. If it's not set, we're in production.
const isDev = !!process.env['ELECTRON_RENDERER_URL'];

let actionPoller: ReturnType<typeof setInterval> | null = null;
let unlockPoller: ReturnType<typeof setInterval> | null = null;

app.whenReady().then(async () => {
  console.log('[kiosk] App ready, creating kiosk window...');

  const window = createKioskWindow();
  initAutoRecovery(window);
  initLockScreen(window, BACKEND_URL);
  registerIpcHandlers(window);
  registerUnlockShortcut(window);

  console.log('[kiosk] Waiting for backend at', BACKEND_URL);
  window.webContents.on('did-finish-load', () => {
    window.webContents.send('backend-status', { status: 'waiting', message: 'מחכה לשרת...' });
  });

  try {
    await waitForBackend(BACKEND_URL, 120_000, (status) => {
      if (!window.isDestroyed()) {
        window.webContents.send('backend-status', status);
      }
    });

    console.log('[kiosk] Backend is ready, loading control panel...');
    const controlPanelUrl = isDev ? CONTROL_PANEL_DEV_URL : BACKEND_URL;
    window.loadURL(controlPanelUrl);

    // Start polling for METHOD 4 keydown signal (injected JS listener)
    startUnlockPoller(window);
  } catch {
    console.error('[kiosk] Backend did not become ready in time');
    if (!window.isDestroyed()) {
      window.webContents.send('backend-status', {
        status: 'error',
        message: 'השרת לא זמין. בדוק שהשירות פועל.',
      });
    }
  }
});

function registerIpcHandlers(window: BrowserWindow): void {
  ipcMain.handle('kiosk:is-locked', () => isKioskLocked());

  ipcMain.handle('kiosk:retry-backend', async () => {
    try {
      await waitForBackend(BACKEND_URL, 30_000, (status) => {
        if (!window.isDestroyed()) {
          window.webContents.send('backend-status', status);
        }
      });
      const controlPanelUrl = isDev ? CONTROL_PANEL_DEV_URL : BACKEND_URL;
      window.loadURL(controlPanelUrl);
      return true;
    } catch {
      return false;
    }
  });
}

function registerUnlockShortcut(window: BrowserWindow): void {
  // Use the window-manager's callback — fires from the same before-input-event handler
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

    // Also check for METHOD 4 keydown signal
    window.webContents.executeJavaScript(`
      (function() {
        var u = window.__KIOSK_UNLOCK_REQUESTED__;
        window.__KIOSK_UNLOCK_REQUESTED__ = false;
        return !!u;
      })();
    `).then((requested: unknown) => {
      if (requested === true && !window.isDestroyed()) {
        console.log('[kiosk] Ctrl+Shift+K via injected keydown');
        window.webContents.executeJavaScript(getUnlockOverlayScript(BACKEND_URL)).catch(() => {});
      }
    }).catch(() => {});

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
    }).catch(() => {
      // Page might be navigating, ignore
    });
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
  // Don't quit if we're just minimized (unlocked mode)
  // Only quit if the window was actually closed (exit action)
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
