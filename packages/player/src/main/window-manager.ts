import { BrowserWindow, screen, session } from 'electron';
import { join } from 'path';
import type { PlayerConfig } from '@screen-commander/shared';
import { initAdBlocker, YOUTUBE_AD_HIDE_CSS, YOUTUBE_AD_SKIP_JS } from './ad-blocker';

let playerWindow: BrowserWindow | null = null;
let adBlockerInitialised = false;

export function createPlayerWindow(config: PlayerConfig): BrowserWindow {
  // Initialise network-level ad blocking once (before any content loads)
  if (!adBlockerInitialised) {
    initAdBlocker();
    adBlockerInitialised = true;
  }

  const displays = screen.getAllDisplays();
  const targetDisplay = displays[config.monitorIndex];

  if (!targetDisplay) {
    throw new Error(
      `Monitor index ${config.monitorIndex} not found. Available: ${displays.length} displays.`
    );
  }

  const { x, y, width, height } = targetDisplay.bounds;
  const scaleFactor = targetDisplay.scaleFactor || 1;

  const displayLabel = targetDisplay.label || '';
  console.log(`[window] Display ${config.monitorIndex}: bounds=${width}x${height} at (${x},${y}), scale=${scaleFactor}, label="${displayLabel}"`);

  // Auto-grant media permissions so enumerateDevices() returns device labels.
  // Without this, Chromium returns empty labels after a fresh start, which
  // prevents matching the saved audioDeviceId to an actual audio output.
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ['media', 'audioCapture', 'mediaKeySystem', 'midi', 'midiSysex'];
    callback(allowed.includes(permission));
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    const allowed = ['media', 'audioCapture', 'mediaKeySystem', 'midi', 'midiSysex'];
    return allowed.includes(permission);
  });

  playerWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    fullscreen: config.fullscreen,
    frame: false,
    kiosk: config.kiosk,
    alwaysOnTop: !config.debug,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#000000',
    minWidth: 0,
    minHeight: 0,
    useContentSize: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      // webSecurity disabled: the file:// renderer needs to call http://localhost backend API (cross-origin)
      webSecurity: false,
      autoplayPolicy: 'no-user-gesture-required',
      preload: join(__dirname, '../preload/index.js'),
      // sandbox disabled: preload script requires Node.js APIs (contextBridge, ipcRenderer)
      sandbox: false,
      // No zoomFactor override — let Electron handle DPI scaling natively
    },
  });

  // Allow webview audio + block popups + inject cursor hiding + ad blocking into webview guests
  playerWindow.webContents.on('did-attach-webview', (_event, webContents) => {
    webContents.setAudioMuted(false);

    // Block popups from webview content (replaces deprecated 'new-window' event)
    webContents.setWindowOpenHandler(() => ({ action: 'deny' as const }));

    webContents.on('dom-ready', () => {
      // Ensure webview content fills the full area
      webContents.insertCSS('html, body { min-height: 100vh !important; min-width: 100vw !important; }');

      // Hide scrollbars for clean fullscreen display
      webContents.insertCSS('::-webkit-scrollbar { display: none !important; } html { scrollbar-width: none; }');

      // Hide cursor if configured
      if (config.noCursor) {
        webContents.insertCSS('* { cursor: none !important; }');
      }

      // Inject YouTube ad-blocking CSS and JS into YouTube webview guests
      const currentUrl = webContents.getURL();
      if (/youtube\.com|youtu\.be/i.test(currentUrl)) {
        webContents.insertCSS(YOUTUBE_AD_HIDE_CSS).catch(() => {
          // Best effort — page may have navigated
        });
        webContents.executeJavaScript(YOUTUBE_AD_SKIP_JS).catch(() => {
          // Best effort
        });
      }
    });

    // Also inject on subsequent navigations within the same webview
    webContents.on('did-navigate', () => {
      const currentUrl = webContents.getURL();
      if (/youtube\.com|youtu\.be/i.test(currentUrl)) {
        webContents.insertCSS(YOUTUBE_AD_HIDE_CSS).catch(() => {});
        webContents.executeJavaScript(YOUTUBE_AD_SKIP_JS).catch(() => {});
      }
    });
    webContents.on('did-navigate-in-page', () => {
      const currentUrl = webContents.getURL();
      if (/youtube\.com|youtu\.be/i.test(currentUrl)) {
        webContents.insertCSS(YOUTUBE_AD_HIDE_CSS).catch(() => {});
        webContents.executeJavaScript(YOUTUBE_AD_SKIP_JS).catch(() => {});
      }
    });
  });

  if (config.noCursor) {
    playerWindow.webContents.insertCSS('* { cursor: none !important; }');
  }

  playerWindow.once('ready-to-show', () => {
    playerWindow?.show();
    // Ensure audio is not muted after window shows
    if (playerWindow && !playerWindow.isDestroyed()) {
      playerWindow.webContents.setAudioMuted(false);
      playerWindow.setBounds({ x, y, width, height });
      if (config.fullscreen) {
        playerWindow.setFullScreen(true);
      }
    }
  });

  playerWindow.on('closed', () => {
    playerWindow = null;
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    playerWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    playerWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return playerWindow;
}

export function getPlayerWindow(): BrowserWindow | null {
  return playerWindow;
}

export function getTargetDisplayBounds(monitorIndex: number): { width: number; height: number } {
  const displays = screen.getAllDisplays();
  const target = displays[monitorIndex];
  if (!target) {
    return { width: 1920, height: 1080 };
  }
  return { width: target.bounds.width, height: target.bounds.height };
}

export function getTargetDisplayLabel(monitorIndex: number): string {
  const displays = screen.getAllDisplays();
  const target = displays[monitorIndex];
  return target?.label || '';
}
