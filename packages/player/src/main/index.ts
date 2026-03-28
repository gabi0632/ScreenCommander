import { app, ipcMain } from 'electron';
import type { PlayerConfig } from '@screen-commander/shared';
import { WS_EVENTS } from '@screen-commander/shared';
import { parseCliArgs } from './cli-args';
import { createPlayerWindow, getPlayerWindow } from './window-manager';
import { initWebSocket, emitEvent, destroyWebSocket, handleRendererReady } from './ws-client';
import { initHeartbeat, destroyHeartbeat } from './heartbeat';
import { initAutoRecovery } from './auto-recovery';

// Allow autoplay with sound (no user gesture required)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let config: PlayerConfig;
let screenshotTimer: ReturnType<typeof setInterval> | null = null;

try {
  config = parseCliArgs(process.argv);
} catch (err) {
  console.error('[player] Failed to parse CLI arguments:', err);
  console.error('[player] process.argv:', process.argv);
  // Fallback: try environment variables or default config
  const displayId = process.env['DISPLAY_ID'];
  if (displayId) {
    config = {
      displayId,
      monitorIndex: parseInt(process.env['MONITOR_INDEX'] ?? '1', 10),
      backendUrl: process.env['BACKEND_URL'] ?? 'http://localhost:3000',
      fullscreen: true,
      noCursor: false,
      kiosk: false,
      debug: true,
    };
    console.log('[player] Using env fallback config:', JSON.stringify(config));
  } else {
    process.exit(1);
  }
}

if (config.debug) {
  console.log('[player] Config:', JSON.stringify(config, null, 2));
}

// Skip single instance lock in dev mode
// const gotLock = app.requestSingleInstanceLock({ displayId: config.displayId });
// if (!gotLock) {
//   console.error(`[player] Another instance is already running for display ${config.displayId}`);
//   app.quit();
// }

app.whenReady().then(() => {
  console.log('[player] App ready, creating window...');
  console.log('[player] Config:', JSON.stringify(config));
  const window = createPlayerWindow(config);
  console.log('[player] Window created, initializing WebSocket...');
  initWebSocket(config);
  console.log('[player] WebSocket initialized, starting heartbeat...');
  initHeartbeat(config);
  initAutoRecovery(window);
  registerIpcHandlers();
  startScreenshotCapture(window);
  console.log('[player] All systems initialized');
});

function startScreenshotCapture(win: Electron.BrowserWindow): void {
  screenshotTimer = setInterval(async () => {
    try {
      if (win.isDestroyed()) return;
      const image = await win.webContents.capturePage();
      const resized = image.resize({ width: 320, quality: 'good' });
      const dataUrl = `data:image/jpeg;base64,${resized.toJPEG(60).toString('base64')}`;
      emitEvent(WS_EVENTS.PLAYER_SCREENSHOT, dataUrl);
    } catch {
      // Ignore screenshot errors
    }
  }, 15000); // every 15 seconds
}

function registerIpcHandlers(): void {
  // Renderer reports content loaded
  ipcMain.on('content-loaded', (_event, payload: { url: string; loadTimeMs: number }) => {
    emitEvent(WS_EVENTS.CONTENT_LOADED, payload);
  });

  // Renderer reports overlay expired
  ipcMain.on('overlay-expired', (_event, payload: { messageId: string }) => {
    emitEvent(WS_EVENTS.OVERLAY_EXPIRED, payload);
  });

  // Renderer reports error
  ipcMain.on('player-error', (_event, payload: { error: string; stack?: string }) => {
    emitEvent(WS_EVENTS.PLAYER_ERROR, payload);
  });

  // Renderer requests config
  ipcMain.handle('get-config', () => {
    // Convert ws:// to http:// so renderer can make REST calls to the backend
    const httpBackendUrl = config.backendUrl
      .replace('ws://', 'http://')
      .replace('wss://', 'https://');
    return { ...config, backendUrl: httpBackendUrl };
  });

  // Renderer reports it has mounted and is ready to receive state
  ipcMain.on('renderer-ready', () => {
    console.log('[player] Renderer ready, pushing current state');
    handleRendererReady();
  });
}

app.on('window-all-closed', () => {
  if (screenshotTimer) {
    clearInterval(screenshotTimer);
    screenshotTimer = null;
  }
  destroyHeartbeat();
  destroyWebSocket();
  app.quit();
});

app.on('before-quit', () => {
  if (screenshotTimer) {
    clearInterval(screenshotTimer);
    screenshotTimer = null;
  }
  destroyHeartbeat();
  destroyWebSocket();
});

// Prevent navigation to external URLs
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (navEvent, url) => {
    const win = getPlayerWindow();
    if (contents === win?.webContents) {
      // Block navigation away from the player renderer
      const parsed = new URL(url);
      if (parsed.protocol !== 'file:' && !url.startsWith('http://localhost')) {
        navEvent.preventDefault();
      }
    }
  });
});
