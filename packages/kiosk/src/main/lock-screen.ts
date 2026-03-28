import { ipcMain, net, type BrowserWindow } from 'electron';
import { setKioskLocked } from './window-manager';

let relockTimer: ReturnType<typeof setTimeout> | null = null;
let autoRelockTimeoutMs = 300_000; // 5 minutes default

function postJson(url: string, body: Record<string, unknown>): Promise<{ ok: boolean; data: unknown }> {
  return new Promise((resolve, reject) => {
    const request = net.request({
      url,
      method: 'POST',
    });
    request.setHeader('Content-Type', 'application/json');

    const timeout = setTimeout(() => {
      request.abort();
      reject(new Error('Request timed out'));
    }, 10_000);

    request.on('response', (response) => {
      clearTimeout(timeout);
      let body = '';
      response.on('data', (chunk) => { body += chunk.toString(); });
      response.on('end', () => {
        try {
          const data = JSON.parse(body) as unknown;
          resolve({ ok: response.statusCode === 200, data });
        } catch {
          resolve({ ok: false, data: null });
        }
      });
    });

    request.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    request.write(JSON.stringify(body));
    request.end();
  });
}

function getJson(url: string): Promise<{ ok: boolean; data: unknown }> {
  return new Promise((resolve, reject) => {
    const request = net.request(url);

    const timeout = setTimeout(() => {
      request.abort();
      reject(new Error('Request timed out'));
    }, 10_000);

    request.on('response', (response) => {
      clearTimeout(timeout);
      let body = '';
      response.on('data', (chunk) => { body += chunk.toString(); });
      response.on('end', () => {
        try {
          const data = JSON.parse(body) as unknown;
          resolve({ ok: response.statusCode === 200, data });
        } catch {
          resolve({ ok: false, data: null });
        }
      });
    });

    request.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    request.end();
  });
}

export function initLockScreen(window: BrowserWindow, backendUrl: string): void {
  // Verify kiosk password via backend API
  ipcMain.handle('kiosk:verify-password', async (_event, password: string) => {
    try {
      const result = await postJson(`${backendUrl}/api/auth/verify-kiosk-password`, { password });
      if (!result.ok) return false;
      const data = result.data as { valid: boolean };
      return data.valid;
    } catch (err) {
      console.error('[lock-screen] Failed to verify password:', err);
      return false;
    }
  });

  // Exit the app (only after password verification in renderer)
  ipcMain.handle('kiosk:exit-app', () => {
    console.log('[lock-screen] Exit requested');
    setKioskLocked(false);
    clearRelockTimer();
    window.close();
    return true;
  });

  // Minimize — exit kiosk mode temporarily, start auto-relock timer
  ipcMain.handle('kiosk:minimize', async () => {
    console.log('[lock-screen] Minimize requested');
    setKioskLocked(false);

    // Fetch the auto-relock timeout from settings
    try {
      const result = await getJson(`${backendUrl}/api/settings`);
      if (result.ok) {
        const settings = result.data as {
          kiosk?: { autoRelockTimeoutSeconds?: number };
        };
        if (settings.kiosk?.autoRelockTimeoutSeconds) {
          autoRelockTimeoutMs = settings.kiosk.autoRelockTimeoutSeconds * 1000;
        }
      }
    } catch {
      // Use default timeout
    }

    startRelockTimer(window);
    return true;
  });

  // Re-lock the kiosk manually
  ipcMain.handle('kiosk:relock', () => {
    console.log('[lock-screen] Relock requested');
    clearRelockTimer();
    setKioskLocked(true);
    return true;
  });

  // Dismiss the unlock overlay without action
  ipcMain.handle('kiosk:dismiss-overlay', () => {
    return true;
  });
}

function startRelockTimer(window: BrowserWindow): void {
  clearRelockTimer();

  console.log(`[lock-screen] Auto-relock in ${autoRelockTimeoutMs / 1000} seconds`);

  relockTimer = setTimeout(() => {
    if (!window.isDestroyed()) {
      console.log('[lock-screen] Auto-relock timer fired');
      setKioskLocked(true);
      window.webContents.send('kiosk:auto-relocked');
    }
  }, autoRelockTimeoutMs);
}

function clearRelockTimer(): void {
  if (relockTimer) {
    clearTimeout(relockTimer);
    relockTimer = null;
  }
}

export function destroyLockScreen(): void {
  clearRelockTimer();
  ipcMain.removeHandler('kiosk:verify-password');
  ipcMain.removeHandler('kiosk:exit-app');
  ipcMain.removeHandler('kiosk:minimize');
  ipcMain.removeHandler('kiosk:relock');
  ipcMain.removeHandler('kiosk:dismiss-overlay');
}
