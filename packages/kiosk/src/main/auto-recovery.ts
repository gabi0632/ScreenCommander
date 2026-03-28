import type { BrowserWindow } from 'electron';

const RELOAD_DELAY_MS = 2000;
const CONTENT_RETRY_DELAY_MS = 10000;

export function initAutoRecovery(window: BrowserWindow): void {
  // Recover from renderer crashes
  window.webContents.on('render-process-gone', (_event, details) => {
    console.error('[auto-recovery] Renderer process gone:', details.reason);

    if (details.reason !== 'killed' && details.reason !== 'clean-exit') {
      setTimeout(() => {
        if (!window.isDestroyed()) {
          console.log('[auto-recovery] Reloading renderer after crash...');
          window.webContents.reload();
        }
      }, RELOAD_DELAY_MS);
    }
  });

  // Recover from unresponsive renderer
  window.webContents.on('unresponsive', () => {
    console.warn('[auto-recovery] Renderer is unresponsive, will reload...');
    setTimeout(() => {
      if (!window.isDestroyed()) {
        window.webContents.reload();
      }
    }, RELOAD_DELAY_MS);
  });

  window.webContents.on('responsive', () => {
    console.log('[auto-recovery] Renderer is responsive again.');
  });

  // Handle failed page loads
  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[auto-recovery] Page load failed: ${errorCode} - ${errorDescription}`);

    setTimeout(() => {
      if (!window.isDestroyed()) {
        console.log('[auto-recovery] Retrying page load...');
        window.webContents.reload();
      }
    }, CONTENT_RETRY_DELAY_MS);
  });
}
